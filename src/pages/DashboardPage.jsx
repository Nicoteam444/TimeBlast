import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { useSociete } from '../contexts/SocieteContext'
import { DEMO_USERS, DEMO_TEAM_SAISIES, DEMO_PROJETS, DEMO_TRANSACTIONS } from '../data/demoData'
import { supabase } from '../lib/supabase'

// ── Calendar helpers ──────────────────────────────────────
const START_H = 8, END_H = 19, HOUR_H = 52
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
  const date = new Date(d); const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1)); date.setHours(0,0,0,0); return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0,10) }
function fmtDay(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }
function hhmm2y(hhmm) { const [h,m]=hhmm.split(':').map(Number); return ((h-START_H)*60+m)/60*HOUR_H }
function hhmm2height(a, b) {
  const [h1,m1]=a.split(':').map(Number), [h2,m2]=b.split(':').map(Number)
  return Math.max(18, ((h2*60+m2)-(h1*60+m1))/60*HOUR_H)
}
function layoutEvents(events) {
  if (!events.length) return []
  const sorted = [...events].sort((a,b) => a.h_debut.localeCompare(b.h_debut))
  const result = sorted.map(e => ({ ...e, col:0, cols:1 }))
  let i = 0
  while (i < result.length) {
    let end = result[i].h_fin, j = i+1
    while (j < result.length && result[j].h_debut < end) { if (result[j].h_fin > end) end = result[j].h_fin; j++ }
    for (let k = i; k < j; k++) { result[k].col = k-i; result[k].cols = j-i }
    i = j
  }
  return result
}

// ── Formatters ────────────────────────────────────────────
function fmtEuros(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace('.',',') + ' M€'
  if (n >= 1_000) return Math.round(n/1_000) + ' k€'
  return Math.round(n) + ' €'
}
function fmtNum(n) { return n === null || n === undefined ? '—' : String(n) }

// ── Phase / Statut meta ───────────────────────────────────
const PHASE_META = {
  prospection:    { label: 'Prospection',    color: '#94a3b8' },
  qualification:  { label: 'Qualification',  color: '#3b82f6' },
  short_list:     { label: 'Short list',     color: '#f59e0b' },
  ferme_a_gagner: { label: 'Ferme à gagner', color: '#22c55e' },
  ferme:          { label: 'Fermé',          color: '#6366f1' },
  perdu:          { label: 'Perdu',          color: '#ef4444' },
}
const STATUT_META = {
  brouillon: { label: 'Brouillon',  color: '#94a3b8', bg: '#f1f5f9' },
  envoyee:   { label: 'Envoyée',    color: '#f59e0b', bg: '#fffbeb' },
  payee:     { label: 'Payée',      color: '#22c55e', bg: '#f0fdf4' },
  retard:    { label: 'En retard',  color: '#ef4444', bg: '#fef2f2' },
}

