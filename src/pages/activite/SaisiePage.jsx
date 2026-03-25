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

// ── Couleurs collaborateurs ──────────────────────────────────
const COLLAB_COLORS = ['#6366f1','#0ea5e9','#16a34a','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316','#dc2626','#0891b2']
function collabColor(idx) { return COLLAB_COLORS[idx % COLLAB_COLORS.length] }

// ── Page principale ──────────────────────────────────────────
export default function SaisiePage() {
  const { profile, user } = useAuth()
  const { selectedSociete } = useSociete()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [events, setEvents] = useState({})
  const [loading, setLoading] = useState(true)
  const [dragPreview, setDragPreview] = useState(null)
  const [movingEvent, setMovingEvent] = useState(null)
  const movingRef = useRef(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [newEvent, setNewEvent] = useState(null)

  // Multi-collaborateur
  const [collabs, setCollabs] = useState([])
  const [selectedCollabs, setSelectedCollabs] = useState(new Set())
  const [collabSearch, setCollabSearch] = useState('')
  const [showCollabPanel, setShowCollabPanel] = useState(false)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Charger collaborateurs equipe + profiles
  const [profilesList, setProfilesList] = useState([])

  useEffect(() => {
    async function loadCollabs() {
      // Charger les deux : equipe (pour la sidebar) et profiles (pour mapper les events)
      let equipeQuery = supabase.from('equipe').select('id, prenom, nom, email, poste').order('nom')
      if (selectedSociete?.id) equipeQuery = equipeQuery.eq('societe_id', selectedSociete.id)
      const [equipeRes, profilesRes] = await Promise.all([
        equipeQuery,
        supabase.from('profiles').select('id, full_name, role')
      ])

      const equipeData = equipeRes.data || []
      const profilesData = profilesRes.data || []
      setProfilesList(profilesData)

      if (equipeData.length > 0) {
        setCollabs(equipeData)
        // Par défaut : seulement l'utilisateur connecté (matcher par email/nom)
        const me = equipeData.find(c =>
          (c.email && c.email.toLowerCase() === (profile?.email || user?.email || '').toLowerCase()) ||
          (c.nom && profile?.full_name && c.nom.toLowerCase() === profile.full_name.split(' ').pop()?.toLowerCase())
        )
        setSelectedCollabs(new Set(me ? [me.id] : [equipeData[0]?.id]))
      } else {
        // Fallback profiles
        const mapped = profilesData.map(p => {
          const parts = (p.full_name || '').trim().split(/\s+/)
          return { id: p.id, prenom: parts[0] || '', nom: parts.slice(1).join(' ') || '', email: '', poste: p.role }
        })
        setCollabs(mapped)
        setSelectedCollabs(new Set(mapped.map(c => c.id)))
      }
    }
    loadCollabs()
  }, [profile?.id, selectedSociete?.id])

  function toggleCollab(id) {
    setSelectedCollabs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function collabInfo(uid) {
    const c = collabs.find(c => c.id === uid)
    return c ? { name: `${c.prenom || ''} ${c.nom || ''}`.trim(), initials: `${(c.prenom || '')[0] || ''}${(c.nom || '')[0] || ''}`.toUpperCase() } : { name: 'Inconnu', initials: '?' }
  }
  function collabColorForId(uid) {
    const idx = collabs.findIndex(c => c.id === uid)
    return collabColor(idx >= 0 ? idx : 0)
  }

  // Mapping profile_id → equipe collab (par nom)
  function mapProfileToCollab(profileId) {
    const p = profilesList.find(pr => pr.id === profileId)
    if (!p) return null
    const parts = (p.full_name || '').trim().split(/\s+/)
    const prenom = (parts[0] || '').toLowerCase()
    const nom = (parts.slice(1).join(' ') || parts[0] || '').toLowerCase()
    return collabs.find(c =>
      (c.nom || '').toLowerCase() === nom ||
      (c.prenom || '').toLowerCase() === prenom ||
      c.id === profileId // direct match si fallback profiles
    )
  }

  const fetchWeek = useCallback(async () => {
    setLoading(true)

    if (!profile?.id) { setEvents({}); setLoading(false); return }
    const startISO = toISO(weekStart)
    const endISO = toISO(addDays(weekStart, 6))

    // Charger les saisies de temps de l'utilisateur connecté
    const { data: saisiesData } = await supabase
      .from('saisies_temps')
      .select('id, date, heures, commentaire, user_id')
      .eq('user_id', profile.id)
      .gte('date', startISO)
      .lte('date', endISO)

    // Charger TOUS les événements calendrier de la société
    let calQuery = supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startISO)
      .lt('start_time', toISO(addDays(weekStart, 7)))
    if (selectedSociete?.id) calQuery = calQuery.eq('societe_id', selectedSociete.id)
    const { data: calData } = await calQuery

    const map = {}

    // Saisies de temps
    for (const s of (saisiesData || [])) {
      const dateKey = s.date
      if (!map[dateKey]) map[dateKey] = []
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
        _source: 'saisie',
      })
    }

    // Événements calendrier — tous affichés, mappés vers equipe pour coloration
    for (const ev of (calData || [])) {
      const matchedCollab = mapProfileToCollab(ev.user_id)
      const start = new Date(ev.start_time)
      const end = new Date(ev.end_time)
      const dateKey = toISO(start)
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push({
        id: ev.id,
        date: dateKey,
        heures: ev.duree_heures || Math.round((end - start) / 3600000 * 10) / 10,
        startMin: start.getHours() * 60 + start.getMinutes(),
        endMin: end.getHours() * 60 + end.getMinutes(),
        projets: { id: ev.projet_id, name: ev.title },
        noteText: ev.description,
        user_id: matchedCollab?.id || ev.user_id,
        _profileId: ev.user_id,
        _collabName: matchedCollab ? `${matchedCollab.prenom} ${matchedCollab.nom}` : null,
        event_type: ev.event_type,
        location: ev.location,
        color: ev.color,
        _source: 'calendar',
      })
    }

    setEvents(map)
    setLoading(false)
  }, [profile?.id, weekStart, selectedSociete?.id, collabs, profilesList])

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

  // ── Drag-to-move existing event ────────────────────────────
  function handleEventDragStart(e, ev, colEl) {
    e.stopPropagation()
    e.preventDefault()
    const rect = colEl.getBoundingClientRect()
    const offsetY = e.clientY - rect.top - minToY(ev.startMin)
    const duration = ev.endMin - ev.startMin
    const wdISO = weekDates.map(d => toISO(d))

    movingRef.current = { ev, date: ev.date, startMin: ev.startMin, endMin: ev.endMin }
    setMovingEvent(movingRef.current)

    const onMove = (me) => {
      const cols = document.querySelectorAll('.cal-col')
      let targetDate = ev.date
      let targetCol = colEl
      for (let i = 0; i < cols.length; i++) {
        const cr = cols[i].getBoundingClientRect()
        if (me.clientX >= cr.left && me.clientX <= cr.right) {
          targetDate = wdISO[i] || targetDate
          targetCol = cols[i]
          break
        }
      }
      const tr = targetCol.getBoundingClientRect()
      const newStart = clampMin(yToMin30(me.clientY - tr.top - offsetY))
      const newEnd = clampMin(newStart + duration)
      movingRef.current = { ev, date: targetDate, startMin: newStart, endMin: newEnd }
      setMovingEvent({ ...movingRef.current })
    }

    const onUp = async () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const m = movingRef.current
      movingRef.current = null
      if (!m) { setMovingEvent(null); return }
      const heures = Math.round((m.endMin - m.startMin) / 60 * 10) / 10
      const meta = JSON.stringify({
        projet_id: ev.projets?.id,
        projet_name: ev.projets?.name,
        h_debut: fmtTime(m.startMin),
        h_fin: fmtTime(m.endMin),
        note: ev.noteText || null,
      })
      await supabase.from('saisies_temps').update({
        date: m.date,
        heures,
        commentaire: meta,
      }).eq('id', ev.id)
      setMovingEvent(null)
      fetchWeek()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const totalWeek = Object.values(events).flat().reduce((s, e) => s + (e.heures || 0), 0)

  const filteredCollabs = collabs.filter(c => {
    if (!collabSearch) return true
    return `${c.prenom} ${c.nom} ${c.email}`.toLowerCase().includes(collabSearch.toLowerCase())
  })

  return (
    <div className="admin-page cal-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1>📅 Calendrier</h1>
          <p style={{ textTransform: 'capitalize' }}>{fmtMonthYear(weekStart)} · {totalWeek > 0 ? `${totalWeek}h cette semaine` : 'Aucune saisie'}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <WeekStatusBar userId={profile?.id || 'unknown'} mondayISO={toISO(weekStart)} userRole={profile?.role} />
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, -7))}>← Préc.</button>
          <button className="btn-secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, 7))}>Suiv. →</button>
          <button className="btn-secondary" title="Exporter la semaine en CSV" onClick={() => exportCSV(weekDates, events)}>↓ CSV</button>
        </div>
      </div>

      {/* Corps : sidebar collabs + calendrier + panel détail */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Sidebar collaborateurs ── */}
        <div style={{
          width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>👥 Collaborateurs</div>
            <input type="text" value={collabSearch} onChange={e => setCollabSearch(e.target.value)}
              placeholder="Rechercher..." style={{
                width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                fontSize: 12, outline: 'none', boxSizing: 'border-box'
              }} />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button onClick={() => setSelectedCollabs(new Set(collabs.map(c => c.id)))}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Tous</button>
              <button onClick={() => setSelectedCollabs(new Set([profile?.id]))}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Moi</button>
              <button onClick={() => setSelectedCollabs(new Set())}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Aucun</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
            {filteredCollabs.map(c => {
              const color = collabColor(collabs.indexOf(c))
              const checked = selectedCollabs.has(c.id)
              const isMe = c.id === profile?.id
              return (
                <label key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px',
                  borderRadius: 6, cursor: 'pointer', fontSize: 12,
                  background: checked ? color + '10' : 'transparent'
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCollab(c.id)}
                    style={{ accentColor: color, width: 14, height: 14 }} />
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: color,
                    color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {`${(c.prenom || '')[0] || ''}${(c.nom || '')[0] || ''}`.toUpperCase()}
                  </div>
                  <span style={{ fontWeight: isMe ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.prenom} {c.nom} {isMe && <span style={{ color: '#94a3b8', fontSize: 9 }}>(moi)</span>}
                  </span>
                </label>
              )
            })}
          </div>
          <div style={{ padding: '6px 10px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            {selectedCollabs.size} sélectionné{selectedCollabs.size > 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Zone calendrier ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div className="cal-grid-wrap" style={{ flex: 1 }}>
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

                {/* Événements — côte à côte quand ils se chevauchent */}
                {!loading && (() => {
                  // Calculer les colonnes pour les événements qui se chevauchent
                  const sorted = [...dayEvents].sort((a, b) => a.startMin - b.startMin)
                  const positioned = []
                  sorted.forEach(ev => {
                    let col = 0
                    const overlaps = positioned.filter(p => p.startMin < ev.endMin && p.endMin > ev.startMin)
                    const usedCols = overlaps.map(o => o._col)
                    while (usedCols.includes(col)) col++
                    const maxCols = Math.max(col + 1, ...overlaps.map(o => o._maxCols || 1))
                    overlaps.forEach(o => { o._maxCols = maxCols })
                    positioned.push({ ...ev, _col: col, _maxCols: maxCols })
                  })
                  // Deuxième passe pour propager maxCols
                  positioned.forEach(ev => {
                    const overlaps = positioned.filter(p => p !== ev && p.startMin < ev.endMin && p.endMin > ev.startMin)
                    const maxCols = Math.max(ev._col + 1, ...overlaps.map(o => o._col + 1), ev._maxCols || 1)
                    ev._maxCols = maxCols
                    overlaps.forEach(o => { o._maxCols = maxCols })
                  })

                  return positioned.map(ev => {
                    const isMoving = movingEvent?.ev?.id === ev.id
                    const top = minToY(ev.startMin)
                    const height = Math.max(20, minToY(ev.endMin) - top)
                    const isMulti = selectedCollabs.size > 1
                    const color = isMulti ? collabColorForId(ev.user_id) : (ev.color || colorFor(ev.projets?.id))
                    const info = collabInfo(ev.user_id)
                    const isOther = ev._profileId ? ev._profileId !== profile?.id : ev.user_id !== profile?.id
                    const totalCols = ev._maxCols || 1
                    const colWidth = (96 - 2) / totalCols
                    const colLeft = 2 + ev._col * colWidth

                    return (
                      <div key={ev.id} className="cal-event"
                        style={{
                          top, height, background: color + '22', borderLeftColor: color,
                          opacity: isMoving ? 0.3 : isOther ? 0.85 : 1,
                          cursor: isOther ? 'default' : 'grab',
                          left: `${colLeft}%`, right: 'auto', width: `${colWidth - 1}%`,
                        }}
                        onMouseDown={e => !isOther && handleEventDragStart(e, ev, e.currentTarget.parentElement)}
                        onClick={e => { e.stopPropagation(); if (!movingEvent) setSelectedEvent(ev) }}
                      >
                        <div className="cal-event-title" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          {isMulti && (
                            <span style={{
                              width: 14, height: 14, borderRadius: '50%', background: color,
                              color: '#fff', fontSize: 7, fontWeight: 700, display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>{info.initials}</span>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.projets?.name || ev.title || '—'}</span>
                        </div>
                        <div className="cal-event-time">{fmtTime(ev.startMin)}–{fmtTime(ev.endMin)}{ev.location ? ` · ${ev.location}` : ''}</div>
                      </div>
                    )
                  })
                })()}

                {/* Ghost de l'événement en cours de déplacement */}
                {movingEvent && movingEvent.date === iso && (
                  <div className="cal-event cal-event--moving"
                    style={{
                      top: minToY(movingEvent.startMin),
                      height: Math.max(20, minToY(movingEvent.endMin) - minToY(movingEvent.startMin)),
                      background: colorFor(movingEvent.ev.projets?.id) + '44',
                      borderLeftColor: colorFor(movingEvent.ev.projets?.id),
                      pointerEvents: 'none',
                    }}
                  >
                    <div className="cal-event-title">{movingEvent.ev.projets?.name || '—'}</div>
                    <div className="cal-event-time">{fmtTime(movingEvent.startMin)}–{fmtTime(movingEvent.endMin)}</div>
                  </div>
                )}

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
        </div>{/* fin zone calendrier */}

        {/* ── Panel détail événement à droite ── */}
        {selectedEvent && (
          <div style={{
            width: 320, flexShrink: 0, background: '#fff', borderLeft: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: selectedEvent.color || collabColorForId(selectedEvent.user_id) || colorFor(selectedEvent.projets?.id)
                  }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {selectedEvent.projets?.name || selectedEvent.title || '—'}
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {new Date(selectedEvent.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', padding: 0
              }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Horaires */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#f8fafc', borderRadius: 8
              }}>
                <span style={{ fontSize: 20 }}>🕐</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {fmtTime(selectedEvent.startMin)} – {fmtTime(selectedEvent.endMin)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {Math.round((selectedEvent.endMin - selectedEvent.startMin) / 60 * 10) / 10}h
                  </div>
                </div>
              </div>

              {/* Collaborateur */}
              {(() => {
                const info = collabInfo(selectedEvent.user_id)
                const color = collabColorForId(selectedEvent.user_id)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: color,
                      color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>{info.initials}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{info.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {selectedEvent.user_id === profile?.id ? 'Vous' : 'Collaborateur'}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Type */}
              {selectedEvent.event_type && selectedEvent.event_type !== 'time_entry' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 20 }}>
                    {selectedEvent.event_type === 'meeting' ? '📅' : selectedEvent.event_type === 'call' ? '📞' : selectedEvent.event_type === 'task' ? '✅' : selectedEvent.event_type === 'break' ? '☕' : selectedEvent.event_type === 'travel' ? '🚗' : '📌'}
                  </span>
                  <div style={{ fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>
                    {selectedEvent.event_type === 'meeting' ? 'Réunion' : selectedEvent.event_type === 'call' ? 'Appel' : selectedEvent.event_type === 'task' ? 'Tâche' : selectedEvent.event_type === 'break' ? 'Pause' : selectedEvent.event_type === 'travel' ? 'Déplacement' : selectedEvent.event_type}
                  </div>
                </div>
              )}

              {/* Lieu */}
              {selectedEvent.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 20 }}>📍</span>
                  <div style={{ fontSize: 13 }}>{selectedEvent.location}</div>
                </div>
              )}

              {/* Description / Note */}
              {(selectedEvent.noteText || selectedEvent.description) && (
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>DESCRIPTION</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {selectedEvent.noteText || selectedEvent.description}
                  </div>
                </div>
              )}

              {/* Heures */}
              {selectedEvent.heures > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: 20 }}>⏱</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#166534' }}>{selectedEvent.heures}h saisies</div>
                    <div style={{ fontSize: 11, color: '#16a34a' }}>Temps facturable</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedEvent.user_id === profile?.id && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, fontSize: 12 }}
                  onClick={() => { const ev = selectedEvent; setSelectedEvent(null); setSelectedEvent(ev) }}>
                  ✏️ Modifier
                </button>
                <button className="btn-danger" style={{ fontSize: 12 }}
                  onClick={() => { handleDeleteEvent(selectedEvent.id); setSelectedEvent(null) }}>
                  🗑️
                </button>
              </div>
            )}
          </div>
        )}

      </div>{/* fin corps flex */}

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
    </div>
  )
}
