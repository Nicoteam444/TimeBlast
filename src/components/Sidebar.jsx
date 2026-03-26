import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { isModuleEnabled } from '../config/modules'
import { useFavorites } from '../contexts/FavoritesContext'

const SECTIONS = [
  {
    id: 'calendrier',
    icon: '📆',
    label: 'Calendrier',
    landingTo: '/activite/saisie',
    directLink: true,
    roles: ['admin', 'manager', 'collaborateur'],
    items: []},
  {
    id: 'activite',
    icon: '⏱',
    label: 'Activité',
    landingTo: '/activite',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/planification', icon: '📅', label: 'Planification',      roles: ['admin', 'manager'] },
      { to: '/activite/projets',       icon: '📁', label: 'Gestion de projet' },
      { to: '/activite/reporting',     icon: '📊', label: 'Reporting temps',    roles: ['admin', 'manager'] },
      { to: '/activite/rentabilite',   icon: '💹', label: 'Rentabilité',        roles: ['admin', 'manager'] },
    ]},
  {
    id: 'equipe',
    icon: '👥',
    label: 'Équipe',
    landingTo: '/equipe',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/equipe',        icon: '📋', label: 'Collaborateurs',  roles: ['admin', 'manager'] },
      { to: '/activite/absences',      icon: '🏖',  label: 'Absences' },
      { to: '/activite/validation',    icon: '✅',  label: 'Validations',    roles: ['admin', 'manager'] },
      { to: '/equipe/notes-de-frais',  icon: '🧾',  label: 'Notes de frais' },
      { to: '/equipe/trombinoscope',   icon: '🪪',  label: 'Trombinoscope',  roles: ['admin', 'manager'] },
      { to: '/equipe/organigramme',    icon: '🏢',  label: 'Organigramme',   roles: ['admin', 'manager'] },
      { to: '/equipe/competences',     icon: '🎯',  label: 'Compétences',    roles: ['admin', 'manager'] },
    ]},
  {
    id: 'gestion',
    icon: '🧾',
    label: 'Gestion',
    landingTo: '/gestion',
    roles: ['admin', 'comptable', 'manager'],
    items: [
      { to: '/gestion/tableau-de-bord',        icon: '📊', label: 'Tableau de bord' },
      { to: '/gestion/transactions',           icon: '🏦', label: 'Transactions' },
      { to: '/finance/facturation',            icon: '📤', label: 'Ventes' },
      { to: '/gestion/achats',  icon: '📥', label: 'Achats' },
      { to: '/commerce/stock',                 icon: '📦', label: 'Stock' },
    ]},
  {
    id: 'crm',
    icon: '🎯',
    label: 'CRM',
    landingTo: '/crm',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/crm/contacts',          icon: '👤', label: 'Contacts' },
      { to: '/crm/entreprises',       icon: '🏢', label: 'Entreprises' },
      { to: '/commerce/clients',      icon: '👥', label: 'Clients' },
      { to: '/commerce/transactions', icon: '💼', label: 'Opportunités',   roles: ['admin', 'manager'] },
      { to: '/commerce/devis',        icon: '📝', label: 'Devis',          roles: ['admin', 'manager', 'comptable'] },
      { to: '/commerce/produits',     icon: '🏷️', label: 'Produits',       roles: ['admin', 'manager', 'comptable'] },
      { to: '/commerce/abonnements',  icon: '🔄', label: 'Abonnements',    roles: ['admin', 'manager', 'comptable'] },
    ]},
  {
    id: 'marketing',
    icon: '📣',
    label: 'Marketing',
    landingTo: '/marketing',
    roles: ['admin', 'manager'],
    items: [
      { to: '/marketing/campagnes', icon: '🎯', label: 'Campagnes' },
      { to: '/marketing/leads',     icon: '🚀', label: 'Leads' },
    ]},
  {
    id: 'finance',
    icon: '💰',
    label: 'Finance',
    landingTo: '/finance',
    roles: ['admin', 'comptable'],
    items: [
      { to: '/finance/business-intelligence', icon: '📊', label: 'Business Intelligence' },
      { to: '/finance/saisie-ecriture',      icon: '✍️', label: 'Comptabilité' },
      { to: '/finance/previsionnel',    icon: '📈', label: 'Prévisionnel' },
      { to: '/finance/immobilisations', icon: '🏢', label: 'Immobilisations' },
      { to: '/finance/rapprochement',   icon: '🔗', label: 'Rapprochement' },
    ]},
  {
    id: 'documents',
    icon: '📁',
    label: 'Documents',
    directTo: '/documents/archives',
    roles: ['admin', 'manager', 'collaborateur', 'comptable'],
    items: [
      { to: '/documents/archives', icon: '🗄️', label: 'Archives' },
    ]},
  {
    id: 'workflows',
    icon: '🔀',
    label: 'Workflows',
    directLink: true,
    landingTo: '/automatisation/workflows',
    roles: ['admin', 'manager'],
    items: []},
]

