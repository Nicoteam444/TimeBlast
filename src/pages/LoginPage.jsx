import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Modules decisionnels ──
const BI_MODULES = [
  { icon: '📊', title: 'Tableaux de bord', desc: 'KPIs temps reel, drill-down multi-axes, alertes automatiques sur seuils.' },
  { icon: '💰', title: 'Pilotage financier', desc: 'Tresorerie previsionnelle, marge par projet, rapprochement bancaire IA.' },
  { icon: '⏱', title: 'Suivi d\'activite', desc: 'Saisie des temps, taux d\'occupation, rentabilite collaborateur.' },
  { icon: '🎯', title: 'Pipeline commercial', desc: 'Kanban deals, prevision CA, scoring leads par intelligence artificielle.' },
  { icon: '🔗', title: 'Connecteurs natifs', desc: '30+ integrations : Sage, Pennylane, Stripe, HubSpot, PayFit, Slack...' },
  { icon: '🤖', title: 'IA decisionnelle', desc: 'Anomalies detectees, recommandations contextuelles, agents autonomes.' },
]

const PERSONAS = [
  { icon: '👔', role: 'Dirigeant', need: 'Vue 360 de mon entreprise en 1 ecran', solution: 'Dashboard decisionnel avec alertes IA sur CA, tresorerie et rentabilite.' },
  { icon: '📈', role: 'DAF / Comptable', need: 'Arretes mensuels en 2h au lieu de 2 jours', solution: 'Import FEC, rapprochement bancaire IA, previsionnel automatise.' },
  { icon: '🎯', role: 'Commercial', need: 'Pipeline clair et previsions fiables', solution: 'Kanban deals, scoring IA, relances automatiques, suivi multi-societes.' },
  { icon: '👥', role: 'Manager', need: 'Savoir ou en sont mes equipes en temps reel', solution: 'Taux d\'occupation, validation temps, alertes depassement budget projet.' },
]

const STATS = [
  { value: '48h', label: 'pour generer votre outil' },
  { value: '11', label: 'modules metier disponibles' },
  { value: '0', label: 'ligne de code requise' },
  { value: 'IA', label: 'qui code pour vous' },
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
  { id: 'lucca',       name: 'Lucca',          cat: 'rh',       color: '#7C3AED' },
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
  { id: 'all',     label: 'Tous',           icon: '' },
  { id: 'compta',  label: 'Comptabilite',   icon: '' },
  { id: 'crm',     label: 'CRM',            icon: '' },
  { id: 'finance', label: 'Finance',        icon: '' },
  { id: 'rh',      label: 'RH & Paie',     icon: '' },
  { id: 'comm',    label: 'Communication',  icon: '' },
  { id: 'prod',    label: 'Productivite',   icon: '' },
  { id: 'data',    label: 'Data & API',     icon: '' },
  { id: 'ia',      label: 'IA',             icon: '' },
]

const BI_PREVIEWS = []

