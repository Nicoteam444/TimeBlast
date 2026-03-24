import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { useFavorites } from '../contexts/FavoritesContext'

const SECTIONS = [
  {
    id: 'calendrier',
    icon: '📆',
    label: 'Calendrier',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/saisie', icon: '✏️', label: 'Saisie des temps' },
    ],
  },
  {
    id: 'activite',
    icon: '⏱',
    label: 'Activité',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/planification', icon: '📅', label: 'Planification',      roles: ['admin', 'manager'] },
      { to: '/activite/projets',       icon: '📁', label: 'Gestion de projet' },
      { to: '/activite/reporting',     icon: '📊', label: 'Reporting temps',    roles: ['admin', 'manager'] },
      { to: '/activite/rentabilite',   icon: '💹', label: 'Rentabilité',        roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'equipe',
    icon: '👥',
    label: 'Équipe',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/equipe',        icon: '📋', label: 'Collaborateurs',  roles: ['admin', 'manager'] },
      { to: '/activite/absences',      icon: '🏖',  label: 'Absences' },
      { to: '/activite/validation',    icon: '✅',  label: 'Validations',    roles: ['admin', 'manager'] },
      { to: '/equipe/notes-de-frais',  icon: '🧾',  label: 'Notes de frais' },
      { to: '/equipe/trombinoscope',   icon: '🪪',  label: 'Trombinoscope',  roles: ['admin', 'manager'] },
      { to: '/equipe/organigramme',    icon: '🏢',  label: 'Organigramme',   roles: ['admin', 'manager'] },
      { to: '/equipe/competences',     icon: '🎯',  label: 'Compétences',    roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'crm',
    icon: '🎯',
    label: 'CRM',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/crm/contacts',          icon: '👤', label: 'Contacts' },
      { to: '/crm/entreprises',       icon: '🏢', label: 'Entreprises' },
      { to: '/crm/leads',             icon: '🚀', label: 'Leads',          roles: ['admin', 'manager'] },
      { to: '/commerce/clients',      icon: '👥', label: 'Clients' },
      { to: '/commerce/transactions', icon: '💼', label: 'Transactions',   roles: ['admin', 'manager'] },
      { to: '/commerce/devis',        icon: '📝', label: 'Devis',          roles: ['admin', 'manager', 'comptable'] },
      { to: '/commerce/produits',     icon: '🏷️', label: 'Produits',       roles: ['admin', 'manager', 'comptable'] },
      { to: '/commerce/abonnements',  icon: '🔄', label: 'Abonnements',    roles: ['admin', 'manager', 'comptable'] },
    ],
  },
  {
    id: 'gestion',
    icon: '🧾',
    label: 'Gestion',
    roles: ['admin', 'comptable', 'manager'],
    items: [
      { to: '/gestion/tableau-de-bord',        icon: '📊', label: 'Tableau de bord' },
      { to: '/gestion/transactions',           icon: '🏦', label: 'Transactions' },
      { to: '/finance/facturation',            icon: '📤', label: 'Ventes' },
      { to: '/finance/factures-fournisseurs',  icon: '📥', label: 'Achats' },
      { to: '/commerce/stock',                 icon: '📦', label: 'Stock' },
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    label: 'Finance',
    roles: ['admin', 'comptable'],
    items: [
      { to: '/finance/comptabilite',    icon: '📊', label: 'Tableau de bord' },
      { to: '/finance/saisie-ecriture', icon: '✍️', label: 'Comptabilité' },
      { to: '/finance/ecritures',       icon: '📒', label: 'Écritures FEC' },
      { to: '/finance/previsionnel',    icon: '📈', label: 'Prévisionnel' },
      { to: '/finance/immobilisations', icon: '🏢', label: 'Immobilisations' },
      { to: '/finance/rapprochement',   icon: '🔗', label: 'Rapprochement' },
    ],
  },
]

const ADMIN_SECTION = {
  id: 'admin',
  icon: '⚙️',
  label: 'Administration',
  roles: ['admin'],
  items: [
    { to: '/admin',              icon: '🏠', label: 'Vue d\'ensemble',   roles: ['admin'] },
    { to: '/admin/utilisateurs', icon: '👥', label: 'Utilisateurs',      roles: ['admin'] },
    { to: '/admin/societes',     icon: '🏢', label: 'Sociétés',          roles: ['admin'] },
    { to: '/admin/groupes',      icon: '🏛', label: 'Groupes',           roles: ['admin'] },
    { to: '/admin/organigramme', icon: '🗂', label: 'Organigramme',      roles: ['admin'] },
    { to: '/admin/audit',        icon: '📋', label: "Journal d'audit",   roles: ['admin'] },
    { to: '/admin/workflows',    icon: '✅', label: 'Approbations',      roles: ['admin', 'manager'] },
    { to: '/admin/analytics',    icon: '📊', label: 'Analytics',         roles: ['admin', 'manager'] },
    { to: '/parametres',         icon: '🔧', label: 'Paramètres',        roles: ['admin'] },
  ],
}

export default function Sidebar() {
  const { profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useLayout()
  const { settings } = useAppearance()
  const { favorites, toggleFavorite, syncing } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [hoveredId, setHoveredId] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0 })
  const hideTimer = useRef(null)
  const userRole = profile?.role

  function handleToggleFavorite(to, e) {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(to)
  }

  // Build favorites items from all sections
  const allItems = [...SECTIONS.flatMap(s => s.items), ...ADMIN_SECTION.items]
  const favItems = favorites.map(to => allItems.find(i => i.to === to)).filter(Boolean)

  function filterItems(items) {
    return items.filter(i => !i.roles || i.roles.includes(userRole))
  }

  const visibleSections = SECTIONS.filter(s =>
    s.roles.includes(userRole) && filterItems(s.items).length > 0
  )

  function showFlyout(id, e) {
    clearTimeout(hideTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredId(id)
    // Si l'item est dans le tiers bas de l'écran, ancrer le flyout par le bas
    const spaceBelow = window.innerHeight - rect.top
    if (spaceBelow < 320) {
      setFlyoutPos({ bottom: window.innerHeight - rect.bottom })
    } else {
      setFlyoutPos({ top: rect.top })
    }
  }

  function scheduleHide() {
    hideTimer.current = setTimeout(() => setHoveredId(null), 120)
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
              ? <img src="/logo.png" alt="logo" className="sidebar-logo-full"
                  onError={e => { e.target.src = '/logo.svg' }} />
              : <img src="/logo2.png" alt="logo" className="sidebar-logo-icon"
                  onError={e => { e.target.src = '/logo2.svg' }} />
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
          {/* Favoris */}
          {favItems.length > 0 && (
            <>
              <div
                className={`rail-item ${hoveredId === '_favs' ? 'rail-item--hover' : ''}`}
                onMouseEnter={e => showFlyout('_favs', e)}
                onMouseLeave={scheduleHide}
              >
                <span className="rail-item-icon">🔖</span>
                {sidebarOpen && <span className="rail-item-label">Favoris</span>}
              </div>
              <div className="sidebar-separator" />
            </>
          )}
          {visibleSections.map(section => {
            const items = filterItems(section.items)
            const isActive = items.some(i => location.pathname.startsWith(i.to))
            return (
              <div
                key={section.id}
                className={`rail-item ${isActive ? 'rail-item--active' : ''} ${hoveredId === section.id ? 'rail-item--hover' : ''}`}
                onMouseEnter={e => showFlyout(section.id, e)}
                onMouseLeave={scheduleHide}
              >
                <span className="rail-item-icon">{section.icon}</span>
                {sidebarOpen && <span className="rail-item-label">{section.label}</span>}
                {isActive && <span className="rail-item-dot" />}
              </div>
            )
          })}
        </nav>

        {/* ── Admin en bas ── */}
        {userRole === 'admin' && (() => {
          const adminPaths = ADMIN_SECTION.items.map(i => i.to)
          const isAdminActive = adminPaths.some(p => location.pathname.startsWith(p))
          return (
            <div className="sidebar-bottom">
              <div
                className={`rail-item ${isAdminActive ? 'rail-item--active' : ''} ${hoveredId === 'admin' ? 'rail-item--hover' : ''}`}
                onMouseEnter={e => showFlyout('admin', e)}
                onMouseLeave={scheduleHide}
              >
                <span className="rail-item-icon">{ADMIN_SECTION.icon}</span>
                {sidebarOpen && <span className="rail-item-label">{ADMIN_SECTION.label}</span>}
                {isAdminActive && <span className="rail-item-dot" />}
              </div>
            </div>
          )
        })()}
      </aside>

      {/* ── Flyout panel — position fixed, hors du aside ── */}
      {flyoutSection && (
        <div
          className="rail-flyout"
          style={{ ...flyoutPos, left: railW }}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleHide}
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
