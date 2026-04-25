import { useMemo, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ─────────────────────────────────────────────────────────────
// Données HubSpot (snapshot 2026-04-24, compte 26870220)
// Source : MCP HubSpot — à remplacer par un appel live via une
// edge function `hubspot-proxy` qui lit la clé API stockée dans
// `integrations_config` (voir IntegrationsAdminPage).
// ─────────────────────────────────────────────────────────────
const HUBSPOT_SNAPSHOT = {
  totals: {
    contacts: 42883,
    companies: 11764,
    deals: 3140,
    tickets: 0,
  },
  newThisMonth: { contacts: 340, deals: 140 },
  newPrevMonth: { contacts: 442 },
  dealsWon: { total: 1174, thisMonth: 68 },
  dealsLost: { total: 521 },
  dealsProposition: { total: 234 },
  pipelines: [
    { id: '202561478', name: 'PME', deals: 2066, color: '#2B4C7E' },
    { id: '206477557', name: 'MGE', deals: 1061, color: '#f97316' },
    { id: 'default',   name: 'PME Matériel', deals: 8, color: '#8b5cf6' },
    { id: '303552247', name: 'Formations Qualiopi', deals: 5, color: '#16a34a' },
  ],
  // Top deals du pipeline PME (trié par montant)
  topDeals: [
    { id: 15296216050,  name: 'LEGAC CEGID FLEX',                  amount: 163295, stage: 'Fermé gagné' },
    { id: 388181285081, name: 'human ocean',                       amount: 150328, stage: 'Proposition' },
    { id: 217055694011, name: '2i Group',                          amount: 150000, stage: 'Fermé perdu' },
    { id: 264820953282, name: 'CRUSTA C - Zeendoc',                amount: 103000, stage: 'Fermé perdu' },
    { id: 314791496919, name: 'SRA BORD - RAIMONDI CEGID XRP FLEX',amount:  84280, stage: 'Fermé perdu' },
    { id: 414020015351, name: 'PARTEDIS MIGRATION SAAS CEGID',     amount:  76279, stage: 'Proposition' },
    { id: 413524736232, name: 'LEGAC ANNUL ET REMPLACE OFFRE 2024',amount:  76145, stage: 'Fermé gagné' },
    { id: 388156052693, name: 'OFFICE DE TOURISME & DES CONGRES',  amount:  65472, stage: 'Proposition' },
    { id: 395530360010, name: 'gemag.org - Presta paie 2026',      amount:  60000, stage: 'Fermé gagné' },
    { id: 416063322299, name: 'GAPE CEMES MIGRATION SAAS CEGID',   amount:  57243, stage: 'Proposition' },
  ],
  // Top entreprises par nb de deals
  topCompanies: [
    { id: 19090790632,  name: 'DIAM Bouchage',                  deals: 21, industry: 'Industrie' },
    { id: 301746005216, name: 'LES TROIS CHENES LTC 3',         deals: 19, industry: 'Agro' },
    { id: 9814800868,   name: 'EDITIONS ALBIN MICHEL',          deals: 18, industry: 'Édition' },
    { id: 105393156285, name: 'ALLIANCE PASTORALE',             deals: 16, industry: 'Coop' },
    { id: 97869627593,  name: 'Florimond Desprez Veuve & Fils', deals: 16, industry: 'Agro' },
    { id: 300848765124, name: 'PROSOL GESTION',                 deals: 16, industry: 'Agro' },
    { id: 9813614823,   name: 'NARBONNE ACCESSOIRES',           deals: 14, industry: 'Retail' },
    { id: 395462300887, name: 'EASY CASH',                      deals: 13, industry: '—' },
    { id: 271402913999, name: 'SARL ECOLAND',                   deals: 13, industry: 'Utilities' },
    { id: 9860591856,   name: 'CHATEAU GISCOURS',               deals: 12, industry: '—' },
  ],
  updatedAt: '2026-04-24T19:20:00Z',
  portalId: 26870220,
}

const HUBSPOT_URL = (objType, id) =>
  `https://app-eu1.hubspot.com/contacts/${HUBSPOT_SNAPSHOT.portalId}/record/${objType}/${id}`

const fmtEUR = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
const fmtN = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: '1.25rem',
}

