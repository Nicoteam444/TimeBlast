// Configuration des modules par environnement
// En production, seuls les modules autorisés sont visibles

const APP_ENV = import.meta.env.VITE_APP_ENV || 'staging'

// Modules masqués en production (beta SRA)
const HIDDEN_MODULES_PROD = ['gestion', 'marketing', 'finance']

// Routes masquées en production (correspondance route → module)
const ROUTE_TO_MODULE = {
  '/finance': 'finance',
  '/gestion': 'gestion',
  '/marketing': 'marketing',
  '/commerce': 'gestion',
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