// ── Composant SVG — Hub decisionnel ────────────────────────────────────────
function BiHubVisual() {
  const B = '#2B4C7E'
  const sources = [
    { label: 'Compta', sub: 'Sage · Pennylane', color: '#00DC82', angle: 0 },
    { label: 'CRM', sub: 'HubSpot · Salesforce', color: '#FF7A59', angle: 45 },
    { label: 'Banques', sub: 'Stripe · Qonto', color: '#635BFF', angle: 90 },
    { label: 'RH', sub: 'PayFit · Lucca', color: '#0066FF', angle: 135 },
    { label: 'Temps', sub: 'Saisie · Planning', color: '#F59E0B', angle: 180 },
    { label: 'Mails', sub: 'Gmail · Outlook', color: '#EA4335', angle: 225 },
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
          <clipPath id="hubClip"><rect x="0" y="0" width="500" height="480" /><circle cx={cx} cy={cy} r="60" fill="black" /></clipPath>
          <mask id="hubMask"><rect x="0" y="0" width="500" height="480" fill="white" /><circle cx={cx} cy={cy} r="60" fill="black" /></mask>
        </defs>

        {/* Cercles de fond concentriques */}
        <circle cx={cx} cy={cy} r={R + 40} fill="none" stroke={B} strokeWidth="0.5" opacity="0.05" />
        <circle cx={cx} cy={cy} r={R + 20} fill="none" stroke={B} strokeWidth="0.5" opacity="0.08" strokeDasharray="4 4" />

        {/* Connexions + billes animees — masquees derriere le logo */}
        <g mask="url(#hubMask)">
        {sources.map((src, i) => {
          const a = (src.angle - 90) * Math.PI / 180
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          const dur = (2 + (i % 3) * 0.4).toFixed(1)
          const delay = (i * 0.35).toFixed(1)
          return (
            <g key={src.label + '-conn'}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={B} strokeWidth="1" opacity="0.1" />
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={src.color} strokeWidth="0.8" opacity="0.3" strokeDasharray="3 5">
                <animate attributeName="strokeDashoffset" values="0;-16" dur="2s" repeatCount="indefinite" />
              </line>
              <circle r="4" fill={B} filter="url(#bGlow)" opacity="0.85">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={delay + 's'}>
                  <mpath xlinkHref={`#path-${i}`} />
                </animateMotion>
              </circle>
              <circle r="2.5" fill={B} opacity="0.5">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" begin={(parseFloat(delay) + 1) + 's'} keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                  <mpath xlinkHref={`#path-${i}`} />
                </animateMotion>
              </circle>
              <path id={`path-${i}`} d={`M${cx},${cy} L${ax},${ay}`} fill="none" />
            </g>
          )
        })}
        </g>

        {/* Sources en cercle */}
        {sources.map((src, i) => {
          const a = (src.angle - 90) * Math.PI / 180
          const ax = cx + R * Math.cos(a)
          const ay = cy + R * Math.sin(a)
          return (
            <g key={src.label} filter="url(#shadow)">
              <circle cx={ax} cy={ay} r={30} fill="#fff" stroke={src.color} strokeWidth="2" />
              <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central" fill="#1a2332" fontSize="11" fontWeight="700">{src.label}</text>
            </g>
          )
        })}

        {/* Hub central — logo gear */}
        <image href="/logo-icon.svg" x={cx-55} y={cy-55} width="110" height="110" />
      </svg>
    </div>
  )
}

// ── Composant — Texte rotatif dans le hero ──────────────────────────────────
function RotatingText() {
  const WORDS = [
    'application de gestion',
    'logiciel de facturation',
    'CRM sur mesure',
    'outil de comptabilite',
    'plateforme RH',
    'tableau de bord',
    'tout ce que vous voulez',
  ]
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const word = WORDS[index]
    if (typing) {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setTyping(false), 1500)
        return () => clearTimeout(t)
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30)
        return () => clearTimeout(t)
      } else {
        setIndex(i => (i + 1) % WORDS.length)
        setTyping(true)
      }
    }
  }, [displayed, typing, index])

  return (
    <span style={{
      background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      display: 'inline',
    }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: 3, height: '1em', marginLeft: 2,
        background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
        animation: 'blink 1s infinite', verticalAlign: 'text-bottom',
      }} />
    </span>
  )
}

