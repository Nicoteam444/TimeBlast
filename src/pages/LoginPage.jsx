import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Modules décisionnels ──
const BI_MODULES = [
  { icon: '📊', title: 'Tableaux de bord', desc: 'KPIs temps réel, drill-down multi-axes, alertes automatiques sur seuils.' },
  { icon: '💰', title: 'Pilotage financier', desc: 'Trésorerie prévisionnelle, marge par projet, rapprochement bancaire IA.' },
  { icon: '⏱', title: 'Suivi d\'activité', desc: 'Saisie des temps, taux d\'occupation, rentabilité collaborateur.' },
  { icon: '🎯', title: 'Pipeline commercial', desc: 'Kanban deals, prévision CA, scoring leads par intelligence artificielle.' },
  { icon: '🔗', title: 'Connecteurs natifs', desc: '30+ intégrations : Sage, Pennylane, Stripe, HubSpot, PayFit, Slack…' },
  { icon: '🤖', title: 'IA décisionnelle', desc: 'Anomalies détectées, recommandations contextuelles, agents autonomes.' },
]

const COMPARE = [
  { feature: 'Prix accessible PME', tb: true, others: false },
  { feature: 'BI + ERP + CRM unifié', tb: true, others: false },
  { feature: 'IA agentique intégrée', tb: true, others: false },
  { feature: 'Multi-sociétés natif', tb: true, others: false },
  { feature: 'Connecteurs natifs 30+', tb: true, others: true },
  { feature: 'Tableaux de bord', tb: true, others: true },
  { feature: 'Pas besoin d\'intégrateur', tb: true, others: false },
  { feature: 'Données propres dès J1', tb: true, others: false },
]

const PERSONAS = [
  { icon: '👔', role: 'Dirigeant', need: 'Vue 360° de mon entreprise en 1 écran', solution: 'Dashboard décisionnel avec alertes IA sur CA, trésorerie et rentabilité.' },
  { icon: '📈', role: 'DAF / Comptable', need: 'Arrêtés mensuels en 2h au lieu de 2 jours', solution: 'Import FEC, rapprochement bancaire IA, prévisionnel automatisé.' },
  { icon: '🎯', role: 'Commercial', need: 'Pipeline clair et prévisions fiables', solution: 'Kanban deals, scoring IA, relances automatiques, suivi multi-sociétés.' },
  { icon: '👥', role: 'Manager', need: 'Savoir où en sont mes équipes en temps réel', solution: 'Taux d\'occupation, validation temps, alertes dépassement budget projet.' },
]

const STATS = [
  { value: '80%', label: 'de temps gagné sur le reporting' },
  { value: '30+', label: 'connecteurs natifs' },
  { value: '1', label: 'seul outil au lieu de 10' },
  { value: 'IA', label: 'décisionnelle intégrée' },
]

const CONNECTORS_LIST = [
  'Sage', 'Pennylane', 'QuickBooks', 'Cegid', 'Salesforce', 'HubSpot',
  'Pipedrive', 'Stripe', 'Qonto', 'GoCardless', 'PayFit', 'Lucca',
  'Silae', 'Slack', 'Teams', 'Gmail', 'Google Agenda', 'Notion',
  'Trello', 'Jira', 'Zapier', 'Make', 'Excel / CSV', 'Google Sheets',
  'API REST', 'Supabase', 'ChatGPT', 'Claude AI', 'Mistral', 'Odoo',
]

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
  { id: 'ia',      label: 'IA',             icon: '🤖' },
]

const ROADMAP = [
  {
    phase: 'Phase 1', timing: 'Disponible', color: '#16a34a',
    title: 'Données propres & connectées',
    items: ['Qualité des données & normalisation', 'Connecteurs natifs (Sage, Pennylane, Stripe…)', 'Conformité e-facture 2026', 'Tableaux de bord multi-axes'],
  },
  {
    phase: 'Phase 2', timing: '3–6 mois', color: '#1D9BF0',
    title: 'IA contextuelle & prédictive',
    items: ['Assistant IA en langage naturel', 'Prévisions trésorerie & CA', 'Détection d\'anomalies comptables', 'Scoring leads automatique'],
  },
  {
    phase: 'Phase 3', timing: '6–12 mois', color: '#7c3aed',
    title: 'Agents IA autonomes',
    items: ['Relances clients automatiques', 'Validation notes de frais par IA', 'Alertes trésorerie intelligentes', 'Workflows IA sur mesure'],
  },
]

