import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import Spinner from '../../components/Spinner'
import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, ReferenceLine
} from 'recharts'

// ── Couleurs ─────────────────────────────────────────────────
const COLORS = {
  primary: '#1a5c82', blue2: '#4a8fad', blue3: '#8ec6d8',
  green: '#16a34a', red: '#dc2626', grey: '#94a3b8',
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

function computeKPIs(ecritures) {
  const sums = {}
  const add = (key, val) => { sums[key] = (sums[key] || 0) + val }
  for (const e of ecritures) {
    const cat = classify(e.compte_num)
    if (!cat) continue
    const d = e.debit || 0, c = e.credit || 0
    if (['ca','prodStocks','subventions','autresProduits'].includes(cat)) add(cat, c - d)
    else if (['achats','personnel','impotsTaxes','autresCharges','chargesFinanc','chargesExcep','dotations','impots'].includes(cat)) add(cat, d - c)
    else if (['tresorerie','clients','stocks','immoIncorp','immoCorp'].includes(cat)) add(cat, d - c)
    else if (['fournisseurs','capitauxPropres','dettesFinanc','dettesSocFisc','comptesCourants'].includes(cat)) add(cat, c - d)
  }
  const ca = Math.max(0, sums.ca || 0)
  const achats = Math.max(0, sums.achats || 0)
  const margeB = ca - achats
  const personnel = Math.max(0, sums.personnel || 0)
  const impotsTaxes = Math.max(0, sums.impotsTaxes || 0)
  const autresChg = Math.max(0, sums.autresCharges || 0)
  const dotations = Math.max(0, sums.dotations || 0)
  const ebitda = margeB - impotsTaxes - personnel - autresChg
  const tresorerie = sums.tresorerie || 0
  const resultat = ca + (sums.prodStocks || 0) + (sums.subventions || 0) + (sums.autresProduits || 0)
    - achats - personnel - impotsTaxes - autresChg - dotations
    - Math.max(0, sums.chargesFinanc || 0) - Math.max(0, sums.chargesExcep || 0)
    - Math.max(0, sums.impots || 0)
  return { ca, achats, margeB, margeBpct: ca > 0 ? margeB / ca * 100 : 0, personnel, impotsTaxes, autresChg, dotations, ebitda, resultat, tresorerie, sums }
}

function computeMonthly(ecritures) {
  const byMonth = {}
  for (const e of ecritures) {
    if (!e.ecriture_date) continue
    const month = e.ecriture_date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(e)
  }
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => {
    const kpi = computeKPIs(rows)
    const [, m] = month.split('-')
    return { month, label: MONTH_LABELS[parseInt(m) - 1], ...kpi }
  })
}

function fmtK(n) {
  if (n === undefined || n === null) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1000)
}
function fmtPct(n) { return n !== undefined ? n.toFixed(1) + '%' : '—' }
function fmtTooltip(v) { return typeof v === 'number' ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v / 1000) + ' k€' : v }

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="analyse-kpi-card">
      <span className="analyse-kpi-label">{label}</span>
      <span className="analyse-kpi-value" style={{ color: color || 'var(--text)' }}>{value}</span>
      {sub && <span className="analyse-kpi-sub">{sub}</span>}
    </div>
  )
}

