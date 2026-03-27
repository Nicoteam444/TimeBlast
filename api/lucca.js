// ── Vercel Function — Proxy Lucca API ──────────────────────────────
// Sécurise la clé API Lucca côté serveur
// Endpoints :
//   POST /api/lucca?action=test         → Test connexion
//   POST /api/lucca?action=users        → Liste collaborateurs
//   POST /api/lucca?action=leaves       → Liste absences
//   POST /api/lucca?action=timeentries  → Liste saisies temps
//   POST /api/lucca?action=expenses     → Liste notes de frais
//   POST /api/lucca?action=departments  → Liste départements
//   POST /api/lucca?action=legalunits   → Liste entités légales
//   POST /api/lucca?action=sync         → Sync complète

const LUCCA_BASE = 'https://groupe-sra.ilucca.net'
const API_VERSION = '2024-11-01'

async function luccaFetch(endpoint, options = {}) {
  const apiKey = process.env.LUCCA_API_KEY
  if (!apiKey) throw new Error('LUCCA_API_KEY non configurée')

  const url = endpoint.startsWith('http') ? endpoint : `${LUCCA_BASE}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `lucca application=${apiKey}`,
      'Content-Type': 'application/json',
      'Api-Version': API_VERSION,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Lucca ${res.status}: ${text.slice(0, 200)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function luccaFetchAll(endpoint) {
  let allItems = []
  let pageNum = 1
  const sep = endpoint.includes('?') ? '&' : '?'
  while (true) {
    const url = `${endpoint}${sep}limit=50&page=${pageNum}`
    const result = await luccaFetch(url)
    const items = result?.data?.items || result?.items || result?.data || []
    if (!Array.isArray(items) || items.length === 0) break
    allItems = allItems.concat(items)
    if (items.length < 50) break
    pageNum++
  }
  return allItems
}

// ── Handlers par action ────────────────────────────────────────────

async function handleTest() {
  const data = await luccaFetch('/api/v3/users?limit=1&fields=id,firstName,lastName')
  return { ok: true, message: 'Connexion Lucca OK', sample: data }
}

async function handleUsers(filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,firstName,lastName,mail,login,birthDate,dtContractStart,dtContractEnd,jobTitle,department,legalEntity,manager,picture,culture,address,rolePrincipal')
  if (filters.modifiedAt) params.set('modifiedAt', `since,${filters.modifiedAt}`)
  return luccaFetchAll(`/api/v3/users?${params}`)
}

async function handleLeaves(filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,date,endsOn,isAm,isPm,leaveAccountId,comment,isApproved')
  if (filters.since) params.set('date', `since,${filters.since}`)
  if (filters.until) params.set('endsOn', `until,${filters.until}`)
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  return luccaFetchAll(`/api/v3/leaves?${params}`)
}

async function handleLeaveRequests(filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,date,endsOn,duration,leaveAccount,isApproved,comment,creationDate,status')
  if (filters.since) params.set('date', `since,${filters.since}`)
  if (filters.until) params.set('endsOn', `until,${filters.until}`)
  return luccaFetchAll(`/api/v3/leaverequests?${params}`)
}

async function handleTimeEntries(filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,startsAt,endsAt,duration,unit,projectId,comment,createdAt')
  if (filters.startsAt) params.set('startsAt', `since,${filters.startsAt}`)
  if (filters.endsAt) params.set('endsAt', `until,${filters.endsAt}`)
  return luccaFetchAll(`/api/v3/timeentries?${params}`)
}

async function handleExpenses(filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,expenseClaimId,ownerId,purchasedOn,expenseNature,quantity,originalAmount,processedAmount,currencyCode,comment,mileage')
  if (filters.purchasedOn) params.set('purchasedOn', `since,${filters.purchasedOn}`)
  return luccaFetchAll(`/api/v3/expenseclaimitems?${params}`)
}

async function handleDepartments() {
  return luccaFetchAll('/api/v3/departments?fields=id,name,parentId,head,level')
}

async function handleLegalUnits() {
  return luccaFetch('/api/v3/legalunits')
}

async function handleProjects() {
  return luccaFetchAll('/api/v3/projects?fields=id,name,code,status,clientId,managerId,startDate,endDate')
}

// ── Sync complète ─────────────────────────────────────────────────
async function handleSync(filters = {}) {
  const [users, leaves, timeEntries, expenses, departments, legalUnits] = await Promise.all([
    handleUsers(filters),
    handleLeaves({ since: filters.since || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) }),
    handleTimeEntries({ startsAt: filters.since || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) }),
    handleExpenses({ purchasedOn: filters.since || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) }),
    handleDepartments(),
    handleLegalUnits(),
  ])
  return { users, leaves, timeEntries, expenses, departments, legalUnits, syncedAt: new Date().toISOString() }
}

// ── Export handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth check — seuls les admins TimeBlast peuvent appeler cette API
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token Supabase requis' })
  }

  const { action, filters } = req.body || {}

  try {
    let data
    switch (action) {
      case 'test': data = await handleTest(); break
      case 'users': data = await handleUsers(filters); break
      case 'leaves': data = await handleLeaves(filters); break
      case 'leaverequests': data = await handleLeaveRequests(filters); break
      case 'timeentries': data = await handleTimeEntries(filters); break
      case 'expenses': data = await handleExpenses(filters); break
      case 'departments': data = await handleDepartments(); break
      case 'legalunits': data = await handleLegalUnits(); break
      case 'projects': data = await handleProjects(); break
      case 'sync': data = await handleSync(filters); break
      default: return res.status(400).json({ error: `Action inconnue: ${action}` })
    }
    return res.status(200).json({ ok: true, data })
  } catch (err) {
    console.error('[Lucca API]', err.message)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
