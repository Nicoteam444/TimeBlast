import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

// ── Constantes ────────────────────────────────────────────────
const DAY_W   = 28   // px par jour
const ROW_H   = 48   // px par ligne collaborateur
const MONTH_H = 26   // px header mois
const DAY_H   = 24   // px header jours
const N_MONTHS = 3

// ── Couleurs par poste ────────────────────────────────────────
const POSTE_COLORS = [
  { color: '#6366f1', bg: '#eef2ff' },
  { color: '#f59e0b', bg: '#fffbeb' },
  { color: '#22c55e', bg: '#f0fdf4' },
  { color: '#8b5cf6', bg: '#f5f3ff' },
  { color: '#ec4899', bg: '#fdf2f8' },
  { color: '#14b8a6', bg: '#f0fdfa' },
  { color: '#f97316', bg: '#fff7ed' },
  { color: '#3b82f6', bg: '#eff6ff' },
]
function posteColor(poste, allPostes) {
  const idx = allPostes.indexOf(poste)
  return POSTE_COLORS[idx % POSTE_COLORS.length] || POSTE_COLORS[0]
}

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
  const { selectedSociete } = useSociete()
  const [posteFilter, setPosteFilter] = useState('tous')
  const [searchCollab, setSearchCollab] = useState('')
  const [equipe, setEquipe]     = useState([])
  const [plannings, setPlannings] = useState([])
  const [quarterStart, setQuarterStart] = useState(() => startOfMonth(new Date()))
  const scrollRef = useRef()

  const days        = useMemo(() => generateDays(quarterStart, N_MONTHS), [quarterStart])
  const monthGroups = useMemo(() => groupByMonth(days), [days])
  const totalW      = days.length * DAY_W
  const todayISO    = toISO(new Date())
  const todayIdx    = days.findIndex(d => toISO(d) === todayISO)

  // Charger les collaborateurs depuis la table equipe
  useEffect(() => {
    if (!selectedSociete?.id) { setEquipe([]); return }
    supabase.from('equipe')
      .select('id, nom, prenom, poste')
      .eq('societe_id', selectedSociete.id)
      .order('nom', { ascending: true })
      .then(({ data }) => setEquipe(data || []))
  }, [selectedSociete?.id])

  // Charger les plannings
  useEffect(() => {
    if (!selectedSociete?.id) { setPlannings([]); return }
    const from = toISO(quarterStart)
    const to   = toISO(addMonths(quarterStart, N_MONTHS))
    supabase.from('plannings')
      .select('*')
      .eq('societe_id', selectedSociete.id)
      .gte('date_fin', from)
      .lte('date_debut', to)
      .then(({ data }) => setPlannings(data || []))
  }, [selectedSociete?.id, quarterStart])

  // Scroll vers aujourd'hui au chargement
  useEffect(() => {
    if (scrollRef.current && todayIdx > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 120)
    }
  }, [todayIdx])

  // Postes uniques pour les filtres
  const allPostes = useMemo(() => [...new Set(equipe.map(e => e.poste).filter(Boolean))].sort(), [equipe])

  const filteredUsers = useMemo(() => {
    let rows = equipe
    if (posteFilter !== 'tous') rows = rows.filter(u => u.poste === posteFilter)
    if (searchCollab) {
      const q = searchCollab.toLowerCase()
      rows = rows.filter(u => `${u.nom} ${u.prenom}`.toLowerCase().includes(q))
    }
    return rows
  }, [equipe, posteFilter, searchCollab])

  const planningsByUser = useMemo(() => {
    const map = {}
    for (const u of filteredUsers) map[u.id] = []
    for (const p of plannings) {
      if (map[p.user_key] !== undefined) map[p.user_key].push(p)
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

      {/* Filtres postes + recherche */}
      <div className="plan-filter-bar">
        <input
          className="table-search"
          style={{ width: 180 }}
          value={searchCollab}
          onChange={e => setSearchCollab(e.target.value)}
          placeholder="Rechercher un collaborateur…"
        />
        <button
          className={`plan-filter-chip ${posteFilter === 'tous' ? 'plan-filter-chip--active' : ''}`}
          onClick={() => setPosteFilter('tous')}
        >Tous</button>
        {allPostes.map(p => {
          const c = posteColor(p, allPostes)
          const active = posteFilter === p
          return (
            <button
              key={p}
              className={`plan-filter-chip ${active ? 'plan-filter-chip--active' : ''}`}
              style={active ? { background: c.bg, borderColor: c.color, color: c.color } : {}}
              onClick={() => setPosteFilter(p)}
            >{p}</button>
          )
        })}
      </div>

      {/* Grille */}
      <div className="plan-wrap">

        {/* Colonne noms (sticky) */}
        <div className="plan-names">
          <div className="plan-names-spacer" style={{ height: MONTH_H + DAY_H }} />
          {filteredUsers.map(u => {
            const c = u.poste ? posteColor(u.poste, allPostes) : null
            return (
              <div key={u.id} className="plan-name-row" style={{ height: ROW_H }}>
                <span className="plan-name-text">{u.prenom} {u.nom}</span>
                {u.poste && c && (
                  <span className="plan-service-badge" style={{ color: c.color, background: c.bg }}>
                    {u.poste}
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
