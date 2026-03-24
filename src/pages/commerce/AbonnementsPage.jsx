import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS abonnements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  frequence text DEFAULT 'mensuel',
  montant numeric(15,2) DEFAULT 0,
  date_debut date,
  date_fin date,
  date_prochaine_facturation date,
  statut text DEFAULT 'actif',
  notes text
);
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abonnements_all" ON abonnements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')));`

const FREQUENCES = [
  { value: 'mensuel',      label: 'Mensuel',      color: '#1d4ed8', bg: '#eff6ff' },
  { value: 'trimestriel',  label: 'Trimestriel',  color: '#b45309', bg: '#fffbeb' },
  { value: 'annuel',       label: 'Annuel',        color: '#15803d', bg: '#f0fdf4' },
  { value: 'ponctuel',     label: 'Ponctuel',      color: '#6b7280', bg: '#f9fafb' },
]

const STATUTS = [
  { value: 'actif',    label: 'Actif' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'resilie',  label: 'Résilié' },
]

const EMPTY_FORM = {
  nom: '',
  client_id: '',
  frequence: 'mensuel',
  montant: '',
  date_debut: '',
  date_prochaine_facturation: '',
  statut: 'actif',
  notes: '',
}

function freqInfo(v) {
  return FREQUENCES.find(f => f.value === v) || { value: v, label: v || '—', color: '#64748b', bg: '#f8fafc' }
}

function mrrCoeff(frequence) {
  if (frequence === 'mensuel')     return 1
  if (frequence === 'trimestriel') return 1 / 3
  if (frequence === 'annuel')      return 1 / 12
  return 0
}

