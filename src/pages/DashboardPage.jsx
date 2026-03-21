import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MODULES = [
  {
    key: 'activite',
    roles: ['admin', 'manager', 'collaborateur'],
    icon: '⏱',
    label: 'Activité',
    desc: 'Saisie des temps, planification et suivi des projets',
    items: [
      { path: '/activite/saisie',        label: 'Saisie des temps' },
      { path: '/activite/planification', label: 'Planification', roles: ['admin', 'manager'] },
      { path: '/activite/projets',       label: 'Projets' },
    ],
  },
  {
    key: 'commerce',
    roles: ['admin', 'manager', 'collaborateur'],
    icon: '🏢',
    label: 'Commerce',
    desc: 'Gérez vos clients et transactions commerciales',
    items: [
      { path: '/commerce/clients',      label: 'Clients' },
      { path: '/commerce/transactions', label: 'Transactions', roles: ['admin', 'manager'] },
    ],
  },
  {
    key: 'finance',
    roles: ['admin', 'comptable'],
    icon: '💰',
    label: 'Finance',
    desc: 'Comptabilité, import FEC et projections financières',
    items: [
      { path: '/finance/comptabilite', label: 'Comptabilité' },
      { path: '/finance/previsionnel', label: 'Prévisionnel' },
    ],
  },
]

export default function DashboardPage() {
  const { profile, hasRole } = useAuth()
  const navigate = useNavigate()
  const firstName = profile?.full_name?.split(' ')[0] || 'vous'

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-hero-title"><span style={{ marginRight: '.5rem' }}>⚙️</span>Bonjour, {firstName}</h1>
        <p className="home-hero-sub">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>

      <div className="home-modules">
        {MODULES.filter(m => hasRole(...m.roles)).map(m => (
          <div key={m.key} className="home-module-card">
            <div className="home-module-icon">{m.icon}</div>
            <div className="home-module-body">
              <h2>{m.label}</h2>
              <p>{m.desc}</p>
              <div className="home-module-links">
                {m.items
                  .filter(i => !i.roles || hasRole(...i.roles))
                  .map(i => (
                    <button key={i.path} className="home-module-link" onClick={() => navigate(i.path)}>
                      {i.label} →
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
