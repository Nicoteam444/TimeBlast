import { createClient } from '@supabase/supabase-js'

export const defaultUrl = import.meta.env.VITE_SUPABASE_URL
export const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Client Supabase mutable — peut être reconfiguré pour pointer vers un autre env
// flowType: 'implicit' → le token arrive dans le hash (#access_token=xxx)
// au lieu du flow PKCE qui nécessite un échange serveur (cause de l'erreur 1.AT Azure)
let _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'implicit' } })
let _currentUrl = defaultUrl

export const supabase = new Proxy({}, {
  get(_, prop) {
    return _client[prop]
  }
})

// Reconfigurer le client pour un autre environnement
export function switchSupabaseClient(url, anonKey) {
  if (url === _currentUrl) return // Déjà sur ce client
  _client = createClient(url, anonKey)
  _currentUrl = url
  console.log(`[Supabase] Client switché vers ${url}`)
}

// Remettre le client sur la base master (appelé au sign-out et avant sign-in)
export function resetToMasterClient() {
  if (_currentUrl === defaultUrl) return
  _client = createClient(defaultUrl, defaultKey, { auth: { flowType: 'implicit' } })
  _currentUrl = defaultUrl
  console.log('[Supabase] Client resetté sur master')
}

// Obtenir l'URL courante
export function getCurrentSupabaseUrl() {
  return _currentUrl
}
