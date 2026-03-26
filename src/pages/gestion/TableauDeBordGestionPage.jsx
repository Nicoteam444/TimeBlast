import { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) + ' €'
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const COLORS = ['#195C82', '#1D9BF0', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899', '#14b8a6']

// Generate demo data
function generateYearData(baseCA, baseMargeRate, variance = 0.15) {
  return MONTHS.map((m, i) => {
    const seasonality = 1 + 0.2 * Math.sin((i - 2) * Math.PI / 6) // Peak in summer
    const ca = Math.round(baseCA * seasonality * (1 + (Math.random() - 0.5) * variance))
    const charges = Math.round(ca * (1 - baseMargeRate) * (1 + (Math.random() - 0.5) * 0.1))
    const marge = ca - charges
    return { mois: m, ca, charges, marge, margeRate: Math.round((marge / ca) * 100) }
  })
}

export default function TableauDeBordGestionPage() {
  const [period, setPeriod] = useState('ytd') // ytd, q1, q2, q3, q4

  const currentYear = new Date().getFullYear()
  const dataCurrentYear = useMemo(() => generateYearData(85000, 0.35), [])
  const dataLastYear = useMemo(() => generateYearData(72000, 0.32), [])

  // Merge for comparison chart
  const comparisonData = MONTHS.map((m, i) => ({
    mois: m,
    [`CA ${currentYear}`]: dataCurrentYear[i].ca,
    [`CA ${currentYear - 1}`]: dataLastYear[i].ca,
    [`Marge ${currentYear}`]: dataCurrentYear[i].marge,
    [`Marge ${currentYear - 1}`]: dataLastYear[i].marge}))

  // Cumulative data
  let cumCurrent = 0, cumLast = 0
  const cumulativeData = MONTHS.map((m, i) => {
    cumCurrent += dataCurrentYear[i].ca
    cumLast += dataLastYear[i].ca
    return { mois: m, [currentYear]: cumCurrent, [currentYear - 1]: cumLast }
  })

  // Totals
  const totalCACurrentYear = dataCurrentYear.reduce((s, d) => s + d.ca, 0)
  const totalCALastYear = dataLastYear.reduce((s, d) => s + d.ca, 0)
  const totalMargeCurrentYear = dataCurrentYear.reduce((s, d) => s + d.marge, 0)
  const totalMargeLastYear = dataLastYear.reduce((s, d) => s + d.marge, 0)
  const totalChargesCurrentYear = dataCurrentYear.reduce((s, d) => s + d.charges, 0)

  const evolutionCA = ((totalCACurrentYear - totalCALastYear) / totalCALastYear * 100).toFixed(1)
  const evolutionMarge = ((totalMargeCurrentYear - totalMargeLastYear) / totalMargeLastYear * 100).toFixed(1)
  const margeRateCurrent = ((totalMargeCurrentYear / totalCACurrentYear) * 100).toFixed(1)

  // Charges breakdown
  const chargesBreakdown = [
    { name: 'Salaires', value: Math.round(totalChargesCurrentYear * 0.45) },
    { name: 'Loyers', value: Math.round(totalChargesCurrentYear * 0.15) },
    { name: 'Fournisseurs', value: Math.round(totalChargesCurrentYear * 0.20) },
    { name: 'Services', value: Math.round(totalChargesCurrentYear * 0.12) },
    { name: 'Autres', value: Math.round(totalChargesCurrentYear * 0.08) },
  ]

  // Monthly margin rate comparison
  const margeRateData = MONTHS.map((m, i) => ({
    mois: m,
    [currentYear]: dataCurrentYear[i].margeRate,
    [currentYear - 1]: dataLastYear[i].margeRate}))

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>📊 Tableau de bord</h1>
          <p>Comparaison {currentYear} vs {currentYear - 1}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {[
            { id: 'ytd', label: 'Année' },
            { id: 'q1', label: 'T1' },
            { id: 'q2', label: 'T2' },
            { id: 'q3', label: 'T3' },
            { id: 'q4', label: 'T4' },
          ].map(p => (
            <button key={p.id}
              className={period === p.id ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '.82rem', padding: '.4rem .8rem' }}
              onClick={() => setPeriod(p.id)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* CA */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Chiffre d'affaires {currentYear}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{fmtE(totalCACurrentYear)}</div>
          <div style={{ fontSize: '.82rem', color: evolutionCA >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600, marginTop: '.25rem' }}>
            {evolutionCA >= 0 ? '↑' : '↓'} {Math.abs(evolutionCA)}% vs {currentYear - 1}
          </div>
        </div>
        {/* Marge */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Marge brute {currentYear}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{fmtE(totalMargeCurrentYear)}</div>
          <div style={{ fontSize: '.82rem', color: evolutionMarge >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600, marginTop: '.25rem' }}>
            {evolutionMarge >= 0 ? '↑' : '↓'} {Math.abs(evolutionMarge)}% vs {currentYear - 1}
          </div>
        </div>
        {/* Taux de marge */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Taux de marge</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{margeRateCurrent}%</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
            vs {((totalMargeLastYear / totalCALastYear) * 100).toFixed(1)}% en {currentYear - 1}
          </div>
        </div>
        {/* Charges */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Charges totales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{fmtE(totalChargesCurrentYear)}</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
            {((totalChargesCurrentYear / totalCACurrentYear) * 100).toFixed(0)}% du CA
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* CA Comparison Bar */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>📊 CA mensuel — Comparaison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Legend />
              <Bar dataKey={`CA ${currentYear}`} fill="#195C82" radius={[4,4,0,0]} />
              <Bar dataKey={`CA ${currentYear - 1}`} fill="#1D9BF0" opacity={0.4} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CA Cumulé */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>📈 CA cumulé</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Legend />
              <Area type="monotone" dataKey={currentYear} fill="#195C82" fillOpacity={0.15} stroke="#195C82" strokeWidth={2} />
              <Area type="monotone" dataKey={currentYear - 1} fill="#1D9BF0" fillOpacity={0.08} stroke="#1D9BF0" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Marge Comparison */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>💹 Marge brute mensuelle</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Legend />
              <Bar dataKey={`Marge ${currentYear}`} fill="#16a34a" radius={[4,4,0,0]} />
              <Bar dataKey={`Marge ${currentYear - 1}`} fill="#16a34a" opacity={0.3} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taux de marge Evolution */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>📐 Taux de marge (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={margeRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={11} domain={[0, 60]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey={currentYear} stroke="#195C82" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey={currentYear - 1} stroke="#1D9BF0" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des charges */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>🥧 Répartition des charges</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chargesBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={11}>
                {chargesBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmtE(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* CA vs Charges */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text)' }}>⚖️ CA vs Charges {currentYear}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dataCurrentYear.map((d, i) => ({ mois: MONTHS[i], CA: d.ca, Charges: d.charges }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Legend />
              <Area type="monotone" dataKey="CA" fill="#195C82" fillOpacity={0.15} stroke="#195C82" strokeWidth={2} />
              <Area type="monotone" dataKey="Charges" fill="#ef4444" fillOpacity={0.1} stroke="#ef4444" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
