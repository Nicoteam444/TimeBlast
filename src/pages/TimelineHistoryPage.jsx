import { useState, useEffect, useRef } from 'react'

const STATS = [
  { value: '5', label: 'Jours de dev', icon: '⚡' },
  { value: '200+', label: 'Commits', icon: '📦' },
  { value: '65+', label: 'Pages', icon: '📄' },
  { value: '35+', label: 'Tables BD', icon: '🗄️' },
  { value: '57', label: 'Fichiers optimises', icon: '🚀' },
]

const TIMELINE = [
  {
    date: '21 mars 2026',
    day: 'Jour 1',
    title: 'La genese',
    color: '#2B4C7E',
    icon: '🌱',
    summary: 'Creation du projet et des fondations',
    details: [
      'Initialisation React + Vite + Supabase',
      'Page de connexion et authentification',
      'Structure de base : Dashboard, Sidebar, Layout',
      'Premiers modules CRM : Contacts, Entreprises, Leads',
      'Systeme de routing et navigation',
      'Configuration base de donnees et RLS',
    ]
  },
  {
    date: '22 mars 2026',
    day: 'Jour 2',
    title: "L'acceleration",
    color: '#16a34a',
    icon: '🚀',
    summary: '12 modules deployes en une seule journee',
    details: [
      'Module Facturation complet (Ventes + Achats) avec previsualisation A4',
      'Module Equipe : Collaborateurs, Absences, Notes de frais, Competences',
      'Trombinoscope et Organigramme interactif',
      'Gestion de Projet avec Kanban drag & drop',
      'Module Commerce : Clients, Transactions, Devis, Produits, Stock, Abonnements',
      'Systeme de favoris persistants en base de donnees',
      'Module Finance : Comptabilite, FEC, Previsionnel, Immobilisations, Rapprochement',
      'Tri par colonnes sur tous les tableaux',
    ]
  },
  {
    date: '23 mars 2026',
    day: 'Jour 3',
    title: "L'intelligence",
    color: '#7c3aed',
    icon: '🧠',
    summary: 'IA, automatisation et modules avances',
    details: [
      'Page E-Facture (reforme 2026) avec distribution multi-canal',
      'Portail client public pour factures (lien securise sans login)',
      'Export XML UBL (norme Chorus Pro)',
      'Calendrier collaboratif temps reel avec selection d\'equipe',
      'Quick Add (+) : creer Contact, Projet, Tache en 2 clics',
      'Module Documents avec OCR et archivage intelligent',
      'Module Marketing (Campagnes)',
      'Module Automatisation (Workflows visuels sur fond quadrille)',
    ]
  },
  {
    date: '24 mars 2026',
    day: 'Jour 4',
    title: 'La collaboration',
    color: '#ea580c',
    icon: '🤝',
    summary: 'Widgets collaboratifs et experience utilisateur',
    details: [
      'Dashboard refonte complete : 12 widgets personnalisables',
      'Score de sante IA de l\'entreprise',
      'Leaderboard d\'utilisation de la plateforme',
      'Widget Humeur d\'equipe avec emojis',
      'Widget "En ligne maintenant" (presence temps reel)',
      'Widget Fil d\'equipe avec reactions emoji',
      'Conseils IA du jour avec checklist',
      'Barre de recherche universelle (Cmd+K)',
      'Mini calendrier selecteur de date',
      'Widgets drag & drop repositionnables',
    ]
  },
  {
    date: '25-26 mars 2026',
    day: 'Jour 5',
    title: 'Securite & Deploiement',
    color: '#dc2626',
    icon: '🔒',
    summary: 'Production-ready en 48h',
    details: [
      'Audit securite complet (isolation donnees par user/societe)',
      'Lazy loading 65+ pages (performance x3)',
      'Spinner bleu SRA harmonise sur 57 pages',
      'Gestion des droits par role (Super Admin / Admin / Manager / Collaborateur)',
      'Historique de navigation par utilisateur',
      'Connexion Microsoft SSO (Azure AD)',
      'Environnement de production isole (Supabase + Vercel)',
      'Didacticiel d\'onboarding au premier login',
      'Landing page avec octogone connecteurs IA',
      'Schema flux metier interactif',
      'Formulaire de contact avec stockage en base',
    ]
  },
]

export default function TimelineHistoryPage() {
  const [expanded, setExpanded] = useState(new Set([0]))
  const refs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.style.opacity = '1'
        if (e.isIntersecting) e.target.style.transform = 'translateY(0)'
      })
    }, { threshold: 0.15 })
    refs.current.forEach(r => r && observer.observe(r))
    return () => observer.disconnect()
  }, [])

  function toggle(i) {
    setExpanded(prev => {
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
        borderRadius: 16, padding: '3rem 2rem 4rem', textAlign: 'center', marginBottom: -40, position: 'relative',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📜</div>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: '0 0 .5rem' }}>
          L'histoire de TimeBlast.ai
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', margin: 0 }}>
          De l'idee a la plateforme — construite en 5 jours avec l'IA
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
        position: 'relative', zIndex: 1, marginBottom: '2rem',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', minWidth: 120,
            transition: 'transform .2s', cursor: 'default',
          }}
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
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 19, top: 0, bottom: 0, width: 3,
          background: 'linear-gradient(180deg, #2B4C7E, #16a34a, #7c3aed, #ea580c, #dc2626)',
          borderRadius: 2,
        }} />

        {TIMELINE.map((entry, i) => (
          <div
            key={i}
            ref={el => refs.current[i] = el}
            style={{
              position: 'relative', marginBottom: 32, paddingLeft: 32,
              opacity: 0, transform: 'translateY(30px)',
              transition: `opacity .6s ease ${i * 0.15}s, transform .6s ease ${i * 0.15}s`,
            }}
          >
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -12, top: 4, width: 24, height: 24,
              borderRadius: '50%', background: entry.color, border: '3px solid #fff',
              boxShadow: `0 0 0 3px ${entry.color}33`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12,
            }}>
              {entry.icon}
            </div>

            {/* Card */}
            <div
              onClick={() => toggle(i)}
              style={{
                background: '#fff', borderRadius: 12, padding: '1.25rem',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                border: expanded.has(i) ? `2px solid ${entry.color}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all .3s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontSize: '.7rem', fontWeight: 700, color: '#fff', background: entry.color,
                      padding: '2px 8px', borderRadius: 4,
                    }}>{entry.day}</span>
                    <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>{entry.date}</span>
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    {entry.title}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>{entry.summary}</p>
                </div>
                <span style={{
                  fontSize: '1.2rem', transform: expanded.has(i) ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform .3s', color: '#94a3b8',
                }}>▼</span>
              </div>

              {expanded.has(i) && (
                <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  {entry.details.map((d, j) => (
                    <div key={j} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0',
                      fontSize: '.85rem', color: '#475569',
                      opacity: 0, animation: `fadeSlideIn .3s ease ${j * 0.05}s forwards`,
                    }}>
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

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: 8 }}>
          Et ce n'est que le debut...
        </p>
        <a href="/roadmap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 10,
          background: 'linear-gradient(135deg, #2B4C7E, #1a8cff)',
          color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
          boxShadow: '0 4px 15px rgba(43,76,126,0.3)',
        }}>
          🗺️ Voir la Roadmap →
        </a>
      </div>

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}
