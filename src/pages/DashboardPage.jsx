import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ── Formatters ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) + ' €' }
function fmtH(n) { return n.toFixed(1) + 'h' }

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const COLORS = ['#195C82', '#1D9BF0', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899', '#14b8a6']

// ── Demo Data Generator ──
function genMonthlyData(base, variance = 0.2) {
  return MONTHS.map(m => {
    const v = Math.round(base * (0.8 + Math.random() * variance * 2))
    return { mois: m, value: v }
  })
}

function generateDashboardData() {
  const now = new Date()
  const currentMonth = now.getMonth()

  // 1. Calendrier / Activité
  const heuresParJour = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(j => ({
    jour: j, heures: +(5 + Math.random() * 4).toFixed(1)
  }))
  const totalHeuresSemaine = heuresParJour.reduce((s, d) => s + d.heures, 0)
  const projetEnCours = 8
  const tauxOccupation = Math.round(70 + Math.random() * 25)

  // 2. Équipe
  const effectif = 24
  const enConge = Math.floor(Math.random() * 5) + 1
  const absencesEnAttente = Math.floor(Math.random() * 4)
  const notesDeFraisEnAttente = Math.floor(Math.random() * 6) + 2
  const repartitionEquipe = [
    { name: 'Tech', value: 10 },
    { name: 'Commerce', value: 5 },
    { name: 'Admin', value: 4 },
    { name: 'Marketing', value: 3 },
    { name: 'Direction', value: 2 },
  ]

  // 3. CRM
  const leadsActifs = 18 + Math.floor(Math.random() * 10)
  const contactsTotal = 342 + Math.floor(Math.random() * 50)
  const entreprisesTotal = 87 + Math.floor(Math.random() * 20)
  const devisEnCours = 6 + Math.floor(Math.random() * 5)
  const tauxConversion = +(15 + Math.random() * 20).toFixed(1)
  const pipelineData = [
    { phase: 'Prospection', value: Math.floor(50000 + Math.random() * 100000) },
    { phase: 'Qualification', value: Math.floor(80000 + Math.random() * 120000) },
    { phase: 'Proposition', value: Math.floor(60000 + Math.random() * 80000) },
    { phase: 'Négociation', value: Math.floor(40000 + Math.random() * 60000) },
    { phase: 'Gagné', value: Math.floor(30000 + Math.random() * 50000) },
  ]

  // 4. Gestion (Ventes / Achats / Transactions)
  const caData = MONTHS.slice(0, currentMonth + 1).map(m => ({
    mois: m,
    ca: Math.round(60000 + Math.random() * 50000),
    charges: Math.round(35000 + Math.random() * 25000),
  }))
  const totalCA = caData.reduce((s, d) => s + d.ca, 0)
  const totalCharges = caData.reduce((s, d) => s + d.charges, 0)
  const facturesImpayees = Math.floor(3 + Math.random() * 8)
  const montantImpaye = Math.round(15000 + Math.random() * 30000)
  const encaissements30j = Math.round(40000 + Math.random() * 60000)
  const decaissements30j = Math.round(25000 + Math.random() * 40000)

  // 5. Finance
  const tresorerieData = MONTHS.slice(0, currentMonth + 1).map((m, i) => ({
    mois: m,
    solde: Math.round(80000 + i * 5000 + (Math.random() - 0.3) * 30000),
  }))
  const soldeActuel = tresorerieData[tresorerieData.length - 1]?.solde || 0
  const immobilisationsTotal = Math.round(120000 + Math.random() * 80000)
  const ecrituresNonRapprochees = Math.floor(5 + Math.random() * 15)
  const chargesParCategorie = [
    { name: 'Salaires', value: Math.round(totalCharges * 0.45) },
    { name: 'Loyers', value: Math.round(totalCharges * 0.15) },
    { name: 'Fournisseurs', value: Math.round(totalCharges * 0.20) },
    { name: 'Services', value: Math.round(totalCharges * 0.12) },
    { name: 'Autres', value: Math.round(totalCharges * 0.08) },
  ]

  // 6. Admin
  const utilisateursActifs = 18
  const societesGerées = 3
  const derniereConnexion = 'Il y a 2 minutes'

  return {
    heuresParJour, totalHeuresSemaine, projetEnCours, tauxOccupation,
    effectif, enConge, absencesEnAttente, notesDeFraisEnAttente, repartitionEquipe,
    leadsActifs, contactsTotal, entreprisesTotal, devisEnCours, tauxConversion, pipelineData,
    caData, totalCA, totalCharges, facturesImpayees, montantImpaye, encaissements30j, decaissements30j,
    tresorerieData, soldeActuel, immobilisationsTotal, ecrituresNonRapprochees, chargesParCategorie,
    utilisateursActifs, societesGerées, derniereConnexion,
  }
}

// ── KPI Card ──
function KPI({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', borderRadius: 10, padding: '1rem 1.25rem',
      border: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default',
      transition: 'all .15s',
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>{sub}</div>}
    </div>
  )
}

// ── Section Widget ──
function Section({ title, icon, link, children, navigate }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{
        padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '.95rem', color: 'var(--text)' }}>{icon} {title}</h3>
        {link && <button onClick={() => navigate(link)} style={{
          background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
          fontSize: '.82rem', fontWeight: 600,
        }}>Voir tout →</button>}
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  )
}

