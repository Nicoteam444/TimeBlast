import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSociete } from '../contexts/SocieteContext'
import { useAuth } from '../contexts/AuthContext'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

function buildSystemPrompt(societe, ctx) {
  const lines = [
    `Tu es un assistant intelligent intégré à la plateforme TimeBlast, un outil de gestion du temps et des activités.`,
    `Tu réponds toujours en français, de façon concise et professionnelle.`,
    ``,
    `=== CONTEXTE PLATEFORME ===`,
    societe
      ? `Société active : ${societe.name} (ID: ${societe.id})`
      : `Aucune société sélectionnée.`,
    ``,
    `=== DONNÉES DE LA SOCIÉTÉ ===`,
    `• Clients : ${ctx.nbClients} client${ctx.nbClients !== 1 ? 's' : ''}`,
    `• Transactions : ${ctx.nbTransactions} transaction${ctx.nbTransactions !== 1 ? 's' : ''}`,
    `  - Montant total : ${ctx.totalTransactions.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    `• Équipe : ${ctx.nbEquipe} collaborateur${ctx.nbEquipe !== 1 ? 's' : ''}`,
    `• Projets actifs : ${ctx.nbProjets}`,
    ``,
    `=== DONNÉES FINANCIÈRES (FEC) ===`,
    ctx.fecImports.length > 0
      ? ctx.fecImports.map(f => {
          const meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : f.meta
          return `  - Exercice ${meta?.exercice || '?'} : ${meta?.nb_lignes || '?'} écritures importées`
        }).join('\n')
      : `  Aucun import FEC disponible.`,
    ``,
    `=== INSTRUCTIONS ===`,
    `Réponds uniquement aux questions relatives aux données ci-dessus ou à la gestion du temps/activité.`,
    `Si une question dépasse tes données, indique-le poliment.`,
    `Ne génère jamais de fausses données.`,
  ]
  return lines.join('\n')
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

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

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

      const [
        { count: nbClients },
        { count: nbTransactions },
        { data: transactions },
        { count: nbEquipe },
        { count: nbProjets },
        { data: fecImports },
      ] = await Promise.all([
        filter(supabase.from('clients').select('*', { count: 'exact', head: true })),
        filter(supabase.from('transactions').select('*', { count: 'exact', head: true })),
        filter(supabase.from('transactions').select('montant')),
        filter(supabase.from('equipe').select('*', { count: 'exact', head: true })),
        filter(supabase.from('projets').select('*', { count: 'exact', head: true })),
        filter(supabase.from('fec_imports').select('meta').order('created_at', { ascending: false }).limit(5)),
      ])

      const totalTransactions = (transactions || []).reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0)

      setCtx({
        nbClients: nbClients || 0,
        nbTransactions: nbTransactions || 0,
        totalTransactions,
        nbEquipe: nbEquipe || 0,
        nbProjets: nbProjets || 0,
        fecImports: fecImports || [],
      })
    } catch (e) {
      console.error('ChatWidget context error', e)
      setCtx({ nbClients: 0, nbTransactions: 0, totalTransactions: 0, nbEquipe: 0, nbProjets: 0, fecImports: [] })
    }
    setCtxLoading(false)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    if (!API_KEY) {
      setError('Clé API OpenAI non configurée (VITE_OPENAI_API_KEY manquante).')
      return
    }

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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody?.error?.message || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const evt = JSON.parse(data)
            const delta = evt.choices?.[0]?.delta?.content
            if (delta) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + delta,
                }
                return updated
              })
            }
          } catch (_) { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('OpenAI API error', err)
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
              {messages.length > 0 && (
                <button className="chat-panel-clear" onClick={clearChat} title="Effacer">
                  🗑
                </button>
              )}
              <button className="chat-panel-close" onClick={handleClose} title="Fermer">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
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
              rows={1}
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