// INFO_SECTION supprimé — À propos est maintenant sous Administration

const ADMIN_SECTION = {
  id: 'admin',
  icon: '⚙️',
  label: 'Administration',
  roles: ['admin'],
  items: [
    { to: '/admin',              icon: '🏠', label: 'Vue d\'ensemble',   roles: ['admin'] },
    { to: '/admin/utilisateurs', icon: '👥', label: 'Utilisateurs',      roles: ['admin'], superAdminOnly: true },
    { to: '/admin/societes',     icon: '🏢', label: 'Sociétés',          roles: ['admin'], superAdminOnly: true },
    { to: '/admin/groupes',      icon: '🏛', label: 'Groupes',           roles: ['admin'] },
    { to: '/admin/organigramme', icon: '🗂', label: 'Organigramme',      roles: ['admin'] },
    { to: '/admin/audit',        icon: '📋', label: "Journal d'audit",   roles: ['admin'] },
    { to: '/admin/messages',     icon: '📬', label: 'Messages contact',  roles: ['admin'], superAdminOnly: true },
    { to: '/admin/historique',   icon: '👁', label: 'Historique',            roles: ['admin'], superAdminOnly: true },
    { to: '/admin/analytics',    icon: '📊', label: 'Analytics',         roles: ['admin', 'manager'] },
    { to: '/parametres',         icon: '🔧', label: 'Paramètres',        roles: ['admin'] },
  ]}

