import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDemo } from '../../contexts/DemoContext'
import { useSociete } from '../../contexts/SocieteContext'
import { DEMO_NOTES_DE_FRAIS } from '../../data/demoData'
import { supabase } from '../../lib/supabase'

const CATEGORIE_META = {
  transport:    { label: 'Transport',      icon: '🚗', color: '#3b82f6', bg: '#eff6ff' },
  hebergement:  { label: 'Hébergement',   icon: '🏨', color: '#8b5cf6', bg: '#f5f3ff' },
  repas:        { label: 'Repas',          icon: '🍽', color: '#f59e0b', bg: '#fffbeb' },
  materiel:     { label: 'Matériel',       icon: '💻', color: '#0ea5e9', bg: '#f0f9ff' },
  formation:    { label: 'Formation',      icon: '📚', color: '#22c55e', bg: '#f0fdf4' },
  autre:        { label: 'Autre',          icon: '📎', color: '#64748b', bg: '#f8fafc' },
}

const STATUT_META = {
  brouillon:  { label: 'Brouillon',   color: '#64748b', bg: '#f1f5f9' },
  soumis:     { label: 'Soumis',      color: '#f59e0b', bg: '#fffbeb' },
  valide:     { label: 'Validé',      color: '#22c55e', bg: '#f0fdf4' },
  refuse:     { label: 'Refusé',      color: '#ef4444', bg: '#fef2f2' },
  rembourse:  { label: 'Remboursé',   color: '#6366f1', bg: '#eef2ff' },
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMontant(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  categorie: 'repas',
  montant: '',
  description: '',
  justificatif: '',
}

export default function NotesDeFraisPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const { selectedSociete } = useSociete()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [isDemoMode, selectedSociete?.id, profile?.id])

  async function fetchNotes() {
    setLoading(true)
    if (isDemoMode) {
      // En mode démo : admin/manager voient tout, collaborateur voit ses propres notes
      const data = profile?.role === 'collaborateur'
        ? DEMO_NOTES_DE_FRAIS.filter(n => n.user_id === (profile?.id || 'u3'))
        : DEMO_NOTES_DE_FRAIS
      setNotes(data)
      setLoading(false)
      return
    }
    let q = supabase
      .from('notes_de_frais')
      .select('*')
      .order('date', { ascending: false })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    if (profile?.role === 'collaborateur') q = q.eq('user_id', profile.id)
    const { data } = await q
    setNotes(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.montant || !form.description) return
    setSaving(true)
    if (isDemoMode) {
      // Mode démo : ajout local uniquement
      const newNote = {
        ...form,
        id: 'ndf-demo-' + Date.now(),
        montant: parseFloat(form.montant),
        statut: 'brouillon',
        user_id: profile?.id || 'u1',
        user_name: profile?.full_name || 'Utilisateur démo',
      }
      setNotes(prev => [newNote, ...prev])
      setSaving(false)
      setShowForm(false)
      setForm(EMPTY_FORM)
      return
    }
    const payload = {
      ...form,
      montant: parseFloat(form.montant),
      statut: 'brouillon',
      user_id: profile?.id,
      societe_id: selectedSociete?.id,
    }
    await supabase.from('notes_de_frais').insert([payload])
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_FORM)
    fetchNotes()
  }

  async function handleStatut(id, statut) {
    if (isDemoMode) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, statut } : n))
      return
    }
    await supabase.from('notes_de_frais').update({ statut }).eq('id', id)
    fetchNotes()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette note de frais ?')) return
    if (isDemoMode) {
      setNotes(prev => prev.filter(n => n.id !== id))
      return
    }
    await supabase.from('notes_de_frais').delete().eq('id', id)
    fetchNotes()
  }

  // Noms uniques pour le filtre collaborateur (admin/manager uniquement)
  const userNames = useMemo(() => {
    const names = [...new Set(notes.map(n => n.user_name).filter(Boolean))].sort()
    return names
  }, [notes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return notes.filter(n => {
      const matchSearch = !q ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.user_name || '').toLowerCase().includes(q)
      const matchStatut = !filterStatut || n.statut === filterStatut
      const matchCat = !filterCat || n.categorie === filterCat
      const matchUser = !filterUser || n.user_name === filterUser
      return matchSearch && matchStatut && matchCat && matchUser
    })
  }, [notes, search, filterStatut, filterCat, filterUser])

  const total = filtered.reduce((sum, n) => sum + (n.montant || 0), 0)
  const totalValide = notes.filter(n => n.statut === 'valide' || n.statut === 'rembourse').reduce((s, n) => s + (n.montant || 0), 0)
  const totalSoumis = notes.filter(n => n.statut === 'soumis').reduce((s, n) => s + (n.montant || 0), 0)

  const canManage = ['admin', 'manager'].includes(profile?.role)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Notes de frais</h1>
          <p>
            {filtered.length} note{filtered.length > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}>
          + Nouvelle note
        </button>
      </div>

      {/* KPIs */}
      <div className="ndf-kpi-bar">
        {[
          { label: 'Total affiché',  value: fmtMontant(total),        color: '#3b82f6' },
          { label: 'Validé / Remb.', value: fmtMontant(totalValide),  color: '#22c55e' },
          { label: 'En attente',     value: fmtMontant(totalSoumis),  color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="ndf-kpi-chip">
            <span className="ndf-kpi-label">{k.label}</span>
            <span className="ndf-kpi-value" style={{ color: k.color }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="table-toolbar">
        <input
          className="table-search"
          placeholder="Rechercher description, collaborateur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {canManage && userNames.length > 0 && (
          <select className="table-filter-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">Tous les collaborateurs</option>
            {userNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <select className="table-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select className="table-filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Modal ajout */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle note de frais</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {Object.entries(CATEGORIE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Description *</label>
                  <input
                    type="text"
                    placeholder="Ex : Déjeuner client Untel"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ width: 140 }}>
                  <label>Montant TTC (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Référence justificatif</label>
                <input
                  type="text"
                  placeholder="Numéro de facture, URL, note…"
                  value={form.justificatif}
                  onChange={e => setForm(f => ({ ...f, justificatif: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-inline">Chargement…</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Date</th>
                {canManage && <th>Collaborateur</th>}
                <th>Catégorie</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Statut</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const cat = CATEGORIE_META[n.categorie] || CATEGORIE_META.autre
                const stat = STATUT_META[n.statut] || STATUT_META.brouillon
                const initials = n.user_name ? n.user_name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : '?'
                return (
                  <tr key={n.id}>
                    <td className="date-cell">{fmtDate(n.date)}</td>
                    {canManage && (
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar" style={{ background: '#1a5c82', fontSize: '.65rem' }}>{initials}</span>
                          <span className="user-name" style={{ fontSize: '.82rem' }}>{n.user_name || '—'}</span>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className="status-badge" style={{ color: cat.color, background: cat.bg }}>
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td style={{ maxWidth: 280 }}>{n.description}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtMontant(n.montant)}</td>
                    <td>
                      {canManage && n.statut === 'soumis' ? (
                        <div style={{ display: 'flex', gap: '.35rem' }}>
                          <button
                            className="btn-icon"
                            style={{ color: '#22c55e' }}
                            title="Valider"
                            onClick={() => handleStatut(n.id, 'valide')}
                          >✓</button>
                          <button
                            className="btn-icon"
                            style={{ color: '#ef4444' }}
                            title="Refuser"
                            onClick={() => handleStatut(n.id, 'refuse')}
                          >✕</button>
                        </div>
                      ) : (
                        <span className="status-badge" style={{ color: stat.color, background: stat.bg }}>
                          {stat.label}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '.35rem' }}>
                          {n.statut === 'valide' && (
                            <button
                              className="btn-icon"
                              title="Marquer remboursé"
                              onClick={() => handleStatut(n.id, 'rembourse')}
                            >💸</button>
                          )}
                          {n.statut === 'brouillon' && (
                            <button
                              className="btn-icon"
                              title="Soumettre"
                              onClick={() => handleStatut(n.id, 'soumis')}
                            >📤</button>
                          )}
                          <button
                            className="btn-icon btn-icon--danger"
                            title="Supprimer"
                            onClick={() => handleDelete(n.id)}
                          >🗑</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Aucune note de frais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
