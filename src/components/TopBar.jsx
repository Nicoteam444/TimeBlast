import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDemo } from '../contexts/DemoContext'
import { useNotifications } from '../contexts/NotificationsContext'
import { useLayout } from '../contexts/LayoutContext'
import { useSociete } from '../contexts/SocieteContext'
import { supabase } from '../lib/supabase'

function fmtNotifDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const QUICK_ADD_ITEMS = [
  { key: 'contact',      icon: '👤', label: 'Contact',          table: 'contacts',     fields: ['prenom', 'nom', 'email', 'telephone'], path: '/crm/contacts' },
  { key: 'entreprise',   icon: '🏢', label: 'Entreprise',       table: 'entreprises',  fields: ['nom', 'siret', 'ville'],               path: '/crm/entreprises' },
  { key: 'opportunite',  icon: '💼', label: 'Opportunité',      table: 'transactions', fields: ['name', 'montant', 'phase'],             path: '/commerce/transactions' },
  { key: 'projet',       icon: '📁', label: 'Projet',           table: 'projets',      fields: ['name', 'description', 'statut'],        path: '/activite/projets' },
  { key: 'tache',        icon: '✅', label: 'Tâche',            table: 'kanban_tasks',  fields: ['title', 'description'],                 path: '/activite/projets' },
  { key: 'temps',        icon: '⏱️', label: 'Saisie de temps',  table: 'saisies_temps', fields: ['date', 'heures', 'commentaire'],        path: '/activite/reporting' },
]