// ── Main Dashboard ──
export default function DashboardPage() {
  const { profile } = useAuth()
  const { selectedSociete } = useSociete()
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => { setData(generateDashboardData()) }, [selectedSociete?.id])

  if (!data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement…</div>

  const prenom = profile?.prenom || profile?.email?.split('@')[0] || 'Utilisateur'

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Bonjour, {prenom} 👋</h1>
        <p style={{ margin: '.25rem 0 0', color: 'var(--text-muted)', fontSize: '.9rem' }}>
          Voici un aperçu de votre activité{selectedSociete ? ` · ${selectedSociete.name}` : ''}
        </p>
      </div>

      {/* ═══ 1. CALENDRIER / ACTIVITÉ ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Section title="Activité de la semaine" icon="📆" link="/activite/saisie" navigate={navigate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
            <KPI icon="⏱" label="Heures saisies" value={fmtH(data.totalHeuresSemaine)} sub="cette semaine" color="var(--accent)" />
            <KPI icon="📁" label="Projets actifs" value={data.projetEnCours} color="var(--primary)" />
            <KPI icon="📊" label="Taux occupation" value={`${data.tauxOccupation}%`} color="#16a34a" />
            <KPI icon="✅" label="Validations" value="3" sub="en attente" color="#f59e0b" />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.heuresParJour} barSize={28}>
              <XAxis dataKey="jour" fontSize={11} />
              <YAxis fontSize={10} domain={[0, 10]} />
              <Tooltip formatter={v => `${v}h`} />
              <Bar dataKey="heures" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Équipe" icon="👥" link="/activite/equipe" navigate={navigate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
            <KPI icon="👥" label="Effectif" value={data.effectif} />
            <KPI icon="🏖" label="En congé" value={data.enConge} color="#f59e0b" />
            <KPI icon="⏳" label="Absences" value={data.absencesEnAttente} sub="en attente" color="#ef4444" />
            <KPI icon="🧾" label="Notes de frais" value={data.notesDeFraisEnAttente} sub="à valider" color="#7c3aed" />
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data.repartitionEquipe} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                dataKey="value" fontSize={10} label={({ name }) => name}>
                {data.repartitionEquipe.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ═══ 2. CRM ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Section title="CRM" icon="🎯" link="/crm/leads" navigate={navigate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
            <KPI icon="🚀" label="Leads actifs" value={data.leadsActifs} color="var(--accent)" />
            <KPI icon="👤" label="Contacts" value={data.contactsTotal} />
            <KPI icon="📝" label="Devis en cours" value={data.devisEnCours} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>Pipeline commercial</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.pipelineData} layout="vertical" barSize={18}>
              <XAxis type="number" fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
              <YAxis type="category" dataKey="phase" fontSize={10} width={80} />
              <Tooltip formatter={v => fmtE(v)} />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {data.pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* ═══ 3. GESTION ═══ */}
        <Section title="Gestion" icon="🧾" link="/gestion/tableau-de-bord" navigate={navigate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
            <KPI icon="📈" label="Encaissements 30j" value={fmtE(data.encaissements30j)} color="#16a34a" />
            <KPI icon="📉" label="Décaissements 30j" value={fmtE(data.decaissements30j)} color="#ef4444" />
            <KPI icon="⚠️" label="Impayées" value={data.facturesImpayees} sub={fmtE(data.montantImpaye)} color="#ef4444" />
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>CA vs Charges</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.caData}>
              <XAxis dataKey="mois" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Area type="monotone" dataKey="ca" fill="#195C82" fillOpacity={0.15} stroke="#195C82" strokeWidth={2} name="CA" />
              <Area type="monotone" dataKey="charges" fill="#ef4444" fillOpacity={0.08} stroke="#ef4444" strokeWidth={1.5} name="Charges" />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ═══ 4. FINANCE ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Section title="Finance" icon="💰" link="/finance/business-intelligence" navigate={navigate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
            <KPI icon="💰" label="CA cumulé" value={fmtE(data.totalCA)} color="var(--primary)" />
            <KPI icon="📊" label="Marge" value={fmtE(data.totalCA - data.totalCharges)} color="#16a34a" />
            <KPI icon="🏦" label="Trésorerie" value={fmtE(data.soldeActuel)} color="var(--accent)" />
            <KPI icon="🔗" label="Non rapprochées" value={data.ecrituresNonRapprochees} sub="écritures" color="#f59e0b" />
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>Évolution trésorerie</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={data.tresorerieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
              <Tooltip formatter={v => fmtE(v)} />
              <Line type="monotone" dataKey="solde" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Répartition des charges" icon="🥧" navigate={navigate}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.chargesParCategorie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" fontSize={10}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {data.chargesParCategorie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmtE(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ═══ 5. ALERTES / ACTIONS RAPIDES ═══ */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
      }}>
        <button onClick={() => navigate('/finance/facturation')} style={{
          padding: '1rem', background: '#e8f4fd', border: '1px solid #1D9BF0', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: '#195C82' }}>📤 Créer une facture</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Nouvelle facture client</div>
        </button>
        <button onClick={() => navigate('/gestion/transactions')} style={{
          padding: '1rem', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: '#166534' }}>🏦 Voir les transactions</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Encaissements & décaissements</div>
        </button>
        <button onClick={() => navigate('/crm/leads')} style={{
          padding: '1rem', background: '#fef9c3', border: '1px solid #eab308', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: '#854d0e' }}>🚀 Pipeline CRM</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{data.leadsActifs} leads actifs</div>
        </button>
        <button onClick={() => navigate('/activite/saisie')} style={{
          padding: '1rem', background: '#ede9fe', border: '1px solid #8b5cf6', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, color: '#4c1d95' }}>⏱ Saisir mes heures</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{fmtH(data.totalHeuresSemaine)} cette semaine</div>
        </button>
      </div>
    </div>
  )
}
