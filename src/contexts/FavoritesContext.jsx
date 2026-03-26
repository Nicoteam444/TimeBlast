import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  loadFavoritesLocal,
  saveFavoritesLocal,
  loadFavoritesFromDB,
  addFavoriteToDBAsync,
  removeFavoriteFromDBAsync,
  migrateLocalFavoritesToDB,
  shouldMigrateToDatabase,
  syncDatabaseToLocal,
  subscribeToFavoritesChanges} from '../lib/favoritesSync'

const FavoritesContext = createContext()

export function FavoritesProvider({ children }) {
  const { profile } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [favLabels, setFavLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tb_fav_labels') || '{}') } catch { return {} }
  })
  const [customLabels, setCustomLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tb_fav_custom') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Initialize favorites on mount and when user changes
  useEffect(() => {
    const initFavorites = async () => {
      setLoading(true)
      try {
        if (profile?.id) {
          // Check if migration needed
          if (shouldMigrateToDatabase(profile.id)) {
            await migrateLocalFavoritesToDB(profile.id)
          }

          // Load from database
          const dbFavs = await loadFavoritesFromDB(profile.id)
          setFavorites(dbFavs)
        } else {
          // Not logged in, use localStorage
          const localFavs = loadFavoritesLocal()
          setFavorites(localFavs)
        }
      } catch (err) {
        console.error('Error initializing favorites:', err)
        // Fallback to localStorage
        const localFavs = loadFavoritesLocal()
        setFavorites(localFavs)
      } finally {
        setLoading(false)
      }
    }

    initFavorites()
  }, [profile?.id])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!profile?.id) return

    const onAdd = (routePath) => {
      setFavorites(prev => {
        if (!prev.includes(routePath)) {
          return [...prev, routePath]
        }
        return prev
      })
    }

    const onRemove = (routePath) => {
      setFavorites(prev => prev.filter(r => r !== routePath))
    }

    // Realtime subscription disabled — not essential
    return () => {}
  }, [profile?.id])

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (routePath, label) => {
      if (!routePath) return

      const isFav = favorites.includes(routePath)
      const newFavs = isFav
        ? favorites.filter(r => r !== routePath)
        : [...favorites, routePath]

      // Store label for dynamic pages
      if (!isFav && label) {
        setFavLabels(prev => {
          const updated = { ...prev, [routePath]: label }
          localStorage.setItem('tb_fav_labels', JSON.stringify(updated))
          return updated
        })
      }
      if (isFav) {
        setFavLabels(prev => {
          const updated = { ...prev }
          delete updated[routePath]
          localStorage.setItem('tb_fav_labels', JSON.stringify(updated))
          return updated
        })
      }

      // Update UI immediately (optimistic)
      setFavorites(newFavs)

      // Save to localStorage (always)
      saveFavoritesLocal(newFavs)

      // Sync to database if logged in
      if (profile?.id) {
        setSyncing(true)
        try {
          if (isFav) {
            await removeFavoriteFromDBAsync(profile.id, routePath)
          } else {
            await addFavoriteToDBAsync(profile.id, routePath)
          }
        } catch (err) {
          console.error('Error syncing favorite:', err)
          // Revert on error
          setFavorites(favorites)
        } finally {
          setSyncing(false)
        }
      }
    },
    [favorites, profile?.id]
  )

  // Update label for an existing favorite (auto-refresh)
  const updateFavLabel = useCallback((routePath, label, isManual = false) => {
    if (!routePath || !label) return
    // Si ce favori a un label custom, ne pas écraser par l'auto-update
    if (!isManual && customLabels.includes(routePath)) return
    setFavLabels(prev => {
      const updated = { ...prev, [routePath]: label }
      localStorage.setItem('tb_fav_labels', JSON.stringify(updated))
      return updated
    })
    if (isManual) {
      setCustomLabels(prev => {
        const updated = prev.includes(routePath) ? prev : [...prev, routePath]
        localStorage.setItem('tb_fav_custom', JSON.stringify(updated))
        return updated
      })
    }
  }, [customLabels])

  // Check if a route is favorited
  const isFavorite = useCallback(
    (routePath) => favorites.includes(routePath),
    [favorites]
  )

  const value = {
    favorites,
    favLabels,
    loading,
    syncing,
    toggleFavorite,
    updateFavLabel,
    isFavorite}

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}
