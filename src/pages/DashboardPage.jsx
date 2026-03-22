import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { DEMO_USERS, DEMO_TEAM_SAISIES, DEMO_PROJETS, DEMO_TRANSACTIONS } from '../data/demoData'
import { supabase } from '../lib/supabase'

// ── Calendar constants ────────────────────────────────────────
const START_H = 8
const END_H = 19
const HOUR_H = 52
const TOTAL_H = (END_H - START_H) * HOUR_H
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

const USER_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
]

function getMon(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0, 10) }
function fmtDay(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }

function hhmm2y(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return ((h - START_H) * 60 + m) / 60 * HOUR_H
}
function hhmm2height(hhmm1, hhmm2) {
  const [h1, m1] = hhmm1.split(':').map(Number)
  const [h2, m2] = hhmm2.split(':').map(Number)
  return Math.max(18, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60 * HOUR_H)
}

// ── Layout: répartit les événements qui se chevauchent en colonnes ──
function layoutEvents(events) {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => a.h_debut.localeCompare(b.h_debut))
  const result = sorted.map(e => ({ ...e, col: 0, cols: 1 }))
  let i = 0
  while (i < result.length) {
    let clusterEnd = result[i].h_fin
    let j = i + 1
    while (j < result.length && result[j].h_debut < clusterEnd) {
      if (result[j].h_fin > clusterEnd) clusterEnd = result[j].h_fin
      j++
    }
    const clusterSize = j - i
    for (let k = i; k < j; k++) {
      result[k].col = k - i
      result[k].cols = clusterSize
    }
    i = j
  }
  return result
}

