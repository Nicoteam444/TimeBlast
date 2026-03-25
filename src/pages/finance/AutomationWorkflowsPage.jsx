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

/* ───────── Visual Editor (organigramme style) ───────── */
function WorkflowVisualEditor({ workflow, onSave, onCancel, societeId }) {
  const canvasRef = useRef(null)
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [triggerType, setTriggerType] = useState(workflow?.trigger_type || 'lead_created')
  const [actions, setActions] = useState(() => {
    const a = workflow?.actions
    return Array.isArray(a) && a.length ? a : [{ type: 'create_client', config: {} }]
  })
  const [active, setActive] = useState(workflow?.active !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null) // 'trigger' | index

  // Draggable nodes
  const [nodes, setNodes] = useState(() => {
    const n = [{ id: 'trigger', x: 350, y: 40, w: 260, h: 70 }]
    const acts = Array.isArray(workflow?.actions) && workflow.actions.length ? workflow.actions : [{ type: 'create_client', config: {} }]
    acts.forEach((_, i) => n.push({ id: `action-${i}`, x: 350, y: 160 + i * 120, w: 260, h: 70 }))
    return n
  })

  // Keep nodes in sync when actions change
  useEffect(() => {
    setNodes(prev => {
      const trigNode = prev[0] || { id: 'trigger', x: 350, y: 40, w: 260, h: 70 }
      const newNodes = [trigNode]
      actions.forEach((_, i) => {
        const existing = prev[i + 1]
        newNodes.push(existing || { id: `action-${i}`, x: 350, y: 160 + i * 120, w: 260, h: 70 })
      })
      return newNodes
    })
  }, [actions.length])

  const dragRef = useRef(null)

  function startDrag(e, idx) {
    e.preventDefault()
    const node = nodes[idx]
    const rect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.scrollLeft
    const scrollTop = canvasRef.current.scrollTop
    dragRef.current = { idx, offsetX: e.clientX - rect.left + scrollLeft - node.x, offsetY: e.clientY - rect.top + scrollTop - node.y }
    function onMove(ev) {
      if (!dragRef.current) return
      const nx = ev.clientX - rect.left + canvasRef.current.scrollLeft - dragRef.current.offsetX
      const ny = ev.clientY - rect.top + canvasRef.current.scrollTop - dragRef.current.offsetY
      setNodes(prev => prev.map((n, i) => i === dragRef.current.idx ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) } : n))
    }
    function onUp() { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Le nom est requis.'); return }
    if (!actions.length) { setError('Au moins une action.'); return }
    setSaving(true); setError('')
    const payload = { name: name.trim(), description: description.trim() || null, trigger_type: triggerType, trigger_config: {}, actions, active, societe_id: societeId || null, updated_at: new Date().toISOString() }
    await onSave(payload, workflow?.id)
    setSaving(false)
  }

  function addAction(type) { setActions(a => [...a, { type, config: {} }]); setShowAddMenu(false) }
  function removeAction(idx) { setActions(a => a.filter((_, i) => i !== idx)); setSelectedNode(null) }
  function updateAction(idx, type) { setActions(a => a.map((act, i) => i === idx ? { ...act, type } : act)) }

  const trig = TRIGGER_META[triggerType]
  const canvasH = Math.max(600, (nodes[nodes.length - 1]?.y || 400) + 200)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9', height: 'calc(100vh - 60px)', margin: '-1.5rem', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.6rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#fff', zIndex: 10 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}>← Retour</button>
        <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du workflow..." style={{ flex: 1, fontSize: '1rem', fontWeight: 600, border: 'none', outline: 'none', background: 'transparent' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 500, color: active ? '#16a34a' : '#94a3b8' }}>{active ? 'Actif' : 'Inactif'}</span>
        </label>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '.45rem 1.25rem' }}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '.4rem 1.25rem', fontSize: '.85rem' }}>{error}</div>}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div ref={canvasRef} onClick={() => setSelectedNode(null)} style={{
          flex: 1, overflow: 'auto', position: 'relative',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px', backgroundColor: '#f1f5f9',
        }}>
          <div style={{ position: 'relative', width: '100%', minHeight: canvasH }}>
            {/* SVG Edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <marker id="wf-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {nodes.slice(1).map((node, i) => {
                const src = nodes[i] // previous node (trigger or action[i-1])
                const srcCx = src.x + src.w / 2, srcCy = src.y + src.h
                const tgtCx = node.x + node.w / 2, tgtCy = node.y
                const dx = tgtCx - srcCx
                const midY = (srcCy + tgtCy) / 2
                const d = `M ${srcCx} ${srcCy} C ${srcCx} ${midY} ${tgtCx} ${midY} ${tgtCx} ${tgtCy}`
                return <path key={i} d={d} stroke="#94a3b8" strokeWidth={2} fill="none" markerEnd="url(#wf-arrow)" strokeDasharray="6,3" />
              })}
            </svg>

            {/* Trigger Node */}
            <div
              className={`org-node org-node-societe${selectedNode === 'trigger' ? ' org-node--selected' : ''}`}
              style={{ left: nodes[0].x, top: nodes[0].y, width: nodes[0].w, borderColor: trig.color, cursor: 'grab' }}
              onMouseDown={e => { e.stopPropagation(); setSelectedNode('trigger'); startDrag(e, 0) }}
            >
              <div className="org-node-societe-bar" style={{ backgroundColor: trig.color }} />
              <div className="org-node-societe-avatar" style={{ backgroundColor: trig.color }}>
                <span style={{ fontSize: '1.1rem' }}>{trig.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '.4rem 0' }}>
                <div style={{ fontSize: '.65rem', fontWeight: 700, color: trig.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>Declencheur</div>
                <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trig.label}</div>
              </div>
            </div>

            {/* Action Nodes */}
            {actions.map((action, idx) => {
              const am = ACTION_META[action.type] || ACTION_META.create_client
              const node = nodes[idx + 1]
              if (!node) return null
              return (
                <div
                  key={idx}
                  className={`org-node org-node-personne${selectedNode === idx ? ' org-node--selected' : ''}`}
                  style={{ left: node.x, top: node.y, width: node.w, borderColor: am.color, cursor: 'grab' }}
                  onMouseDown={e => { e.stopPropagation(); setSelectedNode(idx); startDrag(e, idx + 1) }}
                >
                  <div className="org-node-personne-avatar" style={{ backgroundColor: am.color }}>
                    <span style={{ fontSize: '1rem' }}>{am.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.65rem', fontWeight: 700, color: am.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>Action {idx + 1}</div>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{am.label}</div>
                  </div>
                  <div className="org-node-actions">
                    {actions.length > 1 && <button className="org-node-icon-btn" title="Supprimer" onMouseDown={e => { e.stopPropagation(); removeAction(idx) }}>✕</button>}
                  </div>
                </div>
              )
            })}

            {/* Add button */}
            <div style={{ position: 'absolute', left: (nodes[nodes.length - 1]?.x || 350) + 60, top: (nodes[nodes.length - 1]?.y || 400) + 100 }}>
              {!showAddMenu ? (
                <button onClick={e => { e.stopPropagation(); setShowAddMenu(true) }} style={{
                  padding: '.5rem 1rem', background: '#fff', border: '2px dashed #94a3b8',
                  borderRadius: 10, cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, color: '#64748b',
                  boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                }}>+ Ajouter une action</button>
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', overflow: 'hidden', width: 220 }}>
                  {Object.entries(ACTION_META).map(([k, v]) => (
                    <button key={k} onClick={e => { e.stopPropagation(); addAction(k) }} style={{
                      display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
                      padding: '.5rem .75rem', border: 'none', background: '#fff', cursor: 'pointer',
                      fontSize: '.8rem', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid #f1f5f9',
                    }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <span>{v.icon}</span> {v.label}
                    </button>
                  ))}
                  <button onClick={e => { e.stopPropagation(); setShowAddMenu(false) }} style={{ width: '100%', padding: '.4rem', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: '.75rem', color: '#64748b' }}>Annuler</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ width: 280, borderLeft: '1px solid #e2e8f0', background: '#fff', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '.4rem' }}>Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." rows={3} style={{ width: '100%', padding: '.5rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '.8rem', resize: 'vertical' }} />
          </div>

          <div>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '.4rem' }}>Declencheur</div>
            <select value={triggerType} onChange={e => setTriggerType(e.target.value)} style={{ width: '100%', padding: '.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '.85rem' }}>
              {Object.entries(TRIGGER_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>

          {selectedNode !== null && selectedNode !== 'trigger' && actions[selectedNode] && (
            <div>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '.4rem' }}>Action {selectedNode + 1}</div>
              <select value={actions[selectedNode].type} onChange={e => updateAction(selectedNode, e.target.value)} style={{ width: '100%', padding: '.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '.85rem' }}>
                {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '.75rem', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '.4rem' }}>Resume</div>
            <div style={{ fontSize: '.8rem', color: '#1e3a5f', lineHeight: 1.6 }}>
              {trig.icon} {trig.label}
              {actions.map((a, i) => {
                const am = ACTION_META[a.type]
                return <div key={i} style={{ paddingLeft: '.5rem' }}>→ {am?.icon} {am?.label}</div>
              })}
            </div>
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
  const [viewMode, setViewMode] = useState('visual') // 'list' | 'visual'
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
          <button className="btn-primary" onClick={() => setVisualWorkflow('new')}>+ Nouveau workflow</button>
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
                        <button className="btn-icon" title="Modifier" onClick={() => setVisualWorkflow(w)}>✏️</button>
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
