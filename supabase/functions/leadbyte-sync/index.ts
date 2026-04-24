// ============================================================
// leadbyte-sync — Supabase Edge Function
// Syncs LeadByte campaigns, buyers, leads, sales into wm_* tables.
// Invoked by the frontend (Sync now button) or by a cron (TODO).
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Helpers ──────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// LeadByte API base URL: https://{subdomain}.leadbyte{tld}/restapi/v1.3
function leadbyteUrl(subdomain: string, tld: string, path: string): string {
  const cleanTld = tld?.startsWith('.') ? tld : `.${tld || 'com'}`
  return `https://${subdomain}.leadbyte${cleanTld}/restapi/v1.3${path}`
}

// GET with key in query string
async function lbGet(subdomain: string, tld: string, path: string, apiKey: string, params: Record<string, string> = {}) {
  const url = new URL(leadbyteUrl(subdomain, tld, path))
  url.searchParams.set('key', apiKey)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { method: 'GET' })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

// POST with key in JSON body
async function lbPost(subdomain: string, tld: string, path: string, apiKey: string, body: Record<string, unknown> = {}) {
  const url = leadbyteUrl(subdomain, tld, path)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, ...body }),
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

// ─── Mappers LeadByte → wm_* schema ───────────────────────────────────
// Note: the exact LeadByte field names depend on the account config.
// These mappers use conservative defaults and store raw data in `metadata`.

function mapCampaign(raw: any): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  // LeadByte "campaign" typically has: id, name, status, vertical, etc.
  const name = raw.name || raw.campaignName || raw.title || `LB-${raw.id || 'unknown'}`
  return {
    name: String(name),
    channel: 'autres',  // LeadByte campaigns aren't always tied to a channel; let user refine.
    thematic: raw.vertical || raw.thematic || raw.category || null,
    status: ({ active: 'active', paused: 'paused', ended: 'ended', draft: 'draft' }[String(raw.status || '').toLowerCase()] || 'active'),
    budget: Number(raw.budget) || 0,
    cost: Number(raw.cost) || 0,
    metadata: { source: 'leadbyte', external_id: raw.id || raw.campaignId || null, raw },
  }
}

function mapBuyer(raw: any): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const name = raw.name || raw.companyName || raw.title || `LB-Buyer-${raw.id || 'unknown'}`
  const thematicsRaw = raw.verticals || raw.thematics || raw.categories || []
  const thematics = Array.isArray(thematicsRaw) ? thematicsRaw.map(String) : []
  return {
    name: String(name),
    contact_name: raw.contactName || raw.contact || null,
    email: raw.email || null,
    phone: raw.phone || null,
    thematics,
    monthly_volume: Number(raw.monthlyVolume) || 0,
    unit_price: Number(raw.unitPrice) || null,
    billing_mode: 'per_lead',
    status: (raw.status === 'active' ? 'active' : raw.status === 'paused' ? 'paused' : 'active'),
  }
}

function mapLead(raw: any, campaignLBId?: string | number): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  // LeadByte lead payloads often have nested `data` or `fields` with the form values.
  const d = raw.data || raw.fields || raw
  const firstName = d.FirstName || d.firstname || d.first_name || d['First Name'] || null
  const lastName = d.LastName || d.lastname || d.last_name || d['Last Name'] || null
  return {
    source: raw.source || raw.sourceName || 'leadbyte',
    thematic: raw.vertical || raw.thematic || null,
    first_name: firstName,
    last_name: lastName,
    email: d.Email || d.email || null,
    phone: d.Phone || d['Phone 1'] || d.phone || d.mobile || null,
    zip: d.Postcode || d.postcode || d.zip || d.PostalCode || null,
    city: d.City || d.city || null,
    status: (raw.status === 'sold' ? 'sold' : raw.status === 'rejected' ? 'dead' : 'generated'),
    acquisition_cost: Number(raw.acquisitionCost) || 0,
    sale_price: Number(raw.salePrice) || null,
    quality_score: Number(raw.quality) || Number(raw.qualityScore) || null,
    metadata: {
      source: 'leadbyte',
      external_id: raw.id || raw.leadId || null,
      campaign_lb_id: campaignLBId ?? raw.campaignId ?? null,
      received_at: raw.receivedAt || raw.created || raw.dateCreated || null,
      raw: d,
    },
  }
}

