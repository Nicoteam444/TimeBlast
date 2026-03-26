import { LayoutProvider } from '../contexts/LayoutContext'
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'
// CommandPalette intégrée dans TopBar
import Breadcrumb from './Breadcrumb'

function FavoriteButton() {
  const { favorites, toggleFavorite, updateFavLabel, syncing } = useFavorites()
  const location = useLocation()
  const path = location.pathname

  // Don't show on home page
  if (path === '/') return null

  const isFav = favorites.includes(path)

  // Auto-update désactivé — l'utilisateur renomme manuellement via double-clic

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
        padding: 4}}
      onMouseEnter={e => e.target.style.opacity = '1'}
      onMouseLeave={e => { if (!isFav) e.target.style.opacity = '0.3' }}
    >
      {isFav ? '⭐' : '☆'}
    </button>
  )
}

function usePageTracking() {
  const { user } = useAuth()
  const location = useLocation()
  const lastPath = useRef(null)

  useEffect(() => {
    if (!user?.id || location.pathname === lastPath.current) return
    lastPath.current = location.pathname
    const title = document.title || ''
    supabase.from('page_views').insert({
      user_id: user.id,
      page_path: location.pathname,
      page_title: title}).then(() => {})
  }, [location.pathname, user?.id])
}

function LayoutInner({ children }) {
  usePageTracking()
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <FavoriteButton />
          <Breadcrumb />
          <div style={{ flex: 1 }}>{children}</div>
          <div style={{ textAlign: 'right', padding: '.5rem 1.5rem', fontSize: '.65rem', color: '#b0b8c4', fontWeight: 500, letterSpacing: '.5px', flexShrink: 0 }}>
            Powered by <span style={{ fontWeight: 700, color: '#94a3b8' }}>Nicoteam</span>
          </div>
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
