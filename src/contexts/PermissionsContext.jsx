import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const PermissionsContext = createContext(null)

const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

export function PermissionsProvider({ children }) {
  const { user, profile } = useAuth()
  const [permMap, setPermMap] = useState({}) // { "module:sub_module": { can_view, can_create, can_edit, can_delete } }
  const [loaded, setLoaded] = useState(false)

  const isSuperAdmin = (user?.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL

  useEffect(() => {
    if (!profile?.role) { setPermMap({}); setLoaded(false); return }
    loadPermissions(profile.role)
  }, [profile?.role])

  async function loadPermissions(role) {
    if (isSuperAdmin) {
      // Super admin a tout
      setPermMap({})
      setLoaded(true)
      return
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .select('module, sub_module, can_view, can_create, can_edit, can_delete')
      .eq('role', role)

    if (error) {
      console.error('[Permissions] Erreur chargement:', error.message)
      setPermMap({})
      setLoaded(true)
      return
    }

    const map = {}
    for (const row of (data || [])) {
      map[`${row.module}:${row.sub_module}`] = {
        can_view: row.can_view,
        can_create: row.can_create,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
      }
    }
    setPermMap(map)
    setLoaded(true)
  }

  // Vérifie si le rôle courant peut voir un module:sub_module
  // Si aucune permission n'est enregistrée en base, retourne true (fallback permissif)
  const canView = useCallback((permKey) => {
    if (!permKey) return true
    if (isSuperAdmin) return true
    const entry = permMap[permKey]
    if (!entry) return true // pas de row en base = pas encore configuré = on laisse passer
    return entry.can_view === true
  }, [permMap, isSuperAdmin])

  const canCreate = useCallback((permKey) => {
    if (!permKey) return true
    if (isSuperAdmin) return true
    const entry = permMap[permKey]
    if (!entry) return true
    return entry.can_create === true
  }, [permMap, isSuperAdmin])

  const canEdit = useCallback((permKey) => {
    if (!permKey) return true
    if (isSuperAdmin) return true
    const entry = permMap[permKey]
    if (!entry) return true
    return entry.can_edit === true
  }, [permMap, isSuperAdmin])

  const canDelete = useCallback((permKey) => {
    if (!permKey) return true
    if (isSuperAdmin) return true
    const entry = permMap[permKey]
    if (!entry) return true
    return entry.can_delete === true
  }, [permMap, isSuperAdmin])

  // Recharger les permissions (après save dans la matrice admin)
  const reload = useCallback(() => {
    if (profile?.role) loadPermissions(profile.role)
  }, [profile?.role])

  return (
    <PermissionsContext.Provider value={{ canView, canCreate, canEdit, canDelete, loaded, reload }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext) || { canView: () => true, canCreate: () => true, canEdit: () => true, canDelete: () => true, loaded: false, reload: () => {} }
}
