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

// ── Composant SVG — Octogone 8 apps + Agent IA centre ────────────────────────
function MultipriseVisual() {
  const B = '#2B4C7E'
  const apps = [
    { label: 'Sage', cat: 'Compta', color: '#00DC82' },
    { label: 'Salesforce', cat: 'CRM', color: '#00A1E0' },
    { label: 'Stripe', cat: 'Paiement', color: '#635BFF' },
    { label: 'Slack', cat: 'Comm.', color: '#E01E5A' },
    { label: 'Pennylane', cat: 'Compta', color: '#6C5CE7' },
    { label: 'HubSpot', cat: 'CRM', color: '#FF7A59' },
    { label: 'Qonto', cat: 'Banque', color: '#1A1A2E' },
    { label: 'Google', cat: 'Suite', color: '#4285F4' },
  ]

  const cx = 250, cy = 240, R = 170

  return (
    <div className="multiprise-container">
      <svg viewBox="0 0 500 480" className="multiprise-svg">
        <defs>
          <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#142d4c" />
            <stop offset="100%" stopColor="#2B4C7E" />
          </linearGradient>
          <filter id="bGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Octogone de fond */}
        <polygon
          points={apps.map((_, i) => {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2
            return `${cx + (R + 30) * Math.cos(a)},${cy + (R + 30) * Math.sin(a)}`
          }).join(' ')}
          fill="none" stroke={B} strokeWidth="0.5" opacity="0.08"
        />

        {/* Lignes entre apps adjacentes (réseau maillé) */}
        {apps.map((_, i) => {
          const a1 = (i / 8) * Math.PI * 2 - Math.PI / 2
          const a2 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2
          const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
          const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
          return <line key={`edge-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={B} strokeWidth="0.6" opacity="0.1" />
        })}

        {/* Connexions apps → hub + billes */}
        {apps.map((app, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          const dur = (2.2 + (i % 3) * 0.3).toFixed(1)
          const delay = (i * 0.3).toFixed(1)
          const retDelay = (parseFloat(delay) + parseFloat(dur) * 0.5).toFixed(1)
          return (
            <g key={app.label + '-conn'}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={B} strokeWidth="1" opacity="0.12" />
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={B} strokeWidth="0.5" opacity="0.25" strokeDasharray="4 6">
                <animate attributeName="strokeDashoffset" values="0;-20" dur="3s" repeatCount="indefinite" />
              </line>
              {/* Bille aller bleu SRA */}
              <circle r="4" fill={B} filter="url(#bGlow)" opacity="0.9">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={delay + 's'}>
                  <mpath xlinkHref={`#oct-${i}`} />
                </animateMotion>
              </circle>
              {/* Bille retour bleu clair */}
              <circle r="2.5" fill="#5B9BD5" filter="url(#bGlow)" opacity="0.6">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={retDelay + 's'} keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                  <mpath xlinkHref={`#oct-${i}`} />
                </animateMotion>
              </circle>
              <path id={`oct-${i}`} d={`M${cx},${cy} L${ax},${ay}`} fill="none" stroke="none" />
            </g>
          )
        })}

        {/* Apps en octogone */}
        {apps.map((app, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          return (
            <g key={app.label}>
              <circle cx={ax} cy={ay} r={32} fill="#fff" stroke={app.color} strokeWidth="2" />
              <text x={ax} y={ay - 4} textAnchor="middle" dominantBaseline="central" fill="#1a2332" fontSize="8" fontWeight="700">{app.label}</text>
              <text x={ax} y={ay + 10} textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="500">{app.cat}</text>
            </g>
          )
        })}

        {/* HUB CENTRAL — Octogone */}
        {(() => {
          const oct = (r, rot = -22.5) => Array.from({ length: 8 }, (_, i) => {
            const a = (rot + i * 45) * Math.PI / 180
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
          }).join(' ')
          return (
            <>
              <polygon points={oct(54)} fill="none" stroke={B} strokeWidth="0.8" opacity="0.15">
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
              </polygon>
              <polygon points={oct(46)} fill="url(#hubGrad)" stroke="#5B9BD5" strokeWidth="1.5" />
            </>
          )
        })()}
        <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">🤖 Agent IA</text>
        <text x={cx} y={cy + 2} textAnchor="middle" fill="#5B9BD5" fontSize="9" fontWeight="800">TimeBlast</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#7ec8a0" fontSize="7" fontWeight="700">.ai</text>
        <text x={cx} y={cy + 28} textAnchor="middle" fill="#98c1d9" fontSize="5" fontWeight="500">Lecture · Écriture</text>
      </svg>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signIn, signInWithMicrosoft } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [activeCat, setActiveCat] = useState('all')

  // Comptes récents
  const [recentAccounts, setRecentAccounts] = useState([])
  const isSwitching = localStorage.getItem('tb_switch_account') === 'true'

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('tb_recent_accounts') || '[]')
      setRecentAccounts(stored)
      if (isSwitching) {
        setShowLogin(true)
        localStorage.removeItem('tb_switch_account')
      }
    } catch {}
  }, [])

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  function saveRecentAccount(email) {
    try {
      let accounts = JSON.parse(localStorage.getItem('tb_recent_accounts') || '[]')
      accounts = accounts.filter(a => a.email !== email)
      accounts.unshift({ email, lastLogin: new Date().toISOString() })
      accounts = accounts.slice(0, 5) // Garder les 5 derniers
      localStorage.setItem('tb_recent_accounts', JSON.stringify(accounts))
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else {
      saveRecentAccount(email)
      navigate('/')
    }
  }

  async function handleMicrosoftLogin() {
    setError(null)
    setLoading(true)
    const { error } = await signInWithMicrosoft()
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // Si pas d'erreur, Supabase redirige vers Microsoft
  }

  function selectRecentAccount(accountEmail) {
    setEmail(accountEmail)
    setShowLogin(true)
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
              La plateforme IA qui active vos données et vous fait gagner 80% de temps en plus par jour.
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

      {/* ── Stats compactes ── */}
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

      {/* Features supprimé — remplacé par les previews */}

      {/* ── Previews App — IA & Data ── */}
      <section style={{ padding: '60px 0', background: '#f8fafc' }} id="previews">
        <h2 className="landing-section-title">L'IA au coeur de vos donnees</h2>
        <p className="landing-section-subtitle">Vos donnees sont centralisees, nettoyees et enrichies par l'intelligence artificielle.</p>

        {/* 3 previews orientées IA & Data */}
        <div style={{ maxWidth: 900, margin: '40px auto 0', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

          {/* Preview 1 — Assistant IA */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #2B4C7E, #1a6fa8)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>🤖 Assistant IA</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>Posez vos questions en langage naturel</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#1a2332', borderLeft: '3px solid #2B4C7E' }}>
                "Combien j'ai facture ce mois ?"
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#475569' }}>
                <span style={{ color: '#2B4C7E', fontWeight: 700 }}>🤖</span> Vous avez facture <strong style={{ color: '#16a34a' }}>72 450 €</strong> en mars 2026, soit <strong style={{ color: '#16a34a' }}>+18%</strong> vs fevrier.
                <br /><span style={{ fontSize: '.5rem', color: '#94a3b8' }}>3 factures envoyees · 1 en retard · 2 payees</span>
              </div>
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#1a2332', borderLeft: '3px solid #2B4C7E' }}>
                "Qui n'a pas saisi ses temps ?"
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#475569' }}>
                <span style={{ color: '#2B4C7E', fontWeight: 700 }}>🤖</span> 2 collaborateurs n'ont pas saisi : <strong>Marc G.</strong> et <strong>Laura M.</strong>
              </div>
            </div>
          </div>

          {/* Preview 2 — Data augmentée dashboard */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f3d5c, #2B4C7E)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>📊 KPIs temps reel</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>Toutes vos donnees en un coup d'oeil</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'CA ce mois', val: '72 450 €', trend: '+18%', up: true },
                { label: 'Pipeline commercial', val: '343 000 €', trend: '8 deals', up: true },
                { label: 'Marge brute', val: '68%', trend: '+3pts', up: true },
                { label: 'Tresorerie', val: '62 812 €', trend: '-5%', up: false },
              ].map((k, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '.55rem', color: '#64748b' }}>{k.label}</div>
                    <div style={{ fontSize: '.85rem', fontWeight: 800, color: '#1a2332' }}>{k.val}</div>
                  </div>
                  <span style={{ fontSize: '.6rem', fontWeight: 700, color: k.up ? '#16a34a' : '#dc2626', background: k.up ? '#f0fdf4' : '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>
                    {k.up ? '↑' : '↓'} {k.trend}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview 3 — Alertes intelligentes */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2B4C7E)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>🔔 Alertes IA</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>L'IA detecte les anomalies pour vous</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '🔴', text: 'Facture BatiGroup en retard de 15 jours', sub: '42 000 € — Relance auto envoyee' },
                { icon: '🟡', text: 'Projet Migration ERP a 95% du budget', sub: '475h / 500h — Alerte depassement' },
                { icon: '🟢', text: 'Lead Greentech qualifie automatiquement', sub: 'Score IA : 87% — Fiche client creee' },
                { icon: '🔵', text: 'Rapprochement bancaire : 3 ecritures', sub: 'Suggestions IA avec 98% de confiance' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 8, background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '.6rem', fontWeight: 600, color: '#1a2332' }}>{a.text}</div>
                    <div style={{ fontSize: '.5rem', color: '#94a3b8' }}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Canaux supprimé — page raccourcie */}

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
            {/* Comptes récents */}
            {recentAccounts.length > 0 && !email && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Comptes récents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentAccounts.map(acc => (
                    <button key={acc.email} onClick={() => selectRecentAccount(acc.email)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                        cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background .15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#2B4C7E',
                        color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {acc.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(acc.lastLogin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, color: '#94a3b8' }}>→</span>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', margin: '10px 0 0' }}>
                  <button onClick={() => setEmail(' ')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#2B4C7E', fontWeight: 500 }}>
                    + Utiliser un autre compte
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email.trim()}
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

              {/* Bouton Microsoft SSO — affiché uniquement si Azure est configuré dans Supabase */}
              {import.meta.env.VITE_ENABLE_MICROSOFT_SSO === 'true' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span style={{ color: '#94a3b8', fontSize: '.8rem' }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  </div>

                  <button type="button" onClick={handleMicrosoftLogin} disabled={loading}
                    style={{
                      width: '100%', padding: '.75rem', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid #e2e8f0', background: '#fff', fontSize: '.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                      color: '#1e293b', fontWeight: 600, transition: 'all .2s',
                    }}
                    onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.borderColor = '#0078d4' }}
                    onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e2e8f0' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Se connecter avec Microsoft
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
