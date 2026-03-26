import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const EnvContext = createContext(null)

export function EnvProvider({ children }) {
  const { user } = useAuth()
  const [environments, setEnvironments] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null)
  const [loading, setLoading] = useState(true)

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

      // Détecter l'env actuel à partir de l'URL Supabase
      const currentUrl = import.meta.env.VITE_SUPABASE_URL
      const match = envs.find(e => e.supabase_url === currentUrl)
      setCurrentEnv(match || envs[0] || null)
    } catch (err) {
      console.error('Erreur chargement environnements:', err)
    } finally {
      setLoading(false)
    }
  }

  function setCurrentEnvByCode(code) {
    const env = environments.find(e => e.env_code === code)
    if (env) setCurrentEnv(env)
  }

  function switchEnvironment(env) {
    if (!env || env.id === currentEnv?.id) return
    const currentPath = window.location.pathname
    const pathWithoutEnv = currentPath.replace(/^\/\d{7}/, '') || '/'
    const newPath = `/${env.env_code}${pathWithoutEnv}`

    // Si même base Supabase → navigation locale
    if (env.supabase_url === currentEnv?.supabase_url) {
      window.location.href = newPath
      return
    }

    // Si base différente → redirection vers l'autre domaine Vercel
    // Mapper supabase_url → domaine Vercel
    const ENV_DOMAINS = {
      'https://ldeoqrafauwdgrpbyfyx.supabase.co': 'https://timeblast.ai',
      'https://cozqovnmqvttmymozwto.supabase.co': 'https://timeblast-prod.vercel.app',
    }
    const targetDomain = ENV_DOMAINS[env.supabase_url] || window.location.origin
    window.location.href = `${targetDomain}${newPath}`
  }

  return (
    <EnvContext.Provider value={{ environments, currentEnv, setCurrentEnvByCode, switchEnvironment, loading }}>
      {children}
    </EnvContext.Provider>
  )
}

export const useEnv = () => useContext(EnvContext)
