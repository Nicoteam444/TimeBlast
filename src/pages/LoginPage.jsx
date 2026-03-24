import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ── Connecteurs par catégorie ──────────────────────────────────────────────────
const CONNECTORS = [
  { id: 'sage',        name: 'Sage',           cat: 'compta',   color: '#00DC82' },
  { id: 'pennylane',   name: 'Pennylane',      cat: 'compta',   color: '#6C5CE7' },
  { id: 'quickbooks',  name: 'QuickBooks',     cat: 'compta',   color: '#2CA01C' },
  { id: 'cegid',       name: 'Cegid',          cat: 'compta',   color: '#E74C3C' },
  { id: 'fec',         name: 'Import FEC',     cat: 'compta',   color: '#3498DB' },
  { id: 'salesforce',  name: 'Salesforce',     cat: 'crm',      color: '#00A1E0' },
  { id: 'hubspot',     name: 'HubSpot',        cat: 'crm',      color: '#FF7A59' },
  { id: 'pipedrive',   name: 'Pipedrive',      cat: 'crm',      color: '#017737' },
  { id: 'stripe',      name: 'Stripe',         cat: 'finance',  color: '#635BFF' },
  { id: 'qonto',       name: 'Qonto',          cat: 'finance',  color: '#2A2A2A' },
  { id: 'gocardless',  name: 'GoCardless',     cat: 'finance',  color: '#1A1A2E' },
  { id: 'payfit',      name: 'PayFit',         cat: 'rh',       color: '#0066FF' },
  { id: 'lucca',       name: 'Lucca',          cat: 'rh',       color: '#FF6B35' },
  { id: 'silae',       name: 'Silae',          cat: 'rh',       color: '#4A90D9' },
  { id: 'slack',       name: 'Slack',          cat: 'comm',     color: '#4A154B' },
  { id: 'teams',       name: 'Teams',          cat: 'comm',     color: '#6264A7' },
  { id: 'gmail',       name: 'Gmail',          cat: 'comm',     color: '#EA4335' },
  { id: 'gcal',        name: 'Google Agenda',  cat: 'comm',     color: '#4285F4' },
  { id: 'notion',      name: 'Notion',         cat: 'prod',     color: '#000000' },
  { id: 'trello',      name: 'Trello',         cat: 'prod',     color: '#0079BF' },
  { id: 'jira',        name: 'Jira',           cat: 'prod',     color: '#0052CC' },
  { id: 'zapier',      name: 'Zapier',         cat: 'prod',     color: '#FF4A00' },
  { id: 'make',        name: 'Make',           cat: 'prod',     color: '#6D00CC' },
  { id: 'excel',       name: 'Excel / CSV',    cat: 'data',     color: '#217346' },
  { id: 'gsheets',     name: 'Google Sheets',  cat: 'data',     color: '#0F9D58' },
  { id: 'api',         name: 'API REST',       cat: 'data',     color: '#FF6B6B' },
  { id: 'supabase',    name: 'Supabase',       cat: 'data',     color: '#3FCF8E' },
  { id: 'chatgpt',     name: 'ChatGPT',        cat: 'ia',       color: '#10A37F' },
  { id: 'claude',      name: 'Claude AI',      cat: 'ia',       color: '#D97706' },
  { id: 'mistral',     name: 'Mistral',        cat: 'ia',       color: '#F97316' },
  { id: 'odoo',        name: 'Odoo',           cat: 'prod',     color: '#714B67' },
]

const CATEGORIES = [
  { id: 'all',     label: 'Tous',           icon: '⚡' },
  { id: 'compta',  label: 'Comptabilité',   icon: '📊' },
  { id: 'crm',     label: 'CRM',            icon: '🎯' },
  { id: 'finance', label: 'Finance',        icon: '💳' },
  { id: 'rh',      label: 'RH & Paie',     icon: '👥' },
  { id: 'comm',    label: 'Communication',  icon: '💬' },
  { id: 'prod',    label: 'Productivité',   icon: '🚀' },
  { id: 'data',    label: 'Data & API',     icon: '🔗' },
  { id: 'ia',      label: 'IA & Enrichissement', icon: '🤖' },
]

const STEPS = [
  { icon: '🔌', title: 'Branchez vos outils', desc: 'Connectez vos logiciels existants en un clic. Comptabilité, CRM, paie, banque — tout se branche.' },
  { icon: '🤖', title: 'L\'IA enrichit vos données', desc: 'Les données circulent et sont enrichies par l\'IA. Détection des anomalies, rapprochement automatique, suggestions intelligentes.' },
  { icon: '⚡', title: 'Vous gagnez du temps', desc: 'Plus de double saisie, plus d\'exports manuels. Concentrez-vous sur ce qui compte.' },
]

