import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase, switchSupabaseClient } from '../lib/supabase'

// Les clés anon Supabase sont publiques par design (elles ne donnent accès
// qu'aux données autorisées par les RLS policies). Ce n'est PAS un secret.
// Le vrai secret c'est la service_role key qui n'est JAMAIS côté client.
const ENV_KEYS = {
  'https://ldeoqrafauwdgrpbyfyx.supabase.co': import.meta.env.VITE_SUPABASE_ANON_KEY,
  'https://cozqovnmqvttmymozwto.supabase.co': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenFvdm5tcXZ0dG15bW96d3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjM1MzIsImV4cCI6MjA5MDA5OTUzMn0.r2WQje72fDrgCicpDEtYyxgn1yJN6e6HJbIV3gSLy5E',
}

const EnvContext = createContext(null)

export function EnvProvider({ children }) {
  const { user } = useAuth()
  const [environments, setEnvironments] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientReady, setClientReady] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadEnvironments()
  }, [user?.id])

  async function loadEnvironments() {
    try {
      const { data, error } = await supabase
        .from('user_environments').select('role, environments(id, env_code, name, description, supabase_url, is_production, is_active)').eq('user_id', user.id)

      if (error) throw error

      const envs = (data || []).map(ue => ({ ...ue.environments, userRole: ue.role })).filter(e => e && e.is_active).sort((a, b) => (b.is_production ? 1 : 0) - (a.is_production ? 1 : 0))

      setEnvironments(envs)

      // Détecter l'env actuel à partir de l'envId dans l'URL
      const pathSegments = window.location.pathname.split('/').filter(Boolean)
      const urlEnvCode = pathSegments.length > 0 && /^\d{7}$/.test(pathSegments[0]) ? pathSegments[0] : null
      const match = urlEnvCode ? envs.find(e => e.env_code === urlEnvCode) : null
      const selectedEnv = match || envs.find(e => e.is_production) || envs[0] || null

      setCurrentEnv(selectedEnv)

      // Switcher le client Supabase vers la bonne base
      const anonKey = ENV_KEYS[selectedEnv?.supabase_url]
      if (selectedEnv?.supabase_url && anonKey) {
        switchSupabaseClient(selectedEnv.supabase_url, anonKey)
      }
      setClientReady(true)
    } catch (err) {
      console.error('Erreur chargement environnements:', err)
    } finally {
      setLoading(false)
    }
  }

  function setCurrentEnvByCode(code) {
    const env = environments.find(e => e.env_code === code)
    if (env) {
      setCurrentEnv(env)
      const anonKey = ENV_KEYS[env.supabase_url]
      if (env.supabase_url && anonKey) {
        switchSupabaseClient(env.supabase_url, anonKey)
      }
    }
  }

  function switchEnvironment(env) {
    if (!env || env.id === currentEnv?.id) return
    const currentPath = window.location.pathname
    const pathWithoutEnv = currentPath.replace(/^\/\d{7}/, '') || '/'

    const anonKey = ENV_KEYS[env.supabase_url]
    if (env.supabase_url && anonKey) {
      switchSupabaseClient(env.supabase_url, anonKey)
    }

    setCurrentEnv(env)
    // Changer l'URL (reload pour réinitialiser tous les états)
    window.location.href = `/${env.env_code}${pathWithoutEnv}`
  }

  return (
    <EnvContext.Provider value={{ environments, currentEnv, setCurrentEnvByCode, switchEnvironment, loading, clientReady }}>
      {children}
    </EnvContext.Provider>
  )
}

export const useEnv = () => useContext(EnvContext)
