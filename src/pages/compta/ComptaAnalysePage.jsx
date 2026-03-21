import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, ReferenceLine
} from 'recharts'

// ── Couleurs ─────────────────────────────────────────────────
const COLORS = {
  primary:  '#1a5c82',
  blue2:    '#4a8fad',
  blue3:    '#8ec6d8',
  green:    '#16a34a',
  red:      '#dc2626',
  orange:   '#f59e0b',
  grey:     '#94a3b8',
  actif:    '#1a5c82',
  passif:   '#4a8fad',
}

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// ── Classification comptes PCG ────────────────────────────────
function classify(num) {
  if (!num) return null
  const n = String(num)
  if (/^70/.test(n)) return 'ca'
  if (/^71|^72/.test(n)) return 'prodStocks'
  if (/^74/.test(n)) return 'subventions'
  if (/^75|^77|^78/.test(n)) return 'autresProduits'
  if (/^60|^61|^62/.test(n)) return 'achats'
  if (/^63/.test(n)) return 'impotsTaxes'
  if (/^64/.test(n)) return 'personnel'
  if (/^65/.test(n)) return 'autresCharges'
  if (/^66/.test(n)) return 'chargesFinanc'
  if (/^67/.test(n)) return 'chargesExcep'
  if (/^681/.test(n)) return 'dotations'
  if (/^69/.test(n)) return 'impots'
  if (/^51|^53|^54/.test(n)) return 'tresorerie'
  if (/^41/.test(n)) return 'clients'
  if (/^40/.test(n)) return 'fournisseurs'
  if (/^1[0-3]/.test(n)) return 'capitauxPropres'
  if (/^16/.test(n)) return 'dettesFinanc'
  if (/^20/.test(n)) return 'immoIncorp'
  if (/^2[1-8]/.test(n)) return 'immoCorp'
  if (/^3[1-7]/.test(n)) return 'stocks'
  if (/^42|^43|^44/.test(n)) return 'dettesSocFisc'
  if (/^455/.test(n)) return 'comptesCourants'
  return null
}

// ── Calcul KPIs depuis les écritures ─────────────────────────
function computeKPIs(ecritures) {
  const sums = {}
  const add = (key, val) => { sums[key] = (sums[key] || 0) + val }

  for (const e of ecritures) {
    const cat = classify(e.compte_num)
    if (!cat) continue
    const d = e.debit  || 0
    const c = e.credit || 0
    // Produits (7x) : net = crédit - débit
    if (['ca','prodStocks','subventions','autresProduits'].includes(cat)) add(cat, c - d)
    // Charges (6x) : net = débit - crédit
    else if (['achats','personnel','impotsTaxes','autresCharges','chargesFinanc','chargesExcep','dotations','impots'].includes(cat)) add(cat, d - c)
    // Bilan actif : net = débit - crédit
    else if (['tresorerie','clients','stocks','immoIncorp','immoCorp'].includes(cat)) add(cat, d - c)
    // Bilan passif : net = crédit - débit
    else if (['fournisseurs','capitauxPropres','dettesFinanc','dettesSocFisc','comptesCourants'].includes(cat)) add(cat, c - d)
  }

  const ca          = Math.max(0, sums.ca || 0)
  const achats      = Math.max(0, sums.achats || 0)
  const margeB      = ca - achats
  const margeBpct   = ca > 0 ? margeB / ca * 100 : 0
  const personnel   = Math.max(0, sums.personnel || 0)
  const impotsTaxes = Math.max(0, sums.impotsTaxes || 0)
  const autresChg   = Math.max(0, sums.autresCharges || 0)
  const dotations   = Math.max(0, sums.dotations || 0)
  // EBITDA = EBE = CA - Achats - Impôts&taxes - Personnel - Autres charges
  const ebitda      = margeB - impotsTaxes - personnel - autresChg
  const tresorerie  = sums.tresorerie || 0

  return { ca, achats, margeB, margeBpct, personnel, impotsTaxes, autresChg, dotations, ebitda, tresorerie, sums }
}

