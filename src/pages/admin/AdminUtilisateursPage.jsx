import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

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

const EMPTY_CREATE = {
  prenom: '', nom: '', email: '', password: '', role: 'collaborateur',
  societe_id: '', send_invite: true,
  telephone: '', poste: '', date_embauche: '', date_naissance: '',
}

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
    const submitPayload = { ...form, full_name: [form.prenom, form.nom].filter(Boolean).join(' ') }
    delete submitPayload.prenom
    delete submitPayload.nom
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'create', ...submitPayload },
    })
    setFormLoading(false)
    if (error || data?.error) {
      setFormError(data?.error || error.message); return
    }
    if (data?.user?.id) {
      const profileUpdate = { role: form.role }
      if (form.societe_id) profileUpdate.societe_id = form.societe_id
      if (form.telephone) profileUpdate.telephone = form.telephone
      if (form.poste) profileUpdate.poste = form.poste
      if (form.date_embauche) profileUpdate.date_embauche = form.date_embauche
      await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
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
    })
    setEditError(null)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    const update = {
      full_name: [editForm.prenom, editForm.nom].filter(Boolean).join(' '),
      role: editForm.role,
      societe_id: editForm.societe_id || null,
    }
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

  async function handleDelete(userId) {
    await supabase.functions.invoke('manage-user', {
      body: { action: 'delete', user_id: userId },
    })
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
    admins: users.filter(u => u.role === 'admin').length,
  }

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
                <div className="field">
                  <label>Date d'embauche</label>
                  <input type="date" value={form.date_embauche}
                    onChange={e => setForm(f => ({ ...f, date_embauche: e.target.value }))} />
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
                  <label>Date d'embauche</label>
                  <input type="date" value={editForm.date_embauche}
                    onChange={e => setEditForm(f => ({ ...f, date_embauche: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Rôle</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
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
              <h2>Supprimer l'utilisateur</h2>
            </div>
            <p style={{ padding: '0 0 1.5rem' }}>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.full_name}</strong> ?<br />
              <span style={{ color: '#dc2626', fontSize: '.85rem' }}>Cette action est irréversible.</span>
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer définitivement</button>
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
        <div className="loading-inline">Chargement...</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Prénom" field="_prenom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Nom" field="_nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Email" field="email" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Société / Groupe" field="societe_id" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Rôle / Statut" field="role" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Dernière connexion" field="last_sign_in_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
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
                      {user.poste && <div style={{ fontSize: '.75rem', color: '#6366f1' }}>💼 {user.poste}</div>}
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
                            width: 'fit-content',
                          }}>🏛 {groupe.name}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                        <span className="status-badge" style={{ color: ROLE_COLORS[user.role], background: ROLE_COLORS[user.role] + '18', fontSize: '.72rem', fontWeight: 600, width: 'fit-content' }}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <span className="status-badge" style={{ color: status.color, background: status.bg, width: 'fit-content' }}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="date-cell">{formatDateTime(user.last_sign_in_at)}</td>
                    <td className="date-cell">
                      <span>{formatDate(user.created_at)}</span>
                      {user.date_embauche && (
                        <span style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          📅 Embauche : {formatDate(user.date_embauche)}
                        </span>
                      )}
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
    </div>
  )
}
