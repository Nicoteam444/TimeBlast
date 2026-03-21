import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProjetDetailPage({ projet, onBack }) {
  const [lots, setLots] = useState([])
  const [collaborateurs, setCollaborateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLotForm, setShowLotForm] = useState(false)
  const [lotName, setLotName] = useState('')
  const [lotJours, setLotJours] = useState('')
  const [activeLot, setActiveLot] = useState(null) // lot ouvert pour assignations
  const [assignForm, setAssignForm] = useState({ user_id: '', jours_planifies: '' })

  useEffect(() => {
    fetchLots()
    fetchCollaborateurs()
  }, [projet.id])

  async function fetchLots() {
    setLoading(true)
    const { data } = await supabase
      .from('lots')
      .select('*, assignations(*, profiles(full_name))')
      .eq('projet_id', projet.id)
      .order('created_at')
    setLots(data || [])
    setLoading(false)
  }

  async function fetchCollaborateurs() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['collaborateur', 'manager', 'admin'])
      .order('full_name')
    setCollaborateurs(data || [])
  }

  async function handleCreateLot(e) {
    e.preventDefault()
    await supabase.from('lots').insert({
      projet_id: projet.id,
      name: lotName,
      jours_alloues: parseFloat(lotJours),
    })
    setLotName('')
    setLotJours('')
    setShowLotForm(false)
    fetchLots()
  }

  async function handleDeleteLot(lotId) {
    await supabase.from('lots').delete().eq('id', lotId)
    fetchLots()
  }

  async function handleAssign(e) {
    e.preventDefault()
    await supabase.from('assignations').upsert({
      lot_id: activeLot.id,
      user_id: assignForm.user_id,
      jours_planifies: parseFloat(assignForm.jours_planifies),
    }, { onConflict: 'lot_id,user_id' })
    setAssignForm({ user_id: '', jours_planifies: '' })
    fetchLots()
  }

  async function handleRemoveAssign(assignId) {
    await supabase.from('assignations').delete().eq('id', assignId)
    fetchLots()
  }

  const totalLotsJours = lots.reduce((sum, l) => sum + parseFloat(l.jours_alloues || 0), 0)
  const restant = projet.total_jours - totalLotsJours

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-back" onClick={onBack}>← Projets</button>
          <div>
            <h1>{projet.name}</h1>
            <p>{projet.clients?.name || 'Sans client'} — {projet.total_jours}j total</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowLotForm(true)}>+ Nouveau lot</button>
      </div>

      {/* Barre de progression jours */}
      <div className="projet-progress">
        <div className="projet-progress-labels">
          <span>Lots créés : <strong>{totalLotsJours}j</strong></span>
          <span style={{ color: restant < 0 ? 'var(--error)' : 'var(--text-muted)' }}>
            Restant : <strong>{restant}j</strong>
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min((totalLotsJours / projet.total_jours) * 100, 100)}%`, background: restant < 0 ? 'var(--error)' : 'var(--primary)' }}
          />
        </div>
      </div>

      {/* Formulaire lot */}
      {showLotForm && (
        <div className="modal-overlay" onClick={() => setShowLotForm(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau lot</h2>
              <button className="modal-close" onClick={() => setShowLotForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLot} style={{ padding: '0 1.5rem' }}>
              <div className="field">
                <label>Nom du lot</label>
                <input type="text" value={lotName} onChange={e => setLotName(e.target.value)} placeholder="Ex : Phase 1 - Conception" required autoFocus />
              </div>
              <div className="field">
                <label>Jours alloués</label>
                <input type="number" min="0" step="0.5" value={lotJours} onChange={e => setLotJours(e.target.value)} placeholder="Ex : 20" required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowLotForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal assignation */}
      {activeLot && (
        <div className="modal-overlay" onClick={() => setActiveLot(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assignations — {activeLot.name}</h2>
              <button className="modal-close" onClick={() => setActiveLot(null)}>✕</button>
            </div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              {/* Liste des assignations existantes */}
              {activeLot.assignations?.length > 0 && (
                <div className="assign-list">
                  {activeLot.assignations.map(a => (
                    <div key={a.id} className="assign-row">
                      <span className="assign-name">{a.profiles?.full_name}</span>
                      <span className="assign-jours">{a.jours_planifies}j planifiés</span>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleRemoveAssign(a.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire ajout assignation */}
              <form onSubmit={handleAssign} className="assign-form">
                <div className="field">
                  <label>Collaborateur</label>
                  <select value={assignForm.user_id} onChange={e => setAssignForm(f => ({ ...f, user_id: e.target.value }))} required>
                    <option value="">— Choisir —</option>
                    {collaborateurs
                      .filter(c => !activeLot.assignations?.find(a => a.user_id === c.id))
                      .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)
                    }
                  </select>
                </div>
                <div className="field">
                  <label>Jours planifiés</label>
                  <input type="number" min="0" step="0.5" value={assignForm.jours_planifies} onChange={e => setAssignForm(f => ({ ...f, jours_planifies: e.target.value }))} placeholder="Ex : 10" required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setActiveLot(null)}>Fermer</button>
                  <button type="submit" className="btn-primary">Assigner</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Liste des lots */}
      {loading ? <div className="loading-inline">Chargement...</div> : (
        <div className="lots-list">
          {lots.map(lot => {
            const joursAssignes = lot.assignations?.reduce((s, a) => s + parseFloat(a.jours_planifies || 0), 0) || 0
            return (
              <div key={lot.id} className="lot-card">
                <div className="lot-card-header">
                  <div>
                    <p className="lot-card-name">{lot.name}</p>
                    <p className="lot-card-jours">{lot.jours_alloues}j alloués · {joursAssignes}j assignés</p>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn-secondary" style={{ fontSize: '.8rem', padding: '.375rem .75rem' }} onClick={() => setActiveLot(lot)}>
                      👥 Assigner
                    </button>
                    <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteLot(lot.id)}>🗑</button>
                  </div>
                </div>

                {/* Barre de progression du lot */}
                <div className="progress-bar" style={{ marginTop: '.75rem' }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min((joursAssignes / lot.jours_alloues) * 100, 100)}%` }}
                  />
                </div>

                {/* Collaborateurs assignés */}
                {lot.assignations?.length > 0 && (
                  <div className="lot-assignations">
                    {lot.assignations.map(a => (
                      <span key={a.id} className="assign-chip">
                        {a.profiles?.full_name} · {a.jours_planifies}j
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {lots.length === 0 && <p className="empty-state">Aucun lot. Créez des lots pour décomposer le projet.</p>}
        </div>
      )}
    </div>
  )
}
