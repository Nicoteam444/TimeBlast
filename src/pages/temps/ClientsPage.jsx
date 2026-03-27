import { useState, useEffect, useMemo } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

export default function ClientsPage() {
  const navigate = useEnvNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    setLoading(true)
    let query = supabase.from('clients').select('*, projets(count)').order('name')
    const { data } = await query
    setClients(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    await supabase.from('clients').insert({ name})
    setName('')
    setShowForm(false)
    fetchClients()
  }

  async function handleDelete(id) {
    await supabase.from('clients').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchClients()
  }

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return q ? clients.filter(c => c.name.toLowerCase().includes(q)) : clients
  }, [clients, filter])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleFilterChange(e) {
    setFilter(e.target.value)
    setPage(1)
  }

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Clients</h1>
          <p>
            {filtered.length} client{filtered.length > 1 ? 's' : ''}{filter ? ` sur ${clients.length}` : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouveau client</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau client</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '0 1.5rem' }}>
              <div className="field">
                <label>Nom du client</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nom de la société" required autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Supprimer le client</h2></div>
            <p style={{ padding: '0 0 1.5rem' }}>
              Supprimer <strong>{deleteConfirm.name}</strong> ? Les projets associés ne seront pas supprimés.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Barre filtre + taille de page */}
      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Filtrer par nom..."
          value={filter}
          onChange={handleFilterChange}
        />
        <div className="table-pagesize">
          <label>Afficher</label>
          <select value={pageSize} onChange={handlePageSizeChange}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>lignes</span>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="data-table">
            <div className="data-table-header">
              <span>Nom du client</span>
              <span>Projets</span>
              <span>Action</span>
            </div>
            {paginated.map(client => (
              <div key={client.id} className="data-table-row" onClick={() => navigate(`/clients/${client.id}`)}>
                <span className="data-table-name">🏢 {client.name}</span>
                <span className="data-table-sub">{client.projets?.[0]?.count || 0} projet(s)</span>
                <span onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => setDeleteConfirm(client)}
                    title="Supprimer"
                  >🗑</button>
                </span>
              </div>
            ))}
            {paginated.length === 0 && (
              <p className="empty-state">Aucun client trouvé.</p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="table-pagination">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
              <span>Page {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
