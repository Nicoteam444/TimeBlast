import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  { icon: '⏱', title: 'Saisie des temps', desc: 'Calendrier drag & drop, saisie hebdomadaire, validation manager, export CSV.' },
  { icon: '💼', title: 'Pipeline commercial', desc: 'Kanban transactions, suivi phases, pipeline en K€, vue multi-sociétés.' },
  { icon: '🧾', title: 'Facturation', desc: 'Création, envoi, suivi des paiements, relances automatiques, export PDF.' },
  { icon: '📊', title: 'Comptabilité & FEC', desc: 'Import FEC, analyse par exercice, tableau de bord financier, écritures.' },
  { icon: '👥', title: 'Gestion d\'équipe', desc: 'Trombinoscope, organigramme, absences, notes de frais, compétences.' },
  { icon: '🎯', title: 'Matrice compétences', desc: 'Évaluations par niveau, vue matricielle, pilotage des savoir-faire.' },
  { icon: '🏢', title: 'Multi-sociétés', desc: 'Gestion holding, switch société instantané, données cloisonnées.' },
  { icon: '🤖', title: 'Assistant IA', desc: 'Chat intégré propulsé par Claude, accès aux données en temps réel.' },
  { icon: '📈', title: 'Reporting', desc: 'Heures par projet, taux d\'occupation, écart planifié vs réalisé.' },
]

const STATS = [
  { value: '10+', label: 'Modules intégrés' },
  { value: '∞', label: 'Sociétés gérées' },
  { value: '24/7', label: 'Accessible partout' },
  { value: 'IA', label: 'Assistant intelligent' },
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/logo.png" alt="TimeBlast" style={{ height: 32 }} onError={e => { e.target.style.display = 'none' }} />
            <span className="landing-logo-text">TimeBlast</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#stats">Chiffres</a>
            <a href="#cta">Démarrer</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            La plateforme tout-en-un<br />
            pour piloter votre <span className="landing-hero-accent">activité</span>
          </h1>
          <p className="landing-hero-subtitle">
            Temps, facturation, comptabilité, équipe, pipeline commercial —
            une seule plateforme pour toutes vos sociétés, propulsée par l'intelligence artificielle.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary" onClick={() => setShowLogin(true)}>
              Accéder à la plateforme →
            </button>
            <a href="#features" className="landing-btn-secondary">
              Découvrir les fonctionnalités
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats" id="stats">
        {STATS.map((s, i) => (
          <div key={i} className="landing-stat">
            <span className="landing-stat-value">{s.value}</span>
            <span className="landing-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <h2 className="landing-section-title">Tout ce dont vous avez besoin</h2>
        <p className="landing-section-subtitle">
          Une suite complète d'outils pour gérer votre temps, vos finances et votre équipe.
        </p>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <span className="landing-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta" id="cta">
        <h2>Prêt à transformer votre gestion ?</h2>
        <p>Rejoignez les équipes qui pilotent leur activité avec TimeBlast.</p>
        <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
          Se connecter maintenant →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-logo-text">TimeBlast</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} — Plateforme de gestion du temps et des activités
          </span>
        </div>
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="landing-login-card" onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowLogin(false)}>✕</button>
            <h2>Connexion</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '.9rem' }}>
              Accédez à votre espace TimeBlast
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus
                  placeholder="nom@entreprise.com" />
              </div>
              <div className="field">
                <label htmlFor="password">Mot de passe</label>
                <input id="password" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  placeholder="••••••••" />
              </div>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="landing-btn-primary" style={{ width: '100%', marginTop: '.5rem' }} disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
