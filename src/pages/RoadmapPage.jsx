import { useState } from 'react'

const PHASES = [
  {
    title: 'Phase 1 — Fondations',
    icon: '🏗️',
    color: '#16a34a',
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
    title: 'Phase 2 — Collaboration',
    icon: '🤝',
    color: '#2B4C7E',
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
    title: 'Phase 3 — Connecteurs et Integrations',
    icon: '🔗',
    color: '#7c3aed',
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
    title: 'Phase 4 — Multi-tenant et Scalabilite',
    icon: '🏢',
    color: '#ea580c',
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
    title: 'Phase 5 — Mobile et Performance',
    icon: '📱',
    color: '#0891b2',
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
    title: 'Phase 6 — Automatisation avancee',
    icon: '🧠',
    color: '#dc2626',
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

function getPhaseProgress(phase) {
  const total = phase.items.length
  const done = phase.items.filter(i => i.s === 'done').length
  const wip = phase.items.filter(i => i.s === 'wip').length
  return Math.round(((done + wip * 0.5) / total) * 100)
}

function getOverallProgress() {
  const allItems = PHASES.flatMap(p => p.items)
  const done = allItems.filter(i => i.s === 'done').length
  const wip = allItems.filter(i => i.s === 'wip').length
  return Math.round(((done + wip * 0.5) / allItems.length) * 100)
}

const STATUS = {
  done: { icon: '✅', color: '#16a34a', bg: '#f0fdf4', label: 'Termine' },
  wip: { icon: '🔄', color: '#2B4C7E', bg: '#eff6ff', label: 'En cours' },
  todo: { icon: '⬜', color: '#94a3b8', bg: '#f8fafc', label: 'A venir' }}

export default function RoadmapPage() {
  const [expandedPhase, setExpandedPhase] = useState(new Set([0, 1, 2]))
  const overall = getOverallProgress()
  const totalItems = PHASES.flatMap(p => p.items).length
  const doneItems = PHASES.flatMap(p => p.items).filter(i => i.s === 'done').length
  const wipItems = PHASES.flatMap(p => p.items).filter(i => i.s === 'wip').length

  function togglePhase(i) {
    setExpandedPhase(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="admin-page">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #2B4C7E 0%, #1a3a5c 50%, #0f2942 100%)',
        borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', marginBottom: 24}}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🗺️</div>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: '0 0 .5rem' }}>
          Roadmap TimeBlast.ai
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', margin: '0 0 2rem' }}>
          Notre vision pour l'avenir — {totalItems} fonctionnalites planifiees
        </p>

        {/* Overall progress */}
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '.85rem', fontWeight: 600 }}>
              Progression globale
            </span>
            <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{overall}%</span>
          </div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: 'linear-gradient(90deg, #16a34a, #2B4C7E, #7c3aed)',
              width: `${overall}%`, transition: 'width 1s ease'}} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem' }}>✅ {doneItems} termines</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem' }}>🔄 {wipItems} en cours</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem' }}>⬜ {totalItems - doneItems - wipItems} a venir</span>
          </div>
        </div>
      </div>

      {/* Link to history */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <a href="/histoire" style={{
          color: '#2B4C7E', fontSize: '.9rem', fontWeight: 600, textDecoration: 'none'}}>
          📜 Voir l'histoire complete de la creation →
        </a>
      </div>

      {/* Phases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
        {PHASES.map((phase, i) => {
          const pct = getPhaseProgress(phase)
          const isOpen = expandedPhase.has(i)
          const done = phase.items.filter(it => it.s === 'done').length
          const total = phase.items.length

          return (
            <div key={i} style={{
              background: '#fff', borderRadius: 12, overflow: 'hidden',
              border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all .3s'}}>
              {/* Phase header */}
              <div
                onClick={() => togglePhase(i)}
                style={{
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isOpen ? `${phase.color}08` : 'transparent'}}
              >
                <span style={{ fontSize: 28 }}>{phase.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                      {phase.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '.8rem', color: '#64748b' }}>{done}/{total}</span>
                      <span style={{
                        fontSize: '1rem', fontWeight: 800, color: phase.color}}>{pct}%</span>
                      <span style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform .3s', color: '#94a3b8'}}>▼</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: phase.color,
                      width: `${pct}%`, transition: 'width .8s ease'}} />
                  </div>
                </div>
              </div>

              {/* Phase items */}
              {isOpen && (
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  {phase.items.map((item, j) => {
                    const st = STATUS[item.s]
                    return (
                      <div key={j} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                        background: st.bg,
                        opacity: 0, animation: `roadmapFadeIn .3s ease ${j * 0.04}s forwards`}}>
                        <span style={{ fontSize: 14 }}>{st.icon}</span>
                        <span style={{
                          fontSize: '.85rem', color: item.s === 'todo' ? '#94a3b8' : '#1e293b',
                          fontWeight: item.s === 'done' ? 500 : 400,
                          textDecoration: item.s === 'done' ? 'none' : 'none'}}>{item.t}</span>
                        {item.s === 'wip' && (
                          <span style={{
                            marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700,
                            color: st.color, background: `${st.color}15`, padding: '2px 6px',
                            borderRadius: 4}}>EN COURS</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div style={{ textAlign: 'center', padding: '2rem 0 3rem', color: '#64748b' }}>
        <p style={{ fontSize: '.9rem' }}>
          Roadmap mise a jour en temps reel — Derniere modification : mars 2026
        </p>
        <p style={{ fontSize: '.8rem', color: '#94a3b8' }}>
          Les priorites peuvent evoluer en fonction des retours utilisateurs
        </p>
      </div>

      <style>{`
        @keyframes roadmapFadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}
