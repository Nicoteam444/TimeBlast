import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function BackofficeLayout({ children }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        background: '#0f172a',
        color: '#fff',
        padding: '0 2rem',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.5, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TimeBlast</span>
          <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Backoffice</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }}>admin.timeblast.ai</span>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.7)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 6,
              padding: '5px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,.15)'; e.target.style.color = '#fff' }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,.08)'; e.target.style.color = 'rgba(255,255,255,.7)' }}
          >
            &larr; Retour a l'app
          </button>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #2B4C7E, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
            {(user?.email || '?')[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