// ── Composant — Hero Visual (Prompt bar + Mockup interactif) ─────────────────
function HeroVisual() {
  const [active, setActive] = useState('dashboard')

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', title: 'Tableau de bord', kpis: ['CA: 72 450 €', 'Pipeline: 343k €', 'Marge: 68%', 'Treso: 62k €'] },
    { id: 'equipe', label: 'Equipe', icon: '👥', title: 'Gestion d\'equipe', kpis: ['Effectif: 45', 'Absents: 3', 'Heures: 1 247h', 'Occupation: 94%'] },
    { id: 'finance', label: 'Finance', icon: '💰', title: 'Pilotage financier', kpis: ['Ecritures: 4 521', 'Rapproche: 98%', 'FEC: OK', 'Balance: 0.00 €'] },
    { id: 'commerce', label: 'Commerce', icon: '🎯', title: 'Pipeline commercial', kpis: ['Leads: 47', 'Opportunites: 12', 'CA gagne: 185k €', 'Taux: 34%'] },
    { id: 'calendrier', label: 'Calendrier', icon: '📅', title: 'Calendrier', kpis: ['Reunions: 8', 'A venir: 3', 'Outlook: sync', 'Equipe: 12'] },
  ]
  const t = TABS.find(x => x.id === active)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Prompt bar — factice */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderRadius: 14, border: '1px solid rgba(0,212,255,0.2)',
        background: '#0f172a', boxShadow: '0 4px 20px rgba(0,212,255,0.08)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '.65rem', fontWeight: 800, color: '#fff',
        }}>AI</div>
        <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: '.9rem' }}>
          Decrivez l'application de gestion que vous souhaitez creer...
        </span>
        <span style={{
          padding: '6px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
          color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
        }}>Generer</span>
      </div>

      {/* Mockup browser — interactif */}
      <div style={{ position: 'relative' }}>
        {/* Floating tab buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'center' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActive(tab.id)} onMouseEnter={() => setActive(tab.id)}
              style={{
                padding: '6px 16px', borderRadius: 100, cursor: 'pointer', fontSize: '.78rem', fontWeight: 600,
                border: active === tab.id ? '2px solid transparent' : '1px solid #e2e8f0',
                background: active === tab.id ? 'linear-gradient(135deg, #7C3AED, #00D4FF)' : '#fff',
                color: active === tab.id ? '#fff' : '#64748b',
                boxShadow: active === tab.id ? '0 4px 15px rgba(0,212,255,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all .2s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browser chrome */}
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,212,255,0.1)',
        }}>
          {/* Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '.7rem', color: '#94a3b8' }}>app.timeblast.ai</div>
          </div>
          {/* App */}
          <div style={{ display: 'flex', minHeight: 320 }}>
            {/* Sidebar */}
            <div style={{ width: 44, background: '#0f2b42', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <img src="/logo-icon-white.svg" alt="" style={{ width: 22, height: 22, marginBottom: 8 }} />
              {TABS.map((tab) => (
                <div key={tab.id} onClick={() => setActive(tab.id)} style={{
                  width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: active === tab.id ? '#fff' : 'rgba(255,255,255,.4)',
                  background: active === tab.id ? 'rgba(255,255,255,.15)' : 'transparent',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  {tab.icon}
                </div>
              ))}
            </div>
            {/* Main content — changes with active tab */}
            <div style={{ flex: 1, padding: '14px 18px', background: '#f8fafc', transition: 'all .2s' }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#195C82', marginBottom: 12 }}>
                {t.icon} {t.title}
              </div>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                {t.kpis.map((kpi, i) => {
                  const [label, val] = kpi.split(': ')
                  return (
                    <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '.38rem', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#1a2332' }}>{val}</div>
                    </div>
                  )
                })}
              </div>
              {/* Content area */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px', minHeight: 140 }}>
                {active === 'dashboard' ? (
                  <svg viewBox="0 0 300 60" style={{ width: '100%' }}>
                    <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity=".15" /><stop offset="100%" stopColor="#00D4FF" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0,50 30,45 60,40 90,30 120,35 150,25 180,20 210,18 240,15 270,12 300,6 300,60 0,60Z" fill="url(#mg)" />
                    <polyline points="0,50 30,45 60,40 90,30 120,35 150,25 180,20 210,18 240,15 270,12 300,6" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinejoin="round" />
                    <polyline points="0,55 30,50 60,48 90,42 120,40 150,38 180,35 210,30 240,28 270,25 300,20" fill="none" stroke="#00D4FF" strokeWidth="1.5" strokeLinejoin="round" opacity=".6" />
                  </svg>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, rgba(124,58,237,.1), rgba(0,212,255,.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                          {t.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: `${95 - i * 14}%` }} />
                        </div>
                        <div style={{ width: 36, height: 5, background: i <= 2 ? 'linear-gradient(90deg, #7C3AED, #00D4FF)' : '#e2e8f0', borderRadius: 3, opacity: .6 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles constants ──
const S = {
  // Colors
  neon: '#00D4FF',
  sra: '#195C82',
  dark: '#0f172a',
  gray: '#64748b',
  lightGray: '#94a3b8',
  bg: '#fff',
  bgAlt: '#fafbfc',
  borderGlow: 'rgba(0,212,255,0.12)',
  shadowGlow: 'rgba(0,212,255,0.08)',
  gradient: 'linear-gradient(135deg, #00D4FF, #7C3AED, #00D4FF)',
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
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeCat, setActiveCat] = useState('all')

  const filteredConnectors = activeCat === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.cat === activeCat)

  // Comptes recents
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
    <div className="landing" style={{ background: '#fff', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════════════
          1. NAVBAR
      ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,212,255,0.08)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        }}>
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 38 }} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '.85rem', fontWeight: 500,
          }} className="landing-nav-links">
            <a href="#comment" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.neon} onMouseLeave={e => e.target.style.color = S.gray}>
              Comment ca marche
            </a>
            <a href="#modules" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.neon} onMouseLeave={e => e.target.style.color = S.gray}>
              Modules
            </a>
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
              style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.neon} onMouseLeave={e => e.target.style.color = S.gray}>
              Groupe SRA
            </a>
            <a href="/about" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.neon} onMouseLeave={e => e.target.style.color = S.gray}>
              A propos
            </a>
            <a href="/facture-electronique" style={{ background: 'linear-gradient(135deg, #7C3AED, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', fontWeight: 600 }}>
              E-Facture 2026
            </a>
          </div>

          <button className="landing-burger" onClick={() => setMobileMenu(true)} style={{
            display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: S.dark,
          }}>☰</button>

          <button onClick={() => setShowLogin(true)} style={{
            padding: '8px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
            border: 'none', color: '#fff', fontWeight: 600,
            fontSize: '.85rem', cursor: 'pointer', transition: 'all .2s',
            boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
          }}
          onMouseEnter={e => { e.target.style.boxShadow = '0 6px 25px rgba(124,58,237,0.5)'; e.target.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.target.style.boxShadow = '0 4px 15px rgba(124,58,237,0.3)'; e.target.style.transform = 'none' }}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Menu mobile ── */}
      <div className={`landing-mobile-menu ${mobileMenu ? 'open' : ''}`}>
        <button className="landing-mobile-close" onClick={() => setMobileMenu(false)}>✕</button>
        <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 40, marginBottom: '1rem' }} />
        <a href="#comment" onClick={() => setMobileMenu(false)}>Comment ca marche</a>
        <a href="#modules" onClick={() => setMobileMenu(false)}>Modules</a>
        <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer">Groupe SRA</a>
        <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
        <a href="/about" onClick={() => setMobileMenu(false)}>A propos</a>
        <a href="/facture-electronique" style={{ color: '#7C3AED' }}>E-Facture 2026</a>
        <button onClick={() => { setMobileMenu(false); setShowLogin(true) }} style={{
          marginTop: '1rem', padding: '12px 24px', borderRadius: 8, background: '#195C82',
          color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', width: '100%',
        }}>
          Se connecter
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        paddingTop: 120, paddingBottom: 60, background: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle gradient orb background */}
        <div style={{
          position: 'absolute', top: -200, right: -200, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100, width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(25,92,130,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <div>
            {/* Badge */}
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
              borderRadius: 100, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
              fontSize: '.82rem', fontWeight: 600, color: S.sra, marginBottom: '1.5rem',
              textDecoration: 'none', cursor: 'pointer',
            }}>
              Propulse par 40 ans d'expertise SRA →
            </a>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15,
              color: S.dark, margin: '0 auto 1.5rem', letterSpacing: '-0.02em',
              maxWidth: 800, minHeight: 'calc(clamp(2.2rem, 4vw, 3.5rem) * 2.3)',
            }}>
              Creez en un seul prompt votre{' '}
              <RotatingText />
            </h1>

            <p style={{
              fontSize: '1.1rem', color: S.gray, lineHeight: 1.65, margin: '0 auto 2.5rem', maxWidth: 600,
            }}>
              Decrivez votre besoin. TimeBlast le genere. Nativement interconnecte a tous les logiciels de votre SI.
            </p>

            {/* Grande barre de prompt */}
            <form onSubmit={e => { e.preventDefault(); setShowLogin(true) }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
              borderRadius: 16, border: '2px solid rgba(0,212,255,0.2)',
              background: '#0f172a', boxShadow: '0 8px 40px rgba(0,212,255,0.12)',
              maxWidth: 700, margin: '0 auto 3rem',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.7rem', fontWeight: 800, color: '#fff',
              }}>AI</div>
              <input type="text" placeholder="Decrivez l'application que vous souhaitez creer..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: '1rem', fontWeight: 500,
                }} />
              <button type="submit" style={{
                padding: '8px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #00D4FF)',
                color: '#fff', fontSize: '.85rem', fontWeight: 700,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>Generer →</button>
            </form>

            {/* Mockup interactif en dessous */}
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. STATS BAR
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: '#fff', padding: '3rem 2rem',
        borderTop: '1px solid rgba(0,212,255,0.08)', borderBottom: '1px solid rgba(0,212,255,0.08)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap',
          maxWidth: 900, margin: '0 auto',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block', fontSize: '2.8rem', fontWeight: 800,
                background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', lineHeight: 1.1,
              }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '.85rem', color: S.gray, marginTop: '.35rem', fontWeight: 500 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* BiHubVisual is now inside the connecteurs section */}

      {/* ══════════════════════════════════════════════════════════════════
          5. COMMENT CA MARCHE — 5 Phases
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }} id="comment">
        <h2 style={{
          fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: S.dark,
          margin: '0 0 .5rem', textAlign: 'center', letterSpacing: '-0.01em',
        }}>
          Comment ca marche
        </h2>
        <p style={{
          fontSize: '1.05rem', color: S.gray, textAlign: 'center', maxWidth: 500,
          margin: '0 auto 3rem', lineHeight: 1.6,
        }}>
          5 etapes pour passer de l'idee a l'outil en production
        </p>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          maxWidth: 1100, margin: '0 auto',
        }}>
          {[
            { num: '1', icon: '💬', title: 'Besoin fonctionnel', desc: 'Decrivez votre besoin en francais. L\'IA structure vos exigences.' },
            { num: '2', icon: '📐', title: 'Maquette', desc: 'Choisissez vos modules et validez la structure de votre outil.' },
            { num: '3', icon: '🎨', title: 'Design & mise en page', desc: 'Personnalisez les couleurs, le logo et l\'experience utilisateur.' },
            { num: '4', icon: '🚀', title: 'Mise en production', desc: 'Votre outil est deploye sur un sous-domaine dedie, pret a l\'emploi.' },
            { num: '5', icon: '🛡️', title: 'Support & suivi', desc: 'Evolutions, support technique et monitoring en continu.' },
          ].map((step, i) => (
            <div key={i} style={{
              flex: '1 1 180px', maxWidth: 200, padding: '2rem 1.2rem', borderRadius: 16,
              border: '1px solid rgba(0,212,255,0.1)', background: '#fff', textAlign: 'center',
              transition: 'all .3s', cursor: 'default',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,212,255,0.1)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.02)'
              e.currentTarget.style.transform = 'none'
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,212,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .75rem',
                fontSize: 24, border: '1px solid rgba(0,212,255,0.12)',
              }}>{step.icon}</div>
              <div style={{
                fontSize: '.75rem', fontWeight: 800, letterSpacing: '0.05em',
                background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', marginBottom: 6, textTransform: 'uppercase',
              }}>ETAPE {step.num}</div>
              <h4 style={{ margin: '0 0 .4rem', fontSize: '.92rem', fontWeight: 700, color: S.dark }}>{step.title}</h4>
              <p style={{ margin: 0, fontSize: '.8rem', color: S.gray, lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. MODULES DISPONIBLES (connectors/categories)
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 2rem', background: S.bgAlt }} id="connecteurs">
        <div style={{ display: 'flex', gap: 40, maxWidth: 1200, margin: '0 auto', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Left — BiHubVisual */}
          <div style={{ flex: '0 0 360px', maxWidth: 400 }}>
            <BiHubVisual />
          </div>
          {/* Right — Connecteurs */}
          <div style={{ flex: 1, minWidth: 300 }}>
        <h2 style={{
          fontSize: 'clamp(1.4rem, 2.2vw, 1.8rem)', fontWeight: 800, color: S.dark,
          margin: '0 0 .5rem',
        }}>
          30+ connecteurs disponibles
        </h2>
        <p style={{
          fontSize: '1rem', color: S.gray, maxWidth: 550,
          margin: '0 0 1.5rem', lineHeight: 1.6,
        }}>
          Votre application se connecte nativement a tous les outils de votre SI.
        </p>

        {/* Category tabs */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
          maxWidth: 900, margin: '0 auto 2rem',
        }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
              padding: '8px 16px', borderRadius: 100, border: '1px solid',
              borderColor: activeCat === cat.id ? '#00D4FF' : '#e2e8f0',
              background: activeCat === cat.id ? 'rgba(0,212,255,0.08)' : '#fff',
              color: activeCat === cat.id ? S.sra : S.gray,
              fontWeight: activeCat === cat.id ? 700 : 500, fontSize: '.82rem',
              cursor: 'pointer', transition: 'all .2s',
              boxShadow: activeCat === cat.id ? '0 0 15px rgba(0,212,255,0.12)' : 'none',
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Connector grid */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
          maxWidth: 900, margin: '0 auto',
        }}>
          {filteredConnectors.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0',
              fontSize: '.85rem', fontWeight: 500, color: S.dark, transition: 'all .2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#00D4FF'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,212,255,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: c.color,
                flexShrink: 0,
              }} />
              {c.name}
            </div>
          ))}
        </div>
        <p style={{ color: S.lightGray, fontSize: '.82rem', marginTop: '1rem' }}>
          ... et bien d'autres via <strong>Zapier</strong>, <strong>Make</strong> et notre <strong>API REST</strong> ouverte.
        </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. DES MODULES PRETS A L'EMPLOI
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }} id="modules">
        <h2 style={{
          fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: S.dark,
          margin: '0 0 .5rem', textAlign: 'center',
        }}>
          Des modules prets a l'emploi
        </h2>
        <p style={{
          fontSize: '1.05rem', color: S.gray, textAlign: 'center', maxWidth: 550,
          margin: '0 auto 3rem', lineHeight: 1.6,
        }}>
          Chaque module est pre-construit et personnalisable. L'IA les adapte a votre metier.
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, maxWidth: 1000, margin: '0 auto',
        }}>
          {BI_MODULES.map((m, i) => (
            <div key={i} style={{
              padding: '2rem', borderRadius: 16, background: '#fff',
              border: '1px solid rgba(0,212,255,0.1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)', transition: 'all .3s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,212,255,0.1)'
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.02)'
              e.currentTarget.style.transform = 'none'
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(124,58,237,.08), rgba(0,212,255,.08))',
                fontSize: 24, marginBottom: '1rem',
                border: '1px solid rgba(0,212,255,0.15)',
              }}>{m.icon}</span>
              <h3 style={{ margin: '0 0 .5rem', fontSize: '1.05rem', fontWeight: 700, color: S.dark }}>{m.title}</h3>
              <p style={{ margin: 0, fontSize: '.88rem', color: S.gray, lineHeight: 1.55 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. 40 ANS D'EXPERTISE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '5rem 2rem', background: S.bgAlt, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Gradient accent orb */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 250,
          background: 'radial-gradient(circle, rgba(255,107,53,0.06) 0%, rgba(255,215,0,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{
            fontSize: '.82rem', fontWeight: 600, letterSpacing: '2px',
            textTransform: 'uppercase', marginBottom: '1.5rem',
            background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Un produit du Groupe SRA
          </p>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 1.5rem',
          }}>
            40 ans d'expertise{' '}
            <span style={{
              background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              au service de l'innovation
            </span>
          </h2>
          <p style={{
            fontSize: '1.1rem', color: S.gray, lineHeight: 1.7, margin: '0 0 2.5rem',
          }}>
            Depuis 1986, le Groupe SRA accompagne les PME et ETI dans leur transformation digitale. Cette expertise de terrain nous a permis de concevoir TimeBlast : la plateforme de vibe-coding parfaite pour creer des applications metier avec l'IA.
          </p>
          <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 16, background: '#fff',
              border: '1px solid rgba(0,212,255,0.15)', borderRadius: 14,
              padding: '1.25rem 2.5rem', textDecoration: 'none', transition: 'all .3s',
              boxShadow: '0 4px 16px rgba(0,212,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#00D4FF'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,212,255,0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,212,255,0.04)'
              e.currentTarget.style.transform = 'none'
            }}>
            <img src="/logo-sra.png" alt="Groupe SRA" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: S.sra }}>
                Groupe SRA — Partenaire digital des PME et ETI
              </div>
              <div style={{ fontSize: '.82rem', color: S.gray, marginTop: 2 }}>
                Integrateur Sage Diamond, Microsoft, HubSpot
              </div>
              <div style={{
                fontSize: '.78rem', fontWeight: 600, marginTop: 4,
                background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Decouvrir le groupe → groupe-sra.fr
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          9. CONTACT FORM
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }} id="contact">
        <h2 style={{
          fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: S.dark,
          margin: '0 0 .5rem', textAlign: 'center',
        }}>
          Demandez votre diagnostic gratuit
        </h2>
        <p style={{
          fontSize: '1.05rem', color: S.gray, textAlign: 'center', maxWidth: 550,
          margin: '0 auto 3rem', lineHeight: 1.6,
        }}>
          En 30 minutes, nous evaluons votre besoin et vous montrons ce que TimeBlast peut automatiser.
        </p>

        <div style={{
          maxWidth: 900, margin: '0 auto', display: 'grid',
          gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'start',
        }}>
          {/* Info side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { icon: '-', title: 'Diagnostic gratuit', desc: 'Evaluation de votre maturite data en 30 min' },
              { icon: '-', title: 'Reponse sous 24h', desc: 'Notre equipe revient vers vous rapidement' },
              { icon: '-', title: 'Demo personnalisee', desc: 'Sur vos donnees, vos cas d\'usage' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 16, padding: '1.25rem',
                borderRadius: 14, background: S.bgAlt, border: '1px solid rgba(0,212,255,0.08)',
              }}>
                <span style={{
                  fontSize: '1.5rem', flexShrink: 0, width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 12, background: 'rgba(0,212,255,0.06)',
                }}>{item.icon}</span>
                <div>
                  <strong style={{ color: S.dark, fontSize: '.95rem' }}>{item.title}</strong>
                  <p style={{ margin: '.25rem 0 0', color: S.gray, fontSize: '.85rem' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form side */}
          <form onSubmit={handleContactSubmit} style={{
            padding: '2rem', borderRadius: 16, background: '#fff',
            border: '1px solid rgba(0,212,255,0.12)',
            boxShadow: '0 8px 30px rgba(0,212,255,0.06)',
          }}>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '.75rem', color: '#22c55e' }}>OK</span>
                <h3 style={{ margin: '0 0 .5rem', color: S.dark }}>Demande envoyee !</h3>
                <p style={{ color: S.gray }}>Nous preparons votre diagnostic et revenons vers vous tres vite.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Nom complet *</label>
                    <input type="text" required placeholder="Jean Dupont"
                      value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                        transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Email professionnel *</label>
                    <input type="email" required placeholder="jean@entreprise.com"
                      value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                        transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Entreprise</label>
                    <input type="text" placeholder="Mon Entreprise SAS"
                      value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                        transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Telephone</label>
                    <input type="tel" placeholder="06 XX XX XX XX"
                      value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                        transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Votre besoin *</label>
                  <textarea required rows={4} placeholder="Decrivez le logiciel dont vous avez besoin..."
                    value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit',
                      transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <button type="submit" style={{
                  width: '100%', padding: '14px', borderRadius: 10, background: '#195C82',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem',
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                  transition: 'all .25s',
                }}
                onMouseEnter={e => { e.target.style.boxShadow = '0 8px 30px rgba(0,212,255,0.45)'; e.target.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(0,212,255,0.3)'; e.target.style.transform = 'none' }}>
                  Demander mon diagnostic gratuit →
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          10. FINAL CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '5rem 2rem', textAlign: 'center',
        background: '#195C82', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: '#fff',
            margin: '0 0 1rem',
          }}>
            Pret a creer votre application ?
          </h2>
          <p style={{
            fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', maxWidth: 500,
            margin: '0 auto 2rem', lineHeight: 1.6,
          }}>
            Creez votre logiciel de gestion sur mesure sans ecrire une ligne de code.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowLogin(true)} style={{
              padding: '14px 32px', borderRadius: 10, background: '#fff',
              color: S.sra, border: 'none', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'all .25s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)' }}>
              Demarrer mon projet →
            </button>
            <a href="#contact" style={{
              padding: '14px 32px', borderRadius: 10, background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff',
              fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
              transition: 'all .25s', display: 'inline-flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.4)' }}>
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          11. FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: '#195C82', padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <img src="/logo-full-white.svg" alt="TimeBlast" style={{ height: 24, opacity: 0.8 }} />
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '.82rem' }}>
            &copy; {new Date().getFullYear()} TimeBlast.ai — Vibe-coding pour logiciels de gestion
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/about" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textDecoration: 'none' }}>A propos</a>
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textDecoration: 'none' }}>Groupe SRA</a>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════
          LOGIN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLogin && (
        <div onClick={() => setShowLogin(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 420, width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 40px rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.1)', position: 'relative',
          }}>
            {/* Close button */}
            <button onClick={() => setShowLogin(false)} style={{
              position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: S.bgAlt, color: S.gray, fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
            onMouseLeave={e => { e.currentTarget.style.background = S.bgAlt; e.currentTarget.style.color = S.gray }}>
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: 'rgba(0,212,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto .75rem', border: '1px solid rgba(0,212,255,0.15)',
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>TB</span>
              </div>
              <h2 style={{ margin: '0 0 .25rem', fontSize: '1.4rem', fontWeight: 800, color: S.dark }}>Connexion</h2>
              <p style={{ color: S.gray, fontSize: '.88rem', margin: 0 }}>
                Accedez a votre espace decisionnel
              </p>
            </div>

            {/* Recent accounts */}
            {recentAccounts.length > 0 && !email && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '.75rem', color: S.gray, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comptes recents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentAccounts.map(acc => (
                    <button key={acc.email} onClick={() => selectRecentAccount(acc.email)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 12, border: '1px solid #e2e8f0', background: S.bgAlt,
                        cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00D4FF'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,212,255,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: S.gradient, color: '#fff', fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {acc.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: S.dark }}>{acc.email}</div>
                        <div style={{ fontSize: '.75rem', color: S.lightGray }}>
                          {new Date(acc.lastLogin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, color: S.lightGray }}>→</span>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', margin: '12px 0 0' }}>
                  <button onClick={() => setEmail(' ')} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '.82rem',
                    fontWeight: 600,
                    background: S.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    + Utiliser un autre compte
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Email</label>
                <input id="email" type="email" value={email.trim()}
                  onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus
                  placeholder="nom@entreprise.com"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                    transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Mot de passe</label>
                <input id="password" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
                    transition: 'border-color .2s, box-shadow .2s', background: S.bgAlt,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#00D4FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '.85rem', margin: '0 0 12px', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: 10, background: '#195C82',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)', transition: 'all .25s',
              }}>
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ color: S.lightGray, fontSize: '.8rem' }}>ou</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Microsoft SSO */}
              <button type="button" onClick={handleMicrosoftLogin} disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid #e2e8f0', background: '#fff', fontSize: '.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                  color: S.dark, fontWeight: 600, transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#00D4FF'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,212,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}>
                <svg width="20" height="20" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Se connecter avec Microsoft
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
