import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../contexts/PermissionsContext'
import { isRouteEnabled } from '../config/modules'
import Spinner from './Spinner'

const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

// Mapping route pathname → permission key (module:sub_module)
const ROUTE_PERM_MAP = {
  '/activite/saisie':             'calendrier:saisie',
  '/activite/planification':      'activite:planification',
  '/activite/projets':            'activite:projets',
  '/activite/reporting':          'activite:reporting',
  '/activite/rentabilite':        'activite:rentabilite',
  '/activite/equipe':             'equipe:collaborateurs',
  '/activite/absences':           'equipe:absences',
  '/activite/validation':         'equipe:validations',
  '/equipe/notes-de-frais':       'equipe:notes-de-frais',
  '/equipe/trombinoscope':        'equipe:trombinoscope',
  '/equipe/organigramme':         'equipe:organigramme',
  '/equipe/competences':          'equipe:competences',
  '/gestion/tableau-de-bord':     'gestion:tableau-de-bord',
  '/gestion/transactions':        'gestion:transactions',
  '/finance/facturation':         'gestion:ventes',
  '/gestion/achats':              'gestion:achats',
  '/commerce/stock':              'gestion:stock',
  '/crm/contacts':                'crm:contacts',
  '/crm/entreprises':             'crm:entreprises',
  '/commerce/clients':            'crm:clients',
  '/commerce/transactions':       'crm:opportunites',
  '/commerce/devis':              'crm:devis',
  '/commerce/produits':           'crm:produits',
  '/commerce/abonnements':        'crm:abonnements',
  '/marketing/campagnes':         'marketing:campagnes',
  '/marketing/leads':             'marketing:leads',
  '/finance/business-intelligence': 'finance:business-intelligence',
  '/finance/saisie-ecriture':     'finance:comptabilite',
  '/finance/previsionnel':        'finance:previsionnel',
  '/finance/immobilisations':     'finance:immobilisations',
  '/finance/rapprochement':       'finance:rapprochement',
  '/documents/archives':          'documents:archives',
  '/automatisation/workflows':    'workflows:automatisation',
}

function getPermKeyFromPath(pathname) {
  // Essayer le match exact d'abord
  if (ROUTE_PERM_MAP[pathname]) return ROUTE_PERM_MAP[pathname]
  // Essayer en enlevant le préfixe env (ex: /1924635/activite/saisie → /activite/saisie)
  const withoutEnv = pathname.replace(/^\/[0-9]+/, '')
  if (ROUTE_PERM_MAP[withoutEnv]) return ROUTE_PERM_MAP[withoutEnv]
  // Essayer un match par préfixe (pour les sous-routes comme /crm/contacts/123)
  for (const [route, perm] of Object.entries(ROUTE_PERM_MAP)) {
    if (withoutEnv.startsWith(route + '/') || withoutEnv === route) return perm
  }
  return null
}

export default function ProtectedRoute({ children, roles, superAdminOnly, perm }) {
  const { user, profile, loading } = useAuth()
  const { canView } = usePermissions()
  const location = useLocation()
  const [waitedForProfile, setWaitedForProfile] = useState(false)

  useEffect(() => {
    if (!loading && user && !profile && !waitedForProfile) {
      const t = setTimeout(() => setWaitedForProfile(true), 3000)
      return () => clearTimeout(t)
    }
  }, [loading, user, profile, waitedForProfile])

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile && !waitedForProfile) return <Spinner />
  if (!profile && waitedForProfile) return <Navigate to="/login" replace />

  // Super admin bypass toutes les restrictions de role et de module
  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL
  if (!isSuperAdmin) {
    if (superAdminOnly) return <Navigate to="/" replace />
    if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />
    // Bloquer les routes de modules masqués en production
    if (!isRouteEnabled(location.pathname)) return <Navigate to="/" replace />
    // Bloquer les routes de modules non autorisés pour cet utilisateur
    const userModules = profile?.modules || []
    if (userModules.length > 0) {
      const path = location.pathname.replace(/^\/[0-9]+/, '')
      const ROUTE_MODULE_MAP = {
        '/activite/saisie': 'calendrier', '/calendrier': 'calendrier',
        '/activite': 'activite', '/activite/planification': 'activite', '/activite/projets': 'activite', '/activite/reporting': 'activite', '/activite/rentabilite': 'activite',
        '/activite/equipe': 'equipe', '/activite/absences': 'equipe', '/activite/validation': 'equipe', '/equipe': 'equipe',
        '/equipe/trombinoscope': 'equipe', '/equipe/collaborateurs': 'equipe', '/equipe/organigramme': 'equipe', '/equipe/notes-de-frais': 'equipe', '/equipe/competences': 'equipe', '/equipe/societes': 'equipe',
        '/gestion': 'gestion', '/gestion/achats': 'gestion', '/gestion/tableau-de-bord': 'gestion', '/gestion/transactions': 'gestion',
        '/crm': 'crm', '/crm/contacts': 'crm', '/crm/entreprises': 'crm', '/crm/leads': 'crm',
        '/commerce': 'crm', '/commerce/clients': 'crm', '/commerce/transactions': 'crm', '/commerce/devis': 'crm', '/commerce/produits': 'crm', '/commerce/abonnements': 'crm', '/commerce/stock': 'crm',
        '/clients': 'crm', '/contacts': 'crm', '/entreprises': 'crm',
        '/marketing': 'marketing', '/marketing/campagnes': 'marketing', '/marketing/leads': 'marketing',
        '/finance': 'finance', '/finance/facturation': 'finance', '/finance/saisie-ecriture': 'finance', '/finance/previsionnel': 'finance', '/finance/immobilisations': 'finance', '/finance/rapprochement': 'finance', '/finance/business-intelligence': 'finance',
        '/documents': 'documents', '/documents/archives': 'documents',
        '/automatisation': 'workflows', '/automatisation/workflows': 'workflows',
        '/wiki': 'wiki',
      }
      // Trouver le module de la route (match exact ou par préfixe)
      let routeModule = ROUTE_MODULE_MAP[path]
      if (!routeModule) {
        for (const [route, mod] of Object.entries(ROUTE_MODULE_MAP)) {
          if (path.startsWith(route + '/') || path === route) { routeModule = mod; break }
        }
      }
      if (routeModule && !userModules.includes(routeModule)) return <Navigate to="/" replace />
    }
  }

  // Permissions dynamiques — pour l'instant on ne bloque PAS la navigation
  // (le Sidebar masque les liens, mais on ne redirige pas si l'URL est tapée directement)
  // TODO: activer le blocage une fois la matrice de permissions validée en production
  // const permKey = perm || getPermKeyFromPath(location.pathname)
  // if (permKey && !canView(permKey)) return <Navigate to="/unauthorized" replace />

  return children
}
