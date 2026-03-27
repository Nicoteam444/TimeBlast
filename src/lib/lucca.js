// ── Lucca SIRH API — Sync complète ─────────────────────────────────
// Documentation : https://developers.lucca.fr/api-reference/latest/introduction
// Instance : groupe-sra.ilucca.net

const LUCCA_BASE = 'https://groupe-sra.ilucca.net'
const API_VERSION = '2024-11-01'

// ── Fetch wrapper ──────────────────────────────────────────────────
async function luccaFetch(apiKey, endpoint, options = {}) {
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
    throw new Error(`Lucca API ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Pagination helper — Lucca pagine toutes les collections
async function luccaFetchAll(apiKey, endpoint, dataKey = 'data') {
  let allItems = []
  let url = endpoint.includes('?') ? `${endpoint}&limit=50&page=1` : `${endpoint}?limit=50&page=1`
  let pageNum = 1
  while (true) {
    const currentUrl = url.replace(/page=\d+/, `page=${pageNum}`)
    const result = await luccaFetch(apiKey, currentUrl)
    const items = result?.[dataKey]?.items || result?.items || result?.[dataKey] || result?.data || []
    if (!Array.isArray(items) || items.length === 0) break
    allItems = allItems.concat(items)
    if (items.length < 50) break
    pageNum++
  }
  return allItems
}

// ═══════════════════════════════════════════════════════════════════
// COLLABORATEURS (Users)
// ═══════════════════════════════════════════════════════════════════

export async function getUsers(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,firstName,lastName,mail,login,birthDate,dtContractStart,dtContractEnd,jobTitle,department,legalEntity,manager,picture,culture,address,bankName,rolePrincipal,userWorkCycles')
  if (filters.dtContractEnd) params.set('dtContractEnd', filters.dtContractEnd)
  if (filters.modifiedAt) params.set('modifiedAt', `since,${filters.modifiedAt}`)
  return luccaFetchAll(apiKey, `/api/v3/users?${params}`)
}

export async function getUser(apiKey, userId) {
  const params = 'fields=id,firstName,lastName,mail,login,birthDate,dtContractStart,dtContractEnd,jobTitle,department,legalEntity,manager,picture,culture,address'
  return luccaFetch(apiKey, `/api/v3/users/${userId}?${params}`)
}

export async function createUser(apiKey, userData) {
  return luccaFetch(apiKey, '/api/v3/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export async function updateUser(apiKey, userId, updates) {
  return luccaFetch(apiKey, `/api/v3/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// ═══════════════════════════════════════════════════════════════════
// DÉPARTEMENTS
// ═══════════════════════════════════════════════════════════════════

export async function getDepartments(apiKey) {
  return luccaFetchAll(apiKey, '/api/v3/departments?fields=id,name,parentId,head,level')
}

export async function getDepartmentTree(apiKey) {
  return luccaFetch(apiKey, '/api/v3/departments/tree')
}

// ═══════════════════════════════════════════════════════════════════
// ENTITÉS LÉGALES (Sociétés)
// ═══════════════════════════════════════════════════════════════════

export async function getLegalUnits(apiKey) {
  return luccaFetch(apiKey, '/api/v3/legalunits')
}

export async function getEstablishments(apiKey) {
  return luccaFetch(apiKey, '/api/v3/establishments')
}

// ═══════════════════════════════════════════════════════════════════
// ABSENCES / CONGÉS
// ═══════════════════════════════════════════════════════════════════

export async function getLeaveRequests(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,date,endsOn,duration,leaveAccount,isApproved,comment,creationDate,status')
  if (filters.since) params.set('date', `since,${filters.since}`)
  if (filters.until) params.set('endsOn', `until,${filters.until}`)
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  if (filters.status) params.set('status', filters.status)
  return luccaFetchAll(apiKey, `/api/v3/leaverequests?${params}`)
}

export async function getLeaves(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,date,endsOn,isAm,isPm,leaveAccountId,comment,isApproved')
  if (filters.since) params.set('date', `since,${filters.since}`)
  if (filters.until) params.set('endsOn', `until,${filters.until}`)
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  return luccaFetchAll(apiKey, `/api/v3/leaves?${params}`)
}

export async function approveLeaveRequest(apiKey, requestId) {
  return luccaFetch(apiKey, `/api/v3/leaverequests/${requestId}/approve`, { method: 'POST' })
}

export async function denyLeaveRequest(apiKey, requestId, reason = '') {
  return luccaFetch(apiKey, `/api/v3/leaverequests/${requestId}/deny`, {
    method: 'POST',
    body: JSON.stringify({ comment: reason }),
  })
}

// ═══════════════════════════════════════════════════════════════════
// TEMPS / TIMESHEETS
// ═══════════════════════════════════════════════════════════════════

export async function getTimeEntries(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,startsAt,endsAt,duration,unit,projectId,comment,createdAt')
  if (filters.startsAt) params.set('startsAt', `since,${filters.startsAt}`)
  if (filters.endsAt) params.set('endsAt', `until,${filters.endsAt}`)
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  return luccaFetchAll(apiKey, `/api/v3/timeentries?${params}`)
}

export async function createTimeEntry(apiKey, entry) {
  return luccaFetch(apiKey, '/api/v3/timeentries', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export async function updateTimeEntry(apiKey, entryId, updates) {
  return luccaFetch(apiKey, `/api/v3/timeentries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function deleteTimeEntry(apiKey, entryId) {
  return luccaFetch(apiKey, `/api/v3/timeentries/${entryId}`, { method: 'DELETE' })
}

export async function getTimesheets(apiKey, filters = {}) {
  const params = new URLSearchParams()
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  return luccaFetchAll(apiKey, `/api/v3/timesheets?${params}`)
}

export async function approveTimesheet(apiKey, timesheetId) {
  return luccaFetch(apiKey, `/api/v3/timesheets/${timesheetId}/approve`, { method: 'POST' })
}

// ═══════════════════════════════════════════════════════════════════
// NOTES DE FRAIS
// ═══════════════════════════════════════════════════════════════════

export async function getExpenseClaims(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,ownerId,createdAt,statusName,title,totalAmount,currency')
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  return luccaFetchAll(apiKey, `/api/v3/expenseclaims?${params}`)
}

export async function getExpenseClaimItems(apiKey, filters = {}) {
  const params = new URLSearchParams()
  params.set('fields', 'id,expenseClaimId,ownerId,purchasedOn,expenseNature,quantity,originalAmount,processedAmount,currencyCode,comment,mileage')
  if (filters.ownerId) params.set('ownerId', filters.ownerId)
  if (filters.purchasedOn) params.set('purchasedOn', `since,${filters.purchasedOn}`)
  return luccaFetchAll(apiKey, `/api/v3/expenseclaimitems?${params}`)
}

export async function createExpenseClaim(apiKey, claim) {
  return luccaFetch(apiKey, '/api/v3/expenseclaims', {
    method: 'POST',
    body: JSON.stringify(claim),
  })
}

export async function createExpense(apiKey, expense) {
  return luccaFetch(apiKey, '/api/v3/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  })
}

// ═══════════════════════════════════════════════════════════════════
// PROJETS (Timmi Projects)
// ═══════════════════════════════════════════════════════════════════

export async function getProjects(apiKey) {
  return luccaFetchAll(apiKey, '/api/v3/projects?fields=id,name,code,status,clientId,managerId,startDate,endDate')
}

export async function getClients(apiKey) {
  return luccaFetchAll(apiKey, '/api/v3/clients?fields=id,name,code')
}

// ═══════════════════════════════════════════════════════════════════
// PHOTOS / TROMBINOSCOPE
// ═══════════════════════════════════════════════════════════════════

export function getUserPhotoUrl(userId) {
  return `${LUCCA_BASE}/api/v3/users/${userId}/picture`
}

// ═══════════════════════════════════════════════════════════════════
// TEST CONNEXION
// ═══════════════════════════════════════════════════════════════════

export async function testConnection(apiKey) {
  try {
    const result = await luccaFetch(apiKey, '/api/v3/users?limit=1&fields=id,firstName,lastName')
    return { ok: true, message: 'Connexion Lucca OK' }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SYNC HELPERS — Mapping Lucca → TimeBlast
// ═══════════════════════════════════════════════════════════════════

export function mapLuccaUserToEquipe(luccaUser) {
  return {
    lucca_id: luccaUser.id,
    nom: luccaUser.lastName || '',
    prenom: luccaUser.firstName || '',
    email: luccaUser.mail || '',
    poste: luccaUser.jobTitle || '',
    date_embauche: luccaUser.dtContractStart || null,
    date_naissance: luccaUser.birthDate || null,
    departement: luccaUser.department?.name || '',
    manager_lucca_id: luccaUser.manager?.id || null,
    photo_url: luccaUser.picture?.href || null,
    societe_lucca: luccaUser.legalEntity?.name || '',
    actif: !luccaUser.dtContractEnd || new Date(luccaUser.dtContractEnd) > new Date(),
  }
}

export function mapLuccaLeaveToAbsence(leave) {
  return {
    lucca_id: leave.id,
    lucca_owner_id: leave.ownerId,
    date_debut: leave.date,
    date_fin: leave.endsOn,
    type: leave.leaveAccount?.name || leave.leaveAccountId || 'Congé',
    statut: leave.isApproved ? 'approuve' : 'en_attente',
    commentaire: leave.comment || '',
  }
}

export function mapLuccaTimeEntryToSaisie(entry) {
  return {
    lucca_id: entry.id,
    lucca_owner_id: entry.ownerId,
    date: entry.startsAt ? entry.startsAt.split('T')[0] : null,
    heures: entry.duration || 0,
    commentaire: entry.comment || '',
    projet_lucca_id: entry.projectId || null,
  }
}

export function mapLuccaExpenseToNoteDeFrais(item) {
  return {
    lucca_id: item.id,
    lucca_owner_id: item.ownerId,
    date: item.purchasedOn || null,
    montant: item.originalAmount || 0,
    devise: item.currencyCode || 'EUR',
    categorie: item.expenseNature?.name || '',
    commentaire: item.comment || '',
    km: item.mileage?.distance || null,
  }
}
