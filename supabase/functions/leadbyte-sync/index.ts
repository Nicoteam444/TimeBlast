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
    // 1. Auth check — only authenticated users
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifie' }, 401)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ error: 'Token invalide' }, 401)

    // 2. Extract config from request body
    const { action, subdomain, api_key, tld, env_code } = await req.json()
    if (!subdomain || !api_key) return json({ error: 'subdomain et api_key sont requis' }, 400)

    const actualTld = tld || '.com'

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

    // ── Campaigns ──
    // Keep track of LB campaign IDs to iterate leads per campaign below
    const campaignLBIds: Array<string | number> = []
    try {
      const { ok, data } = await lbGet(subdomain, actualTld, '/campaigns', api_key, { limit: '200' })
      if (ok) {
        const list = Array.isArray(data) ? data : (data as any)?.results || (data as any)?.campaigns || []
        summary.campaigns.fetched = list.length
        for (const item of list) {
          if (item?.id != null) campaignLBIds.push(item.id)
          const mapped = mapCampaign(item)
          if (!mapped) continue
          const externalId = (mapped.metadata as any)?.external_id
          if (externalId != null) {
            const { data: existing } = await admin.from('wm_campaigns').select('id').eq('metadata->>external_id', String(externalId)).limit(1).maybeSingle()
            if (existing?.id) {
              await admin.from('wm_campaigns').update(mapped).eq('id', existing.id)
            } else {
              await admin.from('wm_campaigns').insert(mapped)
            }
            summary.campaigns.upserted++
          } else {
            await admin.from('wm_campaigns').insert(mapped)
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
          const { data: existing } = await admin.from('wm_buyer_clients').select('id').eq('name', mapped.name).limit(1).maybeSingle()
          if (existing?.id) {
            await admin.from('wm_buyer_clients').update(mapped).eq('id', existing.id)
          } else {
            await admin.from('wm_buyer_clients').insert(mapped)
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
                const { data: existing } = await admin.from('wm_leads').select('id').eq('metadata->>external_id', String(externalId)).limit(1).maybeSingle()
                if (existing?.id) {
                  await admin.from('wm_leads').update(mapped).eq('id', existing.id)
                } else {
                  await admin.from('wm_leads').insert(mapped)
                }
              } else {
                await admin.from('wm_leads').insert(mapped)
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
    await admin.from('integrations').update({
      status: 'connected',
      config: { subdomain, tld: actualTld, api_key, last_sync: summary.finished_at, last_summary: summary },
      updated_at: new Date().toISOString(),
    }).eq('provider', 'leadbyte')

    return json({ ok: true, summary })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