const STATS = [
  { value: '3h', label: 'gagnées par jour', suffix: '' },
  { value: '30+', label: 'connecteurs', suffix: '' },
  { value: '0', label: 'saisie manuelle', suffix: '' },
  { value: 'IA', label: 'toujours active', suffix: '24/7' },
]

const FEATURES = [
  { icon: '⏱', title: 'Saisie des temps', desc: 'Calendrier, drag & drop, validation manager, multi-projets.' },
  { icon: '💼', title: 'Pipeline commercial', desc: 'Kanban, transactions, suivi phases, vue multi-sociétés.' },
  { icon: '🧾', title: 'Facturation & Devis', desc: 'Création, envoi, relances auto, export PDF professionnel.' },
  { icon: '📊', title: 'Comptabilité', desc: 'Import FEC, écritures, rapprochement bancaire, prévisionnel.' },
  { icon: '👥', title: 'Gestion d\'équipe', desc: 'Absences, notes de frais, compétences, organigramme.' },
  { icon: '🏢', title: 'Multi-sociétés', desc: 'Holding, groupes, switch instantané, données cloisonnées.' },
]

// ── Composant SVG Multiprise ─────────────────────────────────────────────────
function MultipriseVisual() {
  const [activeIdx, setActiveIdx] = useState(0)
  const displayed = CONNECTORS.slice(0, 16) // 16 connecteurs autour du hub

  useEffect(() => {
    const timer = setInterval(() => setActiveIdx(i => (i + 1) % displayed.length), 800)
    return () => clearInterval(timer)
  }, [])

  const cx = 250, cy = 250, r = 180
  return (
    <div className="multiprise-container">
      <svg viewBox="0 0 500 500" className="multiprise-svg">
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1D9BF0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1D9BF0" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Glow ambiant */}
        <circle cx={cx} cy={cy} r={120} fill="url(#hubGlow)" className="multiprise-ambient" />

        {/* Lignes de connexion */}
        {displayed.map((c, i) => {
          const angle = (i / displayed.length) * Math.PI * 2 - Math.PI / 2
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          const isActive = i === activeIdx
          return (
            <line
              key={c.id + '-line'}
              x1={cx} y1={cy} x2={x} y2={y}
              stroke={isActive ? c.color : 'rgba(15,76,117,0.15)'}
              strokeWidth={isActive ? 2.5 : 1}
              className={isActive ? 'multiprise-line--active' : ''}
              filter={isActive ? 'url(#glow)' : undefined}
            />
          )
        })}

        {/* Hub central */}
        <circle cx={cx} cy={cy} r={44} fill="#195C82" stroke="#1D9BF0" strokeWidth="2.5" className="multiprise-hub" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" letterSpacing="1">TIME</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#1D9BF0" fontSize="11" fontWeight="800" letterSpacing="1">BLAST</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#98BA9C" fontSize="8" fontWeight="600" opacity="0.9">⚡ Connect All</text>

        {/* Nœuds connecteurs */}
        {displayed.map((c, i) => {
          const angle = (i / displayed.length) * Math.PI * 2 - Math.PI / 2
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          const isActive = i === activeIdx
          return (
            <g key={c.id} className={`multiprise-node ${isActive ? 'multiprise-node--active' : ''}`}>
              <circle cx={x} cy={y} r={isActive ? 26 : 22} fill={isActive ? c.color : '#fff'} stroke={isActive ? c.color : '#d1d5db'} strokeWidth={isActive ? 2 : 1.5} opacity={isActive ? 1 : 0.85} />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fill={isActive ? '#fff' : '#1a2332'} fontSize={isActive ? '7.5' : '6.5'} fontWeight="600">
                {c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name}
              </text>
            </g>
          )
        })}

        {/* Particules flottantes */}
        <circle cx={100} cy={80} r="2" fill="#1D9BF0" opacity="0.3" className="multiprise-particle p1" />
        <circle cx={400} cy={120} r="1.5" fill="#98BA9C" opacity="0.3" className="multiprise-particle p2" />
        <circle cx={80} cy={400} r="1.5" fill="#F8B35A" opacity="0.3" className="multiprise-particle p3" />
        <circle cx={420} cy={380} r="2" fill="#991567" opacity="0.25" className="multiprise-particle p4" />
      </svg>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [activeCat, setActiveCat] = useState('all')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  const filteredConnectors = activeCat === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.cat === activeCat)

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">⚡</span>
            <span className="landing-logo-text">TimeBlast</span>
          </div>
          <div className="landing-nav-links">
            <a href="#connecteurs">Connecteurs</a>
            <a href="#comment-ca-marche">Comment ça marche</a>
            <a href="#features">Fonctionnalités</a>
            <a href="/facture-electronique" style={{ color: '#f59e0b', fontWeight: '600' }}>E-Facture 📋</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Hero — Multiprise IA ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">⚡ La multiprise intelligente de votre entreprise</div>
            <h1 className="landing-hero-title">
              TimeBlast — connectez tout.<br />
              <span className="landing-hero-accent">Gagnez du temps grâce à l'IA.</span>
            </h1>
            <p className="landing-hero-subtitle">
              TimeBlast connecte vos outils en une <strong>multiprise intelligente</strong>.
              Temps, finance, CRM, RH — tout circule automatiquement entre vos logiciels.
              Zéro saisie manuelle, zéro friction.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn-primary" onClick={() => setShowLogin(true)}>
                Accéder à la plateforme →
              </button>
              <a href="#connecteurs" className="landing-btn-secondary">
                Voir les connecteurs
              </a>
            </div>
          </div>
          <div className="landing-hero-visual">
            <MultipriseVisual />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats" id="stats">
        {STATS.map((s, i) => (
          <div key={i} className="landing-stat">
            <span className="landing-stat-value">
              {s.value}
              {s.suffix && <span className="landing-stat-suffix">{s.suffix}</span>}
            </span>
            <span className="landing-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Comment ça marche — 3 étapes ── */}
      <section className="landing-steps" id="comment-ca-marche">
        <h2 className="landing-section-title">Comment ça marche ?</h2>
        <p className="landing-section-subtitle">
          3 étapes pour connecter toute votre entreprise.
        </p>
        <div className="landing-steps-grid">
          {STEPS.map((step, i) => (
            <div key={i} className="landing-step-card">
              <div className="landing-step-number">{i + 1}</div>
              <span className="landing-step-icon">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Connecteurs ── */}
      <section className="landing-connectors" id="connecteurs">
        <h2 className="landing-section-title">30+ connecteurs disponibles</h2>
        <p className="landing-section-subtitle">
          Comptabilité, CRM, paie, banque, productivité — branchez ce que vous voulez.
        </p>
        <div className="landing-cat-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`landing-cat-tab ${activeCat === cat.id ? 'landing-cat-tab--active' : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
        <div className="landing-connectors-grid">
          {filteredConnectors.map(c => (
            <div key={c.id} className="landing-connector-chip" style={{ '--chip-color': c.color }}>
              <span className="landing-connector-dot" style={{ background: c.color }} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.85rem', marginTop: '1.5rem' }}>
          … et bien d'autres via <strong>Zapier</strong>, <strong>Make</strong> et notre <strong>API REST</strong> ouverte.
        </p>
      </section>

      {/* ── Marquee logos ── */}
      <div className="landing-marquee-section">
        <div className="landing-marquee">
          <div className="landing-marquee-track">
            {[...CONNECTORS, ...CONNECTORS].map((c, i) => (
              <span key={i} className="landing-marquee-item" style={{ color: c.color }}>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <h2 className="landing-section-title">Tout ce dont vous avez besoin</h2>
        <p className="landing-section-subtitle">
          Une suite complète d'outils pour piloter votre activité.
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
        <div className="landing-cta-inner">
          <span className="landing-cta-icon">⚡</span>
          <h2>Prêt à tout connecter ?</h2>
          <p>Rejoignez les équipes qui pilotent leur activité avec TimeBlast.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
            Se connecter maintenant →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-logo-text" style={{ color: '#67e8f9' }}>⚡ TimeBlast</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} — La multiprise intelligente pour votre entreprise
          </span>
        </div>
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="landing-login-card" onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowLogin(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>⚡</span>
              <h2 style={{ margin: '.25rem 0 0' }}>Connexion</h2>
              <p style={{ color: '#64748b', fontSize: '.88rem', margin: '.25rem 0 0' }}>
                Accédez à votre espace TimeBlast
              </p>
            </div>
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
              <button type="submit" className="landing-btn-primary" style={{ width: '100%', marginTop: '.75rem' }} disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
