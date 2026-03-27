import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function BackofficeLayout({ children }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: '#fff',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>TimeBlast</span>
          <span style={{
            background: '#dc2626',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>Backoffice</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,.15)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Retour à l'app
          </button>
          <span style={{ fontSize: 13, opacity: .7 }}>{user?.email}</span>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
