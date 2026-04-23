import { LayoutProvider } from '../contexts/LayoutContext'
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'
import CockpitChat from './CockpitChat'
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
  const location = useLocation()
  const [cockpitChatOpen, setCockpitChatOpen] = useState(false)

  // Listen for toggle events from TopBar DSI button
  useEffect(() => {
    function handleToggle() { setCockpitChatOpen(v => !v) }
    window.addEventListener('toggle-cockpit-chat', handleToggle)
    return () => window.removeEventListener('toggle-cockpit-chat', handleToggle)
  }, [])

  // Force light theme on admin/parametres pages — le style admin doit rester
  // independant du dark mode de la plateforme
  const isAdminRoute = /\/(admin|parametres)(\/|$)/.test(location.pathname)
  useEffect(() => {
    if (!isAdminRoute) return
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    const lightVars = {
      '--bg': '#F0F0F0', '--surface': '#FFFFFF', '--card-bg': '#FFFFFF',
      '--border': '#e2e8f0', '--text': '#0D1B24', '--text-muted': '#5a7080',
      '--primary': '#195C82', '--accent': '#1D9BF0',
      '--error': '#dc2626', '--success': '#16a34a',
    }
    const prevVars = {}
    Object.keys(lightVars).forEach(k => { prevVars[k] = root.style.getPropertyValue(k); root.style.setProperty(k, lightVars[k]) })
    return () => {
      if (prevTheme) root.setAttribute('data-theme', prevTheme)
      Object.entries(prevVars).forEach(([k, v]) => { if (v) root.style.setProperty(k, v); else root.style.removeProperty(k) })
    }
  }, [isAdminRoute])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <main className="app-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100%', flex: 1, overflow: 'auto' }}>
            <FavoriteButton />
            <Breadcrumb />
            <div style={{ flex: 1 }}>{children}</div>
            <div style={{ textAlign: 'right', padding: '.5rem 1.5rem', fontSize: '.65rem', color: '#b0b8c4', fontWeight: 500, letterSpacing: '.5px', flexShrink: 0 }}>
              Powered by <span style={{ fontWeight: 700, color: '#94a3b8' }}>Nicoteam</span>
            </div>
          </main>
          <CockpitChat isOpen={cockpitChatOpen} onClose={() => setCockpitChatOpen(false)} />
        </div>
      </div>
      {!cockpitChatOpen && <ChatWidget />}
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
