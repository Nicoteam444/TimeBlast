import { supabase } from './supabase'

/**
 * Favorites Sync Service
 * Synchronize user bookmarks between localStorage and Supabase database
 */

const FAV_KEY = 'timeblast_favorites'
const SYNC_KEY = 'timeblast_favorites_synced'

/**
 * Load favorites from localStorage
 */
export function loadFavoritesLocal() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Save favorites to localStorage
 */
export function saveFavoritesLocal(favs) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  } catch {}
}

/**
 * Load favorites from database
 */
export async function loadFavoritesFromDB(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('route_path')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading favorites from DB:', error)
      return []
    }

    return data ? data.map(item => item.route_path) : []
  } catch (err) {
    console.error('Error loading favorites:', err)
    return []
  }
}

/**
 * Add favorite to database
 */
export async function addFavoriteToDBAsync(userId, routePath) {
  if (!userId || !routePath) return false
  try {
    const { error } = await supabase
      .from('user_favorites')
      .insert([{ user_id: userId, route_path: routePath }])

    if (error) {
      // Unique constraint might fail, that's ok
      if (!error.message.includes('duplicate')) {
        console.error('Error adding favorite:', error)
        return false
      }
    }
    return true
  } catch (err) {
    console.error('Error adding favorite:', err)
    return false
  }
}

/**
 * Remove favorite from database
 */
export async function removeFavoriteFromDBAsync(userId, routePath) {
  if (!userId || !routePath) return false
  try {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('route_path', routePath)

    if (error) {
      console.error('Error removing favorite:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Error removing favorite:', err)
    return false
  }
}

/**
 * Migrate localStorage favorites to database (one-time)
 */
export async function migrateLocalFavoritesToDB(userId) {
  if (!userId) return false

  const localFavs = loadFavoritesLocal()
  if (localFavs.length === 0) return true

  try {
    const toInsert = localFavs.map(route_path => ({
      user_id: userId,
      route_path,
    }))

    // Ignore duplicates
    const { error } = await supabase
      .from('user_favorites')
      .insert(toInsert)

    if (error && !error.message.includes('duplicate')) {
      console.error('Error migrating favorites:', error)
      return false
    }

    // Mark as synced
    localStorage.setItem(SYNC_KEY, 'true')
    return true
  } catch (err) {
    console.error('Error migrating favorites:', err)
    return false
  }
}

/**
 * Check if first-time sync needed
 */
export function shouldMigrateToDatabase(userId) {
  if (!userId) return false
  const alreadySynced = localStorage.getItem(SYNC_KEY) === 'true'
  return !alreadySynced && loadFavoritesLocal().length > 0
}

/**
 * Subscribe to real-time changes from other devices
 */
export function subscribeToFavoritesChanges(userId, onAdd, onRemove) {
  if (!userId) return null

  try {
    const subscription = supabase
      .channel(`favorites-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_favorites', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          onAdd?.(payload.new.route_path)
        } else if (payload.eventType === 'DELETE') {
          onRemove?.(payload.old.route_path)
        }
      })
      .subscribe()

    return subscription
  } catch (err) {
    console.error('Error subscribing to favorites:', err)
    return null
  }
}

/**
 * Sync favorites from database to localStorage (for offline support)
 */
export async function syncDatabaseToLocal(userId) {
  if (!userId) return []

  const dbFavs = await loadFavoritesFromDB(userId)
  saveFavoritesLocal(dbFavs)
  return dbFavs
}
