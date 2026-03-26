import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ── Constantes ────────────────────────────────────────────────
const DAY_W   = 28
const ROW_H   = 48
const MONTH_H = 26
const DAY_H   = 24
const N_MONTHS = 3

const TASK_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ec4899',
  '#14b8a6','#8b5cf6','#f97316','#3b82f6','#06b6d4','#84cc16',
]

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
function addDaysDate(d, n){ const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d)         { return d.toISOString().slice(0, 10) }
function isWeekend(d)     { const day = d.getDay(); return day === 0 || day === 6 }
function isoToDate(s)     { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d) }

function generateDays(start, months) {
  const end = addMonths(start, months)
  const days = []
  let cur = new Date(start)
  while (cur < end) { days.push(new Date(cur)); cur = addDaysDate(cur, 1) }
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

// ── Modal édition tâche ───────────────────────────────────────
function TaskModal({ task, onSave, onDelete, onClose }) {
  const [label, setLabel]     = useState(task.label || '')
  const [color, setColor]     = useState(task.color || '#6366f1')
  const [debut, setDebut]     = useState(task.date_debut || '')
  const [fin, setFin]         = useState(task.date_fin || '')
  const isNew = !task.id

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...task, label, color, date_debut: debut, date_fin: fin })
  }

  return (
    <div className="plan-modal-overlay" onClick={onClose}>
      <div className="plan-modal" onClick={e => e.stopPropagation()}>
        <div className="plan-modal-header">
          <h3>{isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}</h3>
          <button className="plan-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="plan-modal-body">
          <div className="plan-modal-field">
            <label>Intitulé</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Développement…" required />
          </div>
          <div className="plan-modal-row">
            <div className="plan-modal-field">
              <label>Début</label>
              <input type="date" value={debut} onChange={e => setDebut(e.target.value)} required />
            </div>
            <div className="plan-modal-field">
              <label>Fin</label>
              <input type="date" value={fin} onChange={e => setFin(e.target.value)} required />
            </div>
          </div>
          <div className="plan-modal-field">
            <label>Couleur</label>
            <div className="plan-color-picker">
              {TASK_COLORS.map(c => (
                <button
                  key={c} type="button"
                  className={`plan-color-swatch ${color === c ? 'plan-color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="plan-modal-actions">
            {!isNew && (
              <button type="button" className="btn-danger" onClick={() => onDelete(task.id)}>
                Supprimer
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary">
              {isNew ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function PlanificationPage() {
  const [posteFilter, setPosteFilter]     = useState('tous')
  const [searchCollab, setSearchCollab]   = useState('')
  const [equipe, setEquipe]               = useState([])
  const [plannings, setPlannings]         = useState([])
  const [quarterStart, setQuarterStart]   = useState(() => startOfMonth(new Date()))
  const [editModal, setEditModal]         = useState(null)
  const scrollRef  = useRef()
  const dragRef    = useRef(null) // { id, origDebut, origFin, startX, currentDelta }

  const days        = useMemo(() => generateDays(quarterStart, N_MONTHS), [quarterStart])
  const monthGroups = useMemo(() => groupByMonth(days), [days])
  const totalW      = days.length * DAY_W
  const todayISO    = toISO(new Date())
  const todayIdx    = days.findIndex(d => toISO(d) === todayISO)

  useEffect(() => {
    supabase.from('equipe').select('id, nom, prenom, poste').order('nom').then(({ data }) => setEquipe(data || []))
  }, [])

  function loadPlannings() {
    const from = toISO(quarterStart)
    const to   = toISO(addMonths(quarterStart, N_MONTHS))
    supabase.from('plannings').select('*').gte('date_fin', from).lte('date_debut', to).then(({ data }) => setPlannings(data || []))
  }
  useEffect(() => { loadPlannings() }, [, quarterStart])

  useEffect(() => {
    if (scrollRef.current && todayIdx > 0)
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 120)
  }, [todayIdx])

  const allPostes = useMemo(() =>
    [...new Set(equipe.map(e => e.poste).filter(Boolean))].sort(), [equipe])

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

  // ── DRAG & DROP ───────────────────────────────────────────
  const [dragState, setDragState] = useState(null)
  // dragState: { id, origDebut, origFin, startX, deltaDays }

  const handleBlockMouseDown = useCallback((e, p) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { id: p.id, origDebut: p.date_debut, origFin: p.date_fin, startX: e.clientX, deltaDays: 0 }
    setDragState({ id: p.id, deltaDays: 0 })
  }, [])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragRef.current) return
      const deltaPx   = e.clientX - dragRef.current.startX
      const deltaDays = Math.round(deltaPx / DAY_W)
      if (deltaDays !== dragRef.current.deltaDays) {
        dragRef.current.deltaDays = deltaDays
        setDragState({ id: dragRef.current.id, deltaDays })
      }
    }
    async function onMouseUp() {
      if (!dragRef.current) return
      const { id, origDebut, origFin, deltaDays } = dragRef.current
      dragRef.current = null
      setDragState(null)
      if (deltaDays === 0) return
      const newDebut = toISO(addDaysDate(isoToDate(origDebut), deltaDays))
      const newFin   = toISO(addDaysDate(isoToDate(origFin),   deltaDays))
      setPlannings(prev => prev.map(p => p.id === id ? { ...p, date_debut: newDebut, date_fin: newFin } : p))
      await supabase.from('plannings').update({ date_debut: newDebut, date_fin: newFin }).eq('id', id)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  // ── SAVE / DELETE ──────────────────────────────────────────
  async function handleSaveTask(task) {
    if (task.id) {
      await supabase.from('plannings').update({
        label: task.label, color: task.color,
        date_debut: task.date_debut, date_fin: task.date_fin}).eq('id', task.id)
    } else {
      await supabase.from('plannings').insert({
        user_key: task.user_key, user_label: task.user_label,
        societe_id: selectedSociete.id,
        label: task.label, color: task.color,
        date_debut: task.date_debut, date_fin: task.date_fin})
    }
    setEditModal(null)
    loadPlannings()
  }

  async function handleDeleteTask(id) {
    await supabase.from('plannings').delete().eq('id', id)
    setEditModal(null)
    loadPlannings()
  }

  function openNewTask(user, dayISO) {
    setEditModal({
      task: {
        user_key: user.id,
        user_label: `${user.prenom} ${user.nom}`,
        label: '',
        color: '#6366f1',
        date_debut: dayISO,
        date_fin: toISO(addDaysDate(isoToDate(dayISO), 4))}
    })
  }

  function openEditTask(e, p) {
    if (dragRef.current) return
    e.stopPropagation()
    setEditModal({ task: p })
  }

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
          {!isCurrent && <button className="btn-secondary" onClick={() => setQuarterStart(startOfMonth(new Date()))}>Aujourd'hui</button>}
          <button className="btn-secondary" onClick={() => setQuarterStart(d => addMonths(d, 3))}>Suiv. →</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="plan-filter-bar">
        <input className="table-search" style={{ width: 180 }} value={searchCollab}
          onChange={e => setSearchCollab(e.target.value)} placeholder="Rechercher un collaborateur…" />
        <button className={`plan-filter-chip ${posteFilter === 'tous' ? 'plan-filter-chip--active' : ''}`}
          onClick={() => setPosteFilter('tous')}>Tous</button>
        {allPostes.map(p => {
          const c = posteColor(p, allPostes)
          const active = posteFilter === p
          return (
            <button key={p}
              className={`plan-filter-chip ${active ? 'plan-filter-chip--active' : ''}`}
              style={active ? { background: c.bg, borderColor: c.color, color: c.color } : {}}
              onClick={() => setPosteFilter(p)}>{p}</button>
          )
        })}
      </div>

      {/* Grille */}
      <div className="plan-wrap">
        {/* Colonne noms */}
        <div className="plan-names">
          <div className="plan-names-spacer" style={{ height: MONTH_H + DAY_H }} />
          {filteredUsers.map(u => {
            const c = u.poste ? posteColor(u.poste, allPostes) : null
            return (
              <div key={u.id} className="plan-name-row" style={{ height: ROW_H }}>
                <span className="plan-name-text">{u.prenom} {u.nom}</span>
                {u.poste && c && <span className="plan-service-badge" style={{ color: c.color, background: c.bg }}>{u.poste}</span>}
              </div>
            )
          })}
          {filteredUsers.length === 0 && <p className="plan-names-empty">Aucun collaborateur</p>}
        </div>

        {/* Zone scrollable */}
        <div className="plan-scroll" ref={scrollRef} style={{ userSelect: dragState ? 'none' : 'auto' }}>
          <div style={{ width: totalW, minWidth: totalW }}>

            {/* Headers mois */}
            <div className="plan-month-row" style={{ height: MONTH_H }}>
              {monthGroups.map(m => (
                <div key={m.key} className="plan-month-cell" style={{ width: m.count * DAY_W }}>{m.label}</div>
              ))}
            </div>

            {/* Headers jours */}
            <div className="plan-day-row" style={{ height: DAY_H }}>
              {days.map((d, i) => (
                <div key={i}
                  className={`plan-day-cell${isWeekend(d) ? ' plan-day-cell--we' : ''}${toISO(d) === todayISO ? ' plan-day-cell--today' : ''}`}
                  style={{ width: DAY_W }}>
                  {d.getDate() === 1 || d.getDate() % 5 === 0 ? d.getDate() : ''}
                </div>
              ))}
            </div>

            {/* Lignes collaborateurs */}
            {filteredUsers.map(u => (
              <div key={u.id} className="plan-row" style={{ height: ROW_H, width: totalW }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const scrollLeft = scrollRef.current?.scrollLeft || 0
                  const x = e.clientX - rect.left + scrollLeft
                  const dayIdx = Math.floor(x / DAY_W)
                  if (dayIdx >= 0 && dayIdx < days.length) openNewTask(u, toISO(days[dayIdx]))
                }}>

                {days.map((d, i) => (
                  <div key={i}
                    className={`plan-cell${isWeekend(d) ? ' plan-cell--we' : ''}${toISO(d) === todayISO ? ' plan-cell--today' : ''}`}
                    style={{ width: DAY_W, left: i * DAY_W }} />
                ))}

                {todayIdx >= 0 && <div className="plan-today-line" style={{ left: todayIdx * DAY_W + DAY_W / 2 }} />}

                {(planningsByUser[u.id] || []).map(p => {
                  const isDragging = dragState?.id === p.id
                  const delta = isDragging ? dragState.deltaDays : 0
                  const debISO = isDragging ? toISO(addDaysDate(isoToDate(p.date_debut), delta)) : p.date_debut
                  const finISO = isDragging ? toISO(addDaysDate(isoToDate(p.date_fin),   delta)) : p.date_fin

                  const visFrom = toISO(quarterStart)
                  const visTo   = toISO(addDaysDate(addMonths(quarterStart, N_MONTHS), -1))
                  const clStart = debISO < visFrom ? visFrom : debISO
                  const clEnd   = finISO > visTo   ? visTo   : finISO
                  const si = days.findIndex(d => toISO(d) === clStart)
                  let   ei = days.findIndex(d => toISO(d) === clEnd)
                  if (si < 0) return null
                  if (ei < 0) ei = days.length - 1
                  const blockW = Math.max(DAY_W - 4, (ei - si + 1) * DAY_W - 4)

                  return (
                    <div key={p.id}
                      className={`plan-block ${isDragging ? 'plan-block--dragging' : ''}`}
                      style={{
                        left: si * DAY_W + 2, width: blockW,
                        background: p.color + '28',
                        borderLeftColor: p.color, color: p.color,
                        cursor: 'grab'}}
                      onMouseDown={e => { e.stopPropagation(); handleBlockMouseDown(e, p) }}
                      onClick={e => openEditTask(e, p)}
                      title={`${p.label}\n${p.date_debut} → ${p.date_fin}\nClic pour éditer · Glisser pour déplacer`}>
                      <span className="plan-block-label">{p.label}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {filteredUsers.length === 0 && <div className="plan-empty">Aucun collaborateur pour ce filtre.</div>}
          </div>
        </div>
      </div>

      {/* Modal */}
      {editModal && (
        <TaskModal
          task={editModal.task}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  )
}
