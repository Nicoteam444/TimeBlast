import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Log OAuth callback errors
    const hash = window.location.hash
    if (hash && (hash.includes('error') || hash.includes('access_token'))) {
      console.log('[Auth] Callback hash:', hash.substring(0, 200))
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      console.error('[Auth] OAuth error:', params.get('error'), params.get('error_description'))
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session:', session?.user?.email || 'none')
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Event:', event, 'User:', session?.user?.email, 'Provider:', session?.user?.app_metadata?.provider)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, retries = 3) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!data && retries > 0) {
      await new Promise(r => setTimeout(r, 500))
      return fetchProfile(userId, retries - 1)
    }
    // Bloquer les comptes désactivés
    if (data && data.actif === false) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    // Vérifier si le compte est désactivé
    if (authData?.user) {
      const { data: prof } = await supabase.from('profiles').select('actif').eq('id', authData.user.id).single()
      if (prof && prof.actif === false) {
        await supabase.auth.signOut()
        return { error: { message: 'Votre compte a été désactivé. Contactez votre administrateur.' } }
      }
    }
    return { error: null }
  }

  async function signInWithMicrosoft() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile Calendars.ReadWrite',
        redirectTo: window.location.origin + '/'}
    })
    return { error }
  }

  // Récupérer le provider_token Microsoft (pour API Graph)
  function getMicrosoftToken() {
    return supabase.auth.getSession().then(({ data }) => data?.session?.provider_token || null)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const hasRole = (...roles) => profile && roles.includes(profile.role)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithMicrosoft, signOut, hasRole, getMicrosoftToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
