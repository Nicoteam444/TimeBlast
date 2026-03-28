import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const ROLES = ['collaborateur', 'manager', 'comptable', 'admin']
const ROLE_LABELS = {
  collaborateur: 'Collaborateur',
  manager: 'Manager',
  comptable: 'Comptable',
  admin: 'Administrateur'}
const ROLE_COLORS = {
  collaborateur: '#64748b',
  manager: '#0891b2',
  comptable: '#7c3aed',
  admin: '#dc2626',
  superadmin: '#7c3aed'}
const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

function getRoleDisplay(user) {
  if (user.email === SUPER_ADMIN_EMAIL) return { label: 'Super Administrateur', color: '#7c3aed' }
  return { label: ROLE_LABELS[user.role] || user.role, color: ROLE_COLORS[user.role] || '#64748b' }
}

function getStatus(user) {
  if (user.actif === false) return { label: 'Désactivé', color: '#dc2626', bg: '#fef2f2' }
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

const EMPTY_CREATE = {
  prenom: '', nom: '', email: '', password: '', role: 'collaborateur',
  societe_id: '', send_invite: true,
  telephone: '', poste: '', date_embauche: '', date_naissance: ''}

function splitFullName(fullName) {
  if (!fullName) return { prenom: '', nom: '' }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { prenom: '', nom: parts[0] }
  return { prenom: parts[0], nom: parts.slice(1).join(' ') }
}

export default function AdminUtilisateursPage() {
  const [users, setUsers]             = useState([])
  const [societes, setSocietes]       = useState([])
  const [groupes, setGroupes]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_CREATE)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editUser, setEditUser]       = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError]     = useState(null)
  const [search, setSearch]           = useState('')
  const [filterRole, setFilterRole]   = useState('')
  const [filterSociete, setFilterSociete] = useState('')
  const [showMigration, setShowMigration] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const { user: authUser } = useAuth()
  const isSuperAdmin = authUser?.email === SUPER_ADMIN_EMAIL

  useEffect(() => {
    fetchUsers()
    supabase.from('societes').select('id, name, groupe_id, groupes(id, name, color)').order('name').then(({ data }) => setSocietes(data || []))
    supabase.from('groupes').select('id, name, color').order('name').then(({ data }) => setGroupes(data || []))
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
    const submitPayload = { ...form, full_name: [form.prenom, form.nom].filter(Boolean).join(' ') }
    delete submitPayload.prenom
    delete submitPayload.nom
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'create', ...submitPayload }})
    setFormLoading(false)
    if (error || data?.error) {
      setFormError(data?.error || error.message); return
    }
    if (data?.user?.id) {
      const profileUpdate = { role: form.role, modules: form.modules || [] }
      if (form.societe_id) profileUpdate.societe_id = form.societe_id
      if (form.telephone) profileUpdate.telephone = form.telephone
      if (form.poste) profileUpdate.poste = form.poste
      if (form.date_embauche) profileUpdate.date_embauche = form.date_embauche
      await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
      // Ajouter l'utilisateur à tous les environnements actifs
      const { data: envs } = await supabase.from('environments').select('id').eq('is_active', true)
      if (envs?.length) {
        const inserts = envs.map(env => ({ user_id: data.user.id, environment_id: env.id }))
        await supabase.from('user_environments').upsert(inserts, { onConflict: 'user_id,environment_id' })
      }
    }
    setShowForm(false)
    setForm(EMPTY_CREATE)
    fetchUsers()
  }

  function openEdit(user) {
    setEditUser(user)
    const { prenom, nom } = splitFullName(user.full_name)
    setEditForm({
      prenom,
      nom,
      role: user.role || 'collaborateur',
      societe_id: user.societe_id || '',
      telephone: user.telephone || '',
      poste: user.poste || '',
      date_embauche: user.date_embauche ? user.date_embauche.split('T')[0] : '',
      actif: user.actif !== false,
      modules: user.modules || []})
    setEditError(null)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    const update = {
      full_name: [editForm.prenom, editForm.nom].filter(Boolean).join(' '),
      role: editForm.role,
      modules: editForm.modules || [],}
    // Optional fields — may not exist in profiles yet
    if (editForm.telephone !== undefined) update.telephone = editForm.telephone || null
    if (editForm.poste !== undefined) update.poste = editForm.poste || null
    if (editForm.date_embauche !== undefined) update.date_embauche = editForm.date_embauche || null
    if (editForm.actif !== undefined) update.actif = editForm.actif
    const { error } = await supabase.from('profiles').update(update).eq('id', editUser.id)
    setEditLoading(false)
    if (error) { setEditError(error.message); return }
    setEditUser(null)
    fetchUsers()
  }

  async function handleDeactivate(userId) {
    try {
      await supabase.from('profiles').update({ actif: false }).eq('id', userId)
      alert('Utilisateur désactivé')
    } catch (err) { alert('Erreur: ' + err.message) }
    setDeleteConfirm(null)
    fetchUsers()
  }

  async function handleDeletePermanent(userId) {
    try {
      const { data, error } = await supabase.rpc('delete_user_cascade', { target_user_id: userId })
      if (error) throw new Error(error.message)
      if (data !== 'deleted') throw new Error('Suppression incomplète')
      alert('Utilisateur supprimé définitivement')
    } catch (err) { alert('Erreur: ' + err.message) }
    setDeleteConfirm(null)
    fetchUsers()
  }

  const filtered = useMemo(() => {
    let list = users
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.poste || '').toLowerCase().includes(q)
      )
    }
    if (filterRole) list = list.filter(u => u.role === filterRole)
    if (filterSociete) list = list.filter(u => u.societe_id === filterSociete)
    return list
  }, [users, search, filterRole, filterSociete])

  const filteredWithNames = useMemo(() =>
    filtered.map(u => {
      const { prenom, nom } = splitFullName(u.full_name)
      return { ...u, _prenom: prenom, _nom: nom }
    }), [filtered])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filteredWithNames, '_nom', 'asc')

  const stats = {
    actifs: users.filter(u => getStatus(u).label === 'Actif').length,
    invites: users.filter(u => getStatus(u).label === 'Invitation envoyée').length,
    admins: users.filter(u => u.role === 'admin').length}

  return (
    <div className="admin-page admin-page--full">
      <div className="admin-page-header">
        <div>
          <h1>Utilisateurs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} —&nbsp;
            <span style={{ color: '#16a34a' }}>{stats.actifs} actifs</span>
            {stats.invites > 0 && <span style={{ color: '#f59e0b' }}> · {stats.invites} invitation{stats.invites > 1 ? 's' : ''} en attente</span>}
            {stats.admins > 0 && <span style={{ color: '#dc2626' }}> · {stats.admins} admin{stats.admins > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowMigration(v => !v)}
            title="Propositions de champs supplémentaires"
            style={{ fontSize: '.82rem' }}
          >
            💡 Ajouter des champs
          </button>
          <button className="btn-primary" onClick={() => { setShowForm(true); setFormError(null) }}>
            + Nouvel utilisateur
          </button>
        </div>
      </div>

      <>

      {/* ── Proposition migration ── */}
      {showMigration && (
        <div className="users-proposal-box">
          <div className="users-proposal-header">
            <span>💡 Champs supplémentaires disponibles</span>
            <button className="modal-close" onClick={() => setShowMigration(false)}>✕</button>
          </div>
          <p style={{ marginBottom: '.75rem', color: 'var(--text-muted)', fontSize: '.88rem' }}>
            Ces colonnes n'existent pas encore dans la table <code>profiles</code>.
            Exécutez ce SQL dans <strong>Supabase → SQL Editor</strong> pour les activer :
          </p>
          <div className="proposal-fields-grid">
            <div className="proposal-field"><span className="proposal-icon">📞</span><strong>telephone</strong><span>Numéro de téléphone</span></div>
            <div className="proposal-field"><span className="proposal-icon">💼</span><strong>poste</strong><span>Intitulé du poste (ex : Chef de projet)</span></div>
            <div className="proposal-field"><span className="proposal-icon">📅</span><strong>date_embauche</strong><span>Date d'arrivée dans la société</span></div>
            <div className="proposal-field"><span className="proposal-icon">✅</span><strong>actif</strong><span>Actif / Inactif (sans supprimer le compte)</span></div>
            <div className="proposal-field"><span className="proposal-icon">🏢</span><strong>departement</strong><span>Département / pôle (ex : Technique, RH)</span></div>
            <div className="proposal-field"><span className="proposal-icon">📍</span><strong>localisation</strong><span>Site ou lieu de travail</span></div>
            <div className="proposal-field"><span className="proposal-icon">💰</span><strong>taux_journalier</strong><span>TJM pour le calcul de rentabilité</span></div>
            <div className="proposal-field"><span className="proposal-icon">🎂</span><strong>date_naissance</strong><span>Date de naissance (calcul ancienneté)</span></div>
          </div>
          <pre className="proposal-sql">{`ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telephone     text,
  ADD COLUMN IF NOT EXISTS poste         text,
  ADD COLUMN IF NOT EXISTS date_embauche date,
  ADD COLUMN IF NOT EXISTS actif         boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS departement   text,
  ADD COLUMN IF NOT EXISTS localisation  text,
  ADD COLUMN IF NOT EXISTS taux_journalier numeric(10,2),
  ADD COLUMN IF NOT EXISTS date_naissance date;`}</pre>
          <button
            className="btn-secondary"
            style={{ marginTop: '.5rem', fontSize: '.82rem' }}
            onClick={() => {
              const sql = `ALTER TABLE profiles\n  ADD COLUMN IF NOT EXISTS telephone     text,\n  ADD COLUMN IF NOT EXISTS poste         text,\n  ADD COLUMN IF NOT EXISTS date_embauche date,\n  ADD COLUMN IF NOT EXISTS actif         boolean DEFAULT true,\n  ADD COLUMN IF NOT EXISTS departement   text,\n  ADD COLUMN IF NOT EXISTS localisation  text,\n  ADD COLUMN IF NOT EXISTS taux_journalier numeric(10,2),\n  ADD COLUMN IF NOT EXISTS date_naissance date;`
              navigator.clipboard.writeText(sql)
            }}
          >📋 Copier le SQL</button>
        </div>
      )}

      {/* ── Modale création ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Créer un utilisateur</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Prénom *</label>
                  <input type="text" value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    placeholder="Prénom" required autoFocus />
                </div>
                <div className="field">
                  <label>Nom *</label>
                  <input type="text" value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom" required />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemple.com" required />
                </div>
                <div className="field">
                  <label>Poste / Fonction</label>
                  <input type="text" value={form.poste}
                    onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}
                    placeholder="Ex : Chef de projet" />
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input type="tel" value={form.telephone}
                    onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    placeholder="06 00 00 00 00" />
                </div>
                <div className="field">
                  <label>Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Modules accessibles</span>
                    <button type="button" onClick={() => {
                      const allOn = MODULES.filter(m => m.id !== 'administration').every(m => (form.modules || []).includes(m.id))
                      setForm(f => ({ ...f, modules: allOn ? [] : MODULES.filter(m => m.id !== 'administration').map(m => m.id) }))
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: '#195C82', fontWeight: 600 }}>
                      {MODULES.filter(m => m.id !== 'administration').every(m => (form.modules || []).includes(m.id)) ? '✕ Tout décocher' : '✓ Tout cocher'}
                    </button>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6, marginTop: 4 }}>
                    {MODULES.filter(m => m.id !== 'administration').map(m => {
                      const isOn = (form.modules || []).includes(m.id)
                      return (
                        <label key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                          borderRadius: 8, border: '1.5px solid', cursor: 'pointer',
                          borderColor: isOn ? '#195C82' : '#e2e8f0',
                          background: isOn ? '#eef6fb' : '#fff', fontSize: '.8rem', fontWeight: 600,
                          color: isOn ? '#195C82' : '#94a3b8', transition: 'all .15s'
                        }}>
                          <input type="checkbox" checked={isOn} onChange={() => {
                            setForm(f => {
                              const modules = f.modules || []
                              return { ...f, modules: isOn ? modules.filter(id => id !== m.id) : [...modules, m.id] }
                            })
                          }} style={{ display: 'none' }} />
                          <span>{m.icon}</span> {m.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="field">
                  <label>Date de naissance</label>
                  <input type="date" value={form.date_naissance || ''}
                    onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
                </div>
                {societes.length > 0 && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Société</label>
                    <select value={form.societe_id} onChange={e => setForm(f => ({ ...f, societe_id: e.target.value }))}>
                      <option value="">— Aucune —</option>
                      {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="field" style={{ marginTop: '.5rem' }}>
                <label>Mode de création</label>
                <div className="toggle-group">
                  <button type="button"
                    className={`toggle-btn ${form.send_invite ? 'toggle-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, send_invite: true }))}
                  >📧 Invitation par email</button>
                  <button type="button"
                    className={`toggle-btn ${!form.send_invite ? 'toggle-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, send_invite: false }))}
                  >🔑 Mot de passe direct</button>
                </div>
              </div>
              {!form.send_invite && (
                <div className="field">
                  <label>Mot de passe temporaire</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="8 caractères minimum" minLength={8} required={!form.send_invite} />
                </div>
              )}

              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale édition ── */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <span className="user-avatar user-avatar--lg" style={{ background: ROLE_COLORS[editUser.role] }}>
                  {editUser.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </span>
                <div>
                  <h2 style={{ margin: 0 }}>Modifier l'utilisateur</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '.85rem' }}>{editUser.email}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditUser(null)}>✕</button>
            </div>

            {/* Infos lecture seule */}
            <div className="edit-user-meta">
              <div className="edit-user-meta-item">
                <span className="edit-user-meta-label">Statut</span>
                <span>{(() => { const s = getStatus(editUser); return <span className="status-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span> })()}</span>
              </div>
              <div className="edit-user-meta-item">
                <span className="edit-user-meta-label">Créé le</span>
                <span>{formatDate(editUser.created_at)}</span>
              </div>
              <div className="edit-user-meta-item">
                <span className="edit-user-meta-label">Dernière connexion</span>
                <span>{formatDateTime(editUser.last_sign_in_at)}</span>
              </div>
              {editUser.invited_at && (
                <div className="edit-user-meta-item">
                  <span className="edit-user-meta-label">Invitation envoyée</span>
                  <span>{formatDate(editUser.invited_at)}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleEdit}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Prénom</label>
                  <input type="text" value={editForm.prenom}
                    onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))}
                    placeholder="Prénom" />
                </div>
                <div className="field">
                  <label>Nom</label>
                  <input type="text" value={editForm.nom}
                    onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom" />
                </div>
                <div className="field">
                  <label>Poste / Fonction</label>
                  <input type="text" value={editForm.poste}
                    onChange={e => setEditForm(f => ({ ...f, poste: e.target.value }))}
                    placeholder="Ex : Chef de projet" />
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input type="tel" value={editForm.telephone}
                    onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))}
                    placeholder="06 00 00 00 00" />
                </div>
                <div className="field">
                  <label>Rôle</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Modules accessibles</span>
                    <button type="button" onClick={() => {
                      const allOn = MODULES.filter(m => m.id !== 'administration').every(m => (editForm.modules || []).includes(m.id))
                      setEditForm(f => ({ ...f, modules: allOn ? [] : MODULES.filter(m => m.id !== 'administration').map(m => m.id) }))
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: '#195C82', fontWeight: 600 }}>
                      {MODULES.filter(m => m.id !== 'administration').every(m => (editForm.modules || []).includes(m.id)) ? '✕ Tout décocher' : '✓ Tout cocher'}
                    </button>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6, marginTop: 4 }}>
                    {MODULES.filter(m => m.id !== 'administration').map(m => {
                      const isOn = (editForm.modules || []).includes(m.id)
                      return (
                        <label key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                          borderRadius: 8, border: '1.5px solid', cursor: 'pointer',
                          borderColor: isOn ? '#195C82' : '#e2e8f0',
                          background: isOn ? '#eef6fb' : '#fff', fontSize: '.8rem', fontWeight: 600,
                          color: isOn ? '#195C82' : '#94a3b8', transition: 'all .15s'
                        }}>
                          <input type="checkbox" checked={isOn} onChange={() => {
                            setEditForm(f => {
                              const modules = f.modules || []
                              return { ...f, modules: isOn ? modules.filter(id => id !== m.id) : [...modules, m.id] }
                            })
                          }} style={{ display: 'none' }} />
                          <span>{m.icon}</span> {m.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="field">
                  <label>Compte actif</label>
                  <div className="toggle-group">
                    <button type="button"
                      className={`toggle-btn ${editForm.actif ? 'toggle-btn--active' : ''}`}
                      onClick={() => setEditForm(f => ({ ...f, actif: true }))}
                    >✅ Actif</button>
                    <button type="button"
                      className={`toggle-btn ${!editForm.actif ? 'toggle-btn--active' : ''}`}
                      onClick={() => setEditForm(f => ({ ...f, actif: false }))}
                    >⛔ Inactif</button>
                  </div>
                </div>
                {societes.length > 0 && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Société</label>
                    <select value={editForm.societe_id} onChange={e => setEditForm(f => ({ ...f, societe_id: e.target.value }))}>
                      <option value="">— Aucune —</option>
                      {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {editError && <p className="error">{editError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditUser(null)}>Annuler</button>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ marginRight: 'auto' }}
                  onClick={() => { setEditUser(null); setDeleteConfirm(editUser) }}
                >🗑 Supprimer</button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation suppression ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gérer l'utilisateur</h2>
            </div>
            <p style={{ padding: '0 0 1rem' }}>
              Que souhaitez-vous faire avec <strong>{deleteConfirm.full_name}</strong> ?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: '1rem' }}>
              <button onClick={() => handleDeactivate(deleteConfirm.id)}
                style={{ padding: '.75rem 1rem', borderRadius: 8, border: '1.5px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                ⏸ Désactiver le compte
                <div style={{ fontSize: '.75rem', fontWeight: 400, color: '#b45309', marginTop: 2 }}>L'utilisateur ne pourra plus se connecter. Ses données sont conservées.</div>
              </button>
              <button onClick={() => { if (confirm('⚠️ Cette action est IRRÉVERSIBLE. Supprimer définitivement ?')) handleDeletePermanent(deleteConfirm.id) }}
                style={{ padding: '.75rem 1rem', borderRadius: 8, border: '1.5px solid #ef4444', background: '#fef2f2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                🗑 Supprimer définitivement
                <div style={{ fontSize: '.75rem', fontWeight: 400, color: '#b91c1c', marginTop: 2 }}>Supprime le compte et toutes les données associées. Irréversible.</div>
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barre de filtres ── */}
      <div className="users-filter-bar">
        <input
          className="table-search"
          type="text"
          placeholder="🔍 Rechercher par nom, email, poste..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="table-select"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        {societes.length > 0 && (
          <select
            className="table-select"
            value={filterSociete}
            onChange={e => setFilterSociete(e.target.value)}
          >
            <option value="">Toutes les sociétés</option>
            {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {(search || filterRole || filterSociete) && (
          <button className="btn-secondary" style={{ fontSize: '.82rem' }}
            onClick={() => { setSearch(''); setFilterRole(''); setFilterSociete('') }}>
            ✕ Effacer
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '.82rem', whiteSpace: 'nowrap' }}>
          {sortedData.length} / {users.length}
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Prénom" field="_prenom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Nom" field="_nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Email" field="email" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Poste" field="poste" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Société / Groupe" field="societe_id" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Rôle / Statut" field="role" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Dernière connexion" field="last_sign_in_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Inscription" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sortedData.map(user => {
                const status = getStatus(user)
                const societe = societes.find(s => s.id === user.societe_id)
                const groupe = societe?.groupes
                return (
                  <tr key={user.id} style={{ opacity: user.actif === false ? 0.5 : 1, cursor: 'pointer' }} onClick={() => openEdit(user)}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar" style={{ background: ROLE_COLORS[user.role] }}>
                          {`${(user._prenom || '')[0] || ''}${(user._nom || '')[0] || ''}`.toUpperCase() || '?'}
                        </span>
                        <span className="user-name">{user._prenom || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {user._nom || '—'}
                        {user.actif === false && <span style={{ marginLeft: '.4rem', fontSize: '.72rem', color: '#dc2626', fontWeight: 600 }}>INACTIF</span>}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '.85rem', color: '#2563eb' }}>{user.email || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '.82rem', color: '#475569' }}>{user.poste || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                        <span style={{ fontSize: '.82rem' }}>
                          {societe?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </span>
                        {groupe && (
                          <span className="status-badge" style={{
                            color: groupe.color,
                            background: groupe.color + '18',
                            fontSize: '.7rem',
                            fontWeight: 600,
                            width: 'fit-content'}}>🏛 {groupe.name}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                        <span className="status-badge" style={{ color: getRoleDisplay(user).color, background: getRoleDisplay(user).color + '18', fontSize: '.72rem', fontWeight: 600, width: 'fit-content' }}>
                          {getRoleDisplay(user).label}
                        </span>
                        <span className="status-badge" style={{ color: status.color, background: status.bg, width: 'fit-content' }}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="date-cell">{formatDateTime(user.last_sign_in_at)}</td>
                    <td className="date-cell">
                      <span>{formatDate(user.created_at)}</span>
                    </td>
                  </tr>
                )
              })}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </>
    </div>
  )
}

// ── Matrice de permissions ──────────────────────────────────────
const MODULES = [
  { id: 'calendrier', label: 'Calendrier', icon: '📆', subs: [
    { id: 'saisie', label: 'Saisie des temps' },
  ]},
  { id: 'activite', label: 'Activité', icon: '⏱', subs: [
    { id: 'planification', label: 'Planification' },
    { id: 'projets', label: 'Gestion de projet' },
    { id: 'reporting', label: 'Reporting temps' },
    { id: 'rentabilite', label: 'Rentabilité' },
  ]},
  { id: 'equipe', label: 'Équipe', icon: '👥', subs: [
    { id: 'collaborateurs', label: 'Collaborateurs' },
    { id: 'absences', label: 'Absences' },
    { id: 'validations', label: 'Validations' },
    { id: 'notes-de-frais', label: 'Notes de frais' },
    { id: 'trombinoscope', label: 'Trombinoscope' },
    { id: 'organigramme', label: 'Organigramme' },
    { id: 'competences', label: 'Compétences' },
  ]},
  { id: 'gestion', label: 'Gestion', icon: '🧾', subs: [
    { id: 'tableau-de-bord', label: 'Tableau de bord' },
    { id: 'transactions', label: 'Transactions bancaires' },
    { id: 'ventes', label: 'Ventes' },
    { id: 'achats', label: 'Achats' },
    { id: 'stock', label: 'Stock' },
  ]},
  { id: 'crm', label: 'CRM', icon: '🎯', subs: [
    { id: 'contacts', label: 'Contacts' },
    { id: 'entreprises', label: 'Entreprises' },
    { id: 'clients', label: 'Clients' },
    { id: 'opportunites', label: 'Opportunités' },
    { id: 'devis', label: 'Devis' },
    { id: 'produits', label: 'Produits' },
    { id: 'abonnements', label: 'Abonnements' },
  ]},
  { id: 'marketing', label: 'Marketing', icon: '📣', subs: [
    { id: 'campagnes', label: 'Campagnes' },
    { id: 'leads', label: 'Leads' },
  ]},
  { id: 'finance', label: 'Finance', icon: '💰', subs: [
    { id: 'business-intelligence', label: 'Business Intelligence' },
    { id: 'comptabilite', label: 'Comptabilité' },
    { id: 'previsionnel', label: 'Prévisionnel' },
    { id: 'immobilisations', label: 'Immobilisations' },
    { id: 'rapprochement', label: 'Rapprochement' },
  ]},
  { id: 'documents', label: 'Documents', icon: '📁', subs: [
    { id: 'archives', label: 'Archives' },
  ]},
  { id: 'workflows', label: 'Workflows', icon: '🔀', subs: [
    { id: 'automatisation', label: 'Automatisation' },
  ]},
  { id: 'wiki', label: 'Wiki', icon: '📖', subs: [
    { id: 'articles', label: 'Articles' },
  ]},
  { id: 'documentation', label: 'Documentation', icon: '📚', subs: [
    { id: 'histoire', label: 'Histoire TimeBlast' },
    { id: 'roadmap', label: 'Avancement projet' },
  ]},
  { id: 'administration', label: 'Administration', icon: '⚙️', subs: [
    { id: 'utilisateurs', label: 'Utilisateurs' },
    { id: 'societes', label: 'Sociétés' },
    { id: 'groupes', label: 'Groupes' },
    { id: 'organigramme-admin', label: 'Organigramme' },
    { id: 'audit', label: 'Journal d\'audit' },
    { id: 'messages', label: 'Messages contact' },
    { id: 'historique', label: 'Historique navigation' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'parametres', label: 'Paramètres' },
  ]},
]

const PERM_ROLES = ['collaborateur', 'manager', 'comptable', 'admin', 'superadmin']
const PERM_ROLE_LABELS = { collaborateur: 'Collaborateur', manager: 'Manager', comptable: 'Comptable', admin: 'Admin', superadmin: 'Super Admin' }
const PERM_ROLE_COLORS = { collaborateur: '#64748b', manager: '#0891b2', comptable: '#7c3aed', admin: '#dc2626', superadmin: '#7c3aed' }
const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete']
const ACTION_LABELS = { can_view: 'V', can_create: 'C', can_edit: 'M', can_delete: 'S' }
const ACTION_COLORS = { can_view: '#2563eb', can_create: '#16a34a', can_edit: '#f59e0b', can_delete: '#dc2626' }
const ACTION_TOOLTIPS = { can_view: 'Voir', can_create: 'Créer', can_edit: 'Modifier', can_delete: 'Supprimer' }

// Permissions par défaut
const DEFAULT_PERMS = {
  collaborateur: { calendrier: 'VCMS', activite: 'V', equipe: 'VC', gestion: '', crm: 'VC', marketing: '', finance: '', documents: 'V', administration: '' },
  manager: { calendrier: 'VCMS', activite: 'VCMS', equipe: 'VCMS', gestion: 'V', crm: 'VCMS', marketing: 'VCMS', finance: '', documents: 'VCMS', administration: '' },
  comptable: { calendrier: 'V', activite: '', equipe: '', gestion: 'VCMS', crm: '', marketing: '', finance: 'VCMS', documents: 'V', administration: '' },
  admin: { calendrier: 'VCMS', activite: 'VCMS', equipe: 'VCMS', gestion: 'VCMS', crm: 'VCMS', marketing: 'VCMS', finance: 'VCMS', documents: 'VCMS', administration: '' },
  superadmin: { calendrier: 'VCMS', activite: 'VCMS', equipe: 'VCMS', gestion: 'VCMS', crm: 'VCMS', marketing: 'VCMS', finance: 'VCMS', documents: 'VCMS', administration: 'VCMS' }}

const PROFILS_METIER = {
  commercial: { label: 'Commercial', icon: '🎯', modules: ['calendrier','crm','marketing','documents'] },
  daf: { label: 'DAF / Comptable', icon: '💰', modules: ['finance','gestion','calendrier','documents'] },
  chef_projet: { label: 'Chef de projet', icon: '📋', modules: ['activite','equipe','calendrier','crm','documents'] },
  rh: { label: 'RH', icon: '👥', modules: ['equipe','calendrier','documents'] },
  direction: { label: 'Direction', icon: '👔', modules: ['calendrier','activite','equipe','gestion','crm','marketing','finance','documents','workflows','documentation'] },
  personnalise: { label: 'Personnalisé', icon: '⚙️', modules: [] },
}

function ModuleAccessPanel() {
  const [selectedProfil, setSelectedProfil] = useState('direction')
  const [moduleAccess, setModuleAccess] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState('manager')

  // Init modules from profil
  useEffect(() => {
    const profil = PROFILS_METIER[selectedProfil]
    if (profil && selectedProfil !== 'personnalise') {
      const access = {}
      MODULES.forEach(m => { access[m.id] = profil.modules.includes(m.id) })
      setModuleAccess(access)
    }
  }, [selectedProfil])

  function toggleModule(moduleId) {
    setModuleAccess(prev => {
      const updated = { ...prev, [moduleId]: !prev[moduleId] }
      setSelectedProfil('personnalise')
      return updated
    })
  }

  function selectProfil(profilId) {
    setSelectedProfil(profilId)
    if (profilId !== 'personnalise') {
      const profil = PROFILS_METIER[profilId]
      const access = {}
      MODULES.forEach(m => { access[m.id] = profil.modules.includes(m.id) })
      setModuleAccess(access)
    }
  }

  const activeCount = Object.values(moduleAccess).filter(Boolean).length
  const rolePerms = DEFAULT_PERMS[selectedRole] || {}

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Profil métier selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#1a2332', display: 'block', marginBottom: '.5rem' }}>
          Profil métier
        </label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {Object.entries(PROFILS_METIER).map(([id, p]) => (
            <button key={id} onClick={() => selectProfil(id)}
              style={{
                padding: '.5rem 1rem', borderRadius: 8, border: '2px solid', cursor: 'pointer',
                borderColor: selectedProfil === id ? '#195C82' : '#e2e8f0',
                background: selectedProfil === id ? '#eef6fb' : '#fff',
                color: selectedProfil === id ? '#195C82' : '#64748b',
                fontWeight: 600, fontSize: '.82rem', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: '.4rem'
              }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rôle selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#1a2332', display: 'block', marginBottom: '.5rem' }}>
          Rôle (détermine le niveau de droits V/C/M/S)
        </label>
        <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
          style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.9rem', background: '#fff', cursor: 'pointer' }}>
          {PERM_ROLES.filter(r => r !== 'superadmin').map(r => (
            <option key={r} value={r}>{PERM_ROLE_LABELS[r]}</option>
          ))}
        </select>
        <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '.3rem' }}>
          Droits auto : {selectedRole === 'collaborateur' ? 'Voir + Créer (limité)' : selectedRole === 'manager' ? 'Voir + Créer + Modifier + Supprimer' : selectedRole === 'comptable' ? 'VCMS sur Finance/Gestion, Voir ailleurs' : 'Tout (VCMS)'}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', fontWeight: 600, color: '#16a34a' }}>
          {activeCount} modules activés
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', fontWeight: 600, color: '#64748b' }}>
          {MODULES.length - activeCount} désactivés
        </div>
      </div>

      {/* Module grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.75rem' }}>
        {MODULES.filter(m => m.id !== 'administration').map(m => {
          const isOn = !!moduleAccess[m.id]
          const permLevel = rolePerms[m.id] || ''
          return (
            <div key={m.id} onClick={() => toggleModule(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem',
                borderRadius: 10, border: '1.5px solid', cursor: 'pointer', transition: 'all .15s',
                borderColor: isOn ? '#195C82' : '#e2e8f0',
                background: isOn ? '#eef6fb' : '#fff',
              }}>
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: isOn ? '#195C82' : '#94a3b8' }}>{m.label}</div>
                <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>
                  {m.subs.length} sous-module{m.subs.length > 1 ? 's' : ''}
                  {isOn && permLevel && <span style={{ marginLeft: 6, color: '#195C82', fontWeight: 600 }}>({permLevel})</span>}
                </div>
              </div>
              <div style={{
                width: 36, height: 20, borderRadius: 10, padding: 2,
                background: isOn ? '#195C82' : '#e2e8f0', transition: 'background .2s',
                display: 'flex', alignItems: 'center',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transform: isOn ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Légende */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b', marginBottom: '.5rem' }}>Légende des droits</div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '.75rem', color: '#94a3b8' }}>
          <span><strong style={{ color: '#2563eb' }}>V</strong> = Voir</span>
          <span><strong style={{ color: '#16a34a' }}>C</strong> = Créer</span>
          <span><strong style={{ color: '#f59e0b' }}>M</strong> = Modifier</span>
          <span><strong style={{ color: '#dc2626' }}>S</strong> = Supprimer</span>
        </div>
      </div>
    </div>
  )
}

function PermissionsMatrixLegacy() {
  const [perms, setPerms] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => { loadPerms() }, [])

  async function loadPerms() {
    setLoading(true)
    const { data } = await supabase.from('role_permissions').select('*')
    const map = {}
    for (const r of PERM_ROLES) {
      map[r] = {}
      for (const m of MODULES) {
        for (const s of m.subs) {
          const key = `${m.id}:${s.id}`
          const row = (data || []).find(d => d.role === r && d.module === m.id && d.sub_module === s.id)
          map[r][key] = row ? {
            can_view: row.can_view, can_create: row.can_create, can_edit: row.can_edit, can_delete: row.can_delete} : getDefault(r, m.id)
        }
      }
    }
    setPerms(map)
    setLoading(false)
  }

  function getDefault(role, moduleId) {
    const d = DEFAULT_PERMS[role]?.[moduleId] || ''
    return { can_view: d.includes('V'), can_create: d.includes('C'), can_edit: d.includes('M'), can_delete: d.includes('S') }
  }

  function togglePerm(role, moduleId, subId, action) {
    if (role === 'superadmin') return
    const key = `${moduleId}:${subId}`
    setPerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [key]: { ...prev[role][key], [action]: !prev[role]?.[key]?.[action] } }
    }))
    setDirty(true)
  }

  function toggleAllRole(role, enable) {
    if (role === 'superadmin') return
    const updated = { ...perms[role] }
    for (const m of MODULES) {
      for (const s of m.subs) {
        const key = `${m.id}:${s.id}`
        updated[key] = { can_view: enable, can_create: enable, can_edit: enable, can_delete: enable }
      }
    }
    setPerms(prev => ({ ...prev, [role]: updated }))
    setDirty(true)
  }

  function resetDefaults() {
    const map = {}
    for (const r of PERM_ROLES) {
      map[r] = {}
      for (const m of MODULES) {
        for (const s of m.subs) {
          map[r][`${m.id}:${s.id}`] = getDefault(r, m.id)
        }
      }
    }
    setPerms(map)
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    const rows = []
    for (const role of PERM_ROLES) {
      if (role === 'superadmin') continue
      for (const m of MODULES) {
        for (const s of m.subs) {
          const key = `${m.id}:${s.id}`
          const p = perms[role]?.[key] || {}
          rows.push({ role, module: m.id, sub_module: s.id, can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete, updated_at: new Date().toISOString() })
        }
      }
    }
    const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role,module,sub_module' })
    if (error) alert('Erreur: ' + error.message)
    else { alert('Permissions sauvegardées !'); setDirty(false) }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#2B4C7E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  const cbStyle = (checked, color, disabled) => ({
    width: 22, height: 22, borderRadius: 4, border: `2px solid ${checked ? color : '#cbd5e1'}`,
    background: checked ? color + '20' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, fontSize: 11, fontWeight: 700,
    color: checked ? color : 'transparent', transition: 'all .15s'})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🔐 Matrice des permissions</h2>
          <p style={{ color: '#64748b', fontSize: '.85rem', margin: '.25rem 0 0' }}>Définissez les droits de chaque rôle sur chaque module</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={resetDefaults} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '.85rem' }}>🔄 Réinitialiser par défaut</button>
          <button onClick={save} disabled={saving || !dirty} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: dirty ? 'pointer' : 'default',
            background: dirty ? '#2B4C7E' : '#94a3b8', color: '#fff', fontSize: '.85rem', fontWeight: 600}}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
        </div>
      </div>

      {dirty && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '.5rem 1rem', marginBottom: '1rem', fontSize: '.85rem', color: '#92400e' }}>⚠️ Modifications non sauvegardées</div>}

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: 200, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>Module</th>
              {PERM_ROLES.map(r => (
                <th key={r} colSpan={4} style={{ padding: '.5rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: PERM_ROLE_COLORS[r], marginBottom: '.25rem' }}>{PERM_ROLE_LABELS[r]}</div>
                  {r !== 'superadmin' && (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => toggleAllRole(r, true)} style={{ fontSize: '.65rem', padding: '1px 6px', borderRadius: 4, border: '1px solid #d1d5db', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer' }}>Tout</button>
                      <button onClick={() => toggleAllRole(r, false)} style={{ fontSize: '.65rem', padding: '1px 6px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>Aucun</button>
                    </div>
                  )}
                </th>
              ))}
            </tr>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '.4rem .75rem', borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 2 }}></th>
              {PERM_ROLES.map(r => ACTIONS.map(a => (
                <th key={`${r}-${a}`} style={{ padding: '.3rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', borderLeft: a === 'can_view' ? '1px solid #e2e8f0' : 'none', minWidth: 32 }} title={ACTION_TOOLTIPS[a]}>
                  <span style={{ color: ACTION_COLORS[a], fontWeight: 700, fontSize: '.7rem' }}>{ACTION_LABELS[a]}</span>
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => {
              const isExpanded = expanded[m.id] !== false
              return [
                <tr key={m.id} style={{ background: '#f8fafc', cursor: 'pointer' }} onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !isExpanded }))}>
                  <td style={{ padding: '.6rem .75rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>
                    <span style={{ marginRight: '.4rem' }}>{isExpanded ? '▼' : '▶'}</span>
                    {m.icon} {m.label}
                    <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '.4rem', fontSize: '.75rem' }}>({m.subs.length})</span>
                  </td>
                  {PERM_ROLES.map(r => ACTIONS.map(a => {
                    const allChecked = m.subs.every(s => perms[r]?.[`${m.id}:${s.id}`]?.[a])
                    const someChecked = m.subs.some(s => perms[r]?.[`${m.id}:${s.id}`]?.[a])
                    const isSA = r === 'superadmin'
                    return (
                      <td key={`${r}-${a}`} style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', borderLeft: a === 'can_view' ? '1px solid #e2e8f0' : 'none', padding: '.3rem' }}
                        onClick={e => { e.stopPropagation(); if (!isSA) m.subs.forEach(s => { const key = `${m.id}:${s.id}`; setPerms(prev => ({ ...prev, [r]: { ...prev[r], [key]: { ...prev[r][key], [a]: !allChecked } } })); }); setDirty(true) }}>
                        <div style={cbStyle(allChecked || isSA, ACTION_COLORS[a], isSA)}>
                          {(allChecked || isSA) ? '✓' : someChecked ? '–' : ''}
                        </div>
                      </td>
                    )
                  }))}
                </tr>,
                ...(isExpanded ? m.subs.map(s => (
                  <tr key={`${m.id}:${s.id}`} style={{ background: '#fff' }}>
                    <td style={{ padding: '.4rem .75rem .4rem 2.5rem', borderBottom: '1px solid #f1f5f9', color: '#475569', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                      {s.label}
                    </td>
                    {PERM_ROLES.map(r => ACTIONS.map(a => {
                      const key = `${m.id}:${s.id}`
                      const checked = r === 'superadmin' ? true : !!perms[r]?.[key]?.[a]
                      const isSA = r === 'superadmin'
                      return (
                        <td key={`${r}-${a}-${s.id}`} style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9', borderLeft: a === 'can_view' ? '1px solid #e2e8f0' : 'none', padding: '.25rem' }}
                          onClick={() => togglePerm(r, m.id, s.id, a)}>
                          <div style={cbStyle(checked, ACTION_COLORS[a], isSA)}>
                            {checked ? '✓' : ''}
                          </div>
                        </td>
                      )
                    }))}
                  </tr>
                )) : [])
              ]
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '.8rem', color: '#64748b' }}>
        <span><span style={{ color: ACTION_COLORS.can_view, fontWeight: 700 }}>V</span> = Voir</span>
        <span><span style={{ color: ACTION_COLORS.can_create, fontWeight: 700 }}>C</span> = Créer</span>
        <span><span style={{ color: ACTION_COLORS.can_edit, fontWeight: 700 }}>M</span> = Modifier</span>
        <span><span style={{ color: ACTION_COLORS.can_delete, fontWeight: 700 }}>S</span> = Supprimer</span>
      </div>
    </div>
  )
}
