import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'
import { getOutlookEvents, createOutlookEvent, updateOutlookEvent, deleteOutlookEvent } from '../lib/microsoftGraph'
import Spinner from '../components/Spinner'

// ── Constantes ─────────────────────────────────────────────
const START_H = 7
const END_H = 21
const SNAP = 15
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)

const VIEWS = ['Jour', 'Semaine de travail', 'Semaine', 'Mois']
const DAYS_WORK = 5
const DAYS_FULL = 7

const USER_COLORS = [
  '#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#dc2626', '#0891b2',
  '#4f46e5', '#059669', '#d97706', '#be185d', '#7c3aed'
]

// ── Utils ──────────────────────────────────────────────────
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
function fmtTime(min) { const h = Math.floor(min / 60); const m = min % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
function minToY(min, hourH = 60) { return ((min - START_H * 60) / 60) * hourH }
function yToMin(y, hourH = 60) { const raw = (y / hourH) * 60 + START_H * 60; return Math.round(raw / SNAP) * SNAP }
function clampMin(m) { return Math.max(START_H * 60, Math.min(END_H * 60, m)) }
function fmtMonthYear(d) { return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
function fmtDayHeader(d) {
  const wd = d.toLocaleDateString('fr-FR', { weekday: 'short' })
  const num = d.getDate()
  return { wd, num }
}

function parseEventTime(ev) {
  const start = new Date(ev.start_time)
  const end = new Date(ev.end_time)
  return {
    ...ev,
    date: toISO(start),
    startMin: start.getHours() * 60 + start.getMinutes(),
    endMin: end.getHours() * 60 + end.getMinutes()
  }
}

function parseSaisieTime(s) {
  try {
    const meta = JSON.parse(s.commentaire || '{}')
    const startParts = (meta.h_debut || '09:00').split(':').map(Number)
    const endParts = (meta.h_fin || '10:00').split(':').map(Number)
    return {
      id: s.id,
      title: meta.projet_name || meta.note || 'Saisie',
      date: s.date,
      startMin: startParts[0] * 60 + (startParts[1] || 0),
      endMin: endParts[0] * 60 + (endParts[1] || 0),
      user_id: s.user_id,
      is_time_entry: true,
      event_type: 'time_entry',
      description: meta.note || '',
      heures: s.heures
    }
  } catch {
    return {
      id: s.id, title: 'Saisie ' + s.heures + 'h', date: s.date,
      startMin: 9 * 60, endMin: 9 * 60 + (s.heures || 1) * 60,
      user_id: s.user_id, is_time_entry: true, event_type: 'time_entry'
    }
  }
}

// ── EventModal ─────────────────────────────────────────────
function EventModal({ event, onClose, onSaved, userId, societeId, collaborateurs }) {
  const [title, setTitle] = useState(event?.title || '')
  const [type, setType] = useState(event?.event_type || 'meeting')
  const [startMin, setStartMin] = useState(event?.startMin || 9 * 60)
  const [endMin, setEndMin] = useState(event?.endMin || 10 * 60)
  const [assignTo, setAssignTo] = useState(event?.user_id || userId)
  const [location, setLocation] = useState(event?.location || '')
  const [description, setDescription] = useState(event?.description || '')
  const [isTimeEntry, setIsTimeEntry] = useState(event?.is_time_entry || false)
  const [saving, setSaving] = useState(false)

  const dateLabel = event?.date ? new Date(event.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''
  const heures = Math.round((endMin - startMin) / 60 * 10) / 10

  const TYPES = [
    { value: 'meeting', label: '📅 Réunion', color: '#6366f1' },
    { value: 'call', label: '📞 Appel', color: '#0ea5e9' },
    { value: 'task', label: '✅ Tâche', color: '#16a34a' },
    { value: 'time_entry', label: '⏱️ Saisie temps', color: '#f59e0b' },
    { value: 'break', label: '☕ Pause', color: '#94a3b8' },
    { value: 'travel', label: '🚗 Déplacement', color: '#ec4899' },
    { value: 'other', label: '📌 Autre', color: '#8b5cf6' },
  ]

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const startDt = new Date(event.date + 'T00:00:00')
    startDt.setHours(Math.floor(startMin / 60), startMin % 60)
    const endDt = new Date(event.date + 'T00:00:00')
    endDt.setHours(Math.floor(endMin / 60), endMin % 60)

    if (isTimeEntry || type === 'time_entry') {
      const meta = JSON.stringify({ h_debut: fmtTime(startMin), h_fin: fmtTime(endMin), note: title, projet_name: title })
      const { error } = await supabase.from('saisies_temps').insert({
        user_id: assignTo, date: event.date, heures, commentaire: meta, societe_id: societeId || null
      })
      if (error) console.error(error)
    }

    const { error } = await supabase.from('calendar_events').insert({
      title, description, location, event_type: type, color: TYPES.find(t => t.value === type)?.color || '#6366f1',
      start_time: startDt.toISOString(), end_time: endDt.toISOString(),
      user_id: assignTo, societe_id: societeId || null,
      is_time_entry: isTimeEntry || type === 'time_entry',
      duree_heures: heures
    })
    setSaving(false)
    if (error) { console.error(error); return }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{event?.id ? 'Modifier' : 'Nouvel'} événement</h2>
            <p style={{ fontSize: '.85rem', color: '#64748b', marginTop: 2 }}>{dateLabel}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Titre</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Réunion, Appel client..." />
          </div>
          <div className="field">
            <label>Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => { setType(t.value); if (t.value === 'time_entry') setIsTimeEntry(true) }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: `2px solid ${type === t.value ? t.color : '#e2e8f0'}`,
                    background: type === t.value ? t.color + '15' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: type === t.value ? 600 : 400
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Début</label>
              <input type="time" value={fmtTime(startMin)} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setStartMin(h * 60 + m) }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fin</label>
              <input type="time" value={fmtTime(endMin)} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setEndMin(h * 60 + m) }} />
            </div>
            <div className="field" style={{ minWidth: 60 }}>
              <label>Durée</label>
              <div style={{ padding: '.45rem 0', fontWeight: 600, color: '#2d6a4f' }}>{heures}h</div>
            </div>
          </div>
          {collaborateurs.length > 1 && (
            <div className="field">
              <label>Attribuer à</label>
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                {collaborateurs.map(c => (
                  <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Lieu (optionnel)</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Bureau, Teams, Client..." />
          </div>
          <div className="field">
            <label>Description (optionnel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes..." style={{ resize: 'vertical' }} />
          </div>
          {type === 'time_entry' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={isTimeEntry} onChange={e => setIsTimeEntry(e.target.checked)} /> Créer aussi une saisie de temps ({heures}h)
            </label>
          )}
          <div className="modal-actions" style={{ justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
              {saving ? 'Enregistrement...' : '✓ Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────
export default function CalendrierPage() {
  const { user, profile } = useAuth()
  const { societeId } = useSociete()
  const [view, setView] = useState('Semaine de travail')
  const [baseDate, setBaseDate] = useState(new Date())
  const [collabs, setCollabs] = useState([])
  const [selectedCollabs, setSelectedCollabs] = useState(new Set())
  const [events, setEvents] = useState([])
  const [saisies, setSaisies] = useState([])
  const [outlookEvents, setOutlookEvents] = useState([])
  const [outlookSyncOn, setOutlookSyncOn] = useState(() => localStorage.getItem('tb_outlook_sync') === 'true')
  const [outlookLoading, setOutlookLoading] = useState(false)
  const [importingOutlook, setImportingOutlook] = useState(false)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterSearch, setFilterSearch] = useState('')
  const gridRef = useRef()
  const calBodyRef = useRef()
  const [hourH, setHourH] = useState(60)

  // Dynamic hour height to fit in viewport
  useEffect(() => {
    function calcHourH() {
      if (!calBodyRef.current) return
      const available = calBodyRef.current.clientHeight - 10 // minus small padding
      const h = Math.max(30, Math.floor(available / (END_H - START_H)))
      setHourH(h)
    }
    calcHourH()
    window.addEventListener('resize', calcHourH)
    return () => window.removeEventListener('resize', calcHourH)
  }, [])

  // Multi-calendrier toggles
  const [calSources, setCalSources] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tb_cal_sources') || '{}') } catch { return {} }
  })
  const showTB = calSources.tb !== false
  const showOutlook = calSources.outlook !== false && outlookSyncOn
  const showSaisies = calSources.saisies !== false

  function toggleSource(key) {
    setCalSources(prev => {
      const next = { ...prev, [key]: prev[key] === false ? true : false }
      localStorage.setItem('tb_cal_sources', JSON.stringify(next))
      return next
    })
  }

  // Monday of current week
  const monday = getMonday(baseDate)
  const numDays = view === 'Jour' ? 1 : view === 'Semaine de travail' ? DAYS_WORK : view === 'Semaine' ? DAYS_FULL : 0
  const days = view === 'Jour' ? [new Date(baseDate)] : Array.from({ length: numDays }, (_, i) => addDays(monday, i))

  // Load collaborateurs
  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_users_with_auth')
      if (data) {
        const parsed = data.filter(p => p.actif !== false).map(p => {
          const parts = (p.full_name || '').trim().split(/\s+/)
          return { ...p, prenom: parts[0] || '', nom: parts.slice(1).join(' ') || '' }
        })
        setCollabs(parsed)
        setSelectedCollabs(new Set([user?.id]))
      }
    }
    load()
  }, [user?.id])

  // Load events + saisies
  useEffect(() => {
    async function load() {
      if (!selectedCollabs.size) { setEvents([]); setSaisies([]); setLoading(false); return }
      setLoading(true)
      const startDate = toISO(days[0])
      const endDate = toISO(addDays(days[days.length - 1] || days[0], 1))
      const userIds = [...selectedCollabs]

      const [evRes, saisieRes] = await Promise.all([
        supabase.from('calendar_events').select('*').in('user_id', userIds).gte('start_time', startDate).lt('start_time', endDate),
        supabase.from('saisies_temps').select('*').in('user_id', userIds).gte('date', startDate).lt('date', endDate)
      ])

      setEvents((evRes.data || []).map(parseEventTime))
      setSaisies((saisieRes.data || []).map(parseSaisieTime))
      setLoading(false)
    }
    if (days.length > 0) load()
  }, [selectedCollabs, baseDate, view])

  // ── Sync Outlook ─────────────────────────────────────────────
  useEffect(() => {
    if (!outlookSyncOn || !days.length) { setOutlookEvents([]); return }
    async function syncOutlook() {
      try {
        setOutlookLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.provider_token
        if (!token) { console.warn('[Outlook] Pas de provider_token — reconnectez-vous via Microsoft'); setOutlookLoading(false); return }
        const startDate = days[0].toISOString()
        const endDate = addDays(days[days.length - 1] || days[0], 1).toISOString()
        const evts = await getOutlookEvents(token, startDate, endDate)
        // Convertir en format compatible CalendrierPage
        setOutlookEvents(evts.map(ev => ({
          id: `outlook_${ev.outlookId}`,
          outlookId: ev.outlookId,
          title: ev.title,
          startMin: ev.start ? ev.start.getHours() * 60 + ev.start.getMinutes() : 540,
          endMin: ev.end ? ev.end.getHours() * 60 + ev.end.getMinutes() : 600,
          date: ev.start ? toISO(ev.start) : toISO(new Date()),
          color: '#0078D4', // bleu Microsoft
          source: 'outlook',
          location: ev.location,
          description: ev.description,
          user_id: user?.id,
          isAllDay: ev.isAllDay,
        })))
      } catch (err) {
        console.error('[Outlook] Erreur sync:', err.message)
      } finally {
        setOutlookLoading(false)
      }
    }
    syncOutlook()
  }, [outlookSyncOn, baseDate, view, days.length])

  function toggleOutlookSync() {
    const next = !outlookSyncOn
    setOutlookSyncOn(next)
    localStorage.setItem('tb_outlook_sync', next ? 'true' : 'false')
    if (!next) setOutlookEvents([])
  }

  // ── Push event vers Outlook ──────────────────────────────────
  async function pushToOutlook(event) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.provider_token
      if (!token) { alert('Reconnectez-vous via Microsoft pour synchroniser'); return }
      const startDt = new Date(event.date || event.start_time)
      if (event.startMin) { startDt.setHours(Math.floor(event.startMin / 60), event.startMin % 60) }
      const endDt = new Date(event.date || event.end_time)
      if (event.endMin) { endDt.setHours(Math.floor(event.endMin / 60), event.endMin % 60) }
      await createOutlookEvent(token, {
        title: event.title,
        start: startDt,
        end: endDt,
        description: event.description || '',
        location: event.location || '',
      })
      alert('✅ Événement synchronisé vers Outlook !')
    } catch (err) {
      alert('Erreur sync Outlook: ' + err.message)
    }
  }

  // All displayable events (filtered by source toggles)
  const allEvents = useMemo(() => {
    const evs = []
    if (showTB) events.forEach(e => evs.push(e))
    if (showSaisies) saisies.forEach(s => { if (!events.find(e => e.id === s.id)) evs.push(s) })
    if (showOutlook) outlookEvents.forEach(o => evs.push(o))
    return evs
  }, [events, saisies, outlookEvents, showTB, showOutlook, showSaisies])

  // ── Import bulk Outlook → calendar_events ─────────────────
  async function importOutlookEvents() {
    if (!outlookEvents.length) { alert('Activez la sync Outlook et attendez le chargement des événements'); return }
    if (!confirm(`Importer ${outlookEvents.length} événement(s) Outlook dans le calendrier TimeBlast ?`)) return
    setImportingOutlook(true)
    try {
      let imported = 0
      for (const ev of outlookEvents) {
        if (ev.isAllDay) continue
        const startDt = new Date(ev.date + 'T00:00')
        startDt.setHours(Math.floor(ev.startMin / 60), ev.startMin % 60)
        const endDt = new Date(ev.date + 'T00:00')
        endDt.setHours(Math.floor(ev.endMin / 60), ev.endMin % 60)
        // Skip if already imported (check by outlookId in description)
        const marker = `[outlook:${ev.outlookId}]`
        const { data: exists } = await supabase.from('calendar_events').select('id').ilike('description', `%${marker}%`).limit(1)
        if (exists?.length) continue
        await supabase.from('calendar_events').insert({
          user_id: user?.id,
          societe_id: societeId,
          title: ev.title,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          event_type: 'meeting',
          location: ev.location || '',
          description: `${ev.description || ''}\n${marker}`.trim(),
          color: '#0078D4',
        })
        imported++
      }
      alert(`✅ ${imported} événement(s) importé(s) depuis Outlook`)
      setBaseDate(new Date(baseDate)) // refresh
    } catch (err) {
      alert('Erreur import: ' + err.message)
    } finally {
      setImportingOutlook(false)
    }
  }

  // Navigation
  function navigate(dir) {
    const d = new Date(baseDate)
    if (view === 'Jour') d.setDate(d.getDate() + dir)
    else if (view === 'Mois') d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setBaseDate(d)
  }

  function goToday() { setBaseDate(new Date()) }

  // Toggle collab
  function toggleCollab(id) {
    setSelectedCollabs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedCollabs(new Set(filteredCollabs.map(c => c.id))) }
  function selectNone() { setSelectedCollabs(new Set()) }

  // Color for user
  function userColor(uid) {
    const idx = collabs.findIndex(c => c.id === uid)
    return USER_COLORS[idx % USER_COLORS.length] || '#94a3b8'
  }

  function userName(uid) {
    const c = collabs.find(c => c.id === uid)
    return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : 'Inconnu'
  }

  function userInitials(uid) {
    const c = collabs.find(c => c.id === uid)
    return c ? `${(c.prenom || '')[0] || ''}${(c.nom || '')[0] || ''}`.toUpperCase() : '?'
  }

  // Click on grid to create event
  function handleGridClick(e, dayDate) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (e.currentTarget.scrollTop || 0)
    const startMin = clampMin(yToMin(y, hourH))
    const endMin = clampMin(startMin + 60)
    setModal({ date: toISO(dayDate), startMin, endMin, user_id: user?.id })
  }

  // Filtered collabs
  const filteredCollabs = collabs.filter(c => {
    if (!filterSearch) return true
    const full = `${c.prenom} ${c.nom} ${c.email}`.toLowerCase()
    return full.includes(filterSearch.toLowerCase())
  })

  // Events for a specific day
  function eventsForDay(dayISO) {
    return allEvents.filter(e => e.date === dayISO && selectedCollabs.has(e.user_id))
  }

  // ── MONTH VIEW ────────────────────────────────────────────
  function renderMonth() {
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = (firstDay.getDay() + 6) % 7
    const cells = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} style={{ background: '#f8fafc', padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b' }}>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} style={{ background: '#f8fafc', minHeight: 80 }} />
          const dayISO = toISO(date)
          const dayEvents = eventsForDay(dayISO)
          const today = isToday(date)
          return (
            <div key={dayISO} onClick={e => handleGridClick(e, date)}
              style={{ background: '#fff', minHeight: 80, padding: 4, cursor: 'pointer', position: 'relative' }}>
              <div style={{
                fontSize: 13, fontWeight: today ? 700 : 400, textAlign: 'right', marginBottom: 2,
                color: today ? '#fff' : '#1e293b', width: today ? 24 : 'auto', height: today ? 24 : 'auto',
                borderRadius: '50%', background: today ? '#2d6a4f' : 'none',
                display: today ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center',
                marginLeft: 'auto'
              }}>
                {date.getDate()}
              </div>
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} style={{
                  fontSize: 10, padding: '1px 4px', marginBottom: 1, borderRadius: 3,
                  background: userColor(ev.user_id) + '20', color: userColor(ev.user_id),
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 500
                }}>
                  {fmtTime(ev.startMin)} {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>+{dayEvents.length - 3}</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── WEEK/DAY VIEW ─────────────────────────────────────────
  function renderWeekDay() {
    const totalH = (END_H - START_H) * hourH
    const colWidth = days.length === 1 ? '100%' : `${100 / days.length}%`

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Day headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ width: 56, flexShrink: 0 }} />
          {days.map(d => {
            const { wd, num } = fmtDayHeader(d)
            const today = isToday(d)
            return (
              <div key={toISO(d)} style={{
                flex: 1, textAlign: 'center', padding: '8px 0', borderLeft: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: 11, color: today ? '#2d6a4f' : '#64748b', textTransform: 'uppercase', fontWeight: 500 }}>{wd}</div>
                <div style={{
                  fontSize: 22, fontWeight: 600, color: today ? '#fff' : '#1e293b',
                  width: 36, height: 36, borderRadius: '50%', background: today ? '#2d6a4f' : 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2
                }}>
                  {num}
                </div>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div ref={(el) => { gridRef.current = el; calBodyRef.current = el }} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', position: 'relative', minHeight: totalH }}>
            {/* Hour labels */}
            <div style={{ width: 56, flexShrink: 0 }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: hourH, fontSize: 11, color: '#94a3b8', textAlign: 'right', paddingRight: 8, paddingTop: -6 }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(d => {
              const dayISO = toISO(d)
              const dayEvents = eventsForDay(dayISO)

              // Group overlapping events
              const sorted = [...dayEvents].sort((a, b) => a.startMin - b.startMin)
              const positioned = []
              sorted.forEach(ev => {
                // Find column
                let col = 0
                const overlaps = positioned.filter(p => p.date === dayISO && p.startMin < ev.endMin && p.endMin > ev.startMin)
                const usedCols = overlaps.map(o => o._col)
                while (usedCols.includes(col)) col++
                const maxCols = Math.max(col + 1, ...overlaps.map(o => o._maxCols || 1))
                overlaps.forEach(o => { o._maxCols = maxCols })
                positioned.push({ ...ev, _col: col, _maxCols: maxCols })
              })

              return (
                <div key={dayISO} style={{
                  flex: 1, position: 'relative', borderLeft: '1px solid #e2e8f0', cursor: 'crosshair'
                }}
                  onClick={e => { if (e.target === e.currentTarget || e.target.classList.contains('hour-line')) handleGridClick(e, d) }}>
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} className="hour-line" style={{
                      position: 'absolute', top: (h - START_H) * hourH, left: 0, right: 0,
                      borderTop: '1px solid #f1f5f9', height: hourH, pointerEvents: 'none'
                    }} />
                  ))}

                  {/* Current time indicator */}
                  {isToday(d) && (() => {
                    const now = new Date()
                    const nowMin = now.getHours() * 60 + now.getMinutes()
                    if (nowMin >= START_H * 60 && nowMin <= END_H * 60) {
                      return (
                        <div style={{
                          position: 'absolute', top: minToY(nowMin, hourH), left: 0, right: 0,
                          height: 2, background: '#dc2626', zIndex: 5
                        }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%', background: '#dc2626',
                            position: 'absolute', left: -5, top: -4
                          }} />
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Events */}
                  {positioned.map(ev => {
                    const top = minToY(ev.startMin, hourH)
                    const height = Math.max(minToY(ev.endMin, hourH) - top, 16)
                    const isOutlook = ev.source === 'outlook'
                    const color = isOutlook ? '#0078D4' : userColor(ev.user_id)
                    const totalCols = ev._maxCols || 1
                    const width = `${85 / totalCols}%`
                    const left = `${(ev._col / totalCols) * 85 + 2}%`

                    return (
                      <div key={ev.id} title={`${isOutlook ? '📅 Outlook · ' : ''}${userName(ev.user_id)} - ${ev.title}\n${fmtTime(ev.startMin)} - ${fmtTime(ev.endMin)}`}
                        style={{
                          position: 'absolute', top, height, left, width, zIndex: 3,
                          background: isOutlook ? '#0078D412' : color + '18',
                          borderLeft: `3px solid ${color}`,
                          borderRadius: '0 6px 6px 0', padding: '3px 6px',
                          cursor: 'pointer', overflow: 'hidden', fontSize: 11,
                          transition: 'box-shadow .15s',
                          borderStyle: isOutlook ? 'dashed' : undefined,
                          borderRightStyle: isOutlook ? 'dashed' : undefined,
                          borderTopStyle: isOutlook ? 'dashed' : undefined,
                          borderBottomStyle: isOutlook ? 'dashed' : undefined,
                          borderRightWidth: isOutlook ? 1 : undefined,
                          borderTopWidth: isOutlook ? 1 : undefined,
                          borderBottomWidth: isOutlook ? 1 : undefined,
                          borderColor: isOutlook ? '#0078D450' : undefined,
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                        {isOutlook && (
                          <span style={{ fontSize: 9, marginRight: 3, opacity: .7 }}>📅</span>
                        )}
                        {!isOutlook && selectedCollabs.size > 1 && (
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: color,
                            color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', marginRight: 4, verticalAlign: 'middle'
                          }}>
                            {userInitials(ev.user_id)}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: isOutlook ? '#0078D4' : '#1e293b' }}>{ev.title}</span>
                        {height > 30 && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                            {fmtTime(ev.startMin)} - {fmtTime(ev.endMin)}
                            {ev.location ? ` · 📍${ev.location}` : ''}
                          </div>
                        )}
                        {height > 50 && ev.is_time_entry && !isOutlook && (
                          <div style={{ fontSize: 10, color: color, fontWeight: 600, marginTop: 2 }}>
                            ⏱ {ev.heures || ev.duree_heures || ''}h
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────
  const titleText = view === 'Mois' ? fmtMonthYear(baseDate) :
    view === 'Jour' ? baseDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) :
      `${days[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${days[days.length - 1]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="admin-page" style={{ display: 'flex', gap: 0, height: 'calc(100vh - 140px)', overflow: 'hidden', margin: '5px 0 40px 0' }}>
      {/* ── Sidebar gauche : collaborateurs ── */}
      <div style={{
        width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 14px 8px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#1e293b' }}>👥 Collaborateurs</h3>
          <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            placeholder="Rechercher..." style={{
              width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: 12, outline: 'none', boxSizing: 'border-box'
            }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={selectAll} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Tous</button>
            <button onClick={selectNone} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Aucun</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {filteredCollabs.map(c => {
            const color = userColor(c.id)
            const checked = selectedCollabs.has(c.id)
            const isMe = c.id === user?.id
            return (
              <label key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: checked ? color + '08' : 'transparent',
                transition: 'background .15s'
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggleCollab(c.id)}
                  style={{ accentColor: color }} />
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: color,
                  color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {`${(c.prenom || '')[0] || ''}${(c.nom || '')[0] || ''}`.toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: isMe ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.prenom} {c.nom} {isMe && <span style={{ color: '#94a3b8', fontSize: 10 }}>(moi)</span>}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
        {/* ── Multi-calendrier ── */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#1e293b' }}>📅 Calendriers</h3>
          {[
            { key: 'tb', label: 'TimeBlast', color: '#6366f1', icon: '⚙️', count: events.length, active: showTB },
            { key: 'outlook', label: 'Outlook', color: '#0078D4', icon: '📧', count: outlookEvents.length, active: showOutlook, needsSync: !outlookSyncOn },
            { key: 'saisies', label: 'Saisies temps', color: '#16a34a', icon: '⏱', count: saisies.length, active: showSaisies },
          ].map(cal => (
            <label key={cal.key} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px',
              borderRadius: 6, cursor: 'pointer', fontSize: 12,
              background: cal.active ? cal.color + '08' : 'transparent',
              opacity: cal.needsSync ? 0.5 : 1,
            }}>
              <input type="checkbox"
                checked={cal.key === 'outlook' ? outlookSyncOn && calSources.outlook !== false : calSources[cal.key] !== false}
                onChange={() => {
                  if (cal.key === 'outlook' && !outlookSyncOn) { toggleOutlookSync(); return }
                  toggleSource(cal.key)
                }}
                style={{ accentColor: cal.color }} />
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: cal.color, flexShrink: 0
              }} />
              <span style={{ flex: 1 }}>{cal.icon} {cal.label}</span>
              <span style={{ color: '#94a3b8', fontSize: 10 }}>{cal.count}</span>
            </label>
          ))}
          {/* Import Outlook button */}
          {outlookSyncOn && outlookEvents.length > 0 && (
            <button onClick={importOutlookEvents} disabled={importingOutlook}
              style={{
                marginTop: 8, width: '100%', padding: '6px 10px', borderRadius: 6,
                border: '1px solid #0078D4', background: '#0078D408', color: '#0078D4',
                cursor: 'pointer', fontSize: 11, fontWeight: 500,
              }}>
              {importingOutlook ? '⟳ Import en cours...' : `📥 Importer ${outlookEvents.length} événements Outlook`}
            </button>
          )}
        </div>
        {/* Stats */}
        <div style={{
          padding: '10px 14px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b',
          display: 'flex', justifyContent: 'space-between'
        }}>
          <span>{selectedCollabs.size} sélectionné{selectedCollabs.size > 1 ? 's' : ''}</span>
          <span>{allEvents.length} événement{allEvents.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px',
          borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={goToday} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500
            }}>Aujourd'hui</button>
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={() => navigate(-1)} style={{ padding: '4px 10px', borderRadius: '6px 0 0 6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 16 }}>‹</button>
              <button onClick={() => navigate(1)} style={{ padding: '4px 10px', borderRadius: '0 6px 6px 0', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 16 }}>›</button>
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, textTransform: 'capitalize' }}>{titleText}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View switcher */}
            <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {VIEWS.map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: view === v ? 600 : 400,
                  background: view === v ? '#2d6a4f' : '#fff', color: view === v ? '#fff' : '#475569'
                }}>{v}</button>
              ))}
            </div>
            {/* Indicateur Outlook */}
            {outlookSyncOn && (
              <div style={{
                padding: '4px 10px', borderRadius: 6, background: '#0078D410', border: '1px solid #0078D430',
                fontSize: 11, color: '#0078D4', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4
              }}>
                {outlookLoading ? '⟳ Sync...' : `📧 Outlook (${outlookEvents.length})`}
              </div>
            )}
            <button onClick={() => setModal({ date: toISO(new Date()), startMin: 9 * 60, endMin: 10 * 60, user_id: user?.id })}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                background: '#2d6a4f', color: '#fff', fontWeight: 600
              }}>
              + Nouvel événement
            </button>
          </div>
        </div>

        {/* Calendar body */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
          {loading ? (
            <Spinner />
          ) : view === 'Mois' ? (
            <div style={{ padding: 20, overflowY: 'auto', height: '100%' }}>
              {renderMonth()}
            </div>
          ) : (
            renderWeekDay()
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal event={modal} onClose={() => setModal(null)} onSaved={() => {
          // Refresh
          setBaseDate(new Date(baseDate))
        }} userId={user?.id} societeId={societeId} collaborateurs={collabs} />
      )}
    </div>
  )
}
