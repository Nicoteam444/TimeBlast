import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLayout } from '../contexts/LayoutContext'

const SECTIONS = [
  {
    id: 'activite',
    icon: '⏱',
    label: 'Activité',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/activite/saisie',        icon: '✏️', label: 'Saisie des temps' },
      { to: '/activite/planification', icon: '📅', label: 'Planification', roles: ['admin', 'manager'] },
      { to: '/activite/projets',       icon: '📁', label: 'Projets' },
    ],
  },
  {
    id: 'commerce',
    icon: '🏢',
    label: 'Commerce',
    roles: ['admin', 'manager', 'collaborateur'],
    items: [
      { to: '/commerce/clients',      icon: '👥', label: 'Clients' },
      { to: '/commerce/transactions', icon: '💼', label: 'Transactions', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    label: 'Finance',
    roles: ['admin', 'comptable'],
    items: [
      { to: '/finance/comptabilite', icon: '📊', label: 'Comptabilité' },
      { to: '/finance/previsionnel', icon: '📈', label: 'Prévisionnel' },
    ],
  },
]

const ADMIN_ITEMS = [
  { to: '/admin', icon: '⚙️', label: 'Administration', roles: ['admin'] },
]

export default function Sidebar() {
  const { profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useLayout()
  const navigate = useNavigate()
  const location = useLocation()

  const [openSections, setOpenSections] = useState({ commerce: true, activite: true, finance: true })
  const userRole = profile?.role

  function toggleSection(id) {
    setOpenSections(s => ({ ...s, [id]: !s[id] }))
  }

  function isSectionActive(section) {
    return section.items.some(item => location.pathname.startsWith(item.to))
  }

  function filterItems(items) {
    return items.filter(i => !i.roles || i.roles.includes(userRole))
  }

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>

      {/* Logo */}
      <div className="sidebar-logo" onClick={() => navigate('/')}>
        {sidebarOpen
          ? <img src="/logo.png" alt="SRA" className="sidebar-logo-full" onError={e => { e.target.src = '/logo.svg' }} />
          : <img src="/logo2.png" alt="SRA" className="sidebar-logo-icon" onError={e => { e.target.src = '/logo2.svg' }} />
        }
      </div>

      {/* Sections */}
      <nav className="sidebar-nav">
        {SECTIONS.map(section => {
          if (!section.roles.includes(userRole)) return null
          const isActive = isSectionActive(section)
          const isOpen = openSections[section.id]
          const visibleItems = filterItems(section.items)

          return (
            <div key={section.id} className="sidebar-section">

              {sidebarOpen ? (
                /* ── Mode ouvert : header cliquable + sous-items ── */
                <>
                  <button
                    className={`sidebar-section-header ${isActive ? 'sidebar-section-header--active' : ''}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="sidebar-link-icon">{section.icon}</span>
                    <span className="sidebar-section-label">{section.label}</span>
                    <span className="sidebar-section-chevron">{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {isOpen && (
                    <div className="sidebar-subnav">
                      {visibleItems.map(item => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) => `sidebar-sublink ${isActive ? 'sidebar-sublink--active' : ''}`}
                        >
                          <span className="sidebar-sublink-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ── Mode rétracté : séparateur + icônes des sous-items ── */
                <>
                  <div className="sidebar-sep" title={section.label}>
                    <span className="sidebar-sep-icon">{section.icon}</span>
                  </div>
                  {visibleItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                    >
                      <span className="sidebar-link-icon">{item.icon}</span>
                      <span className="sidebar-tooltip">{item.label}</span>
                    </NavLink>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </nav>

      {/* Admin en bas */}
      <div className="sidebar-bottom">
        {ADMIN_ITEMS.map(item => {
          if (!item.roles.includes(userRole)) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-link-label">{item.label}</span>}
              {!sidebarOpen && <span className="sidebar-tooltip">{item.label}</span>}
            </NavLink>
          )
        })}
      </div>

      {/* Toggle */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        <span>{sidebarOpen ? '◀' : '▶'}</span>
      </button>

    </aside>
  )
}
