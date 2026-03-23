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

export default function TopBar() {
  const { profile, signOut } = useAuth()
  const { isDemoMode } = useDemo()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { toggleSidebar } = useLayout()
  const { societes, selectedSociete, setSelectedSociete } = useSociete()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)
  const userMenuRef  = useRef(null)
  const notifRef     = useRef(null)

  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen]     = useState(false)
  const searchRef    = useRef(null)
  const searchDebounce = useRef(null)

  const canSwitch = profile?.role === 'admin' || profile?.role === 'comptable'

  // Fermer les menus si clic extérieur
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current  && !userMenuRef.current.contains(e.target))  setUserMenuOpen(false)
      if (searchRef.current    && !searchRef.current.contains(e.target))    setSearchOpen(false)
      if (notifRef.current     && !notifRef.current.contains(e.target))     setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            <div className="notif-footer">
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)' }}
                onClick={() => setNotifOpen(false)}>Fermer</button>
            </div>
          </div>
        )}
      </div>

      {/* Menu utilisateur */}
      <div className="topbar-user" ref={userMenuRef}>
        <button className="topbar-user-btn" onClick={() => setUserMenuOpen(v => !v)}>
          <span className="topbar-avatar">{initials}</span>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{selectedSociete?.name || profile?.full_name || 'Utilisateur'}</span>
            <span className="topbar-user-role">{profile?.role}</span>
          </div>
          <span className="topbar-chevron">{userMenuOpen ? '▲' : '▼'}</span>
        </button>

        {userMenuOpen && (
          <div className="topbar-dropdown topbar-dropdown--duo">
            {/* Colonne gauche : sociétés */}
            {canSwitch && societes.length > 1 && (
              <div className="topbar-dropdown-societes">
                <div className="topbar-dropdown-section-label">Société</div>
                <div className="topbar-dropdown-societes-list">
                  {societes.map(s => (
                    <button
                      key={s.id}
                      className={`topbar-dropdown-societe-btn ${s.id === selectedSociete?.id ? 'topbar-dropdown-societe-btn--active' : ''}`}
                      onClick={() => { setSelectedSociete(s); setUserMenuOpen(false) }}
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
