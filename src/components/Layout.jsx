import { LayoutProvider } from '../contexts/LayoutContext'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'

function BackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  // Ne pas afficher sur la page d'accueil
  if (location.pathname === '/') return null

  return (
    <button
      onClick={() => navigate('/')}
      className="back-to-home-btn"
      title="Retour à l'accueil"
    >
      ← Accueil
    </button>
  )
}

function LayoutInner({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <BackButton />
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
      <LayoutInner>{children}</LayoutInner>
    </LayoutProvider>
  )
}
