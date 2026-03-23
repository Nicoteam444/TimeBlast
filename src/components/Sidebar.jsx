import { useState, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'
import { useAppearance } from '../contexts/AppearanceContext'

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
      { to: '/activite/planification', icon: '📅', label: 'Planification', roles: ['admin', 'manager'] },
      { to: '/activite/projets',       icon: '📁', label: 'Gestion de projet' },
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
    ],
  },
  {
    id: 'commerce',
    icon: '🤝',
    label: 'Commerce',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/commerce/clients',      icon: '👤', label: 'Clients' },
      { to: '/commerce/transactions', icon: '💼', label: 'Transactions',  roles: ['admin', 'manager'] },
      { to: '/commerce/achats',       icon: '🛒', label: 'Achats',        roles: ['admin', 'manager', 'comptable'] },
      { to: '/commerce/stock',        icon: '📦', label: 'Stock',         roles: ['admin', 'manager', 'comptable'] },
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    label: 'Gestion',
    roles: ['admin', 'comptable'],
    items: [
      { to: '/finance/comptabilite',    icon: '📊', label: 'Tableau de bord' },
      { to: '/finance/saisie-ecriture', icon: '✍️', label: 'Comptabilité' },
      { to: '/finance/ecritures',       icon: '📒', label: 'Écritures FEC' },
      { to: '/finance/facturation',     icon: '🧾', label: 'Facturation' },
      { to: '/finance/previsionnel',    icon: '📈', label: 'Prévisionnel' },
    ],
  },
]

const ADMIN_ITEMS = [
  { to: '/admin',                icon: '⚙️', label: 'Administration',  roles: ['admin'] },
  { to: '/admin/societes',       icon: '🏢', label: 'Sociétés',         roles: ['admin'] },
  { to: '/admin/groupes',        icon: '🏛', label: 'Groupes',          roles: ['admin'] },
  { to: '/admin/organigramme',   icon: '🗂', label: 'Organigramme',     roles: ['admin'] },
  { to: '/admin/audit',          icon: '📋', label: "Journal d'audit",  roles: ['admin'] },
]

export default function Sidebar() {
  const { profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useLayout()
  const { settings } = useAppearance()
  const navigate = useNavigate()
  const location = useLocation()
  const [hoveredId, setHoveredId] = useState(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const hideTimer = useRef(null)
  const userRole = profile?.role

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
    setFlyoutTop(rect.top)
  }

  function scheduleHide() {
    hideTimer.current = setTimeout(() => setHoveredId(null), 120)
  }

  function keepOpen() {
    clearTimeout(hideTimer.current)
  }

  const flyoutSection = visibleSections.find(s => s.id === hoveredId)
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
                  <span className="sidebar-brand-name">{settings.platformName || 'TimeBlast'}</span>
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
        <div className="sidebar-bottom">
          {ADMIN_ITEMS.map(item => {
            if (!item.roles.includes(userRole)) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `rail-item ${isActive ? 'rail-item--active' : ''}`}
                onMouseEnter={scheduleHide}
                onClick={() => { if (window.innerWidth <= 768 && sidebarOpen) toggleSidebar() }}
              >
                <span className="rail-item-icon">{item.icon}</span>
                {sidebarOpen && <span className="rail-item-label">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </aside>

      {/* ── Flyout panel — position fixed, hors du aside ── */}
      {flyoutSection && (
        <div
          className="rail-flyout"
          style={{ top: flyoutTop, left: railW }}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleHide}
        >
          <div className="rail-flyout-header">
            <span>{flyoutSection.icon}</span>
            <span>{flyoutSection.label}</span>
          </div>
          {filterItems(flyoutSection.items).map(item => (
            <NavLink
              key={item.to}
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
