import { useMemo } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { useAnalytics } from '../../hooks/useWebmediaData'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

// ── Helpers ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtPct(n) { return `${(n || 0).toFixed(1)}%` }

const CHANNEL_COLORS = { meta_ads: '#1877f2', google_ads: '#4285f4', sms: '#f59e0b', jeux_concours: '#ec4899', lemlist: '#8b5cf6', linkedin: '#0a66c2', autres: '#64748b' }
const CHANNEL_LABELS = { meta_ads: 'Meta Ads', google_ads: 'Google Ads', sms: 'SMS', jeux_concours: 'Jeux concours', lemlist: 'Lemlist', linkedin: 'LinkedIn', autres: 'Autres' }

// Objectifs 2026
const OBJECTIVES = { annual: 3600000, monthly: 300000, margin_pct: 30 }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function DonutChart({ size = 64, stroke = 6, pct = 0, color = '#16a34a', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border, #e5e7eb)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fontWeight: 700, fill: color }}>
        {label ?? `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}

export default function WebmediaDashboardPage() {
  const envNavigate = useEnvNavigate()
  const { analytics, loading } = useAnalytics()

  const objectiveProgress = useMemo(() => {
    if (!analytics) return 0
    return Math.min(100, (analytics.kpis.totalRevenue / OBJECTIVES.annual) * 100)
  }, [analytics])

  if (loading || !analytics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const { kpis, byChannel, byThematic } = analytics
  const marginColor = kpis.marginPct >= 30 ? '#16a34a' : kpis.marginPct >= 20 ? '#d97706' : '#dc2626'

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🎯</span> Webmedia — Tableau de bord
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '.85rem', marginTop: '.25rem' }}>
          Vue d'ensemble de l'activite lead generation
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '💧', label: 'Leads generes', value: fmtN(kpis.leadsGenerated), sub: `${fmtN(kpis.leadsSold)} vendus`, color: '#1D9BF0' },
          { icon: '💰', label: 'CA realise', value: fmtE(kpis.totalRevenue), sub: `Objectif ${fmtE(OBJECTIVES.annual)}`, color: '#195C82' },
          { icon: 'donut', label: 'Marge %', value: kpis.marginPct, color: marginColor, sub: `${fmtE(kpis.margin)} (cible 30%)` },
          { icon: '📉', label: 'CPL moyen', value: fmtE(kpis.avgCPL), sub: `Cout tot. ${fmtE(kpis.totalCampaignCost)}`, color: '#F8B35A' },
          { icon: '🎯', label: 'Taux conversion', value: fmtPct(kpis.conversionRate), sub: `${fmtN(kpis.leadsSold)} / ${fmtN(kpis.leadsGenerated)}`, color: '#6366f1' },
          { icon: '🛒', label: 'Leads achetes', value: fmtN(kpis.leadsPurchased), sub: 'Sources externes', color: '#ec4899' },
        ].map((kpi, i) => (
          <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
            {kpi.icon === 'donut' ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.3rem' }}>
                <DonutChart size={56} stroke={5} pct={kpi.value} color={kpi.color} />
              </div>
            ) : (
              <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>{kpi.icon}</div>
            )}
            <div style={{ fontSize: kpi.icon === 'donut' ? '.85rem' : '1.5rem', fontWeight: 700, color: kpi.color }}>
              {kpi.icon === 'donut' ? '' : kpi.value}
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '.15rem' }}>{kpi.label}</div>
            {kpi.sub && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.15rem', opacity: 0.7 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Objectif annuel progress bar ── */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              🚀 Objectif 2026
            </h2>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
              {fmtE(kpis.totalRevenue)} / {fmtE(OBJECTIVES.annual)} — mensuel cible : {fmtE(OBJECTIVES.monthly)}
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: objectiveProgress >= 25 ? '#16a34a' : '#d97706' }}>
            {fmtPct(objectiveProgress)}
          </div>
        </div>
        <div style={{ height: 12, background: 'var(--surface, #f1f5f9)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            height: '100%',
            width: `${objectiveProgress}%`,
            background: `linear-gradient(90deg, #195C82, #1D9BF0)`,
            transition: 'width .5s ease',
          }} />
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Leads par levier */}
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>📢 Leads par levier</h2>
            <button onClick={() => envNavigate('/webmedia/campagnes')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Voir campagnes →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byChannel.map(c => ({ ...c, label: CHANNEL_LABELS[c.channel] || c.channel }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip />
              <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                {byChannel.map((c, i) => <Cell key={i} fill={CHANNEL_COLORS[c.channel] || '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CA par thematique */}
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>🎨 CA par thematique</h2>
          </div>
          {byThematic.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '2rem 0' }}>
              Aucune donnee
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byThematic} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="revenue" nameKey="thematic">
                  {byThematic.map((_, i) => (
                    <Cell key={i} fill={['#195C82','#1D9BF0','#F8B35A','#98BA9C','#6366f1','#ec4899','#14b8a6','#f97316'][i % 8]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtE(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.5rem', justifyContent: 'center' }}>
            {byThematic.map((t, i) => (
              <span key={t.thematic} style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ['#195C82','#1D9BF0','#F8B35A','#98BA9C','#6366f1','#ec4899','#14b8a6','#f97316'][i % 8] }} />
                {t.thematic}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: performance par levier + quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Performance par levier (tableau) */}
        <div style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem' }}>📊 Performance par levier</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '.5rem', textAlign: 'left', color: 'var(--text-muted)' }}>Levier</th>
                <th style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Leads</th>
                <th style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Cout</th>
                <th style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>CA</th>
                <th style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>CPL</th>
                <th style={{ padding: '.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Marge</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map(c => {
                const cpl = c.leads > 0 ? c.cost / c.leads : 0
                const rev = c.revenue || 0
                const margin = rev - c.cost
                return (
                  <tr key={c.channel} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '.5rem', fontWeight: 600 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CHANNEL_COLORS[c.channel], marginRight: 6 }} />
                      {CHANNEL_LABELS[c.channel] || c.channel}
                    </td>
                    <td style={{ padding: '.5rem', textAlign: 'right' }}>{fmtN(c.leads)}</td>
                    <td style={{ padding: '.5rem', textAlign: 'right' }}>{fmtE(c.cost)}</td>
                    <td style={{ padding: '.5rem', textAlign: 'right', fontWeight: 600 }}>{fmtE(rev)}</td>
                    <td style={{ padding: '.5rem', textAlign: 'right' }}>{fmtE(cpl)}</td>
                    <td style={{ padding: '.5rem', textAlign: 'right', fontWeight: 600, color: margin >= 0 ? '#16a34a' : '#dc2626' }}>
                      {fmtE(margin)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Quick actions */}
        <div style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .75rem' }}>⚡ Actions rapides</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              { icon: '📢', label: 'Creer une campagne', to: '/webmedia/campagnes' },
              { icon: '💧', label: 'Ajouter un lead', to: '/webmedia/leads' },
              { icon: '🤝', label: 'Acheteurs', to: '/webmedia/acheteurs' },
              { icon: '💰', label: 'Ventes de leads', to: '/webmedia/ventes' },
              { icon: '🧾', label: 'Facturation', to: '/webmedia/facturation' },
              { icon: '📈', label: 'Analytics', to: '/webmedia/analytics' },
            ].map((a, i) => (
              <button key={i} onClick={() => envNavigate(a.to)} style={{
                display: 'flex', alignItems: 'center', gap: '.6rem',
                padding: '.55rem .75rem', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface, #f8fafc)',
                cursor: 'pointer', fontSize: '.82rem', fontWeight: 500,
                color: 'var(--text)', textAlign: 'left',
              }}>
                <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
