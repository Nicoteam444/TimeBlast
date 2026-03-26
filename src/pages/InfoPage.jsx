import { useState, useEffect, useRef, useLayoutEffect } from 'react'

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET 1 — HISTOIRE
// ══════════════════════════════════════════════════════════════════════════════

const STATS = [
  { value: '6', label: 'Jours de dev', icon: '⚡' },
  { value: '221', label: 'Commits', icon: '📦' },
  { value: '76', label: 'Pages', icon: '📄' },
  { value: '25', label: 'Tables BD', icon: '🗄️' },
  { value: '252 Mo', label: 'Taille projet', icon: '💾' },
]

const TIMELINE = [
  {
    date: '21 mars 2026', day: 'Jour 1', title: 'La genese', color: '#2B4C7E', icon: '🌱',
    summary: 'Creation du projet et des fondations',
    details: [
      'Initialisation du projet et architecture technique',
      'Page de connexion et authentification',
      'Structure de base : Dashboard, Sidebar, Layout',
      'Premiers modules CRM : Contacts, Entreprises, Leads',
      'Systeme de routing et navigation',
      'Configuration base de donnees et securite',
    ]
  },
  {
    date: '22 mars 2026', day: 'Jour 2', title: "L'acceleration", color: '#16a34a', icon: '🚀',
    summary: '12 modules deployes en une seule journee',
    details: [
      'Module Facturation complet (Ventes + Achats) avec previsualisation A4',
      'Module Equipe : Collaborateurs, Absences, Notes de frais, Competences',
      'Trombinoscope et Organigramme interactif',
      'Gestion de Projet avec Kanban drag and drop',
      'Module Commerce : Clients, Transactions, Devis, Produits, Stock, Abonnements',
      'Systeme de favoris persistants en base de donnees',
      'Module Finance : Comptabilite, FEC, Previsionnel, Immobilisations',
      'Tri par colonnes sur tous les tableaux',
    ]
  },
  {
    date: '23 mars 2026', day: 'Jour 3', title: "L'intelligence", color: '#7c3aed', icon: '🧠',
    summary: 'Automatisation et modules avances',
    details: [
      'Page E-Facture (reforme 2026) avec distribution multi-canal',
      'Portail client public pour factures (lien securise sans login)',
      'Export XML UBL (norme Chorus Pro)',
      'Calendrier collaboratif temps reel avec selection d\'equipe',
      'Quick Add : creer Contact, Projet, Tache en 2 clics',
      'Module Documents avec OCR et archivage intelligent',
      'Module Marketing (Campagnes)',
      'Module Automatisation (Workflows visuels)',
    ]
  },
  {
    date: '24 mars 2026', day: 'Jour 4', title: 'La collaboration', color: '#ea580c', icon: '🤝',
    summary: 'Widgets collaboratifs et experience utilisateur',
    details: [
      'Dashboard refonte complete : 12 widgets personnalisables',
      'Score de sante entreprise',
      'Classement d\'utilisation de la plateforme',
      'Widget Humeur d\'equipe avec emojis',
      'Widget "En ligne maintenant" (presence temps reel)',
      'Widget Fil d\'equipe avec reactions',
      'Conseils du jour avec checklist',
      'Barre de recherche universelle (Cmd+K)',
      'Mini calendrier selecteur de date',
      'Widgets repositionnables par drag and drop',
    ]
  },
  {
    date: '25-26 mars 2026', day: 'Jour 5', title: 'Securite et Deploiement', color: '#dc2626', icon: '🔒',
    summary: 'Production-ready en 48h',
    details: [
      'Audit securite complet (isolation donnees par utilisateur et societe)',
      'Optimisation des performances sur toutes les pages',
      'Harmonisation visuelle sur 57 pages',
      'Gestion des droits par role (Super Admin / Admin / Manager / Collaborateur)',
      'Historique de navigation par utilisateur',
      'Connexion Microsoft SSO (Azure AD)',
      'Environnement de production isole',
      'Didacticiel d\'onboarding au premier login',
      'Landing page avec schema connecteurs',
      'Schema flux metier interactif',
      'Formulaire de contact avec stockage en base',
    ]
  },
]