// ── Composant SVG — Hub décisionnel ────────────────────────────────────────
function BiHubVisual() {
  const B = '#2B4C7E'
  const sources = [
    { label: 'Compta', sub: 'Sage · Pennylane', color: '#00DC82', angle: 0 },
    { label: 'CRM', sub: 'HubSpot · Salesforce', color: '#FF7A59', angle: 45 },
    { label: 'Banque', sub: 'Stripe · Qonto', color: '#635BFF', angle: 90 },
    { label: 'RH', sub: 'PayFit · Lucca', color: '#0066FF', angle: 135 },
    { label: 'Temps', sub: 'Saisie · Planning', color: '#F59E0B', angle: 180 },
    { label: 'Mail', sub: 'Gmail · Outlook', color: '#EA4335', angle: 225 },
    { label: 'Projets', sub: 'Jira · Trello', color: '#0052CC', angle: 270 },
    { label: 'IA', sub: 'Claude · GPT', color: '#10A37F', angle: 315 },
  ]
  const cx = 250, cy = 240, R = 165

  return (
    <div className="multiprise-container">
      <svg viewBox="0 0 500 480" className="multiprise-svg">
        <defs>
          <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#142d4c" />
            <stop offset="100%" stopColor="#2B4C7E" />
          </linearGradient>
          <filter id="bGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" /></filter>
          <clipPath id="hubClip"><path d={`M0,0 H500 V${cy-60} H${cx+60} V${cy+60} H0 Z M${cx-60},${cy-60} V${cy+60} H${cx+60} V${cy-60} Z`} clipRule="evenodd" /></clipPath>
        </defs>

        {/* Cercles de fond concentriques */}
        <circle cx={cx} cy={cy} r={R + 40} fill="none" stroke={B} strokeWidth="0.5" opacity="0.05" />
        <circle cx={cx} cy={cy} r={R + 20} fill="none" stroke={B} strokeWidth="0.5" opacity="0.08" strokeDasharray="4 4" />

        {/* Connexions + billes animées */}
        {sources.map((src, i) => {
          const a = (src.angle - 90) * Math.PI / 180
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          const dur = (2 + (i % 3) * 0.4).toFixed(1)
          const delay = (i * 0.35).toFixed(1)
          return (
            <g key={src.label + '-conn'}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={B} strokeWidth="1" opacity="0.1" clipPath="url(#hubClip)" />
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={src.color} strokeWidth="0.8" opacity="0.3" strokeDasharray="3 5" clipPath="url(#hubClip)">
                <animate attributeName="strokeDashoffset" values="0;-16" dur="2s" repeatCount="indefinite" />
              </line>
              <circle r="4" fill={B} filter="url(#bGlow)" opacity="0.85" clipPath="url(#hubClip)">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={delay + 's'}>
                  <mpath xlinkHref={`#path-${i}`} />
                </animateMotion>
              </circle>
              <circle r="2.5" fill={B} opacity="0.5" clipPath="url(#hubClip)">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={(parseFloat(delay) + 1) + 's'} keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                  <mpath xlinkHref={`#path-${i}`} />
                </animateMotion>
              </circle>
              <path id={`path-${i}`} d={`M${cx},${cy} L${ax},${ay}`} fill="none" />
            </g>
          )
        })}

        {/* Sources en cercle */}
        {sources.map((src, i) => {
          const a = (src.angle - 90) * Math.PI / 180
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          return (
            <g key={src.label} filter="url(#shadow)">
              <circle cx={ax} cy={ay} r={30} fill="#fff" stroke={src.color} strokeWidth="2" />
              <text x={ax} y={ay - 4} textAnchor="middle" dominantBaseline="central" fill="#1a2332" fontSize="8" fontWeight="700">{src.label}</text>
              <text x={ax} y={ay + 9} textAnchor="middle" fill="#94a3b8" fontSize="5" fontWeight="500">{src.sub}</text>
            </g>
          )
        })}

        {/* Hub central — logo gear */}
        <image href="/logo-icon.svg" x={cx-55} y={cy-55} width="110" height="110" />
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

  const filteredConnectors = activeCat === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.cat === activeCat)

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

  // Contact form
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  function saveRecentAccount(userEmail) {
    try {
      let accounts = JSON.parse(localStorage.getItem('tb_recent_accounts') || '[]')
      accounts = accounts.filter(a => a.email !== userEmail)
      accounts.unshift({ email: userEmail, lastLogin: new Date().toISOString() })
      accounts = accounts.slice(0, 5)
      localStorage.setItem('tb_recent_accounts', JSON.stringify(accounts))
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err.message)
    else { saveRecentAccount(email); navigate('/') }
  }

  async function handleMicrosoftLogin() {
    setError(null)
    setLoading(true)
    const { error: err } = await signInWithMicrosoft()
    if (err) { setError(err.message); setLoading(false) }
  }

  function selectRecentAccount(accountEmail) {
    setEmail(accountEmail)
    setShowLogin(true)
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    try {
      await supabase.from('contact_messages').insert({
        name: contactForm.name, email: contactForm.email,
        company: contactForm.company || null, message: contactForm.message
      })
    } catch (err) { console.error('Erreur envoi:', err) }
    setContactSent(true)
    setContactForm({ name: '', email: '', company: '', phone: '', message: '' })
    setTimeout(() => setContactSent(false), 5000)
  }

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 64 }} />
          </div>
          <div className="landing-nav-links">
            <a href="#modules">Modules</a>
            <a href="#connecteurs">Connecteurs</a>
            <a href="#cas-usage">Cas d'usage</a>
            <a href="#roadmap">Roadmap IA</a>
            <a href="#contact">Contact</a>
            <a href="/facture-electronique" style={{ color: '#f59e0b', fontWeight: '600' }}>E-Facture 2026</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Positionnement BI décisionnel
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">📊 Business Intelligence nouvelle génération</div>
            <h1 className="landing-hero-title">
              Votre plateforme décisionnelle à l'ère de l'IA
            </h1>
            <p className="landing-hero-subtitle" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem' }}>
              Tous vos indicateurs. Toutes vos données. Un seul outil décisionnel.
            </p>
            <p className="landing-hero-subtitle">
              TimeBlast.ai est la <strong>plateforme décisionnelle tout-en-un</strong> pour PME/ETI.
              Finance, activité, commerce, RH — toutes vos données convergent dans des
              <strong> dashboards intelligents enrichis par l'IA</strong>.
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
            <BiHubVisual />
          </div>
        </div>
      </section>

      {/* ── Stats + Mockup à cheval (style Kolus) ── */}
      <section style={{ background: 'linear-gradient(to bottom, #195C82 55%, #fff 55%)', position: 'relative', padding: '0 2rem 5rem' }} id="stats">
        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', padding: '3rem 2rem 2.5rem', flexWrap: 'wrap', maxWidth: 1060, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '.2rem' }}>{s.label}</span>
            </div>
          ))}
        </div>
        {/* Mockup centré, à cheval sur la transition bleu → blanc */}
        <div className="mockup-wrapper" style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="mockup-scale" style={{ perspective: '1200px' }}>
          <div className="mockup-browser" style={{ transform: 'rotateX(1.5deg)', transformOrigin: 'bottom center', boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,.06)' }}>
            {/* macOS bar */}
            <div className="mockup-browser-bar">
              <div className="mockup-dots">
                <span style={{ background: '#ff5f57' }} /><span style={{ background: '#ffbd2e' }} /><span style={{ background: '#28c840' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div className="mockup-url"><span style={{ fontSize: 10 }}>🔒</span> app.timeblast.ai</div>
              </div>
              <div style={{ display: 'flex', gap: 8, opacity: 0.4, fontSize: 12 }}>◀ ▶ ↻</div>
            </div>

            <div className="mockup-content" style={{ minHeight: 420 }}>
              {/* ── Sidebar dark ── */}
              <div className="mockup-sidebar" style={{ width: 52, background: '#0f2b42', padding: '12px 10px', gap: 2, borderRight: 'none' }}>
                <img src="/logo-icon.svg" alt="TB" style={{ width: 28, height: 28, marginBottom: 12 }} />
                {['📊','⏱','💼','🧾','👥','📋','🎯','📬'].map((ic, i) => (
                  <div key={i} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 14, background: i === 0 ? 'rgba(255,255,255,.12)' : 'transparent', position: 'relative' }}>
                    {ic}{i === 0 && <div style={{ position: 'absolute', left: -10, width: 3, height: 16, background: '#F8B35A', borderRadius: '0 2px 2px 0' }} />}
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</div>
              </div>

              {/* ── Main area ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                {/* Topbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#195C82' }}>📊 Tableau de bord</span>
                    <span style={{ fontSize: '.5rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>Mars 2026</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '.5rem', color: '#94a3b8' }}>🔔 3</span>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#195C82', color: '#fff', fontSize: '.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NN</div>
                  </div>
                </div>

                {/* ── KPIs ── */}
                <div style={{ padding: '12px 16px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'CA mensuel', value: '72 450 €', trend: '+18%', icon: '💰', up: true },
                      { label: 'Pipeline', value: '343k €', trend: '8 deals', icon: '🎯', up: true },
                      { label: 'Marge', value: '68%', trend: '+3pts', icon: '📈', up: true },
                      { label: 'Trésorerie', value: '62 812 €', trend: '-5%', icon: '🏦', up: false },
                      { label: 'Heures saisies', value: '1 247h', trend: '94%', icon: '⏱', up: true },
                    ].map((kpi, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '.45rem', color: '#94a3b8', fontWeight: 600 }}>{kpi.label}</span>
                          <span style={{ fontSize: 10 }}>{kpi.icon}</span>
                        </div>
                        <div style={{ fontSize: '.9rem', fontWeight: 800, color: '#1a2332' }}>{kpi.value}</div>
                        <span style={{ fontSize: '.42rem', fontWeight: 700, color: kpi.up ? '#16a34a' : '#ef4444' }}>{kpi.up ? '↑' : '↓'} {kpi.trend}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 3 colonnes : Graphiques | Chat IA | Outils connectés ── */}
                <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1.4fr 1fr .8fr', gap: 10, flex: 1 }}>

                  {/* COL 1 — Graphiques */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Line chart CA */}
                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '.55rem', fontWeight: 700, color: '#1a2332' }}>CA & Marge brute</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[{ l: 'CA', c: '#195C82' }, { l: 'Marge', c: '#1D9BF0' }, { l: 'Obj.', c: '#f59e0b' }].map((x, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.38rem', color: '#94a3b8' }}>
                              <div style={{ width: 6, height: 2, borderRadius: 1, background: x.c }} />{x.l}
                            </div>
                          ))}
                        </div>
                      </div>
                      <svg viewBox="0 0 300 70" style={{ width: '100%' }}>
                        {[15,30,45,60].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f1f5f9" strokeWidth=".4" />)}
                        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#195C82" stopOpacity=".1" /><stop offset="100%" stopColor="#195C82" stopOpacity="0" /></linearGradient></defs>
                        <path d="M0,55 25,52 50,48 75,38 100,42 125,33 150,28 175,24 200,20 225,22 250,16 275,14 300,8 300,70 0,70Z" fill="url(#ag)" />
                        <polyline points="0,55 25,52 50,48 75,38 100,42 125,33 150,28 175,24 200,20 225,22 250,16 275,14 300,8" fill="none" stroke="#195C82" strokeWidth="2" strokeLinejoin="round" />
                        <polyline points="0,58 25,56 50,53 75,48 100,46 125,42 150,44 175,40 200,37 225,34 250,32 275,30 300,26" fill="none" stroke="#1D9BF0" strokeWidth="1.2" strokeLinejoin="round" opacity=".6" />
                        <line x1="0" y1="33" x2="300" y2="33" stroke="#f59e0b" strokeWidth=".8" strokeDasharray="4 3" opacity=".4" />
                        <circle cx="300" cy="8" r="3" fill="#195C82" /><circle cx="300" cy="8" r="5.5" fill="none" stroke="#195C82" strokeWidth=".7" opacity=".3" />
                      </svg>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.35rem', color: '#cbd5e1', marginTop: 2 }}>
                        {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map(m => <span key={m}>{m}</span>)}
                      </div>
                    </div>
                    {/* Bar chart + Donut */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {/* Bars */}
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '.5rem', fontWeight: 700, color: '#1a2332', marginBottom: 8 }}>CA par société</div>
                        {[
                          { name: 'SRA Gestion', val: 28, pct: '100%', color: '#195C82' },
                          { name: 'SRA Digital', val: 22, pct: '78%', color: '#1D9BF0' },
                          { name: 'SRA Infra', val: 15, pct: '54%', color: '#5B9BD5' },
                          { name: 'SRA Conseil', val: 8, pct: '29%', color: '#98c1d9' },
                        ].map((b, i) => (
                          <div key={i} style={{ marginBottom: 5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.38rem', color: '#64748b', marginBottom: 1 }}>
                              <span>{b.name}</span><span style={{ fontWeight: 700 }}>{b.val}k€</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: '#f1f5f9' }}>
                              <div style={{ height: '100%', width: b.pct, background: b.color, borderRadius: 3 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Donut */}
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '.5rem', fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>Répartition CA</div>
                        <svg viewBox="0 0 80 80" style={{ width: '100%', maxWidth: 80, margin: '0 auto', display: 'block' }}>
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#195C82" strokeWidth="10" strokeDasharray="68 120" strokeDashoffset="0" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#1D9BF0" strokeWidth="10" strokeDasharray="48 140" strokeDashoffset="-68" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#5B9BD5" strokeWidth="10" strokeDasharray="35 153" strokeDashoffset="-116" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#98c1d9" strokeWidth="10" strokeDasharray="37 151" strokeDashoffset="-151" />
                          <text x="40" y="38" textAnchor="middle" fontSize="8" fontWeight="800" fill="#1a2332">72k€</text>
                          <text x="40" y="47" textAnchor="middle" fontSize="5" fill="#94a3b8">total</text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* COL 2 — Chat Agent IA */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #0f2b42, #195C82)', padding: '8px 12px', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🤖</div>
                      <div>
                        <div style={{ fontSize: '.55rem', fontWeight: 700 }}>Agent IA TimeBlast</div>
                        <div style={{ fontSize: '.38rem', opacity: .6 }}>En ligne · Connecté à vos données</div>
                      </div>
                      <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    </div>
                    <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', background: '#fafbfc' }}>
                      {/* User message */}
                      <div style={{ alignSelf: 'flex-end', background: '#195C82', color: '#fff', borderRadius: '8px 8px 2px 8px', padding: '6px 10px', fontSize: '.48rem', maxWidth: '85%' }}>
                        Quel est mon CA ce mois et quels clients sont en retard ?
                      </div>
                      {/* IA response */}
                      <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px 8px 8px 2px', padding: '8px 10px', fontSize: '.48rem', color: '#475569', maxWidth: '90%' }}>
                        <div style={{ fontWeight: 700, color: '#195C82', marginBottom: 4 }}>📊 Analyse en cours...</div>
                        <div style={{ marginBottom: 4 }}>Votre CA mars est de <strong style={{ color: '#16a34a' }}>72 450 €</strong> (+18% vs février).</div>
                        <div style={{ marginBottom: 4 }}>⚠️ <strong>2 clients en retard</strong> :</div>
                        <div style={{ background: '#fef2f2', borderRadius: 4, padding: '4px 6px', marginBottom: 3, fontSize: '.42rem' }}>
                          🔴 <strong>BatiGroup</strong> — 22 000 € · 15 jours de retard<br />
                          <span style={{ color: '#94a3b8' }}>→ Relance automatique envoyée il y a 2h</span>
                        </div>
                        <div style={{ background: '#fffbeb', borderRadius: 4, padding: '4px 6px', fontSize: '.42rem' }}>
                          🟡 <strong>Greentech SA</strong> — 8 500 € · 5 jours de retard<br />
                          <span style={{ color: '#94a3b8' }}>→ Relance programmée demain 9h</span>
                        </div>
                      </div>
                      {/* User follow-up */}
                      <div style={{ alignSelf: 'flex-end', background: '#195C82', color: '#fff', borderRadius: '8px 8px 2px 8px', padding: '6px 10px', fontSize: '.48rem', maxWidth: '85%' }}>
                        Envoie une relance à BatiGroup avec copie au DAF
                      </div>
                      {/* IA action */}
                      <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px 8px 8px 2px', padding: '8px 10px', fontSize: '.48rem', color: '#475569', maxWidth: '90%' }}>
                        <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 3 }}>✅ Action exécutée</div>
                        <div>Email de relance envoyé à <strong>contact@batigroup.fr</strong> avec copie à <strong>daf@batigroup.fr</strong>.</div>
                        <div style={{ marginTop: 4, fontSize: '.4rem', color: '#94a3b8' }}>Pièce jointe : Facture_F-2026-0847.pdf · Suivi activé</div>
                      </div>
                    </div>
                    {/* Input */}
                    <div style={{ padding: '6px 10px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, alignItems: 'center', background: '#fff' }}>
                      <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '5px 8px', fontSize: '.45rem', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                        Demandez n'importe quoi à l'IA...
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: '#195C82', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>→</div>
                    </div>
                  </div>

                  {/* COL 3 — Outils connectés temps réel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '.5rem', fontWeight: 700, color: '#1a2332', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🔗 Connecté en temps réel
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    </div>
                    {[
                      { name: 'Sage', cat: 'Comptabilité', status: '412 écritures sync.', color: '#00DC82', time: 'il y a 2 min' },
                      { name: 'HubSpot', cat: 'CRM', status: '8 deals actifs', color: '#FF7A59', time: 'il y a 5 min' },
                      { name: 'Stripe', cat: 'Paiements', status: '3 encaissements', color: '#635BFF', time: 'il y a 12 min' },
                      { name: 'PayFit', cat: 'Paie & RH', status: '47 bulletins', color: '#0066FF', time: 'il y a 1h' },
                      { name: 'Qonto', cat: 'Banque', status: 'Solde 62 812 €', color: '#2A2A2A', time: 'temps réel' },
                      { name: 'Slack', cat: 'Notifications', status: '12 alertes envoyées', color: '#4A154B', time: 'il y a 30 min' },
                      { name: 'Gmail', cat: 'Email', status: '6 relances auto', color: '#EA4335', time: 'il y a 1h' },
                      { name: 'Jira', cat: 'Projets', status: '23 tickets ouverts', color: '#0052CC', time: 'il y a 15 min' },
                    ].map((tool, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 6, padding: '6px 8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: tool.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: tool.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#1a2332', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{tool.name}</span>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', marginTop: 2 }} />
                          </div>
                          <div style={{ fontSize: '.38rem', color: '#64748b' }}>{tool.status}</div>
                          <div style={{ fontSize: '.32rem', color: '#cbd5e1' }}>{tool.time}</div>
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '5px 8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <div style={{ fontSize: '.42rem', fontWeight: 700, color: '#16a34a' }}>✅ 8 outils connectés</div>
                      <div style={{ fontSize: '.35rem', color: '#4ade80' }}>Dernière sync. il y a 2 min</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Shadow */}
          <div style={{ height: 20, background: 'radial-gradient(ellipse at center, rgba(0,0,0,.08) 0%, transparent 70%)', marginTop: -2 }} />
          </div>{/* /mockup-scale */}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CONNECTEURS — sélecteur par catégorie
      ══════════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════════
          MODULES DÉCISIONNELS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-features" id="modules">
        <h2 className="landing-section-title">Vos modules décisionnels</h2>
        <p className="landing-section-subtitle">
          Chaque module alimente vos tableaux de bord. L'IA détecte les anomalies et recommande des actions.
        </p>
        <div className="landing-features-grid">
          {BI_MODULES.map((m, i) => (
            <div key={i} className="landing-feature-card">
              <span className="landing-feature-icon">{m.icon}</span>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PREVIEWS — 3 dashboards IA
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '60px 0', background: '#f8fafc' }} id="previews">
        <h2 className="landing-section-title">Vos données deviennent des décisions</h2>
        <p className="landing-section-subtitle">
          Des dashboards intelligents qui ne se contentent pas d'afficher — ils analysent, alertent et recommandent.
        </p>
        <div className="mockup-wrapper" style={{ maxWidth: 960, margin: '40px auto 0', padding: '0 20px' }}>
        <div className="mockup-previews" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

          {/* Preview 1 — Dashboard décisionnel */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #2B4C7E, #1a6fa8)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>📊 Dashboard dirigeant</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>Vue 360° temps réel</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'CA ce mois', val: '72 450 €', trend: '+18%', up: true },
                { label: 'Pipeline', val: '343 000 €', trend: '8 deals', up: true },
                { label: 'Marge brute', val: '68%', trend: '+3pts', up: true },
                { label: 'Trésorerie', val: '62 812 €', trend: '-5%', up: false },
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

          {/* Preview 2 — IA décisionnelle */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f3d5c, #2B4C7E)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>🤖 IA décisionnelle</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>Recommandations automatiques</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#1a2332', borderLeft: '3px solid #2B4C7E' }}>
                "Quel est mon risque trésorerie à 30 jours ?"
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#475569' }}>
                <span style={{ color: '#2B4C7E', fontWeight: 700 }}>📊</span> Risque <strong style={{ color: '#f59e0b' }}>modéré</strong>. 3 factures en retard (42k€). Si payées sous 15j, trésorerie stable à +58k€.
                <br /><span style={{ fontSize: '.5rem', color: '#94a3b8' }}>Recommandation : relancer BatiGroup (15j de retard, 22k€)</span>
              </div>
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#1a2332', borderLeft: '3px solid #2B4C7E' }}>
                "Mes projets les plus rentables ?"
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.6rem', color: '#475569' }}>
                <span style={{ color: '#2B4C7E', fontWeight: 700 }}>📊</span> Top 3 : <strong>Migration ERP</strong> (marge 72%), <strong>Audit ISO</strong> (68%), <strong>Refonte SI</strong> (61%).
              </div>
            </div>
          </div>

          {/* Preview 3 — Alertes BI */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2B4C7E)', padding: '14px 16px', color: '#fff' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>🔔 Alertes décisionnelles</div>
              <div style={{ fontSize: '.55rem', opacity: 0.7, marginTop: 2 }}>L'IA surveille vos indicateurs</div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '🔴', text: 'Facture BatiGroup : 15 jours de retard', sub: '22 000 € — Relance auto envoyée' },
                { icon: '🟡', text: 'Projet Migration ERP à 92% du budget', sub: '460h / 500h — Alerte dépassement' },
                { icon: '🟢', text: 'Marge brute en hausse de +3 points', sub: 'Objectif annuel atteint à 85%' },
                { icon: '🔵', text: 'Rapprochement bancaire : 3 écritures', sub: 'Suggestions IA avec 98% de confiance' },
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
        </div>{/* /mockup-previews */}
        </div>{/* /mockup-wrapper */}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CAS D'USAGE PAR PERSONA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-advantages" id="cas-usage">
        <h2 className="landing-section-title">Pour chaque décideur, un tableau de bord</h2>
        <p className="landing-section-subtitle">
          TimeBlast s'adapte à votre rôle. Chaque profil voit les indicateurs qui comptent.
        </p>
        <div className="landing-advantages-grid">
          {PERSONAS.map((p, i) => (
            <div key={i} className="landing-advantage-card">
              <span className="landing-advantage-icon">{p.icon}</span>
              <h3>{p.role}</h3>
              <p style={{ fontStyle: 'italic', color: '#195C82', fontWeight: 600, fontSize: '.82rem', marginBottom: '.5rem' }}>
                "{p.need}"
              </p>
              <p>{p.solution}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marquee connecteurs ── */}
      <div className="landing-marquee-section">
        <div className="landing-marquee">
          <div className="landing-marquee-track">
            {[...CONNECTORS_LIST, ...CONNECTORS_LIST].map((name, i) => (
              <span key={i} className="landing-marquee-item" style={{ color: '#fff' }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          COMPARAISON — TimeBlast vs outils classiques
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }} id="connecteurs">
        <h2 className="landing-section-title">TimeBlast vs les outils classiques</h2>
        <p className="landing-section-subtitle">
          Pourquoi jongler avec 10 logiciels quand un seul suffit ?
        </p>
        <div style={{ maxWidth: 700, margin: '2rem auto 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: '.85rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Fonctionnalité</div>
            <div style={{ padding: '12px 20px', fontWeight: 700, fontSize: '.85rem', color: '#195C82', borderBottom: '2px solid #e2e8f0', textAlign: 'center', background: 'rgba(25,92,130,0.04)' }}>TimeBlast</div>
            <div style={{ padding: '12px 20px', fontWeight: 700, fontSize: '.85rem', color: '#94a3b8', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>BI classique</div>
            {COMPARE.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ padding: '10px 16px', fontSize: '.85rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{row.feature}</div>
                <div style={{ padding: '10px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', background: 'rgba(25,92,130,0.04)', fontSize: '1rem' }}>
                  {row.tb ? '✅' : '❌'}
                </div>
                <div style={{ padding: '10px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontSize: '1rem' }}>
                  {row.others ? '✅' : '❌'}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap IA ── */}
      <section className="landing-roadmap" id="roadmap">
        <h2 className="landing-section-title">Roadmap vers l'IA décisionnelle</h2>
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
                {phase.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Groupe SRA ── */}
      <section style={{ padding: '4rem 2rem', background: '#f8fafc', textAlign: 'center' }}>
        <p style={{ fontSize: '.85rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Un produit du Groupe SRA
        </p>
        <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 16, background: '#fff',
            border: '2px solid #e2e8f0', borderRadius: 14, padding: '1.25rem 2.5rem', textDecoration: 'none',
            transition: 'all .2s', maxWidth: 600, margin: '0 auto', boxShadow: '0 4px 16px rgba(0,0,0,.04)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(25,92,130,.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none' }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#195C82', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 800, flexShrink: 0 }}>
            SRA
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#195C82' }}>
              Groupe SRA — Partenaire digital des PME
            </div>
            <div style={{ fontSize: '.82rem', color: '#64748b', marginTop: 2 }}>
              Intégrateur Sage Diamond, Microsoft, HubSpot · 200+ collaborateurs · 17 sociétés
            </div>
            <div style={{ fontSize: '.75rem', color: '#1D9BF0', fontWeight: 600, marginTop: 4 }}>
              Découvrir le groupe → groupe-sra.fr
            </div>
          </div>
        </a>
      </section>

      {/* ── Contact ── */}
      <section className="landing-contact" id="contact">
        <h2 className="landing-section-title">Demandez votre diagnostic BI gratuit</h2>
        <p className="landing-section-subtitle">
          En 30 minutes, nous évaluons votre maturité data et vous montrons ce que TimeBlast peut automatiser.
        </p>
        <div className="landing-contact-wrapper">
          <div className="landing-contact-info">
            <div className="landing-contact-info-item">
              <span>📊</span>
              <div>
                <strong>Diagnostic BI gratuit</strong>
                <p>Évaluation de votre maturité data en 30 min</p>
              </div>
            </div>
            <div className="landing-contact-info-item">
              <span>💬</span>
              <div>
                <strong>Réponse sous 24h</strong>
                <p>Notre équipe revient vers vous rapidement</p>
              </div>
            </div>
            <div className="landing-contact-info-item">
              <span>🎯</span>
              <div>
                <strong>Démo personnalisée</strong>
                <p>Sur vos données, vos cas d'usage</p>
              </div>
            </div>
          </div>
          <form className="landing-contact-form" onSubmit={handleContactSubmit}>
            {contactSent ? (
              <div className="landing-contact-success">
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <h3>Demande envoyée !</h3>
                <p>Nous préparons votre diagnostic BI et revenons vers vous très vite.</p>
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
                  <label>Votre besoin *</label>
                  <textarea required rows={4} placeholder="Décrivez votre besoin en pilotage décisionnel…"
                    value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <button type="submit" className="landing-btn-primary" style={{ width: '100%', marginTop: '.5rem' }}>
                  Demander mon diagnostic BI gratuit →
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="landing-cta" id="cta">
        <div className="landing-cta-inner">
          <span className="landing-cta-icon">📊</span>
          <h2>Passez au pilotage décisionnel intelligent</h2>
          <p>Rejoignez les PME qui transforment leurs données en décisions avec TimeBlast.ai.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
              Se connecter →
            </button>
            <a href="#contact" className="landing-btn-secondary landing-btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Demander une démo
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo-full-white.svg" alt="TimeBlast" style={{ height: 24 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} TimeBlast.ai — Plateforme décisionnelle intelligente pour PME
          </span>
        </div>
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="landing-login-card" onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowLogin(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>📊</span>
              <h2 style={{ margin: '.25rem 0 0' }}>Connexion</h2>
              <p style={{ color: '#64748b', fontSize: '.88rem', margin: '.25rem 0 0' }}>
                Accédez à votre espace décisionnel
              </p>
            </div>
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
                      color: '#1e293b', fontWeight: 600, transition: 'all .2s'
                    }}>
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
