import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import MiniCalendar from '../../components/MiniCalendar'

const PRIORITY_CONFIG = {
  haute:   { label: 'Haute',   color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  moyenne: { label: 'Moyenne', color: '#f59e0b', bg: '#fffbeb', icon: '🟡' },
  basse:   { label: 'Basse',   color: '#16a34a', bg: '#f0fdf4', icon: '🟢' },
}

export default function TaskDetailPage() {
  const { projetId, taskId } = useParams()
  const navigate = useNavigate()
  const { setSegments, clearSegments } = useBreadcrumb() || {}

  const [projet, setProjet] = useState(null)
  const [tasks, setTasks] = useState([])
  const [columns, setColumns] = useState([])
  const [members, setMembers] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Selected task form
  const [form, setForm] = useState({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '', column_id: '' })

  useEffect(() => { loadAll() }, [projetId])
  useEffect(() => () => clearSegments?.(), [])

  async function loadAll() {
    setLoading(true)
    try {
      const [projRes, tksRes, colsRes, memsRes] = await Promise.all([
        supabase.from('projets').select('*').eq('id', projetId).single(),
        supabase.from('kanban_tasks').select('*, profiles:assigned_to(full_name)').eq('projet_id', projetId).order('created_at', { ascending: false }),
        supabase.from('kanban_columns').select('*').eq('projet_id', projetId).order('"order"'),
        supabase.from('profiles').select('id, full_name'),
      ])
      const proj = projRes?.data
      const tks = tksRes?.data || []
      const cols = colsRes?.data || []
      const mems = memsRes?.data || []
      setProjet(proj)
      setTasks(tks)
      setColumns(cols)
      setMembers(mems)
      // Time entries
      try {
        const taskIds = tks.map(t => t.id)
        if (taskIds.length > 0) {
          const { data: te } = await supabase.from('kanban_time_entries').select('*').in('task_id', taskIds)
          setTimeEntries(te || [])
        }
      } catch (e) { /* table might not exist */ }
    } catch (err) {
      console.error('TaskDetailPage loadAll error:', err)
    }
    setLoading(false)

    if (proj && setSegments) {
      setSegments([
        { id: projetId, label: proj.name },
        ...(taskId ? [{ label: 'Taches' }] : []),
      ])
    }

    // If a specific task is selected, load its form
    if (taskId && tks) {
      const task = tks.find(t => t.id === taskId)
      if (task) {
        setForm({
          title: task.title || '',
          assigned_to: task.assigned_to || '',
          priority: task.priority || 'moyenne',
          estimated_hours: task.estimated_hours || '',
          due_date: task.due_date || '',
          column_id: task.column_id || '',
        })
      }
    }
  }

  const selectedTask = taskId ? tasks.find(t => t.id === taskId) : null

  // Time by task
  const timeByTask = useMemo(() => {
    const map = {}
    for (const te of timeEntries) {
      map[te.task_id] = (map[te.task_id] || 0) + (te.hours || 0)
    }
    return map
  }, [timeEntries])

  // Column map
  const colMap = useMemo(() => {
    const map = {}
    for (const c of columns) map[c.id] = c.name
    return map
  }, [columns])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(tasks, 'created_at', 'desc')

  async function handleSave(e) {
    e.preventDefault()
    if (!selectedTask) return
    setSaving(true)
    await supabase.from('kanban_tasks').update({
      title: form.title,
      assigned_to: form.assigned_to || null,
      priority: form.priority,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : 0,
      due_date: form.due_date || null,
      column_id: form.column_id || selectedTask.column_id,
    }).eq('id', selectedTask.id)
    setSaving(false)
    loadAll()
  }

  async function handleDelete(id) {
    await supabase.from('kanban_tasks').delete().eq('id', id)
    if (id === taskId) navigate(`/activite/projets/${projetId}/taches/all`)
    else loadAll()
  }

  function selectTask(task) {
    navigate(`/activite/projets/${projetId}/taches/${task.id}`)
    setForm({
      title: task.title || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority || 'moyenne',
      estimated_hours: task.estimated_hours || '',
      due_date: task.due_date || '',
      column_id: task.column_id || '',
    })
  }

  if (loading) return <div className="admin-page"><div className="loading-inline">Chargement...</div></div>
  if (!projet) return <div className="admin-page"><p className="empty-state">Projet introuvable.</p></div>

  const fmtD = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  return (
    <div className="admin-page admin-page--full">
      <div className="admin-page-header">
        <div>
          <h1>Taches du projet {projet.name}</h1>
          <p>{tasks.length} tache{tasks.length > 1 ? 's' : ''}
            <button onClick={() => navigate(`/activite/projets/${projetId}`)}
              style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
              ← Retour au Kanban
            </button>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1fr 400px' : '1fr', gap: '1.5rem', marginTop: '1rem' }}>
        {/* LEFT: Task list */}
        <div>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <SortableHeader label="Tache" field="title" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Colonne" field="column_id" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Priorite" field="priority" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Assigne" field="assigned_to" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Heures" field="estimated_hours" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Echeance" field="due_date" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sortedData.map(task => {
                  const p = PRIORITY_CONFIG[task.priority || 'moyenne']
                  const spent = timeByTask[task.id] || 0
                  const est = parseFloat(task.estimated_hours || 0)
                  const isSelected = task.id === taskId
                  return (
                    <tr key={task.id}
                      style={{ cursor: 'pointer', background: isSelected ? '#dbeafe' : undefined }}
                      onClick={() => selectTask(task)}
                    >
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar" style={{ background: p.color, fontSize: '.6rem' }}>{p.icon}</span>
                          <span className="user-name">{task.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: '#475569', background: '#f1f5f9' }}>
                          {colMap[task.column_id] || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: p.color, background: p.bg }}>
                          {p.label}
                        </span>
                      </td>
                      <td>{task.profiles?.full_name || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.85rem' }}>
                        {est > 0 ? (
                          <span style={{ color: spent > est ? '#dc2626' : 'var(--text)' }}>{spent.toFixed(1)}h / {est}h</span>
                        ) : '—'}
                      </td>
                      <td className="date-cell">{fmtD(task.due_date)}</td>
                    </tr>
                  )
                })}
                {tasks.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Aucune tache.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Task detail / edit */}
        {selectedTask && (
          <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem', alignSelf: 'flex-start', position: 'sticky', top: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Modifier la tache</h2>
              <button onClick={() => navigate(`/activite/projets/${projetId}/taches/all`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="field">
                <label>Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Colonne</label>
                <select value={form.column_id} onChange={e => setForm(f => ({ ...f, column_id: e.target.value }))}>
                  {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Assigne a</label>
                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                  <option value="">— Non assigne —</option>
                  {members.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div className="field">
                  <label>Priorite</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
                <div className="field">
                  <label>Heures estimees</label>
                  <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Echeance</label>
                <MiniCalendar value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} placeholder="Date" />
              </div>

              {/* Temps passe */}
              {(() => {
                const spent = timeByTask[selectedTask.id] || 0
                const est = parseFloat(selectedTask.estimated_hours || 0)
                return (spent > 0 || est > 0) ? (
                  <div style={{ background: 'var(--hover-bg, #f1f5f9)', borderRadius: 8, padding: '.6rem .85rem', fontSize: '.82rem' }}>
                    <span style={{ fontWeight: 600 }}>Temps passe :</span>{' '}
                    <span style={{ color: spent > est && est > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{spent.toFixed(1)}h</span>
                    {est > 0 && <span style={{ color: 'var(--text-muted)' }}> / {est}h</span>}
                  </div>
                ) : null
              })()}

              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'space-between', marginTop: '.5rem' }}>
                <button type="button"
                  onClick={() => handleDelete(selectedTask.id)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
                  Supprimer
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
