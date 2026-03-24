import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter,
  ZAxis,
} from 'recharts'

// ── Helpers ─────────────────────────────────────────────────────
function fmtMontant(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(1) + ' %'
}

function fmtHeures(n) {
  if (n == null) return '—'
  return Number(n).toFixed(1) + ' h'
}

const COLORS = {
  primary: '#1a5c82',
  green: '#16a34a',
  orange: '#f59e0b',
  red: '#dc2626',
  grey: '#94a3b8',
  blue2: '#4a8fad',
  blue3: '#8ec6d8',
}

// ── Status badge ────────────────────────────────────────────────
function MarginBadge({ pct }) {
  if (pct == null || isNaN(pct)) return <span className="rent-badge rent-badge--neutral">—</span>
  if (pct > 20) return <span className="rent-badge rent-badge--green">Rentable</span>
  if (pct >= 0) return <span className="rent-badge rent-badge--orange">Attention</span>
  return <span className="rent-badge rent-badge--red">Déficitaire</span>
}

// ── Budget warning icon ─────────────────────────────────────────
function BudgetWarning({ consumed, budget }) {
  if (!budget || budget <= 0) return null
  const ratio = consumed / budget
  if (ratio > 1) return <span title="Budget dépassé !" style={{ color: COLORS.red, marginLeft: 4 }}>⛔</span>
  if (ratio >= 0.8) return <span title="Budget bientôt épuisé (>80%)" style={{ color: COLORS.orange, marginLeft: 4 }}>⚠️</span>
  return null
}

// ── Custom tooltip ──────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.82rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmtMontant(p.value)}</div>
      ))}
    </div>
  )
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.82rem' }}>
      <div style={{ fontWeight: 600 }}>{d.projetName}</div>
      <div>Heures: {fmtHeures(d.x)}</div>
      <div>Marge: {fmtMontant(d.y)}</div>
    </div>
  )
}