// ── Mini bar chart ────────────────────────────────────────
function BarChart({ data, days, monday }) {
  const max = Math.max(...Object.values(data), 8)
  return (
    <div className="dash-barchart">
      {days.map((d, i) => {
        const iso = toISO(addDays(monday, i))
        const h = data[iso] || 0
        const pct = Math.round(h / max * 100)
        const isToday = iso === toISO(new Date())
        return (
          <div key={i} className="dash-barchart-col">
            <span className="dash-barchart-val">{h > 0 ? h + 'h' : ''}</span>
            <div className="dash-barchart-track">
              <div className="dash-barchart-fill" style={{
                height: pct + '%',
                background: isToday ? 'var(--primary)' : '#93c5fd'
              }} />
            </div>
            <span className={`dash-barchart-day ${isToday ? 'dash-barchart-day--today' : ''}`}>{d}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const { selectedSociete } = useSociete()
  const navigate = useNavigate()
  const firstName = profile?.full_name?.split(' ')[0] || 'vous'
  const now = new Date()
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Calendar state
  const [monday, setMonday] = useState(() => getMon(now))
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [saisies, setSaisies] = useState([])

  // KPI state
  const [kpiAllUsers,     setKpiAllUsers]     = useState([])
  const [kpiWeekSaisies,  setKpiWeekSaisies]  = useState([])
  const [kpiProjetsActifs,setKpiProjetsActifs]= useState(null)
  const [kpiPipeline,     setKpiPipeline]     = useState(null)
  const [kpiEquipe,       setKpiEquipe]       = useState(null)
  const [kpiFactures,     setKpiFactures]     = useState([])
  const [kpiTransPhases,  setKpiTransPhases]  = useState([])
  const [kpiTopTrans,     setKpiTopTrans]     = useState([])

  // Load users
  useEffect(() => {
    if (isDemoMode) {
      setUsers(DEMO_USERS); setSelectedUsers(DEMO_USERS.map(u => u.id)); setKpiAllUsers(DEMO_USERS)
    } else {
      supabase.from('profiles').select('id, full_name, role').then(({ data }) => {
        if (data) { setUsers(data); setSelectedUsers(data.map(u => u.id)); setKpiAllUsers(data) }
      })
    }
  }, [isDemoMode])

  // Load saisies for calendar
  useEffect(() => {
    const from = toISO(monday), to = toISO(addDays(monday, 6))
    if (isDemoMode) {
      setSaisies(DEMO_TEAM_SAISIES.filter(s => s.date >= from && s.date <= to))
    } else {
      let q = supabase.from('saisies_temps').select('id, user_id, date, heures, commentaire').gte('date', from).lte('date', to)
      if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
      q.then(({ data }) => setSaisies(data || []))
    }
  }, [isDemoMode, monday, selectedSociete?.id])

  // Load KPI data
  useEffect(() => {
    if (isDemoMode) return
    const sid = selectedSociete?.id
    const curMon = getMon(now)
    const from = toISO(curMon), to = toISO(addDays(curMon, 6))

    // Heures semaine courante (avec date pour le bar chart)
    let q1 = supabase.from('saisies_temps').select('heures, date').gte('date', from).lte('date', to)
    if (sid) q1 = q1.eq('societe_id', sid)
    q1.then(({ data }) => setKpiWeekSaisies(data || []))

    // Projets actifs
    let q2 = supabase.from('projets').select('id', { count: 'exact' }).eq('statut', 'actif')
    if (sid) q2 = q2.eq('societe_id', sid)
    q2.then(({ count }) => setKpiProjetsActifs(count || 0))

    // Pipeline commercial
    let q3 = supabase.from('transactions').select('montant, phase, name, clients(name)')
    if (sid) q3 = q3.eq('societe_id', sid)
    q3.then(({ data }) => {
      if (!data) return
      const active = data.filter(t => t.phase !== 'perdu' && t.phase !== 'ferme')
      setKpiPipeline(active.reduce((sum, t) => sum + (t.montant || 0), 0))
      // Par phase
      const phases = {}
      for (const t of data) {
        if (!phases[t.phase]) phases[t.phase] = { montant: 0, count: 0 }
        phases[t.phase].montant += t.montant || 0
        phases[t.phase].count++
      }
      setKpiTransPhases(Object.entries(phases).map(([phase, v]) => ({ phase, ...v })))
      // Top 5 transactions actives
      setKpiTopTrans(active.sort((a,b) => (b.montant||0)-(a.montant||0)).slice(0, 5))
    })

    // Équipe
    let q4 = supabase.from('equipe').select('id', { count: 'exact' })
    if (sid) q4 = q4.eq('societe_id', sid)
    q4.then(({ count }) => setKpiEquipe(count || 0))

    // Factures par statut
    let q5 = supabase.from('factures').select('statut, total_ttc')
    if (sid) q5 = q5.eq('societe_id', sid)
    q5.then(({ data }) => {
      if (!data) return
      const groups = {}
      for (const f of data) {
        if (!groups[f.statut]) groups[f.statut] = { count: 0, total: 0 }
        groups[f.statut].count++
        groups[f.statut].total += f.total_ttc || 0
      }
      setKpiFactures(Object.entries(groups).map(([statut, v]) => ({ statut, ...v })))
    })
  }, [isDemoMode, selectedSociete?.id])

  // ── Computed values ────────────────────────────────────
  const kpis = useMemo(() => {
    const curMon = getMon(now)
    const from = toISO(curMon), to = toISO(addDays(curMon, 6))
    if (isDemoMode) {
      const ws = DEMO_TEAM_SAISIES.filter(s => s.date >= from && s.date <= to)
      const totalH = Math.round(ws.reduce((s, x) => s + (x.heures||0), 0) * 10) / 10
      const projets = DEMO_PROJETS.filter(p => p.statut === 'actif').length
      const pipe = DEMO_TRANSACTIONS.filter(t => t.phase !== 'perdu' && t.phase !== 'ferme').reduce((s,t) => s+(t.montant||0), 0)
      return { totalH, tauxOcc: Math.round(totalH / (40 * DEMO_USERS.length) * 100), projets, pipeline: pipe, equipe: DEMO_USERS.length, caPayee: 0 }
    }
    const totalH = Math.round(kpiWeekSaisies.reduce((s,x) => s+(x.heures||0), 0) * 10) / 10
    const nb = kpiAllUsers.length || 1
    const caPayee = kpiFactures.find(f => f.statut === 'payee')?.total || 0
    return { totalH, tauxOcc: Math.round(totalH / (40*nb) * 100), projets: kpiProjetsActifs, pipeline: kpiPipeline, equipe: kpiEquipe, caPayee }
  }, [isDemoMode, kpiWeekSaisies, kpiAllUsers, kpiProjetsActifs, kpiPipeline, kpiEquipe, kpiFactures])

  const heuresParJour = useMemo(() => {
    const curMon = getMon(now)
    const result = {}
    for (let i = 0; i < 5; i++) {
      const iso = toISO(addDays(curMon, i))
      result[iso] = kpiWeekSaisies.filter(s => s.date === iso).reduce((sum, s) => sum + (s.heures||0), 0)
    }
    return result
  }, [kpiWeekSaisies])

  const colorByUser = useMemo(() => {
    const map = {}; users.forEach((u,i) => { map[u.id] = USER_COLORS[i % USER_COLORS.length] }); return map
  }, [users])

  const byDate = useMemo(() => {
    const map = {}
    for (let i = 0; i < 5; i++) {
      const iso = toISO(addDays(monday, i))
      map[iso] = saisies
        .filter(s => selectedUsers.includes(s.user_id) && s.date === iso)
        .map(s => { try { const c = JSON.parse(s.commentaire||'{}'); if (!c.h_debut||!c.h_fin) return null; return { ...s, h_debut: c.h_debut, h_fin: c.h_fin, projet_name: c.projet_name, note: c.note } } catch { return null } })
        .filter(Boolean)
    }
    return map
  }, [saisies, selectedUsers, monday])

  const todayISO = toISO(now)
  const isCurrentWeek = toISO(monday) === toISO(getMon(now))

  // Max pipeline pour barres proportionnelles
  const maxPipeline = Math.max(...kpiTransPhases.map(p => p.montant), 1)
  const maxFacture  = Math.max(...kpiFactures.map(f => f.total), 1)

  const facturesToShow = ['brouillon','envoyee','payee','retard'].map(s => {
    const found = kpiFactures.find(f => f.statut === s)
    return { statut: s, count: found?.count || 0, total: found?.total || 0 }
  })

  const phasesOrder = ['prospection','qualification','short_list','ferme_a_gagner','ferme','perdu']
  const phasesToShow = phasesOrder
    .map(p => { const found = kpiTransPhases.find(x => x.phase === p); return { phase: p, montant: found?.montant||0, count: found?.count||0 } })
    .filter(p => p.count > 0)

  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <div className="dash-hero">
        <div>
          <h1 className="dash-hero-title">Bonjour, {firstName} 👋</h1>
          <p className="dash-hero-date">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        </div>
        {selectedSociete && (
          <div className="dash-hero-societe">{selectedSociete.name}</div>
        )}
      </div>

      <div className="dash-body">

        {/* ── KPI Row ── */}
        <div className="dash-kpi-row">
          {[
            { icon: '⏱', label: 'Heures semaine',    value: kpis.totalH + 'h',        sub: 'équipe · sem. en cours', link: '/activite/saisie',      color: '#3b82f6' },
            { icon: '📊', label: "Taux d'occupation", value: kpis.tauxOcc + '%',       sub: 'base 40h/pers.',         link: '/activite/equipe',      color: kpis.tauxOcc > 85 ? '#22c55e' : kpis.tauxOcc > 60 ? '#f59e0b' : '#ef4444' },
            { icon: '📁', label: 'Projets actifs',    value: fmtNum(kpis.projets),     sub: 'en cours',               link: '/activite/projets',     color: '#8b5cf6' },
            { icon: '💼', label: 'Pipeline',          value: fmtEuros(kpis.pipeline),  sub: 'hors perdus/fermés',     link: '/commerce/transactions',color: '#f59e0b' },
            { icon: '🧾', label: 'CA encaissé',       value: fmtEuros(kpis.caPayee),   sub: 'factures payées',        link: '/finance/facturation',  color: '#22c55e' },
            { icon: '👥', label: 'Collaborateurs',    value: fmtNum(kpis.equipe),      sub: 'dans l\'équipe',         link: '/activite/equipe',      color: '#06b6d4' },
          ].map((k, i) => (
            <div key={i} className="dash-kpi-card" onClick={() => navigate(k.link)} title={`Aller vers ${k.label}`}>
              <div className="dash-kpi-top">
                <span className="dash-kpi-icon">{k.icon}</span>
                <span className="dash-kpi-label">{k.label}</span>
              </div>
              <div className="dash-kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="dash-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Widgets row ── */}
        <div className="dash-widgets">

          {/* Activité de la semaine */}
          <div className="dash-widget">
            <div className="dash-widget-header">
              <span className="dash-widget-title">⏱ Activité de la semaine</span>
              <span className="dash-widget-total">{kpis.totalH}h saisies</span>
            </div>
            <BarChart data={heuresParJour} days={DAYS_FR} monday={getMon(now)} />
            <div className="dash-widget-footer">
              <span>Taux : <strong style={{ color: kpis.tauxOcc > 80 ? '#22c55e' : '#f59e0b' }}>{kpis.tauxOcc}%</strong></span>
              <button className="dash-widget-link" onClick={() => navigate('/activite/saisie')}>Voir les saisies →</button>
            </div>
          </div>

          {/* Facturation */}
          <div className="dash-widget">
            <div className="dash-widget-header">
              <span className="dash-widget-title">🧾 Facturation</span>
              <button className="dash-widget-link" onClick={() => navigate('/finance/facturation')}>Voir tout →</button>
            </div>
            <div className="dash-widget-list">
              {facturesToShow.map(f => {
                const meta = STATUT_META[f.statut]
                const pct = maxFacture > 0 ? Math.round(f.total / maxFacture * 100) : 0
                return (
                  <div key={f.statut} className="dash-statut-row">
                    <span className="dash-statut-badge" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    <div className="dash-bar-wrap">
                      <div className="dash-bar-fill" style={{ width: pct + '%', background: meta.color + '55' }} />
                    </div>
                    <span className="dash-statut-count">{f.count} fac.</span>
                    <span className="dash-statut-val" style={{ color: meta.color }}>{fmtEuros(f.total)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pipeline commercial */}
          <div className="dash-widget">
            <div className="dash-widget-header">
              <span className="dash-widget-title">💼 Pipeline commercial</span>
              <button className="dash-widget-link" onClick={() => navigate('/commerce/transactions')}>Voir tout →</button>
            </div>
            {phasesToShow.length === 0 ? (
              <div className="dash-widget-empty">Aucune transaction</div>
            ) : (
              <div className="dash-widget-list">
                {phasesToShow.map(p => {
                  const meta = PHASE_META[p.phase] || { label: p.phase, color: '#94a3b8' }
                  const pct = Math.round(p.montant / maxPipeline * 100)
                  return (
                    <div key={p.phase} className="dash-statut-row">
                      <span className="dash-phase-dot" style={{ background: meta.color }} />
                      <span className="dash-phase-label">{meta.label}</span>
                      <div className="dash-bar-wrap">
                        <div className="dash-bar-fill" style={{ width: pct + '%', background: meta.color + '66' }} />
                      </div>
                      <span className="dash-statut-count">{p.count}</span>
                      <span className="dash-statut-val" style={{ color: meta.color }}>{fmtEuros(p.montant)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Planning équipe ── */}
        <div className="planning-section">
          <div className="planning-header">
            <h2 className="planning-title">📅 Planning équipe</h2>
            <div className="planning-nav">
              <button className="btn-icon" onClick={() => setMonday(d => addDays(d, -7))}>◀</button>
              <span className="planning-week-label">Sem. du {fmtDay(monday)} au {fmtDay(addDays(monday, 4))}</span>
              <button className="btn-icon" onClick={() => setMonday(d => addDays(d, 7))}>▶</button>
              {!isCurrentWeek && <button className="btn-secondary btn-sm" onClick={() => setMonday(getMon(now))}>Aujourd'hui</button>}
            </div>
          </div>

          <div className="planning-users">
            {users.map((u, i) => {
              const c = USER_COLORS[i % USER_COLORS.length]
              const active = selectedUsers.includes(u.id)
              return (
                <button key={u.id} className="planning-user-chip"
                  style={{ background: active ? c.bg : 'var(--surface)', borderColor: active ? c.border : 'var(--border)', color: active ? c.text : 'var(--text-muted)' }}
                  onClick={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])}
                >
                  <span className="planning-user-dot" style={{ background: active ? c.border : 'var(--border)' }} />
                  {u.full_name.split(' ')[0]}
                </button>
              )
            })}
          </div>

          <div className="planning-cal-wrap">
            <div className="planning-cal">
              <div className="planning-cal-head">
                <div className="planning-cal-head-gutter" />
                {DAYS_FR.map((d, i) => {
                  const date = addDays(monday, i), iso = toISO(date)
                  return (
                    <div key={d} className={`planning-cal-day-header ${iso === todayISO ? 'planning-cal-day-header--today' : ''}`}>
                      <span className="planning-cal-day-name">{d}</span>
                      <span className="planning-cal-day-num">{fmtDay(date)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="planning-cal-body">
                <div className="planning-cal-gutter" style={{ height: TOTAL_H }}>
                  {Array.from({ length: END_H - START_H }, (_, i) => (
                    <div key={i} className="planning-cal-hour-label" style={{ top: i * HOUR_H }}>{String(START_H+i).padStart(2,'0')}h</div>
                  ))}
                </div>
                {DAYS_FR.map((_, i) => {
                  const iso = toISO(addDays(monday, i))
                  const events = layoutEvents(byDate[iso] || [])
                  const isToday = iso === todayISO
                  return (
                    <div key={i} className={`planning-cal-col ${isToday ? 'planning-cal-col--today' : ''}`} style={{ height: TOTAL_H }}>
                      {Array.from({ length: END_H - START_H }, (_, h) => <div key={h} className="planning-cal-hline" style={{ top: h * HOUR_H }} />)}
                      {events.map(s => {
                        const c = colorByUser[s.user_id] || USER_COLORS[0]
                        const top = hhmm2y(s.h_debut), height = hhmm2height(s.h_debut, s.h_fin)
                        const userName = users.find(u => u.id === s.user_id)?.full_name?.split(' ')[0] || ''
                        const pct = 100 / s.cols
                        return (
                          <div key={s.id} className="planning-cal-event"
                            style={{ top, height, left: `${s.col * pct}%`, width: `calc(${pct}% - 2px)`, background: c.bg, borderLeftColor: c.border, color: c.text }}
                            title={`${userName} — ${s.projet_name}\n${s.h_debut}–${s.h_fin}${s.note ? '\n'+s.note : ''}`}
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
    </div>
  )
}
