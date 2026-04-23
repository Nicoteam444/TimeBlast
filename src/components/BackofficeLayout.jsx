import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

// Force le theme light pendant que le backoffice est monte — le style doit
// rester independant du dark mode de la plateforme
function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    // Restore toutes les CSS vars light (au cas ou l'AppearanceContext a set du dark)
    root.style.setProperty('--bg', '#F0F0F0')
    root.style.setProperty('--surface', '#FFFFFF')
    root.style.setProperty('--card-bg', '#FFFFFF')
    root.style.setProperty('--border', '#e2e8f0')
    root.style.setProperty('--text', '#0D1B24')
    root.style.setProperty('--text-muted', '#5a7080')
    root.style.setProperty('--primary', '#195C82')
    root.style.setProperty('--accent', '#1D9BF0')
    return () => { if (prevTheme) root.setAttribute('data-theme', prevTheme) }
  }, [])
}

// Login form intégré pour le backoffice (pas de dépendance EnvContext)
function BackofficeLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400, background: '#1e293b', borderRadius: 16, padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TimeBlast</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>Backoffice</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@timeblast.ai"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>Mot de passe</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,.1)', borderRadius: 6 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            background: 'linear-gradient(135deg, #2B4C7E, #60a5fa)', color: '#fff', opacity: loading ? .6 : 1,
          }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          Acces reserve aux super administrateurs
        </div>
      </div>
    </div>
  )
}

export default function BackofficeLayout({ children }) {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  useForceLightTheme()

  // Loading state
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  // Pas connecté → login intégré
  if (!user) return <BackofficeLogin />

  // Pas super admin → accès refusé
  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL
  if (!isSuperAdmin) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Acces refuse</h2>
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.9rem' }}>Seuls les super administrateurs peuvent acceder au backoffice.</p>
        <button onClick={() => window.location.href = 'https://www.timeblast.ai'} style={{
          marginTop: 20, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>Retour a TimeBlast</button>
      </div>
    </div>
  )

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
            onClick={() => window.location.href = 'https://www.timeblast.ai'}
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
