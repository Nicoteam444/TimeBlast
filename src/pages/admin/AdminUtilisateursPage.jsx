import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const ROLES = ['collaborateur', 'manager', 'comptable', 'admin']
const ROLE_LABELS = {
  collaborateur: 'Collaborateur',
  manager: 'Manager',
  comptable: 'Comptable',
  admin: 'Administrateur',
}
const ROLE_COLORS = {
  collaborateur: '#64748b',
  manager: '#0891b2',
  comptable: '#7c3aed',
  admin: '#dc2626',
}

function getStatus(user) {
  if (!user.email_confirmed_at && user.invited_at) return { label: 'Invitation envoyée', color: '#f59e0b', bg: '#fffbeb' }
  if (!user.email_confirmed_at) return { label: 'Non confirmé', color: '#f59e0b', bg: '#fffbeb' }
  if (!user.last_sign_in_at) return { label: 'Jamais connecté', color: '#64748b', bg: '#f8fafc' }
  return { label: 'Actif', color: '#16a34a', bg: '#f0fdf4' }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminUtilisateursPage() {
  const [users, setUsers]             = useState([])
  const [societes, setSocietes]       = useState([])
  const [groupes, setGroupes]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ full_name: '', email: '', password: '', role: 'collaborateur', societe_id: '', send_invite: true })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchUsers()
    supabase.from('societes').select('id, name, groupe_id, groupes(id, name, color)').order('name')
      .then(({ data }) => setSocietes(data || []))
    supabase.from('groupes').select('id, name, color').order('name')
      .then(({ data }) => setGroupes(data || []))
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.rpc('get_users_with_auth')
    setUsers(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'create', ...form },
    })

    setFormLoading(false)

    if (error || data?.error) {
      setFormError(data?.error || error.message)
    } else {
      // Si une société est choisie, mettre à jour le profil créé
      if (form.societe_id && data?.user?.id) {
        await supabase.from('profiles').update({ societe_id: form.societe_id }).eq('id', data.user.id)
      }
      setShowForm(false)
      setForm({ full_name: '', email: '', password: '', role: 'collaborateur', societe_id: '', send_invite: true })
      fetchUsers()
    }
  }

  async function handleRoleChange(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function handleSocieteChange(userId, societeId) {
    await supabase.from('profiles').update({ societe_id: societeId || null }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, societe_id: societeId || null } : u))
  }

  async function handleDelete(userId) {
    await supabase.functions.invoke('manage-user', {
      body: { action: 'delete', user_id: userId },
    })
    setDeleteConfirm(null)
    fetchUsers()
  }

  function getSocieteName(societeId) {
    return societes.find(s => s.id === societeId)?.name || '—'
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Utilisateurs</h1>
          <p>{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Créer un utilisateur</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nom complet</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Prénom Nom"
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
              <div className="field">
                <label>Mode de création</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${form.send_invite ? 'toggle-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, send_invite: true }))}
                  >📧 Invitation par email</button>
                  <button
                    type="button"
                    className={`toggle-btn ${!form.send_invite ? 'toggle-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, send_invite: false }))}
                  >🔑 Mot de passe direct</button>
                </div>
              </div>

              {!form.send_invite && (
                <div className="field">
                  <label>Mot de passe temporaire</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="8 caractères minimum"
                    minLength={8}
                    required={!form.send_invite}
                  />
                </div>
              )}

              <div className="field">
                <label>Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>

              {societes.length > 0 && (
                <div className="field">
                  <label>Société</label>
                  <select
                    value={form.societe_id}
                    onChange={e => setForm(f => ({ ...f, societe_id: e.target.value }))}
                  >
                    <option value="">— Aucune —</option>
                    {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer l'utilisateur</h2>
            </div>
            <p style={{ padding: '0 0 1.5rem' }}>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.full_name}</strong> ? Cette action est irréversible.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des utilisateurs */}
      {loading ? (
        <div className="loading-inline">Chargement...</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Société</th>
                <th>Groupe</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const status = getStatus(user)
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar" style={{ background: ROLE_COLORS[user.role] }}>
                          {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                        <div>
                          <p className="user-name">{user.full_name || '—'}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {societes.length > 0 ? (
                        <select
                          className="role-select"
                          value={user.societe_id || ''}
                          onChange={e => handleSocieteChange(user.id, e.target.value)}
                          style={{ '--role-color': '#1a5c82', minWidth: 130 }}
                        >
                          <option value="">— Aucune —</option>
                          {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const societe = societes.find(s => s.id === user.societe_id)
                        const groupe = societe?.groupes
                        return groupe ? (
                          <span className="status-badge" style={{
                            color: groupe.color,
                            background: groupe.color + '18',
                            fontSize: '.72rem',
                            fontWeight: 600,
                          }}>
                            🏛 {groupe.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>
                        )
                      })()}
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        style={{ '--role-color': ROLE_COLORS[user.role] }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className="status-badge" style={{ color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="date-cell">{formatDateTime(user.last_sign_in_at)}</td>
                    <td className="date-cell">{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        className="btn-icon btn-icon--danger"
                        onClick={() => setDeleteConfirm(user)}
                        title="Supprimer"
                      >🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bloc SQL migration */}
      {societes.length === 0 && (
        <div className="fec-sql-box" style={{ marginTop: '2rem' }}>
          <p>⚠ La colonne <code>societe_id</code> n'existe pas encore dans la table <code>profiles</code>.<br />
          Exécutez ce SQL dans <strong>Supabase → SQL Editor</strong> :</p>
          <pre>{`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);`}</pre>
        </div>
      )}
    </div>
  )
}
