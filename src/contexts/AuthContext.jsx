import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, retries = 3) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!data && retries > 0) {
      // Retry pour laisser le trigger handle_new_user créer le profil (OAuth)
      await new Promise(r => setTimeout(r, 500))
      return fetchProfile(userId, retries - 1)
    }
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signInWithMicrosoft() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: window.location.origin + '/',
      }
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const hasRole = (...roles) => profile && roles.includes(profile.role)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithMicrosoft, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