export default function TopBar() {
  const { profile, signOut } = useAuth()
  const { isDemoMode } = useDemo()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { toggleSidebar } = useLayout()
  const { societes, selectedSociete, setSelectedSociete } = useSociete()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [showSocietes, setShowSocietes]  = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)
  const userMenuRef  = useRef(null)
  const notifRef     = useRef(null)

  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen]     = useState(false)
  const searchRef    = useRef(null)
  const searchDebounce = useRef(null)

  // Quick Add state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState(null)
  const [quickAddForm, setQuickAddForm] = useState({})
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const [quickAddError, setQuickAddError] = useState('')
  const [quickAddProjets, setQuickAddProjets] = useState([])
  const quickAddRef = useRef(null)

  const canSwitch = profile?.role === 'admin' || profile?.role === 'comptable'

  // Fermer les menus si clic extérieur
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current  && !userMenuRef.current.contains(e.target))  setUserMenuOpen(false)
      if (searchRef.current    && !searchRef.current.contains(e.target))    setSearchOpen(false)
      if (notifRef.current     && !notifRef.current.contains(e.target))     setNotifOpen(false)
      if (quickAddRef.current  && !quickAddRef.current.contains(e.target))  { setQuickAddOpen(false); setQuickAddType(null) }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function openQuickAddForm(item) {
    setQuickAddType(item)
    setQuickAddForm({})
    setQuickAddError('')
    // Charger les projets pour tâche et temps
    if (item.key === 'tache' || item.key === 'temps') {
      let q = supabase.from('projets').select('id, name').eq('statut', 'actif').order('name')
      if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
      const { data } = await q
      setQuickAddProjets(data || [])
    }
  }

  async function handleQuickAddSubmit(e) {
    e.preventDefault()
    if (!quickAddType) return
    setQuickAddSaving(true)
    setQuickAddError('')

    const payload = { ...quickAddForm }
    // Attach societe_id for relevant tables
    if (selectedSociete?.id && ['contacts', 'entreprises', 'transactions', 'projets'].includes(quickAddType.table)) {
      payload.societe_id = selectedSociete.id
    }
    // Set defaults per type
    if (quickAddType.key === 'opportunite') {
      payload.phase = payload.phase || 'qualification'
      payload.montant = payload.montant ? parseFloat(payload.montant) : 0
    }
    if (quickAddType.key === 'projet') {
      payload.statut = payload.statut || 'actif'
      payload.total_jours = payload.total_jours ? parseFloat(payload.total_jours) : null
      delete payload.description
      if (selectedSociete?.id) payload.societe_id = selectedSociete.id
    }
    if (quickAddType.key === 'tache') {
      // kanban_tasks: title, projet_id, column_id, priority, estimated_hours, due_date
      payload.projet_id = payload.projet_id || null
      payload.priority = payload.priority || 'moyenne'
      payload.estimated_hours = payload.estimated_hours ? parseFloat(payload.estimated_hours) : null
      payload.due_date = payload.due_date || null
      delete payload.description
      // Find first column of selected project for column_id
      if (payload.projet_id) {
        const { data: cols } = await supabase.from('kanban_columns').select('id').eq('projet_id', payload.projet_id).order('"order"').limit(1)
        if (cols?.[0]) payload.column_id = cols[0].id
      }
    }
    if (quickAddType.key === 'temps') {
      payload.date = payload.date || new Date().toISOString().slice(0, 10)
      payload.heures = payload.heures ? parseFloat(payload.heures) : 0
      payload.commentaire = payload.commentaire ? JSON.stringify({ note: payload.commentaire }) : null
      delete payload.duree
      delete payload.description
      if (profile?.id) payload.user_id = profile.id
      if (selectedSociete?.id) payload.societe_id = selectedSociete.id
    }

    const { data: inserted, error } = await supabase.from(quickAddType.table).insert([payload]).select()
    setQuickAddSaving(false)
    if (error) {
      setQuickAddError(error.message)
      return
    }
    const newId = inserted?.[0]?.id
    const targetPath = quickAddType.key === 'temps' && newId
      ? `/activite/reporting?highlight=${newId}`
      : quickAddType.path
    setQuickAddType(null)
    setQuickAddOpen(false)
    navigate(targetPath)
  }

  function handleSearchInput(e) {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchDebounce.current)
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return }
    searchDebounce.current = setTimeout(async () => {
      const [{ data: clients }, { data: transactions }, { data: projets }] = await Promise.all([
        supabase.from('clients').select('id, name').ilike('name', `%${q}%`).limit(3),
        supabase.from('transactions').select('id, name').ilike('name', `%${q}%`).limit(3),
        supabase.from('projets').select('id, name').ilike('name', `%${q}%`).limit(3),
      ])
      const results = [
        ...(clients      || []).map(r => ({ ...r, type: 'client',      icon: '👥', path: `/clients/${r.id}` })),
        ...(transactions || []).map(r => ({ ...r, type: 'transaction', icon: '💼', path: `/commerce/transactions/${r.id}` })),
        ...(projets      || []).map(r => ({ ...r, type: 'projet',      icon: '📁', path: `/activite/projets` })),
      ]
      setSearchResults(results)
      setSearchOpen(true)
    }, 200)
  }

  function handleSelectResult(item) {
    setSearchQuery(''); setSearchResults([]); setSearchOpen(false)
    navigate(item.path)
  }

  function handleSearchSubmit(e) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchOpen(false)
      navigate(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handleNotifClick(notif) {
    markRead(notif.id)
    setNotifOpen(false)
    if (notif.link) navigate(notif.link)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Initiales de la société (2 premières lettres des mots)
  const societeInitials = selectedSociete?.name
    ? selectedSociete.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="topbar">
      {/* Hamburger mobile */}
      <button className="sidebar-hamburger" onClick={toggleSidebar} aria-label="Menu">☰</button>

      {/* Barre de recherche globale */}
      <div className="topbar-search" ref={searchRef}>
        <div className="topbar-search-wrap">
          <span className="topbar-search-icon">🔍</span>
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Rechercher clients, transactions, projets..."
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => searchResults.length && setSearchOpen(true)}
            onKeyDown={handleSearchSubmit}
          />
          {searchQuery && (
            <button className="topbar-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false) }}>✕</button>
          )}
          {!searchQuery && (
            <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '.65rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>⌘K</kbd>
          )}
        </div>
        {searchOpen && searchResults.length > 0 && (
          <ul className="topbar-search-dropdown">
            {searchResults.map((r) => (
              <li key={`${r.type}-${r.id}`} className="topbar-search-result" onMouseDown={() => handleSelectResult(r)}>
                <span className="topbar-search-result-icon">{r.icon}</span>
                <span className="topbar-search-result-name">{r.name}</span>
                <span className="topbar-search-result-type">{r.type}</span>
              </li>
            ))}
            <li className="topbar-search-more" onMouseDown={() => { setSearchOpen(false); navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`) }}>
              Voir tous les résultats →
            </li>
          </ul>
        )}
        {searchOpen && searchQuery && searchResults.length === 0 && (
          <ul className="topbar-search-dropdown">
            <li className="topbar-search-empty">Aucun résultat</li>
          </ul>
        )}
      </div>

      {/* Quick Add Button ⊕ */}
      <div ref={quickAddRef} style={{ position: 'relative', marginLeft: '.5rem', zIndex: 99999 }}>
        <button
          onClick={() => { setQuickAddOpen(v => !v); setQuickAddType(null) }}
          title="Création rapide"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: quickAddOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '1.2rem', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s', flexShrink: 0,
          }}
        >+</button>

        {quickAddOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: 0,
            marginTop: 8, background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.15)', zIndex: 99999,
            width: quickAddType ? 360 : 240,
          }}>
            {!quickAddType ? (
              /* Type selection */
              <div>
                <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid var(--border, #e2e8f0)', fontWeight: 700, fontSize: '.85rem', color: 'var(--text)' }}>
                  Création rapide
                  {selectedSociete && (
                    <span style={{ display: 'block', fontSize: '.7rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>
                      dans {selectedSociete.name}
                    </span>
                  )}
                </div>
                {QUICK_ADD_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => openQuickAddForm(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.6rem', width: '100%',
                      padding: '.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '.85rem', color: 'var(--text)', textAlign: 'left',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg, #f1f5f9)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Form for selected type */
              <div>
                <div style={{
                  padding: '.6rem 1rem', borderBottom: '1px solid var(--border, #e2e8f0)',
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                }}>
                  <button onClick={() => setQuickAddType(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '.9rem', padding: 0 }}>←</button>
                  <span style={{ fontSize: '1rem' }}>{quickAddType.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '.85rem' }}>Nouveau {quickAddType.label.toLowerCase()}</span>
                </div>
                <form onSubmit={handleQuickAddSubmit} style={{ padding: '.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {/* Dynamic fields */}
                  {quickAddType.key === 'contact' && <>
                    <QuickField label="Prénom" value={quickAddForm.prenom} onChange={v => setQuickAddForm(f => ({ ...f, prenom: v }))} required />
                    <QuickField label="Nom" value={quickAddForm.nom} onChange={v => setQuickAddForm(f => ({ ...f, nom: v }))} required />
                    <QuickField label="Email" value={quickAddForm.email} onChange={v => setQuickAddForm(f => ({ ...f, email: v }))} type="email" />
                    <QuickField label="Téléphone" value={quickAddForm.telephone} onChange={v => setQuickAddForm(f => ({ ...f, telephone: v }))} />
                  </>}
                  {quickAddType.key === 'entreprise' && <>
                    <QuickField label="Nom" value={quickAddForm.nom} onChange={v => setQuickAddForm(f => ({ ...f, nom: v }))} required />
                    <QuickField label="SIRET" value={quickAddForm.siret} onChange={v => setQuickAddForm(f => ({ ...f, siret: v }))} />
                    <QuickField label="Ville" value={quickAddForm.ville} onChange={v => setQuickAddForm(f => ({ ...f, ville: v }))} />
                  </>}
                  {quickAddType.key === 'opportunite' && <>
                    <QuickField label="Nom" value={quickAddForm.name} onChange={v => setQuickAddForm(f => ({ ...f, name: v }))} required />
                    <QuickField label="Montant (€)" value={quickAddForm.montant} onChange={v => setQuickAddForm(f => ({ ...f, montant: v }))} type="number" />
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Phase</div>
                      <select
                        value={quickAddForm.phase || 'qualification'}
                        onChange={e => setQuickAddForm(f => ({ ...f, phase: e.target.value }))}
                        style={qfInputStyle}
                      >
                        <option value="qualification">Qualification</option>
                        <option value="short_list">Short list</option>
                        <option value="ferme_a_gagner">Fermé à gagner</option>
                        <option value="ferme">Fermé</option>
                        <option value="perdu">Perdu</option>
                      </select>
                    </div>
                  </>}
                  {quickAddType.key === 'projet' && <>
                    <QuickField label="Nom" value={quickAddForm.name} onChange={v => setQuickAddForm(f => ({ ...f, name: v }))} required />
                    <QuickField label="Budget (jours)" value={quickAddForm.total_jours} onChange={v => setQuickAddForm(f => ({ ...f, total_jours: v }))} type="number" />
                  </>}
                  {quickAddType.key === 'tache' && <>
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Projet <span style={{ color: '#dc2626' }}>*</span></div>
                      <select value={quickAddForm.projet_id || ''} onChange={e => setQuickAddForm(f => ({ ...f, projet_id: e.target.value }))} style={qfInputStyle} required>
                        <option value="">— Choisir un projet —</option>
                        {quickAddProjets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <QuickField label="Titre" value={quickAddForm.title} onChange={v => setQuickAddForm(f => ({ ...f, title: v }))} required />
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Priorité</div>
                      <select value={quickAddForm.priority || 'moyenne'} onChange={e => setQuickAddForm(f => ({ ...f, priority: e.target.value }))} style={qfInputStyle}>
                        <option value="haute">🔴 Haute</option>
                        <option value="moyenne">🟡 Moyenne</option>
                        <option value="basse">🟢 Basse</option>
                      </select>
                    </div>
                    <QuickField label="Heures estimées" value={quickAddForm.estimated_hours} onChange={v => setQuickAddForm(f => ({ ...f, estimated_hours: v }))} type="number" />
                    <QuickField label="Date d'échéance" value={quickAddForm.due_date} onChange={v => setQuickAddForm(f => ({ ...f, due_date: v }))} type="date" />
                  </>}
                  {quickAddType.key === 'temps' && <>
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Projet</div>
                      <select value={quickAddForm.projet_id || ''} onChange={e => setQuickAddForm(f => ({ ...f, projet_id: e.target.value }))} style={qfInputStyle}>
                        <option value="">— Aucun projet —</option>
                        {quickAddProjets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <QuickField label="Date" value={quickAddForm.date || new Date().toISOString().slice(0, 10)} onChange={v => setQuickAddForm(f => ({ ...f, date: v }))} type="date" />
                    <QuickField label="Heures" value={quickAddForm.heures} onChange={v => setQuickAddForm(f => ({ ...f, heures: v }))} type="number" />
                    <QuickField label="Commentaire" value={quickAddForm.commentaire} onChange={v => setQuickAddForm(f => ({ ...f, commentaire: v }))} />
                  </>}

                  {quickAddError && <div style={{ fontSize: '.75rem', color: '#dc2626', background: '#fef2f2', padding: '.35rem .5rem', borderRadius: 4 }}>{quickAddError}</div>}

                  <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.25rem' }}>
                    <button type="button" onClick={() => setQuickAddType(null)} style={{
                      padding: '.35rem .75rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6,
                      background: 'var(--card-bg, #fff)', cursor: 'pointer', fontSize: '.8rem',
                    }}>Annuler</button>
                    <button type="submit" disabled={quickAddSaving} style={{
                      padding: '.35rem .75rem', border: 'none', borderRadius: 6,
                      background: 'var(--primary, #3b82f6)', color: '#fff', cursor: 'pointer',
                      fontSize: '.8rem', fontWeight: 600, opacity: quickAddSaving ? .6 : 1,
                    }}>{quickAddSaving ? '...' : 'Créer'}</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-spacer" />

      {/* Paramètres */}
      <button className="topbar-btn" onClick={() => navigate('/parametres')} title="Paramètres">
        <span>⚙</span>
      </button>

      {/* Notifications */}
      <div className="topbar-notif notif-btn" ref={notifRef} style={{ position: 'relative' }}>
        <button className="topbar-btn" onClick={() => setNotifOpen(v => !v)} title="Notifications" style={{ position: 'relative' }}>
          <span>🔔</span>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        {notifOpen && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: 'var(--primary)', fontWeight: 600, padding: 0 }}
                  onClick={markAllRead}>Tout marquer lu</button>
              )}
            </div>
            <div className="notif-list">
              {notifications.length === 0
                ? <div className="notif-empty">Aucune notification</div>
                : notifications.map(n => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`} onClick={() => handleNotifClick(n)}>
                      <div className={`notif-dot ${n.read ? 'notif-dot--read' : ''}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-date">{fmtNotifDate(n.date)}</div>
                      </div>
                    </div>
                  ))
              }
            </div>
            <div className="notif-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)' }}
                onClick={() => setNotifOpen(false)}>Fermer</button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: 'var(--primary)', fontWeight: 600 }}
                onClick={() => { setNotifOpen(false); navigate('/notifications') }}>Voir toutes →</button>
            </div>
          </div>
        )}
      </div>

      {/* Menu utilisateur */}
      <div className="topbar-user" ref={userMenuRef}>
        <button className="topbar-user-btn" onClick={() => { setUserMenuOpen(v => !v); setShowSocietes(false) }}>
          <span className="topbar-avatar">{initials}</span>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{selectedSociete?.name || profile?.full_name || 'Utilisateur'}</span>
            <span className="topbar-user-role">{profile?.role}</span>
          </div>
          <span className="topbar-chevron">{userMenuOpen ? '▲' : '▼'}</span>
        </button>

        {userMenuOpen && (
          <div className={`topbar-dropdown ${showSocietes ? 'topbar-dropdown--duo' : ''}`}>
            {/* Colonne gauche : sociétés (visible au hover du bouton) */}
            {showSocietes && canSwitch && societes.length > 1 && (
              <div className="topbar-dropdown-societes" onMouseLeave={() => setShowSocietes(false)}>
                <div className="topbar-dropdown-section-label">Société</div>
                <div className="topbar-dropdown-societes-list">
                  {societes.map(s => (
                    <button
                      key={s.id}
                      className={`topbar-dropdown-societe-btn ${s.id === selectedSociete?.id ? 'topbar-dropdown-societe-btn--active' : ''}`}
                      onClick={() => { setSelectedSociete(s); setUserMenuOpen(false); setShowSocietes(false) }}
                    >
                      <span className="topbar-societe-initial" style={{ background: s.id === selectedSociete?.id ? 'var(--primary)' : '#94a3b8' }}>
                        {s.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                      <span className="topbar-societe-name">{s.name}</span>
                      {s.id === selectedSociete?.id && <span style={{ color: 'var(--primary)', fontSize: '.75rem', marginLeft: 'auto' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colonne droite : compte */}
            <div className="topbar-dropdown-account">
              <div className="topbar-dropdown-header">
                <span className="topbar-avatar topbar-avatar--lg">{initials}</span>
                <div>
                  <p className="topbar-dropdown-name">{profile?.full_name}</p>
                  <p className="topbar-dropdown-role">{profile?.role}</p>
                </div>
              </div>
              <hr className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item" onClick={() => { navigate('/parametres'); setUserMenuOpen(false) }}>
                Mon profil
              </button>
              {canSwitch && societes.length > 1 && (
                <button
                  className="topbar-dropdown-item"
                  onMouseEnter={() => setShowSocietes(true)}
                >
                  {selectedSociete?.name || 'Changer de société'}
                </button>
              )}
              <hr className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={handleSignOut}>
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

/* Quick Add field styles */
const qfInputStyle = {
  width: '100%', padding: '.35rem .5rem', border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 4, fontSize: '.82rem', background: 'var(--card-bg, #fff)', color: 'var(--text)',
  outline: 'none',
}

function QuickField({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </div>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        style={qfInputStyle}
      />
    </div>
  )
}
