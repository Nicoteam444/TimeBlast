// ── Microsoft Graph API — Sync Calendrier Outlook ──────────────────
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function graphFetch(token, endpoint, options = {}) {
  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Graph API ${res.status}`)
  }
  if (res.status === 204) return null // DELETE returns 204
  return res.json()
}

// ── Lire les événements Outlook ────────────────────────────────────
export async function getOutlookEvents(token, startDate, endDate) {
  const start = new Date(startDate).toISOString()
  const end = new Date(endDate).toISOString()
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $top: '200',
    $orderby: 'start/dateTime',
    $select: 'id,subject,start,end,location,isAllDay,bodyPreview,organizer,showAs,categories',
  })
  const data = await graphFetch(token, `/me/calendarView?${params}`)
  return (data?.value || []).map(ev => ({
    outlookId: ev.id,
    title: ev.subject || '(sans titre)',
    start: ev.start?.dateTime ? new Date(ev.start.dateTime + 'Z') : null,
    end: ev.end?.dateTime ? new Date(ev.end.dateTime + 'Z') : null,
    isAllDay: ev.isAllDay || false,
    location: ev.location?.displayName || '',
    description: ev.bodyPreview || '',
    organizer: ev.organizer?.emailAddress?.name || '',
    showAs: ev.showAs || 'busy',
    categories: ev.categories || [],
    source: 'outlook',
  }))
}

// ── Créer un événement dans Outlook ────────────────────────────────
export async function createOutlookEvent(token, event) {
  const body = {
    subject: event.title,
    start: {
      dateTime: event.start instanceof Date ? event.start.toISOString() : event.start,
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: event.end instanceof Date ? event.end.toISOString() : event.end,
      timeZone: 'Europe/Paris',
    },
    isAllDay: event.isAllDay || false,
    body: event.description ? { contentType: 'Text', content: event.description } : undefined,
    location: event.location ? { displayName: event.location } : undefined,
  }
  return graphFetch(token, '/me/events', { method: 'POST', body: JSON.stringify(body) })
}

// ── Mettre à jour un événement Outlook ─────────────────────────────
export async function updateOutlookEvent(token, outlookId, updates) {
  const body = {}
  if (updates.title !== undefined) body.subject = updates.title
  if (updates.start !== undefined) body.start = { dateTime: updates.start instanceof Date ? updates.start.toISOString() : updates.start, timeZone: 'Europe/Paris' }
  if (updates.end !== undefined) body.end = { dateTime: updates.end instanceof Date ? updates.end.toISOString() : updates.end, timeZone: 'Europe/Paris' }
  if (updates.description !== undefined) body.body = { contentType: 'Text', content: updates.description }
  if (updates.location !== undefined) body.location = { displayName: updates.location }
  return graphFetch(token, `/me/events/${outlookId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

// ── Supprimer un événement Outlook ─────────────────────────────────
export async function deleteOutlookEvent(token, outlookId) {
  return graphFetch(token, `/me/events/${outlookId}`, { method: 'DELETE' })
}

// ── Vérifier si le token est valide ────────────────────────────────
export async function checkGraphToken(token) {
  try {
    await graphFetch(token, '/me')
    return true
  } catch {
    return false
  }
}
