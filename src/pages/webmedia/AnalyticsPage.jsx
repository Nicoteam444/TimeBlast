import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAnalytics } from '../../hooks/useWebmediaData'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Formatters ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' } }
function fmtPct(n) { return `${(n || 0).toFixed(1)}%` }

const CHANNEL_COLORS = {
  meta_ads: '#1877f2',
  google_ads: '#4285f4',
  sms: '#f59e0b',
  jeux_concours: '#ec4899',
  lemlist: '#8b5cf6',
  linkedin: '#0a66c2',
  autres: '#64748b',
}
const CHANNEL_LABELS = { meta_ads: 'Meta Ads', google_ads: 'Google Ads', sms: 'SMS', jeux_concours: 'Jeux concours', lemlist: 'Lemlist', linkedin: 'LinkedIn', autres: 'Autres' }

const THEMATIC_COLORS = ['#195C82', '#1D9BF0', '#F8B35A', '#98BA9C', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#64748b']

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

// Period filters
const PERIODS = [
  { key: 'month', label: 'Ce mois' },
  { key: '3months', label: '3 derniers mois' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Personnalise' },
]

function getPeriodBounds(period, customFrom, customTo) {
  const now = new Date()
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  }
  if (period === '3months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  }
  if (period === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1)
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  }
  if (period === 'custom') {
    return { from: customFrom || null, to: customTo || null }
  }
  return { from: null, to: null }
}

function monthKey(d) {
  if (!d) return null
  try {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
  } catch { return null }
}

function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  const names = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

export default function AnalyticsPage() {
  const { analytics, loading } = useAnalytics()
  const [period, setPeriod] = useState('ytd')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [buyersList, setBuyersList] = useState(null)

  const bounds = useMemo(() => getPeriodBounds(period, customFrom, customTo), [period, customFrom, customTo])

  // Load buyers once to resolve names
  useMemo(() => {
    (async () => {
      try {
        const { data } = await supabase.from('wm_buyer_clients').select('id, name')
        setBuyersList(data || [])
      } catch { setBuyersList([]) }
    })()
  }, [])

  // Filter datasets by period
  const filtered = useMemo(() => {
    if (!analytics) return null
    const inRange = (d) => {
      if (!d) return false
      if (bounds.from && d < bounds.from) return false
      if (bounds.to && d > bounds.to) return false
      return true
    }
    const leads = analytics.leads.filter(l => inRange((l.created_at || '').slice(0, 10)))
    const sales = analytics.sales.filter(s => inRange((s.sold_at || '').slice(0, 10)))
    const purchases = analytics.purchases.filter(p => inRange((p.purchased_at || '').slice(0, 10)))
    const campaigns = analytics.campaigns
    return { leads, sales, purchases, campaigns }
  }, [analytics, bounds])

  // Period-scoped KPIs
  const kpis = useMemo(() => {
    if (!filtered) return null
    const leadsGenerated = filtered.leads.length
    const leadsSold = filtered.leads.filter(l => l.status === 'sold').length
    const totalRevenue = filtered.sales.reduce((s, x) => s + (parseFloat(x.price) || 0), 0)
    const totalAcqCost = filtered.leads.reduce((s, l) => s + (parseFloat(l.acquisition_cost) || 0), 0)
    const totalPurchaseCost = filtered.purchases.reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.volume || 1), 0)
    const totalCost = totalAcqCost + totalPurchaseCost
    const margin = totalRevenue - totalCost
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0
    const totalCampaignCost = filtered.campaigns.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0)
    const avgCPL = leadsGenerated > 0 ? totalCampaignCost / leadsGenerated : 0
    return { leadsGenerated, leadsSold, totalRevenue, totalCost, margin, marginPct, avgCPL }
  }, [filtered])

  // Monthly time series
  const monthly = useMemo(() => {
    if (!filtered) return []
    const map = {}
    filtered.sales.forEach(s => {
      const k = monthKey(s.sold_at)
      if (!k) return
      map[k] = map[k] || { key: k, revenue: 0, cost: 0, leads: 0 }
      map[k].revenue += parseFloat(s.price) || 0
    })
    filtered.leads.forEach(l => {
      const k = monthKey(l.created_at)
      if (!k) return
      map[k] = map[k] || { key: k, revenue: 0, cost: 0, leads: 0 }
      map[k].cost += parseFloat(l.acquisition_cost) || 0
      map[k].leads++
    })
    filtered.purchases.forEach(p => {
      const k = monthKey(p.purchased_at)
      if (!k) return
      map[k] = map[k] || { key: k, revenue: 0, cost: 0, leads: 0 }
      map[k].cost += (parseFloat(p.price) || 0) * (p.volume || 1)
    })
    return Object.values(map)
      .map(m => ({ ...m, label: monthLabel(m.key), margin: m.revenue - m.cost, cpl: m.leads > 0 ? m.cost / m.leads : 0 }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [filtered])

  // By channel (period-scoped)
  const byChannel = useMemo(() => {
    if (!filtered) return []
    const map = {}
    filtered.campaigns.forEach(c => {
      map[c.channel] = map[c.channel] || { channel: c.channel, leads: 0, cost: 0, revenue: 0 }
      map[c.channel].cost += parseFloat(c.cost) || 0
    })
    filtered.leads.forEach(l => {
      const cmp = filtered.campaigns.find(c => c.id === l.campaign_id)
      if (!cmp) return
      map[cmp.channel] = map[cmp.channel] || { channel: cmp.channel, leads: 0, cost: 0, revenue: 0 }
      map[cmp.channel].leads++
    })
    filtered.sales.forEach(s => {
      const lead = filtered.leads.find(l => l.id === s.lead_id)
      if (!lead) return
      const cmp = filtered.campaigns.find(c => c.id === lead.campaign_id)
      if (!cmp) return
      map[cmp.channel] = map[cmp.channel] || { channel: cmp.channel, leads: 0, cost: 0, revenue: 0 }
      map[cmp.channel].revenue += parseFloat(s.price) || 0
    })
    return Object.values(map).map(c => ({
      ...c,
      label: CHANNEL_LABELS[c.channel] || c.channel,
      margin: (c.revenue || 0) - (c.cost || 0),
    }))
  }, [filtered])

  // By thematic (leads distribution)
  const byThematic = useMemo(() => {
    if (!filtered) return []
    const map = {}
    filtered.leads.forEach(l => {
      const t = l.thematic || 'Autre'
      map[t] = map[t] || { thematic: t, leads: 0, revenue: 0 }
      map[t].leads++
    })
    filtered.sales.forEach(s => {
      const lead = filtered.leads.find(l => l.id === s.lead_id)
      if (!lead) return
      const t = lead.thematic || 'Autre'
      map[t] = map[t] || { thematic: t, leads: 0, revenue: 0 }
      map[t].revenue += parseFloat(s.price) || 0
    })
    return Object.values(map)
  }, [filtered])

  // Top 10 buyers by revenue
  const topBuyers = useMemo(() => {
    if (!filtered) return []
    const map = {}
    filtered.sales.forEach(s => {
      const id = s.buyer_id
      if (!id) return
      map[id] = map[id] || { buyer_id: id, leads: 0, revenue: 0 }
      map[id].leads++
      map[id].revenue += parseFloat(s.price) || 0
    })
    const buyerName = (id) => {
      const b = (buyersList || []).find(x => x.id === id)
      return b?.name || `#${(id || '').slice(0, 8)}`
    }
    return Object.values(map)
      .map(b => ({ ...b, name: buyerName(b.buyer_id), avg: b.leads > 0 ? b.revenue / b.leads : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [filtered, buyersList])

  if (loading || !analytics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>📈 Analytics Webmedia</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
          Analyse detaillee de la performance — {period === 'custom' && bounds.from && bounds.to ? `${fmtDate(bounds.from)} — ${fmtDate(bounds.to)}` : PERIODS.find(p => p.key === period)?.label}
        </p>
      </div>

      {/* Period filter */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '.4rem .9rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: period === p.key ? '#195C82' : 'transparent',
              color: period === p.key ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '.8rem',
              fontWeight: 600,
            }}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: '.4rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.8rem' }} />
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: '.4rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.8rem' }} />
          </>
        )}
      </div>

      {/* Section 1: KPI cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { icon: '💧', label: 'Leads generes', value: fmtN(kpis.leadsGenerated), sub: `${fmtN(kpis.leadsSold)} vendus`, color: '#1D9BF0' },
            { icon: '💰', label: 'CA', value: fmtE(kpis.totalRevenue), color: '#195C82' },
            { icon: '💸', label: 'Cout', value: fmtE(kpis.totalCost), color: '#F8B35A' },
            { icon: '📊', label: 'Marge', value: fmtE(kpis.margin), sub: fmtPct(kpis.marginPct), color: kpis.margin >= 0 ? '#16a34a' : '#dc2626' },
            { icon: '📉', label: 'CPL moyen', value: fmtE(kpis.avgCPL), color: '#6366f1' },
          ].map((k, i) => (
            <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>{k.icon}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '.15rem' }}>{k.label}</div>
              {k.sub && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.15rem', opacity: 0.7 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Section 2: Revenue / Cost / Margin over time */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem', color: 'var(--text)' }}>📈 CA / Cout / Marge (mensuel)</h2>
        {monthly.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '2rem 0' }}>Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => fmtE(v)} />
              <Tooltip formatter={(v) => fmtE(v)} />
              <Legend wrapperStyle={{ fontSize: '.8rem' }} />
              <Line type="monotone" dataKey="revenue" name="CA" stroke="#195C82" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cost" name="Cout" stroke="#F8B35A" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="margin" name="Marge" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 3: Performance by channel */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem', color: 'var(--text)' }}>📢 Performance par levier</h2>
        {byChannel.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '2rem 0' }}>Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byChannel}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => fmtE(v)} />
              <Tooltip formatter={(v) => fmtE(v)} />
              <Legend wrapperStyle={{ fontSize: '.8rem' }} />
              <Bar dataKey="revenue" name="CA" fill="#195C82" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Cout" fill="#F8B35A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margin" name="Marge" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 4: Leads distribution by thematic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem', color: 'var(--text)' }}>🎨 Repartition leads par thematique</h2>
          {byThematic.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '2rem 0' }}>Aucune donnee</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byThematic}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={3}
                    dataKey="leads"
                    nameKey="thematic"
                  >
                    {byThematic.map((_, i) => <Cell key={i} fill={THEMATIC_COLORS[i % THEMATIC_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtN(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.5rem', justifyContent: 'center' }}>
                {byThematic.map((t, i) => (
                  <span key={t.thematic} style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: THEMATIC_COLORS[i % THEMATIC_COLORS.length] }} />
                    {t.thematic} ({fmtN(t.leads)})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Section 6 placed side-by-side: CPL evolution */}
        <div style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem', color: 'var(--text)' }}>📉 Evolution CPL</h2>
          {monthly.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '2rem 0' }}>Aucune donnee</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => fmtE(v)} />
                <Tooltip formatter={(v) => fmtE(v)} />
                <Legend wrapperStyle={{ fontSize: '.8rem' }} />
                <Line type="monotone" dataKey="cpl" name="CPL" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Section 5: Top 10 buyers */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem', color: 'var(--text)' }}>🏆 Top 10 acheteurs</h2>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '.55rem .5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>#</th>
                <th style={{ padding: '.55rem .5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Acheteur</th>
                <th style={{ padding: '.55rem .5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Leads vendus</th>
                <th style={{ padding: '.55rem .5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>CA</th>
                <th style={{ padding: '.55rem .5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Prix moyen</th>
              </tr>
            </thead>
            <tbody>
              {topBuyers.map((b, i) => (
                <tr key={b.buyer_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>#{i + 1}</td>
                  <td style={{ padding: '.5rem', fontWeight: 600, color: 'var(--text)' }}>{b.name}</td>
                  <td style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text)' }}>{fmtN(b.leads)}</td>
                  <td style={{ padding: '.5rem', textAlign: 'right', fontWeight: 700, color: '#195C82' }}>{fmtE(b.revenue)}</td>
                  <td style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text)' }}>{fmtE(b.avg)}</td>
                </tr>
              ))}
              {topBuyers.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune vente sur la periode</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