// ─── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    // 1. Auth check — authenticated user OR cron secret
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET') || ''

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // `main` = projet SRA principal (contient la table environments + integrations)
    const main = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const isCron = expectedCronSecret && cronSecret === expectedCronSecret
    if (!isCron) {
      if (!authHeader) return json({ error: 'Non authentifie' }, 401)
      const { data: { user }, error: authError } = await main.auth.getUser(authHeader.replace('Bearer ', ''))
      if (authError || !user) return json({ error: 'Token invalide' }, 401)
    }

    // 2. Extract config from request body OR from integrations table (cron mode)
    let body: any = {}
    try { body = await req.json() } catch { body = {} }
    let { action, subdomain, api_key, tld, env_code } = body

    // Si cron ou body vide : charger config depuis integrations.config
    if (isCron || (!subdomain && !api_key)) {
      const { data: integ } = await main.from('integrations').select('config, environment_id').eq('provider', 'leadbyte').maybeSingle()
      if (integ?.config) {
        subdomain = subdomain || integ.config.subdomain
        api_key = api_key || integ.config.api_key
        tld = tld || integ.config.tld
        // Pour env_code, on regarde la table environments si environment_id est present
        if (!env_code && integ.environment_id) {
          const { data: e } = await main.from('environments').select('env_code').eq('id', integ.environment_id).maybeSingle()
          if (e) env_code = e.env_code
        }
      }
    }

    if (!subdomain || !api_key) return json({ error: 'subdomain et api_key requis (non trouves dans integrations)' }, 400)

    const actualTld = tld || '.com'

    // 3. Resoudre le client qui ecrira les donnees wm_* :
    //    - si env_code fourni, on lit la config env correspondante dans la DB principale
    //    - sinon on ecrit dans la DB principale (fallback pour test single-tenant)
    let writeClient = main
    let targetEnvId: string | null = null
    if (env_code) {
      const { data: env, error: envErr } = await main
        .from('environments')
        .select('id, supabase_url, supabase_anon_key')
        .eq('env_code', env_code)
        .maybeSingle()
      if (envErr) return json({ error: `env_code inconnu : ${envErr.message}` }, 400)
      if (!env) return json({ error: `env_code "${env_code}" introuvable` }, 404)
      // On autorise l'ecriture cross-project via la cle anon (RLS WITH CHECK (true) sur wm_*)
      writeClient = createClient(env.supabase_url, env.supabase_anon_key)
      targetEnvId = env.id
    }

    // 3. Route actions
    if (action === 'test') {
      // Quick ping — try fetching campaigns with limit=1
      const { ok, status, data } = await lbGet(subdomain, actualTld, '/campaigns', api_key, { limit: '1' })
      return json({ ok, status, sample: data }, ok ? 200 : 400)
    }

    // 4. SYNC action — pull campaigns + buyers + recent leads, upsert into wm_*
    //    For the webmedia env, we write into its dedicated Supabase project.
    //    The frontend passes env_code so we know which Supabase URL+key to use.
    //    For now, we use the same admin client (single-DB fallback).
    //    TODO: if env_code === '2026001', switch to the Webmedia Supabase project.

    const summary = {
      campaigns: { fetched: 0, upserted: 0, errors: [] as string[] },
      buyers: { fetched: 0, upserted: 0, errors: [] as string[] },
      leads: { fetched: 0, upserted: 0, errors: [] as string[] },
      started_at: new Date().toISOString(),
      finished_at: '',
    }

    // ── Campaigns (liste + enrichissement avec /reports/campaign) ──
    // Keep track of LB campaign IDs to iterate leads per campaign below
    const campaignLBIds: Array<string | number> = []
    // Date range pour le rapport : par defaut, 12 derniers mois
    const today = new Date()
    const fromDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10) + 'T00:00:00Z'
    const toDate = today.toISOString().slice(0, 10) + 'T23:59:59Z'

    try {
      const { ok, data } = await lbGet(subdomain, actualTld, '/campaigns', api_key, { limit: '500' })
      if (ok) {
        const list = Array.isArray(data) ? data : (data as any)?.results || (data as any)?.campaigns || []
        summary.campaigns.fetched = list.length
        for (const item of list) {
          if (item?.id != null) campaignLBIds.push(item.id)
          const mapped = mapCampaign(item)
          if (!mapped) continue

          // Enrichir avec le rapport campagne (leads, revenue, profit)
          try {
            const rep = await lbGet(subdomain, actualTld, '/reports/campaign', api_key, {
              campaignId: String(item.id),
              from: fromDate,
              to: toDate,
            })
            if (rep.ok) {
              const r = (rep.data as any)?.data?.[0] || null
              if (r) {
                // Store aggregated metrics in metadata + update cost/budget for display
                const meta = mapped.metadata as any
                meta.leads_total = Number(r.leads) || 0
                meta.leads_valid = Number(r.valid) || 0
                meta.leads_invalid = Number(r.invalid) || 0
                meta.leads_sold = Number(r.sold) || 0
                meta.leads_returns = Number(r.returns) || 0
                meta.revenue = Number(r.revenue) || 0
                meta.payout = Number(r.payout) || 0
                meta.profit = Number(r.profit) || 0
                meta.currency = r.currency || 'EUR'
                meta.report_from = fromDate
                meta.report_to = toDate
                // Le cost du wm_campaigns = payout (ce qu'on a verse aux sources)
                mapped.cost = Number(r.payout) || 0
              }
            }
          } catch (_e) { /* continue even if report fails */ }

          const externalId = (mapped.metadata as any)?.external_id
          if (externalId != null) {
            const { data: existing } = await writeClient.from('wm_campaigns').select('id').eq('metadata->>external_id', String(externalId)).limit(1).maybeSingle()
            if (existing?.id) {
              await writeClient.from('wm_campaigns').update(mapped).eq('id', existing.id)
            } else {
              await writeClient.from('wm_campaigns').insert(mapped)
            }
            summary.campaigns.upserted++
          } else {
            await writeClient.from('wm_campaigns').insert(mapped)
            summary.campaigns.upserted++
          }
        }
      } else {
        summary.campaigns.errors.push(`fetch failed: ${JSON.stringify(data).slice(0, 200)}`)
      }
    } catch (e) {
      summary.campaigns.errors.push((e as Error).message)
    }

    // ── Buyers ──
    try {
      const { ok, data } = await lbGet(subdomain, actualTld, '/buyers', api_key, { limit: '200' })
      if (ok) {
        const list = Array.isArray(data) ? data : (data as any)?.results || (data as any)?.buyers || []
        summary.buyers.fetched = list.length
        for (const item of list) {
          const mapped = mapBuyer(item)
          if (!mapped) continue
          // Upsert by name for simplicity (wm_buyer_clients has no external_id)
          const { data: existing } = await writeClient.from('wm_buyer_clients').select('id').eq('name', mapped.name).limit(1).maybeSingle()
          if (existing?.id) {
            await writeClient.from('wm_buyer_clients').update(mapped).eq('id', existing.id)
          } else {
            await writeClient.from('wm_buyer_clients').insert(mapped)
          }
          summary.buyers.upserted++
        }
      } else {
        summary.buyers.errors.push(`fetch failed: ${JSON.stringify(data).slice(0, 200)}`)
      }
    } catch (e) {
      summary.buyers.errors.push((e as Error).message)
    }

    // ── Leads ──
    // LeadByte's /leads/search requires a `searches` array where each item targets
    // a specific campaignId with at least one field filter (e.g. email: "%").
    // We iterate over all known campaigns and fetch their leads.
    try {
      if (campaignLBIds.length === 0) {
        summary.leads.errors.push('Aucune campagne disponible — leads ignores.')
      } else {
        for (const cid of campaignLBIds) {
          try {
            const { ok, data } = await lbPost(subdomain, actualTld, '/leads/search', api_key, {
              searches: [{ campaignId: Number(cid), email: '%' }],
            })
            if (!ok) {
              summary.leads.errors.push(`campaign ${cid}: fetch failed`)
              continue
            }
            const searches = (data as any)?.searches || []
            const results = searches.flatMap((s: any) => s?.results || [])
            summary.leads.fetched += results.length
            for (const item of results) {
              const mapped = mapLead(item, cid)
              if (!mapped) continue
              const externalId = (mapped.metadata as any)?.external_id
              if (externalId != null) {
                const { data: existing } = await writeClient.from('wm_leads').select('id').eq('metadata->>external_id', String(externalId)).limit(1).maybeSingle()
                if (existing?.id) {
                  await writeClient.from('wm_leads').update(mapped).eq('id', existing.id)
                } else {
                  await writeClient.from('wm_leads').insert(mapped)
                }
              } else {
                await writeClient.from('wm_leads').insert(mapped)
              }
              summary.leads.upserted++
            }
          } catch (e) {
            summary.leads.errors.push(`campaign ${cid}: ${(e as Error).message}`)
          }
        }
      }
    } catch (e) {
      summary.leads.errors.push((e as Error).message)
    }

    summary.finished_at = new Date().toISOString()

    // 5. Save last sync timestamp in integrations.config
    await main.from('integrations').update({
      status: 'connected',
      config: { subdomain, tld: actualTld, api_key, last_sync: summary.finished_at, last_summary: summary },
      updated_at: new Date().toISOString(),
    }).eq('provider', 'leadbyte')

    return json({ ok: true, summary })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
