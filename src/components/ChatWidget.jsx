import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSociete } from '../contexts/SocieteContext'
import { useAuth } from '../contexts/AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function fmtEur(n) {
  return (n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function buildSystemPrompt(societe, ctx) {
  const lines = [
    `Tu es un assistant intelligent intégré à la plateforme TimeBlast, un outil de gestion du temps, de la facturation et de la comptabilité.`,
    `Tu réponds toujours en français, de façon concise et professionnelle.`,
    `Tu as accès aux données réelles de la société ci-dessous. Utilise-les pour répondre précisément.`,
    ``,
    `=== SOCIÉTÉ ACTIVE ===`,
    societe ? `${societe.name}` : `Aucune société sélectionnée.`,
    ``,

    // --- Clients ---
    `=== CLIENTS (${ctx.clients?.length || 0}) ===`,
    ctx.clients?.length > 0
      ? ctx.clients.map(c => `• ${c.name}${c.ville ? ' — ' + c.ville : ''}`).join('\n')
      : `Aucun client.`,
    ``,

    // --- Transactions / Pipeline ---
    `=== TRANSACTIONS (${ctx.transactions?.length || 0}) ===`,
    ctx.transactions?.length > 0
      ? [
          `Pipeline total : ${fmtEur(ctx.transactions.reduce((s, t) => s + (parseFloat(t.montant) || 0), 0))}`,
          ...ctx.transactions.slice(0, 30).map(t =>
            `• ${t.name || '—'} | ${t.client_name || '—'} | ${fmtEur(t.montant)} | phase: ${t.phase || '—'}`
          ),
          ctx.transactions.length > 30 ? `  ... et ${ctx.transactions.length - 30} autres` : '',
        ].filter(Boolean).join('\n')
      : `Aucune transaction.`,
    ``,

    // --- Projets ---
    `=== PROJETS (${ctx.projets?.length || 0}) ===`,
    ctx.projets?.length > 0
      ? ctx.projets.slice(0, 30).map(p =>
          `• ${p.name}${p.client_name ? ' — client: ' + p.client_name : ''} | ${p.statut || 'actif'}`
        ).join('\n')
      : `Aucun projet.`,
    ``,

    // --- Factures ---
    `=== FACTURES (${ctx.factures?.length || 0}) ===`,
    ctx.factures?.length > 0
      ? [
          ...ctx.factures.slice(0, 20).map(f =>
            `• ${f.num_facture || '—'} | ${f.client_nom || '—'} | ${fmtEur(f.total_ttc)} | ${f.statut || '—'} | ${f.date_emission || '—'} | ${f.objet || ''}`
          ),
          `Brouillon: ${fmtEur(ctx.factures.filter(f => f.statut === 'brouillon').reduce((s, f) => s + (parseFloat(f.total_ttc) || 0), 0))}`,
          `Envoyées: ${fmtEur(ctx.factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (parseFloat(f.total_ttc) || 0), 0))}`,
          `Payées: ${fmtEur(ctx.factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (parseFloat(f.total_ttc) || 0), 0))}`,
          `En retard: ${fmtEur(ctx.factures.filter(f => f.statut === 'en_retard').reduce((s, f) => s + (parseFloat(f.total_ttc) || 0), 0))}`,
        ].join('\n')
      : `Aucune facture.`,
    ``,

    // --- Équipe ---
    `=== ÉQUIPE (${ctx.equipe?.length || 0} collaborateurs) ===`,
    ctx.equipe?.length > 0
      ? ctx.equipe.slice(0, 30).map(e =>
          `• ${e.full_name || '—'} | ${e.poste || '—'}`
        ).join('\n')
      : `Aucun collaborateur.`,
    ``,

    // --- Immobilisations ---
    `=== IMMOBILISATIONS (${ctx.immos?.length || 0}) ===`,
    ctx.immos?.length > 0
      ? [
          `Valeur brute totale : ${fmtEur(ctx.immos.reduce((s, i) => s + (parseFloat(i.valeur_brute) || 0), 0))}`,
          ...ctx.immos.slice(0, 20).map(i =>
            `• ${i.libelle} | ${i.categorie || '—'} | ${fmtEur(i.valeur_brute)} | ${i.statut || 'actif'}`
          ),
        ].join('\n')
      : `Aucune immobilisation.`,
    ``,

    // --- Achats ---
    `=== ACHATS (${ctx.achats?.length || 0}) ===`,
    ctx.achats?.length > 0
      ? [
          `Total achats : ${fmtEur(ctx.achats.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0))}`,
          ...ctx.achats.slice(0, 15).map(a =>
            `• ${a.fournisseur || '—'} | ${a.reference || '—'} | ${fmtEur(a.montant)} | ${a.categorie || '—'}`
          ),
        ].join('\n')
      : `Aucun achat.`,
    ``,

    // --- FEC ---
    `=== DONNÉES COMPTABLES (FEC) ===`,
    ctx.fecImports?.length > 0
      ? ctx.fecImports.map(f => {
          const meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : f.meta
          return `• Exercice ${meta?.exercice || '?'} : ${meta?.nb_lignes || '?'} écritures`
        }).join('\n')
      : `Aucun import FEC.`,
    ``,

    // --- Saisies temps ---
    `=== SAISIES TEMPS (semaine en cours) ===`,
    ctx.saisies?.length > 0
      ? `${ctx.saisies.reduce((s, st) => s + (parseFloat(st.heures) || 0), 0)}h saisies cette semaine sur ${ctx.saisies.length} entrée(s)`
      : `Aucune saisie cette semaine.`,
    ``,

    `=== INSTRUCTIONS ===`,
    `Réponds aux questions en utilisant les données réelles ci-dessus.`,
    `Sois précis avec les chiffres. Si une donnée manque, dis-le.`,
    `Ne génère jamais de fausses données.`,
    ``,
    `Tu peux CRÉER et MODIFIER des données dans la base via les outils disponibles :`,
    `- Créer des transactions commerciales (table: transactions)`,
    `- Saisir des interventions/temps (table: saisies_temps)`,
    `- Ajouter des collaborateurs (table: equipe)`,
    `- Créer des clients (table: clients)`,
    `- Créer des projets (table: projets)`,
    `Quand l'utilisateur te demande de créer quelque chose, utilise directement l'outil insert_record.`,
    `Si tu as besoin d'un client_id pour une transaction, utilise d'abord query_records pour le trouver.`,
    societe ? `Utilise societe_id: "${societe.id}" pour les nouveaux enregistrements.` : '',
  ]
  return lines.join('\n')
}

const HISTORY_KEY = 'timeblast_chat_history'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))) } catch {}
}

