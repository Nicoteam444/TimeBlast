import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Safe query wrapper — catches errors silently, returns empty array
async function safeQuery(q) {
  try {
    const { data, error } = await q
    if (error) { console.warn('[Webmedia]', error.message); return [] }
    return data || []
  } catch (e) {
    console.warn('[Webmedia] catch:', e.message)
    return []
  }
}

// ── Campaigns ──
export function useCampaigns(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('wm_campaigns').select('*').order('created_at', { ascending: false })
    if (filters.channel) q = q.eq('channel', filters.channel)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.thematic) q = q.eq('thematic', filters.thematic)
    const rows = await safeQuery(q)
    setData(rows)
    setLoading(false)
  }, [filters.channel, filters.status, filters.thematic])

  useEffect(() => { reload() }, [reload])
  return { data, campaigns: data, loading, reload, refresh: reload }
}

// ── Leads ──
export function useLeads(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('wm_leads').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.thematic) q = q.eq('thematic', filters.thematic)
    if (filters.campaignId) q = q.eq('campaign_id', filters.campaignId)
    const rows = await safeQuery(q)
    setData(rows)
    setLoading(false)
  }, [filters.status, filters.thematic, filters.campaignId])

  useEffect(() => { reload() }, [reload])
  return { data, leads: data, loading, reload, refresh: reload }
}

// ── Buyer clients ──
export function useBuyers(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('wm_buyer_clients').select('*').order('name')
    if (filters.status) q = q.eq('status', filters.status)
    const rows = await safeQuery(q)
    setData(rows)
    setLoading(false)
  }, [filters.status])

  useEffect(() => { reload() }, [reload])
  return { data, buyers: data, loading, reload, refresh: reload }
}

// ── Sales ──
export function useSales(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('wm_lead_sales').select('*').order('sold_at', { ascending: false })
    if (filters.buyerId) q = q.eq('buyer_id', filters.buyerId)
    if (filters.from) q = q.gte('sold_at', filters.from)
    if (filters.to) q = q.lte('sold_at', filters.to)
    const rows = await safeQuery(q)
    setData(rows)
    setLoading(false)
  }, [filters.buyerId, filters.from, filters.to])

  useEffect(() => { reload() }, [reload])
  return { data, sales: data, loading, reload, refresh: reload }
}

// ── Purchases ──
export function usePurchases() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const rows = await safeQuery(supabase.from('wm_lead_purchases').select('*').order('purchased_at', { ascending: false }))
    setData(rows)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])
  return { data, purchases: data, loading, reload, refresh: reload }
}

// ── Invoices ──
export function useInvoices(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('wm_invoices').select('*').order('issued_on', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.buyerId) q = q.eq('buyer_id', filters.buyerId)
    const rows = await safeQuery(q)
    setData(rows)
    setLoading(false)
  }, [filters.status, filters.buyerId])

  useEffect(() => { reload() }, [reload])
  return { data, invoices: data, loading, reload, refresh: reload }
}

// ── Analytics ──
// Aggregates KPIs : leads, revenue, cost, margin by various dimensions
export function useAnalytics(filters = {}) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [campaigns, leads, sales, purchases] = await Promise.all([
      safeQuery(supabase.from('wm_campaigns').select('*')),
      safeQuery(supabase.from('wm_leads').select('*')),
      safeQuery(supabase.from('wm_lead_sales').select('*')),
      safeQuery(supabase.from('wm_lead_purchases').select('*')),
    ])

    // KPIs depuis wm_leads (detail) OU depuis wm_campaigns.metadata (agregats LeadByte)
    // Quand les leads individuels ne sont pas dispo, on utilise les totaux des rapports LeadByte.
    const metaLeads = campaigns.reduce((s, c) => s + (Number(c.metadata?.leads_total) || 0), 0)
    const metaSold = campaigns.reduce((s, c) => s + (Number(c.metadata?.leads_sold) || 0), 0)
    const metaRevenue = campaigns.reduce((s, c) => s + (Number(c.metadata?.revenue) || 0), 0)
    const metaPayout = campaigns.reduce((s, c) => s + (Number(c.metadata?.payout) || 0), 0)

    const leadsGenerated = leads.length || metaLeads
    const leadsSold = leads.filter(l => l.status === 'sold').length || metaSold
    const leadsPurchased = leads.filter(l => l.status === 'purchased').length + purchases.reduce((s, p) => s + (p.volume || 1), 0)
    const leadsDead = leads.filter(l => l.status === 'dead').length

    const totalRevenueDetail = sales.reduce((s, x) => s + (parseFloat(x.price) || 0), 0)
    const totalRevenue = totalRevenueDetail || metaRevenue
    const totalAcquisitionCost = leads.reduce((s, l) => s + (parseFloat(l.acquisition_cost) || 0), 0)
    const totalPurchaseCost = purchases.reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.volume || 1), 0)
    const totalCampaignCost = campaigns.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0)
    const totalCost = (totalAcquisitionCost + totalPurchaseCost) || totalCampaignCost || metaPayout
    const margin = totalRevenue - totalCost
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0
    const avgCPL = leadsGenerated > 0 ? totalCampaignCost / leadsGenerated : 0

    // Repartitions par levier
    const byChannel = {}
    campaigns.forEach(c => {
      const ch = c.channel
      if (!byChannel[ch]) byChannel[ch] = { channel: ch, leads: 0, cost: 0, budget: 0 }
      byChannel[ch].cost += parseFloat(c.cost) || 0
      byChannel[ch].budget += parseFloat(c.budget) || 0
    })
    leads.forEach(l => {
      const cmp = campaigns.find(c => c.id === l.campaign_id)
      if (cmp && byChannel[cmp.channel]) byChannel[cmp.channel].leads++
    })
    sales.forEach(s => {
      const lead = leads.find(l => l.id === s.lead_id)
      if (!lead) return
      const cmp = campaigns.find(c => c.id === lead.campaign_id)
      if (cmp && byChannel[cmp.channel]) {
        byChannel[cmp.channel].revenue = (byChannel[cmp.channel].revenue || 0) + parseFloat(s.price || 0)
      }
    })

    // Repartition par thematique
    const byThematic = {}
    leads.forEach(l => {
      const t = l.thematic || 'Autre'
      if (!byThematic[t]) byThematic[t] = { thematic: t, leads: 0, revenue: 0, cost: 0 }
      byThematic[t].leads++
      byThematic[t].cost += parseFloat(l.acquisition_cost) || 0
    })
    sales.forEach(s => {
      const lead = leads.find(l => l.id === s.lead_id)
      if (!lead) return
      const t = lead.thematic || 'Autre'
      if (byThematic[t]) byThematic[t].revenue += parseFloat(s.price || 0)
    })

    setAnalytics({
      kpis: {
        leadsGenerated, leadsSold, leadsPurchased, leadsDead,
        totalRevenue, totalCost, totalCampaignCost, margin, marginPct, avgCPL,
        conversionRate: leadsGenerated > 0 ? (leadsSold / leadsGenerated) * 100 : 0,
      },
      byChannel: Object.values(byChannel),
      byThematic: Object.values(byThematic),
      campaigns, leads, sales, purchases,
    })
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])
  return { analytics, loading, reload }
}