// ── CSV export ──────────────────────────────────────────────────
function downloadCSV(filename, rows, headers) {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function RentabilitePage() {
  const { selectedSociete } = useSociete()

  const [loading, setLoading] = useState(true)
  const [projets, setProjets] = useState([])
  const [clients, setClients] = useState([])
  const [saisies, setSaisies] = useState([])
  const [lots, setLots] = useState([])
  const [equipe, setEquipe] = useState([])
  const [transactions, setTransactions] = useState([])

  // Filters
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [marginThreshold, setMarginThreshold] = useState(0)

  // Detail expand
  const [expandedId, setExpandedId] = useState(null)

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSociete?.id) return
    loadAll()
  }, [selectedSociete?.id])

  async function loadAll() {
    setLoading(true)
    const sid = selectedSociete.id

    const [
      { data: projetsData },
      { data: clientsData },
      { data: saisiesData },
      { data: lotsData },
      { data: equipeData },
      { data: transData },
    ] = await Promise.all([
      supabase.from('projets').select('*').eq('societe_id', sid),
      supabase.from('clients').select('*').eq('societe_id', sid),
      supabase.from('saisies_temps').select('*').eq('societe_id', sid),
      supabase.from('lots').select('*').eq('societe_id', sid),
      supabase.from('equipe').select('*').eq('societe_id', sid),
      supabase.from('transactions').select('*').eq('societe_id', sid),
    ])

    setProjets(projetsData || [])
    setClients(clientsData || [])
    setSaisies(saisiesData || [])
    setLots(lotsData || [])
    setEquipe(equipeData || [])
    setTransactions(transData || [])
    setLoading(false)
  }

  // ── Lookup maps ────────────────────────────────────────────
  const clientMap = useMemo(() => Object.fromEntries((clients || []).map(c => [c.id, c])), [clients])
  const lotMap = useMemo(() => Object.fromEntries((lots || []).map(l => [l.id, l])), [lots])
  const projetMap = useMemo(() => Object.fromEntries((projets || []).map(p => [p.id, p])), [projets])

  // ── Average hourly rate ────────────────────────────────────
  const avgHourlyRate = useMemo(() => {
    const withSalary = equipe.filter(e => e.salaire_brut > 0)
    if (withSalary.length === 0) return 35 // fallback
    const total = withSalary.reduce((s, e) => s + Number(e.salaire_brut), 0)
    // salaire_brut annuel / 12 mois / 151.67 heures mensuelles
    return (total / withSalary.length) / 12 / 151.67
  }, [equipe])

  // ── Per-collaborator hourly rate map ───────────────────────
  const collabRateMap = useMemo(() => {
    const map = {}
    for (const e of equipe) {
      map[e.id] = e.salaire_brut > 0 ? Number(e.salaire_brut) / 12 / 151.67 : avgHourlyRate
    }
    return map
  }, [equipe, avgHourlyRate])

  // ── Map saisie → projet_id ─────────────────────────────────
  function getProjetIdFromSaisie(s) {
    const lot = lotMap[s.lot_id]
    if (lot?.projet_id) return lot.projet_id
    try {
      const meta = typeof s.commentaire === 'string' ? JSON.parse(s.commentaire) : s.commentaire
      if (meta?.projet_id) return meta.projet_id
    } catch {}
    return null
  }

  // ── Hours by project ──────────────────────────────────────
  const hoursByProjet = useMemo(() => {
    const map = {} // projet_id → { total, byCollab: { user_id → hours }, byMonth: { YYYY-MM → hours } }
    for (const s of saisies) {
      const pid = getProjetIdFromSaisie(s)
      if (!pid) continue
      // Apply date filter
      if (filterDateFrom && s.date < filterDateFrom) continue
      if (filterDateTo && s.date > filterDateTo) continue

      if (!map[pid]) map[pid] = { total: 0, byCollab: {}, byMonth: {} }
      const h = Number(s.heures) || 0
      map[pid].total += h
      map[pid].byCollab[s.user_id] = (map[pid].byCollab[s.user_id] || 0) + h
      const month = s.date?.slice(0, 7)
      if (month) map[pid].byMonth[month] = (map[pid].byMonth[month] || 0) + h
    }
    return map
  }, [saisies, lotMap, filterDateFrom, filterDateTo])

  // ── Cost by project (hours × individual rate) ──────────────
  const costByProjet = useMemo(() => {
    const map = {}
    for (const s of saisies) {
      const pid = getProjetIdFromSaisie(s)
      if (!pid) continue
      if (filterDateFrom && s.date < filterDateFrom) continue
      if (filterDateTo && s.date > filterDateTo) continue
      const h = Number(s.heures) || 0
      const rate = collabRateMap[s.user_id] || avgHourlyRate
      map[pid] = (map[pid] || 0) + h * rate
    }
    return map
  }, [saisies, lotMap, collabRateMap, avgHourlyRate, filterDateFrom, filterDateTo])

  // ── Budget per project: transactions won (ferme phase) matched by client ──
  const budgetByProjet = useMemo(() => {
    // Best effort: match transactions to projects via client_id
    // Also use total_jours * TJM estimate as fallback budget
    const map = {}
    // Sum won transactions per client
    const wonByClient = {}
    for (const t of transactions) {
      if (t.phase === 'ferme' && t.montant) {
        wonByClient[t.client_id] = (wonByClient[t.client_id] || 0) + Number(t.montant)
      }
    }
    // Count projects per client to distribute budget
    const projetsByClient = {}
    for (const p of projets) {
      if (!p.client_id) continue
      if (!projetsByClient[p.client_id]) projetsByClient[p.client_id] = []
      projetsByClient[p.client_id].push(p.id)
    }

    for (const p of projets) {
      // Option 1: client has won transactions → distribute budget evenly across projects
      const clientBudget = wonByClient[p.client_id] || 0
      const siblings = projetsByClient[p.client_id]?.length || 1
      const fromTransactions = clientBudget / siblings

      // Option 2: from total_jours × average daily rate (TJM = hourly * 8)
      const tjm = avgHourlyRate * 8
      const fromJours = (Number(p.total_jours) || 0) * tjm

      // Use transaction budget if available, otherwise estimated from jours
      map[p.id] = fromTransactions > 0 ? fromTransactions : fromJours
    }
    return map
  }, [projets, transactions, avgHourlyRate])

  // ── Planned hours per project (from assignations via lots) ──
  const plannedHours = useMemo(() => {
    const map = {}
    for (const p of projets) {
      map[p.id] = (Number(p.total_jours) || 0) * 8
    }
    return map
  }, [projets])

  // ── Profitability rows ─────────────────────────────────────
  const rows = useMemo(() => {
    return projets.map(p => {
      const client = clientMap[p.client_id]
      const budget = budgetByProjet[p.id] || 0
      const heuresReelles = hoursByProjet[p.id]?.total || 0
      const heuresPlanifiees = plannedHours[p.id] || 0
      const coutReel = costByProjet[p.id] || 0
      const marge = budget - coutReel
      const margePct = budget > 0 ? (marge / budget) * 100 : (coutReel > 0 ? -100 : 0)

      let status = 'rentable'
      if (margePct < 0) status = 'deficitaire'
      else if (margePct <= 20) status = 'attention'

      return {
        id: p.id,
        projet: p,
        clientName: client?.name || '—',
        clientId: p.client_id,
        budget,
        heuresPlanifiees,
        heuresReelles,
        coutReel,
        marge,
        margePct,
        status,
        byCollab: hoursByProjet[p.id]?.byCollab || {},
        byMonth: hoursByProjet[p.id]?.byMonth || {},
      }
    }).filter(r => {
      if (filterClient && r.clientId !== filterClient) return false
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterSearch && !r.projet.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
      return true
    }).sort((a, b) => a.projet.name.localeCompare(b.projet.name))
  }, [projets, clientMap, budgetByProjet, hoursByProjet, plannedHours, costByProjet, filterClient, filterStatus, filterSearch])

  const { sortedData: sortedRows, sortKey, sortDir, requestSort } = useSortableTable(rows)

  // ── KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const margeMoyenne = rows.length > 0
      ? rows.reduce((s, r) => s + r.margePct, 0) / rows.length
      : 0
    const rentables = rows.filter(r => r.status === 'rentable').length
    const enAlerte = rows.filter(r => r.status === 'attention' || r.status === 'deficitaire').length
    const caTotal = rows.reduce((s, r) => s + r.budget, 0)
    return { margeMoyenne, rentables, enAlerte, caTotal }
  }, [rows])

  // ── Chart data: Budget vs Coût (top 10) ────────────────────
  const barChartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 10)
      .map(r => ({
        name: r.projet.name.length > 20 ? r.projet.name.slice(0, 18) + '…' : r.projet.name,
        budget: Math.round(r.budget),
        cout: Math.round(r.coutReel),
      }))
  }, [rows])

  // ── Chart data: Donut overall margin ──────────────────────
  const donutData = useMemo(() => {
    const pct = Math.max(0, Math.min(100, kpis.margeMoyenne))
    return [
      { name: 'Marge', value: pct },
      { name: 'Reste', value: 100 - pct },
    ]
  }, [kpis.margeMoyenne])

  // ── Chart data: Scatter (heures vs marge) ─────────────────
  const scatterData = useMemo(() => {
    return rows.filter(r => r.heuresReelles > 0).map(r => ({
      x: r.heuresReelles,
      y: r.marge,
      z: r.budget,
      projetName: r.projet.name,
      fill: r.status === 'rentable' ? COLORS.green : r.status === 'attention' ? COLORS.orange : COLORS.red,
    }))
  }, [rows])

  // ── Detail: monthly cost evolution for expanded project ────
  const detailMonths = useMemo(() => {
    if (!expandedId) return []
    const row = rows.find(r => r.id === expandedId)
    if (!row) return []
    const entries = Object.entries(row.byMonth).sort(([a], [b]) => a.localeCompare(b))
    let cumul = 0
    return entries.map(([month, hours]) => {
      const cost = hours * avgHourlyRate
      cumul += cost
      return { month, heures: hours, cout: Math.round(cost), cumulCout: Math.round(cumul) }
    })
  }, [expandedId, rows, avgHourlyRate])

  // ── Detail: hours by collaborator ─────────────────────────
  const detailCollabs = useMemo(() => {
    if (!expandedId) return []
    const row = rows.find(r => r.id === expandedId)
    if (!row) return []
    return Object.entries(row.byCollab)
      .map(([uid, h]) => {
        const member = equipe.find(e => e.id === uid)
        return { name: member ? `${member.prenom} ${member.nom}` : uid, heures: h }
      })
      .sort((a, b) => b.heures - a.heures)
  }, [expandedId, rows, equipe])

  // ── Export CSV ─────────────────────────────────────────────
  function exportCSV() {
    const headers = ['Projet', 'Client', 'Budget vendu', 'Heures planifiées', 'Heures réelles', 'Coût réel', 'Marge (€)', 'Marge (%)', 'Statut']
    const csvRows = rows.map(r => [
      r.projet.name, r.clientName, Math.round(r.budget), r.heuresPlanifiees.toFixed(1),
      r.heuresReelles.toFixed(1), Math.round(r.coutReel), Math.round(r.marge),
      r.margePct.toFixed(1), r.status,
    ])
    downloadCSV('rentabilite-projets.csv', csvRows, headers)
  }

  // ── Render ────────────────────────────────────────────────
  if (!selectedSociete) {
    return <div className="page-empty">Sélectionnez une société.</div>
  }

  return (
    <div className="rent-page">
      {/* Header */}
      <div className="page-header">
        <h1>Rentabilité Projet</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
          <button className="btn btn--secondary btn--sm" onClick={() => loadAll()}>Actualiser</button>
          <button className="btn btn--secondary btn--sm" onClick={exportCSV}>Exporter CSV</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Chargement…</div>
      ) : (
        <div className="rent-content">

          {/* ── KPI Cards ──────────────────────────────────── */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Marge moyenne</div>
              <div className="kpi-value" style={{ color: kpis.margeMoyenne >= 20 ? COLORS.green : kpis.margeMoyenne >= 0 ? COLORS.orange : COLORS.red }}>
                {fmtPct(kpis.margeMoyenne)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Projets rentables</div>
              <div className="kpi-value" style={{ color: COLORS.green }}>{kpis.rentables}</div>
              <div className="kpi-sub">marge &gt; 20%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Projets en alerte</div>
              <div className="kpi-value" style={{ color: COLORS.orange }}>{kpis.enAlerte}</div>
              <div className="kpi-sub">attention + déficitaire</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">CA total projets</div>
              <div className="kpi-value">{fmtMontant(kpis.caTotal)}</div>
            </div>
          </div>

          {/* ── Filters ───────────────────────────────────── */}
          <div className="rent-filters">
            <input
              className="field rent-filter-search"
              type="text"
              placeholder="Rechercher un projet…"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
            <select className="field" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
              <option value="">Tous les clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="rentable">Rentable</option>
              <option value="attention">Attention</option>
              <option value="deficitaire">Déficitaire</option>
            </select>
            <input className="field" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Date début" />
            <input className="field" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Date fin" />
            <div className="rent-threshold">
              <label style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Seuil alerte (%)</label>
              <input className="field" type="number" style={{ width: 70 }} value={marginThreshold} onChange={e => setMarginThreshold(Number(e.target.value))} />
            </div>
          </div>

          {/* ── Charts ────────────────────────────────────── */}
          <div className="rent-charts-grid">
            {/* Bar chart: Budget vs Coût */}
            <div className="rent-chart-card">
              <h3>Budget vs Coût réel (Top 10)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<BarTooltip />} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="budget" name="Budget vendu" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cout" name="Coût réel" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut: Overall margin */}
            <div className="rent-chart-card">
              <h3>Marge globale</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={i === 0
                        ? (kpis.margeMoyenne >= 20 ? COLORS.green : kpis.margeMoyenne >= 0 ? COLORS.orange : COLORS.red)
                        : '#e5e7eb'
                      } />
                    ))}
                  </Pie>
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: '1.8rem', fontWeight: 800, fill: 'var(--text)' }}>
                    {fmtPct(kpis.margeMoyenne)}
                  </text>
                  <text x="50%" y="62%" textAnchor="middle"
                    style={{ fontSize: '.8rem', fill: 'var(--text-muted)' }}>
                    marge moyenne
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Scatter: Hours vs Margin */}
            <div className="rent-chart-card rent-chart-card--wide">
              <h3>Heures travaillées vs Marge par projet</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name="Heures" tick={{ fontSize: 11 }} label={{ value: 'Heures', position: 'bottom', offset: -5, fontSize: 12 }} />
                  <YAxis dataKey="y" name="Marge" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} label={{ value: 'Marge (€)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ZAxis dataKey="z" range={[40, 400]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────── */}
          <div className="reporting-table-wrapper">
            <table className="reporting-table">
              <thead>
                <tr>
                  <SortableHeader label="Projet" field="projet.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Client" field="clientName" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Budget vendu" field="budget" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="H. planifiées" field="heuresPlanifiees" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="H. réelles" field="heuresReelles" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Coût réel" field="coutReel" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Marge (€)" field="marge" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Marge (%)" field="margePct" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Statut" field="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucun projet trouvé</td></tr>
                )}
                {sortedRows.map(r => {
                  const isAlert = r.margePct < marginThreshold
                  const isExpanded = expandedId === r.id
                  return (
                    <>
                      <tr
                        key={r.id}
                        className={`rent-row ${isAlert ? 'rent-row--alert' : ''} ${isExpanded ? 'rent-row--expanded' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.projet.name}</span>
                          <BudgetWarning consumed={r.coutReel} budget={r.budget} />
                        </td>
                        <td>{r.clientName}</td>
                        <td style={{ textAlign: 'right' }}>{fmtMontant(r.budget)}</td>
                        <td style={{ textAlign: 'right' }}>{fmtHeures(r.heuresPlanifiees)}</td>
                        <td style={{ textAlign: 'right' }}>{fmtHeures(r.heuresReelles)}</td>
                        <td style={{ textAlign: 'right' }}>{fmtMontant(r.coutReel)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: r.marge >= 0 ? COLORS.green : COLORS.red }}>
                          {fmtMontant(r.marge)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: r.margePct >= 20 ? COLORS.green : r.margePct >= 0 ? COLORS.orange : COLORS.red }}>
                          {fmtPct(r.margePct)}
                        </td>
                        <td><MarginBadge pct={r.margePct} /></td>
                      </tr>

                      {/* ── Expanded detail ──────────────── */}
                      {isExpanded && (
                        <tr key={r.id + '-detail'} className="rent-detail-row">
                          <td colSpan={9}>
                            <div className="rent-detail">
                              {/* Budget remaining */}
                              <div className="rent-detail-section">
                                <h4>Budget restant</h4>
                                <div className="rent-detail-budget">
                                  <div className="rent-budget-bar-wrap">
                                    <div
                                      className="rent-budget-bar-fill"
                                      style={{
                                        width: `${Math.min(100, r.budget > 0 ? (r.coutReel / r.budget) * 100 : 0)}%`,
                                        background: r.coutReel > r.budget ? COLORS.red : r.coutReel / r.budget > 0.8 ? COLORS.orange : COLORS.green,
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                                    {fmtMontant(r.coutReel)} / {fmtMontant(r.budget)} consommés
                                    — Reste : <strong style={{ color: r.marge >= 0 ? COLORS.green : COLORS.red }}>{fmtMontant(r.marge)}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Hours by collaborator */}
                              <div className="rent-detail-section">
                                <h4>Répartition par collaborateur</h4>
                                {detailCollabs.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Aucune saisie</div>
                                ) : (
                                  <div className="rent-detail-collabs">
                                    {detailCollabs.map((c, i) => (
                                      <div key={i} className="rent-detail-collab-item">
                                        <span>{c.name}</span>
                                        <span style={{ fontWeight: 600 }}>{fmtHeures(c.heures)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Monthly cost evolution */}
                              <div className="rent-detail-section">
                                <h4>Évolution mensuelle du coût</h4>
                                {detailMonths.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Aucune donnée</div>
                                ) : (
                                  <table className="rent-detail-table">
                                    <thead>
                                      <tr>
                                        <th>Mois</th>
                                        <th style={{ textAlign: 'right' }}>Heures</th>
                                        <th style={{ textAlign: 'right' }}>Coût</th>
                                        <th style={{ textAlign: 'right' }}>Coût cumulé</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailMonths.map((m, i) => (
                                        <tr key={i}>
                                          <td>{m.month}</td>
                                          <td style={{ textAlign: 'right' }}>{fmtHeures(m.heures)}</td>
                                          <td style={{ textAlign: 'right' }}>{fmtMontant(m.cout)}</td>
                                          <td style={{ textAlign: 'right' }}>{fmtMontant(m.cumulCout)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>TOTAL ({rows.length} projets)</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtMontant(rows.reduce((s, r) => s + r.budget, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtHeures(rows.reduce((s, r) => s + r.heuresPlanifiees, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtHeures(rows.reduce((s, r) => s + r.heuresReelles, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtMontant(rows.reduce((s, r) => s + r.coutReel, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtMontant(rows.reduce((s, r) => s + r.marge, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtPct(kpis.margeMoyenne)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
