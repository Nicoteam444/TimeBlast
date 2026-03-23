import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

const CATEGORIES = [
  { value: 'materiel_info', label: 'Matériel informatique' },
  { value: 'vehicule',      label: 'Véhicule' },
  { value: 'mobilier',      label: 'Mobilier' },
  { value: 'logiciel',      label: 'Logiciel' },
  { value: 'agencement',    label: 'Agencement' },
  { value: 'autre',         label: 'Autre' },
]

const STATUTS = [
  { value: 'actif',       label: 'Actif',         color: '#16a34a' },
  { value: 'cede',        label: 'Cédé',          color: '#f59e0b' },
  { value: 'rebut',       label: 'Mis au rebut',  color: '#dc2626' },
]

const EMPTY_FORM = {
  numero_comptable: '',
  libelle: '',
  categorie: 'materiel_info',
  date_acquisition: '',
  valeur_brute: '',
  duree_amort: '5',
  statut: 'actif',
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtK(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} M€`
  if (n >= 1000) return `${(n / 1000).toFixed(0)} k€`
  return `${fmt(n)} €`
}

function computeAmort(valeurBrute, dureeAmort, dateAcquisition) {
  if (!valeurBrute || !dureeAmort || !dateAcquisition) return { cumulAmort: 0, vnc: valeurBrute || 0 }
  const now = new Date()
  const acq = new Date(dateAcquisition)
  const annees = (now - acq) / (365.25 * 24 * 60 * 60 * 1000)
  if (annees <= 0) return { cumulAmort: 0, vnc: valeurBrute }
  const amortAnnuel = valeurBrute / dureeAmort
  const cumulAmort = Math.min(valeurBrute, Math.round(amortAnnuel * annees * 100) / 100)
  const vnc = Math.round((valeurBrute - cumulAmort) * 100) / 100
  return { cumulAmort, vnc }
}

export default function ImmobilisationsPage() {
  const { selectedSociete } = useSociete()
  const [immos, setImmos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchImmos() }, [selectedSociete?.id])

  async function fetchImmos() {
    setLoading(true)
    setError(null)
    setMigrationNeeded(false)
    let query = supabase.from('immobilisations').select('*').order('libelle')
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data, error } = await query
    if (error) {
      if (error.code === '42P01' || error.message?.includes('immobilisations')) { setMigrationNeeded(true) }
      else { setError(error.message) }
      setImmos([])
    } else {
      setImmos(data || [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(item) {
    setEditingId(item.id)
    setForm({
      numero_comptable: item.numero_comptable || '',
      libelle: item.libelle || '',
      categorie: item.categorie || 'materiel_info',
      date_acquisition: item.date_acquisition || '',
      valeur_brute: item.valeur_brute != null ? String(item.valeur_brute) : '',
      duree_amort: item.duree_amort != null ? String(item.duree_amort) : '5',
      statut: item.statut || 'actif',
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

  async function handleSave(e) {
    e.preventDefault()
    if (!form.libelle.trim()) { setFormError('Le libellé est obligatoire'); return }
    setSaving(true)
    setFormError(null)
    const payload = {
      societe_id: selectedSociete?.id || null,
      numero_comptable: form.numero_comptable.trim() || null,
      libelle: form.libelle.trim(),
      categorie: form.categorie,
      date_acquisition: form.date_acquisition || null,
      valeur_brute: form.valeur_brute !== '' ? parseFloat(form.valeur_brute) : 0,
      duree_amort: form.duree_amort !== '' ? parseFloat(form.duree_amort) : 5,
      statut: form.statut,
    }
    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('immobilisations').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase.from('immobilisations').insert(payload))
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    closeModal()
    fetchImmos()
  }

  async function handleDelete(id) {
    await supabase.from('immobilisations').delete().eq('id', id)
    setDeleteId(null)
    fetchImmos()
  }

  const enriched = useMemo(() => immos.map(i => {
    const vb = parseFloat(i.valeur_brute) || 0
    const da = parseFloat(i.duree_amort) || 5
    const { cumulAmort, vnc } = computeAmort(vb, da, i.date_acquisition)
    return { ...i, vb, cumulAmort, vnc }
  }), [immos])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(i => {
      if (q && !i.libelle.toLowerCase().includes(q) && !(i.numero_comptable || '').toLowerCase().includes(q)) return false
      if (filterCat && i.categorie !== filterCat) return false
      if (filterStatut && i.statut !== filterStatut) return false
      return true
    })
  }, [enriched, search, filterCat, filterStatut])

  const kpiTotal = enriched.length
  const kpiBrut = enriched.reduce((s, i) => s + i.vb, 0)
  const kpiAmort = enriched.reduce((s, i) => s + i.cumulAmort, 0)
  const kpiVNC = enriched.reduce((s, i) => s + i.vnc, 0)

  const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS immobilisations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id) ON DELETE CASCADE,
  numero_comptable text,
  libelle text NOT NULL,
  categorie text DEFAULT 'materiel_info',
  date_acquisition date,
  valeur_brute numeric(15,2) DEFAULT 0,
  duree_amort numeric(5,2) DEFAULT 5,
  statut text DEFAULT 'actif'
);
ALTER TABLE immobilisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "immo_all" ON immobilisations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));`

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Immobilisations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {filtered.length} immobilisation{filtered.length !== 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvelle immobilisation</button>
      </div>

      {migrationNeeded && (
        <div style={{ margin: '0 0 1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>
            Table <code>immobilisations</code> introuvable — lancez la migration SQL suivante dans Supabase :
          </p>
          <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '1rem', fontSize: '.8rem', overflowX: 'auto', lineHeight: 1.6, margin: 0 }}>{SQL_MIGRATION}</pre>
          <button className="btn-secondary" style={{ marginTop: '.75rem' }}
            onClick={() => { navigator.clipboard.writeText(SQL_MIGRATION) }}>
            Copier le SQL
          </button>
        </div>
      )}

      {error && (
        <div style={{ margin: '0 0 1.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {!migrationNeeded && (
        <>
          {/* KPI */}
          <div className="produit-kpi-bar">
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{kpiTotal}</span>
              <span className="produit-kpi-label">Total immobilisations</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: 'var(--primary)' }}>{fmtK(kpiBrut)}</span>
              <span className="produit-kpi-label">Valeur brute</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#f59e0b' }}>{fmtK(kpiAmort)}</span>
              <span className="produit-kpi-label">Amort. cumulé</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#16a34a' }}>{fmtK(kpiVNC)}</span>
              <span className="produit-kpi-label">Valeur nette (VNC)</span>
            </div>
          </div>

          {/* Filtres */}
          <div className="table-toolbar">
            <input className="table-search" type="text" placeholder="Rechercher par libellé ou n° comptable..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="table-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="table-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="loading-inline">Chargement...</div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>N° comptable</th>
                    <th>Libellé</th>
                    <th>Catégorie</th>
                    <th>Date acquisition</th>
                    <th style={{ textAlign: 'right' }}>Valeur brute (€)</th>
                    <th style={{ textAlign: 'center' }}>Durée (ans)</th>
                    <th style={{ textAlign: 'right' }}>Amort. cumulé (€)</th>
                    <th style={{ textAlign: 'right' }}>VNC (€)</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => {
                    const catLabel = CATEGORIES.find(c => c.value === i.categorie)?.label || i.categorie || '—'
                    const statutInfo = STATUTS.find(s => s.value === i.statut)
                    return (
                      <tr key={i.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '.85rem', color: 'var(--text-muted)' }}>
                          {i.numero_comptable || '—'}
                        </td>
                        <td style={{ fontWeight: 500 }}>{i.libelle}</td>
                        <td>{catLabel}</td>
                        <td>{i.date_acquisition ? new Date(i.date_acquisition + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(i.vb)}</td>
                        <td style={{ textAlign: 'center' }}>{i.duree_amort || '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#f59e0b' }}>{fmt(i.cumulAmort)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: i.vnc > 0 ? '#16a34a' : 'var(--text-muted)' }}>{fmt(i.vnc)}</td>
                        <td>
                          <span style={{
                            padding: '.15rem .55rem', borderRadius: 12, fontSize: '.75rem', fontWeight: 600,
                            color: statutInfo?.color || 'var(--text-muted)',
                            background: (statutInfo?.color || '#94a3b8') + '18',
                          }}>
                            {statutInfo?.label || i.statut}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <button className="btn-secondary" style={{ padding: '.2rem .55rem', fontSize: '.78rem' }}
                              onClick={() => openEdit(i)}>Modifier</button>
                            <button style={{
                              padding: '.2rem .55rem', fontSize: '.78rem', background: 'transparent',
                              border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, cursor: 'pointer',
                            }} onClick={() => setDeleteId(i.id)}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucune immobilisation trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal création / édition */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier l\'immobilisation' : 'Nouvelle immobilisation'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="field">
                  <label>N° comptable</label>
                  <input type="text" value={form.numero_comptable}
                    onChange={e => setForm(f => ({ ...f, numero_comptable: e.target.value }))}
                    placeholder="Ex : 2183-001" />
                </div>
                <div className="field">
                  <label>Catégorie</label>
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Libellé <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={form.libelle} required autoFocus={!editingId}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex : MacBook Pro 16 pouces" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Date d'acquisition</label>
                  <input type="date" value={form.date_acquisition}
                    onChange={e => setForm(f => ({ ...f, date_acquisition: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Valeur brute (€)</label>
                  <input type="number" min="0" step="0.01" value={form.valeur_brute}
                    onChange={e => setForm(f => ({ ...f, valeur_brute: e.target.value }))}
                    placeholder="0.00" />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Durée amortissement (années)</label>
                  <input type="number" min="1" max="50" step="1" value={form.duree_amort}
                    onChange={e => setForm(f => ({ ...f, duree_amort: e.target.value }))}
                    placeholder="5" />
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p style={{ color: 'var(--error)', fontSize: '.875rem', marginBottom: '.5rem' }}>{formError}</p>}
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

      {/* Confirmation suppression */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer cette immobilisation ?</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Cette action est irréversible.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn-primary" style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={() => handleDelete(deleteId)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
