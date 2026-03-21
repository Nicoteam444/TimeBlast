import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import ClientAutocomplete from '../../components/ClientAutocomplete'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_PROJETS, DEMO_SAISIES } from '../../data/demoData'

const STATUT_COLORS = {
  actif:    { color: '#16a34a', bg: '#f0fdf4' },
  termine:  { color: '#64748b', bg: '#f8fafc' },
  suspendu: { color: '#f59e0b', bg: '#fffbeb' },
}

// Compute consumed hours per project from DEMO_SAISIES
function getDemoConsumedHours() {
  const map = {}
  for (const s of DEMO_SAISIES) {
    let meta = {}
    try { meta = JSON.parse(s.commentaire || '{}') } catch {}
    const pid = meta.projet_id
    if (pid) map[pid] = (map[pid] || 0) + (s.heures || 0)
  }
  return map
}

export default function ProjetsPage({ onSelect }) {
  const { isDemoMode } = useDemo()
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [form, setForm] = useState({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  // Consumed hours per project (real mode fetched, demo mode computed)
  const [consumedHours, setConsumedHours] = useState({})

  useEffect(() => { fetchProjets() }, [isDemoMode])

  async function fetchProjets() {
    setLoading(true)
    if (isDemoMode) {
      setProjets(DEMO_PROJETS)
      setConsumedHours(getDemoConsumedHours())
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('projets')
      .select('*, clients(name), lots(count)')
      .order('created_at', { ascending: false })
    setProjets(data || [])

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
    if (isDemoMode) { setShowForm(false); setSelectedClient(null); setForm({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif' }); return }
    await supabase.from('projets').insert({
      name: form.name,
      client_id: selectedClient?.id || null,
      total_jours: parseFloat(form.total_jours),
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      statut: form.statut,
    })
    setShowForm(false)
    setSelectedClient(null)
    setForm({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif' })
    fetchProjets()
  }

  async function handleDelete(id) {
    if (isDemoMode) { setDeleteConfirm(null); return }
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

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Projets</h1>
          <p>{filtered.length} projet{filtered.length > 1 ? 's' : ''}{filter ? ` sur ${projets.length}` : ''}</p>
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

      {loading ? <div className="loading-inline">Chargement...</div> : (
        <>
          <div className="data-table data-table--projets">
            <div className="data-table-header">
              <span>Nom du projet</span>
              <span>Client</span>
              <span>Statut</span>
              <span>Budget</span>
              <span>Action</span>
            </div>
            {paginated.map(projet => {
              const s = STATUT_COLORS[projet.statut] || STATUT_COLORS.actif
              const budgetJ = projet.total_jours
              const budgetH = budgetJ ? budgetJ * 8 : null
              const consumed = Math.round((consumedHours[projet.id] || 0) * 10) / 10
              const pct = budgetH ? Math.min(100, Math.round(consumed / budgetH * 100)) : 0
              const isOver = budgetH && consumed > budgetH
              return (
                <div key={projet.id} className="data-table-row" onClick={() => onSelect?.(projet)}>
                  <span className="data-table-name">📁 {projet.name}</span>
                  <span className="data-table-sub">{projet.clients?.name || '—'}</span>
                  <span>
                    <span className="status-badge" style={{ color: s.color, background: s.bg }}>
                      {projet.statut}
                    </span>
                  </span>
                  <span>
                    {budgetH ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.82rem', whiteSpace: 'nowrap' }}>
                        <span style={{ color: isOver ? '#dc2626' : 'var(--text)' }}>
                          {consumed}h / {budgetH}h
                        </span>
                        <span className="budget-bar-wrap">
                          <span
                            className={`budget-bar-fill${isOver ? ' budget-bar-fill--over' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>
                    )}
                  </span>
                  <span onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-icon btn-icon--danger"
                      onClick={() => setDeleteConfirm(projet)}
                      title="Supprimer"
                    >🗑</button>
                  </span>
                </div>
              )
            })}
            {paginated.length === 0 && (
              <p className="empty-state">Aucun projet trouvé.</p>
            )}
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
