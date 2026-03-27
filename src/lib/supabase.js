import { createClient } from '@supabase/supabase-js'

export const defaultUrl = import.meta.env.VITE_SUPABASE_URL
export const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Client Supabase mutable — peut être reconfiguré pour pointer vers un autre env
let _client = createClient(defaultUrl, defaultKey)
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

// Obtenir l'URL courante
export function getCurrentSupabaseUrl() {
  return _currentUrl
}
