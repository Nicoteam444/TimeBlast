import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const CATEGORIE_META = {
  materiel:   { label: 'Matériel',    icon: '🔧', color: '#0ea5e9', bg: '#f0f9ff' },
  logiciel:   { label: 'Logiciel',   icon: '💻', color: '#8b5cf6', bg: '#f5f3ff' },
  prestation: { label: 'Prestation', icon: '🤝', color: '#f59e0b', bg: '#fffbeb' },
  fourniture: { label: 'Fourniture', icon: '📦', color: '#22c55e', bg: '#f0fdf4' },
  autre:      { label: 'Autre',      icon: '📋', color: '#64748b', bg: '#f8fafc' },
}

const STATUT_META = {
  commande:   { label: 'Commandé',   color: '#6366f1', bg: '#eef2ff' },
  en_cours:   { label: 'En cours',   color: '#f59e0b', bg: '#fffbeb' },
  recu:       { label: 'Reçu',       color: '#16a34a', bg: '#f0fdf4' },
  annule:     { label: 'Annulé',     color: '#dc2626', bg: '#fef2f2' },
  en_attente: { label: 'En attente', color: '#64748b', bg: '#f1f5f9' },
}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS achats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  fournisseur text NOT NULL,
  reference text,
  description text,
  categorie text DEFAULT 'autre',
  montant numeric(15,2) DEFAULT 0,
  quantite integer DEFAULT 1,
  date_achat date,
  date_livraison_prevue date,
  statut text DEFAULT 'commande'
);`

const EMPTY_FORM = {
  fournisseur: '',
  reference: '',
  description: '',
  categorie: 'autre',
  montant: '',
  quantite: '1',
  date_achat: new Date().toISOString().slice(0, 10),
  date_livraison_prevue: '',
  statut: 'commande',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMontant(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function AchatsPage() {
  const { selectedSociete } = useSociete()
  const [achats, setAchats] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAchats()
  }, [selectedSociete?.id])

  async function fetchAchats() {
    setLoading(true)
    setTableError(false)
    let q = supabase
      .from('achats')
      .select('*')
      .order('date_achat', { ascending: false })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') setTableError(true)
      setAchats([])
    } else {
      setAchats(data || [])
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
      fournisseur: item.fournisseur || '',
      reference: item.reference || '',
      description: item.description || '',
      categorie: item.categorie || 'autre',
      montant: item.montant !== null && item.montant !== undefined ? String(item.montant) : '',
      quantite: item.quantite !== null && item.quantite !== undefined ? String(item.quantite) : '1',
      date_achat: item.date_achat || '',
      date_livraison_prevue: item.date_livraison_prevue || '',
      statut: item.statut || 'commande',
    })
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
    if (!form.fournisseur.trim()) { setFormError('Le fournisseur est requis.'); return }
    if (!form.montant) { setFormError('Le montant est requis.'); return }
    if (!form.date_achat) { setFormError('La date d\'achat est requise.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      fournisseur: form.fournisseur.trim(),
      reference: form.reference.trim() || null,
      description: form.description.trim() || null,
      categorie: form.categorie,
      montant: parseFloat(form.montant),
      quantite: parseInt(form.quantite, 10) || 1,
      date_achat: form.date_achat,
      date_livraison_prevue: form.date_livraison_prevue || null,
      statut: form.statut,
      societe_id: selectedSociete?.id || null,
    }

    let error
    if (editItem) {
      ;({ error } = await supabase.from('achats').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('achats').insert([payload]))
    }

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    closeForm()
    fetchAchats()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('achats').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchAchats()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return achats.filter(a => {
      const matchSearch = !q ||
        (a.fournisseur || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.reference || '').toLowerCase().includes(q)
      const matchCat = !filterCategorie || a.categorie === filterCategorie
      const matchStat = !filterStatut || a.statut === filterStatut
      return matchSearch && matchCat && matchStat
    })
  }, [achats, search, filterCategorie, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const totalMontant = filtered.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0)
  const nbEnCours = achats.filter(a => a.statut === 'en_cours').length
  const nbRecus = achats.filter(a => a.statut === 'recu').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Achats</h1>
          <p>
            {filtered.length} commande{filtered.length > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvel achat</button>
      </div>

      {/* KPI bar */}
      <div className="achat-kpi-bar">
        {[
          { label: 'Total achats',    value: fmtMontant(totalMontant), color: '#3b82f6' },
          { label: 'Nb commandes',    value: filtered.length,          color: 'var(--text)' },
          { label: 'En cours',        value: nbEnCours,                color: '#f59e0b' },
          { label: 'Reçus',           value: nbRecus,                  color: '#16a34a' },
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
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table "achats" introuvable. Créez-la avec ce SQL :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto', color: '#1c1917' }}>{SQL_HINT}</pre>
        </div>
      )}

      {/* Filters */}
      <div className="table-toolbar">
        <input
          className="table-search"
          placeholder="Rechercher fournisseur, description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="table-filter-select" value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIE_META).map(([k, v]) => (
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
              <h2>{editItem ? 'Modifier l\'achat' : 'Nouvel achat'}</h2>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Fournisseur *</label>
                  <input
                    type="text"
                    placeholder="Nom du fournisseur"
                    value={form.fournisseur}
                    onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Référence</label>
                  <input
                    type="text"
                    placeholder="Référence commande"
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Description de l'achat"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Catégorie</label>
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {Object.entries(CATEGORIE_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {Object.entries(STATUT_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Montant (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Quantité</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantite}
                    onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Date d'achat *</label>
                  <input
                    type="date"
                    value={form.date_achat}
                    onChange={e => setForm(f => ({ ...f, date_achat: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Livraison prévue</label>
                  <input
                    type="date"
                    value={form.date_livraison_prevue}
                    onChange={e => setForm(f => ({ ...f, date_livraison_prevue: e.target.value }))}
                  />
                </div>
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : (editItem ? 'Enregistrer' : 'Créer')}
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
              <h2>Supprimer l'achat</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem' }}>
                Supprimer la commande <strong>{deleteTarget.fournisseur}</strong>
                {deleteTarget.reference ? ` (${deleteTarget.reference})` : ''} ?
                Cette action est irréversible.
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
        <Spinner />
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Fournisseur" field="fournisseur" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Référence" field="reference" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Catégorie" field="categorie" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Montant" field="montant" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Qté" field="quantite" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Date achat" field="date_achat" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Livraison" field="date_livraison_prevue" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(a => {
                const cat = CATEGORIE_META[a.categorie] || CATEGORIE_META.autre
                const stat = STATUT_META[a.statut] || STATUT_META.en_attente
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.fournisseur}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>{a.reference || '—'}</td>
                    <td>
                      <span className="status-badge" style={{ color: cat.color, background: cat.bg }}>
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMontant(a.montant)}</td>
                    <td style={{ textAlign: 'center' }}>{a.quantite ?? 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.date_achat)}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(a.date_livraison_prevue)}</td>
                    <td>
                      <span className="status-badge" style={{ color: stat.color, background: stat.bg }}>
                        {stat.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button
                          className="btn-icon"
                          title="Modifier"
                          onClick={() => openEdit(a)}
                        >✏️</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(a)}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    {tableError ? 'Table non créée.' : 'Aucun achat.'}
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
