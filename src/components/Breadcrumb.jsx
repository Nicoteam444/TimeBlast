import { useLocation, useNavigate } from 'react-router-dom'
import { useBreadcrumb } from '../contexts/BreadcrumbContext'

/**
 * Mapping des routes vers des labels lisibles.
 * Structure : path segment → label affiché.
 */
const ROUTE_LABELS = {
  // Sections principales
  'crm':        'CRM',
  'commerce':   'Commerce',
  'activite':   'Activité',
  'finance':    'Finance',
  'gestion':    'Gestion',
  'equipe':     'Équipe',
  'admin':      'Administration',
  'parametres': 'Paramètres',
  // CRM
  'contacts':     'Contacts',
  'entreprises':  'Entreprises',
  'leads':        'Leads',
  // Commerce
  'clients':       'Clients',
  'transactions':  'Opportunités',
  'achats':        'Achats',
  'stock':         'Stock',
  'produits':      'Produits',
  'abonnements':   'Abonnements',
  'devis':         'Devis',
  // Activité
  'saisie':        'Calendrier',
  'planification': 'Planification',
  'projets':       'Gestion de projet',
  'validation':    'Validations',
  'absences':      'Absences',
  'reporting':     'Reporting',
  'rentabilite':   'Rentabilité',
  // Finance
  'business-intelligence': 'Business Intelligence',
  'comptabilite':          'Comptabilité',
  'ecritures':             'Écritures',
  'facturation':           'Facturation',
  'previsionnel':          'Prévisionnel',
  'immobilisations':       'Immobilisations',
  'rapprochement':         'Rapprochement',
  'saisie-ecriture':       'Saisie écriture',
  // Gestion
  'tableau-de-bord': 'Tableau de bord',
  // Équipe
  'trombinoscope':    'Trombinoscope',
  'collaborateurs':   'Collaborateurs',
  'organigramme':     'Organigramme',
  'notes-de-frais':   'Notes de frais',
  'competences':      'Compétences',
  // Admin
  'utilisateurs': 'Utilisateurs',
  'audit':        'Audit',
  'societes':     'Sociétés',
  'groupes':      'Groupes',
  'workflows':    'Workflows',
  'analytics':    'Analytics',
  // Marketing
  'marketing':  'Marketing',
  'campagnes':  'Campagnes',
  'leads':      'Leads',
  // Documents
  'documents':  'Documents',
  'archives':   'Archives',
  // Taches
  'taches':  'Taches',
  // Other
  'notifications': 'Notifications',
  'recherche':     'Recherche'}

/**
 * Certains chemins construits à partir de l'URL ne correspondent pas aux vraies routes.
 * Cette table redirige vers les bonnes landing pages.
 */
/**
 * Override UNIQUEMENT pour les chemins intermédiaires qui n'ont PAS de route propre.
 * Ex: /commerce n'a pas de route → on redirige vers /crm
 * Les pages qui ONT une route (/crm/contacts, /activite/projets, etc.) gardent leur propre path.
 */
const PATH_OVERRIDES = {
  // /commerce/* n'a pas de landing → redirige vers la catégorie parente
  '/commerce':              '/crm',
  // /equipe/* sous-pages qui sont dans le sidebar sous Équipe
  '/equipe':                '/equipe'}

/**
 * Breadcrumb dynamique.
 * Construit le fil d'Ariane à partir de l'URL.
 * Ne s'affiche pas sur la page d'accueil.
 * Accepte des segments personnalisés via props (ex: nom de projet, nom de tâche).
 */
export default function Breadcrumb() {
  const location = useLocation()
  const navigate = useNavigate()
  const { customSegments = [] } = useBreadcrumb() || {}

  // Ne rien afficher sur l'accueil
  if (location.pathname === '/') return null

  let segments = location.pathname.split('/').filter(Boolean)

  // Ignorer le segment envId (7 chiffres) au début
  const envPrefix = segments.length > 0 && /^\d{7}$/.test(segments[0]) ? `/${segments[0]}` : ''
  if (envPrefix) segments = segments.slice(1)

  // Construire les breadcrumbs depuis l'URL
  const crumbs = []

  // Toujours commencer par Accueil
  crumbs.push({ label: 'Accueil', path: envPrefix + '/' })

  let currentPath = envPrefix
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    currentPath += '/' + seg

    // Skip les UUIDs (on les remplace par customSegments si disponible)
    if (seg.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)) {
      // C'est un ID, chercher dans customSegments
      const custom = customSegments.find(c => c.id === seg)
      if (custom) {
        crumbs.push({ label: custom.label, path: currentPath })
      }
      continue
    }

    const label = ROUTE_LABELS[seg]
    if (label) {
      // Use override path if the constructed path doesn't have a direct route
      const navPath = PATH_OVERRIDES[currentPath] || currentPath
      crumbs.push({ label, path: navPath })
    }
  }

  // Ajouter les segments personnalisés qui n'ont pas d'ID (ex: nom de projet en contexte)
  for (const custom of customSegments) {
    if (!custom.id && !crumbs.find(c => c.label === custom.label)) {
      crumbs.push({ label: custom.label, path: custom.path || null })
    }
  }

  // Ne rien afficher si on a seulement "Accueil"
  if (crumbs.length <= 1) return null

  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="breadcrumb-item">
            {i > 0 && <span className="breadcrumb-sep">→</span>}
            {isLast || !crumb.path ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <button className="breadcrumb-link" onClick={(e) => { e.stopPropagation(); console.log('Breadcrumb navigate:', crumb.path); navigate(crumb.path) }}>
                {crumb.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
