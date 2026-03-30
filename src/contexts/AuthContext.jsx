import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase, defaultUrl, defaultKey, resetToMasterClient } from '../lib/supabase'

// Client dédié master — toujours pointe vers la base principale,
// même si switchSupabaseClient() a reconfiguré le proxy partagé.
// detectSessionInUrl: false → ne tente PAS d'échanger le code PKCE
// (seul le client proxy principal gère ça, pour éviter la double tentative
//  qui cause "Unable to exchange external code: 1.AT")
const masterClient = createClient(defaultUrl, defaultKey, {
  auth: {
    detectSessionInUrl: false,
    autoRefreshToken: false, // le client principal gère le refresh
  }
})

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Détecter un callback PKCE (?code=) ou implicite (#access_token)
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    const hasPKCECode = !!params.get('code')
    const hasImplicitToken = hash.includes('access_token') || hash.includes('refresh_token')
    const isOAuthCallback = hasPKCECode || hasImplicitToken

    if (params.get('error')) {
      console.error('[Auth] OAuth error:', params.get('error'), params.get('error_description'))
    }

    // getSession() gère l'échange PKCE en interne et retourne la session finale
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession result:', session?.user?.email || 'null', 'isOAuth:', isOAuthCallback)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] event=%s user=%s isOAuthCallback=%s', event, session?.user?.email||'null', isOAuthCallback)
      // Ignorer INITIAL_SESSION null pendant l'échange PKCE pour éviter une
      // redirection prématurée vers /login avant que getSession() ait fini
      if (event === 'INITIAL_SESSION' && !session && isOAuthCallback) {
        console.log('[Auth] Skipping INITIAL_SESSION null (OAuth in progress)')
        return
      }
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, retries = 3) {
    const { data } = await masterClient.from('profiles').select('*').eq('id', userId).single()
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
      const { data: prof } = await masterClient.from('profiles').select('actif').eq('id', authData.user.id).single()
      if (prof && prof.actif === false) {
        await supabase.auth.signOut()
        return { error: { message: 'Votre compte a été désactivé. Contactez votre administrateur.' } }
      }
    }
    return { error: null }
  }

  async function signInWithMicrosoft() {
    resetToMasterClient() // S'assurer qu'on utilise le client master (Azure configuré ici)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: window.location.origin + '/'}
    })
    // Sauvegarder l'URL OAuth dans sessionStorage (survit à la navigation)
    try {
      const url = data?.url || 'null'
      sessionStorage.setItem('__sso_oauth_url', url)
      // Extraire redirect_to du paramètre state ou de l'URL directement
      const parsed = url !== 'null' ? new URL(url) : null
      const redirectUri = parsed?.searchParams?.get('redirect_uri') || parsed?.searchParams?.get('redirect_to') || 'non trouvé'
      sessionStorage.setItem('__sso_redirect_uri', redirectUri)
    } catch {}
    return { error }
  }

  // Récupérer le provider_token Microsoft (pour API Graph)
  function getMicrosoftToken() {
    return supabase.auth.getSession().then(({ data }) => data?.session?.provider_token || null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    resetToMasterClient() // Remettre sur master après déconnexion
  }

  const hasRole = (...roles) => profile && roles.includes(profile.role)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithMicrosoft, signOut, hasRole, getMicrosoftToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
