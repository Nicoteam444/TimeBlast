import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ClientAutocomplete from '../../components/ClientAutocomplete'

const STATUT_COLORS = {
  actif: { color: '#16a34a', bg: '#f0fdf4' },
  termine: { color: '#64748b', bg: '#f8fafc' },
  suspendu: { color: '#f59e0b', bg: '#fffbeb' },
}

export default function ProjetsPage({ onSelect }) {
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [form, setForm] = useState({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchProjets() }, [])

  async function fetchProjets() {
    setLoading(true)
    const { data } = await supabase
      .from('projets')
      .select('*, clients(name), lots(count)')
      .order('created_at', { ascending: false })
    setProjets(data || [])
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
    })
    setShowForm(false)
    setSelectedClient(null)
    setForm({ name: '', total_jours: '', date_debut: '', date_fin: '', statut: 'actif' })
    fetchProjets()
  }

  async function handleDelete(id) {
    await supabase.from('projets').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchProjets()
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Projets</h1>
          <p>{projets.length} projet{projets.length > 1 ? 's' : ''}</p>
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
                  <label>Jours total</label>
                  <input type="number" min="0" step="0.5" value={form.total_jours} onChange={e => setForm(f => ({ ...f, total_jours: e.target.value }))} placeholder="Ex : 100" required />
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

      {loading ? <div className="loading-inline">Chargement...</div> : (
        <div className="projets-list">
          {projets.map(projet => {
            const s = STATUT_COLORS[projet.statut]
            return (
              <div key={projet.id} className="projet-row" onClick={() => onSelect?.(projet)}>
                <div className="projet-row-main">
                  <div className="projet-row-info">
                    <p className="projet-row-name">{projet.name}</p>
                    <p className="projet-row-client">{projet.clients?.name || 'Sans client'}</p>
                  </div>
                  <div className="projet-row-meta">
                    <span className="status-badge" style={{ color: s.color, background: s.bg }}>{projet.statut}</span>
                    <span className="projet-row-jours">{projet.total_jours}j</span>
                    <span className="projet-row-lots">{projet.lots?.[0]?.count || 0} lot(s)</span>
                    <button className="btn-icon btn-icon--danger" onClick={e => { e.stopPropagation(); setDeleteConfirm(projet) }} title="Supprimer">🗑</button>
                  </div>
                </div>
              </div>
            )
          })}
          {projets.length === 0 && <p className="empty-state">Aucun projet. Créez-en un pour commencer.</p>}
        </div>
      )}
    </div>
  )
}
