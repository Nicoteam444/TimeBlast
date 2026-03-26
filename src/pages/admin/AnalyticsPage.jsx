import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area } from 'recharts'

const COLORS = ['#1a5c82', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

function fmtK(n) {
  if (!n) return '0 €'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + ' M€'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' K€'
  return Math.round(n) + ' €'
}

function fmtPct(n) { return (n || 0).toFixed(1) + '%' }

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('year') // year, quarter, month

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const filters = (q) => q

    const [clients, transactions, factures, achats, equipe, saisies, projets, absences] = await Promise.all([
      filters(supabase.from('clients').select('*')).then(r => r.data || []),
      supabase.from('transactions').select('*').then(r => r.data || []),
      filters(supabase.from('factures').select('*')).then(r => r.data || []),
      filters(supabase.from('achats').select('*')).then(r => r.data || []),
      filters(supabase.from('equipe').select('*')).then(r => r.data || []),
      filters(supabase.from('saisies_temps').select('*')).then(r => r.data || []),
      filters(supabase.from('projets').select('*')).then(r => r.data || []),
      filters(supabase.from('absences').select('*')).then(r => r.data || []),
    ])

    setData({ clients, transactions, factures, achats, equipe, saisies, projets, absences })
    setLoading(false)
  }

  const analytics = useMemo(() => {
    if (!data) return null
    const { clients, transactions, factures, achats, equipe, saisies, projets, absences } = data

    // ── KPIs principaux ──
    const caFacture = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0)
    const caEnvoye = factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.total_ttc || 0), 0)
    const pipeline = transactions.filter(t => !['ferme_perdu', 'perdu'].includes(t.phase)).reduce((s, t) => s + (t.montant || 0), 0)
    const totalAchats = achats.reduce((s, a) => s + (a.montant || 0), 0)
    const totalHeures = saisies.reduce((s, e) => s + (e.heures || 0), 0)
    const projetsActifs = projets.filter(p => p.statut === 'actif').length
    const tauxConversion = transactions.length > 0
      ? (transactions.filter(t => ['ferme_gagne', 'ferme'].includes(t.phase)).length / transactions.length) * 100
      : 0
    const facImpayees = factures.filter(f => f.statut === 'retard')
    const masseSalariale = equipe.reduce((s, e) => s + (e.salaire_brut || 0), 0)

    // ── CA par mois ──
    const caParMois = {}
    factures.forEach(f => {
      const m = f.date_emission?.slice(0, 7)
      if (m) caParMois[m] = (caParMois[m] || 0) + (f.total_ttc || 0)
    })
    const achatsParMois = {}
    achats.forEach(a => {
      const m = a.date_achat?.slice(0, 7)
      if (m) achatsParMois[m] = (achatsParMois[m] || 0) + (a.montant || 0)
    })
    // 12 derniers mois
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      months.push({ key, label, ca: caParMois[key] || 0, achats: achatsParMois[key] || 0 })
    }

    // ── Pipeline par phase ──
    const phases = {}
    transactions.forEach(t => { phases[t.phase] = (phases[t.phase] || 0) + (t.montant || 0) })
    const phaseLabels = { qualification: 'Qualification', short_list: 'Short list', ferme_a_gagner: 'Fermé à gagner', ferme_gagne: 'Fermé gagné', ferme: 'Fermé ✓', ferme_perdu: 'Perdu', perdu: 'Perdu' }
    const pipelineData = Object.entries(phases).map(([k, v]) => ({ name: phaseLabels[k] || k, value: v }))

    // ── Top clients par CA ──
    const caParClient = {}
    factures.forEach(f => { if (f.client_nom) caParClient[f.client_nom] = (caParClient[f.client_nom] || 0) + (f.total_ttc || 0) })
    const topClients = Object.entries(caParClient).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))

    // ── Heures par projet (top 10) ──
    const heuresParProjet = {}
    saisies.forEach(s => {
      const p = projets.find(p => p.id === s.projet_id)
      const name = p?.name || 'Sans projet'
      heuresParProjet[name] = (heuresParProjet[name] || 0) + (s.heures || 0)
    })
    const topProjets = Object.entries(heuresParProjet).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, heures]) => ({ name, heures }))

    // ── Factures par statut ──
    const facParStatut = {}
    factures.forEach(f => { facParStatut[f.statut] = (facParStatut[f.statut] || 0) + 1 })
    const statutLabels = { brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', retard: 'En retard' }
    const statutColors = { brouillon: '#94a3b8', envoyee: '#f59e0b', payee: '#22c55e', retard: '#ef4444' }
    const facStatutData = Object.entries(facParStatut).map(([k, v]) => ({ name: statutLabels[k] || k, value: v, color: statutColors[k] || '#94a3b8' }))

    // ── Taux utilisation (heures / 151.67h mensuel) ──
    const utilisationParPersonne = {}
    saisies.forEach(s => {
      if (s.user_id) utilisationParPersonne[s.user_id] = (utilisationParPersonne[s.user_id] || 0) + (s.heures || 0)
    })
    const nbMois = 1 // simplifié
    const tauxUtilMoyen = Object.keys(utilisationParPersonne).length > 0
      ? Object.values(utilisationParPersonne).reduce((s, h) => s + h, 0) / Object.keys(utilisationParPersonne).length / 151.67 * 100
      : 0

    return {
      kpis: {
        caFacture, caEnvoye, pipeline, totalAchats, totalHeures,
        projetsActifs, tauxConversion, facImpayees: facImpayees.length,
        montantImpaye: facImpayees.reduce((s, f) => s + (f.total_ttc || 0), 0),
        masseSalariale, nbClients: clients.length, nbCollaborateurs: equipe.length,
        tauxUtilMoyen},
      charts: { months, pipelineData, topClients, topProjets, facStatutData }
    }
  }, [data])

  if (loading) return <div className="admin-page"><Spinner /></div>

  const k = analytics?.kpis || {}
  const c = analytics?.charts || {}

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>📊 Tableau de bord analytique</h1>
          <p>Vue d'ensemble de l'activité</p>
        </div>
      </div>

      {/* ── KPIs principaux ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
        <KpiCard label="CA facturé" value={fmtK(k.caFacture)} color="#22c55e" icon="💰" />
        <KpiCard label="CA en attente" value={fmtK(k.caEnvoye)} color="#f59e0b" icon="📨" />
        <KpiCard label="Pipeline commercial" value={fmtK(k.pipeline)} color="#1a5c82" icon="📈" />
        <KpiCard label="Taux conversion" value={fmtPct(k.tauxConversion)} color="#8b5cf6" icon="🎯" />
        <KpiCard label="Factures impayées" value={`${k.facImpayees} (${fmtK(k.montantImpaye)})`} color="#ef4444" icon="⚠" />
        <KpiCard label="Total achats" value={fmtK(k.totalAchats)} color="#06b6d4" icon="🛒" />
        <KpiCard label="Heures saisies" value={`${Math.round(k.totalHeures)}h`} color="#14b8a6" icon="⏱" />
        <KpiCard label="Taux utilisation" value={fmtPct(k.tauxUtilMoyen)} color="#ec4899" icon="📊" />
        <KpiCard label="Clients actifs" value={k.nbClients} color="#1a5c82" icon="👥" />
        <KpiCard label="Projets actifs" value={k.projetsActifs} color="#22c55e" icon="📁" />
        <KpiCard label="Collaborateurs" value={k.nbCollaborateurs} color="#8b5cf6" icon="👤" />
        <KpiCard label="Masse salariale" value={fmtK(k.masseSalariale)} color="#f59e0b" icon="💼" />
      </div>

      {/* ── Graphiques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* CA vs Achats par mois */}
        <ChartCard title="CA vs Achats — 12 derniers mois">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={c.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtK(v)} />
              <Legend />
              <Bar dataKey="ca" name="CA facturé" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="achats" name="Achats" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
              <Line dataKey="ca" name="Tendance CA" stroke="#1a5c82" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pipeline par phase */}
        <ChartCard title="Pipeline par phase">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={c.pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {c.pipelineData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtK(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top clients */}
        <ChartCard title="Top clients par CA">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={c.topClients} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmtK(v)} />
              <Bar dataKey="value" name="CA" fill="#1a5c82" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Factures par statut */}
        <ChartCard title="Factures par statut">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={c.facStatutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                {c.facStatutData?.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Heures par projet */}
      <ChartCard title="Heures par projet — Top 10">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={c.topProjets}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, angle: -20 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v}h`} />
            <Bar dataKey="heures" name="Heures" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '.85rem 1rem', borderLeft: `4px solid ${color}`}}>
      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.25rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '1.25rem', overflow: 'hidden'}}>
      <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.75rem' }}>{title}</h3>
      {children}
    </div>
  )
}
