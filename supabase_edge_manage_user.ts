import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') throw new Error('Accès refusé')

    const { action, ...payload } = await req.json()

    // --- Créer un utilisateur ---
    if (action === 'create') {
      const { email, full_name, role, password, send_invite } = payload
      let created

      if (send_invite === false && password) {
        // Mode mot de passe direct : créer avec email confirmé
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        })
        if (error) throw error
        created = data.user
      } else {
        // Mode invitation par email
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name },
          redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/set-password`,
        })
        if (error) throw error
        created = data.user
      }

      // Mettre à jour le profil créé automatiquement par le trigger
      await supabaseAdmin
        .from('profiles')
        .update({ full_name, role })
        .eq('id', created.id)

      return new Response(JSON.stringify({ user: created }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- Supprimer un utilisateur ---
    if (action === 'delete') {
      const { user_id } = payload
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Action inconnue')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
