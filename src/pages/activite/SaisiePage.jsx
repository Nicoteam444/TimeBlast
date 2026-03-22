import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSociete } from '../../contexts/SocieteContext'

// ── Validation semaine ───────────────────────────────────────
const VALIDATION_STORAGE_KEY = 'validation_statuts'

function loadValidationStatuts() {
  try { return JSON.parse(localStorage.getItem(VALIDATION_STORAGE_KEY) || '{}') } catch { return {} }
}
function saveValidationStatuts(s) {
  try { localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function WeekStatusBar({ userId, mondayISO, userRole }) {
  const [status, setStatus] = useState('brouillon')

  useEffect(() => {
    const stored = loadValidationStatuts()
    const key = `${userId}_${mondayISO}`
    setStatus(stored[key] || 'brouillon')
  }, [userId, mondayISO])

  function handleSubmit() {
    const stored = loadValidationStatuts()
    const key = `${userId}_${mondayISO}`
    stored[key] = 'soumis'
    saveValidationStatuts(stored)
    setStatus('soumis')
  }

  if (!['admin', 'manager', 'collaborateur'].includes(userRole)) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
      {status === 'brouillon' && (
        <button className="btn-primary" style={{ fontSize: '.82rem' }} onClick={handleSubmit}>
          Soumettre la semaine
        </button>
      )}
      {status === 'soumis' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          padding: '.3rem .85rem', borderRadius: 20,
          background: '#fffbeb', color: '#f59e0b',
          border: '1px solid #f59e0b44', fontSize: '.82rem', fontWeight: 700,
        }}>
          ⏳ En attente de validation
        </span>
      )}
      {status === 'valide' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          padding: '.3rem .85rem', borderRadius: 20,
          background: '#f0fdf4', color: '#16a34a',
          border: '1px solid #16a34a44', fontSize: '.82rem', fontWeight: 700,
        }}>
          ✓ Semaine validée
        </span>
      )}
      {status === 'rejete' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          padding: '.3rem .85rem', borderRadius: 20,
          background: '#fef2f2', color: '#dc2626',
          border: '1px solid #dc262644', fontSize: '.82rem', fontWeight: 700,
        }}>
          ✕ À corriger
        </span>
      )}
    </div>
  )
}

// ── Constantes calendrier ────────────────────────────────────
const HOUR_H = 60        // px par heure
const START_H = 7        // 7:00
const END_H = 21         // 21:00
const SNAP = 15          // snap 15 min
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)

