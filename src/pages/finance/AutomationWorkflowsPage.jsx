import { useState, useEffect, useMemo } from 'react'
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
  create_client:      { label: 'Creer une fiche client',            icon: '👤' },
  create_opportunity: { label: 'Creer une opportunite commerciale', icon: '💼' },
  create_task:        { label: 'Creer une tache dans un projet',    icon: '✅' },
  send_email:         { label: 'Envoyer un email de notification',  icon: '📧' },
  send_slack:         { label: 'Envoyer une notification Slack',    icon: '💬' },
  create_document:    { label: 'Creer un document',                 icon: '📄' },
  update_status:      { label: 'Mettre a jour un statut',           icon: '🔄' },
  create_contact:     { label: 'Creer un contact',                  icon: '📇' },
}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id)
);`

const EMPTY_FORM = {
  name: '',
  description: '',
  trigger_type: 'lead_created',
  actions: [{ type: 'create_client', config: {} }],
  active: true,
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AutomationWorkflowsPage() {
  const { selectedSociete } = useSociete()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
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
    setLoading(true)
    setTableError(false)
    let q = supabase.from('automation_workflows').select('*').order('created_at', { ascending: false })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01' || error.message?.includes('schema cache')) setTableError(true)
      setWorkflows([])
    } else {
      setWorkflows(data || [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, actions: [{ type: 'create_client', config: {} }] })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    const actions = Array.isArray(item.actions) ? item.actions : []
    setForm({
      name: item.name || '',
      description: item.description || '',
      trigger_type: item.trigger_type || 'lead_created',
      actions: actions.length > 0 ? actions : [{ type: 'create_client', config: {} }],
      active: item.active !== false,
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditItem(null); setFormError('') }

  // Actions management in form
  function addAction() {
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'create_client', config: {} }] }))
  }
  function removeAction(idx) {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) }))
  }
  function updateActionType(idx, type) {
    setForm(f => ({ ...f, actions: f.actions.map((a, i) => i === idx ? { ...a, type } : a) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Le nom est requis.'); return }
    if (!form.actions.length) { setFormError('Au moins une action est requise.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      trigger_type: form.trigger_type,
      trigger_config: {},
      actions: form.actions,
      active: form.active,
      societe_id: selectedSociete?.id || null,
      updated_at: new Date().toISOString(),
    }

    let error
    if (editItem) {
      ;({ error } = await supabase.from('automation_workflows').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('automation_workflows').insert([payload]))
    }

    if (error) { setFormError(error.message); setSaving(false); return }
    setSaving(false)
    closeForm()
    fetchWorkflows()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('automation_workflows').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchWorkflows()
  }

  async function toggleActive(item) {
    await supabase.from('automation_workflows').update({ active: !item.active, updated_at: new Date().toISOString() }).eq('id', item.id)
    fetchWorkflows()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return workflows.filter(w => {
      const matchSearch = !q ||
        (w.name || '').toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q)
      const matchTrigger = !filterTrigger || w.trigger_type === filterTrigger
      const matchActive = filterActive === '' || String(w.active) === filterActive
      return matchSearch && matchTrigger && matchActive
    })
  }, [workflows, search, filterTrigger, filterActive])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const nbActifs = workflows.filter(w => w.active).length
  const nbInactifs = workflows.filter(w => !w.active).length
  const triggersUniques = new Set(workflows.map(w => w.trigger_type)).size

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Workflows</h1>
          <p>
            {filtered.length} workflow{filtered.length > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouveau workflow</button>
      </div>

      {/* KPI bar */}
      <div className="achat-kpi-bar">
        {[
          { label: 'Total workflows', value: filtered.length, color: 'var(--text)' },
          { label: 'Actifs',          value: nbActifs,         color: '#16a34a' },
          { label: 'Inactifs',        value: nbInactifs,       color: '#64748b' },
          { label: 'Triggers uniques', value: triggersUniques, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="achat-kpi-chip">
            <span className="achat-kpi-label">{k.label}</span>
            <span className="achat-kpi-value" style={{ color: k.color }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Table missing hint */}
      {tableError && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table "automation_workflows" introuvable. Creez-la avec ce SQL :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto', color: '#1c1917' }}>{SQL_HINT}</pre>
        </div>
      )}

      {/* Filters */}
      <div className="table-toolbar">
        <input className="table-search" placeholder="Rechercher nom, description…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="table-filter-select" value={filterTrigger} onChange={e => setFilterTrigger(e.target.value)}>
          <option value="">Tous declencheurs</option>
          {Object.entries(TRIGGER_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select className="table-filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '100%' }}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier le workflow' : 'Nouveau workflow'}</h2>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name + Active */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="field">
                  <label>Nom du workflow *</label>
                  <input type="text" placeholder="Ex: Lead vers Client + Opportunite" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', padding: '.5rem 0' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: '.85rem', fontWeight: 500, color: form.active ? '#16a34a' : '#64748b' }}>
                    {form.active ? 'Actif' : 'Inactif'}
                  </span>
                </label>
              </div>

              {/* Description */}
              <div className="field">
                <label>Description</label>
                <textarea rows={2} placeholder="Decrivez ce que fait ce workflow..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>

              {/* Trigger */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.5rem', display: 'block' }}>⚡ Declencheur</label>
                <select value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} style={{ width: '100%', padding: '.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  {Object.entries(TRIGGER_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '1rem', border: '1px solid #bbf7d0' }}>
                <label style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.75rem', display: 'block' }}>🎯 Actions ({form.actions.length})</label>
                {form.actions.map((action, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
                    <span style={{ fontSize: '.85rem', color: '#64748b', width: 24, textAlign: 'center' }}>{idx + 1}.</span>
                    <select
                      value={action.type}
                      onChange={e => updateActionType(idx, e.target.value)}
                      style={{ flex: 1, padding: '.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {Object.entries(ACTION_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                    {form.actions.length > 1 && (
                      <button type="button" onClick={() => removeAction(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '.4rem .6rem', cursor: 'pointer', fontSize: '.85rem' }}>
                        🗑
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addAction} style={{ marginTop: '.25rem', background: '#dcfce7', color: '#16a34a', border: '1px dashed #86efac', borderRadius: 6, padding: '.4rem .75rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 500, width: '100%' }}>
                  + Ajouter une action
                </button>
              </div>

              {/* Preview */}
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '.75rem 1rem', border: '1px solid #bfdbfe', fontSize: '.85rem', color: '#1e40af' }}>
                <strong>Resume :</strong>{' '}
                {TRIGGER_META[form.trigger_type]?.icon} {TRIGGER_META[form.trigger_type]?.label}
                {' → '}
                {form.actions.map((a, i) => (
                  <span key={i}>
                    {ACTION_META[a.type]?.icon} {ACTION_META[a.type]?.label}
                    {i < form.actions.length - 1 ? ' + ' : ''}
                  </span>
                ))}
              </div>

              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : (editItem ? 'Enregistrer' : 'Creer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%' }}>
            <div className="modal-header">
              <h2>Supprimer le workflow</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem' }}>
                Supprimer le workflow <strong>{deleteTarget.name}</strong> ?
                Cette action est irreversible.
              </p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Annuler</button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-inline">Chargement…</div>
      ) : (
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
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.name}</div>
                      {w.description && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{w.description}</div>}
                    </td>
                    <td>
                      <span className="status-badge" style={{ color: trig.color, background: trig.bg }}>
                        {trig.icon} {trig.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                        {actions.slice(0, 3).map((a, i) => {
                          const am = ACTION_META[a.type]
                          return am ? (
                            <span key={i} style={{ fontSize: '.75rem', background: '#f1f5f9', padding: '.15rem .4rem', borderRadius: 4, whiteSpace: 'nowrap' }}>
                              {am.icon} {am.label}
                            </span>
                          ) : null
                        })}
                        {actions.length > 3 && (
                          <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>+{actions.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(w)}
                        title={w.active ? 'Desactiver' : 'Activer'}
                        style={{
                          background: w.active ? '#dcfce7' : '#f1f5f9',
                          color: w.active ? '#16a34a' : '#64748b',
                          border: 'none',
                          padding: '.25rem .6rem',
                          borderRadius: 20,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '.8rem',
                        }}
                      >
                        {w.active ? '● Actif' : '○ Inactif'}
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(w.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button className="btn-icon" title="Modifier" onClick={() => openEdit(w)}>✏️</button>
                        <button className="btn-icon btn-icon--danger" title="Supprimer" onClick={() => setDeleteTarget(w)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    {tableError ? 'Table non creee.' : 'Aucun workflow. Creez votre premier workflow !'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
