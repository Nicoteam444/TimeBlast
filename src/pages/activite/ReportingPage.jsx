import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

function splitFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  if (parts.length <= 1) return { prenom: '', nom: parts[0] || '—' }
  return { prenom: parts[0], nom: parts.slice(1).join(' ') }
}

// ── Helpers ISO week ──────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'})
}

function fmtNum(n, decimals = 1) {
  return n == null ? '—' : Number(n).toFixed(decimals)
}

// ── Periode helpers ───────────────────────────────────────────
function periodeRange(periode, year) {
  const y = parseInt(year, 10)
  const now = new Date()
  if (periode === 'semaine') {
    const mon = getMondayOfWeek(now)
    return { start: toISO(mon), end: toISO(addDays(mon, 6)) }
  }
  if (periode === 'mois') {
    const m = now.getMonth()
    return {
      start: toISO(new Date(y, m, 1)),
      end: toISO(new Date(y, m + 1, 0))}
  }
  if (periode === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3)
    return {
      start: toISO(new Date(y, q * 3, 1)),
      end: toISO(new Date(y, q * 3 + 3, 0))}
  }
  // annee
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

// ── CSV export ────────────────────────────────────────────────
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

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ pct }) {
  if (pct == null || isNaN(pct)) return <span className="badge badge--neutral">—</span>
  if (pct > 100) return <span className="badge badge--red">Dépassé</span>
  if (pct >= 80) return <span className="badge badge--yellow">Attention</span>
  return <span className="badge badge--green">OK</span>
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ pct }) {
  const clamped = Math.min(Math.max(pct || 0, 0), 120)
  const color = pct > 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#16a34a'
  return (
    <div className="reporting-progress-bar">
      <div
        style={{
          width: `${Math.min(clamped, 100)}%`,
          background: color,
          height: '100%',
          borderRadius: 4,
          transition: 'width .3s'}}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ReportingPage() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const highlightRef = useRef(null)

  // Auto-scroll to highlighted row & clear param after 4s
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (highlightId) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true })
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [highlightId, highlightRef.current])

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)

  // Raw data
  const [saisies, setSaisies] = useState([])
  const [projets, setProjets] = useState([])
  const [lots, setLots] = useState([])
  const [clients, setClients] = useState([])
  const [collaborateurs, setCollaborateurs] = useState([])

  // Tab 1 filters
  const [t1Periode, setT1Periode] = useState('mois')
  const [t1Year, setT1Year] = useState(String(new Date().getFullYear()))
  const [t1Projet, setT1Projet] = useState('')
  const [t1Collab, setT1Collab] = useState('')

  // Tab 2 filters
  const [t2Weeks, setT2Weeks] = useState(8)

  // Tab 4 filters + pagination
  const [t4Search, setT4Search] = useState('')
  const [t4Collab, setT4Collab] = useState('')
  const [t4Projet, setT4Projet] = useState('')
  const [t4Page, setT4Page] = useState(1)
  const T4_PAGE_SIZE = 20

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const sid = null

    const [
      { data: saisiesData },
      { data: projetsData },
      { data: lotsData },
      { data: clientsData },
      { data: collabsData },
    ] = await Promise.all([
      supabase.from('saisies_temps').select('*').eq('societe_id', sid),
      supabase.from('projets').select('*').eq('societe_id', sid),
      supabase.from('lots').select('*').eq('societe_id', sid),
      supabase.from('clients').select('*').eq('societe_id', sid),
      supabase.from('profiles').select('*').eq('societe_id', sid).in('role', ['collaborateur', 'manager', 'admin']),
    ])

    setSaisies(saisiesData || [])
    setProjets(projetsData || [])
    setLots(lotsData || [])
    setClients(clientsData || [])
    setCollaborateurs(collabsData || [])
    setLoading(false)
  }

  // ── Lookup maps ─────────────────────────────────────────────
  const clientMap = useMemo(() => Object.fromEntries((clients || []).map(c => [c.id, c])), [clients])
  const projetMap = useMemo(() => Object.fromEntries((projets || []).map(p => [p.id, p])), [projets])
  const lotMap = useMemo(() => Object.fromEntries((lots || []).map(l => [l.id, l])), [lots])
  const collabMap = useMemo(() => Object.fromEntries((collaborateurs || []).map(c => [c.id, c])), [collaborateurs])

  // ── Tab 1: Heures par projet ─────────────────────────────────
  const t1Range = useMemo(() => periodeRange(t1Periode, t1Year), [t1Periode, t1Year])

  const t1Rows = useMemo(() => {
    const filteredSaisies = saisies.filter(s => {
      if (s.date < t1Range.start || s.date > t1Range.end) return false
      if (t1Collab && s.user_id !== t1Collab) return false
      return true
    })

    // Group by projet (via lot_id ou commentaire JSON)
    const byProjet = {}
    for (const s of filteredSaisies) {
      let projetId = null
      let projetName = null
      let clientName = '—'

      // Méthode 1 : via lot_id
      const lot = lotMap[s.lot_id]
      if (lot?.projet_id) {
        projetId = lot.projet_id
        const projet = projetMap[projetId]
        if (projet) {
          projetName = projet.name
          clientName = clientMap[projet.client_id]?.name || '—'
        }
      }

      // Méthode 2 : via commentaire JSON (saisies créées depuis le calendrier)
      if (!projetId && s.commentaire) {
        try {
          const meta = typeof s.commentaire === 'string' ? JSON.parse(s.commentaire) : s.commentaire
          if (meta.projet_id) {
            projetId = meta.projet_id
            const projet = projetMap[projetId]
            projetName = projet?.name || meta.projet_name || '—'
            clientName = projet ? (clientMap[projet.client_id]?.name || '—') : '—'
          }
        } catch {}
      }

      if (!projetId) continue
      if (t1Projet && projetId !== t1Projet) continue

      if (!byProjet[projetId]) {
        byProjet[projetId] = {
          projetId,
          projetName: projetName || '—',
          clientName,
          totalHeures: 0,
          intervenants: new Set()}
      }
      byProjet[projetId].totalHeures += Number(s.heures) || 0
      byProjet[projetId].intervenants.add(s.user_id)
    }

    return Object.values(byProjet).map(r => ({
      ...r,
      totalJours: r.totalHeures / 8,
      nbIntervenants: r.intervenants.size})).sort((a, b) => a.projetName.localeCompare(b.projetName))
  }, [saisies, lotMap, projetMap, clientMap, t1Range, t1Projet, t1Collab])

  const t1Total = useMemo(() => ({
    totalHeures: t1Rows.reduce((s, r) => s + r.totalHeures, 0),
    totalJours: t1Rows.reduce((s, r) => s + r.totalJours, 0)}), [t1Rows])

  const { sortedData: sortedT1, sortKey: t1SortKey, sortDir: t1SortDir, requestSort: t1RequestSort } = useSortableTable(t1Rows)

  function exportT1CSV() {
    const headers = ['Projet', 'Client', 'Heures saisies', 'Jours', 'Nb intervenants']
    const rows = t1Rows.map(r => [r.projetName, r.clientName, fmtNum(r.totalHeures, 2), fmtNum(r.totalJours, 2), r.nbIntervenants])
    rows.push(['TOTAL', '', fmtNum(t1Total.totalHeures, 2), fmtNum(t1Total.totalJours, 2), ''])
    downloadCSV(`heures-par-projet-${t1Range.start}-${t1Range.end}.csv`, rows, headers)
  }

  // ── Tab 2: Taux d'occupation ─────────────────────────────────
  const t2Columns = useMemo(() => {
    const today = new Date()
    const currentMonday = getMondayOfWeek(today)
    const cols = []
    for (let i = t2Weeks - 1; i >= 0; i--) {
      const mon = new Date(currentMonday)
      mon.setDate(mon.getDate() - i * 7)
      cols.push(toISO(mon))
    }
    return cols
  }, [t2Weeks])

  const t2Data = useMemo(() => {
    return collaborateurs.map(collab => {
      const weekTotals = {}
      for (const mondayISO of t2Columns) {
        const sun = toISO(addDays(new Date(mondayISO), 6))
        const h = saisies
          .filter(s => s.user_id === collab.id && s.date >= mondayISO && s.date <= sun).reduce((acc, s) => acc + (Number(s.heures) || 0), 0)
        weekTotals[mondayISO] = h
      }
      const totalH = Object.values(weekTotals).reduce((a, b) => a + b, 0)
      const avgH = totalH / t2Columns.length
      const avgPct = Math.round((avgH / 35) * 100)
      return { collab, weekTotals, avgPct }
    }).sort((a, b) => (a.collab.full_name || '').localeCompare(b.collab.full_name || ''))
  }, [collaborateurs, saisies, t2Columns])

  function t2CellClass(heures) {
    if (heures >= 35) return 'taux-cell--green'
    if (heures >= 28) return 'taux-cell--yellow'
    return 'taux-cell--red'
  }

  function fmtMonday(iso) {
    const d = new Date(iso + 'T12:00:00')
    const week = getISOWeek(d)
    return `S${week}\n${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
  }

  // ── Tab 3: Écart planifié vs réalisé ─────────────────────────
  const t3Rows = useMemo(() => {
    return projets.map(projet => {
      const projetLots = lots.filter(l => l.projet_id === projet.id)
      const lotIds = new Set(projetLots.map(l => l.id))
      const heuresSaisies = saisies
        .filter(s => lotIds.has(s.lot_id)).reduce((acc, s) => acc + (Number(s.heures) || 0), 0)
      const joursVendus = Number(projet.total_jours) || 0
      const joursConsom = heuresSaisies / 8
      const joursRestants = joursVendus - joursConsom
      const avancement = joursVendus > 0 ? (joursConsom / joursVendus) * 100 : null
      return {
        projet,
        client: clientMap[projet.client_id],
        heuresSaisies,
        joursVendus,
        joursConsom,
        joursRestants,
        avancement}
    }).sort((a, b) => a.projet.name.localeCompare(b.projet.name))
  }, [projets, lots, saisies, clientMap])

  const { sortedData: sortedT3, sortKey: t3SortKey, sortDir: t3SortDir, requestSort: t3RequestSort } = useSortableTable(t3Rows)

  // ── Helper: extraire projetId depuis lot_id ou commentaire ──
  function getProjetInfo(s) {
    const lot = lotMap[s.lot_id]
    if (lot?.projet_id) {
      const projet = projetMap[lot.projet_id]
      return { projetId: lot.projet_id, projetName: projet?.name || '—', lotName: lot.name || '—' }
    }
    try {
      const meta = typeof s.commentaire === 'string' ? JSON.parse(s.commentaire) : s.commentaire
      if (meta?.projet_id) {
        const projet = projetMap[meta.projet_id]
        return { projetId: meta.projet_id, projetName: projet?.name || meta.projet_name || '—', lotName: '—' }
      }
    } catch {}
    return { projetId: null, projetName: '—', lotName: '—' }
  }

  // ── Tab 4: Détail saisies ─────────────────────────────────────
  const t4Filtered = useMemo(() => {
    return saisies.filter(s => {
      if (t4Collab && s.user_id !== t4Collab) return false
      if (t4Projet) {
        const info = getProjetInfo(s)
        if (info.projetId !== t4Projet) return false
      }
      if (t4Search) {
        const q = t4Search.toLowerCase()
        const collab = collabMap[s.user_id]?.full_name?.toLowerCase() || ''
        const info = getProjetInfo(s)
        const comment = (typeof s.commentaire === 'string' ? s.commentaire : '').toLowerCase()
        if (!collab.includes(q) && !info.projetName.toLowerCase().includes(q) && !comment.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [saisies, lotMap, projetMap, collabMap, t4Collab, t4Projet, t4Search])

  const { sortedData: sortedT4, sortKey: t4SortKey, sortDir: t4SortDir, requestSort: t4RequestSort } = useSortableTable(t4Filtered)

  const t4Pages = Math.max(1, Math.ceil(sortedT4.length / T4_PAGE_SIZE))
  const t4Paginated = sortedT4.slice((t4Page - 1) * T4_PAGE_SIZE, t4Page * T4_PAGE_SIZE)

  function exportT4CSV() {
    const headers = ['Date', 'Collaborateur', 'Projet', 'Lot', 'Heures', 'Commentaire']
    const rows = t4Filtered.map(s => {
      const info = getProjetInfo(s)
      const collab = collabMap[s.user_id]
      return [
        fmtDate(s.date),
        collab?.full_name || s.user_id,
        info.projetName,
        info.lotName,
        fmtNum(s.heures, 2),
        typeof s.commentaire === 'string' ? s.commentaire : '',
      ]
    })
    downloadCSV('detail-saisies.csv', rows, headers)
  }

  // ── Render ────────────────────────────────────────────────────
  

  if (loading) {
    return (
      <div className="page-content">
        <Spinner />
      </div>
    )
  }

  const noData = saisies.length === 0

  const tabs = [
    'Heures par projet',
    "Taux d'occupation",
    'Écart planifié vs réalisé',
    'Détail saisies',
  ]

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1>Reporting</h1>
      </div>

      {noData && (
        <div className="reporting-no-data">
          Données insuffisantes — aucune saisie de temps trouvée pour cette société.
        </div>
      )}

      {/* Tabs */}
      <div className="reporting-tabs">
        {tabs.map((label, i) => (
          <button
            key={i}
            className={`reporting-tab-btn${activeTab === i ? ' reporting-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Heures par projet ── */}
      {activeTab === 0 && (
        <div className="reporting-tab-content">
          <div className="reporting-filters">
            <label>
              Période
              <select value={t1Periode} onChange={e => setT1Periode(e.target.value)}>
                <option value="semaine">Cette semaine</option>
                <option value="mois">Ce mois</option>
                <option value="trimestre">Ce trimestre</option>
                <option value="annee">Toute l'année</option>
              </select>
            </label>
            <label>
              Année
              <select value={t1Year} onChange={e => setT1Year(e.target.value)}>
                {['2024', '2025', '2026'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              Projet
              <select value={t1Projet} onChange={e => setT1Projet(e.target.value)}>
                <option value="">Tous les projets</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              Collaborateur
              <select value={t1Collab} onChange={e => setT1Collab(e.target.value)}>
                <option value="">Tous</option>
                {collaborateurs.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={exportT1CSV}>
              Exporter CSV
            </button>
          </div>

          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
            Période : {fmtDate(t1Range.start)} – {fmtDate(t1Range.end)}
          </div>

          {t1Rows.length === 0 ? (
            <div className="reporting-empty">Aucune saisie pour cette période.</div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <SortableHeader label="Projet" field="projetName" sortKey={t1SortKey} sortDir={t1SortDir} onSort={t1RequestSort} />
                    <SortableHeader label="Client" field="clientName" sortKey={t1SortKey} sortDir={t1SortDir} onSort={t1RequestSort} />
                    <SortableHeader label="Heures saisies" field="totalHeures" sortKey={t1SortKey} sortDir={t1SortDir} onSort={t1RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Jours" field="totalJours" sortKey={t1SortKey} sortDir={t1SortDir} onSort={t1RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Intervenants" field="nbIntervenants" sortKey={t1SortKey} sortDir={t1SortDir} onSort={t1RequestSort} style={{ textAlign: 'right' }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedT1.map(r => (
                    <tr key={r.projetId}>
                      <td>{r.projetName}</td>
                      <td>{r.clientName}</td>
                      <td className="text-right">{fmtNum(r.totalHeures, 1)} h</td>
                      <td className="text-right">{fmtNum(r.totalJours, 2)} j</td>
                      <td className="text-right">{r.nbIntervenants}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="reporting-total-row">
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="text-right"><strong>{fmtNum(t1Total.totalHeures, 1)} h</strong></td>
                    <td className="text-right"><strong>{fmtNum(t1Total.totalJours, 2)} j</strong></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Taux d'occupation ── */}
      {activeTab === 1 && (
        <div className="reporting-tab-content">
          <div className="reporting-filters">
            <label>
              Nombre de semaines
              <select value={t2Weeks} onChange={e => setT2Weeks(Number(e.target.value))}>
                {[4, 8, 12].map(n => (
                  <option key={n} value={n}>{n} semaines</option>
                ))}
              </select>
            </label>
          </div>

          <div className="reporting-legend" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '.8rem', flexWrap: 'wrap' }}>
            <span><span className="taux-legend-dot taux-cell--green" /> ≥ 35 h/sem</span>
            <span><span className="taux-legend-dot taux-cell--yellow" /> 28–34 h/sem</span>
            <span><span className="taux-legend-dot taux-cell--red" /> &lt; 28 h/sem</span>
          </div>

          {t2Data.length === 0 ? (
            <div className="reporting-empty">Aucun collaborateur trouvé.</div>
          ) : (
            <div className="taux-grid-wrapper">
              <table className="taux-grid">
                <thead>
                  <tr>
                    <th className="taux-name-col">Nom</th>
                    <th className="taux-name-col">Prénom</th>
                    {t2Columns.map(iso => (
                      <th key={iso} className="taux-week-col">
                        {fmtMonday(iso).split('\n').map((line, i) => (
                          <span key={i} style={{ display: 'block', lineHeight: 1.3 }}>{line}</span>
                        ))}
                      </th>
                    ))}
                    <th className="taux-avg-col">Moy. occupation</th>
                  </tr>
                </thead>
                <tbody>
                  {t2Data.map(({ collab, weekTotals, avgPct }) => (
                    <tr key={collab.id}>
                      <td className="taux-name-col">{splitFullName(collab.full_name).nom}</td>
                      <td className="taux-name-col">{splitFullName(collab.full_name).prenom}</td>
                      {t2Columns.map(iso => {
                        const h = weekTotals[iso] || 0
                        return (
                          <td key={iso} className={`taux-cell ${t2CellClass(h)}`} title={`${fmtNum(h, 1)} h`}>
                            {h > 0 ? `${fmtNum(h, 0)}h` : '—'}
                          </td>
                        )
                      })}
                      <td className="taux-avg-col">
                        <strong>{avgPct}%</strong>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>base 35h</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Écart planifié vs réalisé ── */}
      {activeTab === 2 && (
        <div className="reporting-tab-content">
          {t3Rows.length === 0 ? (
            <div className="reporting-empty">Aucun projet trouvé pour cette société.</div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <SortableHeader label="Projet" field="projet.name" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} />
                    <SortableHeader label="Client" field="client.name" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} />
                    <SortableHeader label="Jours vendus" field="joursVendus" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Heures saisies" field="heuresSaisies" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Jours consommés" field="joursConsom" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Jours restants" field="joursRestants" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Avancement" field="avancement" sortKey={t3SortKey} sortDir={t3SortDir} onSort={t3RequestSort} />
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedT3.map(({ projet, client, heuresSaisies, joursVendus, joursConsom, joursRestants, avancement }) => (
                    <tr key={projet.id}>
                      <td>{projet.name}</td>
                      <td>{client?.name || '—'}</td>
                      <td className="text-right">{fmtNum(joursVendus, 1)}</td>
                      <td className="text-right">{fmtNum(heuresSaisies, 1)} h</td>
                      <td className="text-right">{fmtNum(joursConsom, 2)}</td>
                      <td className={`text-right ${joursRestants < 0 ? 'text-danger' : ''}`}>
                        {fmtNum(joursRestants, 2)}
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <ProgressBar pct={avancement} />
                          <span style={{ fontSize: '.8rem', minWidth: 36, textAlign: 'right' }}>
                            {avancement != null ? `${Math.round(avancement)}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td><StatusBadge pct={avancement} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Détail saisies ── */}
      {activeTab === 3 && (
        <div className="reporting-tab-content">
          <div className="reporting-filters">
            <label>
              Recherche
              <input
                type="text"
                placeholder="Projet, lot, collaborateur…"
                value={t4Search}
                onChange={e => { setT4Search(e.target.value); setT4Page(1) }}
              />
            </label>
            <label>
              Collaborateur
              <select value={t4Collab} onChange={e => { setT4Collab(e.target.value); setT4Page(1) }}>
                <option value="">Tous</option>
                {collaborateurs.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </label>
            <label>
              Projet
              <select value={t4Projet} onChange={e => { setT4Projet(e.target.value); setT4Page(1) }}>
                <option value="">Tous les projets</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={exportT4CSV}>
              Exporter CSV
            </button>
          </div>

          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
            {t4Filtered.length} saisie{t4Filtered.length !== 1 ? 's' : ''} trouvée{t4Filtered.length !== 1 ? 's' : ''}
          </div>

          {t4Paginated.length === 0 ? (
            <div className="reporting-empty">Aucune saisie ne correspond aux filtres.</div>
          ) : (
            <>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <SortableHeader label="Date" field="date" sortKey={t4SortKey} sortDir={t4SortDir} onSort={t4RequestSort} />
                      <SortableHeader label="Nom" field="user_id" sortKey={t4SortKey} sortDir={t4SortDir} onSort={t4RequestSort} />
                      <th>Prénom</th>
                      <th>Projet</th>
                      <th>Lot</th>
                      <SortableHeader label="Heures" field="heures" sortKey={t4SortKey} sortDir={t4SortDir} onSort={t4RequestSort} style={{ textAlign: 'right' }} />
                      <th>Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t4Paginated.map(s => {
                      const info = getProjetInfo(s)
                      const collab = collabMap[s.user_id]
                      let commentDisplay = ''
                      try {
                        const meta = typeof s.commentaire === 'string' ? JSON.parse(s.commentaire) : null
                        commentDisplay = meta?.note || ''
                      } catch { commentDisplay = s.commentaire || '' }
                      const isHighlighted = highlightId === s.id
                      return (
                        <tr
                          key={s.id}
                          ref={isHighlighted ? highlightRef : undefined}
                          style={isHighlighted ? {
                            background: '#dbeafe',
                            animation: 'highlight-fade 4s ease-out forwards',
                            boxShadow: 'inset 3px 0 0 var(--primary, #3b82f6)'} : undefined}
                        >
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.date)}</td>
                          <td>{splitFullName(collab?.full_name).nom}</td>
                          <td>{splitFullName(collab?.full_name).prenom}</td>
                          <td>{info.projetName}</td>
                          <td>{info.lotName}</td>
                          <td className="text-right">{fmtNum(s.heures, 1)} h</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                            {commentDisplay}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {t4Pages > 1 && (
                <div className="reporting-pagination">
                  <button
                    className="pagination-btn"
                    disabled={t4Page === 1}
                    onClick={() => setT4Page(p => p - 1)}
                  >
                    ← Précédent
                  </button>
                  <span className="pagination-info">
                    Page {t4Page} / {t4Pages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={t4Page === t4Pages}
                    onClick={() => setT4Page(p => p + 1)}
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .reporting-tabs {
          display: flex;
          gap: .25rem;
          border-bottom: 2px solid var(--border);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .reporting-tab-btn {
          padding: .6rem 1.2rem;
          border: none;
          background: none;
          cursor: pointer;
          font-size: .9rem;
          color: var(--text-muted);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          border-radius: 4px 4px 0 0;
          transition: color .15s, border-color .15s, background .15s;
        }
        .reporting-tab-btn:hover {
          color: var(--primary);
          background: var(--primary-light);
        }
        .reporting-tab-btn--active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          font-weight: 600;
          background: var(--primary-light);
        }
        .reporting-tab-content {
          animation: fadeIn .15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .reporting-filters {
          display: flex;
          flex-wrap: wrap;
          gap: .75rem 1rem;
          align-items: flex-end;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .reporting-filters label {
          display: flex;
          flex-direction: column;
          gap: .25rem;
          font-size: .8rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .reporting-filters input,
        .reporting-filters select {
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: .4rem .6rem;
          font-size: .88rem;
          background: #fff;
          color: var(--text);
          min-width: 140px;
        }
        .reporting-filters input:focus,
        .reporting-filters select:focus {
          outline: none;
          border-color: var(--primary);
        }
        .users-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #fff;
          box-shadow: var(--shadow);
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .875rem;
        }
        .users-table th {
          background: #f8fafc;
          padding: .75rem 1rem;
          text-align: left;
          font-size: .78rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: .04em;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .users-table td {
          padding: .7rem 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          vertical-align: middle;
        }
        .users-table tbody tr:last-child td { border-bottom: none; }
        .users-table tbody tr:hover td { background: #f8fafc; }
        .reporting-total-row td {
          background: var(--primary-light) !important;
          border-top: 2px solid var(--border);
        }
        .text-right { text-align: right !important; }
        .text-danger { color: #dc2626 !important; font-weight: 600; }
        .reporting-progress-bar {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          min-width: 80px;
        }
        .badge {
          display: inline-block;
          padding: .2rem .65rem;
          border-radius: 20px;
          font-size: .75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .badge--green { background: #f0fdf4; color: #16a34a; border: 1px solid #16a34a44; }
        .badge--yellow { background: #fffbeb; color: #d97706; border: 1px solid #f59e0b44; }
        .badge--red { background: #fef2f2; color: #dc2626; border: 1px solid #dc262644; }
        .badge--neutral { background: #f1f5f9; color: var(--text-muted); border: 1px solid var(--border); }
        /* Taux d'occupation grid */
        .taux-grid-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #fff;
          box-shadow: var(--shadow);
        }
        .taux-grid {
          border-collapse: collapse;
          font-size: .83rem;
          min-width: 100%;
        }
        .taux-grid th {
          background: #f8fafc;
          padding: .5rem .6rem;
          font-size: .72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-align: center;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
        }
        .taux-grid td {
          padding: .5rem .6rem;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          text-align: center;
          vertical-align: middle;
        }
        .taux-grid tr:last-child td { border-bottom: none; }
        .taux-name-col {
          text-align: left !important;
          min-width: 160px;
          position: sticky;
          left: 0;
          background: #f8fafc;
          z-index: 1;
          font-weight: 600;
        }
        .taux-week-col { min-width: 64px; }
        .taux-avg-col { min-width: 100px; background: var(--primary-light) !important; }
        .taux-cell { font-weight: 600; font-size: .8rem; }
        .taux-cell--green { background: #f0fdf4; color: #15803d; }
        .taux-cell--yellow { background: #fffbeb; color: #b45309; }
        .taux-cell--red { background: #fef2f2; color: #dc2626; }
        .taux-legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 3px;
          margin-right: .3rem;
          vertical-align: middle;
        }
        /* Pagination */
        .reporting-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1rem;
          font-size: .875rem;
        }
        .pagination-btn {
          border: 1px solid var(--border);
          background: #fff;
          padding: .4rem .9rem;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text);
          font-size: .85rem;
          transition: border-color .15s, background .15s;
        }
        .pagination-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
        .pagination-btn:disabled { opacity: .45; cursor: not-allowed; }
        .pagination-info { color: var(--text-muted); }
        /* States */
        .reporting-no-data {
          background: #fffbeb;
          border: 1px solid #f59e0b44;
          color: #92400e;
          border-radius: 8px;
          padding: .85rem 1.25rem;
          margin-bottom: 1.25rem;
          font-size: .88rem;
        }
        .reporting-empty {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-muted);
          font-size: .9rem;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .loading-state, .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--text-muted);
          font-size: .95rem;
        }
      `}</style>
    </div>
  )
}
