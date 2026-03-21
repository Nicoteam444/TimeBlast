import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_USERS, DEMO_PLANNINGS } from '../../data/demoData'

// ── Constantes ────────────────────────────────────────────────
const DAY_W   = 28   // px par jour
const ROW_H   = 48   // px par ligne collaborateur
const MONTH_H = 26   // px header mois
const DAY_H   = 24   // px header jours
const N_MONTHS = 3

// ── Services ─────────────────────────────────────────────────
const SERVICES = [
  { id: 'tous',        label: 'Tous' },
  { id: 'chef_projet', label: 'Chef de projet', color: '#6366f1', bg: '#eef2ff' },
  { id: 'commercial',  label: 'Commercial',     color: '#f59e0b', bg: '#fffbeb' },
  { id: 'technique',   label: 'Technique',      color: '#22c55e', bg: '#f0fdf4' },
  { id: 'fonctionnel', label: 'Fonctionnel',    color: '#8b5cf6', bg: '#f5f3ff' },
]
const SERVICE_MAP = Object.fromEntries(SERVICES.slice(1).map(s => [s.id, s]))

// ── Helpers ───────────────────────────────────────────────────
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addMonths(d, n)  { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function addDays(d, n)    { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d)         { return d.toISOString().slice(0, 10) }
function isWeekend(d)     { const day = d.getDay(); return day === 0 || day === 6 }

function generateDays(start, months) {
  const end = addMonths(start, months)
  const days = []
  let cur = new Date(start)
  while (cur < end) { days.push(new Date(cur)); cur = addDays(cur, 1) }
  return days
}

function groupByMonth(days) {
  const groups = []
  let cur = null
  for (const d of days) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!cur || cur.key !== key) {
      cur = { key, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), count: 0 }
      groups.push(cur)
    }
    cur.count++
  }
  return groups
}

