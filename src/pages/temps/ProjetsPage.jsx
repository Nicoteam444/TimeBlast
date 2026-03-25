import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import ClientAutocomplete from '../../components/ClientAutocomplete'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const STATUT_COLORS = {
  actif:    { color: '#16a34a', bg: '#f0fdf4' },
  termine:  { color: '#64748b', bg: '#f8fafc' },
  suspendu: { color: '#f59e0b', bg: '#fffbeb' },
}

export default function ProjetsPage({ onSelect }) {
  const { selectedSociete } = useSociete()
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [form, setForm] = useState({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif', societe_id: '' })
  const [societes, setSocietes] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const [consumedHours, setConsumedHours] = useState({})

  useEffect(() => { fetchProjets(); fetchSocietes() }, [selectedSociete?.id])

  async function fetchSocietes() {
    const { data } = await supabase.from('societes').select('id, name').order('name')
    setSocietes(data || [])
  }

  async function fetchProjets() {
    setLoading(true)
    let query = supabase
      .from('projets')
      .select('*, clients(name, societe_id), lots(count), societes:societe_id(id, name)')
      .order('created_at', { ascending: false })
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data } = await query
    const filtered_data = data || []
    setProjets(filtered_data)

    // Fetch consumed hours from saisies_temps
    const { data: saisiesData } = await supabase
      .from('saisies_temps')
      .select('heures, commentaire')
    if (saisiesData) {
      const map = {}
      for (const s of saisiesData) {
        let meta = {}
        try { meta = JSON.parse(s.commentaire || '{}') } catch {}
        const pid = meta.projet_id
        if (pid) map[pid] = (map[pid] || 0) + (s.heures || 0)
      }
      setConsumedHours(map)
    }

    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    await supabase.from('projets').insert({
      name: form.name,
      client_id: selectedClient?.id || null,
      total_jours: parseFloat(form.total_jours),
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      statut: form.statut,
      societe_id: form.societe_id || null,
    })
    setShowForm(false)
    setSelectedClient(null)
    setForm({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif', societe_id: '' })
    fetchProjets()
  }

  async function handleDelete(id) {
    await supabase.from('projets').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchProjets()
  }

  // Budget heures auto-calculated from total_jours
  const budgetHeures = form.total_jours ? Math.round(parseFloat(form.total_jours) * 8 * 10) / 10 : ''

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return q ? projets.filter(p =>
      p.name.toLowerCase().includes(q) || (p.clients?.name || '').toLowerCase().includes(q)
    ) : projets
  }, [projets, filter])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'name', 'asc')
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginated = sortedData.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Projets</h1>
          <p>
            {filtered.length} projet{filtered.length > 1 ? 's' : ''}{filter ? ` sur ${projets.length}` : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light, #eef2ff)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouveau projet</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau projet</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nom du projet</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex : Refonte site web" required autoFocus />
              </div>
              <div className="field">
                <label>Société</label>
                <select value={form.societe_id} onChange={e => setForm(f => ({ ...f, societe_id: e.target.value }))}>
                  <option value="">— Toutes les sociétés —</option>
                  {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Client</label>
                <ClientAutocomplete value={selectedClient} onChange={setSelectedClient} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Budget (jours)</label>
                  <input type="number" min="0" step="0.5" value={form.total_jours} onChange={e => setForm(f => ({ ...f, total_jours: e.target.value }))} placeholder="Ex : 100" required />
                </div>
                <div className="field">
                  <label>Budget heures</label>
                  <div style={{ padding: '.45rem 0', fontWeight: 600, color: 'var(--primary)', fontSize: '.95rem' }}>
                    {budgetHeures ? `${budgetHeures} h` : '—'}
                  </div>
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Date début</label>
                  <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Date fin</label>
                  <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer le projet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Supprimer le projet</h2></div>
            <p style={{ padding: '0 0 1.5rem' }}>
              Supprimer <strong>{deleteConfirm.name}</strong> ? Tous les lots et saisies associés seront supprimés.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Filtrer par nom ou client..."
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1) }}
        />
        <div className="table-pagesize">
          <label>Afficher</label>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>lignes</span>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <SortableHeader label="Projet" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Société" field="societes.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Client" field="clients.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Début" field="date_debut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Fin" field="date_fin" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Charge vendue (j)" field="total_jours" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <SortableHeader label="Consommé / Budget (h)" field="total_jours" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <th style={{ width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(projet => {
                  const s = STATUT_COLORS[projet.statut] || STATUT_COLORS.actif
                  const budgetH = projet.total_jours ? projet.total_jours * 8 : null
                  const consumed = Math.round((consumedHours[projet.id] || 0) * 10) / 10
                  const fmtD = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
                  return (
                    <tr key={projet.id} style={{ cursor: 'pointer' }} onClick={() => onSelect?.(projet)}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar" style={{ background: '#3b82f6', fontSize: '.72rem' }}>📁</span>
                          <span className="user-name">{projet.name}</span>
                        </div>
                      </td>
                      <td>{projet.societes?.name || '—'}</td>
                      <td>{projet.clients?.name || '—'}</td>
                      <td>
                        <span className="status-badge" style={{ color: s.color, background: s.bg }}>
                          {projet.statut}
                        </span>
                      </td>
                      <td className="date-cell">{fmtD(projet.date_debut)}</td>
                      <td className="date-cell">{fmtD(projet.date_fin)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.85rem' }}>
                        {projet.total_jours ? (
                          <span style={{ color: '#2563eb' }}>{projet.total_jours}j</span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.85rem' }}>
                        {budgetH ? (
                          <>
                            <span style={{ color: consumed > budgetH ? '#dc2626' : consumed > budgetH * 0.8 ? '#f59e0b' : '#16a34a' }}>
                              {consumed}h
                            </span>
                            <span style={{ color: '#94a3b8' }}> / {budgetH}h</span>
                            <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, (consumed / budgetH) * 100)}%`, background: consumed > budgetH ? '#dc2626' : consumed > budgetH * 0.8 ? '#f59e0b' : '#16a34a' }} />
                            </div>
                          </>
                        ) : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-icon btn-icon--danger" onClick={() => setDeleteConfirm(projet)} title="Supprimer">🗑</button>
                      </td>
                    </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Aucun projet trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>

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
