import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const STATUT_MAP = {
  actif:   { label: 'Actif',   color: '#16a34a', bg: '#dcfce7' },
  inactif: { label: 'Inactif', color: '#dc2626', bg: '#fee2e2' },
}

const EMPTY_FORM = {
  nom: '', prenom: '', email: '', telephone: '', poste: '',
  linkedin_url: '', entreprise_id: '', notes: '', statut: 'actif',
}

export default function ContactsPage() {
  const navigate = useNavigate()
  const { selectedSociete } = useSociete()

  const [contacts, setContacts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterEntreprise, setFilterEntreprise] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Fetch ──────────────────────────────────────────────
  useEffect(() => { fetchContacts(); fetchClients() }, [selectedSociete?.id])

  async function fetchClients() {
    let q = supabase.from('clients').select('id, name').order('name')
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data } = await q
    setClients(data || [])
  }

  async function fetchContacts() {
    setLoading(true)
    let q = supabase
      .from('contacts')
      .select('*, clients(id, name)')
      .order('nom')
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data } = await q
    setContacts(data || [])
    setLoading(false)
  }

  // ── KPI ────────────────────────────────────────────────
  const kpiTotal = contacts.length
  const kpiActifs = contacts.filter(c => c.statut === 'actif').length
  const kpiAvecEmail = contacts.filter(c => c.email).length
  const kpiNouveaux = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return contacts.filter(c => c.created_at && c.created_at >= startOfMonth).length
  }, [contacts])

  // ── Filter + Sort + Paginate ───────────────────────────
  const filtered = useMemo(() => {
    let list = [...contacts]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.nom || '').toLowerCase().includes(q) ||
        (c.prenom || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telephone || '').toLowerCase().includes(q) ||
        (c.clients?.name || '').toLowerCase().includes(q)
      )
    }
    if (filterEntreprise) list = list.filter(c => c.entreprise_id === filterEntreprise)
    if (filterStatut) list = list.filter(c => c.statut === filterStatut)
    return list
  }, [contacts, search, filterEntreprise, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'nom', 'asc')

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginated = sortedData.slice((page - 1) * pageSize, page * pageSize)

  // ── Modal ──────────────────────────────────────────────
  function openCreate() {
    setEditingContact(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(contact) {
    setEditingContact(contact)
    setForm({
      nom: contact.nom || '',
      prenom: contact.prenom || '',
      email: contact.email || '',
      telephone: contact.telephone || '',
      poste: contact.poste || '',
      linkedin_url: contact.linkedin_url || '',
      entreprise_id: contact.entreprise_id || '',
      notes: contact.notes || '',
      statut: contact.statut || 'actif',
    })
    setShowModal(true)
  }

  function updateField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      entreprise_id: form.entreprise_id || null,
      societe_id: selectedSociete?.id || null,
    }
    try {
      if (editingContact) {
        await supabase.from('contacts').update(payload).eq('id', editingContact.id)
      } else {
        await supabase.from('contacts').insert(payload)
      }
      setShowModal(false)
      fetchContacts()
    } catch (err) {
      console.error('Erreur sauvegarde contact:', err)
    }
    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────
  async function handleDelete(id) {
    await supabase.from('contacts').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchContacts()
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Contacts</h1>
          <p>
            {sortedData.length} contact{sortedData.length > 1 ? 's' : ''}
            {search || filterEntreprise || filterStatut ? ` sur ${contacts.length}` : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light, #eef2ff)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouveau contact</button>
      </div>

      {/* KPI Bar */}
      <div className="produit-kpi-bar">
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value">{kpiTotal}</span>
          <span className="produit-kpi-label">Contacts total</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: '#16a34a' }}>{kpiActifs}</span>
          <span className="produit-kpi-label">Contacts actifs</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: '#2563eb' }}>{kpiAvecEmail}</span>
          <span className="produit-kpi-label">Avec email</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: '#9333ea' }}>{kpiNouveaux}</span>
          <span className="produit-kpi-label">Nouveaux ce mois</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Rechercher par nom, email, entreprise..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <select
          value={filterEntreprise}
          onChange={e => { setFilterEntreprise(e.target.value); setPage(1) }}
          style={{ padding: '.45rem .7rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '.85rem' }}
        >
          <option value="">Toutes les entreprises</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={e => { setFilterStatut(e.target.value); setPage(1) }}
          style={{ padding: '.45rem .7rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '.85rem' }}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <div className="loading-inline">Chargement...</div> : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Prénom" field="prenom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Email" field="email" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Téléphone" field="telephone" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Poste" field="poste" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Entreprise" field="clients.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(contact => {
                  const sm = STATUT_MAP[contact.statut] || STATUT_MAP.actif
                  return (
                    <tr
                      key={contact.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/crm/contacts/${contact.id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>{contact.nom}</td>
                      <td>{contact.prenom}</td>
                      <td>{contact.email}</td>
                      <td>{contact.telephone}</td>
                      <td>{contact.poste}</td>
                      <td>{contact.clients?.name || '—'}</td>
                      <td>
                        <span className="fac-statut-badge" style={{ color: sm.color, background: sm.bg }}>
                          {sm.label}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-icon"
                          title="Modifier"
                          onClick={() => openEdit(contact)}
                          style={{ marginRight: '.3rem' }}
                        >&#9998;</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          title="Supprimer"
                          onClick={() => setDeleteConfirm(contact)}
                        >&#128465;</button>
                      </td>
                    </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      Aucun contact trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="table-pagination">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                &larr; Precedent
              </button>
              <span>Page {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Suivant &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Create / Edit */}
      {showModal && (
        <div className="plan-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fac-modal" onClick={e => e.stopPropagation()}>
            <div className="plan-modal-header">
              <h3>{editingContact ? 'Modifier le contact' : 'Nouveau contact'}</h3>
              <button className="plan-modal-close" onClick={() => setShowModal(false)}>&#10005;</button>
            </div>
            <form onSubmit={handleSave} className="fac-modal-body">
              <div className="fac-fields" style={{ gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                <div className="fac-field">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={e => updateField('nom', e.target.value)} required autoFocus />
                </div>
                <div className="fac-field">
                  <label>Prénom</label>
                  <input value={form.prenom} onChange={e => updateField('prenom', e.target.value)} />
                </div>
                <div className="fac-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div className="fac-field">
                  <label>Téléphone</label>
                  <input value={form.telephone} onChange={e => updateField('telephone', e.target.value)} />
                </div>
                <div className="fac-field">
                  <label>Poste</label>
                  <input value={form.poste} onChange={e => updateField('poste', e.target.value)} />
                </div>
                <div className="fac-field">
                  <label>LinkedIn URL</label>
                  <input type="url" value={form.linkedin_url} onChange={e => updateField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="fac-field">
                  <label>Entreprise</label>
                  <select value={form.entreprise_id} onChange={e => updateField('entreprise_id', e.target.value)}>
                    <option value="">-- Aucune --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="fac-field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => updateField('statut', e.target.value)}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="fac-field" style={{ marginTop: '.6rem' }}>
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : editingContact ? 'Mettre a jour' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="plan-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="fac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="plan-modal-header">
              <h3>Supprimer le contact</h3>
              <button className="plan-modal-close" onClick={() => setDeleteConfirm(null)}>&#10005;</button>
            </div>
            <div className="fac-modal-body">
              <p>Supprimer <strong>{deleteConfirm.prenom} {deleteConfirm.nom}</strong> ? Cette action est irreversible.</p>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
                <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