// ── Page principale ───────────────────────────────────────────
export default function PlanificationPage() {
  const { isDemoMode } = useDemo()
  const [serviceFilter, setServiceFilter] = useState('tous')
  const [users, setUsers]       = useState([])
  const [plannings, setPlannings] = useState([])
  const [quarterStart, setQuarterStart] = useState(() => startOfMonth(new Date()))
  const scrollRef = useRef()

  const days        = useMemo(() => generateDays(quarterStart, N_MONTHS), [quarterStart])
  const monthGroups = useMemo(() => groupByMonth(days), [days])
  const totalW      = days.length * DAY_W
  const todayISO    = toISO(new Date())
  const todayIdx    = days.findIndex(d => toISO(d) === todayISO)

  // Charger les utilisateurs
  useEffect(() => {
    if (isDemoMode) {
      setUsers(DEMO_USERS)
    } else {
      supabase.from('profiles').select('id, full_name, role, service')
        .then(({ data, error }) => {
          if (error) {
            supabase.from('profiles').select('id, full_name, role')
              .then(({ data: d2 }) => setUsers(d2 || []))
          } else {
            setUsers(data || [])
          }
        })
    }
  }, [isDemoMode])

  // Charger les plannings
  useEffect(() => {
    const from = toISO(quarterStart)
    const to   = toISO(addMonths(quarterStart, N_MONTHS))
    if (isDemoMode) {
      setPlannings(DEMO_PLANNINGS.filter(p => p.date_fin >= from && p.date_debut <= to))
    } else {
      supabase.from('plannings').select('*')
        .gte('date_fin', from)
        .lte('date_debut', to)
        .then(({ data }) => setPlannings(data || []))
    }
  }, [isDemoMode, quarterStart])

  // Scroll vers aujourd'hui au chargement
  useEffect(() => {
    if (scrollRef.current && todayIdx > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 120)
    }
  }, [todayIdx])

  const filteredUsers = useMemo(() =>
    serviceFilter === 'tous' ? users : users.filter(u => u.service === serviceFilter),
  [users, serviceFilter])

  const planningsByUser = useMemo(() => {
    const map = {}
    for (const u of filteredUsers) map[u.id] = []
    for (const p of plannings) {
      if (map[p.user_id] !== undefined) map[p.user_id].push(p)
    }
    return map
  }, [plannings, filteredUsers])

  const periodLabel = `${quarterStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} — ${addMonths(quarterStart, N_MONTHS - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  const isCurrent   = toISO(quarterStart) === toISO(startOfMonth(new Date()))

  return (
    <div className="admin-page plan-page">
      <div className="admin-page-header">
        <div>
          <h1>Planification</h1>
          <p>{filteredUsers.length} collaborateur{filteredUsers.length > 1 ? 's' : ''} · {periodLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setQuarterStart(d => addMonths(d, -3))}>← Préc.</button>
          {!isCurrent && (
            <button className="btn-secondary" onClick={() => setQuarterStart(startOfMonth(new Date()))}>Aujourd'hui</button>
          )}
          <button className="btn-secondary" onClick={() => setQuarterStart(d => addMonths(d, 3))}>Suiv. →</button>
        </div>
      </div>

      {/* Filtres services */}
      <div className="plan-filter-bar">
        {SERVICES.map(s => {
          const active = serviceFilter === s.id
          const meta   = SERVICE_MAP[s.id]
          return (
            <button
              key={s.id}
              className={`plan-filter-chip ${active ? 'plan-filter-chip--active' : ''}`}
              style={active && meta ? { background: meta.bg, borderColor: meta.color, color: meta.color } : {}}
              onClick={() => setServiceFilter(s.id)}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Grille */}
      <div className="plan-wrap">

        {/* Colonne noms (sticky) */}
        <div className="plan-names">
          <div className="plan-names-spacer" style={{ height: MONTH_H + DAY_H }} />
          {filteredUsers.map(u => {
            const sm = SERVICE_MAP[u.service]
            return (
              <div key={u.id} className="plan-name-row" style={{ height: ROW_H }}>
                <span className="plan-name-text">{u.full_name}</span>
                {sm && (
                  <span className="plan-service-badge" style={{ color: sm.color, background: sm.bg }}>
                    {sm.label}
                  </span>
                )}
              </div>
            )
          })}
          {filteredUsers.length === 0 && (
            <p className="plan-names-empty">Aucun collaborateur</p>
          )}
        </div>

        {/* Zone scrollable */}
        <div className="plan-scroll" ref={scrollRef}>
          <div style={{ width: totalW, minWidth: totalW }}>

            {/* Headers mois */}
            <div className="plan-month-row" style={{ height: MONTH_H }}>
              {monthGroups.map(m => (
                <div key={m.key} className="plan-month-cell" style={{ width: m.count * DAY_W }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Headers jours */}
            <div className="plan-day-row" style={{ height: DAY_H }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`plan-day-cell${isWeekend(d) ? ' plan-day-cell--we' : ''}${toISO(d) === todayISO ? ' plan-day-cell--today' : ''}`}
                  style={{ width: DAY_W }}
                >
                  {d.getDate() === 1 || d.getDate() % 5 === 0 ? d.getDate() : ''}
                </div>
              ))}
            </div>

            {/* Lignes collaborateurs */}
            {filteredUsers.map(u => (
              <div key={u.id} className="plan-row" style={{ height: ROW_H, width: totalW }}>

                {/* Cellules jour (background) */}
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={`plan-cell${isWeekend(d) ? ' plan-cell--we' : ''}${toISO(d) === todayISO ? ' plan-cell--today' : ''}`}
                    style={{ width: DAY_W, left: i * DAY_W }}
                  />
                ))}

                {/* Trait "aujourd'hui" */}
                {todayIdx >= 0 && (
                  <div className="plan-today-line" style={{ left: todayIdx * DAY_W + DAY_W / 2 }} />
                )}

                {/* Blocs de planning */}
                {(planningsByUser[u.id] || []).map(p => {
                  const visFrom = toISO(quarterStart)
                  const visTo   = toISO(addDays(addMonths(quarterStart, N_MONTHS), -1))
                  const clStart = p.date_debut < visFrom ? visFrom : p.date_debut
                  const clEnd   = p.date_fin   > visTo   ? visTo   : p.date_fin
                  const si = days.findIndex(d => toISO(d) === clStart)
                  let   ei = days.findIndex(d => toISO(d) === clEnd)
                  if (si < 0) return null
                  if (ei < 0) ei = days.length - 1
                  const blockW = Math.max(DAY_W - 4, (ei - si + 1) * DAY_W - 4)
                  return (
                    <div
                      key={p.id}
                      className="plan-block"
                      style={{
                        left:            si * DAY_W + 2,
                        width:           blockW,
                        background:      p.color + '28',
                        borderLeftColor: p.color,
                        color:           p.color,
                      }}
                      title={`${p.label}\n${p.date_debut} → ${p.date_fin}`}
                    >
                      <span className="plan-block-label">{p.label}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="plan-empty">Aucun collaborateur pour ce filtre.</div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
