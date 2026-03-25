import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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
  { icon: '🤖', title: "L'IA structure vos données", desc: "Vos données deviennent propres, connectées et exploitables. Détection d'anomalies, rapprochement automatique, suggestions intelligentes." },
  { icon: '⚡', title: 'Les agents IA agissent', desc: "L'IA ne se contente plus d'analyser — elle exécute. Relances clients, alertes trésorerie, validation automatique." },
]

const STATS = [
  { value: '68%', label: "des PME immatures en données", suffix: '' },
  { value: '30+', label: 'connecteurs natifs', suffix: '' },
  { value: '1', label: 'seul outil pour tout', suffix: '' },
  { value: 'IA', label: 'agentique intégrée', suffix: '24/7' },
]

const FEATURES = [
  { icon: '⏱', title: 'Saisie des temps', desc: 'Calendrier, drag & drop, validation manager, multi-projets.' },
  { icon: '💼', title: 'Pipeline commercial', desc: 'Kanban, transactions, suivi phases, vue multi-sociétés.' },
  { icon: '🧾', title: 'Facturation & Devis', desc: 'Création, envoi e-facture, export XML UBL, portail client.' },
  { icon: '📊', title: 'Comptabilité & BI', desc: 'Import FEC, écritures, rapprochement bancaire, prévisionnel.' },
  { icon: '👥', title: "Gestion d'équipe", desc: 'Absences, notes de frais, compétences, organigramme.' },
  { icon: '🏢', title: 'Multi-sociétés', desc: 'Holding, groupes, switch instantané, données cloisonnées.' },
]

const ROADMAP = [
  {
    phase: 'Phase 1',
    timing: 'Maintenant',
    color: '#16a34a',
    title: 'Données propres & connectées',
    items: [
      'Qualité des données & normalisation',
      'API ouvertes & exports structurés',
      'Connecteurs natifs (Sage, Pennylane, Stripe...)',
      'Conformité e-facture 2026',
    ]
  },
  {
    phase: 'Phase 2',
    timing: '3-6 mois',
    color: '#1D9BF0',
    title: 'Assistant IA contextuel',
    items: [
      'ChatWidget IA qui agit sur vos données',
      'Créer une facture en langage naturel',
      'Planifier un projet par la voix',
      'Analyser la rentabilité en 1 question',
    ]
  },
  {
    phase: 'Phase 3',
    timing: '6-12 mois',
    color: '#7c3aed',
    title: 'Agents IA autonomes',
    items: [
      'Relance client automatique',
      'Validation de notes de frais par IA',
      'Alertes trésorerie intelligentes',
      'Workflows IA sur mesure',
    ]
  },
]

const ADVANTAGES = [
  { icon: '🎯', title: 'Simplicité', desc: "Une seule app pour tout. Pas 10 outils à jongler." },
  { icon: '💰', title: 'Prix PME', desc: "Pas de licence à 150€/user/mois. Accessible à toutes les PME." },
  { icon: '🔗', title: 'Données unifiées', desc: "Pas besoin d'intégrateur. CRM, compta, RH — tout est connecté nativement." },
  { icon: '🤖', title: 'IA agentique', desc: "L'IA ne suggère pas, elle agit. Relances, alertes, validation — en autonomie." },
]