// ── KPI helpers ───────────────────────────────────────────────
function fmtEuros(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M€'
  if (n >= 1_000)     return Math.round(n / 1_000) + ' k€'
  return n + ' €'
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const firstName = profile?.full_name?.split(' ')[0] || 'vous'

  const [monday, setMonday] = useState(() => getMon(new Date()))
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [saisies, setSaisies] = useState([])

  // KPI state (real mode)
  const [kpiProjetsActifs, setKpiProjetsActifs] = useState(null)
  const [kpiPipeline, setKpiPipeline] = useState(null)
  const [kpiAllUsers, setKpiAllUsers] = useState([])
  const [kpiWeekSaisies, setKpiWeekSaisies] = useState([])

  // Load users
  useEffect(() => {
    if (isDemoMode) {
      setUsers(DEMO_USERS)
      setSelectedUsers(DEMO_USERS.map(u => u.id))
    } else {
      supabase.from('profiles').select('id, full_name, role').then(({ data }) => {
        if (data) {
          setUsers(data)
          setSelectedUsers(data.map(u => u.id))
          setKpiAllUsers(data)
        }
      })
    }
  }, [isDemoMode])

  // Load saisies for the displayed week
  useEffect(() => {
    const from = toISO(monday)
    const to = toISO(addDays(monday, 6))
    if (isDemoMode) {
      setSaisies(DEMO_TEAM_SAISIES.filter(s => s.date >= from && s.date <= to))
    } else {
      supabase.from('saisies_temps')
        .select('id, user_id, date, heures, commentaire')
        .gte('date', from)
        .lte('date', to)
        .then(({ data }) => setSaisies(data || []))
    }
  }, [isDemoMode, monday])

  // Load KPI data for current week (real mode)
  useEffect(() => {
    if (isDemoMode) return
    const curMonday = getMon(new Date())
    const from = toISO(curMonday)
    const to = toISO(addDays(curMonday, 6))
    // Heures équipe cette semaine
    supabase.from('saisies_temps')
      .select('heures')
      .gte('date', from)
      .lte('date', to)
      .then(({ data }) => setKpiWeekSaisies(data || []))
    // Projets actifs
    supabase.from('projets').select('id', { count: 'exact' }).eq('statut', 'actif')
      .then(({ count }) => setKpiProjetsActifs(count || 0))
    // Pipeline commercial
    supabase.from('transactions').select('montant, phase')
      .then(({ data }) => {
        if (data) {
          const total = data
            .filter(t => t.phase !== 'perdu' && t.phase !== 'ferme')
            .reduce((sum, t) => sum + (t.montant || 0), 0)
          setKpiPipeline(total)
        }
      })
  }, [isDemoMode])

  function toggleUser(id) {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const colorByUser = useMemo(() => {
    const map = {}
    users.forEach((u, i) => { map[u.id] = USER_COLORS[i % USER_COLORS.length] })
    return map
  }, [users])

  const byDate = useMemo(() => {
    const map = {}
    for (let i = 0; i < 5; i++) {
      const iso = toISO(addDays(monday, i))
      map[iso] = saisies
        .filter(s => selectedUsers.includes(s.user_id) && s.date === iso)
        .map(s => {
          try {
            const c = JSON.parse(s.commentaire || '{}')
            if (!c.h_debut || !c.h_fin) return null
            return { ...s, h_debut: c.h_debut, h_fin: c.h_fin, projet_name: c.projet_name, note: c.note }
          } catch { return null }
        })
        .filter(Boolean)
    }
    return map
  }, [saisies, selectedUsers, monday])

  // ── KPI computed values ───────────────────────────────────
  const kpis = useMemo(() => {
    const curMonday = getMon(new Date())
    const from = toISO(curMonday)
    const to = toISO(addDays(curMonday, 6))

    if (isDemoMode) {
      const weekSaisies = DEMO_TEAM_SAISIES.filter(s => s.date >= from && s.date <= to)
      const totalHeures = Math.round(weekSaisies.reduce((sum, s) => sum + (s.heures || 0), 0) * 10) / 10
      const nbUsers = DEMO_USERS.length
      const tauxOcc = Math.round(totalHeures / (40 * nbUsers) * 100)
      const projetsActifs = DEMO_PROJETS.filter(p => p.statut === 'actif').length
      const pipeline = DEMO_TRANSACTIONS
        .filter(t => t.phase !== 'perdu' && t.phase !== 'ferme')
        .reduce((sum, t) => sum + (t.montant || 0), 0)
      return { totalHeures, tauxOcc, projetsActifs, pipeline }
    } else {
      const totalHeures = Math.round(kpiWeekSaisies.reduce((sum, s) => sum + (s.heures || 0), 0) * 10) / 10
      const nbUsers = kpiAllUsers.length || 1
      const tauxOcc = Math.round(totalHeures / (40 * nbUsers) * 100)
      return {
        totalHeures,
        tauxOcc,
        projetsActifs: kpiProjetsActifs,
        pipeline: kpiPipeline,
      }
    }
  }, [isDemoMode, kpiWeekSaisies, kpiAllUsers, kpiProjetsActifs, kpiPipeline])

  const todayISO = toISO(new Date())
  const isCurrentWeek = toISO(monday) === toISO(getMon(new Date()))

  return (
    <div className="home-page">
      {/* Hero */}
      <div className="home-hero">
        <h1 className="home-hero-title"><span style={{ marginRight: '.5rem' }}>⚙️</span>Bonjour, {firstName}</h1>
        <p className="home-hero-sub">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Heures équipe / semaine</div>
          <div className="kpi-value">{kpis.totalHeures}h</div>
          <div className="kpi-sub">semaine en cours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Taux d'occupation</div>
          <div className="kpi-value">{kpis.tauxOcc}%</div>
          <div className="kpi-sub">base 40h / pers.</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Projets actifs</div>
          <div className="kpi-value">
            {kpis.projetsActifs === null ? '—' : kpis.projetsActifs}
          </div>
          <div className="kpi-sub">en cours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pipeline commercial</div>
          <div className="kpi-value">
            {kpis.pipeline === null ? '—' : fmtEuros(kpis.pipeline)}
          </div>
          <div className="kpi-sub">hors perdus / fermés</div>
        </div>
      </div>

      {/* ── Team planning ────────────────────────────────────── */}
      <div className="planning-section">
        <div className="planning-header">
          <h2 className="planning-title">Planning équipe</h2>
          <div className="planning-nav">
            <button className="btn-icon" onClick={() => setMonday(d => addDays(d, -7))} title="Semaine précédente">◀</button>
            <span className="planning-week-label">
              Sem. du {fmtDay(monday)} au {fmtDay(addDays(monday, 4))}
            </span>
            <button className="btn-icon" onClick={() => setMonday(d => addDays(d, 7))} title="Semaine suivante">▶</button>
            {!isCurrentWeek && (
              <button className="btn-secondary btn-sm" onClick={() => setMonday(getMon(new Date()))}>Aujourd'hui</button>
            )}
          </div>
        </div>

        {/* Collaborateur chips */}
        <div className="planning-users">
          {users.map((u, i) => {
            const c = USER_COLORS[i % USER_COLORS.length]
            const active = selectedUsers.includes(u.id)
            return (
              <button
                key={u.id}
                className="planning-user-chip"
                style={{
                  background: active ? c.bg : 'var(--surface)',
                  borderColor: active ? c.border : 'var(--border)',
                  color: active ? c.text : 'var(--text-muted)',
                }}
                onClick={() => toggleUser(u.id)}
              >
                <span className="planning-user-dot" style={{ background: active ? c.border : 'var(--border)' }} />
                {u.full_name.split(' ')[0]}
              </button>
            )
          })}
        </div>

        {/* Calendar grid */}
        <div className="planning-cal-wrap">
          <div className="planning-cal">

            {/* Day headers */}
            <div className="planning-cal-head">
              <div className="planning-cal-head-gutter" />
              {DAYS_FR.map((d, i) => {
                const date = addDays(monday, i)
                const iso = toISO(date)
                return (
                  <div key={d} className={`planning-cal-day-header ${iso === todayISO ? 'planning-cal-day-header--today' : ''}`}>
                    <span className="planning-cal-day-name">{d}</span>
                    <span className="planning-cal-day-num">{fmtDay(date)}</span>
                  </div>
                )
              })}
            </div>

            {/* Body: time gutter + day columns */}
            <div className="planning-cal-body">
              <div className="planning-cal-gutter" style={{ height: TOTAL_H }}>
                {Array.from({ length: END_H - START_H }, (_, i) => (
                  <div key={i} className="planning-cal-hour-label" style={{ top: i * HOUR_H }}>
                    {String(START_H + i).padStart(2, '0')}h
                  </div>
                ))}
              </div>

              {DAYS_FR.map((_, i) => {
                const iso = toISO(addDays(monday, i))
                const events = layoutEvents(byDate[iso] || [])
                const isToday = iso === todayISO
                return (
                  <div key={i} className={`planning-cal-col ${isToday ? 'planning-cal-col--today' : ''}`} style={{ height: TOTAL_H }}>
                    {Array.from({ length: END_H - START_H }, (_, h) => (
                      <div key={h} className="planning-cal-hline" style={{ top: h * HOUR_H }} />
                    ))}
                    {events.map(s => {
                      const c = colorByUser[s.user_id] || USER_COLORS[0]
                      const top = hhmm2y(s.h_debut)
                      const height = hhmm2height(s.h_debut, s.h_fin)
                      const userName = users.find(u => u.id === s.user_id)?.full_name?.split(' ')[0] || ''
                      const pct = 100 / s.cols
                      return (
                        <div
                          key={s.id}
                          className="planning-cal-event"
                          style={{
                            top, height,
                            left: `${s.col * pct}%`,
                            width: `calc(${pct}% - 2px)`,
                            background: c.bg, borderLeftColor: c.border, color: c.text,
                          }}
                          title={`${userName} — ${s.projet_name}\n${s.h_debut}–${s.h_fin}${s.note ? '\n' + s.note : ''}`}
                        >
                          <span className="planning-cal-event-user">{userName}</span>
                          {height > 30 && <span className="planning-cal-event-proj">{s.projet_name}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
