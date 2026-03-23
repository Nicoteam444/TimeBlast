import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

const CATEGORIE_META = {
  materiel:    { label: 'Matériel',    icon: '🔧', color: '#0ea5e9', bg: '#f0f9ff' },
  logiciel:    { label: 'Logiciel',   icon: '💻', color: '#8b5cf6', bg: '#f5f3ff' },
  consommable: { label: 'Consommable',icon: '🧪', color: '#f59e0b', bg: '#fffbeb' },
  equipement:  { label: 'Équipement', icon: '⚙️', color: '#22c55e', bg: '#f0fdf4' },
  autre:       { label: 'Autre',      icon: '📋', color: '#64748b', bg: '#f8fafc' },
}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS stocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  reference text NOT NULL,
  nom text NOT NULL,
  description text,
  categorie text DEFAULT 'autre',
  quantite integer DEFAULT 0,
  quantite_min integer DEFAULT 0,
  prix_unitaire numeric(15,2) DEFAULT 0,
  fournisseur text,
  localisation text
);`

const EMPTY_FORM = {
  reference: '',
  nom: '',
  description: '',
  categorie: 'autre',
  quantite: '0',
  quantite_min: '0',
  prix_unitaire: '0',
  fournisseur: '',
  localisation: '',
}

function fmtMontant(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function getQtyState(quantite, quantite_min) {
  const qty = parseInt(quantite, 10) || 0
  const min = parseInt(quantite_min, 10) || 0
  if (qty === 0) return 'rupture'
  if (qty <= min) return 'alert'
  return 'ok'
}

export default function StockPage() {
  const { selectedSociete } = useSociete()
  const [items, setItems] = useState([])
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
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchStock()
  }, [selectedSociete?.id])

  async function fetchStock() {
    setLoading(true)
    setTableError(false)
    let q = supabase
      .from('stocks')
      .select('*')
      .order('nom', { ascending: true })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') setTableError(true)
      setItems([])
    } else {
      setItems(data || [])
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
      reference: item.reference || '',
      nom: item.nom || '',
      description: item.description || '',
      categorie: item.categorie || 'autre',
      quantite: item.quantite !== null && item.quantite !== undefined ? String(item.quantite) : '0',
      quantite_min: item.quantite_min !== null && item.quantite_min !== undefined ? String(item.quantite_min) : '0',
      prix_unitaire: item.prix_unitaire !== null && item.prix_unitaire !== undefined ? String(item.prix_unitaire) : '0',
      fournisseur: item.fournisseur || '',
      localisation: item.localisation || '',
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
    if (!form.reference.trim()) { setFormError('La référence est requise.'); return }
    if (!form.nom.trim()) { setFormError('Le nom est requis.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      reference: form.reference.trim(),
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      categorie: form.categorie,
      quantite: parseInt(form.quantite, 10) || 0,
      quantite_min: parseInt(form.quantite_min, 10) || 0,
      prix_unitaire: parseFloat(form.prix_unitaire) || 0,
      fournisseur: form.fournisseur.trim() || null,
      localisation: form.localisation.trim() || null,
      societe_id: selectedSociete?.id || null,
    }

    let error
    if (editItem) {
      ;({ error } = await supabase.from('stocks').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('stocks').insert([payload]))
    }

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    closeForm()
    fetchStock()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('stocks').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchStock()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => {
      const matchSearch = !q ||
        (i.reference || '').toLowerCase().includes(q) ||
        (i.nom || '').toLowerCase().includes(q) ||
        (i.fournisseur || '').toLowerCase().includes(q) ||
        (i.localisation || '').toLowerCase().includes(q)
      const matchCat = !filterCategorie || i.categorie === filterCategorie
      return matchSearch && matchCat
    })
  }, [items, search, filterCategorie])

  const totalArticles = filtered.length
  const valeurTotale = filtered.reduce((s, i) => s + ((parseInt(i.quantite, 10) || 0) * (parseFloat(i.prix_unitaire) || 0)), 0)
  const sousSeuil = items.filter(i => {
    const qty = parseInt(i.quantite, 10) || 0
    const min = parseInt(i.quantite_min, 10) || 0
    return qty > 0 && qty <= min
  }).length
  const ruptures = items.filter(i => (parseInt(i.quantite, 10) || 0) === 0).length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Stock</h1>
          <p>
            {totalArticles} article{totalArticles > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvel article</button>
      </div>

      {/* KPI bar */}
      <div className="stock-kpi-bar">
        {[
          { label: 'Total articles',   value: totalArticles,          color: 'var(--text)' },
          { label: 'Valeur stock',      value: fmtMontant(valeurTotale), color: '#3b82f6' },
          { label: 'Sous seuil',        value: sousSeuil,              color: '#d97706' },
          { label: 'Ruptures',          value: ruptures,               color: '#dc2626' },
        ].map(k => (
          <div key={k.label} className="stock-kpi-chip">
            <span className="stock-kpi-label">{k.label}</span>
            <span className="stock-kpi-value" style={{ color: k.color }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Table missing hint */}
      {tableError && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table "stocks" introuvable. Créez-la avec ce SQL :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto', color: '#1c1917' }}>{SQL_HINT}</pre>
        </div>
      )}

      {/* Filters */}
      <div className="table-toolbar">
        <input
          className="table-search"
          placeholder="Rechercher référence, nom, fournisseur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="table-filter-select" value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, width: '100%' }}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Référence *</label>
                  <input
                    type="text"
                    placeholder="REF-001"
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Nom *</label>
                  <input
                    type="text"
                    placeholder="Nom de l'article"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Description de l'article"
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
                  <label>Prix unitaire (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.prix_unitaire}
                    onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Quantité</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantite}
                    onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Seuil d'alerte (qté min)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantite_min}
                    onChange={e => setForm(f => ({ ...f, quantite_min: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Fournisseur</label>
                  <input
                    type="text"
                    placeholder="Nom du fournisseur"
                    value={form.fournisseur}
                    onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Localisation</label>
                  <input
                    type="text"
                    placeholder="Ex : Armoire A, Salle 3"
                    value={form.localisation}
                    onChange={e => setForm(f => ({ ...f, localisation: e.target.value }))}
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
              <h2>Supprimer l'article</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem' }}>
                Supprimer <strong>{deleteTarget.nom}</strong>
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
        <div className="loading-inline">Chargement…</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Quantité</th>
                <th>Seuil</th>
                <th>Prix unit.</th>
                <th>Valeur</th>
                <th>Fournisseur</th>
                <th>Localisation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cat = CATEGORIE_META[item.categorie] || CATEGORIE_META.autre
                const qty = parseInt(item.quantite, 10) || 0
                const min = parseInt(item.quantite_min, 10) || 0
                const qtyState = getQtyState(qty, min)
                const valeur = qty * (parseFloat(item.prix_unitaire) || 0)
                const rowClass = qtyState === 'rupture'
                  ? 'stock-row--rupture'
                  : qtyState === 'alert'
                    ? 'stock-row--alert'
                    : ''
                return (
                  <tr key={item.id} className={rowClass}>
                    <td style={{ fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--text-muted)' }}>
                      {item.reference}
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.nom}</td>
                    <td>
                      <span className="status-badge" style={{ color: cat.color, background: cat.bg }}>
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td>
                      <span className={`qty-badge qty-badge--${qtyState}`}>
                        {qty}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>{min}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtMontant(item.prix_unitaire)}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMontant(valeur)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>{item.fournisseur || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>{item.localisation || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button
                          className="btn-icon"
                          title="Modifier"
                          onClick={() => openEdit(item)}
                        >✏️</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(item)}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    {tableError ? 'Table non créée.' : 'Aucun article en stock.'}
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
