import { useNavigate, useParams } from 'react-router-dom'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { useAuth } from '../../contexts/AuthContext'

const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

const ADMIN_CARDS = [
  {
    to: '/admin/utilisateurs',
    icon: '👥',
    color: '#6366f1',
    title: 'Utilisateurs',
    desc: 'Créer, modifier et gérer les comptes collaborateurs',
    superAdminOnly: true},
  {
    to: '/admin/societes',
    icon: '🏢',
    color: '#1a5c82',
    title: 'Sociétés',
    superAdminOnly: true,
    desc: 'Gérer les entités et les sociétés du groupe'},
  {
    to: '/admin/groupes',
    icon: '🏛',
    color: '#0891b2',
    title: 'Groupes',
    desc: 'Regrouper les sociétés par holding ou entité mère'},
  {
    to: '/admin/organigramme',
    icon: '🗂',
    color: '#8b5cf6',
    title: 'Organigramme',
    desc: 'Dessiner librement l\'organigramme du groupe avec mini-groupes et droits de visibilité'},
  {
    to: '/admin/workflows',
    icon: '✅',
    color: '#22c55e',
    title: 'Workflows d\'approbation',
    desc: 'Configurer les circuits de validation : notes de frais, conges, temps'},
  {
    to: '/admin/audit',
    icon: '📋',
    color: '#f59e0b',
    title: 'Journal d\'audit',
    desc: 'Consulter l\'historique des actions et modifications'},
  {
    to: '/admin/messages',
    icon: '📬',
    color: '#0ea5e9',
    title: 'Messages contact',
    desc: 'Consulter les messages envoyés depuis le formulaire de contact'},
  {
    to: '/admin/historique',
    icon: '👁',
    color: '#8b5cf6',
    title: 'Historique navigation',
    desc: 'Voir toutes les pages consultées par chaque utilisateur',
    superAdminOnly: true},
  {
    to: '/parametres',
    icon: '⚙️',
    color: '#64748b',
    title: 'Paramètres',
    desc: 'Apparence, SMTP, intégrations et configuration globale'},
]

export default function AdminPage() {
  const navigate = useEnvNavigate()
  const { user } = useAuth()
  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL

  const visibleCards = ADMIN_CARDS.filter(c => !c.superAdminOnly || isSuperAdmin)

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-inner">
          <div>
            <h1 className="home-hero-title">Administration</h1>
            <p className="home-hero-sub">Configuration de la plateforme et gestion des accès</p>
          </div>
        </div>
      </div>

      <div className="admin-cards-grid">
        {visibleCards.map(card => (
          <button
            key={card.to}
            className="admin-hub-card"
            onClick={() => navigate(card.to)}
            style={{ '--card-color': card.color }}
          >
            <div className="admin-hub-card-bar" />
            <div className="admin-hub-card-body">
              <div className="admin-hub-card-icon">{card.icon}</div>
              <div>
                <div className="admin-hub-card-title">{card.title}</div>
                <div className="admin-hub-card-desc">{card.desc}</div>
              </div>
              <span className="admin-hub-card-arrow">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
