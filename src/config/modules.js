// Configuration des modules par environnement
// Tous les modules sont désormais actifs — le contrôle d'accès
// se fait via role_permissions (PermissionsContext) et non plus
// en masquant des modules entiers.

const APP_ENV = import.meta.env.VITE_APP_ENV || 'staging'

// Plus aucun module masqué — tout est contrôlé par les permissions
const HIDDEN_MODULES_PROD = []

// Routes → modules (conservé pour référence, mais plus rien n'est bloqué)
const ROUTE_TO_MODULE = {
  '/finance': 'finance',
  '/gestion': 'gestion',
  '/marketing': 'marketing',
  '/commerce': 'commerce',
}

/**
 * Vérifie si un module est activé dans l'environnement courant
 * @param {string} moduleId - ID du module (ex: 'finance', 'gestion')
 * @returns {boolean}
 */
export function isModuleEnabled(moduleId) {
  if (APP_ENV !== 'production') return true
  return !HIDDEN_MODULES_PROD.includes(moduleId)
}

/**
 * Vérifie si une route est accessible dans l'environnement courant
 * @param {string} pathname - Le pathname courant
 * @returns {boolean}
 */
export function isRouteEnabled(pathname) {
  if (APP_ENV !== 'production') return true
  const blocked = Object.entries(ROUTE_TO_MODULE).find(
    ([prefix]) => pathname.startsWith(prefix)
  )
  return !blocked || !HIDDEN_MODULES_PROD.includes(blocked[1])
}

export const isProd = APP_ENV === 'production'