export default function ChatWidget() {
  const { selectedSociete } = useSociete()
  const { profile } = useAuth()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [ctxLoading, setCtxLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())
  const [activeConvId, setActiveConvId] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  // Sauvegarder la conversation active dans l'historique
  useEffect(() => {
    if (messages.length < 2) return // au moins 1 user + 1 assistant
    const lastAssistant = messages.filter(m => m.role === 'assistant' && m.content && !m.isError)
    if (lastAssistant.length === 0) return

    const title = messages.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Conversation'
    const convId = activeConvId || Date.now().toString()
    if (!activeConvId) setActiveConvId(convId)

    setHistory(prev => {
      const existing = prev.filter(c => c.id !== convId)
      const updated = [
        { id: convId, title, messages, date: new Date().toISOString(), societe: selectedSociete?.name },
        ...existing,
      ].slice(0, 20)
      saveHistory(updated)
      return updated
    })
  }, [messages])

  useEffect(() => {
    if (!open) return
    loadContext()
  }, [open, selectedSociete?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function loadContext() {
    setCtxLoading(true)
    try {
      const sid = selectedSociete?.id
      const filter = q => sid ? q.eq('societe_id', sid) : q

      // Helper pour requêtes sécurisées (table peut ne pas exister)
      const safeQuery = async (query) => {
        try { const { data } = await query; return data || [] }
        catch { return [] }
      }

      // Semaine en cours pour saisies temps
      const now = new Date()
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const toISO = d => d.toISOString().slice(0, 10)

      // Clients : societe_id souvent null, on charge sans filtre societe si vide
      const filterOrAll = async (table, select, order, limit) => {
        let data = await safeQuery(filter(supabase.from(table).select(select).order(order).limit(limit)))
        if (data.length === 0 && sid) {
          data = await safeQuery(supabase.from(table).select(select).order(order).limit(limit))
        }
        return data
      }

      const [clients, transactions, projets, factures, equipe, immos, achats, fecImports, saisies] = await Promise.all([
        filterOrAll('clients', 'name, ville', 'name', 50),
        safeQuery(filter(supabase.from('transactions').select('name, montant, phase, clients(name)').order('created_at', { ascending: false }).limit(50))),
        safeQuery(filter(supabase.from('projets').select('name, statut, clients(name)').order('name').limit(50))),
        safeQuery(filter(supabase.from('factures').select('num_facture, total_ttc, statut, date_emission, client_nom, objet').order('date_emission', { ascending: false }).limit(30))),
        safeQuery(filter(supabase.from('equipe').select('nom, prenom, poste').order('nom').limit(50))),
        safeQuery(filter(supabase.from('immobilisations').select('libelle, categorie, valeur_brute, statut').order('libelle').limit(30))),
        safeQuery(filter(supabase.from('achats').select('fournisseur, reference, montant, categorie').order('created_at', { ascending: false }).limit(20))),
        safeQuery(filter(supabase.from('fec_imports').select('meta').order('created_at', { ascending: false }).limit(5))),
        safeQuery(
          profile?.id
            ? supabase.from('saisies_temps').select('heures, date').eq('user_id', profile.id).gte('date', toISO(monday)).lte('date', toISO(sunday))
            : Promise.resolve({ data: [] })
        ),
      ])

      setCtx({
        clients,
        transactions: transactions.map(t => ({ ...t, client_name: t.clients?.name })),
        projets: projets.map(p => ({ ...p, client_name: p.clients?.name })),
        factures,
        equipe: equipe.map(e => ({ ...e, full_name: [e.prenom, e.nom].filter(Boolean).join(' ') || '—' })),
        immos,
        achats,
        fecImports,
        saisies,
      })
    } catch (e) {
      console.error('ChatWidget context error', e)
      setCtx({ clients: [], transactions: [], projets: [], factures: [], equipe: [], immos: [], achats: [], fecImports: [], saisies: [] })
    }
    setCtxLoading(false)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setError(null)
    setInput('')
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const systemPrompt = ctx
        ? buildSystemPrompt(selectedSociete, ctx)
        : `Tu es un assistant TimeBlast. Réponds en français.`

      abortRef.current = new AbortController()

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body?.error || `HTTP ${response.status}`)
      }

      const text = body.text || body.error || 'Pas de réponse.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: text,
        }
        return updated
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Claude API error', err)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `❌ Erreur : ${err.message}`,
          isError: true,
        }
        return updated
      })
      setError(null)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleClose() {
    if (loading && abortRef.current) abortRef.current.abort()
    setOpen(false)
  }

  function clearChat() {
    if (loading && abortRef.current) abortRef.current.abort()
    setMessages([])
    setError(null)
    setActiveConvId(null)
  }

  function loadConversation(conv) {
    setMessages(conv.messages)
    setActiveConvId(conv.id)
    setShowHistory(false)
    setError(null)
  }

  function deleteConversation(convId, e) {
    e.stopPropagation()
    setHistory(prev => {
      const updated = prev.filter(c => c.id !== convId)
      saveHistory(updated)
      return updated
    })
    if (activeConvId === convId) clearChat()
  }

  return (
    <>
      {/* Floating button */}
      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => open ? handleClose() : setOpen(true)}
        title="Chat IA"
        aria-label="Ouvrir le chat IA"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              <span className="chat-panel-icon">🤖</span>
              <div>
                <span className="chat-panel-name">Assistant IA</span>
                {selectedSociete && (
                  <span className="chat-panel-societe">{selectedSociete.name}</span>
                )}
              </div>
            </div>
            <div className="chat-panel-actions">
              <button className="chat-panel-clear" onClick={() => setShowHistory(!showHistory)} title="Historique" style={{ opacity: showHistory ? 1 : 0.6 }}>
                📋
              </button>
              {messages.length > 0 && (
                <button className="chat-panel-clear" onClick={clearChat} title="Nouvelle conversation">
                  ✚
                </button>
              )}
              <button className="chat-panel-close" onClick={handleClose} title="Fermer">
                ✕
              </button>
            </div>
          </div>

          {/* Historique */}
          {showHistory && (
            <div className="chat-history-panel">
              <div className="chat-history-title">Conversations récentes</div>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem 0' }}>Aucun historique.</p>
              ) : (
                history.map(conv => (
                  <div
                    key={conv.id}
                    className={`chat-history-item ${conv.id === activeConvId ? 'chat-history-item--active' : ''}`}
                    onClick={() => loadConversation(conv)}
                  >
                    <div className="chat-history-item-content">
                      <span className="chat-history-item-title">{conv.title}</span>
                      <span className="chat-history-item-meta">
                        {conv.societe && <span>{conv.societe}</span>}
                        {conv.date && <span>{new Date(conv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                      </span>
                    </div>
                    <button
                      className="chat-history-item-delete"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      title="Supprimer"
                    >✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages" style={{ display: showHistory ? 'none' : undefined }}>
            {ctxLoading && messages.length === 0 && (
              <div className="chat-loading-ctx">
                <span className="chat-dots"><span /><span /><span /></span>
                Chargement du contexte…
              </div>
            )}

            {!ctxLoading && messages.length === 0 && (
              <div className="chat-welcome">
                <p>Bonjour{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''} 👋</p>
                <p>Je suis votre assistant IA. Posez-moi des questions sur vos données{selectedSociete ? ` pour ${selectedSociete.name}` : ''} !</p>
                <div className="chat-suggestions">
                  {[
                    'Combien de clients ?',
                    'Résumé des transactions',
                    'Taille de l\'équipe',
                  ].map(s => (
                    <button key={s} className="chat-suggestion" onClick={() => { setInput(s); inputRef.current?.focus() }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role} ${msg.isError ? 'chat-msg--error' : ''}`}>
                {msg.role === 'assistant' && (
                  <span className="chat-msg-avatar">🤖</span>
                )}
                <div className="chat-msg-bubble">
                  {msg.content
                    ? msg.content.split('\n').map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split('\n').length - 1 ? <br /> : null}</span>
                      ))
                    : loading && i === messages.length - 1
                      ? <span className="chat-dots"><span /><span /><span /></span>
                      : null
                  }
                </div>
              </div>
            ))}

            {error && (
              <div className="chat-error">{error}</div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-area" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Posez une question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={loading || ctxLoading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || loading || ctxLoading}
              title="Envoyer"
            >
              {loading ? <span className="chat-dots chat-dots--sm"><span /><span /><span /></span> : '▶'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