function BilanTreemap({ sums }) {
  const actif = [
    { name: 'Immo. incorporelles', size: Math.max(0, sums.immoIncorp || 0), fill: '#1a5c82' },
    { name: 'Immo. corporelles',   size: Math.max(0, sums.immoCorp   || 0), fill: '#2d7aa0' },
    { name: 'Stocks',              size: Math.max(0, sums.stocks     || 0), fill: '#4a96bb' },
    { name: 'Créances clients',    size: Math.max(0, sums.clients    || 0), fill: '#6cb2d1' },
    { name: 'Trésorerie',          size: Math.max(0, sums.tresorerie || 0), fill: '#8ecce3' },
  ].filter(d => d.size > 0)
  const passif = [
    { name: 'Capitaux propres',    size: Math.max(0, sums.capitauxPropres || 0), fill: '#0f3d57' },
    { name: 'Dettes financières',  size: Math.max(0, sums.dettesFinanc    || 0), fill: '#1d5c7a' },
    { name: 'Fournisseurs',        size: Math.max(0, sums.fournisseurs    || 0), fill: '#2e7a9c' },
    { name: 'Dettes soc. & fisc.', size: Math.max(0, sums.dettesSocFisc  || 0), fill: '#4497bc' },
  ].filter(d => d.size > 0)
  const CC = ({ x, y, width, height, name, size, fill: f }) => {
    if (width < 30 || height < 20) return null
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: f || '#1a5c82', stroke: 'white', strokeWidth: 2 }} />
        {width > 60 && height > 30 && (
          <>
            <text x={x+6} y={y+16} fill="white" fontSize={11} fontWeight={600}>{name}</text>
            {height > 46 && <text x={x+6} y={y+30} fill="rgba(255,255,255,.8)" fontSize={10}>{fmtK(size)} k€</text>}
          </>
        )}
      </g>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.5rem', textTransform: 'uppercase' }}>Actif</p>
        <ResponsiveContainer width="100%" height={180}><Treemap data={actif} dataKey="size" content={<CC />} /></ResponsiveContainer>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.5rem', textTransform: 'uppercase' }}>Passif</p>
        <ResponsiveContainer width="100%" height={180}><Treemap data={passif} dataKey="size" content={<CC />} /></ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Chargement paginé + dédoublonnage des écritures ──────────
const PAGE_SIZE = 1000  // Limite serveur Supabase PostgREST

function deduplicateEcritures(all) {
  const seen = new Set()
  const unique = []
  for (const e of all) {
    const key = `${e.ecriture_num}|${e.compte_num}|${e.ecriture_date}|${e.debit}|${e.credit}|${e.ecriture_lib}`
    if (!seen.has(key)) { seen.add(key); unique.push(e) }
  }
  return unique
}

async function fetchAllEcritures(importId, signal) {
  let all = []
  let page = 0
  while (true) {
    if (signal?.aborted) return []
    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('fec_ecritures')
      .select('data')
      .eq('import_id', importId)
      .range(from, to)
    if (signal?.aborted) return []
    if (error || !data || data.length === 0) break
    const parsed = data.map(r => { let d = {}; try { d = JSON.parse(r.data || '{}') } catch {}; return d })
    all = all.concat(parsed)
    if (data.length < PAGE_SIZE) break
    page++
  }
  return deduplicateEcritures(all)
}

