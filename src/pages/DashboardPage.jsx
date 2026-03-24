import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ── Formatters ──
function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)
}
function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function fmtDateLong(d) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "a l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `il y a ${diffD}j`
  return fmtDate(dateStr)
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Week helpers ──
function getMonday(d) {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}
function getSunday(d) {
  const mon = getMonday(d)
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

// ── Card wrapper ──
const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: '1.25rem',
}

function SectionHeader({ icon, title, linkLabel, onLink }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {icon} {title}
      </h2>
      {linkLabel && onLink && (
        <button onClick={onLink} style={{
          background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer',
          fontSize: '.82rem', fontWeight: 600, padding: 0,
        }}>{linkLabel}</button>
      )}
    </div>
  )
}

// ── Main Dashboard ──
export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { selectedSociete } = useSociete()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState({})

  // ── Fetch all data ──
  useEffect(() => {
    if (!user) return
    const socId = selectedSociete?.id
    const today = new Date().toISOString().slice(0, 10)
    const monday = getMonday(new Date()).toISOString().slice(0, 10)
    const sunday = getSunday(new Date()).toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const sixMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

    async function safeQuery(fn) {
      try { return await fn() } catch { return { data: null, count: 0 } }
    }

    async function load() {
      setLoading(true)
      try {
        const [
          tasksRes,
          tempsRes,
          facturesOverdueRes,
          tasksOverdueRes,
          absencesPendingRes,
          notesFraisPendingRes,
          projetsRes,
          facturesPaid30Res,
          achats30Res,
          facturesTrendRes,
          campagnesRes,
          leadsCountRes,
          leadsPipelineRes,
          documentsRes,
          recentTasksRes,
          recentDocsRes,
          recentContactsRes,
          projetsActifsCountRes,
        ] = await Promise.all([
          // 1. Mes taches
          safeQuery(() => supabase.from('kanban_tasks').select('*').eq('assigned_to', user.id).order('priority', { ascending: true }).order('due_date', { ascending: true }).limit(6)),
          // 2. Mon temps (this week)
          safeQuery(() => supabase.from('saisies_temps').select('*').eq('user_id', user.id).gte('date', monday).lte('date', sunday)),
          // 3. Alertes - factures overdue
          safeQuery(() => {
            let q = supabase.from('factures').select('id', { count: 'exact', head: true }).lt('date_echeance', today).neq('statut', 'payee')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Alertes - tasks overdue
          safeQuery(() => supabase.from('kanban_tasks').select('id', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'done')),
          // Alertes - absences pending
          safeQuery(() => {
            let q = supabase.from('absences').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Alertes - notes de frais pending
          safeQuery(() => {
            let q = supabase.from('notes_de_frais').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 4. Projets actifs
          safeQuery(() => {
            let q = supabase.from('projets').select('*').eq('statut', 'actif').limit(5)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 5. Tresorerie - factures paid last 30d
          safeQuery(() => {
            let q = supabase.from('factures').select('montant_ttc, date_emission').eq('statut', 'payee').gte('date_emission', thirtyDaysAgo)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Tresorerie - achats last 30d
          safeQuery(() => {
            let q = supabase.from('achats').select('montant, date').gte('date', thirtyDaysAgo)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Tresorerie - factures trend last 6 months
          safeQuery(() => {
            let q = supabase.from('factures').select('montant_ttc, date_emission, statut').gte('date_emission', sixMonthsAgo)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 6. Marketing - campagnes
          safeQuery(() => {
            let q = supabase.from('campagnes').select('*').eq('statut', 'en_cours')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Marketing - leads count this month
          safeQuery(() => {
            let q = supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Marketing - leads pipeline total
          safeQuery(() => {
            let q = supabase.from('leads').select('montant')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 7. Derniers documents
          safeQuery(() => {
            let q = supabase.from('documents_archive').select('*').order('created_at', { ascending: false }).limit(5)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 8. Activite recente - tasks
          safeQuery(() => supabase.from('kanban_tasks').select('id, title, created_at').order('created_at', { ascending: false }).limit(5)),
          // Activite recente - docs
          safeQuery(() => {
            let q = supabase.from('documents_archive').select('id, nom, created_at').order('created_at', { ascending: false }).limit(3)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Activite recente - contacts
          safeQuery(() => {
            let q = supabase.from('contacts').select('id, nom, prenom, created_at').order('created_at', { ascending: false }).limit(3)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Projets actifs count for KPI
          safeQuery(() => {
            let q = supabase.from('projets').select('id', { count: 'exact', head: true }).eq('statut', 'actif')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
        ])

        // Also fetch task counts per project for progress bars
        const projets = projetsRes?.data || []
        let projetTaskCounts = {}
        if (projets.length > 0) {
          const projetIds = projets.map(p => p.id)
          const tcRes = await safeQuery(() =>
            supabase.from('kanban_tasks').select('projet_id, status').in('projet_id', projetIds)
          )
          const tasks = tcRes?.data || []
          for (const t of tasks) {
            if (!projetTaskCounts[t.projet_id]) projetTaskCounts[t.projet_id] = { total: 0, done: 0 }
            projetTaskCounts[t.projet_id].total++
            if (t.status === 'done' || t.status === 'termine') projetTaskCounts[t.projet_id].done++
          }
        }

        setRaw({
          tasks: tasksRes?.data || [],
          temps: tempsRes?.data || [],
          facturesOverdueCount: facturesOverdueRes?.count || 0,
          tasksOverdueCount: tasksOverdueRes?.count || 0,
          absencesPendingCount: absencesPendingRes?.count || 0,
          notesFraisPendingCount: notesFraisPendingRes?.count || 0,
          projets,
          projetTaskCounts,
          facturesPaid30: facturesPaid30Res?.data || [],
          achats30: achats30Res?.data || [],
          facturesTrend: facturesTrendRes?.data || [],
          campagnes: campagnesRes?.data || [],
          leadsCount: leadsCountRes?.count || 0,
          leadsPipeline: leadsPipelineRes?.data || [],
          documents: documentsRes?.data || [],
          recentTasks: recentTasksRes?.data || [],
          recentDocs: recentDocsRes?.data || [],
          recentContacts: recentContactsRes?.data || [],
          projetsActifsCount: projetsActifsCountRes?.count || 0,
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setRaw({})
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, selectedSociete?.id])

  // ── Computed values ──
  const today = new Date()

  const prenom = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'Utilisateur'
  const todayLabel = fmtDateLong(today)

  // Tasks sorted by priority
  const myTasks = useMemo(() => {
    const priorityOrder = { haute: 0, moyenne: 1, basse: 2 }
    return [...(raw.tasks || [])].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1
      const pb = priorityOrder[b.priority] ?? 1
      if (pa !== pb) return pa - pb
      return (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1
    }).slice(0, 6)
  }, [raw.tasks])

  // Time chart data
  const tempsChart = useMemo(() => {
    const entries = raw.temps || []
    const byDay = {}
    for (const e of entries) {
      const d = new Date(e.date)
      const dayIdx = d.getDay() // 0=Sun
      const label = JOURS[dayIdx]
      byDay[label] = (byDay[label] || 0) + (e.duree || e.heures || 0)
    }
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(j => ({ jour: j, heures: +(byDay[j] || 0).toFixed(1) }))
  }, [raw.temps])

  const totalHeures = useMemo(() => tempsChart.reduce((s, d) => s + d.heures, 0), [tempsChart])
  const tauxOccupation = useMemo(() => Math.min(100, Math.round((totalHeures / 40) * 100)), [totalHeures])

  // Tresorerie
  const encaissements30 = useMemo(() => (raw.facturesPaid30 || []).reduce((s, f) => s + (f.montant_ttc || 0), 0), [raw.facturesPaid30])
  const decaissements30 = useMemo(() => (raw.achats30 || []).reduce((s, a) => s + (a.montant || 0), 0), [raw.achats30])
  const soldeEstime = useMemo(() => encaissements30 - decaissements30, [encaissements30, decaissements30])

  // Trend chart: factures grouped by month
  const trendChart = useMemo(() => {
    const factures = raw.facturesTrend || []
    const byMonth = {}
    for (const f of factures) {
      if (!f.date_emission) continue
      const d = new Date(f.date_emission)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { encaissements: 0, total: 0 }
      byMonth[key].total += (f.montant_ttc || 0)
      if (f.statut === 'payee') byMonth[key].encaissements += (f.montant_ttc || 0)
    }
    return Object.keys(byMonth).sort().slice(-6).map(k => {
      const [y, m] = k.split('-')
      return { mois: MOIS_LABELS[parseInt(m) - 1], encaissements: byMonth[k].encaissements, total: byMonth[k].total }
    })
  }, [raw.facturesTrend])

  // Marketing
  const campagnesActives = (raw.campagnes || []).length
  const pipelineTotal = useMemo(() => (raw.leadsPipeline || []).reduce((s, l) => s + (l.montant || 0), 0), [raw.leadsPipeline])
  const leadsTotal = useMemo(() => (raw.leadsPipeline || []).length, [raw.leadsPipeline])
  const tauxConversion = useMemo(() => {
    if (!leadsTotal) return 0
    const converted = (raw.leadsPipeline || []).filter(l => l.statut === 'gagne' || l.statut === 'converti').length
    return Math.round((converted / leadsTotal) * 100)
  }, [raw.leadsPipeline, leadsTotal])

  // Activity timeline
  const activityTimeline = useMemo(() => {
    const items = []
    for (const t of (raw.recentTasks || [])) {
      items.push({ type: 'task', icon: '✅', label: `Tache creee : ${t.title}`, date: t.created_at })
    }
    for (const d of (raw.recentDocs || [])) {
      items.push({ type: 'doc', icon: '📄', label: `Document ajoute : ${d.nom || 'Sans nom'}`, date: d.created_at })
    }
    for (const c of (raw.recentContacts || [])) {
      items.push({ type: 'contact', icon: '👤', label: `Contact cree : ${[c.prenom, c.nom].filter(Boolean).join(' ') || 'Inconnu'}`, date: c.created_at })
    }
    return items.sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1).slice(0, 8)
  }, [raw.recentTasks, raw.recentDocs, raw.recentContacts])

  // Header subtitle
  const headerSubtitle = useMemo(() => {
    const parts = []
    const urgentTasks = (raw.tasks || []).filter(t => t.priority === 'haute').length
    if (urgentTasks > 0) parts.push(`${urgentTasks} tache${urgentTasks > 1 ? 's' : ''} urgente${urgentTasks > 1 ? 's' : ''}`)
    if (raw.facturesOverdueCount > 0) parts.push(`${raw.facturesOverdueCount} facture${raw.facturesOverdueCount > 1 ? 's' : ''} impayee${raw.facturesOverdueCount > 1 ? 's' : ''}`)
    if (campagnesActives > 0) parts.push(`${campagnesActives} campagne${campagnesActives > 1 ? 's' : ''} active${campagnesActives > 1 ? 's' : ''}`)
    return parts.length > 0 ? parts.join(' · ') : 'Tout est en ordre'
  }, [raw.tasks, raw.facturesOverdueCount, campagnesActives])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="admin-page" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '.5rem' }}>Chargement du tableau de bord...</div>
      </div>
    )
  }

  const todayStr = today.toISOString().slice(0, 10)

  const priorityIcon = (p) => {
    if (p === 'haute') return '🔴'
    if (p === 'moyenne') return '🟡'
    return '🟢'
  }

  const ocrBadge = (status) => {
    if (!status) return null
    const colors = { done: '#16a34a', pending: '#f59e0b', error: '#ef4444' }
    const labels = { done: 'OCR OK', pending: 'OCR...', error: 'OCR Erreur' }
    return (
      <span style={{
        fontSize: '.7rem', padding: '2px 6px', borderRadius: 4,
        background: (colors[status] || '#94a3b8') + '20',
        color: colors[status] || '#94a3b8',
        fontWeight: 600,
      }}>{labels[status] || status}</span>
    )
  }

  const docIcon = (type) => {
    const icons = { facture: '🧾', devis: '📝', contrat: '📑', autre: '📄' }
    return icons[type] || '📄'
  }

  return (
    <div className="admin-page" style={{ padding: 0 }}>
      {/* ═══ ROW 1: HEADER ═══ */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>
          Bonjour, {prenom} 👋
        </h1>
        <p style={{ margin: '.25rem 0 0', color: 'var(--text-muted)', fontSize: '.9rem' }}>
          {todayLabel}{selectedSociete ? ` · ${selectedSociete.name}` : ''}
        </p>
        <p style={{ margin: '.25rem 0 0', fontSize: '.85rem', color: 'var(--text-muted)' }}>
          {headerSubtitle}
        </p>
      </div>

      {/* ═══ ROW 2: MES TACHES | MON TEMPS | ALERTES ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── MES TACHES ── */}
        <div style={cardStyle}>
          <SectionHeader icon="📋" title="Mes Taches" linkLabel="Voir tout →" onLink={() => navigate('/activite/projets')} />
          {myTasks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
              Aucune tache assignee
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {myTasks.map(t => {
                const overdue = t.due_date && t.due_date < todayStr && t.status !== 'done' && t.status !== 'termine'
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '.5rem',
                    padding: '.5rem .75rem', borderRadius: 8,
                    background: overdue ? '#fef2f2' : 'var(--surface, #f8fafc)',
                    border: overdue ? '1px solid #fecaca' : '1px solid transparent',
                    fontSize: '.85rem',
                  }}>
                    <span>{priorityIcon(t.priority)}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: overdue ? '#dc2626' : 'var(--text)' }}>
                      {t.title}
                    </span>
                    {t.due_date && (
                      <span style={{ fontSize: '.75rem', color: overdue ? '#dc2626' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(t.due_date)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── MON TEMPS ── */}
        <div style={cardStyle}>
          <SectionHeader icon="⏱" title="Mon Temps" linkLabel="Saisir du temps →" onLink={() => navigate('/activite/saisie')} />
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={tempsChart} barSize={24}>
              <XAxis dataKey="jour" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} domain={[0, 10]} hide />
              <Tooltip formatter={v => `${v}h`} />
              <Bar dataKey="heures" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5rem', margin: '.75rem 0 .5rem', fontSize: '.85rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{totalHeures.toFixed(1)}h</span>
            <span style={{ color: 'var(--text-muted)' }}>/ 40h</span>
            <span style={{ color: 'var(--text-muted)' }}>({tauxOccupation}%)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem' }}>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Heures</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{totalHeures.toFixed(1)}h</div>
            </div>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Projets</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{raw.projetsActifsCount || 0}</div>
            </div>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Occupation</div>
              <div style={{ fontWeight: 700, color: tauxOccupation >= 80 ? '#16a34a' : tauxOccupation >= 50 ? '#f59e0b' : '#ef4444' }}>{tauxOccupation}%</div>
            </div>
          </div>
        </div>

        {/* ── ALERTES ── */}
        <div style={cardStyle}>
          <SectionHeader icon="🔔" title="Alertes" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {[
              { icon: '🧾', count: raw.facturesOverdueCount || 0, label: 'Factures impayees', color: '#ef4444', link: '/finance/facturation' },
              { icon: '⏰', count: raw.tasksOverdueCount || 0, label: 'Taches en retard', color: '#ef4444', link: '/activite/projets' },
              { icon: '🏖', count: raw.absencesPendingCount || 0, label: 'Absences a valider', color: '#f59e0b', link: '/activite/equipe' },
              { icon: '💳', count: raw.notesFraisPendingCount || 0, label: 'Notes de frais a valider', color: '#f59e0b', link: '/activite/equipe' },
            ].map((alert, i) => (
              <div key={i} onClick={() => alert.link && navigate(alert.link)} style={{
                display: 'flex', alignItems: 'center', gap: '.75rem',
                padding: '.6rem .75rem', borderRadius: 8,
                background: alert.count > 0 ? alert.color + '10' : 'var(--surface, #f8fafc)',
                border: alert.count > 0 ? `1px solid ${alert.color}30` : '1px solid transparent',
                cursor: alert.link ? 'pointer' : 'default',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{alert.icon}</span>
                <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text)' }}>{alert.label}</span>
                <span style={{
                  fontWeight: 700, fontSize: '.9rem',
                  color: alert.count > 0 ? alert.color : 'var(--text-muted)',
                  minWidth: 24, textAlign: 'right',
                }}>{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: PROJETS ACTIFS | TRESORERIE ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── PROJETS ACTIFS ── */}
        <div style={cardStyle}>
          <SectionHeader icon="📁" title="Projets Actifs" linkLabel="Voir tout →" onLink={() => navigate('/activite/projets')} />
          {(raw.projets || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
              Aucun projet actif
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {(raw.projets || []).slice(0, 5).map(p => {
                const tc = raw.projetTaskCounts?.[p.id] || { total: 0, done: 0 }
                const pct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0
                return (
                  <div key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{p.nom || p.name}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{tc.done}/{tc.total} taches</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border, #e2e8f0)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── TRESORERIE ── */}
        <div style={cardStyle}>
          <SectionHeader icon="💰" title="Tresorerie" linkLabel="Voir detail →" onLink={() => navigate('/finance/business-intelligence')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: '#f0fdf4' }}>
              <div style={{ fontSize: '.7rem', color: '#16a34a' }}>Encaissements 30j</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#16a34a' }}>{fmtE(encaissements30)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: '#fef2f2' }}>
              <div style={{ fontSize: '.7rem', color: '#ef4444' }}>Decaissements 30j</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#ef4444' }}>{fmtE(decaissements30)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '.5rem', borderRadius: 8, background: '#eff6ff' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--primary)' }}>Solde estime</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: soldeEstime >= 0 ? '#16a34a' : '#ef4444' }}>{fmtE(soldeEstime)}</div>
            </div>
          </div>
          {trendChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendChart}>
                <XAxis dataKey="mois" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} hide />
                <Tooltip formatter={v => fmtE(v)} />
                <Area type="monotone" dataKey="encaissements" fill="var(--primary)" fillOpacity={0.15} stroke="var(--primary)" strokeWidth={2} name="Encaissements" />
                <Area type="monotone" dataKey="total" fill="#f59e0b" fillOpacity={0.08} stroke="#f59e0b" strokeWidth={1.5} name="Total facture" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
              Pas de donnees sur les 6 derniers mois
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW 4: MARKETING | DERNIERS DOCUMENTS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── MARKETING ── */}
        <div style={cardStyle}>
          <SectionHeader icon="📣" title="Marketing" linkLabel="Voir campagnes →" onLink={() => navigate('/marketing/campagnes')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Campagnes actives</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{campagnesActives}</div>
            </div>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Leads ce mois</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{raw.leadsCount || 0}</div>
            </div>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Pipeline total</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{fmtE(pipelineTotal)}</div>
            </div>
            <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Taux conversion</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: tauxConversion >= 20 ? '#16a34a' : '#f59e0b' }}>{tauxConversion}%</div>
            </div>
          </div>
        </div>

        {/* ── DERNIERS DOCUMENTS ── */}
        <div style={cardStyle}>
          <SectionHeader icon="📄" title="Derniers Documents" linkLabel="Voir archives →" onLink={() => navigate('/documents/archives')} />
          {(raw.documents || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
              Aucun document recent
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {(raw.documents || []).map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.5rem .75rem', borderRadius: 8,
                  background: 'var(--surface, #f8fafc)',
                  fontSize: '.85rem',
                }}>
                  <span>{docIcon(d.type)}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                    {d.nom || 'Sans nom'}
                  </span>
                  {d.fournisseur && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{d.fournisseur}</span>}
                  {d.montant_ttc != null && <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text)' }}>{fmtE(d.montant_ttc)}</span>}
                  {ocrBadge(d.ocr_status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW 5: ACTIVITE RECENTE ═══ */}
      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <SectionHeader icon="🕐" title="Activite Recente" />
        {activityTimeline.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
            Aucune activite recente
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {activityTimeline.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '.75rem',
                padding: '.5rem .75rem', borderRadius: 8,
                background: 'var(--surface, #f8fafc)',
                fontSize: '.85rem',
              }}>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', minWidth: 70 }}>{relativeTime(item.date)}</span>
                <span>{item.icon}</span>
                <span style={{ color: 'var(--text)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
