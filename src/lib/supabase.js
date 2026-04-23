import { createClient } from '@supabase/supabase-js'

export const defaultUrl = import.meta.env.VITE_SUPABASE_URL
export const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'pkce' } })
let _currentUrl = defaultUrl

// ============================================================
// ISOLATION STRICTE PAR ENV — basee sur l'env_code dans l'URL
// ============================================================
// Mapping statique env_code (URL) -> environment_id (UUID en DB).
// Lu depuis window.location.pathname a chaque query, synchrone,
// independant du state React. GARANTIT le cloisonnement meme si
// une page render avant que l'EnvContext ait fini son load async.
const ENV_CODE_TO_ID = {
  '1924635': '4657c018-d993-4876-8a10-df9da89d5612', // SRA
  '2026001': '4a70b987-9541-4db9-8f1b-144a74682c30', // Webmedia
}

// Tables metier qui DOIVENT etre filtrees par environment_id
const SCOPED_TABLES = new Set([
  'abonnements','absences','achats','assignations','automation_workflows',
  'calendar_events','campagnes','client_projects','clients',
  'competence_evaluations','competences','contacts',
  'devis','documents_archive','ecritures_comptables',
  'equipe','factures','fec_ecritures','fec_imports',
  'immobilisations','integrations','journal_entries','journal_lines',
  'kanban_columns','kanban_tasks','kanban_time_entries','leads','lots',
  'notes_de_frais','org_edges','org_nodes',
  'page_views',
  'plannings','produits','project_messages','projet_members','projets',
  'saisies_temps','societes','stocks','time_entries',
  'transactions','validation_semaines','wiki_articles',
])

// Lecture SYNCHRONE de l'env_id depuis l'URL — c'est la source de verite
function getEnvIdFromUrl() {
  if (typeof window === 'undefined') return null
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const urlEnvCode = pathSegments.length > 0 && /^\d{7}$/.test(pathSegments[0]) ? pathSegments[0] : null
  return urlEnvCode ? (ENV_CODE_TO_ID[urlEnvCode] || null) : null
}

// Expose pour compatibilite (plus utilise en interne)
export function setCurrentEnvId(_envId) { /* no-op : on lit toujours l'URL */ }
export function getCurrentEnvId() { return getEnvIdFromUrl() }

// Wrapper du query builder qui injecte automatiquement environment_id
function wrapQueryBuilder(qb, tableName) {
  if (!SCOPED_TABLES.has(tableName)) return qb
  const envId = getEnvIdFromUrl()
  if (!envId) return qb // Sur /backoffice, /login, etc. : pas de filtrage

  // SELECT : AND environment_id = envId
  const origSelect = qb.select.bind(qb)
  qb.select = function (...args) {
    const next = origSelect(...args)
    if (next && typeof next.eq === 'function') return next.eq('environment_id', envId)
    return next
  }

  // INSERT : injecter environment_id
  const origInsert = qb.insert.bind(qb)
  qb.insert = function (rows, opts) {
    const withEnv = Array.isArray(rows)
      ? rows.map(r => (r && typeof r === 'object' && !('environment_id' in r)) ? { ...r, environment_id: envId } : r)
      : (rows && typeof rows === 'object' && !('environment_id' in rows)) ? { ...rows, environment_id: envId } : rows
    return origInsert(withEnv, opts)
  }

  // UPSERT : injecter environment_id
  const origUpsert = qb.upsert.bind(qb)
  qb.upsert = function (rows, opts) {
    const withEnv = Array.isArray(rows)
      ? rows.map(r => (r && typeof r === 'object' && !('environment_id' in r)) ? { ...r, environment_id: envId } : r)
      : (rows && typeof rows === 'object' && !('environment_id' in rows)) ? { ...rows, environment_id: envId } : rows
    return origUpsert(withEnv, opts)
  }

  // UPDATE : AND environment_id = envId
  const origUpdate = qb.update.bind(qb)
  qb.update = function (values, opts) {
    const next = origUpdate(values, opts)
    if (next && typeof next.eq === 'function') return next.eq('environment_id', envId)
    return next
  }

  // DELETE : AND environment_id = envId
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
      return (tableName) => {
        const qb = _client.from(tableName)
        return wrapQueryBuilder(qb, tableName)
      }
    }
    return _client[prop]
  },
})

export function switchSupabaseClient(url, anonKey) {
  if (url === _currentUrl) return
  _client = createClient(url, anonKey)
  _currentUrl = url
  console.log(`[Supabase] Client switche vers ${url}`)
}

export function resetToMasterClient() {
  if (_currentUrl === defaultUrl) return
  _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'pkce' } })
  _currentUrl = defaultUrl
  console.log('[Supabase] Client resette sur master')
}

export function getCurrentSupabaseUrl() { return _currentUrl }