// ── Page principale ───────────────────────────────────────────
export default function ComptaPage() {
  const navigate = useNavigate()
  const { selectedSociete } = useSociete()

  const [activeTab, setActiveTab]     = useState('analyse')
  const [imports, setImports]         = useState([])
  const [loadingImports, setLoadingImports] = useState(true)
  const [selectedId, setSelectedId]   = useState(null)
  const [ecritures, setEcritures]     = useState([])
  const [loadingEc, setLoadingEc]     = useState(false)
  const [loadingEcProgress, setLoadingEcProgress] = useState(0)
  const [selectedYear, setSelectedYear] = useState(null)
  const [filterSociete, setFilterSociete] = useState('')
  // Historique : KPIs pré-calculés par import
  const [histKpis, setHistKpis]       = useState({})
  const [loadingHist, setLoadingHist] = useState(false)

  // Reset histKpis quand la société change
  useEffect(() => { setHistKpis({}) }, [selectedSociete?.id])

  // Charger imports
  useEffect(() => {
    let query = supabase.from('fec_imports').select('id, created_at, meta').order('created_at', { ascending: false })
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    query.then(({ data }) => {
      const parsed = (data || []).map(i => {
        let m = {}; try { m = JSON.parse(i.meta || '{}') } catch {}
        return { ...i, ...m }
      })
      setImports(parsed)
      if (parsed.length > 0) setSelectedId(parsed[0].id)
      setLoadingImports(false)
    })
  }, [selectedSociete?.id])

  // Charger écritures (avec abort controller pour éviter les race conditions)
  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    setLoadingEc(true)
    setLoadingEcProgress(0)
    const imp = imports.find(i => i.id === selectedId)
    const total = imp?.nb_lignes || 0
    ;(async () => {
      let all = []
      let page = 0
      while (true) {
        if (controller.signal.aborted) return
        const from = page * PAGE_SIZE
        const to   = from + PAGE_SIZE - 1
        const { data, error } = await supabase
          .from('fec_ecritures').select('data').eq('import_id', selectedId).range(from, to)
        if (controller.signal.aborted) return
        if (error || !data || data.length === 0) break
        const parsed = data.map(r => { let d = {}; try { d = JSON.parse(r.data || '{}') } catch {}; return d })
        all = all.concat(parsed)
        if (total > 0) setLoadingEcProgress(Math.min(99, Math.round(all.length / total * 100)))
        if (data.length < PAGE_SIZE) break  // dernière page
        page++
      }
      if (controller.signal.aborted) return
      const unique = deduplicateEcritures(all)
      setEcritures(unique)
      setLoadingEcProgress(100)
      setLoadingEc(false)
    })()
    return () => controller.abort()
  }, [selectedId])

  // Calcul KPIs pour l'historique (tous imports)
  const loadHistKpis = useCallback(async () => {
    // déjà chargé pour ces imports ?
    if (imports.length > 0 && imports.every(i => histKpis[i.id] !== undefined)) return
    setLoadingHist(true)
    // Charger les écritures de chaque import (paginé)
    try {
      const ids = imports.map(i => i.id)
      if (ids.length === 0) { setLoadingHist(false); return }
      const result = {}
      for (const id of ids) {
        const ecritures = await fetchAllEcritures(id)
        result[id] = computeKPIs(ecritures)
      }
      setHistKpis(result)
    } catch {}
    setLoadingHist(false)
  }, [imports, histKpis])

  // Liste des sociétés uniques
  const societes = useMemo(() => [...new Set(imports.map(i => i.societe).filter(Boolean))].sort(), [imports])

  // Imports filtrés par société sélectionnée
  const importsFiltres = useMemo(() =>
    filterSociete ? imports.filter(i => i.societe === filterSociete) : imports
  , [imports, filterSociete])

  const selectedImport = imports.find(i => i.id === selectedId)

  // Années disponibles
  const availableYears = useMemo(() =>
    [...new Set(ecritures.map(e => e.ecriture_date?.slice(0, 4)).filter(Boolean))].sort()
  , [ecritures])

  // Quand les années changent : si l'exercice couvre plusieurs années civiles → "tout" par défaut
  useEffect(() => {
    if (availableYears.length === 0) return
    if (availableYears.length > 1) {
      setSelectedYear(null)  // null = exercice complet
    } else {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears.join(',')])

  const ecrituresFiltrees = useMemo(() =>
    selectedYear ? ecritures.filter(e => e.ecriture_date?.startsWith(selectedYear)) : ecritures
  , [ecritures, selectedYear])

  const kpis    = useMemo(() => computeKPIs(ecrituresFiltrees), [ecrituresFiltrees])
  const monthly = useMemo(() => computeMonthly(ecrituresFiltrees), [ecrituresFiltrees])
  const caMonthly    = monthly.map(m => ({ label: m.label, ca: m.ca, ebitda: m.ebitda }))
  const tresoMonthly = monthly.map(m => ({ label: m.label, tresorerie: m.tresorerie }))

  if (loadingImports) return <div className="admin-page"><Spinner /></div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Comptabilité</h1>
        <button className="btn-primary" onClick={() => navigate('/finance/comptabilite/import')}>
          + Importer un FEC
        </button>
      </div>

      {/* ── Onglets ── */}
      <div className="compta-tabs">
        <button
          className={`compta-tab ${activeTab === 'analyse' ? 'compta-tab--active' : ''}`}
          onClick={() => setActiveTab('analyse')}
        >
          📊 Analyse
        </button>
        <button
          className={`compta-tab ${activeTab === 'historique' ? 'compta-tab--active' : ''}`}
          onClick={() => { setActiveTab('historique'); loadHistKpis() }}
        >
          🗂 Historique des imports
        </button>
      </div>

      {/* ── Onglet Historique ── */}
      {activeTab === 'historique' && (
        <div className="compta-hist-card">
          {loadingHist ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calcul des indicateurs…</p>
          ) : imports.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun FEC importé.{' '}
              <button className="btn-link" onClick={() => navigate('/finance/comptabilite/import')}>Importer maintenant →</button>
            </p>
          ) : (
            <>
              {/* Filtre société */}
              {societes.length > 1 && (
                <div className="compta-hist-toolbar">
                  <label style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Société</label>
                  <select className="table-pagesize" value={filterSociete} onChange={e => setFilterSociete(e.target.value)}>
                    <option value="">Toutes</option>
                    {societes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="compta-hist-table">
                <div className="compta-hist-row compta-hist-row--header">
                  <span>Société</span>
                  <span>Exercice</span>
                  <span className="align-right">CA</span>
                  <span className="align-right">Résultat</span>
                  <span className="align-right">Trésorerie clôture</span>
                  <span>Lignes</span>
                  <span>Importé le</span>
                  <span></span>
                </div>
                {importsFiltres.map(imp => {
                  const k = histKpis[imp.id]
                  return (
                    <div key={imp.id} className="compta-hist-row">
                      <span className="compta-hist-societe">{imp.societe || '—'}</span>
                      <span><span className="compta-archives-exercice">{imp.exercice || '—'}</span></span>
                      <span className="align-right compta-hist-kpi">
                        {k ? `${fmtK(k.ca)} k€` : <span className="compta-hist-loading">…</span>}
                      </span>
                      <span className={`align-right compta-hist-kpi ${k && k.resultat < 0 ? 'text-red' : k && k.resultat > 0 ? 'text-green' : ''}`}>
                        {k ? `${fmtK(k.resultat)} k€` : <span className="compta-hist-loading">…</span>}
                      </span>
                      <span className={`align-right compta-hist-kpi ${k && k.tresorerie < 0 ? 'text-red' : k && k.tresorerie > 0 ? 'text-green' : ''}`}>
                        {k ? `${fmtK(k.tresorerie)} k€` : <span className="compta-hist-loading">…</span>}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                        {imp.nb_lignes?.toLocaleString('fr-FR') || '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                        {imp.created_at ? new Date(imp.created_at).toLocaleDateString('fr-FR') : '—'}
                      </span>
                      <span>
                        <button className="btn-sm btn-secondary" onClick={() => { setSelectedId(imp.id); setSelectedYear(null); setActiveTab('analyse') }}>
                          Analyser →
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'analyse' && (
      <>
      {/* ── Section archives ── */}
      <div className="compta-archives-card">
        <div className="compta-archives-header">
          <span className="compta-archives-title">Archives FEC</span>
          {/* Filtre société */}
          {societes.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <label style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Société</label>
              <select
                className="table-pagesize"
                value={filterSociete}
                onChange={e => setFilterSociete(e.target.value)}
              >
                <option value="">Toutes</option>
                {societes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {imports.length === 0 ? (
          <p style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Aucun FEC importé.{' '}
            <button className="btn-link" onClick={() => navigate('/finance/comptabilite/import')}>
              Importer maintenant →
            </button>
          </p>
        ) : (
          <div className="compta-archives-list">
            <div className="compta-archives-row compta-archives-row--header">
              <span>Société</span>
              <span>Exercice</span>
              <span>Lignes</span>
              <span>Importé le</span>
              <span>Action</span>
            </div>
            {importsFiltres.map(imp => (
              <div
                key={imp.id}
                className={`compta-archives-row ${imp.id === selectedId ? 'compta-archives-row--active' : ''}`}
              >
                <span className="compta-archives-societe">{imp.societe || '—'}</span>
                <span><span className="compta-archives-exercice">{imp.exercice || '—'}</span></span>
                <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                  {imp.nb_lignes?.toLocaleString('fr-FR') || '—'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                  {imp.created_at ? new Date(imp.created_at).toLocaleDateString('fr-FR') : '—'}
                </span>
                <span>
                  <button
                    className={`btn-sm ${imp.id === selectedId ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setSelectedId(imp.id); setSelectedYear(null) }}
                  >
                    {imp.id === selectedId ? '✓ Actif' : 'Analyser'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section analyse ── */}
      {selectedId && (
        <>
          <div className="compta-analyse-toolbar">
            <div>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Analyse financière</span>
              {selectedImport && (
                <span style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginLeft: '.75rem' }}>
                  {selectedImport.societe} · {selectedImport.exercice}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              {availableYears.length > 0 && (
                <div className="analyse-year-tabs">
                  {availableYears.length > 1 && (
                    <button
                      className={`analyse-year-tab ${selectedYear === null ? 'analyse-year-tab--active' : ''}`}
                      onClick={() => setSelectedYear(null)}>Exercice complet</button>
                  )}
                  {availableYears.map(y => (
                    <button key={y}
                      className={`analyse-year-tab ${selectedYear === y ? 'analyse-year-tab--active' : ''}`}
                      onClick={() => setSelectedYear(y)}>{y}</button>
                  ))}
                </div>
              )}
              <button className="btn-secondary btn-sm" onClick={() => navigate('/finance/comptabilite/ecritures')}>
                Voir les écritures →
              </button>
            </div>
          </div>

          {loadingEc ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Spinner label={`Chargement des écritures… ${loadingEcProgress}%`} />
              <div style={{ maxWidth: 300, margin: '0 auto', height: 6, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${loadingEcProgress}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          ) : (
            <>
              <div className="analyse-kpi-row">
                <KpiCard label="Chiffre d'affaires" value={`${fmtK(kpis.ca)} k€`} />
                <KpiCard label="Marge brute" value={`${fmtK(kpis.margeB)} k€`} sub={fmtPct(kpis.margeBpct)} color={kpis.margeB < 0 ? COLORS.red : COLORS.primary} />
                <KpiCard label="EBITDA" value={`${fmtK(kpis.ebitda)} k€`} sub={kpis.ca > 0 ? fmtPct(kpis.ebitda / kpis.ca * 100) : ''} color={kpis.ebitda < 0 ? COLORS.red : COLORS.green} />
                <KpiCard label="Charges personnel" value={`${fmtK(kpis.personnel)} k€`} sub={kpis.ca > 0 ? fmtPct(kpis.personnel / kpis.ca * 100) : ''} />
                <KpiCard label="Trésorerie" value={`${fmtK(kpis.tresorerie)} k€`} color={kpis.tresorerie < 0 ? COLORS.red : COLORS.green} />
              </div>

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
                      <Bar dataKey="ca" name="CA" fill={COLORS.primary} radius={[3,3,0,0]} />
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
                      <Bar dataKey="ca" name="CA" fill={COLORS.blue3} radius={[3,3,0,0]} />
                      <Bar dataKey="ebitda" name="EBITDA" fill={COLORS.primary} radius={[3,3,0,0]} />
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
        </>
      )}
      </> /* fin onglet analyse */
      )}
    </div>
  )
}
