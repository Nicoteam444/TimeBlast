// ── Client Lucca — appelle le proxy /api/lucca ────────────────────
// Ne contient AUCUNE clé API — tout passe par la Vercel Function
import { supabase } from './supabase'

async function callLucca(action, filters = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Non authentifié')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
  // Fallback: passer la clé Lucca via header si la env var Vercel ne marche pas
  const luccaKey = import.meta.env.VITE_LUCCA_API_KEY
  if (luccaKey) headers['X-Lucca-Key'] = luccaKey

  const res = await fetch('/api/lucca', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, filters }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Erreur Lucca')
  return json.data
}

// ── Endpoints publics ──────────────────────────────────────────────

export const luccaTest = () => callLucca('test')
export const luccaGetUsers = (filters) => callLucca('users', filters)
export const luccaGetLeaves = (filters) => callLucca('leaves', filters)
export const luccaGetLeaveRequests = (filters) => callLucca('leaverequests', filters)
export const luccaGetTimeEntries = (filters) => callLucca('timeentries', filters)
export const luccaGetExpenses = (filters) => callLucca('expenses', filters)
export const luccaGetDepartments = () => callLucca('departments')
export const luccaGetLegalUnits = () => callLucca('legalunits')
export const luccaGetProjects = () => callLucca('projects')
export const luccaFullSync = (filters) => callLucca('sync', filters)

// ── Sync vers Supabase ─────────────────────────────────────────────

export async function syncUsersToSupabase() {
  const users = await luccaGetUsers()
  const results = { created: 0, updated: 0, errors: [] }

  for (const u of users) {
    const mapped = {
      nom: u.lastName || '',
      prenom: u.firstName || '',
      email: u.mail || '',
      poste: u.jobTitle || '',
      date_embauche: u.dtContractStart || null,
      date_naissance: u.birthDate || null,
      lucca_id: String(u.id),
    }

    // Check if user already exists by lucca_id
    const { data: existing } = await supabase
      .from('equipe')
      .select('id')
      .eq('lucca_id', String(u.id))
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('equipe').update(mapped).eq('id', existing.id)
      if (error) results.errors.push(`Update ${u.firstName} ${u.lastName}: ${error.message}`)
      else results.updated++
    } else {
      const { error } = await supabase.from('equipe').insert(mapped)
      if (error) results.errors.push(`Insert ${u.firstName} ${u.lastName}: ${error.message}`)
      else results.created++
    }
  }

  return results
}

export async function syncLeavesToSupabase() {
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const leaves = await luccaGetLeaves({ since })
  const results = { synced: 0, errors: [] }

  for (const l of leaves) {
    const mapped = {
      lucca_id: String(l.id),
      lucca_owner_id: String(l.ownerId),
      date_debut: l.date,
      date_fin: l.endsOn,
      type: l.leaveAccountId ? `type_${l.leaveAccountId}` : 'conge',
      statut: l.isApproved ? 'approuve' : 'en_attente',
      commentaire: l.comment || '',
    }

    const { error } = await supabase
      .from('absences')
      .upsert(mapped, { onConflict: 'lucca_id' })

    if (error) results.errors.push(`Leave ${l.id}: ${error.message}`)
    else results.synced++
  }

  return results
}

export async function syncTimeEntriesToSupabase() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const entries = await luccaGetTimeEntries({ startsAt: since })
  const results = { synced: 0, errors: [] }

  for (const e of entries) {
    const mapped = {
      lucca_id: String(e.id),
      lucca_owner_id: String(e.ownerId),
      date: e.startsAt ? e.startsAt.split('T')[0] : null,
      heures: e.duration || 0,
      commentaire: JSON.stringify({ lucca_comment: e.comment || '', projet_id: e.projectId }),
    }

    const { error } = await supabase
      .from('saisies_temps')
      .upsert(mapped, { onConflict: 'lucca_id' })

    if (error) results.errors.push(`TimeEntry ${e.id}: ${error.message}`)
    else results.synced++
  }

  return results
}