// ── Séries mensuelles ─────────────────────────────────────────
function computeMonthly(ecritures) {
  const byMonth = {}
  for (const e of ecritures) {
    if (!e.ecriture_date) continue
    const month = e.ecriture_date.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(e)
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => {
      const kpi = computeKPIs(rows)
      const [y, m] = month.split('-')
      return { month, label: MONTH_LABELS[parseInt(m) - 1], year: y, ...kpi }
    })
}

// ── Formatage ─────────────────────────────────────────────────
function fmtK(n) {
  if (n === undefined || n === null) return '—'
  const k = n / 1000
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(k)
}
function fmtPct(n) { return n !== undefined ? n.toFixed(1) + '%' : '—' }
function fmtTooltip(v) { return typeof v === 'number' ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v / 1000) + ' k€' : v }

// ── Composant KPI card ────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="analyse-kpi-card">
      <span className="analyse-kpi-label">{label}</span>
      <span className="analyse-kpi-value" style={{ color: color || 'var(--text)' }}>{value}</span>
      {sub && <span className="analyse-kpi-sub">{sub}</span>}
    </div>
  )
}

// ── Treemap bilan ─────────────────────────────────────────────
function BilanTreemap({ sums }) {
  const actif = [
    { name: 'Immo. incorporelles', size: Math.max(0, sums.immoIncorp || 0), fill: '#1a5c82' },
    { name: 'Immo. corporelles',   size: Math.max(0, sums.immoCorp    || 0), fill: '#2d7aa0' },
    { name: 'Stocks',              size: Math.max(0, sums.stocks      || 0), fill: '#4a96bb' },
    { name: 'Créances clients',    size: Math.max(0, sums.clients     || 0), fill: '#6cb2d1' },
    { name: 'Trésorerie',          size: Math.max(0, sums.tresorerie  || 0), fill: '#8ecce3' },
  ].filter(d => d.size > 0)

  const passif = [
    { name: 'Capitaux propres',    size: Math.max(0, sums.capitauxPropres || 0), fill: '#0f3d57' },
    { name: 'Dettes financières',  size: Math.max(0, sums.dettesFinanc    || 0), fill: '#1d5c7a' },
    { name: 'Fournisseurs',        size: Math.max(0, sums.fournisseurs    || 0), fill: '#2e7a9c' },
    { name: 'Dettes soc. & fisc.', size: Math.max(0, sums.dettesSocFisc  || 0), fill: '#4497bc' },
  ].filter(d => d.size > 0)

  const CustomContent = ({ x, y, width, height, name, size, fill: itemFill, root, depth, colors }) => {
    if (width < 30 || height < 20) return null
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: itemFill || '#1a5c82', stroke: 'white', strokeWidth: 2 }} />
        {width > 60 && height > 30 && (
          <>
            <text x={x + 6} y={y + 16} fill="white" fontSize={11} fontWeight={600}>{name}</text>
            {height > 46 && <text x={x + 6} y={y + 30} fill="rgba(255,255,255,.8)" fontSize={10}>{fmtK(size)} k€</text>}
          </>
        )}
      </g>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.5rem', textTransform: 'uppercase' }}>Actif</p>
        <ResponsiveContainer width="100%" height={180}>
          <Treemap data={actif} dataKey="size" content={<CustomContent />} />
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.5rem', textTransform: 'uppercase' }}>Passif</p>
        <ResponsiveContainer width="100%" height={180}>
          <Treemap data={passif} dataKey="size" content={<CustomContent />} />
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function ComptaAnalysePage() {
  const navigate = useNavigate()
  const [imports, setImports]           = useState([])
  const [selectedId, setSelectedId]     = useState(null)
  const [ecritures, setEcritures]       = useState([])
  const [loading, setLoading]           = useState(false)
  const [loadingImports, setLoadingImports] = useState(true)
  const [selectedYear, setSelectedYear] = useState(null) // null = toutes

  useEffect(() => {
    supabase.from('fec_imports').select('id, created_at, meta').order('created_at', { ascending: false })
      .then(({ data }) => {
        const parsed = (data || []).map(i => {
          let m = {}; try { m = JSON.parse(i.meta || '{}') } catch {}
          return { ...i, ...m }
        })
        setImports(parsed)
        if (parsed.length > 0) setSelectedId(parsed[0].id)
        setLoadingImports(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    supabase.from('fec_ecritures').select('id, import_id, data').eq('import_id', selectedId)
      .then(({ data }) => {
        const parsed = (data || []).map(r => {
          let d = {}; try { d = JSON.parse(r.data || '{}') } catch {}
          return { id: r.id, ...d }
        })
        setEcritures(parsed)
        setLoading(false)
      })
  }, [selectedId])

  const selectedImport = imports.find(i => i.id === selectedId)

  // Années disponibles dans les écritures
  const availableYears = useMemo(() => {
    const years = [...new Set(ecritures.map(e => e.ecriture_date?.slice(0, 4)).filter(Boolean))].sort()
    return years
  }, [ecritures])

  // Auto-select dernière année quand les écritures changent
  useEffect(() => {
    if (availableYears.length > 0) setSelectedYear(availableYears[availableYears.length - 1])
  }, [availableYears.join(',')])

  // Filtrer par année sélectionnée
  const ecrituresFiltrees = useMemo(() => {
    if (!selectedYear) return ecritures
    return ecritures.filter(e => e.ecriture_date?.startsWith(selectedYear))
  }, [ecritures, selectedYear])

  const kpis     = useMemo(() => computeKPIs(ecrituresFiltrees), [ecrituresFiltrees])
  const monthly  = useMemo(() => computeMonthly(ecrituresFiltrees), [ecrituresFiltrees])

  // Séries pour graphiques
  const caMonthly    = monthly.map(m => ({ label: m.label, ca: m.ca, ebitda: m.ebitda }))
  const tresoMonthly = monthly.map(m => ({ label: m.label, tresorerie: m.tresorerie }))

  if (loadingImports) return <div className="admin-page"><p style={{ padding: '2rem' }}>Chargement…</p></div>

  if (imports.length === 0) return (
    <div className="admin-page">
      <div className="admin-page-header"><h1>Analyse financière</h1></div>
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '2rem' }}>📂</p>
        <p style={{ marginBottom: '1.5rem' }}>Aucun FEC importé</p>
        <button className="btn-primary" onClick={() => navigate('/finance/comptabilite/import')}>Importer un FEC →</button>
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Analyse financière</h1>
          {selectedImport && <p>{selectedImport.societe} · Exercice {selectedImport.exercice}</p>}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="table-pagesize" style={{ minWidth: 260 }} value={selectedId || ''} onChange={e => { setSelectedId(e.target.value); setSelectedYear(null) }}>
            {imports.map(i => <option key={i.id} value={i.id}>{i.societe} — {i.exercice}</option>)}
          </select>
          {availableYears.length > 0 && (
            <div className="analyse-year-tabs">
              {availableYears.map(y => (
                <button key={y}
                  className={`analyse-year-tab ${selectedYear === y ? 'analyse-year-tab--active' : ''}`}
                  onClick={() => setSelectedYear(y)}>
                  {y}
                </button>
              ))}
            </div>
          )}
          <button className="btn-secondary" onClick={() => navigate('/finance/comptabilite')}>← Retour</button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calcul en cours…</p>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="analyse-kpi-row">
            <KpiCard label="Chiffre d'affaires"   value={`${fmtK(kpis.ca)} k€`} />
            <KpiCard label="Marge brute"           value={`${fmtK(kpis.margeB)} k€`} sub={fmtPct(kpis.margeBpct)} color={kpis.margeB < 0 ? COLORS.red : COLORS.primary} />
            <KpiCard label="EBITDA"                value={`${fmtK(kpis.ebitda)} k€`} sub={kpis.ca > 0 ? fmtPct(kpis.ebitda / kpis.ca * 100) : ''} color={kpis.ebitda < 0 ? COLORS.red : COLORS.green} />
            <KpiCard label="Charges personnel"     value={`${fmtK(kpis.personnel)} k€`} sub={kpis.ca > 0 ? fmtPct(kpis.personnel / kpis.ca * 100) : ''} />
            <KpiCard label="Trésorerie"            value={`${fmtK(kpis.tresorerie)} k€`} color={kpis.tresorerie < 0 ? COLORS.red : COLORS.green} />
          </div>

          {/* ── Ligne 2 : CA mensuel + Trésorerie ── */}
          <div className="analyse-charts-row">
            <div className="analyse-chart-card">
              <div className="analyse-chart-header">
                <span className="analyse-chart-title">Chiffre d'affaires mensuel</span>
                <span className="analyse-chart-sub">k€</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={caMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} width={48} />
                  <Tooltip formatter={fmtTooltip} labelStyle={{ fontWeight: 600 }} />
                  <Bar dataKey="ca" name="CA" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="analyse-chart-card">
              <div className="analyse-chart-header">
                <span className="analyse-chart-title">Évolution de la trésorerie</span>
                <span className="analyse-chart-sub">k€</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={tresoMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} width={48} />
                  <Tooltip formatter={fmtTooltip} labelStyle={{ fontWeight: 600 }} />
                  <ReferenceLine y={0} stroke={COLORS.grey} />
                  <Line type="monotone" dataKey="tresorerie" name="Trésorerie" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Ligne 3 : Activité + Bilan ── */}
          <div className="analyse-charts-row">
            <div className="analyse-chart-card">
              <div className="analyse-chart-header">
                <span className="analyse-chart-title">CA vs EBITDA mensuel</span>
                <span className="analyse-chart-sub">k€</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={caMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} width={48} />
                  <Tooltip formatter={fmtTooltip} labelStyle={{ fontWeight: 600 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ca" name="CA" fill={COLORS.blue3} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="analyse-chart-card">
              <div className="analyse-chart-header">
                <span className="analyse-chart-title">Composition du bilan</span>
                <span className="analyse-chart-sub">k€</span>
              </div>
              <BilanTreemap sums={kpis.sums} />
            </div>
          </div>

          {/* ── Ligne 4 : Structure charges ── */}
          <div className="analyse-chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="analyse-chart-header">
              <span className="analyse-chart-title">Structure des charges d'exploitation</span>
              <span className="analyse-chart-sub">k€</span>
            </div>
            <div className="analyse-charges-row">
              {[
                { label: 'Achats & services ext.', value: kpis.achats,    pct: kpis.ca > 0 ? kpis.achats / kpis.ca * 100 : 0,    color: COLORS.blue2 },
                { label: 'Charges de personnel',   value: kpis.personnel, pct: kpis.ca > 0 ? kpis.personnel / kpis.ca * 100 : 0, color: COLORS.primary },
                { label: 'Autres charges',         value: kpis.autresChg, pct: kpis.ca > 0 ? kpis.autresChg / kpis.ca * 100 : 0, color: COLORS.blue3 },
                { label: 'Dotations amort.',       value: kpis.dotations, pct: kpis.ca > 0 ? kpis.dotations / kpis.ca * 100 : 0, color: COLORS.grey },
              ].map(c => (
                <div key={c.label} className="analyse-charge-item">
                  <div className="analyse-charge-bar-wrap">
                    <div className="analyse-charge-bar" style={{ width: `${Math.min(100, c.pct)}%`, background: c.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.3rem' }}>
                    <span style={{ fontSize: '.8rem' }}>{c.label}</span>
                    <span style={{ fontSize: '.8rem', fontWeight: 700 }}>{fmtK(c.value)} k€ <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({fmtPct(c.pct)})</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
