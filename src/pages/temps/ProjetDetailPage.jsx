import { useState, useEffect, useMemo } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'
import MiniCalendar from '../../components/MiniCalendar'
import Spinner from '../../components/Spinner'

const DEFAULT_COLUMNS = [
  { name: 'À faire', order: 0 },
  { name: 'En cours', order: 1 },
  { name: 'À tester', order: 2 },
  { name: 'Terminé', order: 3 },
  { name: 'Reporter', order: 4 },
]

const PRIORITY_CONFIG = {
  haute:   { label: 'Haute',   color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  moyenne: { label: 'Moyenne', color: '#f59e0b', bg: '#fffbeb', icon: '🟡' },
  basse:   { label: 'Basse',   color: '#16a34a', bg: '#f0fdf4', icon: '🟢' }}

export default function ProjetDetailPage({ projet, onBack }) {
  const { user } = useAuth()
  const navigate = useEnvNavigate()
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [members, setMembers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // View mode
  const [view, setView] = useState('kanban') // 'kanban' | 'dashboard'
  const [filterMember, setFilterMember] = useState('all')

  // Forms
  const [showTaskForm, setShowTaskForm] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '' })
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [showColForm, setShowColForm] = useState(false)
  const [newColName, setNewColName] = useState('')

  // Time entry
  const [showTimeForm, setShowTimeForm] = useState(null) // task id
  const [timeForm, setTimeForm] = useState({ hours: '', note: '', date: new Date().toISOString().slice(0, 10) })

  // Edit
  const [editingCol, setEditingCol] = useState(null)
  const [editColName, setEditColName] = useState('')
  const [editingTask, setEditingTask] = useState(null)

  // Delete
  const [deleteCol, setDeleteCol] = useState(null)

  // Drag
  const [draggedTask, setDraggedTask] = useState(null)

  useEffect(() => { fetchAll() }, [projet.id])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchColumns(), fetchTasks(), fetchTimeEntries(), fetchMembers(), fetchAllUsers()])
    setLoading(false)
  }

  async function fetchColumns() {
    const { data, error } = await supabase.from('kanban_columns').select('*').eq('projet_id', projet.id).order('order')
    if (error) {
      console.error('Erreur chargement colonnes:', error.message)
      // Table might not exist — use local defaults as fallback
      setColumns(DEFAULT_COLUMNS.map((c, i) => ({ id: `local-${i}`, ...c, projet_id: projet.id })))
      return
    }
    if (data && data.length > 0) {
      setColumns(data)
    } else {
      const toInsert = DEFAULT_COLUMNS.map(c => ({ projet_id: projet.id, name: c.name, order: c.order }))
      const { data: inserted, error: insertErr } = await supabase.from('kanban_columns').insert(toInsert).select()
      if (insertErr) {
        console.error('Erreur création colonnes:', insertErr.message)
        setColumns(DEFAULT_COLUMNS.map((c, i) => ({ id: `local-${i}`, ...c, projet_id: projet.id })))
      } else {
        setColumns(inserted || [])
      }
    }
  }

  async function fetchTasks() {
    const { data } = await supabase.from('kanban_tasks').select('*, profiles:assigned_to(full_name)').eq('projet_id', projet.id).order('created_at')
    setTasks(data || [])
  }

  async function fetchTimeEntries() {
    const { data } = await supabase.from('kanban_time_entries').select('*, profiles:user_id(full_name)').eq('task_id', 'in.(select id from kanban_tasks where projet_id = \'' + projet.id + '\')') // Fallback below
    // Use a simpler approach: fetch all tasks' time entries
    const { data: taskIds } = await supabase.from('kanban_tasks').select('id').eq('projet_id', projet.id)
    if (taskIds && taskIds.length > 0) {
      const ids = taskIds.map(t => t.id)
      const { data: entries } = await supabase.from('kanban_time_entries').select('*, profiles:user_id(full_name)').in('task_id', ids).order('date', { ascending: false })
      setTimeEntries(entries || [])
    } else {
      setTimeEntries([])
    }
  }

  async function fetchMembers() {
    const { data } = await supabase.from('projet_members').select('*, profiles(id, full_name, role)').eq('projet_id', projet.id)
    setMembers(data || [])
  }

  async function fetchAllUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['collaborateur', 'manager', 'admin']).order('full_name')
    setAllUsers(data || [])
  }

  // ── Column actions ──
  async function handleAddColumn(e) {
    e.preventDefault()
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.order), -1)
    await supabase.from('kanban_columns').insert({ projet_id: projet.id, name: newColName, order: maxOrder + 1 })
    setNewColName(''); setShowColForm(false); fetchColumns()
  }

  async function handleRenameColumn(col) {
    if (editColName.trim() && editColName !== col.name) {
      await supabase.from('kanban_columns').update({ name: editColName.trim() }).eq('id', col.id)
      fetchColumns()
    }
    setEditingCol(null)
  }

  async function handleDeleteColumn() {
    if (!deleteCol) return
    await supabase.from('kanban_tasks').delete().eq('column_id', deleteCol.id)
    await supabase.from('kanban_columns').delete().eq('id', deleteCol.id)
    setDeleteCol(null); fetchColumns(); fetchTasks()
  }

  // ── Task actions ──
  async function handleCreateTask(e, columnId) {
    e.preventDefault()
    await supabase.from('kanban_tasks').insert({
      projet_id: projet.id,
      column_id: columnId,
      title: taskForm.title,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority,
      estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : 0,
      due_date: taskForm.due_date || null})
    setTaskForm({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '' })
    setShowTaskForm(null); fetchTasks()
  }

  async function handleMoveTask(taskId, newColumnId) {
    const task = tasks.find(t => t.id === taskId)
    const oldCol = columns.find(c => c.id === task?.column_id)
    const newCol = columns.find(c => c.id === newColumnId)
    await supabase.from('kanban_tasks').update({ column_id: newColumnId }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column_id: newColumnId } : t))
    // Log activité
    if (task && oldCol && newCol) {
      supabase.from('activity_log').insert({
        user_id: user?.id || null,
        societe_id: projet?.societe_id || null,
        action: 'move',
        entity_type: 'task',
        entity_id: taskId,
        entity_name: task.title,
        details: `${oldCol.name} → ${newCol.name}`,
        icon: '🔀'}).then(() => {})
    }
  }

  async function handleDeleteTask(taskId) {
    await supabase.from('kanban_tasks').delete().eq('id', taskId)
    fetchTasks(); fetchTimeEntries()
  }

  function openEditTask(task) {
    setEditingTask(task)
    setTaskForm({
      title: task.title || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority || 'moyenne',
      estimated_hours: task.estimated_hours || '',
      due_date: task.due_date || ''})
  }

  async function handleUpdateTask(e) {
    e.preventDefault()
    if (!editingTask) return
    await supabase.from('kanban_tasks').update({
      title: taskForm.title,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority,
      estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : 0,
      due_date: taskForm.due_date || null,
      column_id: taskForm.column_id || editingTask.column_id}).eq('id', editingTask.id)
    setEditingTask(null)
    setTaskForm({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '' })
    fetchTasks()
  }

  // ── Time entry actions ──
  async function handleLogTime(e) {
    e.preventDefault()
    await supabase.from('kanban_time_entries').insert({
      task_id: showTimeForm,
      user_id: user.id,
      hours: parseFloat(timeForm.hours),
      date: timeForm.date,
      note: timeForm.note || null})
    setTimeForm({ hours: '', note: '', date: new Date().toISOString().slice(0, 10) })
    setShowTimeForm(null); fetchTimeEntries()
  }

  // ── Member actions ──
  async function handleAddMember(e) {
    e.preventDefault()
    if (!selectedMember) return
    await supabase.from('projet_members').insert({ projet_id: projet.id, user_id: selectedMember })
    setSelectedMember(''); setShowMemberForm(false); fetchMembers()
  }

  async function handleRemoveMember(memberId) {
    await supabase.from('projet_members').delete().eq('id', memberId)
    fetchMembers()
  }

  // ── Drag & Drop ──
  function handleDragStart(task) { setDraggedTask(task) }
  function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('kanban-col--dragover') }
  function handleDragLeave(e) { e.currentTarget.classList.remove('kanban-col--dragover') }
  function handleDrop(e, columnId) {
    e.currentTarget.classList.remove('kanban-col--dragover')
    if (draggedTask && draggedTask.column_id !== columnId) handleMoveTask(draggedTask.id, columnId)
    setDraggedTask(null)
  }

  // ── Computed data ──
  const memberIds = members.map(m => m.user_id)
  const availableUsers = allUsers.filter(u => !memberIds.includes(u.id))
  const memberProfiles = members.map(m => m.profiles).filter(Boolean)
  const assignableUsers = memberProfiles.length > 0 ? memberProfiles : allUsers

  // Time per task
  const timeByTask = useMemo(() => {
    const map = {}
    for (const e of timeEntries) { map[e.task_id] = (map[e.task_id] || 0) + parseFloat(e.hours || 0) }
    return map
  }, [timeEntries])

  // Time per user
  const timeByUser = useMemo(() => {
    const map = {}
    for (const e of timeEntries) {
      const name = e.profiles?.full_name || 'Inconnu'
      map[name] = (map[name] || 0) + parseFloat(e.hours || 0)
    }
    return map
  }, [timeEntries])

  // Dashboard stats
  const totalEstimated = tasks.reduce((s, t) => s + parseFloat(t.estimated_hours || 0), 0)
  const totalSpent = timeEntries.reduce((s, e) => s + parseFloat(e.hours || 0), 0)
  const totalRemaining = Math.max(0, totalEstimated - totalSpent)
  const doneColId = columns.find(c => c.name.toLowerCase().includes('termin'))?.id
  const tasksDone = tasks.filter(t => t.column_id === doneColId).length
  const tasksTotal = tasks.length
  const progressPct = tasksTotal > 0 ? Math.round(tasksDone / tasksTotal * 100) : 0

  // Filtered tasks
  const filteredTasks = filterMember === 'all' ? tasks : tasks.filter(t => t.assigned_to === filterMember)

  // Tasks by priority
  const tasksByPriority = { haute: 0, moyenne: 0, basse: 0 }
  tasks.forEach(t => { tasksByPriority[t.priority || 'moyenne']++ })

  // Overdue tasks
  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.column_id !== doneColId)

  if (loading) return <div className="admin-page"><Spinner /></div>

  return (
    <div className="admin-page" style={{ maxWidth: 'none' }}>
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-back" onClick={onBack}>← Projets</button>
          <div>
            <h1>📁 {projet.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
              {projet.clients?.name || 'Sans client'} — {members.length} membre{members.length > 1 ? 's' : ''} — {tasksTotal} tâche{tasksTotal > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('kanban')} style={{
              padding: '.4rem .75rem', fontSize: '.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: view === 'kanban' ? 'var(--primary)' : '#fff', color: view === 'kanban' ? '#fff' : 'var(--text-muted)'
            }}>📋 Kanban</button>
            <button onClick={() => setView('dashboard')} style={{
              padding: '.4rem .75rem', fontSize: '.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: view === 'dashboard' ? 'var(--primary)' : '#fff', color: view === 'dashboard' ? '#fff' : 'var(--text-muted)'
            }}>📊 Dashboard</button>
          </div>
          <button className="btn-secondary" onClick={() => setShowMemberForm(true)}>👥 Membres</button>
          {view === 'kanban' && <button className="btn-secondary" onClick={() => setShowColForm(true)}>+ Colonne</button>}
        </div>
      </div>

      {/* Filter bar */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginBottom: '.75rem', padding: '0 .25rem' }}>
          <label style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filtrer :</label>
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
            style={{ fontSize: '.82rem', padding: '.3rem .6rem', borderRadius: 6, border: '1px solid var(--border)' }}>
            <option value="all">Tous les membres</option>
            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          {/* Members chips */}
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', flex: 1 }}>
            {members.map(m => (
              <span key={m.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '.25rem',
                background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20,
                padding: '.15rem .6rem', fontSize: '.78rem', color: '#334155'
              }}>👤 {m.profiles?.full_name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ════ KANBAN VIEW ════ */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.column_id === col.id)
            return (
              <div key={col.id} className="kanban-col"
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, col.id)}>
                {/* Column header */}
                <div className="kanban-col-header">
                  {editingCol === col.id ? (
                    <input className="kanban-col-edit" value={editColName}
                      onChange={e => setEditColName(e.target.value)}
                      onBlur={() => handleRenameColumn(col)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameColumn(col); if (e.key === 'Escape') setEditingCol(null) }}
                      autoFocus />
                  ) : (
                    <h3 className="kanban-col-title"
                      onDoubleClick={() => { setEditingCol(col.id); setEditColName(col.name) }}
                      title="Double-cliquez pour renommer">
                      {col.name}
                      <span className="kanban-col-count">{colTasks.length}</span>
                    </h3>
                  )}
                  <div className="kanban-col-actions">
                    <button className="kanban-col-btn" title="Ajouter une tâche"
                      onClick={() => { setShowTaskForm(col.id); setTaskForm({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '' }) }}>+</button>
                    <button className="kanban-col-btn kanban-col-btn--danger" onClick={() => setDeleteCol(col)} title="Supprimer">✕</button>
                  </div>
                </div>

                {/* Task form */}
                {showTaskForm === col.id && (
                  <form className="kanban-task-form" onSubmit={e => handleCreateTask(e, col.id)}>
                    <input type="text" placeholder="Titre de la tâche..." value={taskForm.title}
                      onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
                    <select value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">— Assigner à —</option>
                      {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                        style={{ flex: 1 }}>
                        <option value="haute">🔴 Haute</option>
                        <option value="moyenne">🟡 Moyenne</option>
                        <option value="basse">🟢 Basse</option>
                      </select>
                      <input type="number" min="0" step="0.5" placeholder="Heures" value={taskForm.estimated_hours}
                        onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))}
                        style={{ width: 80 }} />
                    </div>
                    <MiniCalendar value={taskForm.due_date} onChange={v => setTaskForm(f => ({ ...f, due_date: v }))} placeholder="Date d'échéance" />
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button type="submit" className="btn-primary" style={{ fontSize: '.8rem', padding: '.35rem .75rem' }}>Créer</button>
                      <button type="button" className="btn-secondary" style={{ fontSize: '.8rem', padding: '.35rem .75rem' }} onClick={() => setShowTaskForm(null)}>Annuler</button>
                    </div>
                  </form>
                )}

                {/* Tasks */}
                <div className="kanban-tasks">
                  {colTasks.map(task => {
                    const spent = timeByTask[task.id] || 0
                    const est = parseFloat(task.estimated_hours || 0)
                    const isOverdue = task.due_date && task.due_date < today && col.id !== doneColId
                    const p = PRIORITY_CONFIG[task.priority || 'moyenne']
                    return (
                      <div key={task.id} className="kanban-card" draggable onDragStart={() => handleDragStart(task)}
                        onClick={() => navigate(`/activite/projets/${projet.id}/taches/${task.id}`)}
                        style={{ borderLeft: `3px solid ${p.color}`, cursor: 'pointer' }}>
                        <div className="kanban-card-title">{task.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.35rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 4, background: p.bg, color: p.color, fontWeight: 600 }}>
                            {p.icon} {p.label}
                          </span>
                          {est > 0 && (
                            <span style={{ fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 4, background: spent > est ? '#fef2f2' : '#f0f9ff',
                              color: spent > est ? '#dc2626' : '#1D9BF0', fontWeight: 600 }}>
                              ⏱ {spent}h / {est}h
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
                              ⚠ En retard
                            </span>
                          )}
                          {task.due_date && (
                            <span style={{ fontSize: '.68rem', color: '#94a3b8' }}>📅 {task.due_date}</span>
                          )}
                        </div>
                        {task.profiles?.full_name && (
                          <div className="kanban-card-assignee">👤 {task.profiles.full_name}</div>
                        )}
                        <div style={{ position: 'absolute', top: '.4rem', right: '.4rem', display: 'flex', gap: '.15rem' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setShowTimeForm(task.id); setTimeForm({ hours: '', note: '', date: new Date().toISOString().slice(0, 10) }) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: '#cbd5e1', padding: 0 }} title="Logger du temps">⏱</button>
                          <button onClick={() => handleDeleteTask(task.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: '#cbd5e1', padding: 0 }} title="Supprimer">🗑</button>
                        </div>
                      </div>
                    )
                  })}
                  {!showTaskForm && (
                    <div className="kanban-add-task" onClick={() => { setShowTaskForm(col.id); setTaskForm({ title: '', assigned_to: '', priority: 'moyenne', estimated_hours: '', due_date: '' }) }}
                      style={{ cursor: 'pointer', minHeight: colTasks.length === 0 ? 80 : 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: '.82rem', marginTop: colTasks.length > 0 ? '.5rem' : 0, transition: 'all .15s' }}>
                      + Ajouter une tâche
                    </div>
                  )}
                </div>
                {/* Footer : total heures */}
                <div className="kanban-col-footer">
                  <span>⏱ {colTasks.reduce((s, t) => s + (timeByTask[t.id] || 0), 0).toFixed(1)}h / {colTasks.reduce((s, t) => s + parseFloat(t.estimated_hours || 0), 0)}h</span>
                  <span style={{ color: 'var(--text-muted)' }}>Temps passé / estimé</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ════ DASHBOARD VIEW ════ */}
      {view === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Temps prévu', value: `${totalEstimated}h`, color: '#1D9BF0', icon: '📐' },
              { label: 'Temps passé', value: `${Math.round(totalSpent * 10) / 10}h`, color: totalSpent > totalEstimated ? '#dc2626' : '#16a34a', icon: '⏱' },
              { label: 'Temps restant', value: `${Math.round(totalRemaining * 10) / 10}h`, color: '#f59e0b', icon: '⏳' },
              { label: 'Avancement', value: `${progressPct}%`, color: '#7c3aed', icon: '📊' },
              { label: 'Tâches terminées', value: `${tasksDone}/${tasksTotal}`, color: '#16a34a', icon: '✅' },
            ].map((kpi, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem',
                textAlign: 'center', borderTop: `3px solid ${kpi.color}`
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '.25rem' }}>{kpi.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: '.25rem' }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar global */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem' }}>Progression globale</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 10, transition: 'width .3s',
                  width: `${totalEstimated > 0 ? Math.min(100, Math.round(totalSpent / totalEstimated * 100)) : 0}%`,
                  background: totalSpent > totalEstimated ? '#dc2626' : 'linear-gradient(90deg, #1D9BF0, #16a34a)'
                }} />
              </div>
              <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {totalEstimated > 0 ? Math.round(totalSpent / totalEstimated * 100) : 0}% consommé
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Répartition par priorité */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem' }}>Par priorité</h3>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                  <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>{cfg.label}</span>
                  <span style={{ fontSize: '.9rem', fontWeight: 700, color: cfg.color }}>{tasksByPriority[key]}</span>
                  <div style={{ width: 100, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                    <div style={{ height: '100%', borderRadius: 3, background: cfg.color, width: `${tasksTotal > 0 ? (tasksByPriority[key] / tasksTotal * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Répartition par membre */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem' }}>Temps par membre</h3>
              {Object.entries(timeByUser).length > 0 ? Object.entries(timeByUser).sort((a, b) => b[1] - a[1]).map(([name, hours]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '.85rem' }}>👤</span>
                    <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--primary)' }}>{Math.round(hours * 10) / 10}h</span>
                    <div style={{ width: 100, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: 'var(--primary)', width: `${totalSpent > 0 ? (hours / totalSpent * 100) : 0}%` }} />
                    </div>
                  </div>
                )) : (
                <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>Aucun temps enregistré.</p>
              )}
            </div>
          </div>

          {/* Par colonne */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem' }}>Répartition par colonne</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {columns.map(col => {
                const count = tasks.filter(t => t.column_id === col.id).length
                return (
                  <div key={col.id} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{count}</div>
                    <div style={{ fontSize: '.8rem', color: '#64748b' }}>{col.name}</div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: '.5rem' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: col.id === doneColId ? '#16a34a' : 'var(--accent)', width: `${tasksTotal > 0 ? (count / tasksTotal * 100) : 0}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tâches en retard */}
          {overdueTasks.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '1.25rem' }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: '#dc2626', marginBottom: '.75rem' }}>⚠ Tâches en retard ({overdueTasks.length})</h3>
              {overdueTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.4rem 0', borderBottom: '1px solid #fecaca' }}>
                  <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500, color: '#991b1b' }}>{t.title}</span>
                  <span style={{ fontSize: '.8rem', color: '#dc2626' }}>📅 {t.due_date}</span>
                  <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>👤 {t.profiles?.full_name || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dernières saisies de temps */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem' }}>Dernières saisies de temps</h3>
            {timeEntries.length > 0 ? timeEntries.slice(0, 10).map(e => {
              const task = tasks.find(t => t.id === e.task_id)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>{e.date}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{task?.title || '—'}</span>
                  <span>👤 {e.profiles?.full_name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{e.hours}h</span>
                  {e.note && <span style={{ color: '#94a3b8', fontSize: '.78rem' }}>— {e.note}</span>}
                </div>
              )
            }) : (
              <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>Aucune saisie de temps. Cliquez ⏱ sur une tâche pour logger du temps.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Add column */}
      {showColForm && (
        <div className="modal-overlay" onClick={() => setShowColForm(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Nouvelle colonne</h2><button className="modal-close" onClick={() => setShowColForm(false)}>✕</button></div>
            <form onSubmit={handleAddColumn} style={{ padding: '0 1.5rem' }}>
              <div className="field"><label>Nom</label><input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ex : En revue" required autoFocus /></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowColForm(false)}>Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Members */}
      {showMemberForm && (
        <div className="modal-overlay" onClick={() => setShowMemberForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Membres du projet</h2><button className="modal-close" onClick={() => setShowMemberForm(false)}>✕</button></div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              {members.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '.9rem' }}>👤 {m.profiles?.full_name} <span style={{ color: '#94a3b8', fontSize: '.8rem' }}>({m.profiles?.role})</span></span>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleRemoveMember(m.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!selectedMember) { alert('Veuillez sélectionner un utilisateur'); return }
                const { error } = await supabase.from('projet_members').insert({ projet_id: projet.id, user_id: selectedMember })
                if (error) { alert('Erreur : ' + error.message); return }
                setSelectedMember(''); fetchMembers()
              }}>
                <div className="field"><label>Ajouter un membre</label>
                  <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} required>
                    <option value="">— Choisir un utilisateur —</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowMemberForm(false)}>Fermer</button>
                  <button type="submit" className="btn-primary">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log time */}
      {showTimeForm && (
        <div className="modal-overlay" onClick={() => setShowTimeForm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>⏱ Logger du temps</h2><button className="modal-close" onClick={() => setShowTimeForm(null)}>✕</button></div>
            <form onSubmit={handleLogTime} style={{ padding: '0 1.5rem' }}>
              <div className="field"><label>Heures</label><input type="number" min="0.25" step="0.25" value={timeForm.hours} onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} placeholder="Ex : 2.5" required autoFocus /></div>
              <div className="field"><label>Date</label><input type="date" value={timeForm.date} onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))} required /></div>
              <div className="field"><label>Note (optionnel)</label><input type="text" value={timeForm.note} onChange={e => setTimeForm(f => ({ ...f, note: e.target.value }))} placeholder="Ce que vous avez fait..." /></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowTimeForm(null)}>Annuler</button><button type="submit" className="btn-primary">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete column confirm */}
      {deleteCol && (
        <ConfirmDeleteModal
          title={`Supprimer "${deleteCol.name}"`}
          message={`Toutes les tâches dans "${deleteCol.name}" seront supprimées définitivement.`}
          onConfirm={handleDeleteColumn}
          onCancel={() => setDeleteCol(null)}
        />
      )}

      {/* ════ MODALE ÉDITION TÂCHE ════ */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
            <div className="modal-header">
              <h2>Modifier la tâche</h2>
              <button className="modal-close" onClick={() => setEditingTask(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateTask} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div className="field">
                <label>Titre *</label>
                <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Colonne</label>
                  <select value={taskForm.column_id || editingTask.column_id} onChange={e => setTaskForm(f => ({ ...f, column_id: e.target.value }))}>
                    {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Assigné à</label>
                  <select value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">— Non assigné —</option>
                    {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Priorité</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="haute">🔴 Haute</option>
                    <option value="moyenne">🟡 Moyenne</option>
                    <option value="basse">🟢 Basse</option>
                  </select>
                </div>
                <div className="field">
                  <label>Heures estimées</label>
                  <input type="number" min="0" step="0.5" value={taskForm.estimated_hours} onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Échéance</label>
                  <MiniCalendar value={taskForm.due_date} onChange={v => setTaskForm(f => ({ ...f, due_date: v }))} placeholder="Date" />
                </div>
              </div>
              {/* Infos temps passé */}
              {(() => {
                const spent = timeByTask[editingTask.id] || 0
                const est = parseFloat(editingTask.estimated_hours || 0)
                return spent > 0 || est > 0 ? (
                  <div style={{ background: 'var(--hover-bg, #f1f5f9)', borderRadius: 8, padding: '.6rem .85rem', fontSize: '.82rem' }}>
                    <span style={{ fontWeight: 600 }}>⏱ Temps passé :</span>{' '}
                    <span style={{ color: spent > est && est > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{spent.toFixed(1)}h</span>
                    {est > 0 && <span style={{ color: 'var(--text-muted)' }}> / {est}h estimées</span>}
                  </div>
                ) : null
              })()}
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'space-between', marginTop: '.5rem' }}>
                <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}
                  onClick={() => { handleDeleteTask(editingTask.id); setEditingTask(null) }}>
                  🗑 Supprimer
                </button>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingTask(null)}>Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
