import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const TRIGGER_META = {
  lead_created:      { label: 'Quand un lead est cree',              icon: '🚀', color: '#3b82f6', bg: '#eff6ff' },
  client_created:    { label: 'Quand un client est cree',            icon: '👤', color: '#22c55e', bg: '#f0fdf4' },
  facture_created:   { label: 'Quand une facture est creee',         icon: '📄', color: '#f59e0b', bg: '#fffbeb' },
  facture_overdue:   { label: 'Facture depasse echeance',            icon: '⚠️', color: '#ef4444', bg: '#fef2f2' },
  projet_created:    { label: 'Quand un projet est cree',            icon: '📁', color: '#8b5cf6', bg: '#f5f3ff' },
  document_uploaded: { label: 'Quand un document est archive',       icon: '📎', color: '#6366f1', bg: '#eef2ff' },
  task_moved:        { label: 'Quand une tache change de phase',     icon: '🔄', color: '#0ea5e9', bg: '#e0f2fe' },
}

const ACTION_META = {
  create_client:      { label: 'Creer une fiche client',            icon: '👤', color: '#22c55e' },
  create_opportunity: { label: 'Creer une opportunite',             icon: '💼', color: '#f59e0b' },
  create_task:        { label: 'Creer une tache',                   icon: '✅', color: '#8b5cf6' },
  send_email:         { label: 'Envoyer un email',                  icon: '📧', color: '#3b82f6' },
  send_slack:         { label: 'Envoyer un Slack',                  icon: '💬', color: '#e11d48' },
  create_document:    { label: 'Creer un document',                 icon: '📄', color: '#6366f1' },
  update_status:      { label: 'Mettre a jour un statut',           icon: '🔄', color: '#0ea5e9' },
  create_contact:     { label: 'Creer un contact',                  icon: '📇', color: '#059669' },
}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(), societe_id uuid REFERENCES societes(id),
  name text NOT NULL, description text, trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}', actions jsonb DEFAULT '[]',
  active boolean DEFAULT true, created_by uuid REFERENCES profiles(id)
);`

const EMPTY_FORM = { name: '', description: '', trigger_type: 'lead_created', actions: [{ type: 'create_client', config: {} }], active: true }

function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' }

/* ───────── Visual Editor Component ───────── */
function WorkflowVisualEditor({ workflow, onSave, onCancel, societeId }) {
  const canvasRef = useRef(null)
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [trigger, setTrigger] = useState(workflow?.trigger_type || 'lead_created')
  const [actions, setActions] = useState(() => {
    const a = workflow?.actions
    return Array.isArray(a) && a.length ? a : [{ type: 'create_client', config: {} }]
  })
  const [active, setActive] = useState(workflow?.active !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Node positions (auto-calculated)
  const nodePositions = useMemo(() => {
    const positions = []
    // Trigger node at top center
    positions.push({ x: 400, y: 60, type: 'trigger' })
    // Action nodes below
    const startY = 200
    const spacingY = 120
    actions.forEach((_, i) => {
      positions.push({ x: 400, y: startY + i * spacingY, type: 'action', idx: i })
    })
    return positions
  }, [actions])

  async function handleSave() {
    if (!name.trim()) { setError('Le nom est requis.'); return }
    if (!actions.length) { setError('Au moins une action.'); return }
    setSaving(true); setError('')
    const payload = {
      name: name.trim(), description: description.trim() || null,
      trigger_type: trigger, trigger_config: {}, actions, active,
      societe_id: societeId || null, updated_at: new Date().toISOString(),
    }
    await onSave(payload, workflow?.id)
    setSaving(false)
  }

  function addAction(type) {
    setActions(a => [...a, { type, config: {} }])
    setShowAddMenu(false)
  }

  function removeAction(idx) { setActions(a => a.filter((_, i) => i !== idx)) }
  function updateAction(idx, type) { setActions(a => a.map((act, i) => i === idx ? { ...act, type } : act)) }

  const trig = TRIGGER_META[trigger]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', zIndex: 10 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '.25rem' }}>←</button>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du workflow..." style={{ flex: 1, fontSize: '1.1rem', fontWeight: 600, border: 'none', outline: 'none', background: 'transparent' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          <span style={{ fontSize: '.85rem', fontWeight: 500, color: active ? '#16a34a' : '#94a3b8' }}>{active ? 'Actif' : 'Inactif'}</span>
        </label>
        <button onClick={handleSave} disabled={saving} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '.5rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '.5rem 1.5rem', fontSize: '.85rem' }}>{error}</div>}

      {/* Canvas */}
      <div ref={canvasRef} style={{
        flex: 1, overflow: 'auto', position: 'relative',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '24px 24px', backgroundColor: '#f8fafc',
      }}>
        {/* SVG Connections */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: Math.max(600, 200 + actions.length * 120 + 100), pointerEvents: 'none' }}>
          {actions.map((_, i) => {
            const fromY = i === 0 ? 60 + 40 : 200 + (i - 1) * 120 + 40
            const toY = 200 + i * 120
            return (
              <g key={i}>
                <line x1={400} y1={fromY} x2={400} y2={toY} stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" />
                <polygon points={`${400 - 6},${toY - 8} ${400 + 6},${toY - 8} ${400},${toY}`} fill="#94a3b8" />
              </g>
            )
          })}
        </svg>

        {/* Trigger Node */}
        <div style={{
          position: 'absolute', left: 400 - 140, top: 60 - 10, width: 280,
          background: trig.bg, border: `2px solid ${trig.color}`, borderRadius: 12,
          padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,.1)', cursor: 'default',
        }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: trig.color, textTransform: 'uppercase', marginBottom: '.35rem', letterSpacing: '.5px' }}>Declencheur</div>
          <select value={trigger} onChange={e => setTrigger(e.target.value)} style={{ width: '100%', padding: '.4rem', borderRadius: 6, border: `1px solid ${trig.color}40`, background: '#fff', fontSize: '.85rem', fontWeight: 500 }}>
            {Object.entries(TRIGGER_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* Action Nodes */}
        {actions.map((action, idx) => {
          const am = ACTION_META[action.type] || ACTION_META.create_client
          const y = 200 + idx * 120
          return (
            <div key={idx} style={{
              position: 'absolute', left: 400 - 140, top: y - 10, width: 280,
              background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12,
              padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,.08)',
              borderLeft: `4px solid ${am.color}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: am.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>Action {idx + 1}</span>
                {actions.length > 1 && (
                  <button onClick={() => removeAction(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '.15rem .35rem', cursor: 'pointer', fontSize: '.75rem' }}>✕</button>
                )}
              </div>
              <select value={action.type} onChange={e => updateAction(idx, e.target.value)} style={{ width: '100%', padding: '.4rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '.85rem', fontWeight: 500 }}>
                {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          )
        })}

        {/* Add Action Button */}
        <div style={{
          position: 'absolute', left: 400 - 80, top: 200 + actions.length * 120 + 10, width: 160,
        }}>
          {!showAddMenu ? (
            <button onClick={() => setShowAddMenu(true)} style={{
              width: '100%', padding: '.6rem', background: '#fff', border: '2px dashed #94a3b8',
              borderRadius: 12, cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
            }}>
              + Ajouter une action
            </button>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {Object.entries(ACTION_META).map(([k, v]) => (
                <button key={k} onClick={() => addAction(k)} style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
                  padding: '.5rem .75rem', border: 'none', background: '#fff', cursor: 'pointer',
                  fontSize: '.8rem', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid #f1f5f9',
                }}
                  onMouseEnter={e => e.target.style.background = '#f8fafc'}
                  onMouseLeave={e => e.target.style.background = '#fff'}
                >
                  <span>{v.icon}</span> {v.label}
                </button>
              ))}
              <button onClick={() => setShowAddMenu(false)} style={{ width: '100%', padding: '.4rem', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: '.75rem', color: '#64748b' }}>Annuler</button>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ position: 'absolute', left: 30, top: 60, width: 200 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', marginBottom: '.35rem' }}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." rows={3}
            style={{ width: '100%', padding: '.5rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '.8rem', resize: 'vertical', background: '#fff' }} />
        </div>

        {/* Summary */}
        <div style={{ position: 'absolute', right: 30, top: 60, width: 220, background: '#eff6ff', borderRadius: 10, padding: '.75rem', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '.5rem' }}>Resume du workflow</div>
          <div style={{ fontSize: '.8rem', color: '#1e3a5f', lineHeight: 1.5 }}>
            {trig.icon} {trig.label}<br />
            <span style={{ color: '#64748b' }}>→</span><br />
            {actions.map((a, i) => {
              const am = ACTION_META[a.type]
              return <div key={i}>{am?.icon} {am?.label}</div>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────── Main Page ───────── */
export default function AutomationWorkflowsPage() {
  const { selectedSociete } = useSociete()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'visual'
  const [visualWorkflow, setVisualWorkflow] = useState(null) // workflow being edited visually
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterTrigger, setFilterTrigger] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchWorkflows() }, [selectedSociete?.id])

  async function fetchWorkflows() {
    setLoading(true); setTableError(false)
    let q = supabase.from('automation_workflows').select('*').order('created_at', { ascending: false })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (error) { if (error.code === '42P01' || error.message?.includes('schema cache')) setTableError(true); setWorkflows([]) }
    else setWorkflows(data || [])
    setLoading(false)
  }

  function openCreate() { setEditItem(null); setForm({ ...EMPTY_FORM, actions: [{ type: 'create_client', config: {} }] }); setFormError(''); setShowForm(true) }
  function openEdit(item) {
    const actions = Array.isArray(item.actions) ? item.actions : []
    setEditItem(item)
    setForm({ name: item.name || '', description: item.description || '', trigger_type: item.trigger_type || 'lead_created', actions: actions.length > 0 ? actions : [{ type: 'create_client', config: {} }], active: item.active !== false })
    setFormError(''); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditItem(null); setFormError('') }
  function addAction() { setForm(f => ({ ...f, actions: [...f.actions, { type: 'create_client', config: {} }] })) }
  function removeAction(idx) { setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) })) }
  function updateActionType(idx, type) { setForm(f => ({ ...f, actions: f.actions.map((a, i) => i === idx ? { ...a, type } : a) })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Le nom est requis.'); return }
    if (!form.actions.length) { setFormError('Au moins une action.'); return }
    setSaving(true); setFormError('')
    const payload = { name: form.name.trim(), description: form.description.trim() || null, trigger_type: form.trigger_type, trigger_config: {}, actions: form.actions, active: form.active, societe_id: selectedSociete?.id || null, updated_at: new Date().toISOString() }
    let error
    if (editItem) { ;({ error } = await supabase.from('automation_workflows').update(payload).eq('id', editItem.id)) }
    else { ;({ error } = await supabase.from('automation_workflows').insert([payload])) }
    if (error) { setFormError(error.message); setSaving(false); return }
    setSaving(false); closeForm(); fetchWorkflows()
  }

  async function handleDelete() {
    if (!deleteTarget) return; setDeleting(true)
    await supabase.from('automation_workflows').delete().eq('id', deleteTarget.id)
    setDeleting(false); setDeleteTarget(null); fetchWorkflows()
  }

  async function toggleActive(item) {
    await supabase.from('automation_workflows').update({ active: !item.active, updated_at: new Date().toISOString() }).eq('id', item.id)
    fetchWorkflows()
  }

  // Visual editor save handler
  async function handleVisualSave(payload, existingId) {
    let error
    if (existingId) { ;({ error } = await supabase.from('automation_workflows').update(payload).eq('id', existingId)) }
    else { ;({ error } = await supabase.from('automation_workflows').insert([payload])) }
    if (error) { alert(error.message); return }
    setVisualWorkflow(null); fetchWorkflows()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return workflows.filter(w => {
      const matchSearch = !q || (w.name || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q)
      const matchTrigger = !filterTrigger || w.trigger_type === filterTrigger
      const matchActive = filterActive === '' || String(w.active) === filterActive
      return matchSearch && matchTrigger && matchActive
    })
  }, [workflows, search, filterTrigger, filterActive])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)
  const nbActifs = workflows.filter(w => w.active).length
  const nbInactifs = workflows.filter(w => !w.active).length
  const triggersUniques = new Set(workflows.map(w => w.trigger_type)).size

  // Visual editor mode
  if (visualWorkflow !== null) {
    return <WorkflowVisualEditor workflow={visualWorkflow === 'new' ? null : visualWorkflow} onSave={handleVisualSave} onCancel={() => setVisualWorkflow(null)} societeId={selectedSociete?.id} />
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Workflows</h1>
          <p>{filtered.length} workflow{filtered.length > 1 ? 's' : ''}{selectedSociete && <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>{selectedSociete.name}</span>}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <button onClick={() => { setViewMode('list') }} style={{ padding: '.4rem .75rem', border: 'none', background: viewMode === 'list' ? 'var(--primary)' : '#fff', color: viewMode === 'list' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>≡ Liste</button>
            <button onClick={() => { setViewMode('visual') }} style={{ padding: '.4rem .75rem', border: 'none', background: viewMode === 'visual' ? 'var(--primary)' : '#fff', color: viewMode === 'visual' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>◎ Visuel</button>
          </div>
          <button className="btn-primary" onClick={() => viewMode === 'visual' ? setVisualWorkflow('new') : openCreate()}>+ Nouveau workflow</button>
        </div>
      </div>

      <div className="achat-kpi-bar">
        {[
          { label: 'Total', value: filtered.length, color: 'var(--text)' },
          { label: 'Actifs', value: nbActifs, color: '#16a34a' },
          { label: 'Inactifs', value: nbInactifs, color: '#64748b' },
          { label: 'Triggers', value: triggersUniques, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="achat-kpi-chip">
            <span className="achat-kpi-label">{k.label}</span>
            <span className="achat-kpi-value" style={{ color: k.color }}>{k.value}</span>
          </div>
        ))}
      </div>

      {tableError && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table introuvable :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto' }}>{SQL_HINT}</pre>
        </div>
      )}

      <div className="table-toolbar">
        <input className="table-search" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="table-filter-select" value={filterTrigger} onChange={e => setFilterTrigger(e.target.value)}>
          <option value="">Tous declencheurs</option>
          {Object.entries(TRIGGER_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select className="table-filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {/* Modal form (list mode) */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '100%' }}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier' : 'Nouveau workflow'}</h2>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="field"><label>Nom *</label><input type="text" placeholder="Ex: Lead vers Client" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', padding: '.5rem 0' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: '.85rem', fontWeight: 500, color: form.active ? '#16a34a' : '#64748b' }}>{form.active ? 'Actif' : 'Inactif'}</span>
                </label>
              </div>
              <div className="field"><label>Description</label><textarea rows={2} placeholder="Description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} /></div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.5rem', display: 'block' }}>⚡ Declencheur</label>
                <select value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} style={{ width: '100%', padding: '.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  {Object.entries(TRIGGER_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '1rem', border: '1px solid #bbf7d0' }}>
                <label style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.75rem', display: 'block' }}>🎯 Actions ({form.actions.length})</label>
                {form.actions.map((action, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
                    <span style={{ fontSize: '.85rem', color: '#64748b', width: 24, textAlign: 'center' }}>{idx + 1}.</span>
                    <select value={action.type} onChange={e => updateActionType(idx, e.target.value)} style={{ flex: 1, padding: '.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                      {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    {form.actions.length > 1 && <button type="button" onClick={() => removeAction(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '.4rem .6rem', cursor: 'pointer', fontSize: '.85rem' }}>🗑</button>}
                  </div>
                ))}
                <button type="button" onClick={addAction} style={{ marginTop: '.25rem', background: '#dcfce7', color: '#16a34a', border: '1px dashed #86efac', borderRadius: 6, padding: '.4rem .75rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 500, width: '100%' }}>+ Ajouter une action</button>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '.75rem 1rem', border: '1px solid #bfdbfe', fontSize: '.85rem', color: '#1e40af' }}>
                <strong>Resume :</strong> {TRIGGER_META[form.trigger_type]?.icon} {TRIGGER_META[form.trigger_type]?.label} → {form.actions.map((a, i) => <span key={i}>{ACTION_META[a.type]?.icon} {ACTION_META[a.type]?.label}{i < form.actions.length - 1 ? ' + ' : ''}</span>)}
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sauvegarde...' : (editItem ? 'Enregistrer' : 'Creer')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%' }}>
            <div className="modal-header"><h2>Supprimer</h2><button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem' }}>Supprimer <strong>{deleteTarget.name}</strong> ?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Annuler</button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Suppression...' : 'Supprimer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading-inline">Chargement...</div> : viewMode === 'visual' ? (
        /* Visual card grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '.5rem' }}>
          {sortedData.map(w => {
            const trig = TRIGGER_META[w.trigger_type] || TRIGGER_META.lead_created
            const actions = Array.isArray(w.actions) ? w.actions : []
            return (
              <div key={w.id} onClick={() => setVisualWorkflow(w)} style={{
                background: '#fff', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0',
                cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                borderLeft: `4px solid ${trig.color}`,
              }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{w.name}</div>
                  <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '.15rem .4rem', borderRadius: 10, background: w.active ? '#dcfce7' : '#f1f5f9', color: w.active ? '#16a34a' : '#64748b' }}>{w.active ? 'Actif' : 'Inactif'}</span>
                </div>
                {w.description && <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: '.5rem' }}>{w.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', flexWrap: 'wrap', fontSize: '.8rem' }}>
                  <span style={{ background: trig.bg, color: trig.color, padding: '.15rem .5rem', borderRadius: 6, fontWeight: 600 }}>{trig.icon} {trig.label}</span>
                  <span style={{ color: '#94a3b8' }}>→</span>
                  {actions.map((a, i) => {
                    const am = ACTION_META[a.type]
                    return am ? <span key={i} style={{ background: '#f1f5f9', padding: '.15rem .4rem', borderRadius: 4 }}>{am.icon} {am.label}</span> : null
                  })}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>Aucun workflow</div>}
        </div>
      ) : (
        /* Table view */
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Nom" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Declencheur" field="trigger_type" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Actions</th>
                <SortableHeader label="Statut" field="active" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Cree le" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Gerer</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(w => {
                const trig = TRIGGER_META[w.trigger_type] || TRIGGER_META.lead_created
                const actions = Array.isArray(w.actions) ? w.actions : []
                return (
                  <tr key={w.id}>
                    <td><div style={{ fontWeight: 600 }}>{w.name}</div>{w.description && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{w.description}</div>}</td>
                    <td><span className="status-badge" style={{ color: trig.color, background: trig.bg }}>{trig.icon} {trig.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                        {actions.slice(0, 3).map((a, i) => { const am = ACTION_META[a.type]; return am ? <span key={i} style={{ fontSize: '.75rem', background: '#f1f5f9', padding: '.15rem .4rem', borderRadius: 4, whiteSpace: 'nowrap' }}>{am.icon} {am.label}</span> : null })}
                        {actions.length > 3 && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>+{actions.length - 3}</span>}
                      </div>
                    </td>
                    <td><button onClick={() => toggleActive(w)} style={{ background: w.active ? '#dcfce7' : '#f1f5f9', color: w.active ? '#16a34a' : '#64748b', border: 'none', padding: '.25rem .6rem', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' }}>{w.active ? '● Actif' : '○ Inactif'}</button></td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(w.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button className="btn-icon" title="Visuel" onClick={() => setVisualWorkflow(w)}>◎</button>
                        <button className="btn-icon" title="Modifier" onClick={() => openEdit(w)}>✏️</button>
                        <button className="btn-icon btn-icon--danger" title="Supprimer" onClick={() => setDeleteTarget(w)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{tableError ? 'Table non creee.' : 'Aucun workflow.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
