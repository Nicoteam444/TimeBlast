import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const TYPE_META = {
  email:  { label: 'Email',           icon: '\u{1F4E7}', color: '#3b82f6', bg: '#eff6ff' },
  social: { label: 'R\u00e9seaux sociaux', icon: '\u{1F4F1}', color: '#8b5cf6', bg: '#f5f3ff' },
  seo:    { label: 'SEO',             icon: '\u{1F50D}', color: '#22c55e', bg: '#f0fdf4' },
  ads:    { label: 'Publicit\u00e9',  icon: '\u{1F4E3}', color: '#f59e0b', bg: '#fffbeb' },
  event:  { label: '\u00c9v\u00e9nement', icon: '\u{1F3EA}', color: '#ec4899', bg: '#fdf2f8' }}

const STATUT_META = {
  brouillon: { label: 'Brouillon', color: '#64748b', bg: '#f1f5f9' },
  en_cours:  { label: 'En cours',  color: '#3b82f6', bg: '#eff6ff' },
  terminee:  { label: 'Termin\u00e9e', color: '#16a34a', bg: '#f0fdf4' },
  annulee:   { label: 'Annul\u00e9e',  color: '#dc2626', bg: '#fef2f2' }}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS campagnes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  type text DEFAULT 'email',
  description text,
  date_debut date,
  date_fin date,
  budget numeric(15,2) DEFAULT 0,
  statut text DEFAULT 'brouillon',
  objectif text,
  leads_generes integer DEFAULT 0
);`

const EMPTY_FORM = {
  nom: '',
  type: 'email',
  description: '',
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: '',
  budget: '',
  statut: 'brouillon',
  objectif: ''}

function fmtDate(iso) {
  if (!iso) return '\u2014'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMontant(n) {
  if (n === null || n === undefined || n === '') return '\u2014'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function CampagnesPage() {
  const [campagnes, setCampagnes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCampagnes()
  }, [])

  async function fetchCampagnes() {
    setLoading(true)
    setTableError(false)
    let q = supabase
      .from('campagnes').select('*').order('date_debut', { ascending: false })
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') setTableError(true)
      setCampagnes([])
    } else {
      setCampagnes(data || [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      nom: item.nom || '',
      type: item.type || 'email',
      description: item.description || '',
      date_debut: item.date_debut || '',
      date_fin: item.date_fin || '',
      budget: item.budget !== null && item.budget !== undefined ? String(item.budget) : '',
      statut: item.statut || 'brouillon',
      objectif: item.objectif || ''})
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { setFormError('Le nom est requis.'); return }
    if (!form.date_debut) { setFormError('La date de d\u00e9but est requise.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      nom: form.nom.trim(),
      type: form.type,
      description: form.description.trim() || null,
      date_debut: form.date_debut,
      date_fin: form.date_fin || null,
      budget: form.budget ? parseFloat(form.budget) : 0,
      statut: form.statut,
      objectif: form.objectif.trim() || null}

    let error
    if (editItem) {
      ;({ error } = await supabase.from('campagnes').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('campagnes').insert([payload]))
    }

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    closeForm()
    fetchCampagnes()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('campagnes').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchCampagnes()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return campagnes.filter(c => {
      const matchSearch = !q ||
        (c.nom || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.objectif || '').toLowerCase().includes(q)
      const matchType = !filterType || c.type === filterType
      const matchStat = !filterStatut || c.statut === filterStatut
      return matchSearch && matchType && matchStat
    })
  }, [campagnes, search, filterType, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const totalBudget = filtered.reduce((s, c) => s + (parseFloat(c.budget) || 0), 0)
  const nbEnCours = campagnes.filter(c => c.statut === 'en_cours').length
  const nbTerminees = campagnes.filter(c => c.statut === 'terminee').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Campagnes</h1>
          <p>
            {filtered.length} campagne{filtered.length > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvelle campagne</button>
      </div>

      {/* KPI bar */}
      <div className="achat-kpi-bar">
        {[
          { label: 'Total campagnes', value: filtered.length,          color: 'var(--text)' },
          { label: 'En cours',        value: nbEnCours,                color: '#3b82f6' },
          { label: 'Termin\u00e9es',  value: nbTerminees,             color: '#16a34a' },
          { label: 'Budget total',    value: fmtMontant(totalBudget), color: '#f59e0b' },
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
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table "campagnes" introuvable. Cr\u00e9ez-la avec ce SQL :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto', color: '#1c1917' }}>{SQL_HINT}</pre>
        </div>
      )}

      {/* Filters */}
      <div className="table-toolbar">
        <input
          className="table-search"
          placeholder="Rechercher nom, description\u2026"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="table-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select className="table-filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUT_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '100%' }}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
              <button className="modal-close" onClick={closeForm}>{'\u2715'}</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Nom *</label>
                  <input
                    type="text"
                    placeholder="Nom de la campagne"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {Object.entries(TYPE_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Description de la campagne"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Objectif</label>
                <input
                  type="text"
                  placeholder="Objectif de la campagne"
                  value={form.objectif}
                  onChange={e => setForm(f => ({ ...f, objectif: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {Object.entries(STATUT_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Budget (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Date d\u00e9but *</label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Date fin</label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                  />
                </div>
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement\u2026' : (editItem ? 'Enregistrer' : 'Cr\u00e9er')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%' }}>
            <div className="modal-header">
              <h2>Supprimer la campagne</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>{'\u2715'}</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem' }}>
                Supprimer la campagne <strong>{deleteTarget.nom}</strong> ?
                Cette action est irr\u00e9versible.
              </p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Annuler</button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Suppression\u2026' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Type" field="type" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Date d\u00e9but" field="date_debut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Date fin" field="date_fin" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Budget" field="budget" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Leads g\u00e9n\u00e9r\u00e9s" field="leads_generes" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(c => {
                const typ = TYPE_META[c.type] || TYPE_META.email
                const stat = STATUT_META[c.statut] || STATUT_META.brouillon
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nom}</td>
                    <td>
                      <span className="status-badge" style={{ color: typ.color, background: typ.bg }}>
                        {typ.icon} {typ.label}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ color: stat.color, background: stat.bg }}>
                        {stat.label}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date_debut)}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(c.date_fin)}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMontant(c.budget)}</td>
                    <td style={{ textAlign: 'center' }}>{c.leads_generes ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button
                          className="btn-icon"
                          title="Modifier"
                          onClick={() => openEdit(c)}
                        >{'\u270F\uFE0F'}</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(c)}
                        >{'\u{1F5D1}'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    {tableError ? 'Table non cr\u00e9\u00e9e.' : 'Aucune campagne.'}
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
