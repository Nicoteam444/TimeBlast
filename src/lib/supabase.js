import { createClient } from '@supabase/supabase-js'

export const defaultUrl = import.meta.env.VITE_SUPABASE_URL
export const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Client Supabase mutable — peut être reconfiguré pour pointer vers un autre env
// flowType: 'pkce' requis pour Azure AD (pas d'implicit grant)
let _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'pkce' } })
let _currentUrl = defaultUrl
let _currentEnvId = null

// ============================================================
// ISOLATION PAR ENVIRONMENT : toute query sur ces tables est
// automatiquement filtree par environment_id = currentEnvId
// (SELECT, UPDATE, DELETE) et injectee a la creation (INSERT).
// ============================================================
const SCOPED_TABLES = new Set([
  'abonnements','absences','achats','assignations','automation_workflows',
  'calendar_events','campagnes','client_projects','clients',
  'competence_evaluations','competences','contacts',
  'devis','documents_archive','ecritures_comptables',
  'equipe','factures','fec_ecritures','fec_imports',
  'immobilisations','integrations','journal_entries','journal_lines',
  'kanban_columns','kanban_tasks','kanban_time_entries','leads','lots',
  'notes_de_frais','org_edges','org_nodes',
  'plannings','produits','project_messages','projet_members','projets',
  'saisies_temps','societes','stocks','time_entries',
  'transactions','validation_semaines','wiki_articles',
])

export function setCurrentEnvId(envId) {
  _currentEnvId = envId || null
  console.log('[Supabase] Env scope =', _currentEnvId)
}
export function getCurrentEnvId() { return _currentEnvId }

// Wrapper le query builder pour ajouter env_id automatiquement
function wrapQueryBuilder(qb, tableName) {
  if (!SCOPED_TABLES.has(tableName) || !_currentEnvId) return qb

  const envId = _currentEnvId

  // SELECT : ajouter .eq('environment_id', envId) apres
  const origSelect = qb.select.bind(qb)
  qb.select = function (...args) {
    const next = origSelect(...args)
    if (next && typeof next.eq === 'function') return next.eq('environment_id', envId)
    return next
  }

  // INSERT : injecter environment_id dans les rows
  const origInsert = qb.insert.bind(qb)
  qb.insert = function (rows, opts) {
    const withEnv = Array.isArray(rows)
      ? rows.map(r => (r && typeof r === 'object' && !('environment_id' in r)) ? { ...r, environment_id: envId } : r)
      : (rows && typeof rows === 'object' && !('environment_id' in rows)) ? { ...rows, environment_id: envId } : rows
    return origInsert(withEnv, opts)
  }

  // UPSERT : injecter environment_id dans les rows
  const origUpsert = qb.upsert.bind(qb)
  qb.upsert = function (rows, opts) {
    const withEnv = Array.isArray(rows)
      ? rows.map(r => (r && typeof r === 'object' && !('environment_id' in r)) ? { ...r, environment_id: envId } : r)
      : (rows && typeof rows === 'object' && !('environment_id' in rows)) ? { ...rows, environment_id: envId } : rows
    return origUpsert(withEnv, opts)
  }

  // UPDATE : ajouter .eq('environment_id', envId)
  const origUpdate = qb.update.bind(qb)
  qb.update = function (values, opts) {
    const next = origUpdate(values, opts)
    if (next && typeof next.eq === 'function') return next.eq('environment_id', envId)
    return next
  }

  // DELETE : ajouter .eq('environment_id', envId)
  const origDelete = qb.delete.bind(qb)
  qb.delete = function (opts) {
    const next = origDelete(opts)
    if (next && typeof next.eq === 'function') return next.eq('environment_id', envId)
    return next
  }

  return qb
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    if (prop === 'from') {
      return function (tableName) {
        const qb = _client.from(tableName)
        return wrapQueryBuilder(qb, tableName)
      }
    }
    return _client[prop]
  },
})

// Reconfigurer le client pour un autre environnement
export function switchSupabaseClient(url, anonKey) {
  if (url === _currentUrl) return // Déjà sur ce client
  _client = createClient(url, anonKey)
  _currentUrl = url
  console.log(`[Supabase] Client switché vers ${url}`)
}

// Remettre le client sur la base master (appelé au sign-out et avant sign-in)
export function resetToMasterClient() {
  if (_currentUrl === defaultUrl) return
  _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'pkce' } })
  _currentUrl = defaultUrl
  console.log('[Supabase] Client resetté sur master')
}

// Obtenir l'URL courante
export function getCurrentSupabaseUrl() {
  return _currentUrl
}
