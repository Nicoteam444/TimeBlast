import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Modules decisionnels ──
const BI_MODULES = [
  { icon: '📊', title: 'Tableaux de bord', desc: 'KPIs temps réel, drill-down multi-axes, alertes automatiques sur seuils.' },
  { icon: '💰', title: 'Pilotage financier', desc: 'Trésorerie prévisionnelle, marge par projet, rapprochement bancaire IA.' },
  { icon: '⏱', title: 'Suivi d\'activité', desc: 'Saisie des temps, taux d\'occupation, rentabilité collaborateur.' },
  { icon: '🎯', title: 'Pipeline commercial', desc: 'Kanban deals, prévision CA, scoring leads par intelligence artificielle.' },
  { icon: '🔗', title: 'Connecteurs natifs', desc: '30+ intégrations : Sage, Pennylane, Stripe, HubSpot, PayFit, Slack...' },
  { icon: '🤖', title: 'IA décisionnelle', desc: 'Anomalies détectées, recommandations contextuelles, agents autonomes.' },
]

const PERSONAS = [
  { icon: '👔', role: 'Dirigeant', need: 'Vue 360 de mon entreprise en 1 écran', solution: 'Dashboard décisionnel avec alertes IA sur CA, trésorerie et rentabilité.' },
  { icon: '📈', role: 'DAF / Comptable', need: 'Arrêtés mensuels en 2h au lieu de 2 jours', solution: 'Import FEC, rapprochement bancaire IA, prévisionnel automatisé.' },
  { icon: '🎯', role: 'Commercial', need: 'Pipeline clair et prévisions fiables', solution: 'Kanban deals, scoring IA, relances automatiques, suivi multi-sociétés.' },
  { icon: '👥', role: 'Manager', need: 'Savoir où en sont mes équipes en temps réel', solution: 'Taux d\'occupation, validation temps, alertes dépassement budget projet.' },
]