// ── Utils ────────────────────────────────────────────────────
function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0, 10) }
function isToday(d) { return toISO(d) === toISO(new Date()) }
function fmtWeekDay(d) { return d.toLocaleDateString('fr-FR', { weekday: 'short' }) }
function fmtDayNum(d) { return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) }
function fmtDayShort(d) { return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) }
function fmtMonthYear(d) { return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
function fmtTime(min) { const h = Math.floor(min / 60); const m = min % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }
function minToY(min) { return ((min - START_H * 60) / 60) * HOUR_H }
function yToMin(y) { const raw = (y / HOUR_H) * 60 + START_H * 60; return Math.round(raw / SNAP) * SNAP }
function yToMin30(y) { const raw = (y / HOUR_H) * 60 + START_H * 60; return Math.round(raw / 30) * 30 }
function clampMin(m) { return Math.max(START_H * 60, Math.min(END_H * 60, m)) }

const COLORS = ['#6366f1','#0ea5e9','#16a34a','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316']
function colorFor(id) { if (!id) return '#94a3b8'; let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % COLORS.length; return COLORS[h] }

// ── ProjectPicker ────────────────────────────────────────────
function ProjectPicker({ value, onChange, autoFocus }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => { if (value) setQuery(value.name) }, [value?.id])
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function search(q) {
    setQuery(q); setOpen(true)
    if (!q.trim()) { setResults([]); onChange(null); return }
    const { data } = await supabase.from('projets').select('id, name, clients(name)').ilike('name', `%${q}%`).eq('statut', 'actif').limit(8)
    setResults(data || [])
  }

  function select(p) { onChange(p); setQuery(p.name); setOpen(false) }
  const showCreate = query.trim() && !results.find(r => r.name.toLowerCase() === query.toLowerCase())

  return (
    <div className="project-picker" ref={ref}>
      <input className="project-picker-input" type="text" value={query} autoFocus={autoFocus}
        onChange={e => search(e.target.value)} onFocus={() => query && setOpen(true)}
        placeholder="Rechercher ou créer un projet..." autoComplete="off" />
      {open && (results.length > 0 || showCreate) && (
        <div className="project-picker-dropdown">
          {results.map(p => (
            <button key={p.id} className="project-picker-item" onMouseDown={() => select(p)}>
              <span className="project-picker-dot" style={{ background: colorFor(p.id) }} />
              <span>{p.name}</span>
              {p.clients?.name && <span className="project-picker-client">{p.clients.name}</span>}
            </button>
          ))}
          {showCreate && (
            <button className="project-picker-item project-picker-item--create"
              onMouseDown={() => onChange({ _create: true, name: query.trim() })}>
              + Créer « {query.trim()} »
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal création événement ─────────────────────────────────
function EventModal({ event, userId, societeId, onClose, onSaved }) {
  const [project, setProject] = useState(null)
  const [startMin, setStartMin] = useState(event.startMin)
  const [endMin, setEndMin] = useState(event.endMin)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
  const heures = Math.round((endMin - startMin) / 60 * 10) / 10

  async function handleSave(e) {
    e.preventDefault()
    if (!project) return
    setSaving(true)
    setSaveError(null)

    let projetId = project.id
    if (project._create) {
      const { data, error } = await supabase.from('projets').insert({ name: project.name }).select('id').single()
      if (error) { setSaveError('Erreur création projet : ' + error.message); setSaving(false); return }
      projetId = data?.id
    }

    // Stockage dans commentaire JSON pour éviter le problème de cache schema
    const meta = JSON.stringify({
      projet_id: projetId,
      projet_name: project._create ? project.name : project.name,
      h_debut: fmtTime(startMin),
      h_fin: fmtTime(endMin),
      note: notes || null,
    })
    const { error } = await supabase.from('saisies_temps').insert({
      user_id: userId,
      date: event.date,
      heures,
      commentaire: meta,
      societe_id: societeId || null,
    })

    setSaving(false)
    if (error) { setSaveError(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Nouvelle saisie</h2>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>{dateLabel}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="field">
            <label>Projet</label>
            <ProjectPicker value={project} onChange={setProject} autoFocus />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Début</label>
              <input type="time" value={fmtTime(startMin)}
                onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setStartMin(h*60+m) }} />
            </div>
            <div className="field">
              <label>Fin</label>
              <input type="time" value={fmtTime(endMin)}
                onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setEndMin(h*60+m) }} />
            </div>
            <div className="field" style={{ minWidth: 60 }}>
              <label>Durée</label>
              <div style={{ padding: '.45rem 0', fontWeight: 600, color: 'var(--primary)' }}>{heures}h</div>
            </div>
          </div>
          <div className="field">
            <label>Note (optionnel)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex : Réunion client" />
          </div>
          {saveError && (
            <p style={{ color: '#dc2626', fontSize: '.82rem', marginBottom: '.5rem' }}>⚠ {saveError}</p>
          )}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', paddingTop: '.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !project}>
              {saving ? 'Enregistrement...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal détail événement ───────────────────────────────────
function EventDetailModal({ ev, onClose, onDelete, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [project, setProject] = useState(ev.projets?.id ? { id: ev.projets.id, name: ev.projets.name } : null)
  const [startMin, setStartMin] = useState(ev.startMin)
  const [endMin, setEndMin] = useState(ev.endMin)
  const [notes, setNotes] = useState(ev.noteText || '')
  const [saving, setSaving] = useState(false)

  const dateLabel = new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const heures = Math.round((endMin - startMin) / 60 * 10) / 10
  const color = colorFor(ev.projets?.id)

  async function handleSave() {
    setSaving(true)
    const meta = JSON.stringify({
      projet_id: project?.id || null,
      projet_name: project?.name || null,
      h_debut: fmtTime(startMin),
      h_fin: fmtTime(endMin),
      note: notes || null,
    })
    await supabase.from('saisies_temps').update({ heures: Math.round((endMin - startMin) / 60 * 10) / 10, commentaire: meta }).eq('id', ev.id)
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  async function handleDelete() {
    await supabase.from('saisies_temps').delete().eq('id', ev.id)
    onDelete()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
            <div>
              <h2>{ev.projets?.name || '—'}</h2>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>{dateLabel}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {!editing ? (
            <div className="detail-grid" style={{ marginBottom: '1rem' }}>
              <div className="detail-field">
                <span className="detail-label">Projet</span>
                <span className="detail-value">{ev.projets?.name || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Durée</span>
                <span className="detail-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>{ev.heures}h</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Début</span>
                <span className="detail-value">{fmtTime(ev.startMin)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Fin</span>
                <span className="detail-value">{fmtTime(ev.endMin)}</span>
              </div>
              {ev.noteText && (
                <div className="detail-field" style={{ gridColumn: '1/-1' }}>
                  <span className="detail-label">Note</span>
                  <span className="detail-value">{ev.noteText}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <div className="field">
                <label>Projet</label>
                <ProjectPicker value={project} onChange={setProject} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Début</label>
                  <input type="time" value={fmtTime(startMin)} onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setStartMin(h*60+m) }} />
                </div>
                <div className="field">
                  <label>Fin</label>
                  <input type="time" value={fmtTime(endMin)} onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setEndMin(h*60+m) }} />
                </div>
                <div className="field" style={{ minWidth: 60 }}>
                  <label>Durée</label>
                  <div style={{ padding: '.45rem 0', fontWeight: 600, color: 'var(--primary)' }}>{heures}h</div>
                </div>
              </div>
              <div className="field">
                <label>Note</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note libre..." />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'space-between' }}>
            <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {editing
                ? <><button className="btn-secondary" onClick={() => setEditing(false)}>Annuler</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Enregistrer'}</button></>
                : <button className="btn-primary" onClick={() => setEditing(true)}>Modifier</button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Totals Bar ───────────────────────────────────────────────
const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const OBJECTIVE_H = 40

function TotalsBar({ weekDates, events }) {
  const dayTotals = weekDates.map(d => {
    const iso = toISO(d)
    const evs = events[iso] || []
    return Math.round(evs.reduce((s, e) => s + (e.heures || 0), 0) * 10) / 10
  })
  const weekTotal = Math.round(dayTotals.reduce((s, h) => s + h, 0) * 10) / 10
  const progress = Math.min(100, Math.round(weekTotal / OBJECTIVE_H * 100))

  return (
    <div className="cal-totals-bar">
      {weekDates.map((d, i) => (
        <div key={i} className="cal-totals-day">
          <span>{WEEK_DAYS_SHORT[i]}</span>
          <span className="cal-totals-day-val">{dayTotals[i] > 0 ? `${dayTotals[i]}h` : '—'}</span>
        </div>
      ))}
      <span className="cal-totals-sep">|</span>
      <span className="cal-totals-total">{weekTotal}h / {OBJECTIVE_H}h</span>
      <div className="cal-totals-progress-wrap" title={`${progress}%`}>
        <div
          className="cal-totals-progress-bar"
          style={{
            width: `${progress}%`,
            background: weekTotal > OBJECTIVE_H ? '#dc2626' : 'var(--primary)',
          }}
        />
      </div>
      <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{progress}%</span>
    </div>
  )
}

// ── CSV Export ───────────────────────────────────────────────
function exportCSV(weekDates, events) {
  const rows = [['Date', 'Projet', 'Début', 'Fin', 'Heures', 'Note']]
  for (const d of weekDates) {
    const iso = toISO(d)
    const evs = events[iso] || []
    for (const ev of evs) {
      rows.push([
        iso,
        ev.projets?.name || '—',
        fmtTime(ev.startMin),
        fmtTime(ev.endMin),
        ev.heures ?? '',
        ev.noteText || '',
      ])
    }
  }
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const weekLabel = toISO(weekDates[0])
  a.download = `saisies-${weekLabel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page principale ──────────────────────────────────────────
export default function SaisiePage() {
  const { profile } = useAuth()
  const { selectedSociete } = useSociete()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [events, setEvents] = useState({})
  const [loading, setLoading] = useState(true)
  const [dragPreview, setDragPreview] = useState(null) // { date, startMin, endMin }
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [newEvent, setNewEvent] = useState(null)        // { date, startMin, endMin }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchWeek = useCallback(async () => {
    setLoading(true)

    if (!profile?.id) { setLoading(false); return }
    let query = supabase
      .from('saisies_temps')
      .select('id, date, heures, commentaire')
      .eq('user_id', profile.id)
      .gte('date', toISO(weekStart))
      .lte('date', toISO(addDays(weekStart, 6)))
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data } = await query
    let rows = data || []

    const map = {}
    for (const s of rows) {
      const dateKey = s.date
      if (!map[dateKey]) map[dateKey] = []
      // Lire les métadonnées depuis commentaire JSON
      let meta = {}
      try { meta = JSON.parse(s.commentaire || '{}') } catch {}
      let startMin = START_H * 60
      let endMin = startMin + (s.heures || 1) * 60
      if (meta.h_debut) { const [h, m] = meta.h_debut.split(':').map(Number); startMin = h * 60 + m }
      if (meta.h_fin)   { const [h, m] = meta.h_fin.split(':').map(Number);   endMin   = h * 60 + m }
      map[dateKey].push({
        ...s,
        startMin, endMin,
        projets: { id: meta.projet_id, name: meta.projet_name || '—' },
        noteText: meta.note,
      })
    }
    setEvents(map)
    setLoading(false)
  }, [profile?.id, weekStart, selectedSociete?.id])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  // ── Drag handlers ────────────────────────────────────────
  function handleMouseDown(e, date, colEl) {
    if (e.button !== 0) return
    e.preventDefault()
    const rect = colEl.getBoundingClientRect()
    const startMin = clampMin(yToMin30(e.clientY - rect.top))

    const onMove = (ev) => {
      const rect2 = colEl.getBoundingClientRect()
      const curMin = clampMin(yToMin30(ev.clientY - rect2.top))
      const s = Math.min(startMin, curMin)
      const en = Math.max(startMin + 30, curMin)
      setDragPreview({ date, startMin: s, endMin: en })
    }

    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const rect2 = colEl.getBoundingClientRect()
      const curMin = clampMin(yToMin30(ev.clientY - rect2.top))
      const s = Math.min(startMin, curMin)
      const en = Math.max(startMin + 30, curMin)
      setDragPreview(null)
      setNewEvent({ date, startMin: s, endMin: en })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    setDragPreview({ date, startMin, endMin: startMin + 30 })
  }

  async function handleDeleteEvent(id) {
    await supabase.from('saisies_temps').delete().eq('id', id)
    fetchWeek()
  }

  const totalWeek = Object.values(events).flat().reduce((s, e) => s + (e.heures || 0), 0)

  return (
    <div className="admin-page cal-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Saisie des temps</h1>
          <p style={{ textTransform: 'capitalize' }}>{fmtMonthYear(weekStart)} · {totalWeek > 0 ? `${totalWeek}h cette semaine` : 'Aucune saisie'}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <WeekStatusBar
            userId={profile?.id || 'unknown'}
            mondayISO={toISO(weekStart)}
            userRole={profile?.role}
          />
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, -7))}>← Préc.</button>
          <button className="btn-secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, 7))}>Suiv. →</button>
          <button
            className="btn-secondary"
            title="Exporter la semaine en CSV"
            onClick={() => exportCSV(weekDates, events)}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* Calendrier */}
      <div className="cal-grid-wrap">
        {/* En-tête jours */}
        <div className="cal-grid-header">
          <div className="cal-gutter" />
          {weekDates.map((d, i) => {
            const dayTotal = (events[toISO(d)] || []).reduce((s, e) => s + (e.heures || 0), 0)
            return (
              <div key={i} className={`cal-col-header ${isToday(d) ? 'cal-col-header--today' : ''}`}>
                <span className="cal-col-wday">{fmtWeekDay(d)}</span>
                <span className={`cal-col-date ${isToday(d) ? 'cal-col-date--today' : ''}`}>{fmtDayNum(d)}</span>
                {dayTotal > 0 && <span className="cal-col-total" style={{ color: dayTotal > 8 ? '#dc2626' : 'var(--primary)' }}>{dayTotal}h</span>}
              </div>
            )
          })}
        </div>

        {/* Corps scrollable */}
        <div className="cal-grid-body">
          {/* Gouttière heures */}
          <div className="cal-gutter">
            {HOURS.map(h => (
              <div key={h} className="cal-hour-label" style={{ height: HOUR_H, marginTop: h === START_H ? 0 : 0 }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDates.map((d, i) => {
            const iso = toISO(d)
            const dayEvents = events[iso] || []
            const isWeekend = i >= 5

            return (
              <div
                key={i}
                className={`cal-col ${isWeekend ? 'cal-col--weekend' : ''} ${isToday(d) ? 'cal-col--today' : ''}`}
                style={{ position: 'relative', height: HOUR_H * HOURS.length }}
                onMouseDown={e => handleMouseDown(e, iso, e.currentTarget)}
              >
                {/* Lignes heures */}
                {HOURS.map((h, hi) => (
                  <div key={h} className="cal-hour-line" style={{ top: hi * HOUR_H }} />
                ))}
                {/* Demi-heure */}
                {HOURS.map((h, hi) => (
                  <div key={`h${h}`} className="cal-half-line" style={{ top: hi * HOUR_H + HOUR_H / 2 }} />
                ))}

                {/* Événements */}
                {!loading && dayEvents.map(ev => {
                  const top = minToY(ev.startMin)
                  const height = Math.max(20, minToY(ev.endMin) - top)
                  const color = colorFor(ev.projets?.id)
                  return (
                    <div key={ev.id} className="cal-event"
                      style={{ top, height, background: color + '22', borderLeftColor: color }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setSelectedEvent(ev) }}
                    >
                      <div className="cal-event-title">{ev.projets?.name || '—'}</div>
                      <div className="cal-event-time">{fmtTime(ev.startMin)}–{fmtTime(ev.endMin)}</div>
                    </div>
                  )
                })}

                {/* Preview drag (pendant le drag) */}
                {dragPreview?.date === iso && (
                  <div className="cal-drag-preview" style={{
                    top: minToY(dragPreview.startMin),
                    height: Math.max(20, minToY(dragPreview.endMin) - minToY(dragPreview.startMin)),
                  }}>
                    <span>{fmtTime(dragPreview.startMin)} – {fmtTime(dragPreview.endMin)}</span>
                  </div>
                )}

                {/* Fantôme pendant que la modal est ouverte */}
                {!dragPreview && newEvent?.date === iso && (
                  <div className="cal-drag-preview cal-drag-ghost" style={{
                    top: minToY(newEvent.startMin),
                    height: Math.max(20, minToY(newEvent.endMin) - minToY(newEvent.startMin)),
                  }}>
                    <span>{fmtTime(newEvent.startMin)} – {fmtTime(newEvent.endMin)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals Bar */}
      <TotalsBar weekDates={weekDates} events={events} />

      {/* Modal création */}
      {newEvent && (
        <EventModal
          event={newEvent}
          userId={profile.id}
          societeId={selectedSociete?.id || null}
          onClose={() => setNewEvent(null)}
          onSaved={fetchWeek}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          ev={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={fetchWeek}
          onRefresh={() => { fetchWeek(); setSelectedEvent(null) }}
        />
      )}
    </div>
  )
}