function KpiCard({ icon, label, value, sub, subColor = '#64748b', accent = '#2B4C7E' }) {
  return (
    <div style={{ ...cardStyle, borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text, #0f172a)', marginTop: 6, lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: '.8rem', color: subColor, marginTop: 6, fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ fontSize: '1.6rem', opacity: .7 }}>{icon}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, children, footer }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>{title}</h3>
      {children}
      {footer && <div style={{ marginTop: '.75rem', fontSize: '.78rem', color: '#64748b' }}>{footer}</div>}
    </div>
  )
}

export default function HubSpotDashboardPage() {
  const [period, setPeriod] = useState('30d')
  const data = HUBSPOT_SNAPSHOT

  // Calculs dérivés
  const winRate = useMemo(() => {
    const closed = data.dealsWon.total + data.dealsLost.total
    return closed ? (data.dealsWon.total / closed) * 100 : 0
  }, [data])

  const contactDelta = useMemo(() => {
    const prev = data.newPrevMonth.contacts
    const curr = data.newThisMonth.contacts
    if (!prev) return null
    return ((curr - prev) / prev) * 100
  }, [data])

  const pipelineChart = data.pipelines.map(p => ({ name: p.name, deals: p.deals, fill: p.color }))

  // Distribution des top deals par stage (échantillon)
  const stageColors = {
    'Proposition':  '#f59e0b',
    'Fermé gagné':  '#16a34a',
    'Fermé perdu':  '#dc2626',
    'Négociation':  '#8b5cf6',
    'Qualification':'#0ea5e9',
  }
  const stageDistribution = useMemo(() => {
    const byStage = {}
    data.topDeals.forEach(d => { byStage[d.stage] = (byStage[d.stage] || 0) + 1 })
    return Object.entries(byStage).map(([name, value]) => ({
      name, value, fill: stageColors[name] || '#64748b',
    }))
  }, [data])

  // Pipeline value estimée à partir des top deals en cours
  const openPipelineValue = useMemo(() => {
    return data.topDeals
      .filter(d => d.stage !== 'Fermé gagné' && d.stage !== 'Fermé perdu')
      .reduce((sum, d) => sum + d.amount, 0)
  }, [data])

  const updatedAgo = useMemo(() => {
    const diffMs = Date.now() - new Date(data.updatedAt).getTime()
    const m = Math.floor(diffMs / 60000)
    if (m < 60) return `il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `il y a ${h} h`
    return new Date(data.updatedAt).toLocaleDateString('fr-FR')
  }, [data])

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#ff7a59',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', color: '#fff',
          }}>🟠</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>Dashboard HubSpot</h1>
            <div style={{ fontSize: '.82rem', color: '#64748b' }}>
              Portal #{data.portalId} · Mis à jour {updatedAgo}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {['7d', '30d', '90d', 'ytd'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '.4rem .8rem',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 8,
              background: period === p ? '#ff7a59' : 'var(--card-bg, #fff)',
              color: period === p ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '.82rem',
              fontWeight: 600,
            }}>{p.toUpperCase()}</button>
          ))}
          <a
            href={`https://app-eu1.hubspot.com/contacts/${data.portalId}`}
            target="_blank" rel="noreferrer"
            style={{
              padding: '.4rem .8rem', borderRadius: 8, background: '#0f172a',
              color: '#fff', textDecoration: 'none', fontSize: '.82rem', fontWeight: 600,
            }}>
            Ouvrir HubSpot ↗
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <KpiCard
          icon="👤" label="Contacts"
          value={fmtN(data.totals.contacts)}
          sub={`+${data.newThisMonth.contacts} ce mois-ci${contactDelta !== null ? ` · ${contactDelta >= 0 ? '↑' : '↓'} ${Math.abs(contactDelta).toFixed(0)}%` : ''}`}
          subColor={contactDelta >= 0 ? '#16a34a' : '#dc2626'}
          accent="#2B4C7E"
        />
        <KpiCard
          icon="🏢" label="Entreprises"
          value={fmtN(data.totals.companies)}
          sub={`Ratio ${(data.totals.contacts / data.totals.companies).toFixed(1)} contacts/sté`}
          accent="#8b5cf6"
        />
        <KpiCard
          icon="💼" label="Deals"
          value={fmtN(data.totals.deals)}
          sub={`+${data.newThisMonth.deals} ce mois-ci`}
          subColor="#16a34a"
          accent="#f97316"
        />
        <KpiCard
          icon="🏆" label="Deals gagnés"
          value={fmtN(data.dealsWon.total)}
          sub={`${data.dealsWon.thisMonth} ce mois · win-rate ${winRate.toFixed(0)}%`}
          subColor="#16a34a"
          accent="#16a34a"
        />
        <KpiCard
          icon="💰" label="Pipeline ouvert (top 10)"
          value={fmtEUR(openPipelineValue)}
          sub={`${data.dealsProposition.total} deals en proposition`}
          accent="#f59e0b"
        />
      </div>

      {/* Row charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <ChartCard title="Deals par pipeline">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipelineChart} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip formatter={(v) => [fmtN(v), 'Deals']} />
              <Bar dataKey="deals" radius={[0, 6, 6, 0]}>
                {pipelineChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Stages des top deals"
          footer={`Distribution sur l'échantillon des ${data.topDeals.length} plus gros deals`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stageDistribution} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={3}
              >
                {stageDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} deals`, n]} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funnel (Gagné vs Perdu vs Ouvert)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { name: 'Gagné',  value: data.dealsWon.total,        fill: '#16a34a' },
                { name: 'Perdu',  value: data.dealsLost.total,       fill: '#dc2626' },
                { name: 'Proposition', value: data.dealsProposition.total, fill: '#f59e0b' },
              ]}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip formatter={(v) => [fmtN(v), 'Deals']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[
                  { fill: '#16a34a' }, { fill: '#dc2626' }, { fill: '#f59e0b' },
                ].map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tables */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1rem',
      }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, marginBottom: '1rem' }}>💼 Top 10 deals</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)', color: '#64748b' }}>
                <th style={{ textAlign: 'left', padding: '.5rem 0', fontWeight: 600 }}>Deal</th>
                <th style={{ textAlign: 'left', padding: '.5rem 0', fontWeight: 600 }}>Stage</th>
                <th style={{ textAlign: 'right', padding: '.5rem 0', fontWeight: 600 }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.topDeals.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '.55rem 0' }}>
                    <a
                      href={HUBSPOT_URL('0-3', d.id)} target="_blank" rel="noreferrer"
                      style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {d.name}
                    </a>
                  </td>
                  <td style={{ padding: '.55rem 0' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '.15rem .5rem',
                      borderRadius: 999,
                      fontSize: '.72rem',
                      fontWeight: 600,
                      background: (stageColors[d.stage] || '#64748b') + '22',
                      color: stageColors[d.stage] || '#64748b',
                    }}>{d.stage}</span>
                  </td>
                  <td style={{ padding: '.55rem 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {fmtEUR(d.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, marginBottom: '1rem' }}>🏢 Top 10 entreprises</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)', color: '#64748b' }}>
                <th style={{ textAlign: 'left', padding: '.5rem 0', fontWeight: 600 }}>Entreprise</th>
                <th style={{ textAlign: 'left', padding: '.5rem 0', fontWeight: 600 }}>Secteur</th>
                <th style={{ textAlign: 'right', padding: '.5rem 0', fontWeight: 600 }}>Deals</th>
              </tr>
            </thead>
            <tbody>
              {data.topCompanies.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '.55rem 0' }}>
                    <a
                      href={HUBSPOT_URL('0-2', c.id)} target="_blank" rel="noreferrer"
                      style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {c.name}
                    </a>
                  </td>
                  <td style={{ padding: '.55rem 0', color: '#64748b' }}>{c.industry}</td>
                  <td style={{ padding: '.55rem 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {c.deals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '.85rem 1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: '.82rem', color: '#92400e' }}>
        💡 <strong>Données statiques</strong> — snapshot du 24/04/2026. Pour un flux live, brancher une edge function <code>hubspot-proxy</code> qui lit la clé API stockée dans <code>integrations_config</code> et remplace la constante <code>HUBSPOT_SNAPSHOT</code>.
      </div>
    </div>
  )
}