// ── Composant SVG Multiprise ─────────────────────────────────────────────────
function MultipriseVisual() {
  const [activeIdx, setActiveIdx] = useState(0)
  const displayed = CONNECTORS.slice(0, 16)

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
        <circle cx={cx} cy={cy} r={120} fill="url(#hubGlow)" className="multiprise-ambient" />
        {displayed.map((c, i) => {
          const angle = (i / displayed.length) * Math.PI * 2 - Math.PI / 2
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          const isActive = i === activeIdx
          return (
            <line key={c.id + '-line'} x1={cx} y1={cy} x2={x} y2={y}
              stroke={isActive ? c.color : 'rgba(15,76,117,0.15)'}
              strokeWidth={isActive ? 2.5 : 1}
              className={isActive ? 'multiprise-line--active' : ''}
              filter={isActive ? 'url(#glow)' : undefined} />
          )
        })}
        <circle cx={cx} cy={cy} r={44} fill="#195C82" stroke="#1D9BF0" strokeWidth="2.5" className="multiprise-hub" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" letterSpacing="1">TIME</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#1D9BF0" fontSize="11" fontWeight="800" letterSpacing="1">BLAST</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#98BA9C" fontSize="8" fontWeight="600" opacity="0.9">⚡ Connect All</text>
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

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: contactForm.name,
        email: contactForm.email,
        company: contactForm.company || null,
        message: contactForm.message
      })
      if (error) throw error
      setContactSent(true)
      setContactForm({ name: '', email: '', company: '', message: '' })
      setTimeout(() => setContactSent(false), 5000)
    } catch (err) {
      console.error('Erreur envoi message:', err)
      setContactSent(true)
      setTimeout(() => setContactSent(false), 5000)
    }
  }

  const filteredConnectors = activeCat === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.cat === activeCat)

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/logo4.png" alt="TimeBlast.ai" style={{ height: 28 }} />
          </div>
          <div className="landing-nav-links">
            <a href="#connecteurs">Connecteurs</a>
            <a href="#comment-ca-marche">Comment ça marche</a>
            <a href="#roadmap">Roadmap IA</a>
            <a href="#features">Fonctionnalités</a>
            <a href="#contact">Contact</a>
            <a href="/facture-electronique" style={{ color: '#f59e0b', fontWeight: '600' }}>E-Facture 2026</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Hero — IA Agentique ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">🤖 La donnée propre, le socle de l'IA agentique</div>
            <h1 className="landing-hero-title">TimeBlast</h1>
            <h2 className="landing-hero-subtitle" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#475569', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
              La plateforme IA qui active vos données.
            </h2>
            <p className="landing-hero-subtitle">
              <strong>68% des PME sont immatures en données.</strong> TimeBlast.ai est la plateforme convergente
              pour PME/ETI : un seul outil = des données propres, connectées, exploitables par l'IA.
              Temps, finance, CRM, RH — tout circule automatiquement.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn-primary" onClick={() => setShowLogin(true)}>
                Accéder à la plateforme →
              </button>
              <a href="#contact" className="landing-btn-secondary">
                Demander une démo
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

      {/* ── Pourquoi TimeBlast — 4 avantages ── */}
      <section className="landing-advantages" id="pourquoi">
        <h2 className="landing-section-title">Pourquoi TimeBlast.ai ?</h2>
        <p className="landing-section-subtitle">
          La plateforme convergente pour PME/ETI qui veulent entrer dans l'ère de l'IA.
        </p>
        <div className="landing-advantages-grid">
          {ADVANTAGES.map((a, i) => (
            <div key={i} className="landing-advantage-card">
              <span className="landing-advantage-icon">{a.icon}</span>
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche — 3 étapes ── */}
      <section className="landing-steps" id="comment-ca-marche">
        <h2 className="landing-section-title">Comment ça marche ?</h2>
        <p className="landing-section-subtitle">
          3 étapes pour rendre vos données exploitables par l'IA.
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

      {/* ── Roadmap IA Agentique ── */}
      <section className="landing-roadmap" id="roadmap">
        <h2 className="landing-section-title">Roadmap vers l'IA agentique</h2>
        <p className="landing-section-subtitle">
          De la qualité des données aux agents IA autonomes — notre vision en 3 phases.
        </p>
        <div className="landing-roadmap-grid">
          {ROADMAP.map((phase, i) => (
            <div key={i} className="landing-roadmap-card" style={{ '--phase-color': phase.color }}>
              <div className="landing-roadmap-header">
                <span className="landing-roadmap-badge" style={{ background: phase.color }}>{phase.phase}</span>
                <span className="landing-roadmap-timing">{phase.timing}</span>
              </div>
              <h3 className="landing-roadmap-title">{phase.title}</h3>
              <ul className="landing-roadmap-list">
                {phase.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
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

      {/* ── Distribution / Canaux ── */}
      <section className="landing-channels" id="canaux">
        <h2 className="landing-section-title">Comment nous arrivons chez vous</h2>
        <p className="landing-section-subtitle">
          TimeBlast.ai s'adresse aux PME/ETI qui veulent préparer leur entreprise à l'IA agentique.
        </p>
        <div className="landing-channels-grid">
          <div className="landing-channel-card">
            <span className="landing-channel-icon">🚀</span>
            <h3>Product-Led Growth</h3>
            <p>Essayez gratuitement. Pas de commercial, pas de démo obligatoire. Vous testez, vous adoptez.</p>
          </div>
          <div className="landing-channel-card">
            <span className="landing-channel-icon">📝</span>
            <h3>Content marketing</h3>
            <p>Guides, articles, webinaires sur le thème : préparer sa PME à l'IA agentique.</p>
          </div>
          <div className="landing-channel-card">
            <span className="landing-channel-icon">🤝</span>
            <h3>Partenaires comptables</h3>
            <p>Experts-comptables et intégrateurs cherchent des alternatives aux outils fragmentés. Nous sommes cette alternative.</p>
          </div>
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section className="landing-contact" id="contact">
        <h2 className="landing-section-title">Contactez-nous</h2>
        <p className="landing-section-subtitle">
          Une question ? Une démo ? Écrivez-nous et nous revenons vers vous sous 24h.
        </p>
        <div className="landing-contact-wrapper">
          <div className="landing-contact-info">
            <div className="landing-contact-info-item">
              <span>💬</span>
              <div>
                <strong>Réponse sous 24h</strong>
                <p>Notre équipe revient vers vous rapidement</p>
              </div>
            </div>
            <div className="landing-contact-info-item">
              <span>🕐</span>
              <div>
                <strong>Du lundi au vendredi</strong>
                <p>9h - 18h</p>
              </div>
            </div>
          </div>
          <form className="landing-contact-form" onSubmit={handleContactSubmit}>
            {contactSent ? (
              <div className="landing-contact-success">
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <h3>Message envoyé !</h3>
                <p>Nous revenons vers vous très rapidement.</p>
              </div>
            ) : (
              <>
                <div className="landing-contact-row">
                  <div className="landing-contact-field">
                    <label>Nom complet *</label>
                    <input type="text" required placeholder="Jean Dupont"
                      value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="landing-contact-field">
                    <label>Email professionnel *</label>
                    <input type="email" required placeholder="jean@entreprise.com"
                      value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="landing-contact-row">
                  <div className="landing-contact-field">
                    <label>Entreprise</label>
                    <input type="text" placeholder="Mon Entreprise SAS"
                      value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} />
                  </div>
                  <div className="landing-contact-field">
                    <label>Téléphone</label>
                    <input type="tel" placeholder="06 XX XX XX XX"
                      value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="landing-contact-field">
                  <label>Votre message *</label>
                  <textarea required rows={4} placeholder="Dites-nous comment nous pouvons vous aider..."
                    value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <button type="submit" className="landing-btn-primary" style={{ width: '100%', marginTop: '.5rem' }}>
                  Envoyer le message →
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta" id="cta">
        <div className="landing-cta-inner">
          <span className="landing-cta-icon">🤖</span>
          <h2>Préparez votre entreprise à l'ère de l'IA agentique</h2>
          <p>Rejoignez les PME qui transforment leurs données en avantage compétitif avec TimeBlast.ai.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
              Se connecter maintenant →
            </button>
            <a href="#contact" className="landing-btn-secondary landing-btn-lg">
              Demander une démo
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo4.png" alt="TimeBlast.ai" style={{ height: 24 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} TimeBlast.ai — La plateforme IA qui centralise et sécurise vos données
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
                Accédez à votre espace TimeBlast.ai
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