function fmtEur(n, frac = 0) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AbonnementsPage() {
  const { selectedSociete } = useSociete()
  const [abonnements, setAbonnements] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const [filterSearch, setFilterSearch] = useState('')
  const [filterFreq, setFilterFreq] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchAbonnements()
    fetchClients()
  }, [selectedSociete?.id])

  async function fetchAbonnements() {
    setLoading(true)
    setMigrationNeeded(false)
    setError(null)
    let query = supabase
      .from('abonnements')
      .select('*, clients(id, name)')
      .order('nom', { ascending: true })
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') {
        setMigrationNeeded(true)
      } else {
        setError(error.message)
      }
      setAbonnements([])
    } else {
      setAbonnements(data || [])
    }
    setLoading(false)
  }

  async function fetchClients() {
    let query = supabase.from('clients').select('id, name').order('name', { ascending: true })
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data } = await query
    setClients(data || [])
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(a) {
    setEditingId(a.id)
    setForm({
      nom:                        a.nom || '',
      client_id:                  a.client_id || '',
      frequence:                  a.frequence || 'mensuel',
      montant:                    a.montant != null ? String(a.montant) : '',
      date_debut:                 a.date_debut || '',
      date_prochaine_facturation: a.date_prochaine_facturation || '',
      statut:                     a.statut || 'actif',
      notes:                      a.notes || '',
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
      societe_id:                 selectedSociete?.id || null,
      nom:                        form.nom,
      client_id:                  form.client_id || null,
      frequence:                  form.frequence,
      montant:                    form.montant !== '' ? parseFloat(form.montant) : 0,
      date_debut:                 form.date_debut || null,
      date_prochaine_facturation: form.date_prochaine_facturation || null,
      statut:                     form.statut,
      notes:                      form.notes || null,
    }
    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('abonnements').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase.from('abonnements').insert(payload))
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    closeModal()
    fetchAbonnements()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('abonnements').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setDeleteId(null)
    fetchAbonnements()
  }

  function handleCopy() {
    navigator.clipboard.writeText(SQL_MIGRATION).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = useMemo(() => {
    const q = filterSearch.toLowerCase()
    return abonnements.filter(a => {
      if (q) {
        const clientName = (a.clients?.name || '').toLowerCase()
        if (!a.nom.toLowerCase().includes(q) && !clientName.includes(q)) return false
      }
      if (filterFreq && a.frequence !== filterFreq) return false
      if (filterStatut && a.statut !== filterStatut) return false
      return true
    })
  }, [abonnements, filterSearch, filterFreq, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const actifs = abonnements.filter(a => a.statut === 'actif')
  const kpiTotal  = abonnements.length
  const kpiActifs = actifs.length
  const kpiMRR    = actifs.reduce((s, a) => s + (parseFloat(a.montant) || 0) * mrrCoeff(a.frequence), 0)
  const kpiARR    = kpiMRR * 12

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Abonnements</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {filtered.length} abonnement{filtered.length !== 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvel abonnement</button>
      </div>

      {/* Migration banner */}
      {migrationNeeded && (
        <div style={{ margin: '1rem 1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>
            Table <code>abonnements</code> introuvable — lancez la migration SQL suivante dans Supabase :
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
          <div className="abo-kpi-bar">
            <div className="abo-kpi-chip">
              <span className="abo-kpi-value">{kpiTotal}</span>
              <span className="abo-kpi-label">Total</span>
            </div>
            <div className="abo-kpi-chip">
              <span className="abo-kpi-value" style={{ color: '#16a34a' }}>{kpiActifs}</span>
              <span className="abo-kpi-label">Actifs</span>
            </div>
            <div className="abo-kpi-chip">
              <span className="abo-kpi-value" style={{ color: 'var(--primary)' }}>{fmtEur(kpiMRR)}</span>
              <span className="abo-kpi-label">MRR</span>
            </div>
            <div className="abo-kpi-chip">
              <span className="abo-kpi-value" style={{ color: '#6d28d9' }}>{fmtEur(kpiARR)}</span>
              <span className="abo-kpi-label">ARR</span>
            </div>
          </div>

          {/* Filters */}
          <div className="table-toolbar">
            <input
              className="table-search"
              type="text"
              placeholder="Rechercher par nom ou client..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
            <select
              className="table-select"
              value={filterFreq}
              onChange={e => setFilterFreq(e.target.value)}
            >
              <option value="">Toutes fréquences</option>
              {FREQUENCES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              className="table-select"
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
            >
              <option value="">Tous statuts</option>
              {STATUTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-inline">Chargement...</div>
          ) : (
            <div style={{ padding: '0 1.5rem 2rem', overflowX: 'auto' }}>
              <table className="users-table" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Client" field="clients.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Fréquence" field="frequence" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Montant (€)" field="montant" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                    <SortableHeader label="Prochaine facturation" field="date_prochaine_facturation" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map(a => {
                    const fi = freqInfo(a.frequence)
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.nom}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{a.clients?.name || '—'}</td>
                        <td>
                          <span
                            className="abo-freq-badge"
                            style={{ color: fi.color, background: fi.bg }}
                          >{fi.label}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {fmtEur(a.montant, 2)}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{fmtDate(a.date_prochaine_facturation)}</td>
                        <td>
                          <AboStatutBadge statut={a.statut} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.5rem' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '.25rem .65rem', fontSize: '.8rem' }}
                              onClick={() => openEdit(a)}
                            >Modifier</button>
                            <button
                              style={{
                                padding: '.25rem .65rem', fontSize: '.8rem',
                                background: 'transparent', border: '1px solid #fca5a5',
                                color: '#dc2626', borderRadius: 6, cursor: 'pointer',
                              }}
                              onClick={() => setDeleteId(a.id)}
                            >Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucun abonnement trouvé.
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
              <h2>{editingId ? 'Modifier l\'abonnement' : 'Nouvel abonnement'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="field">
                <label>Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setField('nom', e.target.value)}
                  placeholder="Ex : Abonnement support Premium"
                  required
                  autoFocus={!editingId}
                />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Client</label>
                  <select value={form.client_id} onChange={e => setField('client_id', e.target.value)}>
                    <option value="">— Aucun client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Fréquence</label>
                  <select value={form.frequence} onChange={e => setField('frequence', e.target.value)}>
                    {FREQUENCES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Montant (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.montant}
                    onChange={e => setField('montant', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setField('statut', e.target.value)}>
                    {STATUTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Date de début</label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={e => setField('date_debut', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Prochaine facturation</label>
                  <input
                    type="date"
                    value={form.date_prochaine_facturation}
                    onChange={e => setField('date_prochaine_facturation', e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem',
                    padding: '.625rem .875rem', border: '1px solid var(--border)',
                    borderRadius: 8, outline: 'none', width: '100%' }}
                />
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
              <h2>Supprimer cet abonnement ?</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Cette action est irréversible.
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

function AboStatutBadge({ statut }) {
  const styles = {
    actif:    { color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0' },
    suspendu: { color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a' },
    resilie:  { color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' },
  }
  const labels = { actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' }
  const s = styles[statut] || { color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0' }
  return (
    <span
      className="abo-statut-badge"
      style={s}
    >{labels[statut] || statut}</span>
  )
}
