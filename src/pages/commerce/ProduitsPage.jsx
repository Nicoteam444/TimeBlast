import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS produits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id) ON DELETE CASCADE,
  reference text,
  nom text NOT NULL,
  description text,
  categorie text DEFAULT 'service',
  prix_ht numeric(15,2) DEFAULT 0,
  taux_tva numeric(5,2) DEFAULT 20,
  unite text DEFAULT 'jour',
  actif boolean DEFAULT true
);
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produits_all" ON produits FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));`

const CATEGORIES = [
  { value: 'service',   label: 'Service' },
  { value: 'licence',   label: 'Licence' },
  { value: 'formation', label: 'Formation' },
  { value: 'materiel',  label: 'Matériel' },
  { value: 'autre',     label: 'Autre' },
]

const EMPTY_FORM = {
  reference: '',
  nom: '',
  description: '',
  categorie: 'service',
  prix_ht: '',
  taux_tva: '20',
  unite: 'jour',
  actif: true,
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function ProduitsPage() {
  const { selectedSociete } = useSociete()
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterActif, setFilterActif] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchProduits()
  }, [selectedSociete?.id])

  async function fetchProduits() {
    setLoading(true)
    setMigrationNeeded(false)
    setError(null)
    let query = supabase
      .from('produits')
      .select('*')
      .order('nom', { ascending: true })
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') {
        setMigrationNeeded(true)
      } else {
        setError(error.message)
      }
      setProduits([])
    } else {
      setProduits(data || [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(p) {
    setEditingId(p.id)
    setForm({
      reference:   p.reference   || '',
      nom:         p.nom         || '',
      description: p.description || '',
      categorie:   p.categorie   || 'service',
      prix_ht:     p.prix_ht     != null ? String(p.prix_ht) : '',
      taux_tva:    p.taux_tva    != null ? String(p.taux_tva) : '20',
      unite:       p.unite       || 'jour',
      actif:       p.actif !== false,
    })
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const payload = {
      societe_id:  selectedSociete?.id || null,
      reference:   form.reference   || null,
      nom:         form.nom,
      description: form.description || null,
      categorie:   form.categorie,
      prix_ht:     form.prix_ht !== '' ? parseFloat(form.prix_ht) : 0,
      taux_tva:    form.taux_tva !== '' ? parseFloat(form.taux_tva) : 20,
      unite:       form.unite || 'jour',
      actif:       form.actif,
    }
    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('produits').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase.from('produits').insert(payload))
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    closeModal()
    fetchProduits()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('produits').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setDeleteId(null)
    fetchProduits()
  }

  function handleCopy() {
    navigator.clipboard.writeText(SQL_MIGRATION).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produits.filter(p => {
      if (q && !p.nom.toLowerCase().includes(q) && !(p.reference || '').toLowerCase().includes(q)) return false
      if (filterCat && p.categorie !== filterCat) return false
      if (filterActif === 'actif' && !p.actif) return false
      if (filterActif === 'inactif' && p.actif) return false
      return true
    })
  }, [produits, search, filterCat, filterActif])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const kpiTotal   = produits.length
  const kpiActifs  = produits.filter(p => p.actif).length
  const kpiCats    = new Set(produits.map(p => p.categorie).filter(Boolean)).size
  const kpiValMoy  = produits.length > 0
    ? produits.reduce((s, p) => s + (parseFloat(p.prix_ht) || 0), 0) / produits.length
    : 0

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Catalogue produits</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouveau produit</button>
      </div>

      {/* Migration banner */}
      {migrationNeeded && (
        <div style={{ margin: '1rem 1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>
            Table <code>produits</code> introuvable — lancez la migration SQL suivante dans Supabase :
          </p>
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#1e293b', color: '#e2e8f0', borderRadius: 8,
              padding: '1rem', fontSize: '.8rem', overflowX: 'auto',
              lineHeight: 1.6, margin: 0,
            }}>{SQL_MIGRATION}</pre>
            <button
              onClick={handleCopy}
              style={{
                position: 'absolute', top: '.5rem', right: '.5rem',
                background: copied ? '#16a34a' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6, color: '#fff', fontSize: '.75rem',
                padding: '.25rem .65rem', cursor: 'pointer', transition: 'background .15s',
              }}
            >{copied ? 'Copié !' : 'Copier'}</button>
          </div>
        </div>
      )}

      {/* General error */}
      {error && (
        <div style={{ margin: '1rem 1.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {!migrationNeeded && (
        <>
          {/* KPI bar */}
          <div className="produit-kpi-bar">
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{kpiTotal}</span>
              <span className="produit-kpi-label">Total produits</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#16a34a' }}>{kpiActifs}</span>
              <span className="produit-kpi-label">Actifs</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{kpiCats}</span>
              <span className="produit-kpi-label">Catégories</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{fmt(kpiValMoy)} €</span>
              <span className="produit-kpi-label">Prix moyen HT</span>
            </div>
          </div>

          {/* Filters */}
          <div className="table-toolbar">
            <input
              className="table-search"
              type="text"
              placeholder="Rechercher par nom ou référence..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="table-select"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              className="table-select"
              value={filterActif}
              onChange={e => setFilterActif(e.target.value)}
            >
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <Spinner />
          ) : (
            <div style={{ padding: '0 1.5rem 2rem' }}>
              <table className="produit-table">
                <thead>
                  <tr>
                    <SortableHeader label="Référence" field="reference" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Catégorie" field="categorie" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Prix HT (€)" field="prix_ht" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="TVA (%)" field="taux_tva" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Unité" field="unite" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Statut" field="actif" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map(p => {
                    const catLabel = CATEGORIES.find(c => c.value === p.categorie)?.label || p.categorie
                    return (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '.85rem' }}>
                          {p.reference || '—'}
                        </td>
                        <td style={{ fontWeight: 500 }}>{p.nom}</td>
                        <td>{catLabel}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(p.prix_ht)}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(p.taux_tva)}
                        </td>
                        <td>{p.unite || '—'}</td>
                        <td>
                          {p.actif
                            ? <span className="produit-badge--actif">Actif</span>
                            : <span className="produit-badge--inactif">Inactif</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.5rem' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '.25rem .65rem', fontSize: '.8rem' }}
                              onClick={() => openEdit(p)}
                            >Modifier</button>
                            <button
                              style={{
                                padding: '.25rem .65rem', fontSize: '.8rem',
                                background: 'transparent', border: '1px solid #fca5a5',
                                color: '#dc2626', borderRadius: 6, cursor: 'pointer',
                              }}
                              onClick={() => setDeleteId(p.id)}
                            >Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="field">
                  <label>Référence</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={e => setField('reference', e.target.value)}
                    placeholder="REF-001"
                  />
                </div>
                <div className="field">
                  <label>Catégorie</label>
                  <select value={form.categorie} onChange={e => setField('categorie', e.target.value)}>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setField('nom', e.target.value)}
                  placeholder="Nom du produit ou service"
                  required
                  autoFocus={!editingId}
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Description détaillée..."
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem',
                    padding: '.625rem .875rem', border: '1px solid var(--border)',
                    borderRadius: 8, outline: 'none', width: '100%' }}
                />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Prix HT (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prix_ht}
                    onChange={e => setField('prix_ht', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="field">
                  <label>Taux TVA (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.taux_tva}
                    onChange={e => setField('taux_tva', e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div className="field">
                  <label>Unité</label>
                  <input
                    type="text"
                    value={form.unite}
                    onChange={e => setField('unite', e.target.value)}
                    placeholder="jour"
                  />
                </div>
              </div>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '.75rem' }}>
                <input
                  id="produit-actif"
                  type="checkbox"
                  checked={form.actif}
                  onChange={e => setField('actif', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="produit-actif" style={{ cursor: 'pointer', marginBottom: 0 }}>
                  Produit actif (visible dans le catalogue)
                </label>
              </div>
              {formError && (
                <p style={{ color: 'var(--error)', fontSize: '.875rem', marginBottom: '.5rem' }}>
                  {formError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer ce produit ?</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Cette action est irréversible. Le produit sera définitivement supprimé.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button
                className="btn-primary"
                style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={() => handleDelete(deleteId)}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
