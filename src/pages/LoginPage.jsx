import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Modules decisionnels ──
const BI_MODULES = [
  { icon: '\u{1F4CA}', title: 'Tableaux de bord', desc: 'KPIs temps reel, drill-down multi-axes, alertes automatiques sur seuils.' },
  { icon: '\u{1F4B0}', title: 'Pilotage financier', desc: 'Tresorerie previsionnelle, marge par projet, rapprochement bancaire IA.' },
  { icon: '\u23F1', title: 'Suivi d\'activite', desc: 'Saisie des temps, taux d\'occupation, rentabilite collaborateur.' },
  { icon: '\u{1F3AF}', title: 'Pipeline commercial', desc: 'Kanban deals, prevision CA, scoring leads par intelligence artificielle.' },
  { icon: '\u{1F517}', title: 'Connecteurs natifs', desc: '30+ integrations : Sage, Pennylane, Stripe, HubSpot, PayFit, Slack...' },
  { icon: '\u{1F916}', title: 'IA decisionnelle', desc: 'Anomalies detectees, recommandations contextuelles, agents autonomes.' },
]

const PERSONAS = [
  { icon: '\u{1F454}', role: 'Dirigeant', need: 'Vue 360 de mon entreprise en 1 ecran', solution: 'Dashboard decisionnel avec alertes IA sur CA, tresorerie et rentabilite.' },
  { icon: '\u{1F4C8}', role: 'DAF / Comptable', need: 'Arretes mensuels en 2h au lieu de 2 jours', solution: 'Import FEC, rapprochement bancaire IA, previsionnel automatise.' },
  { icon: '\u{1F3AF}', role: 'Commercial', need: 'Pipeline clair et previsions fiables', solution: 'Kanban deals, scoring IA, relances automatiques, suivi multi-societes.' },
  { icon: '\u{1F465}', role: 'Manager', need: 'Savoir ou en sont mes equipes en temps reel', solution: 'Taux d\'occupation, validation temps, alertes depassement budget projet.' },
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
  { id: 'lucca',       name: 'Lucca',          cat: 'rh',       color: '#195C82' },
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
    { label: 'Compta', sub: 'Sage \u00B7 Pennylane', color: '#00DC82', angle: 0 },
    { label: 'CRM', sub: 'HubSpot \u00B7 Salesforce', color: '#FF7A59', angle: 45 },
    { label: 'Banques', sub: 'Stripe \u00B7 Qonto', color: '#635BFF', angle: 90 },
    { label: 'RH', sub: 'PayFit \u00B7 Lucca', color: '#0066FF', angle: 135 },
    { label: 'Temps', sub: 'Saisie \u00B7 Planning', color: '#F59E0B', angle: 180 },
    { label: 'Mails', sub: 'Gmail \u00B7 Outlook', color: '#EA4335', angle: 225 },
    { label: 'Projets', sub: 'Jira \u00B7 Trello', color: '#0052CC', angle: 270 },
    { label: 'IA', sub: 'Claude \u00B7 GPT', color: '#10A37F', angle: 315 },
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
      background: '#195C82',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      display: 'inline',
    }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: 3, height: '1em', marginLeft: 2,
        background: '#195C82',
        animation: 'blink 1s infinite', verticalAlign: 'text-bottom',
      }} />
    </span>
  )
}

// ── Styles constants ──
const S = {
  neon: '#195C82',
  sra: '#195C82',
  dark: '#0f172a',
  gray: '#64748b',
  lightGray: '#94a3b8',
  bg: '#fff',
  bgAlt: '#fafbfc',
  borderGlow: 'rgba(25,92,130,0.12)',
  shadowGlow: 'rgba(25,92,130,0.08)',
  gradient: 'linear-gradient(135deg, #195C82, #195C82, #195C82)',
}