export default function Sidebar() {
  const { profile, user } = useAuth()
  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === 'nicolas.nabhan@groupe-sra.fr'
  const { sidebarOpen, toggleSidebar } = useLayout()
  const { settings } = useAppearance()
  const { favorites, favLabels, toggleFavorite, syncing } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [hoveredId, setHoveredId] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0 })
  const hideTimer = useRef(null)
  const lastMouseX = useRef(0)
  const lastMouseY = useRef(0)
  const userRole = profile?.role

  // Track mouse position globally for direction detection
  useEffect(() => {
    function trackMouse(e) {
      lastMouseX.current = e.clientX
      lastMouseY.current = e.clientY
    }
    window.addEventListener('mousemove', trackMouse)
    return () => window.removeEventListener('mousemove', trackMouse)
  }, [])

  function handleToggleFavorite(to, e) {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(to)
  }

  // Build favorites items from all sections + dynamic pages
  const allItems = [...SECTIONS.flatMap(s => s.items), ...ADMIN_SECTION.items]
  const ROUTE_LABELS = {
    crm: 'CRM', commerce: 'Commerce', activite: 'Activité', finance: 'Finance',
    gestion: 'Gestion', equipe: 'Équipe', admin: 'Admin',
    contacts: 'Contacts', entreprises: 'Entreprises', leads: 'Leads',
    clients: 'Clients', collaborateurs: 'Collaborateur', projets: 'Projet',
    facturation: 'Facturation', transactions: 'Opportunités'}
  const favItems = favorites.map(to => {
    const known = allItems.find(i => i.to === to)
    if (known) return known
    // Dynamic page — use stored label if available, otherwise derive from path
    if (favLabels?.[to]) {
      return { to, icon: '📌', label: favLabels[to] }
    }
    const segments = to.split('/').filter(Boolean)
    const lastNamed = [...segments].reverse().find(s => !/^[0-9a-f]{8}-/.test(s))
    const label = ROUTE_LABELS[lastNamed] || (lastNamed ? lastNamed.charAt(0).toUpperCase() + lastNamed.slice(1).replace(/-/g, ' ') : to)
    return { to, icon: '📌', label }
  })

  function filterItems(items) {
    return items.filter(i => {
      if (i.superAdminOnly && !isSuperAdmin) return false
      return !i.roles || i.roles.includes(userRole)
    })
  }

  const visibleSections = SECTIONS.filter(s =>
    isModuleEnabled(s.id) && s.roles.includes(userRole) && (s.directLink || s.directTo || filterItems(s.items).length > 0)
  )

  function showFlyout(id, e) {
    clearTimeout(hideTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredId(id)
    const spaceBelow = window.innerHeight - rect.top
    if (spaceBelow < 320) {
      setFlyoutPos({ bottom: window.innerHeight - rect.bottom })
    } else {
      setFlyoutPos({ top: rect.top })
    }
  }

  function scheduleHide(e) {
    clearTimeout(hideTimer.current)
    const startX = e?.clientX ?? lastMouseX.current
    hideTimer.current = setTimeout(() => {
      const currentX = lastMouseX.current
      if (currentX <= startX) {
        setHoveredId(null)
      } else {
        hideTimer.current = setTimeout(() => setHoveredId(null), 300)
      }
    }, 150)
  }

  function keepOpen() {
    clearTimeout(hideTimer.current)
  }

  const flyoutSection = hoveredId === '_favs'
    ? { id: '_favs', icon: '🔖', label: 'Favoris', items: favItems }
    : visibleSections.find(s => s.id === hoveredId)
      || (hoveredId === 'admin' && userRole === 'admin' ? ADMIN_SECTION : null)
  const railW = sidebarOpen ? 180 : 52

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>

        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/')}>
          {settings.logoUrl ? (
            sidebarOpen
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <img src={settings.logoUrl} alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                  <span className="sidebar-brand-name">{settings.platformName || 'TimeBlast.ai'}</span>
                </span>
              : <img src={settings.logoUrl} alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            sidebarOpen
              ? <img src="/logo4.png" alt="TimeBlast.ai" className="sidebar-logo-full" />
              : <img src="/logo2.png" alt="TimeBlast.ai" className="sidebar-logo-icon" />
          )}
        </div>

        {/* ── Bouton toggle — sous le logo ── */}
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Réduire le menu' : 'Déployer le menu'}
        >
          <span className="sidebar-toggle-icon">{sidebarOpen ? '◀' : '▶'}</span>
          {sidebarOpen && <span className="sidebar-toggle-label">Réduire</span>}
        </button>

        {/* ── Rail de navigation ── */}
        <nav className="sidebar-nav">
          {/* Favoris déplacés dans TopBar */}
          {visibleSections.map(section => {
            const items = filterItems(section.items)
            const isActive = items.some(i => location.pathname.startsWith(i.to)) || (section.landingTo && location.pathname === section.landingTo)
            return (
              <div
                key={section.id}
                className={`rail-item ${isActive ? 'rail-item--active' : ''} ${hoveredId === section.id ? 'rail-item--hover' : ''}`}
                onMouseEnter={e => (section.directTo || section.directLink || items.length <= 1) ? null : showFlyout(section.id, e)}
                onMouseLeave={scheduleHide}
                onClick={() => {
                  if (section.directTo) { navigate(section.directTo); setHoveredId(null); }
                  else if (section.directLink && section.landingTo) { navigate(section.landingTo); setHoveredId(null); }
                  else if (items.length === 1) { navigate(items[0].to); setHoveredId(null); }
                  else if (section.landingTo) navigate(section.landingTo)
                }}
                style={{ cursor: (section.directTo || section.landingTo) ? 'pointer' : undefined }}
              >
                <span className="rail-item-icon">{section.icon}</span>
                {sidebarOpen && <span className="rail-item-label">{section.label}</span>}
                {isActive && <span className="rail-item-dot" />}
              </div>
            )
          })}
        </nav>

        {/* ── Info + Admin en bas ── */}
        <div className="sidebar-bottom">
          {/* Administration — admin seulement */}
          {userRole === 'admin' && (() => {
            const adminPaths = ADMIN_SECTION.items.map(i => i.to)
            const isAdminActive = adminPaths.some(p => location.pathname.startsWith(p))
            return (
              <div
                className={`rail-item ${isAdminActive ? 'rail-item--active' : ''} ${hoveredId === 'admin' ? 'rail-item--hover' : ''}`}
                onMouseEnter={e => showFlyout('admin', e)}
                onMouseLeave={scheduleHide}
              >
                <span className="rail-item-icon">{ADMIN_SECTION.icon}</span>
                {sidebarOpen && <span className="rail-item-label">{ADMIN_SECTION.label}</span>}
                {isAdminActive && <span className="rail-item-dot" />}
              </div>
            )
          })()}
          {/* À propos — visible par tous, sous Administration */}
          <div
            className={`rail-item ${location.pathname.startsWith('/infos') ? 'rail-item--active' : ''}`}
            onClick={() => navigate('/infos')}
            style={{ cursor: 'pointer' }}
          >
            <span className="rail-item-icon">💡</span>
            {sidebarOpen && <span className="rail-item-label">À propos</span>}
            {location.pathname.startsWith('/infos') && <span className="rail-item-dot" />}
          </div>
        </div>
      </aside>

      {/* ── Flyout panel — position fixed, hors du aside ── */}
      {flyoutSection && (
        <div
          className="rail-flyout"
          style={{ ...flyoutPos, left: railW }}
          onMouseEnter={keepOpen}
          onMouseLeave={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            clearTimeout(hideTimer.current)
            if (e.clientX <= rect.left + 10) {
              hideTimer.current = setTimeout(() => setHoveredId(null), 250)
            } else {
              hideTimer.current = setTimeout(() => setHoveredId(null), 100)
            }
          }}
        >
          <div className="rail-flyout-header">
            <span>{flyoutSection.icon}</span>
            <span>{flyoutSection.label}</span>
          </div>
          {filterItems(flyoutSection.items).map(item => (
            <div key={item.to} className="rail-flyout-link-wrap">
              <NavLink
                to={item.to}
                className={({ isActive }) => `rail-flyout-link ${isActive ? 'rail-flyout-link--active' : ''}`}
                onClick={() => {
                  setHoveredId(null)
                  if (window.innerWidth <= 768 && sidebarOpen) toggleSidebar()
                }}
              >
                <span className="rail-flyout-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
              <button
                className={`rail-flyout-fav ${favorites.includes(item.to) ? 'rail-flyout-fav--active' : ''} ${syncing ? 'rail-flyout-fav--syncing' : ''}`}
                onClick={e => handleToggleFavorite(item.to, e)}
                title={favorites.includes(item.to) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                disabled={syncing}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(item.to) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}

      {/* Tab mobile — visible quand sidebar fermée */}
      {!sidebarOpen && (
        <button className="sidebar-mobile-tab" onClick={toggleSidebar} aria-label="Ouvrir le menu">
          ▶
        </button>
      )}
    </>
  )
}
