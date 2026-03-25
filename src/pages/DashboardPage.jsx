import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
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

// ── CSS Animations (injected once) ──
const DASH_STYLE_ID = 'dashboard-animations'
if (typeof document !== 'undefined' && !document.getElementById(DASH_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = DASH_STYLE_ID
  style.textContent = `
    @keyframes dashFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dashPulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
    .dash-card { animation: dashFadeIn .45s ease both; transition: transform .2s, box-shadow .2s; }
    .dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,.08) !important; }
    .dash-card:hover .dash-grip { opacity: 1 !important; }
  `
  document.head.appendChild(style)
}

// ── Card wrapper ──
const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: '1.25rem',
}

// ── SVG Donut helper ──
function DonutChart({ size = 56, stroke = 5, pct = 0, color = '#16a34a', trackColor = '#e5e7eb', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.24, fontWeight: 700, fill: color }}>
        {label ?? `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}

function SectionHeader({ icon, title, linkLabel, onLink }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {icon} {title}
        <span style={{ display: 'block', width: 28, height: 3, borderRadius: 2, background: 'var(--primary, #1a5c82)', marginTop: 2 }} />
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

  // ── Drag & Drop Widgets ──
  const uid = user?.id || 'anon'
  const STORAGE_KEY = `timeblast_dashboard_order_${uid}`
  const MOOD_KEY = `timeblast_mood_${uid}`
  const DEFAULT_ORDER = ['score', 'feed', 'tasks', 'time', 'alerts', 'goals', 'projects', 'treasury', 'mood', 'marketing', 'documents', 'shortcuts', 'presence', 'activity']
  const MOODS = [
    { emoji: '😄', label: 'Super', color: '#16a34a' },
    { emoji: '🙂', label: 'Bien', color: '#3b82f6' },
    { emoji: '😐', label: 'Neutre', color: '#f59e0b' },
    { emoji: '😟', label: 'Bof', color: '#f97316' },
    { emoji: '😫', label: 'Difficile', color: '#ef4444' },
  ]
  const [myMood, setMyMood] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MOOD_KEY) || 'null') } catch { return null }
  })
  const [teamMoods, setTeamMoods] = useState([])

  // ── Feed reactions state ──
  const FEED_REACTIONS_KEY = `tb_feed_reactions_${user?.id}`
  const [feedReactions, setFeedReactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FEED_REACTIONS_KEY) || '{}') } catch { return {} }
  })
  const FEED_EMOJIS = ['👏', '🎉', '💪', '🔥']
  function toggleFeedReaction(activityKey, emoji) {
    setFeedReactions(prev => {
      const next = { ...prev }
      if (!next[activityKey]) next[activityKey] = {}
      const current = next[activityKey][emoji] || 0
      if (current > 0) {
        next[activityKey] = { ...next[activityKey], [emoji]: current - 1 }
        if (next[activityKey][emoji] <= 0) delete next[activityKey][emoji]
        if (Object.keys(next[activityKey]).length === 0) delete next[activityKey]
      } else {
        next[activityKey] = { ...next[activityKey], [emoji]: 1 }
      }
      localStorage.setItem(FEED_REACTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  function submitMood(mood) {
    const entry = { ...mood, user: profile?.full_name || 'Moi', date: new Date().toISOString() }
    setMyMood(entry)
    localStorage.setItem(MOOD_KEY, JSON.stringify(entry))
    // Simuler les humeurs d'équipe (en prod ça serait une table Supabase)
    setTeamMoods(prev => [entry, ...prev.filter(m => m.user !== entry.user)].slice(0, 8))
  }

  // Charger des humeurs d'équipe simulées au mount
  useEffect(() => {
    const fakeTeam = [
      { emoji: '😄', label: 'Super', color: '#16a34a', user: 'Sophie Martin', date: new Date(Date.now() - 3600000).toISOString() },
      { emoji: '🙂', label: 'Bien', color: '#3b82f6', user: 'Thomas Leroy', date: new Date(Date.now() - 7200000).toISOString() },
      { emoji: '😄', label: 'Super', color: '#16a34a', user: 'Claire Moreau', date: new Date(Date.now() - 10800000).toISOString() },
      { emoji: '😐', label: 'Neutre', color: '#f59e0b', user: 'Marc Garcia', date: new Date(Date.now() - 14400000).toISOString() },
      { emoji: '🙂', label: 'Bien', color: '#3b82f6', user: 'Laura Michel', date: new Date(Date.now() - 18000000).toISOString() },
    ]
    if (myMood) {
      setTeamMoods([myMood, ...fakeTeam.filter(m => m.user !== myMood.user)])
    } else {
      setTeamMoods(fakeTeam)
    }
  }, [])

  // ── Presence: qui est en ligne ──
  const PATH_LABELS = {
    '/': 'Dashboard',
    '/crm/contacts': 'Contacts CRM',
    '/crm/leads': 'Leads',
    '/activite/projets': 'Projets',
    '/finance/facturation': 'Facturation',
    '/activite/saisie': 'Calendrier',
    '/commerce/transactions': 'Opportunites',
    '/documents/archives': 'Documents',
    '/rh/absences': 'Absences',
    '/rh/notes-de-frais': 'Notes de frais',
    '/admin/societes': 'Societes',
    '/admin/utilisateurs': 'Utilisateurs',
    '/activite/kanban': 'Kanban',
    '/finance/achats': 'Achats',
    '/marketing/campagnes': 'Campagnes',
  }
  const [presenceData, setPresenceData] = useState([])
  const [allProfiles, setAllProfiles] = useState([])

  useEffect(() => {
    if (!user) return
    async function loadPresence() {
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const [viewsRes, profilesRes] = await Promise.all([
          supabase.from('page_views').select('user_id, page_path, created_at').gt('created_at', fiveMinAgo).order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name'),
        ])
        const views = viewsRes?.data || []
        const profiles = profilesRes?.data || []
        setAllProfiles(profiles)

        // Group by user_id, keep latest page_path per user
        const latestByUser = {}
        for (const v of views) {
          if (!latestByUser[v.user_id]) {
            latestByUser[v.user_id] = v
          }
        }

        const presenceList = Object.values(latestByUser).map(v => {
          const prof = profiles.find(p => p.id === v.user_id)
          return {
            user_id: v.user_id,
            full_name: prof?.full_name || 'Inconnu',
            page_path: v.page_path,
            page_label: PATH_LABELS[v.page_path] || v.page_path,
            last_seen: v.created_at,
            active: true,
          }
        })

        setPresenceData(presenceList)
      } catch (err) {
        console.error('Presence fetch error:', err)
      }
    }
    loadPresence()
    const interval = setInterval(loadPresence, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) {
        const saved = JSON.parse(s)
        // Ajouter les nouveaux widgets manquants
        const missing = DEFAULT_ORDER.filter(id => !saved.includes(id))
        if (missing.length > 0) {
          const updated = [...missing, ...saved]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        }
        return saved
      }
      return DEFAULT_ORDER
    } catch { return DEFAULT_ORDER }
  })
  const dragWidgetRef = useRef(null)
  const dragOverRef = useRef(null)

  function onDragStart(id) { dragWidgetRef.current = id }
  function onDragOverWidget(e, id) { e.preventDefault(); dragOverRef.current = id }
  function onDropWidget() {
    if (!dragWidgetRef.current || !dragOverRef.current || dragWidgetRef.current === dragOverRef.current) return
    setWidgetOrder(prev => {
      const arr = [...prev]
      const from = arr.indexOf(dragWidgetRef.current)
      const to = arr.indexOf(dragOverRef.current)
      if (from === -1 || to === -1) return prev
      arr.splice(from, 1); arr.splice(to, 0, dragWidgetRef.current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
      return arr
    })
    dragWidgetRef.current = null; dragOverRef.current = null
  }
  function resetLayout() { localStorage.removeItem(STORAGE_KEY); setWidgetOrder(DEFAULT_ORDER) }

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
        // Pre-fetch projet IDs for societe to filter kanban_tasks
        let socProjetIds = null
        if (socId) {
          const { data: socProjets } = await safeQuery(() =>
            supabase.from('projets').select('id').eq('societe_id', socId)
          )
          socProjetIds = (socProjets || []).map(p => p.id)
        }

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
          activityLogRes,
          projetsActifsCountRes,
        ] = await Promise.all([
          // 1. Mes taches
          safeQuery(() => {
            let q = supabase.from('kanban_tasks').select('*').eq('assigned_to', user.id).order('priority', { ascending: true }).order('due_date', { ascending: true }).limit(6)
            if (socProjetIds) q = q.in('projet_id', socProjetIds)
            return q
          }),
          // 2. Mon temps (this week)
          safeQuery(() => {
            let q = supabase.from('saisies_temps').select('*').eq('user_id', user.id).gte('date', monday).lte('date', sunday)
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // 3. Alertes - factures overdue
          safeQuery(() => {
            let q = supabase.from('factures').select('id', { count: 'exact', head: true }).lt('date_echeance', today).neq('statut', 'payee')
            if (socId) q = q.eq('societe_id', socId)
            return q
          }),
          // Alertes - tasks overdue
          safeQuery(() => {
            let q = supabase.from('kanban_tasks').select('id', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'done')
            if (socProjetIds) q = q.in('projet_id', socProjetIds)
            return q
          }),
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
          safeQuery(() => {
            let q = supabase.from('kanban_tasks').select('id, title, projet_id, created_at').order('created_at', { ascending: false }).limit(5)
            if (socProjetIds) q = q.in('projet_id', socProjetIds)
            return q
          }),
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
          // Activity log (déplacements kanban)
          safeQuery(() => {
            let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10)
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
          activityLog: activityLogRes?.data || [],
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
    // Activity log (déplacements kanban etc.)
    for (const a of (raw.activityLog || [])) {
      const typeMap = { task: 'task', transaction: 'transaction' }
      const link = a.entity_type === 'transaction' ? `/crm/leads` : a.entity_type === 'task' ? `/activite/projets` : null
      items.push({
        type: typeMap[a.entity_type] || 'action',
        icon: a.icon || '🔀',
        label: a.action === 'move'
          ? `${a.entity_type === 'transaction' ? 'Opportunite' : 'Tache'} "${a.entity_name}" deplacee : ${a.details}`
          : `${a.entity_name} : ${a.details || a.action}`,
        date: a.created_at,
        link,
      })
    }
    for (const t of (raw.recentTasks || [])) {
      items.push({ type: 'task', icon: '✅', label: `Tache creee : ${t.title}`, date: t.created_at, link: t.projet_id ? `/activite/projets/${t.projet_id}/taches/${t.id}` : null })
    }
    for (const d of (raw.recentDocs || [])) {
      items.push({ type: 'doc', icon: '📄', label: `Document ajoute : ${d.nom || 'Sans nom'}`, date: d.created_at, link: '/documents/archives' })
    }
    for (const c of (raw.recentContacts || [])) {
      items.push({ type: 'contact', icon: '👤', label: `Contact cree : ${[c.prenom, c.nom].filter(Boolean).join(' ') || 'Inconnu'}`, date: c.created_at, link: `/crm/contacts/${c.id}` })
    }
    // Dédupliquer par date+label et trier
    const seen = new Set()
    const unique = items.filter(i => { const k = `${i.date}-${i.label}`; if (seen.has(k)) return false; seen.add(k); return true })
    return unique.sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1).slice(0, 10)
  }, [raw.recentTasks, raw.recentDocs, raw.recentContacts, raw.activityLog])

  // Classement utilisation plateforme
  const [leaderboard, setLeaderboard] = useState([])
  useEffect(() => {
    if (!user) return
    const socId = selectedSociete?.id
    async function loadLeaderboard() {
      try {
        // Compter les page_views par user ces 7 derniers jours
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        let q = supabase.from('page_views').select('user_id, created_at').gte('created_at', weekAgo)
        const { data: views } = await q
        if (!views) return
        // Agréger par user
        const counts = {}
        for (const v of views) {
          counts[v.user_id] = (counts[v.user_id] || 0) + 1
        }
        // Récupérer les noms
        const userIds = Object.keys(counts)
        if (userIds.length === 0) return
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
        const board = userIds.map(uid => {
          const p = (profiles || []).find(pr => pr.id === uid)
          const name = p?.full_name || 'Utilisateur'
          const parts = name.split(' ')
          const initials = parts.map(p => p[0] || '').join('').toUpperCase().slice(0, 2)
          return { uid, name, initials, count: counts[uid], isMe: uid === user.id }
        }).sort((a, b) => b.count - a.count).slice(0, 6)
        setLeaderboard(board)
      } catch {}
    }
    loadLeaderboard()
  }, [user?.id, selectedSociete?.id])

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
      <div className="admin-page admin-page--full" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)', color: 'var(--text-muted)'
      }}>
        <div style={{
          width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2B4C7E',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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

  // ── Widget map ──
  const widgetMap = {
    score: (
      <>
        <SectionHeader icon="🏅" title="Top utilisateurs cette semaine" />
        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Pas encore de donnees cette semaine
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {leaderboard.map((u, i) => {
              const medals = ['🥇', '🥈', '🥉']
              const maxCount = leaderboard[0]?.count || 1
              const pct = Math.round((u.count / maxCount) * 100)
              return (
                <div key={u.uid} style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  padding: '.5rem .6rem', borderRadius: 8,
                  background: u.isMe ? 'var(--primary, #2B4C7E)' + '0A' : 'var(--surface, #f8fafc)',
                  border: u.isMe ? '1px solid var(--primary, #2B4C7E)' + '25' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{i < 3 ? medals[i] : `${i + 1}.`}</span>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: u.isMe ? 'var(--primary, #2B4C7E)' : '#e2e8f0', color: u.isMe ? '#fff' : '#475569',
                    fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
                  }}>{u.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: '.8rem', fontWeight: u.isMe ? 700 : 600, color: 'var(--text)' }}>
                        {u.name} {u.isMe && <span style={{ fontSize: '.65rem', color: 'var(--primary)', fontWeight: 500 }}>(vous)</span>}
                      </span>
                      <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{u.count} pages</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--border, #e2e8f0)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#c2875a' : 'var(--primary, #2B4C7E)', transition: 'width .6s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    ),

    tasks: (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <SectionHeader icon="📋" title="Mes Taches" linkLabel="Voir tout →" onLink={() => navigate('/activite/projets')} />
          {(() => {
            const doneCount = myTasks.filter(t => t.status === 'done' || t.status === 'termine').length
            const totalCount = myTasks.length
            const donePct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
            return totalCount > 0 ? (
              <DonutChart size={44} stroke={4} pct={donePct} color="#16a34a" />
            ) : null
          })()}
        </div>
        {myTasks.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
            Aucune tache assignee
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {myTasks.map(t => {
              const overdue = t.due_date && t.due_date < todayStr && t.status !== 'done' && t.status !== 'termine'
              return (
                <div key={t.id} onClick={() => navigate(`/activite/projets/${t.projet_id}/taches/${t.id}`)} style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.5rem .75rem', borderRadius: 8,
                  background: overdue ? '#fef2f2' : 'var(--surface, #f8fafc)',
                  border: overdue ? '1px solid #fecaca' : '1px solid transparent',
                  fontSize: '.85rem', cursor: 'pointer', transition: 'background .15s',
                }} onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
                   onMouseLeave={e => e.currentTarget.style.background = overdue ? '#fef2f2' : 'var(--surface, #f8fafc)'}>
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
      </>
    ),

    time: (
      <>
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
      </>
    ),

    alerts: (
      <>
        <SectionHeader icon="🔔" title="Alertes" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {[
            { icon: '🧾', count: raw.facturesOverdueCount || 0, label: 'Factures impayees', color: '#ef4444', severity: 'red', link: '/finance/facturation' },
            { icon: '⏰', count: raw.tasksOverdueCount || 0, label: 'Taches en retard', color: '#ef4444', severity: 'red', link: '/activite/projets' },
            { icon: '🏖', count: raw.absencesPendingCount || 0, label: 'Absences a valider', color: '#f59e0b', severity: 'orange', link: '/activite/equipe' },
            { icon: '💳', count: raw.notesFraisPendingCount || 0, label: 'Notes de frais a valider', color: '#f59e0b', severity: 'orange', link: '/activite/equipe' },
          ].map((alert, i) => (
            <div key={i} onClick={() => alert.link && navigate(alert.link)} style={{
              display: 'flex', alignItems: 'center', gap: '.75rem',
              padding: '.6rem .75rem', borderRadius: 8,
              background: alert.count > 0 ? alert.color + '08' : 'var(--surface, #f8fafc)',
              borderLeft: `4px solid ${alert.count > 0 ? alert.color : 'transparent'}`,
              cursor: alert.link ? 'pointer' : 'default',
              transition: 'all .15s',
              animation: alert.count > 0 && alert.severity === 'red' ? 'dashPulse 2s ease-in-out infinite' : 'none',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{alert.icon}</span>
              <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text)' }}>{alert.label}</span>
              <span style={{
                fontWeight: 700, fontSize: '.9rem',
                color: alert.count > 0 ? '#fff' : 'var(--text-muted)',
                background: alert.count > 0 ? alert.color : 'transparent',
                borderRadius: 10, padding: alert.count > 0 ? '1px 8px' : 0,
                minWidth: 24, textAlign: 'center',
              }}>{alert.count}</span>
            </div>
          ))}
        </div>
      </>
    ),

    projects: (
      <>
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
              const barColor = pct > 90 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#16a34a'
              return (
                <div key={p.id} onClick={() => navigate(`/activite/projets/${p.id}`)} style={{ cursor: 'pointer', padding: '.4rem .5rem', borderRadius: 8, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{p.nom || p.name}</span>
                      {p.societe_name && (
                        <span style={{
                          fontSize: '.65rem', padding: '1px 6px', borderRadius: 4,
                          background: 'var(--primary, #1a5c82)' + '15', color: 'var(--primary, #1a5c82)',
                          fontWeight: 600, whiteSpace: 'nowrap',
                        }}>{p.societe_name}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{tc.done}/{tc.total} taches ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border, #e2e8f0)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width .5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    ),

    treasury: (() => {
      // Projection cumulée sur 12 mois (3 scénarios)
      const SCENARIO_COLORS = { optimiste: '#16a34a', realiste: '#2d8bc9', pessimiste: '#ef4444' }
      const SCENARIO_FACTORS = { optimiste: 1.15, realiste: 1.0, pessimiste: 0.85 }
      const avgEnc = encaissements30 || 15000
      const avgDec = decaissements30 || 10000
      const balance = soldeEstime || 50000
      const projectionData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() + i)
        const label = d.toLocaleDateString('fr-FR', { month: 'short' })
        const res = { label }
        for (const [sc, factor] of Object.entries(SCENARIO_FACTORS)) {
          const enc = avgEnc * factor * (1 + (Math.random() - 0.5) * 0.1)
          const dec = avgDec * (2 - factor) * (1 + (Math.random() - 0.5) * 0.1)
          res[sc] = Math.round(balance + (enc - dec) * (i + 1))
        }
        return res
      })
      return (
        <>
          <SectionHeader icon="💰" title="Projection tresorerie" linkLabel="Voir detail →" onLink={() => navigate('/finance/previsionnel')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '.75rem' }}>
            <div style={{ textAlign: 'center', padding: '.4rem', borderRadius: 8, background: '#f0fdf4' }}>
              <div style={{ fontSize: '.65rem', color: '#16a34a' }}>Encaissements 30j</div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#16a34a' }}>{fmtE(encaissements30)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '.4rem', borderRadius: 8, background: '#fef2f2' }}>
              <div style={{ fontSize: '.65rem', color: '#ef4444' }}>Decaissements 30j</div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#ef4444' }}>{fmtE(decaissements30)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '.4rem', borderRadius: 8, background: '#eff6ff' }}>
              <div style={{ fontSize: '.65rem', color: 'var(--primary)' }}>Solde estime</div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: soldeEstime >= 0 ? '#16a34a' : '#ef4444' }}>{fmtE(soldeEstime)}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGradOpt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashGradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d8bc9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2d8bc9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashGradPess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
              <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={9} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={35} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, name) => [fmtE(v), name === 'optimiste' ? 'Optimiste' : name === 'realiste' ? 'Realiste' : 'Pessimiste']}
                contentStyle={{ fontSize: '.8rem', borderRadius: 8, border: '1px solid var(--border)' }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
              <Area type="monotone" dataKey="optimiste" stroke="#16a34a" fill="url(#dashGradOpt)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="realiste" stroke="#2d8bc9" fill="url(#dashGradReal)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="pessimiste" stroke="#ef4444" fill="url(#dashGradPess)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '.4rem', fontSize: '.7rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#16a34a', borderRadius: 2, display: 'inline-block' }} /> Optimiste</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#2d8bc9', borderRadius: 2, display: 'inline-block' }} /> Realiste</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} /> Pessimiste</span>
          </div>
        </>
      )
    })(),

    marketing: (
      <>
        <SectionHeader icon="📣" title="Marketing" linkLabel="Voir campagnes →" onLink={() => navigate('/marketing/campagnes')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '1rem' }}>
          <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Campagnes actives</div>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>{campagnesActives}</div>
          </div>
          <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Leads ce mois</div>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>{raw.leadsCount || 0}</div>
          </div>
          <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Pipeline total</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{fmtE(pipelineTotal)}</div>
          </div>
          <div className="achat-kpi-chip" style={{ textAlign: 'center', padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Taux conversion</div>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', color: tauxConversion >= 20 ? '#16a34a' : '#f59e0b' }}>{tauxConversion}%</div>
          </div>
        </div>
        {(() => {
          const allLeads = raw.leadsPipeline || []
          const stages = [
            { label: 'Leads', count: allLeads.length, color: '#2d8bc9' },
            { label: 'Qualifies', count: allLeads.filter(l => l.statut === 'qualifie' || l.statut === 'proposition' || l.statut === 'gagne' || l.statut === 'converti').length, color: '#0ea5e9' },
            { label: 'Proposition', count: allLeads.filter(l => l.statut === 'proposition' || l.statut === 'gagne' || l.statut === 'converti').length, color: '#10b981' },
            { label: 'Gagne', count: allLeads.filter(l => l.statut === 'gagne' || l.statut === 'converti').length, color: '#16a34a' },
          ]
          const maxCount = Math.max(1, stages[0].count)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stages.map((s, i) => {
                const widthPct = Math.max(18, (s.count / maxCount) * 100)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', width: 62, textAlign: 'right' }}>{s.label}</span>
                    <div style={{
                      height: 22, width: `${widthPct}%`, borderRadius: 4,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '.7rem', fontWeight: 700,
                      transition: 'width .5s ease',
                    }}>{s.count}</div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </>
    ),

    documents: (
      <>
        <SectionHeader icon="📄" title="Derniers Documents" linkLabel="Voir archives →" onLink={() => navigate('/documents/archives')} />
        {(raw.documents || []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
            Aucun document recent
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {(raw.documents || []).map(d => {
              const typeColors = { facture: '#ef4444', devis: '#f59e0b', contrat: '#8b5cf6', autre: '#64748b' }
              const tColor = typeColors[d.type] || '#64748b'
              return (
                <div key={d.id} onClick={() => navigate('/documents/archives')} style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  padding: '.5rem .75rem', borderRadius: 8,
                  background: 'var(--surface, #f8fafc)',
                  fontSize: '.85rem',
                  transition: 'background .15s, transform .15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = tColor + '10'; e.currentTarget.style.transform = 'translateX(3px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface, #f8fafc)'; e.currentTarget.style.transform = 'translateX(0)' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: tColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', flexShrink: 0 }}>
                    {docIcon(d.type)}
                  </div>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                    {d.nom || 'Sans nom'}
                  </span>
                  {d.fournisseur && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{d.fournisseur}</span>}
                  {d.montant_ttc != null && <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text)' }}>{fmtE(d.montant_ttc)}</span>}
                  <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{relativeTime(d.created_at)}</span>
                  {ocrBadge(d.ocr_status)}
                </div>
              )
            })}
          </div>
        )}
      </>
    ),

    presence: (
      <>
        <SectionHeader icon="👁" title="En ligne maintenant" />
        <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
          {presenceData.length}/{allProfiles.length} connectes
        </div>
        {presenceData.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
            Personne en ligne pour le moment
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {presenceData.map((p) => {
              const isMe = p.user_id === user?.id
              const initials = (p.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={p.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  padding: '.5rem .6rem', borderRadius: 8,
                  background: isMe ? 'var(--primary, #2B4C7E)0A' : 'var(--surface, #f8fafc)',
                  border: isMe ? '1px solid var(--primary, #2B4C7E)25' : '1px solid transparent',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isMe ? 'var(--primary, #2B4C7E)' : '#e2e8f0',
                      color: isMe ? '#fff' : '#475569', fontSize: '.65rem', fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%',
                      background: p.active ? '#16a34a' : '#9ca3af',
                      border: '2px solid var(--card-bg, #fff)',
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.full_name}{isMe ? ' (moi)' : ''}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      {p.page_label}
                    </div>
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {relativeTime(p.last_seen)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    ),

    activity: (
      <>
        <SectionHeader icon="🕐" title="Activite Recente" />
        {activityTimeline.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
            Aucune activite recente
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{
              position: 'absolute', left: 9, top: 10, bottom: 10, width: 2,
              background: 'var(--border, #e2e8f0)', borderRadius: 1,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {activityTimeline.map((item, i) => {
                const dotColors = { task: '#16a34a', doc: '#2d8bc9', contact: '#8b5cf6' }
                const dotColor = dotColors[item.type] || '#94a3b8'
                return (
                  <div key={i} onClick={() => item.link && navigate(item.link)} style={{
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                    padding: '.5rem .75rem', borderRadius: 8,
                    background: 'var(--surface, #f8fafc)',
                    fontSize: '.85rem', position: 'relative',
                    cursor: item.link ? 'pointer' : 'default',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (item.link) e.currentTarget.style.background = '#e0f2fe' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface, #f8fafc)'}>
                    <div style={{
                      position: 'absolute', left: -23, top: '50%', transform: 'translateY(-50%)',
                      width: 10, height: 10, borderRadius: '50%', background: dotColor,
                      border: '2px solid var(--card-bg, #fff)',
                    }} />
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', minWidth: 70 }}>{relativeTime(item.date)}</span>
                    <span>{item.icon}</span>
                    <span style={{ color: 'var(--text)' }}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>
    ),

    mood: (
      <>
        <SectionHeader icon="😊" title="Humeur equipe" />
        {/* Mon humeur */}
        <div style={{ marginBottom: '.75rem' }}>
          <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '.4rem' }}>Comment tu te sens ?</div>
          <div style={{ display: 'flex', gap: '.35rem' }}>
            {MOODS.map(m => (
              <button key={m.emoji} onClick={() => submitMood(m)} style={{
                flex: 1, padding: '.4rem', border: myMood?.emoji === m.emoji ? `2px solid ${m.color}` : '2px solid transparent',
                background: myMood?.emoji === m.emoji ? m.color + '15' : 'var(--surface, #f8fafc)',
                borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                <span style={{ fontSize: '.6rem', color: m.color, fontWeight: 600 }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Humeurs équipe */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
          {teamMoods.slice(0, 6).map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '.5rem',
              padding: '.35rem .6rem', borderRadius: 6,
              background: 'var(--surface, #f8fafc)', fontSize: '.82rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{m.emoji}</span>
              <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)' }}>{m.user}</span>
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{relativeTime(m.date)}</span>
            </div>
          ))}
        </div>
      </>
    ),

    shortcuts: (
      <>
        <SectionHeader icon="⚡" title="Raccourcis" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
          {[
            { icon: '➕', label: 'Nouvelle tache', path: '/activite/projets' },
            { icon: '⏱', label: 'Saisir du temps', path: '/activite/saisie' },
            { icon: '🧾', label: 'Nouvelle facture', path: '/finance/facturation' },
            { icon: '👤', label: 'Nouveau contact', path: '/crm/contacts' },
            { icon: '📁', label: 'Nouveau projet', path: '/activite/projets' },
            { icon: '📄', label: 'Importer document', path: '/documents/archives' },
          ].map((s, i) => (
            <button key={i} onClick={() => navigate(s.path)} style={{
              display: 'flex', alignItems: 'center', gap: '.5rem',
              padding: '.6rem .75rem', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)',
              background: 'var(--surface, #f8fafc)', cursor: 'pointer',
              fontSize: '.82rem', fontWeight: 500, color: 'var(--text)',
              transition: 'all .15s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary, #1a5c82)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface, #f8fafc)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}
            >
              <span style={{ fontSize: '1rem' }}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </>
    ),

    goals: (() => {
      const goalsData = [
        {
          icon: '💰',
          label: 'CA facture ce mois',
          current: encaissements30,
          target: 100000,
          format: v => fmtE(v),
          unit: '',
        },
        {
          icon: '👥',
          label: 'Nouveaux contacts CRM',
          current: raw.leadsCount || 0,
          target: 50,
          format: v => `${v}`,
          unit: '/50',
        },
        {
          icon: '⏱️',
          label: 'Heures saisies equipe',
          current: Math.round(totalHeures * 4),
          target: 800,
          format: v => `${v}h`,
          unit: '/800h',
        },
      ]
      return (
        <>
          <SectionHeader icon="🎯" title="Objectifs d'equipe" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {goalsData.map((g, i) => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100))
              const barColor = pct > 75 ? '#16a34a' : pct > 50 ? '#eab308' : '#3b82f6'
              const msg = pct > 80 ? 'Presque ! 💪' : pct > 50 ? 'Bien parti ! 🚀' : null
              return (
                <div key={i} style={{
                  padding: '.75rem', borderRadius: 10,
                  background: 'var(--surface, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 600, fontSize: '.85rem' }}>
                      <span>{g.icon}</span>
                      <span>{g.label}</span>
                    </div>
                    <div style={{ fontSize: '.8rem', fontWeight: 700, color: barColor }}>
                      {pct}%
                    </div>
                  </div>
                  <div style={{
                    width: '100%', height: 10, borderRadius: 5,
                    background: '#e5e7eb', overflow: 'hidden', marginBottom: '.35rem',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 5,
                      background: barColor,
                      transition: 'width .6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      {g.format(g.current)}{g.unit} — reste {g.format(Math.max(0, g.target - g.current))}
                    </span>
                    {msg && (
                      <span style={{ fontSize: '.75rem', fontWeight: 600, color: barColor }}>
                        {msg}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )
    })(),

    feed: (() => {
      const activities = (raw.activityLog || []).slice(0, 5)
      const contacts = raw.recentContacts || []
      const docs = raw.recentDocs || []
      function feedIcon(action) {
        if (action === 'created') return '🆕'
        if (action === 'updated') return '✏️'
        if (action === 'deleted') return '🗑️'
        if (action === 'completed') return '✅'
        return '📌'
      }
      function feedLabel(item) {
        const name = item.entity_name || item.details || 'Element'
        if (item.action === 'created') return `a cree "${name}"`
        if (item.action === 'updated') return `a modifie "${name}"`
        if (item.action === 'deleted') return `a supprime "${name}"`
        if (item.action === 'completed') return `a termine "${name}"`
        return `${item.action || 'action'} sur "${name}"`
      }
      const feedItems = [
        ...activities.map(a => ({
          key: `act-${a.id || a.created_at}`,
          icon: feedIcon(a.action),
          text: feedLabel(a),
          date: a.created_at,
        })),
        ...contacts.slice(0, 2).map(c => ({
          key: `contact-${c.id}`,
          icon: '👤',
          text: `Nouveau contact: ${c.nom || c.full_name || 'Inconnu'}`,
          date: c.created_at,
        })),
        ...docs.slice(0, 2).map(d => ({
          key: `doc-${d.id}`,
          icon: '📄',
          text: `Document: ${d.nom || d.name || 'Sans titre'}`,
          date: d.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

      return (
        <>
          <SectionHeader icon="💬" title="Fil d'equipe" />
          {feedItems.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
              Aucune activite recente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {feedItems.map(item => {
                const reactions = feedReactions[item.key] || {}
                return (
                  <div key={item.key} style={{
                    padding: '.6rem .75rem', borderRadius: 10,
                    background: 'var(--surface, #f8fafc)',
                    border: '1px solid var(--border, #e2e8f0)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                      <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text)' }}>{item.text}</span>
                      <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{relativeTime(item.date)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '.3rem', paddingLeft: '1.5rem' }}>
                      {FEED_EMOJIS.map(emoji => {
                        const count = reactions[emoji] || 0
                        const active = count > 0
                        return (
                          <button key={emoji} onClick={() => toggleFeedReaction(item.key, emoji)} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '.15rem .45rem', borderRadius: 20,
                            border: active ? '1px solid var(--primary, #1a5c82)' : '1px solid var(--border, #e2e8f0)',
                            background: active ? 'var(--primary, #1a5c82)' + '12' : 'transparent',
                            cursor: 'pointer', fontSize: '.78rem', transition: 'all .15s',
                          }}>
                            <span>{emoji}</span>
                            {count > 0 && <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--primary, #1a5c82)' }}>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )
    })(),
  }

  return (
    <div className="admin-page admin-page--full" style={{ padding: 0 }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary, #1a5c82) 0%, #2d8bc9 60%, #56b4e8 100%)',
        borderRadius: 16, padding: '1.5rem 2rem', color: '#fff', marginBottom: '1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
            Bonjour, {prenom} 👋
          </h1>
          <p style={{ margin: '.25rem 0 0', color: 'rgba(255,255,255,.8)', fontSize: '.9rem' }}>
            {todayLabel}{selectedSociete ? ` · ${selectedSociete.name}` : ''}
          </p>
          <p style={{ margin: '.35rem 0 0', fontSize: '.85rem', color: 'rgba(255,255,255,.7)' }}>
            {headerSubtitle}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <DonutChart size={72} stroke={6} pct={tauxOccupation} color="#fff" trackColor="rgba(255,255,255,.25)"
            label={`${totalHeures.toFixed(0)}h`} />
          <div style={{ fontSize: '.7rem', marginTop: 4, color: 'rgba(255,255,255,.7)' }}>Semaine</div>
        </div>
      </div>

      {/* ═══ Reset button ═══ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.5rem' }}>
        <button onClick={resetLayout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: 'var(--text-muted)' }}>
          🔄 Reinitialiser
        </button>
      </div>

      {/* ═══ DRAGGABLE WIDGETS GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {widgetOrder.map(id => {
          const content = widgetMap[id]
          if (!content) return null
          return (
            <div key={id} draggable
              onDragStart={() => onDragStart(id)}
              onDragOver={e => { e.preventDefault(); onDragOverWidget(e, id) }}
              onDrop={e => { e.preventDefault(); onDropWidget() }}
              className="dash-card" style={{
                ...cardStyle, position: 'relative', cursor: 'default',
                gridColumn: id === 'activity' ? '1 / -1' : undefined,
              }}>
              {/* Grip visuel — visible uniquement au hover */}
              <div className="dash-grip" style={{
                position: 'absolute', top: 6, left: 8, zIndex: 2,
                display: 'grid', gridTemplateColumns: '5px 5px', gap: 3,
                cursor: 'grab', padding: 2, borderRadius: 4,
                opacity: 0, transition: 'opacity .2s',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#94a3b8' }} />
              </div>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
