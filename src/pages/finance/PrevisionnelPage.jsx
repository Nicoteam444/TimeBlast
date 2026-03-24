import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

// ── Constantes ────────────────────────────────────────────────
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const COLORS = {
  primary: '#1a5c82',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#f59e0b',
  optimiste: '#16a34a',
  realiste: '#1a5c82',
  pessimiste: '#dc2626',
}
const SCENARIO_LABELS = { optimiste: 'Optimiste (+20%)', realiste: 'Réaliste', pessimiste: 'Pessimiste (-20%)' }
const SCENARIO_FACTORS = { optimiste: 1.20, realiste: 1.00, pessimiste: 0.80 }
const CHARGES_PATRONALES_RATE = 1.45 // charges patronales ~45% du brut

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))
}

function fmtK(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace('.', ',')} M€`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} k€`
  return `${fmt(n)} €`
}

function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function generateMonthKeys(count) {
  const keys = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function frequenceMultiplier(freq) {
  switch (freq) {
    case 'hebdomadaire': return 4.33
    case 'mensuel': return 1
    case 'trimestriel': return 1 / 3
    case 'semestriel': return 1 / 6
    case 'annuel': return 1 / 12
    default: return 1
  }
}

// ── Composant principal ───────────────────────────────────────
export default function PrevisionnelPage() {
  const { selectedSociete } = useSociete()

  // Data
  const [factures, setFactures] = useState([])
  const [achats, setAchats] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)

  // Controls
  const [period, setPeriod] = useState(12)
  const [scenario, setScenario] = useState('realiste')
  const [threshold, setThreshold] = useState(5000)
  const [initialBalance, setInitialBalance] = useState(0)

  // ── Fetch data ──────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [selectedSociete?.id])

  async function fetchAll() {
    setLoading(true)
    const sid = selectedSociete?.id
    const promises = []

    // Factures (income)
    let qFac = supabase.from('factures').select('total_ttc, date_emission, date_echeance, statut')
    if (sid) qFac = qFac.eq('societe_id', sid)
    promises.push(qFac.then(r => r.data || []))

    // Achats (expenses)
    let qAch = supabase.from('achats').select('montant, date_achat, statut')
    if (sid) qAch = qAch.eq('societe_id', sid)
    promises.push(qAch.then(r => r.data || []))

    // Abonnements (recurring income)
    let qAbo = supabase.from('abonnements').select('montant, frequence, statut, date_debut')
    if (sid) qAbo = qAbo.eq('societe_id', sid)
    promises.push(qAbo.then(r => r.data || []))

    // Equipe (salaries)
    let qEq = supabase.from('equipe').select('salaire_brut, date_embauche')
    if (sid) qEq = qEq.eq('societe_id', sid)
    promises.push(qEq.then(r => r.data || []))

    try {
      const [fac, ach, abo, eq] = await Promise.all(promises)
      setFactures(fac)
      setAchats(ach)
      setAbonnements(abo)
      setEquipe(eq)
    } catch {
      // silently handle - tables might not exist yet
    }
    setLoading(false)
  }

  // ── Compute forecast ────────────────────────────────────────
  const months = useMemo(() => generateMonthKeys(period), [period])

  const forecast = useMemo(() => {
    // ── Historic income from paid invoices by month
    const incomeByMonth = {}
    for (const f of factures) {
      if (!f.date_emission) continue
      const key = monthKey(f.date_emission)
      incomeByMonth[key] = (incomeByMonth[key] || 0) + (parseFloat(f.total_ttc) || 0)
    }

    // Average monthly income from past data (for projection)
    const pastIncomeValues = Object.values(incomeByMonth)
    const avgIncome = pastIncomeValues.length > 0
      ? pastIncomeValues.reduce((a, b) => a + b, 0) / pastIncomeValues.length
      : 0

    // ── Recurring subscription income per month
    const activeAbos = abonnements.filter(a => a.statut === 'actif')
    const monthlySubIncome = activeAbos.reduce((sum, a) => {
      return sum + (parseFloat(a.montant) || 0) * frequenceMultiplier(a.frequence || 'mensuel')
    }, 0)

    // ── Historic expenses from achats by month
    const expenseByMonth = {}
    for (const a of achats) {
      if (!a.date_achat) continue
      const key = monthKey(a.date_achat)
      expenseByMonth[key] = (expenseByMonth[key] || 0) + (parseFloat(a.montant) || 0)
    }

    const pastExpenseValues = Object.values(expenseByMonth)
    const avgExpense = pastExpenseValues.length > 0
      ? pastExpenseValues.reduce((a, b) => a + b, 0) / pastExpenseValues.length
      : 0

    // ── Monthly salary cost
    const monthlySalaries = equipe.reduce((sum, e) => {
      const brut = parseFloat(e.salaire_brut) || 0
      return sum + brut * CHARGES_PATRONALES_RATE
    }, 0)

    // ── Build month-by-month forecast
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    return months.map(key => {
      const isPast = key <= currentKey
      // Income: use actual data for past months, projected for future
      const factureIncome = isPast && incomeByMonth[key] != null
        ? incomeByMonth[key]
        : avgIncome
      const subIncome = monthlySubIncome
      const totalIncome = factureIncome + subIncome

      // Expenses: use actual data for past months, projected for future
      const achatExpense = isPast && expenseByMonth[key] != null
        ? expenseByMonth[key]
        : avgExpense
      const salaryExpense = monthlySalaries
      const totalExpense = achatExpense + salaryExpense

      return {
        key,
        label: monthLabel(key),
        encaissements: totalIncome,
        decaissements: totalExpense,
        solde: totalIncome - totalExpense,
      }
    })
  }, [months, factures, achats, abonnements, equipe])

  // Apply scenario factor and compute cumulative
  const scenarioData = useMemo(() => {
    const result = {}
    for (const [sc, factor] of Object.entries(SCENARIO_FACTORS)) {
      let cumul = initialBalance
      result[sc] = forecast.map(m => {
        const enc = m.encaissements * factor
        const dec = m.decaissements * (2 - factor) // inverse factor on expenses
        const solde = enc - dec
        cumul += solde
        return {
          ...m,
          encaissements: Math.round(enc),
          decaissements: Math.round(dec),
          solde: Math.round(solde),
          cumul: Math.round(cumul),
        }
      })
    }
    return result
  }, [forecast, initialBalance])

  // Current scenario rows
  const rows = scenarioData[scenario] || []
  const { sortedData: sortedRows, sortKey, sortDir, requestSort } = useSortableTable(rows)

  // Chart data: all 3 scenarios overlaid
  const chartData = useMemo(() => {
    return months.map((key, i) => ({
      label: monthLabel(key),
      optimiste: scenarioData.optimiste?.[i]?.cumul || 0,
      realiste: scenarioData.realiste?.[i]?.cumul || 0,
      pessimiste: scenarioData.pessimiste?.[i]?.cumul || 0,
    }))
  }, [months, scenarioData])

  // ── KPIs ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const realisteRows = scenarioData.realiste || []
    const soldeActuel = realisteRows[0]?.cumul || initialBalance
    const soldeFinAnnee = realisteRows[realisteRows.length - 1]?.cumul || 0
    const moisCritique = realisteRows.find(r => r.cumul < threshold)
    const firstMonth = realisteRows[0]?.cumul || 0
    const lastMonth = realisteRows[realisteRows.length - 1]?.cumul || 0
    const growth = firstMonth !== 0
      ? ((lastMonth - firstMonth) / Math.abs(firstMonth) * 100)
      : 0

    return {
      soldeActuel,
      soldeFinAnnee,
      moisCritique: moisCritique?.label || null,
      growth: Math.round(growth),
    }
  }, [scenarioData, threshold, initialBalance])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Trésorerie & Prévisionnel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            Projection de trésorerie sur {period} mois
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="produit-kpi-bar">
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: kpis.soldeActuel >= 0 ? COLORS.green : COLORS.red }}>
            {fmtK(kpis.soldeActuel)}
          </span>
          <span className="produit-kpi-label">Solde actuel estimé</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: kpis.soldeFinAnnee >= 0 ? COLORS.primary : COLORS.red }}>
            {fmtK(kpis.soldeFinAnnee)}
          </span>
          <span className="produit-kpi-label">Solde fin de période</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: kpis.moisCritique ? COLORS.red : COLORS.green }}>
            {kpis.moisCritique || 'Aucun'}
          </span>
          <span className="produit-kpi-label">Mois critique</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: kpis.growth >= 0 ? COLORS.green : COLORS.red }}>
            {kpis.growth >= 0 ? '+' : ''}{kpis.growth} %
          </span>
          <span className="produit-kpi-label">Taux de croissance</span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '.75rem' }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: '.35rem' }}>
          {[6, 12, 24].map(p => (
            <button
              key={p}
              className={period === p ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '.35rem .75rem', fontSize: '.82rem' }}
              onClick={() => setPeriod(p)}
            >
              {p} mois
            </button>
          ))}
        </div>

        {/* Scenario toggles */}
        <div style={{ display: 'flex', gap: '.35rem' }}>
          {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              style={{
                padding: '.35rem .75rem',
                fontSize: '.82rem',
                borderRadius: 6,
                border: `1.5px solid ${COLORS[key]}`,
                background: scenario === key ? COLORS[key] : 'transparent',
                color: scenario === key ? '#fff' : COLORS[key],
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Threshold input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <label style={{ fontSize: '.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Seuil d'alerte :
          </label>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value) || 0)}
            style={{
              width: 100, padding: '.35rem .5rem', fontSize: '.82rem',
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg-card)',
            }}
          />
          <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>€</span>
        </div>

        {/* Initial balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <label style={{ fontSize: '.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Solde initial :
          </label>
          <input
            type="number"
            value={initialBalance}
            onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
            style={{
              width: 110, padding: '.35rem .5rem', fontSize: '.82rem',
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg-card)',
            }}
          />
          <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>€</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-inline" style={{ marginTop: '2rem' }}>Chargement des données...</div>
      ) : (
        <>
          {/* ── Area Chart ───────────────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
              Projection de trésorerie cumulée
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOptimiste" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.optimiste} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.optimiste} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRealiste" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.realiste} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.realiste} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPessimiste" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.pessimiste} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.pessimiste} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  tickFormatter={v => fmtK(v)}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${fmt(value)} €`,
                    SCENARIO_LABELS[name] || name,
                  ]}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '.85rem',
                  }}
                />
                <Legend
                  formatter={v => SCENARIO_LABELS[v] || v}
                  wrapperStyle={{ fontSize: '.82rem' }}
                />
                {/* Threshold line */}
                <ReferenceLine
                  y={threshold}
                  stroke={COLORS.orange}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: `Seuil: ${fmt(threshold)} €`, position: 'right', fill: COLORS.orange, fontSize: 11 }}
                />
                {/* Zero line */}
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />

                <Area
                  type="monotone"
                  dataKey="optimiste"
                  stroke={COLORS.optimiste}
                  fill="url(#gradOptimiste)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="realiste"
                  stroke={COLORS.realiste}
                  fill="url(#gradRealiste)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="pessimiste"
                  stroke={COLORS.pessimiste}
                  fill="url(#gradPessimiste)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Forecast Table ───────────────────────────────── */}
          <div className="users-table-wrapper">
            <table className="users-table" style={{ fontSize: '.85rem' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, minWidth: 160 }}>
                    Catégorie
                  </th>
                  {sortedRows.map(r => (
                    <th
                      key={r.key}
                      style={{
                        textAlign: 'right',
                        minWidth: 95,
                        whiteSpace: 'nowrap',
                        background: r.cumul < threshold ? '#fef2f2' : undefined,
                        color: r.cumul < threshold ? COLORS.red : undefined,
                      }}
                    >
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Encaissements */}
                <tr style={{ background: '#f0fdf4' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    fontWeight: 600, color: COLORS.green,
                    background: '#f0fdf4',
                  }}>
                    Encaissements
                  </td>
                  {sortedRows.map(r => (
                    <td key={r.key} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.green }}>
                      {fmt(r.encaissements)}
                    </td>
                  ))}
                </tr>

                {/* Décaissements */}
                <tr style={{ background: '#fef2f2' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    fontWeight: 600, color: COLORS.red,
                    background: '#fef2f2',
                  }}>
                    Décaissements
                  </td>
                  {sortedRows.map(r => (
                    <td key={r.key} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.red }}>
                      -{fmt(r.decaissements)}
                    </td>
                  ))}
                </tr>

                {/* Solde mensuel */}
                <tr>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    fontWeight: 600, background: 'var(--bg-card)',
                  }}>
                    Solde mensuel
                  </td>
                  {sortedRows.map(r => (
                    <td
                      key={r.key}
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: r.solde >= 0 ? COLORS.green : COLORS.red,
                      }}
                    >
                      {r.solde >= 0 ? '+' : ''}{fmt(r.solde)}
                    </td>
                  ))}
                </tr>

                {/* Solde cumulé */}
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    fontWeight: 700, fontSize: '.9rem',
                    background: 'var(--bg-card)',
                  }}>
                    Solde cumulé
                  </td>
                  {sortedRows.map(r => {
                    const belowThreshold = r.cumul < threshold
                    return (
                      <td
                        key={r.key}
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          fontSize: '.9rem',
                          color: belowThreshold ? '#fff' : (r.cumul >= 0 ? COLORS.primary : COLORS.red),
                          background: belowThreshold ? COLORS.red : undefined,
                          borderRadius: belowThreshold ? 0 : undefined,
                        }}
                      >
                        {fmt(r.cumul)}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend / info */}
          <div style={{
            marginTop: '1rem', display: 'flex', gap: '1.5rem',
            flexWrap: 'wrap', fontSize: '.8rem', color: 'var(--text-muted)',
          }}>
            <span>
              <span style={{
                display: 'inline-block', width: 12, height: 12, borderRadius: 2,
                background: COLORS.red, marginRight: 6, verticalAlign: 'middle',
              }} />
              Mois sous le seuil d'alerte ({fmt(threshold)} €)
            </span>
            <span>
              <span style={{
                display: 'inline-block', width: 20, height: 2,
                background: COLORS.orange, marginRight: 6, verticalAlign: 'middle',
                borderBottom: '2px dashed ' + COLORS.orange,
              }} />
              Seuil d'alerte sur le graphique
            </span>
            <span>
              Sources : factures, achats, abonnements actifs, masse salariale (brut + charges patronales ~45%)
            </span>
          </div>
        </>
      )}
    </div>
  )
}
