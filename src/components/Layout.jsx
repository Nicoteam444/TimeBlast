import { LayoutProvider } from '../contexts/LayoutContext'
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'
import Breadcrumb from './Breadcrumb'

function FavoriteButton() {
  const { favorites, toggleFavorite, updateFavLabel, syncing } = useFavorites()
  const location = useLocation()
  const path = location.pathname

  // Don't show on home page
  if (path === '/') return null

  const isFav = favorites.includes(path)

  // Auto-update label when visiting a favorited page
  if (isFav) {
    setTimeout(() => {
      const el = document.querySelector('.app-content h1')
        || document.querySelector('.app-content .collab-header-name')
        || document.querySelector('.app-content [class*="header-name"]')
        || document.querySelector('.app-content [class*="page-title"]')
      let label = el ? el.textContent.trim() : null
      if (label) label = label.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim()
      if (label && updateFavLabel) updateFavLabel(path, label)
    }, 500)
  }

  function handleToggle() {
    // Capture page title: try h1, then common name elements, then document title
    const el = document.querySelector('.app-content h1')
      || document.querySelector('.app-content .collab-header-name')
      || document.querySelector('.app-content [class*="header-name"]')
      || document.querySelector('.app-content [class*="page-title"]')
    let label = el ? el.textContent.trim() : null
    // Clean emoji prefixes
    if (label) label = label.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim()
    if (!label) label = document.title.replace(/\s*[-–|].*$/, '').trim() || null
    toggleFavorite(path, label)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={syncing}
      title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{
        position: 'absolute', top: 12, right: 16, zIndex: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '1.1rem', opacity: isFav ? 1 : 0.3,
        transition: 'opacity .15s, transform .15s',
        padding: 4,
      }}
      onMouseEnter={e => e.target.style.opacity = '1'}
      onMouseLeave={e => { if (!isFav) e.target.style.opacity = '0.3' }}
    >
      {isFav ? '⭐' : '☆'}
    </button>
  )
}

function LayoutInner({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content" style={{ position: 'relative' }}>
          <FavoriteButton />
          <Breadcrumb />
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <LayoutProvider>
      <BreadcrumbProvider>
        <LayoutInner>{children}</LayoutInner>
      </BreadcrumbProvider>
    </LayoutProvider>
  )
}