function HistoryTab() {
  const [expanded, setExpanded] = useState(new Set([0]))
  const refs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)' }
      })
    }, { threshold: 0.15 })
    refs.current.forEach(r => r && observer.observe(r))
    return () => observer.disconnect()
  }, [])

  function toggle(i) {
    setExpanded(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', minWidth: 120, transition: 'transform .2s'}}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2B4C7E' }}>{s.value}</div>
            <div style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto', padding: '2rem 0 2rem 40px' }}>
        <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #2B4C7E, #16a34a, #7c3aed, #ea580c, #dc2626)', borderRadius: 2 }} />
        {TIMELINE.map((entry, i) => (
          <div key={i} ref={el => refs.current[i] = el}
            style={{ position: 'relative', marginBottom: 32, paddingLeft: 32, opacity: 0, transform: 'translateY(30px)', transition: `opacity .6s ease ${i * 0.15}s, transform .6s ease ${i * 0.15}s` }}>
            <div style={{ position: 'absolute', left: -12, top: 4, width: 24, height: 24, borderRadius: '50%', background: entry.color, border: '3px solid #fff', boxShadow: `0 0 0 3px ${entry.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{entry.icon}</div>
            <div onClick={() => toggle(i)} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: expanded.has(i) ? `2px solid ${entry.color}` : '2px solid transparent', cursor: 'pointer', transition: 'all .3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#fff', background: entry.color, padding: '2px 8px', borderRadius: 4 }}>{entry.day}</span>
                    <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>{entry.date}</span>
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{entry.title}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>{entry.summary}</p>
                </div>
                <span style={{ fontSize: '1.2rem', transform: expanded.has(i) ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .3s', color: '#94a3b8' }}>▼</span>
              </div>
              {expanded.has(i) && (
                <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  {entry.details.map((d, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', fontSize: '.85rem', color: '#475569', opacity: 0, animation: `fadeSlideIn .3s ease ${j * 0.05}s forwards` }}>
                      <span style={{ color: entry.color, fontWeight: 700 }}>✓</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET 2 — ROADMAP
// ══════════════════════════════════════════════════════════════════════════════

const PHASES = [
  {
    title: 'Phase 1 — Fondations', icon: '🏗️', color: '#16a34a',
    items: [
      { s: 'done', t: 'Authentification et profils utilisateurs' },
      { s: 'done', t: 'Dashboard personnalisable' },
      { s: 'wip', t: 'CRM (Contacts, Entreprises, Leads)' },
      { s: 'wip', t: 'Facturation (Ventes et Achats)' },
      { s: 'wip', t: 'Gestion de projet et Kanban' },
      { s: 'wip', t: 'Calendrier collaboratif' },
      { s: 'todo', t: 'Gestion d\'equipe complete (RH, Absences, Competences)' },
      { s: 'todo', t: 'Module Finance (Comptabilite, FEC, Previsionnel)' },
      { s: 'todo', t: 'Documents et Archives avec OCR' },
      { s: 'todo', t: 'Recherche universelle' },
    ]
  },
  {
    title: 'Phase 2 — Collaboration', icon: '🤝', color: '#2B4C7E',
    items: [
      { s: 'wip', t: 'Widgets collaboratifs (Humeur, Presence, Fil d\'equipe)' },
      { s: 'todo', t: 'Score de sante entreprise' },
      { s: 'todo', t: 'Classement d\'utilisation' },
      { s: 'todo', t: 'Conseils du jour' },
      { s: 'todo', t: 'Assistant contextuel' },
      { s: 'todo', t: 'Automatisation workflows' },
      { s: 'todo', t: 'Alertes intelligentes (retards paiement, depassement budget)' },
      { s: 'todo', t: 'Rapprochement bancaire automatise' },
      { s: 'todo', t: 'Actions rapides depuis le chatbot' },
      { s: 'todo', t: 'Suggestions proactives' },
    ]
  },
  {
    title: 'Phase 3 — Connecteurs et Integrations', icon: '🔗', color: '#7c3aed',
    items: [
      { s: 'done', t: 'Connexion Microsoft SSO (Azure AD)' },
      { s: 'wip', t: 'Architecture connecteurs' },
      { s: 'wip', t: 'Calendrier Outlook synchronise' },
      { s: 'todo', t: 'Import/Sync Sage et Pennylane' },
      { s: 'todo', t: 'Sync HubSpot et Salesforce (CRM bidirectionnel)' },
      { s: 'todo', t: 'Connexion bancaire temps reel' },
      { s: 'todo', t: 'Sync Google Workspace' },
      { s: 'todo', t: 'API Chorus Pro (facture electronique)' },
      { s: 'todo', t: 'Webhooks et API publique' },
    ]
  },
  {
    title: 'Phase 4 — Multi-tenant et Scalabilite', icon: '🏢', color: '#ea580c',
    items: [
      { s: 'wip', t: 'Multi-societes avec selecteur' },
      { s: 'todo', t: 'Gestion des droits par role' },
      { s: 'todo', t: 'Portail Super Admin multi-environnement' },
      { s: 'todo', t: 'Deploiement client en 1 clic' },
      { s: 'todo', t: 'White-label (personnalisation logo/couleurs par client)' },
      { s: 'todo', t: 'Facturation SaaS (abonnements)' },
      { s: 'todo', t: 'Marketplace d\'extensions' },
    ]
  },
  {
    title: 'Phase 5 — Mobile et Performance', icon: '📱', color: '#0891b2',
    items: [
      { s: 'wip', t: 'Optimisation des performances' },
      { s: 'todo', t: 'PWA (Progressive Web App)' },
      { s: 'todo', t: 'Application mobile' },
      { s: 'todo', t: 'Mode hors ligne' },
      { s: 'todo', t: 'Notifications push' },
      { s: 'todo', t: 'Responsive design complet' },
    ]
  },
  {
    title: 'Phase 6 — Automatisation avancee', icon: '🧠', color: '#dc2626',
    items: [
      { s: 'todo', t: 'Agents autonomes (relance client, validation frais, alertes tresorerie)' },
      { s: 'todo', t: 'Generation automatique de rapports' },
      { s: 'todo', t: 'Prediction de tresorerie' },
      { s: 'todo', t: 'Scoring leads automatique' },
      { s: 'todo', t: 'Analyse des echanges clients' },
      { s: 'todo', t: 'Tableaux de bord predictifs' },
    ]
  },
]

const STATUS = {
  done: { icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  wip: { icon: '🔄', color: '#2B4C7E', bg: '#eff6ff' },
  todo: { icon: '⬜', color: '#94a3b8', bg: '#f8fafc' }}

function getPhaseProgress(phase) {
  const total = phase.items.length
  const done = phase.items.filter(i => i.s === 'done').length
  const wip = phase.items.filter(i => i.s === 'wip').length
  return Math.round(((done + wip * 0.5) / total) * 100)
}

function RoadmapTab() {
  const [expandedPhase, setExpandedPhase] = useState(new Set([0, 1]))
  const allItems = PHASES.flatMap(p => p.items)
  const doneItems = allItems.filter(i => i.s === 'done').length
  const wipItems = allItems.filter(i => i.s === 'wip').length
  const overall = Math.round(((doneItems + wipItems * 0.5) / allItems.length) * 100)

  function togglePhase(i) {
    setExpandedPhase(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  return (
    <>
      {/* Overall */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.5rem', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: '#475569' }}>Progression globale</span>
          <span style={{ fontWeight: 800, color: '#2B4C7E', fontSize: '1.1rem' }}>{overall}%</span>
        </div>
        <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #16a34a, #2B4C7E, #7c3aed)', width: `${overall}%`, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10, fontSize: '.8rem', color: '#64748b' }}>
          <span>✅ {doneItems} termines</span>
          <span>🔄 {wipItems} en cours</span>
          <span>⬜ {allItems.length - doneItems - wipItems} a venir</span>
        </div>
      </div>

      {/* Phases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 800, margin: '0 auto' }}>
        {PHASES.map((phase, i) => {
          const pct = getPhaseProgress(phase)
          const isOpen = expandedPhase.has(i)
          const done = phase.items.filter(it => it.s === 'done').length
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div onClick={() => togglePhase(i)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: isOpen ? `${phase.color}08` : 'transparent' }}>
                <span style={{ fontSize: 28 }}>{phase.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{phase.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '.8rem', color: '#64748b' }}>{done}/{phase.items.length}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: phase.color }}>{pct}%</span>
                      <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .3s', color: '#94a3b8' }}>▼</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: phase.color, width: `${pct}%`, transition: 'width .8s ease' }} />
                  </div>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  {phase.items.map((item, j) => {
                    const st = STATUS[item.s]
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, marginBottom: 2, background: st.bg, opacity: 0, animation: `roadmapFadeIn .3s ease ${j * 0.04}s forwards` }}>
                        <span style={{ fontSize: 14 }}>{st.icon}</span>
                        <span style={{ fontSize: '.85rem', color: item.s === 'todo' ? '#94a3b8' : '#1e293b', fontWeight: item.s === 'done' ? 500 : 400 }}>{item.t}</span>
                        {item.s === 'wip' && <span style={{ marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700, color: st.color, background: `${st.color}15`, padding: '2px 6px', borderRadius: 4 }}>EN COURS</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '.8rem', color: '#94a3b8' }}>
        Les priorites peuvent evoluer en fonction des retours utilisateurs
      </div>
      <style>{`@keyframes roadmapFadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function InfoPage() {
  const [tab, setTab] = useState('histoire')

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.querySelector('.app-content')?.scrollTo(0, 0)
  }, [])

  return (
    <div className="admin-page">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #2B4C7E 0%, #1a3a5c 50%, #0f2942 100%)',
        borderRadius: 16, padding: '2.5rem 2rem 1.5rem', textAlign: 'center', marginBottom: 24}}>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 .5rem' }}>
          TimeBlast.ai
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: 0 }}>
          La plateforme qui active vos donnees
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e2e8f0', maxWidth: 400, margin: '0 auto 24px' }}>
        <button onClick={() => setTab('histoire')} style={{
          flex: 1, padding: '.75rem', background: 'none', border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: '.9rem',
          color: tab === 'histoire' ? '#2B4C7E' : '#94a3b8',
          borderBottom: tab === 'histoire' ? '3px solid #2B4C7E' : '3px solid transparent',
          marginBottom: -2}}>
          📜 Histoire
        </button>
        <button onClick={() => setTab('roadmap')} style={{
          flex: 1, padding: '.75rem', background: 'none', border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: '.9rem',
          color: tab === 'roadmap' ? '#2B4C7E' : '#94a3b8',
          borderBottom: tab === 'roadmap' ? '3px solid #2B4C7E' : '3px solid transparent',
          marginBottom: -2}}>
          🗺️ Avancement
        </button>
      </div>

      {tab === 'histoire' ? <HistoryTab /> : <RoadmapTab />}
    </div>
  )
}