// ── Interactive Mockup ──────────────────────────────────────────────────────
function InteractiveMockup({ onTabChange }) {
  const [active, setActive] = useState('dashboard')

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}', title: 'Tableau de bord', kpis: [{ label: 'CA mensuel', value: '72 450 \u20AC', trend: '+12%' }, { label: 'Pipeline', value: '343k \u20AC', trend: '+8%' }, { label: 'Marge nette', value: '68%', trend: '+3%' }, { label: 'Tresorerie', value: '62k \u20AC', trend: '+5%' }] },
    { id: 'equipe', label: '\u00C9quipe', icon: '\u{1F465}', title: 'Gestion d\u2019equipe', kpis: [{ label: 'Effectif', value: '45', trend: '' }, { label: 'Absents', value: '3', trend: '' }, { label: 'Heures', value: '1 247h', trend: '' }, { label: 'Occupation', value: '94%', trend: '+2%' }] },
    { id: 'finance', label: 'Finance', icon: '\u{1F4B0}', title: 'Pilotage financier', kpis: [{ label: 'Ecritures', value: '4 521', trend: '' }, { label: 'Rapproche', value: '98%', trend: '+1%' }, { label: 'FEC', value: 'OK', trend: '' }, { label: 'Balance', value: '0.00 \u20AC', trend: '' }] },
    { id: 'commerce', label: 'Commerce', icon: '\u{1F3AF}', title: 'Pipeline commercial', kpis: [{ label: 'Leads', value: '47', trend: '+15%' }, { label: 'Opportunites', value: '12', trend: '' }, { label: 'CA gagne', value: '185k \u20AC', trend: '+22%' }, { label: 'Taux', value: '34%', trend: '+4%' }] },
    { id: 'calendrier', label: 'Calendrier', icon: '\u{1F4C5}', title: 'Calendrier', kpis: [{ label: 'Reunions', value: '8', trend: '' }, { label: 'A venir', value: '3', trend: '' }, { label: 'Outlook', value: 'sync', trend: '' }, { label: 'Equipe', value: '12', trend: '' }] },
  ]
  const t = TABS.find(x => x.id === active)

  return (
    <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
      {/* Floating tab buttons ABOVE the mockup */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)} onMouseEnter={() => setActive(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 100, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
              border: active === tab.id ? '2px solid transparent' : '1px solid #e2e8f0',
              background: active === tab.id ? '#195C82' : '#fff',
              color: active === tab.id ? '#fff' : '#64748b',
              boxShadow: active === tab.id ? '0 4px 20px rgba(25,92,130,0.35)' : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all .25s ease',
              letterSpacing: '-0.01em',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Browser chrome with perspective tilt */}
      <div style={{
        transform: 'perspective(2000px) rotateX(2deg)',
        transition: 'transform .4s ease',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(25,92,130,0.12), 0 0 60px rgba(25,92,130,0.06)',
        }}>
          {/* Browser bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <div style={{
              flex: 1, textAlign: 'center', fontSize: '.75rem', color: '#94a3b8',
              background: '#fff', borderRadius: 8, padding: '5px 16px', border: '1px solid #e2e8f0',
              maxWidth: 320, margin: '0 auto',
            }}>
              <span style={{ color: '#22c55e', marginRight: 4 }}>&#x1F512;</span>
              app.timeblast.ai/{active}
            </div>
            <div style={{ width: 60 }} />
          </div>

          {/* App layout */}
          <div style={{ display: 'flex', minHeight: 360 }}>
            {/* Sidebar */}
            <div style={{
              width: 52, background: 'linear-gradient(180deg, #0a1628, #0f2b42)', padding: '14px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <img src="/logo-icon-white.svg" alt="" style={{ width: 24, height: 24, marginBottom: 12, opacity: 0.9 }} />
              {TABS.map((tab) => (
                <div key={tab.id} onClick={() => setActive(tab.id)} style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: active === tab.id ? '#fff' : 'rgba(255,255,255,.35)',
                  background: active === tab.id ? 'linear-gradient(135deg, rgba(25,92,130,.5), rgba(25,92,130,.3))' : 'transparent',
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  {tab.icon}
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#195C82', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 800 }}>NR</div>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: '18px 22px', background: '#f8fafc', transition: 'all .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {t.icon} {t.title}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: '.65rem', color: '#64748b' }}>Mars 2026</span>
                  <span style={{ padding: '4px 10px', borderRadius: 6, background: '#195C82', fontSize: '.65rem', color: '#fff', fontWeight: 600 }}>Exporter</span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {t.kpis.map((kpi, i) => (
                  <div key={i} style={{
                    background: '#fff', borderRadius: 10, padding: '12px 14px',
                    border: '1px solid #e2e8f0', transition: 'all .2s',
                  }}>
                    <div style={{ fontSize: '.5rem', color: '#94a3b8', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <div style={{ fontSize: '.85rem', fontWeight: 800, color: '#0f172a' }}>{kpi.value}</div>
                      {kpi.trend && <span style={{ fontSize: '.5rem', color: '#22c55e', fontWeight: 600 }}>{kpi.trend}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart / content area */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px', minHeight: 150 }}>
                {active === 'dashboard' ? (
                  <svg viewBox="0 0 400 80" style={{ width: '100%' }}>
                    <defs>
                      <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#195C82" stopOpacity=".12" />
                        <stop offset="100%" stopColor="#195C82" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#195C82" />
                        <stop offset="100%" stopColor="#195C82" />
                      </linearGradient>
                    </defs>
                    <path d="M0,65 40,58 80,52 120,38 160,42 200,30 240,24 280,20 320,16 360,10 400,5 400,80 0,80Z" fill="url(#mg2)" />
                    <polyline points="0,65 40,58 80,52 120,38 160,42 200,30 240,24 280,20 320,16 360,10 400,5" fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points="0,70 40,65 80,62 120,55 160,52 200,48 240,42 280,36 320,32 360,28 400,22" fill="none" stroke="#195C82" strokeWidth="1.5" strokeLinejoin="round" opacity=".4" strokeDasharray="4 3" />
                    {/* Data points */}
                    {[[0,65],[80,52],[160,42],[240,24],[320,16],[400,5]].map(([px,py], i) => (
                      <circle key={i} cx={px} cy={py} r="3" fill="#195C82" stroke="#fff" strokeWidth="1.5" />
                    ))}
                  </svg>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: 'linear-gradient(135deg, rgba(25,92,130,.08), rgba(25,92,130,.08))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                        }}>
                          {t.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, width: `${100 - i * 14}%` }} />
                        </div>
                        <div style={{
                          width: 42, height: 6,
                          background: i <= 2 ? 'linear-gradient(90deg, #195C82, #195C82)' : '#e2e8f0',
                          borderRadius: 3, opacity: i <= 2 ? 0.8 : 0.4,
                        }} />
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

  // Shared input style helper
  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none',
    transition: 'border-color .2s, box-shadow .2s', background: '#fafbfc',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const focusInput = e => { e.target.style.borderColor = '#195C82'; e.target.style.boxShadow = '0 0 0 3px rgba(25,92,130,0.1)' }
  const blurInput = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

  return (
    <div className="landing" style={{ background: '#fff', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════════════
          GLOBAL KEYFRAMES
      ══════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes blink { 0%,50% { opacity: 1 } 51%,100% { opacity: 0 } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(25,92,130,0.15), 0 0 60px rgba(25,92,130,0.08) } 50% { box-shadow: 0 0 40px rgba(25,92,130,0.25), 0 0 80px rgba(25,92,130,0.15) } }
        @keyframes gradient-shift { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
        .landing-prompt-bar { animation: pulse-glow 3s ease-in-out infinite; }
        .landing-prompt-bar:focus-within { box-shadow: 0 0 50px rgba(25,92,130,0.35), 0 0 100px rgba(25,92,130,0.2) !important; }
        .landing-nav-links { display: flex; }
        .landing-burger { display: none !important; }
        @media (max-width: 900px) {
          .landing-nav-links { display: none !important; }
          .landing-burger { display: flex !important; }
        }
        .landing-mobile-menu { position:fixed;inset:0;z-index:10000;background:#fff;padding:2rem;display:flex;flex-direction:column;gap:1rem;transform:translateX(100%);transition:transform .3s; }
        .landing-mobile-menu.open { transform:translateX(0); }
        .landing-mobile-menu a { font-size:1.1rem;font-weight:600;color:#0f172a;text-decoration:none;padding:.5rem 0;border-bottom:1px solid #f1f5f9; }
        .landing-mobile-close { position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          1. NAVBAR — Glassmorphism
      ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(25,92,130,0.08)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        }}>
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 40 }} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '.85rem', fontWeight: 500,
          }} className="landing-nav-links">
            <a href="#comment" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.dark} onMouseLeave={e => e.target.style.color = S.gray}>
              Comment ca marche
            </a>
            <a href="#modules" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.dark} onMouseLeave={e => e.target.style.color = S.gray}>
              Modules
            </a>
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
              style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.dark} onMouseLeave={e => e.target.style.color = S.gray}>
              Groupe SRA
            </a>
            <a href="/about" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = S.dark} onMouseLeave={e => e.target.style.color = S.gray}>
              A propos
            </a>
            <a href="/facture-electronique" style={{
              background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', textDecoration: 'none', fontWeight: 700,
            }}>
              E-Facture 2026
            </a>
          </div>

          <button className="landing-burger" onClick={() => setMobileMenu(true)} style={{
            display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: S.dark,
          }}>\u2630</button>

          <button onClick={() => setShowLogin(true)} style={{
            padding: '9px 22px', borderRadius: 10,
            background: '#195C82',
            border: 'none', color: '#fff', fontWeight: 700,
            fontSize: '.85rem', cursor: 'pointer', transition: 'all .25s',
            boxShadow: '0 4px 20px rgba(25,92,130,0.3)',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.5)'; e.target.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)'; e.target.style.transform = 'none' }}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Menu mobile ── */}
      <div className={`landing-mobile-menu ${mobileMenu ? 'open' : ''}`}>
        <button className="landing-mobile-close" onClick={() => setMobileMenu(false)}>\u2715</button>
        <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 40, marginBottom: '1rem' }} />
        <a href="#comment" onClick={() => setMobileMenu(false)}>Comment ca marche</a>
        <a href="#modules" onClick={() => setMobileMenu(false)}>Modules</a>
        <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer">Groupe SRA</a>
        <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
        <a href="/about" onClick={() => setMobileMenu(false)}>A propos</a>
        <a href="/facture-electronique" style={{ color: '#195C82' }}>E-Facture 2026</a>
        <button onClick={() => { setMobileMenu(false); setShowLogin(true) }} style={{
          marginTop: '1rem', padding: '14px 24px', borderRadius: 10, background: '#195C82',
          color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', width: '100%',
        }}>
          Se connecter
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. HERO — Full impact
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        paddingTop: 140, paddingBottom: 40, background: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: -300, right: -200, width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(25,92,130,0.04) 0%, rgba(25,92,130,0.03) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 100, left: -300, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(25,92,130,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px',
            borderRadius: 100, background: 'rgba(25,92,130,0.04)', border: '1px solid rgba(25,92,130,0.12)',
            fontSize: '.82rem', fontWeight: 600, color: S.sra, marginBottom: '2rem',
            textDecoration: 'none', cursor: 'pointer', transition: 'all .25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.3)'; e.currentTarget.style.background = 'rgba(25,92,130,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.12)'; e.currentTarget.style.background = 'rgba(25,92,130,0.04)' }}>
            Propulse par 40 ans d'expertise SRA \u2192
          </a>

        </div>

        {/* Hero grid : texte gauche + animation droite */}
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 2rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, lineHeight: 1.15,
              color: S.dark, margin: '0 0 1.25rem', letterSpacing: '-0.02em',
              minHeight: 'calc(clamp(2rem, 3.5vw, 3rem) * 2.3)',
            }}>
              Creez en un seul prompt votre{' '}
              <RotatingText />
            </h1>

            <p style={{
              fontSize: '1.1rem', color: S.gray, lineHeight: 1.65, margin: '0 0 2rem', maxWidth: 520,
            }}>
              Decrivez votre besoin. TimeBlast le genere. Nativement interconnecte a tous les logiciels de votre SI.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="landing-btn-primary" onClick={() => setShowLogin(true)}>
                Demarrer mon projet →
              </button>
              <a href="#comment" className="landing-btn-secondary">
                Comment ca marche
              </a>
            </div>
          </div>

          <div>
            <BiHubVisual />
          </div>
        </div>
      </section>

      {/* Mockup a cheval sur stats */}
      <section style={{ background: 'linear-gradient(to bottom, #195C82 55%, #fff 55%)', position: 'relative', padding: '0 2rem 5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', padding: '3rem 2rem 2.5rem', flexWrap: 'wrap', maxWidth: 1060, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '.2rem' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ perspective: '1200px' }}>
            <div style={{ transform: 'rotateX(1.5deg)', transformOrigin: 'bottom center', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '.7rem', color: '#94a3b8' }}>app.timeblast.ai</div>
              </div>
              <div style={{ display: 'flex', minHeight: 380 }}>
                <div style={{ width: 52, background: '#0f2b42', padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <img src="/logo-icon-white.svg" alt="" style={{ width: 28, height: 28, marginBottom: 12 }} />
                  {['\ud83d\udcca','\u23f1','\ud83d\udcbc','\ud83e\uddfe','\ud83d\udc65','\ud83d\udccb','\ud83c\udfaf','\ud83d\udcec'].map((ic, i) => (
                    <div key={i} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 14, background: i === 0 ? 'rgba(255,255,255,.12)' : 'transparent' }}>{ic}</div>
                  ))}
                </div>
                <div style={{ flex: 1, padding: '16px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#195C82', marginBottom: 12 }}>Tableau de bord</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[{l:'CA mensuel',v:'72 450 \u20ac',t:'+18%',u:true},{l:'Pipeline',v:'343k \u20ac',t:'8 deals',u:true},{l:'Marge',v:'68%',t:'+3pts',u:true},{l:'Tresorerie',v:'62 812 \u20ac',t:'-5%',u:false},{l:'Heures',v:'1 247h',t:'94%',u:true}].map((k, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '.42rem', color: '#94a3b8', fontWeight: 600 }}>{k.l}</div>
                        <div style={{ fontSize: '.85rem', fontWeight: 800, color: '#1a2332' }}>{k.v}</div>
                        <span style={{ fontSize: '.4rem', fontWeight: 700, color: k.u ? '#16a34a' : '#ef4444' }}>{k.u ? '\u2191' : '\u2193'} {k.t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px' }}>
                    <svg viewBox="0 0 300 70" style={{ width: '100%' }}>
                      <defs><linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#195C82" stopOpacity=".1" /><stop offset="100%" stopColor="#195C82" stopOpacity="0" /></linearGradient></defs>
                      <path d="M0,55 25,52 50,48 75,38 100,42 125,33 150,28 175,24 200,20 225,22 250,16 275,14 300,8 300,70 0,70Z" fill="url(#ag2)" />
                      <polyline points="0,55 25,52 50,48 75,38 100,42 125,33 150,28 175,24 200,20 225,22 250,16 275,14 300,8" fill="none" stroke="#195C82" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. STATS BAR
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: '#fff', padding: '4rem 2rem',
        borderTop: '1px solid rgba(25,92,130,0.08)', borderBottom: '1px solid rgba(25,92,130,0.08)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '5rem', flexWrap: 'wrap',
          maxWidth: 900, margin: '0 auto',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block', fontSize: '3.2rem', fontWeight: 800,
                background: '#195C82',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', lineHeight: 1.1,
              }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '.88rem', color: S.gray, marginTop: '.5rem', fontWeight: 500 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. NATIVEMENT CONNECTE — BiHubVisual + connectors
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: S.bgAlt }} id="connecteurs">
        <div style={{ display: 'flex', gap: 48, maxWidth: 1200, margin: '0 auto', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Left — BiHubVisual */}
          <div style={{ flex: '0 0 380px', maxWidth: 420 }}>
            <BiHubVisual />
          </div>
          {/* Right — Connecteurs */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <p style={{
              fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', marginBottom: '.75rem',
            }}>Nativement connecte</p>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: S.dark,
              margin: '0 0 .5rem', letterSpacing: '-0.02em',
            }}>
              30+ connecteurs disponibles
            </h2>
            <p style={{
              fontSize: '1rem', color: S.gray, maxWidth: 550,
              margin: '0 0 2rem', lineHeight: 1.65,
            }}>
              Votre application se connecte nativement a tous les outils de votre SI.
            </p>

            {/* Category tabs */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem',
            }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
                  padding: '7px 16px', borderRadius: 100, border: '1px solid',
                  borderColor: activeCat === cat.id ? '#195C82' : '#e2e8f0',
                  background: activeCat === cat.id ? 'rgba(25,92,130,0.06)' : '#fff',
                  color: activeCat === cat.id ? '#195C82' : S.gray,
                  fontWeight: activeCat === cat.id ? 700 : 500, fontSize: '.8rem',
                  cursor: 'pointer', transition: 'all .2s',
                  boxShadow: activeCat === cat.id ? '0 0 15px rgba(25,92,130,0.1)' : 'none',
                }}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Connector grid */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
              {filteredConnectors.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                  borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0',
                  fontSize: '.83rem', fontWeight: 500, color: S.dark, transition: 'all .25s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = c.color
                  e.currentTarget.style.boxShadow = `0 4px 15px ${c.color}20`
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'none'
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0,
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
          5. COMMENT CA MARCHE — 5 Phases
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: '#fff' }} id="comment">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{
            fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '.75rem',
          }}>Processus</p>
          <h2 style={{
            fontSize: 'clamp(1.7rem, 2.8vw, 2.4rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 .75rem', letterSpacing: '-0.02em',
          }}>
            Comment ca marche
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 500,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            5 etapes pour passer de l'idee a l'outil en production
          </p>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          maxWidth: 1100, margin: '0 auto',
        }}>
          {[
            { num: '1', icon: '\u{1F4AC}', title: 'Besoin fonctionnel', desc: 'Decrivez votre besoin en francais. L\'IA structure vos exigences.' },
            { num: '2', icon: '\u{1F4D0}', title: 'Maquette', desc: 'Choisissez vos modules et validez la structure de votre outil.' },
            { num: '3', icon: '\u{1F3A8}', title: 'Design & mise en page', desc: 'Personnalisez les couleurs, le logo et l\'experience utilisateur.' },
            { num: '4', icon: '\u{1F680}', title: 'Mise en production', desc: 'Votre outil est deploye sur un sous-domaine dedie, pret a l\'emploi.' },
            { num: '5', icon: '\u{1F6E1}\uFE0F', title: 'Support & suivi', desc: 'Evolutions, support technique et monitoring en continu.' },
          ].map((step, i) => (
            <div key={i} style={{
              flex: '1 1 180px', maxWidth: 200, padding: '2rem 1.4rem', borderRadius: 18,
              border: '1px solid rgba(25,92,130,0.1)', background: '#fff', textAlign: 'center',
              transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(25,92,130,0.25)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.08), 0 0 0 1px rgba(25,92,130,0.1)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.02)'
              e.currentTarget.style.transform = 'none'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(25,92,130,.06), rgba(25,92,130,.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .75rem',
                fontSize: 26, border: '1px solid rgba(25,92,130,0.1)',
              }}>{step.icon}</div>
              <div style={{
                fontSize: '.72rem', fontWeight: 800, letterSpacing: '0.08em',
                background: '#195C82',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', marginBottom: 8, textTransform: 'uppercase',
              }}>ETAPE {step.num}</div>
              <h4 style={{ margin: '0 0 .5rem', fontSize: '.95rem', fontWeight: 700, color: S.dark }}>{step.title}</h4>
              <p style={{ margin: 0, fontSize: '.82rem', color: S.gray, lineHeight: 1.55 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. MODULES PRETS A L'EMPLOI
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: S.bgAlt }} id="modules">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{
            fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '.75rem',
          }}>Catalogue</p>
          <h2 style={{
            fontSize: 'clamp(1.7rem, 2.8vw, 2.4rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 .75rem', letterSpacing: '-0.02em',
          }}>
            Des modules prets a l'emploi
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 550,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            Chaque module est pre-construit et personnalisable. L'IA les adapte a votre metier.
          </p>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 20, maxWidth: 1000, margin: '0 auto',
        }}>
          {BI_MODULES.map((m, i) => (
            <div key={i} style={{
              padding: '2rem', borderRadius: 18, background: '#fff',
              border: '1px solid rgba(25,92,130,0.1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(25,92,130,0.25)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.08), 0 0 0 1px rgba(25,92,130,0.08)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.02)'
              e.currentTarget.style.transform = 'none'
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(25,92,130,.06), rgba(25,92,130,.06))',
                fontSize: 26, marginBottom: '1.25rem',
                border: '1px solid rgba(25,92,130,0.1)',
              }}>{m.icon}</span>
              <h3 style={{ margin: '0 0 .5rem', fontSize: '1.08rem', fontWeight: 700, color: S.dark }}>{m.title}</h3>
              <p style={{ margin: 0, fontSize: '.88rem', color: S.gray, lineHeight: 1.6 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. 40 ANS D'EXPERTISE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 2rem', background: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(circle, rgba(25,92,130,0.04) 0%, rgba(25,92,130,0.03) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{
            fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '1.5rem',
            background: '#195C82',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Un produit du Groupe SRA
          </p>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 1.5rem', letterSpacing: '-0.02em',
          }}>
            40 ans d'expertise{' '}
            <span style={{
              background: '#195C82',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              au service de l'innovation
            </span>
          </h2>
          <p style={{
            fontSize: '1.1rem', color: S.gray, lineHeight: 1.75, margin: '0 0 2.5rem',
          }}>
            Depuis 1986, le Groupe SRA accompagne les PME et ETI dans leur transformation digitale. Cette expertise de terrain nous a permis de concevoir TimeBlast : la plateforme de vibe-coding parfaite pour creer des applications metier avec l'IA.
          </p>
          <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 16, background: '#fff',
              border: '1px solid rgba(25,92,130,0.1)', borderRadius: 16,
              padding: '1.5rem 2.5rem', textDecoration: 'none', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#195C82'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.1)'
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'
              e.currentTarget.style.transform = 'none'
            }}>
            <img src="/logo-sra.png" alt="Groupe SRA" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: S.sra }}>
                Groupe SRA \u2014 Partenaire digital des PME et ETI
              </div>
              <div style={{ fontSize: '.82rem', color: S.gray, marginTop: 3 }}>
                Integrateur Sage Diamond, Microsoft, HubSpot
              </div>
              <div style={{
                fontSize: '.8rem', fontWeight: 700, marginTop: 5,
                background: '#195C82',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Decouvrir le groupe \u2192 groupe-sra.fr
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. CONTACT FORM
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: S.bgAlt }} id="contact">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{
            fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '.75rem',
          }}>Contact</p>
          <h2 style={{
            fontSize: 'clamp(1.7rem, 2.8vw, 2.4rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 .75rem', letterSpacing: '-0.02em',
          }}>
            Demandez votre diagnostic gratuit
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 550,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            En 30 minutes, nous evaluons votre besoin et vous montrons ce que TimeBlast peut automatiser.
          </p>
        </div>

        <div style={{
          maxWidth: 920, margin: '0 auto', display: 'grid',
          gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'start',
        }}>
          {/* Info side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '\u{1F50D}', title: 'Diagnostic gratuit', desc: 'Evaluation de votre maturite data en 30 min' },
              { icon: '\u26A1', title: 'Reponse sous 24h', desc: 'Notre equipe revient vers vous rapidement' },
              { icon: '\u{1F3AF}', title: 'Demo personnalisee', desc: 'Sur vos donnees, vos cas d\'usage' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 16, padding: '1.25rem',
                borderRadius: 16, background: '#fff', border: '1px solid rgba(25,92,130,0.06)',
                transition: 'all .25s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(25,92,130,0.15)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(25,92,130,0.06)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(25,92,130,0.06)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}>
                <span style={{
                  fontSize: '1.4rem', flexShrink: 0, width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, background: 'linear-gradient(135deg, rgba(25,92,130,.06), rgba(25,92,130,.06))',
                  border: '1px solid rgba(25,92,130,0.08)',
                }}>{item.icon}</span>
                <div>
                  <strong style={{ color: S.dark, fontSize: '.95rem' }}>{item.title}</strong>
                  <p style={{ margin: '.3rem 0 0', color: S.gray, fontSize: '.85rem', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form side */}
          <form onSubmit={handleContactSubmit} style={{
            padding: '2rem', borderRadius: 20, background: '#fff',
            border: '1px solid rgba(25,92,130,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.04)',
          }}>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto .75rem',
                  background: 'linear-gradient(135deg, #22c55e, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: '#fff',
                }}>\u2713</div>
                <h3 style={{ margin: '0 0 .5rem', color: S.dark, fontSize: '1.2rem' }}>Demande envoyee !</h3>
                <p style={{ color: S.gray, fontSize: '.9rem' }}>Nous preparons votre diagnostic et revenons vers vous tres vite.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Nom complet *</label>
                    <input type="text" required placeholder="Jean Dupont"
                      value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Email professionnel *</label>
                    <input type="email" required placeholder="jean@entreprise.com"
                      value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Entreprise</label>
                    <input type="text" placeholder="Mon Entreprise SAS"
                      value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Telephone</label>
                    <input type="tel" placeholder="06 XX XX XX XX"
                      value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Votre besoin *</label>
                  <textarea required rows={4} placeholder="Decrivez le logiciel dont vous avez besoin..."
                    value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={focusInput} onBlur={blurInput} />
                </div>
                <button type="submit" style={{
                  width: '100%', padding: '14px', borderRadius: 12, background: '#195C82',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem',
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(25,92,130,0.3)',
                  transition: 'all .25s',
                }}
                onMouseEnter={e => { e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.45)'; e.target.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)'; e.target.style.transform = 'none' }}>
                  Demander mon diagnostic gratuit \u2192
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          9. FINAL CTA — Blue SRA background
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 2rem', textAlign: 'center',
        background: '#195C82', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 400, background: 'radial-gradient(circle, rgba(25,92,130,0.15) 0%, rgba(25,92,130,0.1) 30%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -100, width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(25,92,130,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)', fontWeight: 800, color: '#fff',
            margin: '0 0 1rem', letterSpacing: '-0.02em',
          }}>
            Pret a creer votre application ?
          </h2>
          <p style={{
            fontSize: '1.1rem', color: 'rgba(255,255,255,0.75)', maxWidth: 520,
            margin: '0 auto 2.5rem', lineHeight: 1.65,
          }}>
            Creez votre logiciel de gestion sur mesure sans ecrire une ligne de code.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowLogin(true)} style={{
              padding: '15px 36px', borderRadius: 12, background: '#fff',
              color: S.sra, border: 'none', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'all .25s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}
            onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)' }}>
              Demarrer mon projet \u2192
            </button>
            <a href="#contact" style={{
              padding: '15px 36px', borderRadius: 12, background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff',
              fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
              transition: 'all .25s', display: 'inline-flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}>
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          10. FOOTER — Blue SRA
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: '#12475e', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <img src="/logo-full-white.svg" alt="TimeBlast" style={{ height: 24, opacity: 0.8 }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '.82rem' }}>
            &copy; {new Date().getFullYear()} TimeBlast.ai \u2014 Vibe-coding pour logiciels de gestion
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/about" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
              A propos
            </a>
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
              Groupe SRA
            </a>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════
          LOGIN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLogin && (
        <div onClick={() => setShowLogin(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 24, padding: '2.5rem', maxWidth: 420, width: '100%',
            boxShadow: '0 25px 80px rgba(0,0,0,0.25), 0 0 60px rgba(25,92,130,0.08)',
            border: '1px solid rgba(25,92,130,0.08)', position: 'relative',
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
              \u2715
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(25,92,130,.08), rgba(25,92,130,.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto .75rem', border: '1px solid rgba(25,92,130,0.12)',
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TB</span>
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
                        borderRadius: 14, border: '1px solid #e2e8f0', background: S.bgAlt,
                        cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(25,92,130,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#195C82', color: '#fff', fontSize: 13, fontWeight: 700,
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
                      <span style={{ fontSize: 14, color: S.lightGray }}>\u2192</span>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', margin: '12px 0 0' }}>
                  <button onClick={() => setEmail(' ')} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '.82rem',
                    fontWeight: 600,
                    background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
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
                  style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Mot de passe</label>
                <input id="password" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '.85rem', margin: '0 0 12px', padding: '10px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: 12, background: '#195C82',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '.95rem',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(25,92,130,0.3)', transition: 'all .25s',
              }}
              onMouseEnter={e => { if (!loading) { e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.45)'; e.target.style.transform = 'translateY(-1px)' }}}
              onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)'; e.target.style.transform = 'none' }}>
                {loading ? 'Connexion...' : 'Se connecter \u2192'}
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
                  width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid #e2e8f0', background: '#fff', fontSize: '.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                  color: S.dark, fontWeight: 600, transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(25,92,130,0.06)' }}
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
