import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-env-code',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifie' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create admin client to check user access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // ── GET /env-proxy/list — Liste les envs accessibles ──
    if (action === 'list' || req.method === 'GET') {
      const { data: envs, error } = await adminClient
        .from('user_environments')
        .select('role, environments(id, env_code, name, description, is_production, is_active, supabase_url)')
        .eq('user_id', user.id)

      if (error) throw error

      const result = (envs || [])
        .map((ue: any) => ({
          ...ue.environments,
          userRole: ue.role,
          // NE PAS renvoyer supabase_anon_key ici — seulement via /connect
        }))
        .filter((e: any) => e && e.is_active)

      // Supprimer supabase_url de la réponse list (sécurité)
      const safe = result.map((e: any) => ({
        id: e.id,
        env_code: e.env_code,
        name: e.name,
        description: e.description,
        is_production: e.is_production,
        userRole: e.userRole,
      }))

      return new Response(JSON.stringify({ environments: safe }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── POST /env-proxy/connect — Obtenir les credentials d'un env ──
    if (action === 'connect') {
      const { env_code } = await req.json()
      if (!env_code) {
        return new Response(JSON.stringify({ error: 'env_code requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Vérifier que l'user a accès à cet env
      const { data: access } = await adminClient
        .from('user_environments')
        .select('role, environments!inner(id, env_code, name, supabase_url, supabase_anon_key, is_production)')
        .eq('user_id', user.id)
        .eq('environments.env_code', env_code)
        .single()

      if (!access) {
        return new Response(JSON.stringify({ error: 'Acces refuse' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const env = (access as any).environments
      return new Response(JSON.stringify({
        env_code: env.env_code,
        name: env.name,
        supabase_url: env.supabase_url,
        supabase_anon_key: env.supabase_anon_key,
        is_production: env.is_production,
        role: access.role,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
