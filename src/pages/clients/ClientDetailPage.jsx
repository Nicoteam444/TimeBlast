import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const STATUT_COLORS = {
  actif:    { color: '#16a34a', bg: '#f0fdf4' },
  termine:  { color: '#64748b', bg: '#f8fafc' },
  suspendu: { color: '#f59e0b', bg: '#fffbeb' },
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  useEffect(() => { fetchClient() }, [id])

  async function fetchClient() {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('projets').select('*, lots(count)').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    setClient(c)
    setNameValue(c?.name || '')
    setProjets(p || [])
    setLoading(false)
  }

  async function handleRename(e) {
    e.preventDefault()
    await supabase.from('clients').update({ name: nameValue }).eq('id', id)
    setClient(c => ({ ...c, name: nameValue }))
    setEditName(false)
  }

  if (loading) return <div className="loading-inline">Chargement...</div>
  if (!client) return <div className="admin-page"><p className="empty-state">Client introuvable.</p></div>

  const totalJours = projets.reduce((s, p) => s + parseFloat(p.total_jours || 0), 0)
  const projetsActifs = projets.filter(p => p.statut === 'actif').length

  return (
    <div className="admin-page">
      {/* En-tête */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
          <div>
            {editName ? (
              <form onSubmit={handleRename} style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  autoFocus
                  style={{ fontSize: '1.4rem', fontWeight: 700, padding: '.25rem .5rem', border: '2px solid var(--primary)', borderRadius: 6 }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '.35rem .75rem' }}>Enregistrer</button>
                <button type="button" className="btn-secondary" style={{ padding: '.35rem .75rem' }} onClick={() => { setEditName(false); setNameValue(client.name) }}>Annuler</button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <h1>{client.name}</h1>
                <button className="btn-icon" title="Renommer" onClick={() => setEditName(true)}>✏️</button>
              </div>
            )}
            {client.hubspot_id && (
              <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>HubSpot ID : {client.hubspot_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="client-stats">
        <div className="client-stat">
          <span className="client-stat-value">{projets.length}</span>
          <span className="client-stat-label">Projet{projets.length > 1 ? 's' : ''}</span>
        </div>
        <div className="client-stat">
          <span className="client-stat-value">{projetsActifs}</span>
          <span className="client-stat-label">En cours</span>
        </div>
        <div className="client-stat">
          <span className="client-stat-value">{totalJours}j</span>
          <span className="client-stat-label">Jours total</span>
        </div>
      </div>

      {/* Projets */}
      <div className="section-title">Projets associés</div>

      {projets.length === 0 ? (
        <p className="empty-state">Aucun projet pour ce client.</p>
      ) : (
        <div className="projets-list">
          {projets.map(projet => {
            const s = STATUT_COLORS[projet.statut] || STATUT_COLORS.actif
            return (
              <div key={projet.id} className="projet-row">
                <div className="projet-row-main">
                  <div className="projet-row-info">
                    <p className="projet-row-name">{projet.name}</p>
                    <p className="projet-row-client">
                      {projet.date_debut && new Date(projet.date_debut).toLocaleDateString('fr-FR')}
                      {projet.date_debut && projet.date_fin && ' → '}
                      {projet.date_fin && new Date(projet.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="projet-row-meta">
                    <span className="status-badge" style={{ color: s.color, background: s.bg }}>{projet.statut}</span>
                    <span className="projet-row-jours">{projet.total_jours}j</span>
                    <span className="projet-row-lots">{projet.lots?.[0]?.count || 0} lot(s)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