const STATS = [
  { value: '48h', label: 'pour générer votre outil' },
  { value: '11', label: 'modules métier disponibles' },
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
  { id: 'compta',  label: 'Comptabilité',   icon: '' },
  { id: 'crm',     label: 'CRM',            icon: '' },
  { id: 'finance', label: 'Finance',        icon: '' },
  { id: 'rh',      label: 'RH & Paie',     icon: '' },
  { id: 'comm',    label: 'Communication',  icon: '' },
  { id: 'prod',    label: 'Productivité',   icon: '' },
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
    'outil de comptabilité',
    'plateforme RH',
    'tableau de bord',
    'logiciel métier',
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
function InteractiveMockup() {
  const [active, setActive] = useState('dashboard')

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', title: 'Tableau de bord', kpis: [{ label: 'CA mensuel', value: '72 450 €', trend: '+12%' }, { label: 'Pipeline', value: '343k €', trend: '+8%' }, { label: 'Marge nette', value: '68%', trend: '+3%' }, { label: 'Trésorerie', value: '62k €', trend: '+5%' }], chat: { user: 'Je veux un dashboard avec KPI', ai: ['✓ Dashboard KPI temps réel', '✓ Graphiques CA & marge', '✓ Alertes automatiques'] } },
    { id: 'equipe', label: 'Équipe', icon: '👥', title: "Gestion d'équipe", kpis: [{ label: 'Effectif', value: '45', trend: '' }, { label: 'Absents', value: '3', trend: '' }, { label: 'Heures', value: '1 247h', trend: '' }, { label: 'Occupation', value: '94%', trend: '+2%' }], chat: { user: "Ajoute la gestion d'équipe", ai: ['✓ Fiches collaborateurs', '✓ Calendrier absences', "✓ Taux d'occupation"] } },
    { id: 'finance', label: 'Finance', icon: '💰', title: 'Pilotage financier', kpis: [{ label: 'Écritures', value: '4 521', trend: '' }, { label: 'Rapproché', value: '98%', trend: '+1%' }, { label: 'FEC', value: 'OK', trend: '' }, { label: 'Balance', value: '0.00 €', trend: '' }], chat: { user: 'Je veux la comptabilité FEC', ai: ['✓ Import FEC automatique', '✓ Rapprochement bancaire', '✓ Balance et écritures'] } },
    { id: 'commerce', label: 'Commerce', icon: '🎯', title: 'Pipeline commercial', kpis: [{ label: 'Leads', value: '47', trend: '+15%' }, { label: 'Opportunités', value: '12', trend: '' }, { label: 'CA gagné', value: '185k €', trend: '+22%' }, { label: 'Taux', value: '34%', trend: '+4%' }], chat: { user: 'Ajoute un CRM avec pipeline', ai: ['✓ Pipeline Kanban', '✓ Scoring leads IA', '✓ Relances automatiques'] } },
    { id: 'banque', label: 'Banque', icon: '🏦', title: 'Rapprochement bancaire', kpis: [{ label: 'Solde', value: '84 320 €', trend: '+6%' }, { label: 'Rapproché', value: '97%', trend: '+2%' }, { label: 'En attente', value: '12', trend: '-3' }, { label: 'Virements', value: '38', trend: '' }], chat: { user: 'Je veux le rapprochement bancaire', ai: ['✓ Import relevés auto', '✓ Rapprochement IA', '✓ Alertes anomalies'] } },
    { id: 'calendrier', label: 'Calendrier', icon: '📅', title: 'Calendrier', kpis: [{ label: 'Événements', value: '24', trend: '+5' }, { label: 'Réunions', value: '8', trend: '' }, { label: 'Échéances', value: '6', trend: '-2' }, { label: 'Disponibilité', value: '72%', trend: '+4%' }], chat: { user: 'Ajoute un calendrier partagé', ai: ['✓ Vue semaine/mois', '✓ Réservation salles', '✓ Rappels automatiques'] } },
    { id: 'projet', label: 'Projets', icon: '📋', title: 'Suivi projets', kpis: [{ label: 'Projets actifs', value: '9', trend: '+2' }, { label: 'En retard', value: '1', trend: '-1' }, { label: 'Budget conso.', value: '67%', trend: '' }, { label: 'Livraisons', value: '4', trend: '+1' }], chat: { user: 'Ajoute le suivi de projets', ai: ['✓ Planning Gantt', '✓ Suivi jalons', '✓ Allocation ressources'] } },
    { id: 'mail', label: 'Mail', icon: '✉', title: 'Messagerie', kpis: [{ label: 'Inbox', value: '142', trend: '+18' }, { label: 'Envoyés', value: '87', trend: '' }, { label: 'Brouillons', value: '5', trend: '' }, { label: 'Taux ouv.', value: '64%', trend: '+8%' }], chat: { user: 'Intègre la messagerie', ai: ['✓ Boîte de réception unifiée', '✓ Réponses suggérées IA', '✓ Classement automatique'] } },
    { id: 'backoffice', label: 'Backoffice', icon: '⚙', title: 'Administration', kpis: [{ label: 'Utilisateurs', value: '9', trend: '' }, { label: 'Connecteurs', value: '5/8', trend: '' }, { label: 'Environnements', value: '1', trend: '' }, { label: 'Uptime', value: '99.9%', trend: '' }], chat: { user: 'Configure les accès utilisateurs', ai: ['✓ 9 utilisateurs configurés', '✓ Droits par module', '✓ Profils métier'] } },
  ]
  const t = TABS.find(x => x.id === active)

  return (
    <div className="landing-mockup-wrapper" style={{ width: '100%', maxWidth: 1060, margin: '2rem auto 0', overflow: 'hidden' }}>
      {/* Main mockup: browser chrome wrapping sidebar + content + chat */}
      <div className="landing-mockup-dual" style={{
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(25,92,130,0.12)',
        transform: 'perspective(2000px) rotateX(2deg)',
        transition: 'transform .4s ease',
      }}>
        {/* Browser bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <div style={{
            flex: 1, textAlign: 'center', fontSize: '.7rem', color: '#94a3b8',
            background: '#fff', borderRadius: 8, padding: '4px 12px', border: '1px solid #e2e8f0',
            maxWidth: 240, margin: '0 auto',
          }}>
            {'🔒'} app.timeblast.ai/{active}
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* App layout: sidebar + main content + chat panel */}
        <div style={{ display: 'flex', height: 600 }}>
          {/* Sidebar */}
          <div style={{
            width: 48, background: 'linear-gradient(180deg, #0a1628, #0f2b42)', padding: '12px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0,
          }}>
            <img src="/logo-icon-white.svg" alt="" style={{ width: 22, height: 22, marginBottom: 10, opacity: 0.9 }} />
            {TABS.map((tab) => (
              <div key={tab.id} onClick={() => setActive(tab.id)} style={{
                width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: active === tab.id ? '#fff' : 'rgba(255,255,255,.35)',
                background: active === tab.id ? 'rgba(25,92,130,.4)' : 'transparent',
                cursor: 'pointer', transition: 'all .2s',
              }}>
                {tab.icon}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#195C82', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 800 }}>NR</div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '14px 18px', background: '#f8fafc', transition: 'all .2s', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#0f172a' }}>
                {t.icon} {t.title}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: '.6rem', color: '#64748b' }}>Mars 2026</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: '#195C82', fontSize: '.6rem', color: '#fff', fontWeight: 600 }}>Exporter</span>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {t.kpis.map((kpi, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 8, padding: '10px 10px',
                  border: '1px solid #e2e8f0', transition: 'all .2s',
                }}>
                  <div style={{ fontSize: '.45rem', color: '#94a3b8', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#0f172a' }}>{kpi.value}</div>
                    {kpi.trend && <span style={{ fontSize: '.45rem', color: '#22c55e', fontWeight: 600 }}>{kpi.trend}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart / content area */}
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px', minHeight: 120 }}>
              {active === 'dashboard' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Évolution CA mensuel (k€)</div>
                  <svg viewBox="0 0 400 90" style={{ width: '100%' }}>
                    <defs>
                      <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#195C82" stopOpacity=".12" />
                        <stop offset="100%" stopColor="#195C82" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M30,70 80,63 140,57 200,43 260,47 320,35 370,22 370,85 30,85Z" fill="url(#mg2)" />
                    <polyline points="30,70 80,63 140,57 200,43 260,47 320,35 370,22" fill="none" stroke="#195C82" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {[[30,70,'Oct'],[80,63,'Nov'],[140,57,'Déc'],[200,43,'Jan'],[260,47,'Fév'],[320,35,'Mar'],[370,22,'Avr']].map(([px,py,lbl], i) => (
                      <g key={i}>
                        <circle cx={px} cy={py} r="3" fill="#195C82" stroke="#fff" strokeWidth="1.5" />
                        <text x={px} y={88} textAnchor="middle" fontSize="6" fill="#94a3b8">{lbl}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : active === 'equipe' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Heures travaillées vs disponibles</div>
                  <svg viewBox="0 0 400 100" style={{ width: '100%' }}>
                    {[{name:'Martin',worked:70,avail:25},{name:'Dupont',worked:60,avail:35},{name:'Leroy',worked:50,avail:45},{name:'Moreau',worked:65,avail:30},{name:'Petit',worked:40,avail:55}].map((d, i) => {
                      const x = 30 + i * 72
                      const baseY = 80
                      const workedH = d.worked / 100 * 65
                      const availH = d.avail / 100 * 65
                      return (
                        <g key={i}>
                          <rect x={x} y={baseY - workedH - availH} width={32} height={availH} rx={2} fill="#94a3b8" opacity={0.3} />
                          <rect x={x} y={baseY - workedH} width={32} height={workedH} rx={2} fill="#195C82" />
                          <text x={x + 16} y={93} textAnchor="middle" fontSize="6.5" fill="#64748b">{d.name}</text>
                        </g>
                      )
                    })}
                    <rect x="330" y="8" width="8" height="8" rx={1} fill="#195C82" />
                    <text x="342" y="15" fontSize="6" fill="#64748b">Travaillé</text>
                    <rect x="330" y="20" width="8" height="8" rx={1} fill="#94a3b8" opacity={0.3} />
                    <text x="342" y="27" fontSize="6" fill="#64748b">Dispo.</text>
                  </svg>
                </div>
              ) : active === 'finance' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Waterfall trésorerie (k€)</div>
                  <svg viewBox="0 0 400 100" style={{ width: '100%' }}>
                    {[{label:'Jan',val:40,type:'up'},{label:'Fév',val:25,type:'up'},{label:'Charges',val:-18,type:'down'},{label:'Salaires',val:-30,type:'down'},{label:'Subv.',val:15,type:'up'},{label:'Loyer',val:-10,type:'down'},{label:'Mars',val:22,type:'up'}].map((d, i) => {
                      const x = 10 + i * 55
                      const baseline = 65
                      const barH = Math.abs(d.val) * 0.8
                      const y = d.type === 'up' ? baseline - barH : baseline
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={35} height={barH} rx={2} fill={d.type === 'up' ? '#22c55e' : '#ef4444'} />
                          <text x={x + 17.5} y={92} textAnchor="middle" fontSize="6" fill="#64748b">{d.label}</text>
                          <text x={x + 17.5} y={y - 3} textAnchor="middle" fontSize="5.5" fontWeight="700" fill={d.type === 'up' ? '#22c55e' : '#ef4444'}>{d.val > 0 ? '+' : ''}{d.val}</text>
                        </g>
                      )
                    })}
                    <line x1="5" y1="65" x2="395" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                  </svg>
                </div>
              ) : active === 'commerce' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Funnel commercial</div>
                  <svg viewBox="0 0 400 90" style={{ width: '100%' }}>
                    {[{label:'Prospection',pct:100,color:'#195C82'},{label:'Qualification',pct:72,color:'#2d8ab8'},{label:'Proposition',pct:50,color:'#f59e0b'},{label:'Négociation',pct:32,color:'#22c55e'},{label:'Gagné',pct:18,color:'#16a34a'}].map((d, i) => {
                      const y = 2 + i * 17
                      const w = d.pct / 100 * 300
                      const xOff = (300 - w) / 2 + 70
                      return (
                        <g key={i}>
                          <rect x={xOff} y={y} width={w} height={13} rx={3} fill={d.color} opacity={0.85} />
                          <text x={65} y={y + 10} textAnchor="end" fontSize="6" fill="#64748b">{d.label}</text>
                          <text x={xOff + w / 2} y={y + 10} textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff">{d.pct}%</text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              ) : active === 'banque' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Entrées vs Sorties par mois (k€)</div>
                  <svg viewBox="0 0 400 100" style={{ width: '100%' }}>
                    {[{m:'Oct',e:32,s:24},{m:'Nov',e:28,s:30},{m:'Déc',e:45,s:35},{m:'Jan',e:38,s:27},{m:'Fév',e:42,s:31},{m:'Mar',e:50,s:28}].map((d, i) => {
                      const x = 25 + i * 62
                      const baseY = 78
                      const eH = d.e * 0.9
                      const sH = d.s * 0.9
                      return (
                        <g key={i}>
                          <rect x={x} y={baseY - eH} width={14} height={eH} rx={2} fill="#22c55e" opacity={0.85} />
                          <rect x={x + 17} y={baseY - sH} width={14} height={sH} rx={2} fill="#ef4444" opacity={0.85} />
                          <text x={x + 15} y={93} textAnchor="middle" fontSize="6.5" fill="#64748b">{d.m}</text>
                        </g>
                      )
                    })}
                    <rect x="330" y="6" width="8" height="8" rx={1} fill="#22c55e" opacity={0.85} />
                    <text x="342" y="13" fontSize="6" fill="#64748b">Entrées</text>
                    <rect x="330" y="18" width="8" height="8" rx={1} fill="#ef4444" opacity={0.85} />
                    <text x="342" y="25" fontSize="6" fill="#64748b">Sorties</text>
                  </svg>
                </div>
              ) : active === 'calendrier' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Semaine du 24 mars 2026</div>
                  <svg viewBox="0 0 400 95" style={{ width: '100%' }}>
                    {['Lun','Mar','Mer','Jeu','Ven'].map((day, i) => {
                      const x = 10 + i * 78
                      return (
                        <g key={i}>
                          <text x={x + 35} y={10} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#64748b">{day}</text>
                          <rect x={x} y={14} width={70} height={76} rx={3} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                        </g>
                      )
                    })}
                    {[
                      {x:12,y:18,w:66,h:14,color:'#195C82',t:'Réunion équipe'},
                      {x:90,y:18,w:66,h:14,color:'#f59e0b',t:'Point client'},
                      {x:168,y:36,w:66,h:14,color:'#22c55e',t:'Formation'},
                      {x:246,y:18,w:66,h:14,color:'#8b5cf6',t:'Sprint review'},
                      {x:246,y:54,w:66,h:14,color:'#195C82',t:'Demo produit'},
                      {x:324,y:36,w:66,h:14,color:'#ef4444',t:'Deadline v2'},
                      {x:90,y:54,w:144,h:14,color:'rgba(25,92,130,0.2)',t:'Workshop design'},
                      {x:12,y:72,w:66,h:14,color:'#22c55e',t:'1:1 Manager'},
                    ].map((ev, i) => (
                      <g key={i}>
                        <rect x={ev.x} y={ev.y} width={ev.w} height={ev.h} rx={2} fill={ev.color} opacity={0.85} />
                        <text x={ev.x + ev.w / 2} y={ev.y + 9.5} textAnchor="middle" fontSize="5" fontWeight="600" fill="#fff">{ev.t}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : active === 'projet' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Planning projets (Gantt)</div>
                  <svg viewBox="0 0 400 100" style={{ width: '100%' }}>
                    {['Jan','Fév','Mar','Avr','Mai','Jun'].map((m, i) => (
                      <g key={i}>
                        <text x={100 + i * 50 + 25} y={10} textAnchor="middle" fontSize="6" fill="#94a3b8">{m}</text>
                        <line x1={100 + i * 50} y1={14} x2={100 + i * 50} y2={95} stroke="#e2e8f0" strokeWidth="0.5" />
                      </g>
                    ))}
                    {[
                      {name:'Refonte site',start:0,end:120,color:'#195C82'},
                      {name:'App mobile',start:50,end:200,color:'#22c55e'},
                      {name:'Migration ERP',start:100,end:250,color:'#f59e0b'},
                      {name:'API v2',start:30,end:150,color:'#8b5cf6'},
                      {name:'Chatbot IA',start:150,end:300,color:'#ef4444'},
                    ].map((p, i) => {
                      const y = 20 + i * 16
                      return (
                        <g key={i}>
                          <text x={95} y={y + 9} textAnchor="end" fontSize="6" fill="#64748b">{p.name}</text>
                          <rect x={100 + p.start} y={y} width={p.end - p.start} height={11} rx={3} fill={p.color} opacity={0.8} />
                        </g>
                      )
                    })}
                  </svg>
                </div>
              ) : active === 'mail' ? (
                <div>
                  <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Volume par catégorie</div>
                  <svg viewBox="0 0 400 100" style={{ width: '100%' }}>
                    {[
                      {cat:'Clients',inbox:45,sent:30,draft:5},
                      {cat:'Fournisseurs',inbox:32,sent:18,draft:3},
                      {cat:'Interne',inbox:28,sent:42,draft:8},
                      {cat:'Support',inbox:55,sent:25,draft:2},
                      {cat:'Marketing',inbox:20,sent:35,draft:12},
                    ].map((d, i) => {
                      const y = 4 + i * 18
                      const scale = 2.2
                      const iW = d.inbox * scale
                      const sW = d.sent * scale
                      const dW = d.draft * scale
                      return (
                        <g key={i}>
                          <text x={68} y={y + 10} textAnchor="end" fontSize="6" fill="#64748b">{d.cat}</text>
                          <rect x={72} y={y} width={iW} height={13} rx={2} fill="#195C82" opacity={0.85} />
                          <rect x={72 + iW} y={y} width={sW} height={13} rx={0} fill="#22c55e" opacity={0.7} />
                          <rect x={72 + iW + sW} y={y} width={dW} height={13} rx={2} fill="#94a3b8" opacity={0.4} />
                        </g>
                      )
                    })}
                    <rect x="310" y="6" width="8" height="8" rx={1} fill="#195C82" opacity={0.85} />
                    <text x="322" y="13" fontSize="5.5" fill="#64748b">Reçus</text>
                    <rect x="310" y="18" width="8" height="8" rx={1} fill="#22c55e" opacity={0.7} />
                    <text x="322" y="25" fontSize="5.5" fill="#64748b">Envoyés</text>
                    <rect x="310" y="30" width="8" height="8" rx={1} fill="#94a3b8" opacity={0.4} />
                    <text x="322" y="37" fontSize="5.5" fill="#64748b">Brouillons</text>
                  </svg>
                </div>
              ) : active === 'backoffice' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Utilisateurs</div>
                    {[
                      { name: 'Nicolas R.', role: 'Admin', color: '#ef4444' },
                      { name: 'Sophie M.', role: 'Manager', color: '#f59e0b' },
                      { name: 'Thomas D.', role: 'Collab', color: '#195C82' },
                      { name: 'Julie L.', role: 'Collab', color: '#195C82' },
                    ].map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(25,92,130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#195C82' }}>{u.name.split(' ').map(w => w[0]).join('')}</div>
                        <span style={{ fontSize: '.44rem', color: '#0f172a', flex: 1 }}>{u.name}</span>
                        <span style={{ fontSize: '.38rem', fontWeight: 700, color: '#fff', background: u.color, padding: '1px 5px', borderRadius: 4 }}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Connecteurs API</div>
                    {[
                      { name: 'Sage 100', active: true },
                      { name: 'HubSpot CRM', active: true },
                      { name: 'Stripe', active: true },
                      { name: 'PayFit', active: false },
                    ].map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.active ? '#22c55e' : '#d1d5db', flexShrink: 0 }} />
                        <span style={{ fontSize: '.44rem', color: '#0f172a', flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: '.38rem', color: c.active ? '#22c55e' : '#94a3b8' }}>{c.active ? 'Actif' : 'Inactif'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {/* 2 mini-graphiques — visuels uniques par onglet */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                {/* Mini graph 1 */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px' }}>
                  {active === 'dashboard' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>CA par société</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 35 }}>
                      {[65,45,80,55,70].map((h,i) => <div key={i} style={{ flex:1, height:h+'%', background:'#195C82', borderRadius:2, opacity:.6+i*.08 }} />)}
                    </div>
                  </>) : active === 'equipe' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Heures par service</div>
                    <svg viewBox="0 0 100 35" style={{ width:'100%' }}>
                      <polyline points="0,30 20,22 40,25 60,15 80,18 100,8" fill="none" stroke="#195C82" strokeWidth="2" />
                      {[[0,30],[40,25],[80,18],[100,8]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2" fill="#195C82" />)}
                    </svg>
                  </>) : active === 'finance' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Balance mensuelle</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 35 }}>
                      {[20,-15,25,-10,30,-8,18].map((v,i) => <div key={i} style={{ flex:1, height:Math.abs(v)+'px', background:v>0?'#22c55e':'#ef4444', borderRadius:2, alignSelf:v>0?'flex-end':'flex-start' }} />)}
                    </div>
                  </>) : active === 'commerce' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Taux de conversion</div>
                    <svg viewBox="0 0 100 35" style={{ width:'100%' }}>
                      <rect x="5" y="2" width="90" height="6" rx="3" fill="#195C82" opacity=".8" />
                      <rect x="15" y="10" width="70" height="6" rx="3" fill="#195C82" opacity=".6" />
                      <rect x="25" y="18" width="50" height="6" rx="3" fill="#195C82" opacity=".4" />
                      <rect x="35" y="26" width="30" height="6" rx="3" fill="#22c55e" opacity=".8" />
                    </svg>
                  </>) : active === 'banque' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Flux entrant/sortant</div>
                    <svg viewBox="0 0 100 35" style={{ width:'100%' }}>
                      <path d="M0,20 25,12 50,18 75,8 100,15" fill="none" stroke="#22c55e" strokeWidth="2" />
                      <path d="M0,25 25,28 50,22 75,30 100,26" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
                    </svg>
                  </>) : active === 'calendrier' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Charge par jour</div>
                    <div style={{ display: 'flex', gap: 2, height: 35 }}>
                      {[8,6,9,4,7].map((h,i) => <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:1 }}>
                        <div style={{ height:h*3, background:h>7?'#ef4444':h>5?'#f59e0b':'#22c55e', borderRadius:2 }} />
                        <div style={{ fontSize:'.3rem', textAlign:'center', color:'#94a3b8' }}>{['L','M','Me','J','V'][i]}</div>
                      </div>)}
                    </div>
                  </>) : active === 'projet' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Avancement</div>
                    {[85,62,45].map((p,i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                      <div style={{ flex:1, height:5, background:'#f1f5f9', borderRadius:3 }}><div style={{ width:p+'%', height:'100%', background:p>70?'#22c55e':p>50?'#f59e0b':'#ef4444', borderRadius:3 }} /></div>
                      <span style={{ fontSize:'.38rem', color:'#64748b', width:18 }}>{p}%</span>
                    </div>)}
                  </>) : active === 'mail' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Volume par jour</div>
                    <svg viewBox="0 0 100 35" style={{ width:'100%' }}>
                      {[12,18,8,22,15,10,20].map((v,i) => <rect key={i} x={i*14+1} y={35-v} width="11" height={v} fill="#195C82" rx="2" opacity={.5+i*.07} />)}
                    </svg>
                  </>) : (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Requêtes API</div>
                    <svg viewBox="0 0 100 35" style={{ width:'100%' }}>
                      <polyline points="0,28 15,20 30,24 45,12 60,18 75,8 100,14" fill="none" stroke="#22c55e" strokeWidth="1.5" />
                    </svg>
                  </>)}
                </div>
                {/* Mini graph 2 */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px' }}>
                  {active === 'dashboard' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Répartition CA</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}><circle cx="40" cy="22" r="14" fill="none" stroke="#195C82" strokeWidth="4" strokeDasharray="35 53" /><circle cx="40" cy="22" r="14" fill="none" stroke="#2d8ab8" strokeWidth="4" strokeDasharray="22 66" strokeDashoffset="-35" /><circle cx="40" cy="22" r="14" fill="none" stroke="#94c5e3" strokeWidth="4" strokeDasharray="18 70" strokeDashoffset="-57" /><text x="40" y="24" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0f172a">72k</text></svg>
                  </>) : active === 'equipe' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Par département</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}><circle cx="40" cy="22" r="14" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="30 58" /><circle cx="40" cy="22" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="25 63" strokeDashoffset="-30" /><circle cx="40" cy="22" r="14" fill="none" stroke="#195C82" strokeWidth="4" strokeDasharray="20 68" strokeDashoffset="-55" /><text x="40" y="24" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0f172a">45</text></svg>
                  </>) : active === 'finance' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Postes de charges</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}><circle cx="40" cy="22" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="28 60" /><circle cx="40" cy="22" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="22 66" strokeDashoffset="-28" /><circle cx="40" cy="22" r="14" fill="none" stroke="#195C82" strokeWidth="4" strokeDasharray="25 63" strokeDashoffset="-50" /><text x="40" y="24" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0f172a">156k</text></svg>
                  </>) : active === 'commerce' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sources de leads</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32 }}>
                      {[{h:90,c:'#195C82'},{h:65,c:'#2d8ab8'},{h:45,c:'#f59e0b'},{h:30,c:'#22c55e'}].map((b,i) => <div key={i} style={{ flex:1, height:b.h+'%', background:b.c, borderRadius:2 }} />)}
                    </div>
                  </>) : active === 'banque' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Par catégorie</div>
                    {[{n:'Salaires',p:45},{n:'Fournisseurs',p:30},{n:'Charges',p:25}].map((c,i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                      <span style={{ fontSize:'.35rem', color:'#64748b', width:35 }}>{c.n}</span>
                      <div style={{ flex:1, height:4, background:'#f1f5f9', borderRadius:2 }}><div style={{ width:c.p+'%', height:'100%', background:['#195C82','#f59e0b','#ef4444'][i], borderRadius:2 }} /></div>
                    </div>)}
                  </>) : active === 'calendrier' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Types événements</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}><circle cx="40" cy="22" r="14" fill="none" stroke="#195C82" strokeWidth="4" strokeDasharray="38 50" /><circle cx="40" cy="22" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="20 68" strokeDashoffset="-38" /><circle cx="40" cy="22" r="14" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="15 73" strokeDashoffset="-58" /><text x="40" y="24" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0f172a">24</text></svg>
                  </>) : active === 'projet' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Budget consommé</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}>
                      <rect x="5" y="5" width="70" height="12" rx="6" fill="#f1f5f9" />
                      <rect x="5" y="5" width="48" height="12" rx="6" fill="#195C82" />
                      <text x="40" y="13" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">68%</text>
                      <rect x="5" y="22" width="70" height="12" rx="6" fill="#f1f5f9" />
                      <rect x="5" y="22" width="55" height="12" rx="6" fill="#f59e0b" />
                      <text x="40" y="30" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">78%</text>
                    </svg>
                  </>) : active === 'mail' ? (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Taux d'ouverture</div>
                    <svg viewBox="0 0 80 40" style={{ width:'100%' }}>
                      <circle cx="40" cy="22" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="40" cy="22" r="16" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="75 25" strokeDashoffset="25" strokeLinecap="round" />
                      <text x="40" y="24" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0f172a">74%</text>
                    </svg>
                  </>) : (<>
                    <div style={{ fontSize: '.45rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Rôles actifs</div>
                    {[{n:'Admin',v:2,c:'#ef4444'},{n:'Manager',v:3,c:'#f59e0b'},{n:'Collab',v:4,c:'#22c55e'}].map((r,i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:r.c }} />
                      <span style={{ fontSize:'.38rem', color:'#64748b', flex:1 }}>{r.n}</span>
                      <span style={{ fontSize:'.38rem', fontWeight:700, color:'#0f172a' }}>{r.v}</span>
                    </div>)}
                  </>)}
                </div>
              </div>
              {/* 2 widgets — unique per tab */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px' }}>
                  <div style={{ fontSize: '.48rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    {active === 'dashboard' ? 'Activité récente' : active === 'equipe' ? 'Anniversaires ce mois' : active === 'finance' ? 'Factures en retard' : active === 'commerce' ? 'Deals à closer' : active === 'banque' ? 'Derniers mouvements' : active === 'calendrier' ? 'Prochains événements' : active === 'projet' ? 'Livrables cette semaine' : active === 'mail' ? 'Emails prioritaires' : 'Dernières connexions'}
                  </div>
                  {(active === 'dashboard' ? [
                    { text: 'Facture #1247 envoyée', val: 'Il y a 5 min', dot: '#22c55e' },
                    { text: 'Nouveau lead qualifié', val: 'Il y a 12 min', dot: '#195C82' },
                    { text: 'Paiement reçu 4 200€', val: 'Il y a 1h', dot: '#22c55e' },
                  ] : active === 'equipe' ? [
                    { text: 'Sophie Martin', val: '12 mars', dot: '#f59e0b' },
                    { text: 'Thomas Dupont', val: '18 mars', dot: '#f59e0b' },
                    { text: 'Julie Leroy', val: '25 mars', dot: '#f59e0b' },
                  ] : active === 'finance' ? [
                    { text: 'Facture #1102 — Client A', val: '2 450 €', dot: '#ef4444' },
                    { text: 'Facture #1087 — Client D', val: '1 800 €', dot: '#ef4444' },
                    { text: 'Facture #1054 — Client F', val: '3 200 €', dot: '#f59e0b' },
                  ] : active === 'commerce' ? [
                    { text: 'Projet ERP — Dupont SA', val: '45 000 €', dot: '#22c55e' },
                    { text: 'Licence SaaS — Moreau', val: '12 000 €', dot: '#f59e0b' },
                    { text: 'Consulting — Petit & Co', val: '8 500 €', dot: '#195C82' },
                  ] : active === 'banque' ? [
                    { text: 'Virement reçu — Client B', val: '+3 200 €', dot: '#22c55e' },
                    { text: 'Prélèvement EDF', val: '-842 €', dot: '#ef4444' },
                    { text: 'CB Fournitures', val: '-156 €', dot: '#ef4444' },
                  ] : active === 'calendrier' ? [
                    { text: 'Sprint review — 14h', val: 'Aujourd\'hui', dot: '#195C82' },
                    { text: 'Demo client Acme', val: 'Demain 10h', dot: '#f59e0b' },
                    { text: 'Formation React', val: 'Vendredi 9h', dot: '#22c55e' },
                  ] : active === 'projet' ? [
                    { text: 'Maquettes v2 — Refonte site', val: 'Mar', dot: '#195C82' },
                    { text: 'API endpoints — App mobile', val: 'Mer', dot: '#22c55e' },
                    { text: 'Tests intégration — ERP', val: 'Ven', dot: '#f59e0b' },
                  ] : active === 'mail' ? [
                    { text: 'Urgent : Contrat à signer', val: 'Client A', dot: '#ef4444' },
                    { text: 'Devis à valider #547', val: 'Fournisseur', dot: '#f59e0b' },
                    { text: 'Relance impayé mars', val: 'Compta', dot: '#ef4444' },
                  ] : [
                    { text: 'Nicolas R.', val: 'Il y a 2 min', dot: '#22c55e' },
                    { text: 'Sophie M.', val: 'Il y a 1h', dot: '#22c55e' },
                    { text: 'Thomas D.', val: 'Hier 18h04', dot: '#94a3b8' },
                  ]).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: a.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: '.42rem', color: '#0f172a', flex: 1 }}>{a.text}</span>
                      <span style={{ fontSize: '.38rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{a.val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px' }}>
                  <div style={{ fontSize: '.48rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    {active === 'dashboard' ? 'Alertes IA' : active === 'equipe' ? 'Formations en cours' : active === 'finance' ? 'Échéances à venir' : active === 'commerce' ? 'Relances prévues' : active === 'banque' ? 'Rapprochements à faire' : active === 'calendrier' ? 'Disponibilité équipe' : active === 'projet' ? 'Risques identifiés' : active === 'mail' ? 'Réponses en attente' : 'Tokens API'}
                  </div>
                  {(active === 'dashboard' ? [
                    { text: '3 factures en retard > 30j', val: '#ef4444' },
                    { text: 'Budget projet X dépassé de 12%', val: '#f59e0b' },
                    { text: 'Taux occupation Martin < 60%', val: '#f59e0b' },
                  ] : active === 'equipe' ? [
                    { text: 'React avancé — T. Dupont', val: '#195C82' },
                    { text: 'Management 3.0 — S. Martin', val: '#22c55e' },
                    { text: 'Cybersécurité — J. Leroy', val: '#f59e0b' },
                  ] : active === 'finance' ? [
                    { text: 'TVA trimestrielle — 15 avr.', val: '#ef4444' },
                    { text: 'Clôture mensuelle — 5 avr.', val: '#f59e0b' },
                    { text: 'Déclaration IS — 30 avr.', val: '#195C82' },
                  ] : active === 'commerce' ? [
                    { text: 'Relance devis #412 — Dupont', val: '#ef4444' },
                    { text: 'Suivi demo — Moreau SA', val: '#f59e0b' },
                    { text: 'Appel découverte — Petit', val: '#195C82' },
                  ] : active === 'banque' ? [
                    { text: 'CB #4521 — non rapprochée', val: '#ef4444' },
                    { text: 'Virement #1087 — en attente', val: '#f59e0b' },
                    { text: 'Prélèvement #892 — à valider', val: '#f59e0b' },
                  ] : active === 'calendrier' ? [
                    { text: 'Nicolas R.', val: '85%' },
                    { text: 'Sophie M.', val: '72%' },
                    { text: 'Thomas D.', val: '60%' },
                  ] : active === 'projet' ? [
                    { text: 'Retard migration ERP — 3j', val: '#ef4444' },
                    { text: 'Budget App mobile — 92%', val: '#f59e0b' },
                    { text: 'Dépendance API tierce', val: '#f59e0b' },
                  ] : active === 'mail' ? [
                    { text: 'Re: Proposition commerciale', val: 'J+3' },
                    { text: 'Re: Demande de devis', val: 'J+2' },
                    { text: 'Re: Support technique', val: 'J+1' },
                  ] : [
                    { text: 'Sage API', val: '#22c55e' },
                    { text: 'Stripe Webhook', val: '#22c55e' },
                    { text: 'HubSpot OAuth', val: '#f59e0b' },
                  ]).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active === 'calendrier' || active === 'mail' ? '#195C82' : a.val, flexShrink: 0 }} />
                      <span style={{ fontSize: '.42rem', color: '#0f172a', flex: 1 }}>{a.text}</span>
                      {(active === 'calendrier' || active === 'mail') && <span style={{ fontSize: '.38rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{a.val}</span>}
                    </div>
                  ))}
                </div>
              </div>
              {/* Keep old fallback hidden */}
              {false && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: 'rgba(25,92,130,.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                      }}>
                        {t.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: `${100 - i * 14}%` }} />
                      </div>
                      <div style={{
                        width: 36, height: 5,
                        background: i <= 2 ? '#195C82' : '#e2e8f0',
                        borderRadius: 3, opacity: i <= 2 ? 0.8 : 0.4,
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat panel — inside the mockup on the right */}
          <div style={{
            width: 250, background: '#0f172a', display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            {/* Chat header */}
            <div style={{
              padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, background: '#195C82',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 800,
              }}>TB</div>
              <span style={{ color: '#fff', fontSize: '.72rem', fontWeight: 700 }}>TimeBlast AI</span>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              </div>
            </div>

            {/* Chat messages — changes per tab */}
            <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
              {/* User message 1 */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '90%' }}>
                <div style={{ background: '#195C82', color: '#fff', padding: '5px 8px', borderRadius: '10px 10px 3px 10px', fontSize: '.55rem', lineHeight: 1.4 }}>
                  {t.chat.user}
                </div>
              </div>
              {/* AI response 1 */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', padding: '5px 8px', borderRadius: '10px 10px 10px 3px', fontSize: '.55rem', lineHeight: 1.4, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {t.chat.ai.map((line, i) => (
                    <div key={i} style={{ color: '#22c55e', marginBottom: i < t.chat.ai.length - 1 ? 1 : 0 }}>{line}</div>
                  ))}
                </div>
              </div>
              {/* User message 2 */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '90%' }}>
                <div style={{ background: '#195C82', color: '#fff', padding: '5px 8px', borderRadius: '10px 10px 3px 10px', fontSize: '.55rem', lineHeight: 1.4 }}>
                  {active === 'dashboard' ? 'Ajoute un suivi trésorerie' : active === 'equipe' ? 'Et le trombinoscope ?' : active === 'finance' ? 'Ajoute le prévisionnel' : active === 'commerce' ? 'Et les devis ?' : active === 'banque' ? 'Ajoute les virements SEPA' : active === 'calendrier' ? 'Synchronise avec Outlook' : active === 'projet' ? 'Ajoute le suivi budgétaire' : active === 'mail' ? 'Ajoute les templates' : 'Ajoute un connecteur Stripe'}
                </div>
              </div>
              {/* AI response 2 */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', padding: '5px 8px', borderRadius: '10px 10px 10px 3px', fontSize: '.55rem', lineHeight: 1.4, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(active === 'dashboard' ? ['✓ Widget trésorerie ajouté', '✓ Prévisionnel J+30/60/90'] : active === 'equipe' ? ['✓ Trombinoscope ajouté', '✓ Organigramme interactif'] : active === 'finance' ? ['✓ Prévisionnel J+30/60/90', '✓ Alertes seuils auto'] : active === 'commerce' ? ['✓ Module devis ajouté', '✓ Conversion devis → facture'] : active === 'banque' ? ['✓ Virements SEPA', '✓ Prélèvements auto'] : active === 'calendrier' ? ['✓ Sync Outlook bidirectionnelle', '✓ Invitations auto'] : active === 'projet' ? ['✓ Budget par projet', '✓ Alertes dépassement'] : active === 'mail' ? ['✓ Templates email', '✓ Suivi ouvertures'] : ['✓ Connecteur Stripe configuré', '✓ Webhook activé']).map((line, i) => (
                    <div key={i} style={{ color: '#22c55e', marginBottom: 1 }}>{line}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat input */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '.65rem' }}>Décrivez votre besoin...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab buttons BELOW the mockup */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
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
              Comment ça marche
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
            <a href="/pricing" style={{ color: S.gray, textDecoration: 'none', transition: 'color .2s', fontWeight: 600 }}
              onMouseEnter={e => e.target.style.color = S.dark} onMouseLeave={e => e.target.style.color = S.gray}>
              Tarifs
            </a>
            <a href="/facture-electronique" style={{
              background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', textDecoration: 'none', fontWeight: 700,
            }}>
              E-Facture 2026
            </a>
          </div>

          <button className="landing-burger" onClick={() => setMobileMenu(true)}>☰</button>

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
        <button className="landing-mobile-close" onClick={() => setMobileMenu(false)}>✕</button>
        <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 40, marginBottom: '1rem' }} />
        <a href="#comment" onClick={() => setMobileMenu(false)}>Comment ça marche</a>
        <a href="#modules" onClick={() => setMobileMenu(false)}>Modules</a>
        <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer">Groupe SRA</a>
        <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
        <a href="/pricing" style={{ color: '#195C82', fontWeight: 600 }}>Tarifs</a>
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
            Propulsé par 40 ans d'expertise SRA →
          </a>

        </div>

        {/* Hero grid : texte gauche + animation droite */}
        <div className="landing-hero-grid" style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 2rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, lineHeight: 1.2,
              color: S.dark, margin: '0 0 1.25rem', letterSpacing: '-0.02em',
            }}>
              <span style={{ display: 'block' }}>Créez en un seul prompt</span>
              <span style={{ display: 'block', minHeight: '7rem', overflow: 'hidden' }}>votre <RotatingText /></span>
            </h1>

            <p style={{
              fontSize: '1.1rem', color: S.gray, lineHeight: 1.65, margin: '0 0 2rem', maxWidth: 520,
            }}>
              Décrivez votre besoin, nos équipes le développent. Créez votre logiciel métier sur mesure ou confiez-le à nos experts.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#contact" className="landing-btn-primary" style={{ textDecoration: 'none' }}>
                Démarrer mon projet →
              </a>
              <a href="#contact" className="landing-btn-secondary">
                Nous contacter →
              </a>
            </div>
          </div>

          <div>
            <BiHubVisual />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. STATS BAR + INTERACTIVE MOCKUP
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#195C82', padding: '3rem 2rem 3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', maxWidth: 1060, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '.2rem' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: '#fff', padding: '2rem 2rem 5rem', position: 'relative' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <InteractiveMockup />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. NATIVEMENT CONNECTE — BiHubVisual + connectors
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: S.bgAlt }} id="connecteurs">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div>
            <p style={{
              fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: '#195C82', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', marginBottom: '.75rem',
            }}>Nativement connecté</p>
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
              Votre application se connecte nativement à tous les outils de votre SI.
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
            Comment ça marche
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 500,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            5 étapes pour passer de l'idée à l'outil en production
          </p>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', overflowX: 'auto', padding: '0 0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 900 }}>
            {[
              { num: '1', icon: '🔌', title: 'Connexion', desc: 'Vos outils ERP, CRM, compta, paie' },
              { num: '2', icon: '💬', title: 'Expression', desc: 'Décrivez votre besoin en français' },
              { num: '3', icon: '🤖', title: 'Génération', desc: 'L\'IA crée votre application' },
              { num: '4', icon: '📐', title: 'Validation', desc: 'Personnalisez design et structure' },
              { num: '5', icon: '🚀', title: 'Production', desc: 'Déploiement sur votre domaine' },
              { num: '6', icon: '🛡️', title: 'Support', desc: 'Évolutions et monitoring continu' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                {/* Card étape */}
                <div style={{
                  flex: 1, textAlign: 'center', padding: '1.5rem 1rem', borderRadius: 16,
                  border: '1px solid rgba(25,92,130,0.1)', background: '#fff',
                  transition: 'all .3s', cursor: 'default',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(25,92,130,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', margin: '0 auto .6rem',
                    background: '#195C82', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(25,92,130,0.3)',
                  }}>{step.num}</div>
                  <div style={{ fontSize: 22, marginBottom: '.4rem' }}>{step.icon}</div>
                  <h4 style={{ margin: '0 0 .35rem', fontSize: '.88rem', fontWeight: 700, color: S.dark }}>{step.title}</h4>
                  <p style={{ margin: 0, fontSize: '.78rem', color: S.gray, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
                {/* Flèche de connexion */}
                {i < 5 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '0 4px', marginTop: 44,
                    color: '#195C82', fontSize: '1.2rem', fontWeight: 700, opacity: .4,
                    flexShrink: 0,
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
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
            Des modules prêts à l'emploi
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 550,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            Chaque module est pré-construit et personnalisable. L'IA les adapte à votre métier.
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
            Depuis 1986, le Groupe SRA accompagne les PME et ETI dans leur transformation digitale. Cette expertise de terrain nous a permis de concevoir TimeBlast : la plateforme de vibe-coding parfaite pour créer des applications métier avec l'IA.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Encart Groupe SRA */}
            <a href="https://www.groupe-sra.fr" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                background: '#fff', border: '1px solid rgba(25,92,130,0.1)', borderRadius: 16,
                padding: '2rem 2rem', textDecoration: 'none', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none' }}>
              <img src="/logo-sra.png" alt="Groupe SRA" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'contain', marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: S.sra }}>Groupe SRA</div>
              <div style={{ fontSize: '.85rem', color: S.gray, marginTop: 4 }}>Partenaire digital des PME et ETI</div>
              <div style={{ fontSize: '.82rem', color: S.gray, marginTop: '.75rem', lineHeight: 1.6 }}>
                Intégrateur Sage Diamond, Microsoft, HubSpot. Depuis 1986, le Groupe SRA accompagne les entreprises dans leur transformation digitale.
              </div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginTop: '.75rem', color: '#195C82' }}>
                Découvrir le groupe →
              </div>
            </a>

            {/* Encart Jean-Luc Marini */}
            <a href="https://www.linkedin.com/in/jean-luc-marini-82319710/" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                background: '#fff', border: '1px solid rgba(25,92,130,0.1)', borderRadius: 16,
                padding: '2rem 2rem', textDecoration: 'none', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #e2e8f0', marginBottom: '1rem' }}>
                <img src="/team/jean-luc-marigny.jpg" alt="Jean-Luc Marini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: S.dark }}>Jean-Luc Marini</div>
              <div style={{ fontSize: '.85rem', color: '#195C82', fontWeight: 600, marginTop: 4 }}>Conseiller stratégique IA & Innovation</div>
              <div style={{ fontSize: '.82rem', color: S.gray, marginTop: '.75rem', lineHeight: 1.6 }}>
                36 ans d'expérience IT. Membre du Conseil scientifique du Commandement du combat futur. Réserviste citoyen IHEDN.
              </div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginTop: '.75rem', color: '#195C82' }}>
                Voir le profil LinkedIn →
              </div>
            </a>
          </div>
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
          }}>Deux façons de commencer</p>
          <h2 style={{
            fontSize: 'clamp(1.7rem, 2.8vw, 2.4rem)', fontWeight: 800, color: S.dark,
            margin: '0 0 .75rem', letterSpacing: '-0.02em',
          }}>
            Choisissez votre approche
          </h2>
          <p style={{
            fontSize: '1.05rem', color: S.gray, maxWidth: 600,
            margin: '0 auto', lineHeight: 1.65,
          }}>
            Développez votre application vous-même ou confiez-la à nos experts.
          </p>
        </div>

        {/* ── Deux options côte à côte ── */}
        <div className="landing-contact-wrapper" style={{
          maxWidth: 920, margin: '2rem auto 0', display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'stretch',
        }}>
          {/* Option 1 — Self-service */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', textAlign: 'center',
            border: '2px solid rgba(25,92,130,0.1)', transition: 'all .3s',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.1)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
            <h3 style={{ margin: '0 0 .5rem', fontSize: '1.2rem', fontWeight: 700, color: S.dark }}>Je crée mon application</h3>
            <p style={{ fontSize: '.88rem', color: S.gray, lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
              Accédez à la plateforme TimeBlast et développez votre logiciel métier en un prompt. Autonome, rapide, sans code.
            </p>
            <button onClick={() => setShowLogin(true)} style={{
              padding: '14px 32px', borderRadius: 12, background: '#195C82', color: '#fff',
              fontWeight: 700, fontSize: '.95rem', border: 'none', cursor: 'pointer', width: '100%',
              boxShadow: '0 4px 20px rgba(25,92,130,0.3)', transition: 'all .25s',
            }}
            onMouseEnter={e => { e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.4)' }}
            onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)' }}>
              S'inscrire / Se connecter →
            </button>
          </div>

          {/* Option 2 — Accompagnement SRA */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', textAlign: 'center',
            border: '2px solid rgba(25,92,130,0.1)', transition: 'all .3s',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#195C82'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(25,92,130,0.1)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,92,130,0.1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏢</div>
            <h3 style={{ margin: '0 0 .5rem', fontSize: '1.2rem', fontWeight: 700, color: S.dark }}>L'équipe SRA s'en charge</h3>
            <p style={{ fontSize: '.88rem', color: S.gray, lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
              Confiez le développement et la maintenance de votre plateforme IA à nos experts. Accompagnement sur mesure.
            </p>
            <a href="#contact-form" style={{
              padding: '14px 32px', borderRadius: 12, background: 'transparent',
              border: '2px solid #195C82', color: '#195C82',
              fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', width: '100%',
              textDecoration: 'none', display: 'block', textAlign: 'center', transition: 'all .25s',
              boxSizing: 'border-box',
            }}>
              Nous contacter →
            </a>
          </div>
        </div>

        {/* ── Formulaire de contact ── */}
        <div id="contact-form" style={{ maxWidth: 700, margin: '3rem auto 0' }}>
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
                }}>✓</div>
                <h3 style={{ margin: '0 0 .5rem', color: S.dark, fontSize: '1.2rem' }}>Demande envoyée !</h3>
                <p style={{ color: S.gray, fontSize: '.9rem' }}>Nous préparons votre diagnostic et revenons vers vous très vite.</p>
              </div>
            ) : (
              <>
                <div className="landing-contact-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
                <div className="landing-contact-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Entreprise</label>
                    <input type="text" placeholder="Mon Entreprise SAS"
                      value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Téléphone</label>
                    <input type="tel" placeholder="06 XX XX XX XX"
                      value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: S.dark, marginBottom: 6 }}>Votre besoin *</label>
                  <textarea required rows={4} placeholder="Décrivez le logiciel dont vous avez besoin..."
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
                  Demander mon diagnostic gratuit →
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
            Prêt à créer votre application ?
          </h2>
          <p style={{
            fontSize: '1.1rem', color: 'rgba(255,255,255,0.75)', maxWidth: 520,
            margin: '0 auto 2.5rem', lineHeight: 1.65,
          }}>
            Créez votre logiciel de gestion sur mesure sans écrire une ligne de code.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#contact" style={{
              padding: '15px 36px', borderRadius: 12, background: '#fff',
              color: S.sra, border: 'none', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'all .25s', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}
            onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)' }}>
              Démarrer mon projet →
            </a>
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
            &copy; {new Date().getFullYear()} TimeBlast.ai — Vibe-coding pour logiciels de gestion
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
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
              ✕
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
                Accédez à votre espace décisionnel
              </p>
            </div>

            {/* Recent accounts */}
            {recentAccounts.length > 0 && !email && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '.75rem', color: S.gray, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comptes récents</div>
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
                      <span style={{ fontSize: 14, color: S.lightGray }}>→</span>
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
                  placeholder="••••••••"
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
