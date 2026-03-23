import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const ALLOWED_TABLES: Record<string, string[]> = {
  clients: ['name', 'ville', 'societe_id'],
  transactions: ['name', 'client_id', 'phase', 'montant', 'date_fermeture_prevue', 'notes', 'societe_id'],
  projets: ['name', 'client_id', 'total_jours', 'date_debut', 'date_fin', 'statut', 'societe_id'],
  factures: ['societe_id', 'num_facture', 'date_emission', 'date_echeance', 'statut', 'client_nom', 'client_adresse', 'objet', 'emetteur_nom', 'lignes', 'notes', 'total_ht', 'total_ttc'],
  equipe: ['societe_id', 'nom', 'prenom', 'poste', 'date_naissance', 'date_embauche'],
  immobilisations: ['societe_id', 'numero_comptable', 'libelle', 'categorie', 'date_acquisition', 'valeur_brute', 'duree_amort', 'statut'],
  achats: ['societe_id', 'fournisseur', 'reference', 'montant', 'categorie', 'quantite', 'statut'],
  saisies_temps: ['user_id', 'date', 'heures', 'commentaire', 'societe_id'],
}

const tools = [
  {
    name: 'insert_record',
    description: "Insère un nouvel enregistrement dans une table. Tables: clients, transactions, projets, factures, equipe, immobilisations, achats, saisies_temps. Utilise TOUJOURS cet outil quand l'utilisateur demande de créer quelque chose.",
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nom de la table' },
        data: { type: 'object', description: 'Données à insérer (clé: colonne, valeur: valeur)' },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'update_record',
    description: "Met à jour un enregistrement existant par son ID.",
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nom de la table' },
        id: { type: 'string', description: 'UUID de l\'enregistrement' },
        data: { type: 'object', description: 'Données à modifier' },
      },
      required: ['table', 'id', 'data'],
    },
  },
  {
    name: 'query_records',
    description: "Recherche des enregistrements. Utile pour trouver un client_id avant de créer une transaction liée.",
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nom de la table' },
        select: { type: 'string', description: 'Colonnes (ex: id, name)' },
        filters: { type: 'object', description: 'Filtres égalité (ex: {"name": "Orange"})' },
        ilike_filters: { type: 'object', description: 'Filtres ILIKE pour recherche partielle (ex: {"name": "%orange%"})' },
        limit: { type: 'number', description: 'Max résultats' },
      },
      required: ['table'],
    },
  },
]

function sanitizeData(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const allowed = ALLOWED_TABLES[table]
  if (!allowed) return {}
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) clean[k] = v
  }
  return clean
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === 'insert_record') {
      const table = input.table as string
      if (!ALLOWED_TABLES[table]) return JSON.stringify({ error: `Table "${table}" non autorisée` })
      const cleanData = sanitizeData(table, input.data as Record<string, unknown>)
      if (Object.keys(cleanData).length === 0) return JSON.stringify({ error: 'Aucune colonne valide fournie' })
      const { data, error } = await supabaseAdmin.from(table).insert(cleanData).select().single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, created: data })
    }

    if (name === 'update_record') {
      const table = input.table as string
      if (!ALLOWED_TABLES[table]) return JSON.stringify({ error: `Table "${table}" non autorisée` })
      const cleanData = sanitizeData(table, input.data as Record<string, unknown>)
      const { data, error } = await supabaseAdmin.from(table).update(cleanData).eq('id', input.id).select().single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, updated: data })
    }

    if (name === 'query_records') {
      const table = input.table as string
      let query = supabaseAdmin.from(table).select((input.select as string) || '*')
      const filters = (input.filters as Record<string, unknown>) || {}
      for (const [k, v] of Object.entries(filters)) {
        query = query.eq(k, v)
      }
      const ilikeFilters = (input.ilike_filters as Record<string, unknown>) || {}
      for (const [k, v] of Object.entries(ilikeFilters)) {
        query = query.ilike(k, v as string)
      }
      const { data, error } = await query.limit((input.limit as number) || 10)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ results: data })
    }

    return JSON.stringify({ error: `Tool "${name}" inconnu` })
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message })
  }
}

async function callClaude(messages: unknown[], system: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages,
      tools,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API: ${response.status} — ${err}`)
  }

  return response.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, system } = await req.json()
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY non configurée')

    let currentMessages = [...messages]
    let maxLoops = 5

    while (maxLoops-- > 0) {
      const result = await callClaude(currentMessages, system) as {
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
        stop_reason: string
      }

      if (result.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: result.content })

        const toolResults = []
        for (const block of result.content) {
          if (block.type === 'tool_use') {
            const output = await executeTool(block.name!, block.input!)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: output,
            })
          }
        }
        currentMessages.push({ role: 'user', content: toolResults })
        continue
      }

      const text = result.content
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text?: string }) => b.text || '')
        .join('')

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Trop de boucles tool_use')

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
