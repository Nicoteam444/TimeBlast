import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function fmtEur(n) { return (n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

function buildCockpitSystemPrompt(societe, siData) {
  const { apps, infra, flows, agents, securityScore, recommendations } = siData
  return [
    `Tu es un DSI augmente — un assistant IA expert en pilotage de systemes d'information, integre au cockpit SI de TimeBlast.`,
    `Tu reponds toujours en francais, de facon concise et professionnelle.`,
    `Tu as acces a l'architecture SI complete de la societe ci-dessous. Analyse-la pour donner des conseils actionables.`,
    ``,
    `=== SOCIETE ===`,
    societe ? `${societe.name || societe.nom || 'Societe'}` : 'Non definie',
    ``,
    `=== APPLICATIONS SI (${apps.length}) ===`,
    apps.length > 0
      ? apps.map(a => `• ${a.name} | ${a.type} | ${a.category} | ${a.status} | criticite: ${a.criticality} | ${fmtEur(a.monthly_cost)}/mois | ${a.user_count || 0} users | responsable: ${a.owner || '-'}`).join('\n')
      : 'Aucune application.',
    ``,
    `=== INFRASTRUCTURE (${infra.length}) ===`,
    infra.length > 0
      ? infra.map(i => `• ${i.name} | ${i.type} | ${i.provider || '-'} | ${i.status} | sante: ${i.health_status} | ${fmtEur(i.monthly_cost)}/mois`).join('\n')
      : 'Aucune infrastructure.',
    ``,
    `=== FLUX DE DONNEES (${flows.length}) ===`,
    flows.length > 0
      ? flows.map(f => `• ${f.name} | ${f.protocol} | ${f.frequency} | ${f.status} | chiffre: ${f.is_encrypted ? 'oui' : 'NON'} | erreur: ${f.error_rate || 0}%`).join('\n')
      : 'Aucun flux.',
    ``,
    `=== AGENTS IA (${agents.length}) ===`,
    agents.length > 0
      ? agents.map(a => `• ${a.name} | ${a.type} | ${a.status} | ${a.execution_count} executions | ${a.error_count} erreurs`).join('\n')
      : 'Aucun agent.',
    ``,
    `=== SCORE SECURITE ===`,
    securityScore
      ? [
          `Score global : ${securityScore.overall_score}/100`,
          `Vulnerabilites : ${securityScore.vulnerabilities_count} (dont ${securityScore.critical_issues} critiques)`,
          securityScore.categories ? `Details : ${JSON.stringify(securityScore.categories)}` : '',
        ].filter(Boolean).join('\n')
      : 'Aucun scan de securite.',
    ``,
    `=== RECOMMANDATIONS EN ATTENTE (${recommendations.filter(r => r.status === 'pending').length}) ===`,
    recommendations.filter(r => r.status === 'pending').length > 0
      ? recommendations.filter(r => r.status === 'pending').map(r => `• [${r.priority}] ${r.title} — ${r.category}`).join('\n')
      : 'Aucune recommandation en attente.',
    ``,
    `=== COUTS SI ===`,
    `Cout mensuel total : ${fmtEur([...apps, ...infra].reduce((s, x) => s + (parseFloat(x.monthly_cost) || 0), 0))}`,
    `Cout annuel estime : ${fmtEur([...apps, ...infra].reduce((s, x) => s + (parseFloat(x.monthly_cost) || 0), 0) * 12)}`,
    ``,
    `=== INSTRUCTIONS ===`,
    `Tu es un DSI augmente. Tes missions :`,
    `1. Analyser l'architecture SI et identifier les points faibles`,
    `2. Recommander des ameliorations (securite, couts, performance, integration)`,
    `3. Proposer des agents IA a deployer dans les flux de donnees`,
    `4. Alerter sur les risques (flux non chiffres, apps obsoletes, scores faibles)`,
    `5. Optimiser les couts (licences inutilisees, alternatives)`,
    ``,
    `Quand tu proposes une ACTION concrete (deployer un agent, ajouter une reco, etc.), formate-la ainsi :`,
    `[ACTION:type|titre|description]`,
    `Types d'actions : recommend, deploy_agent, alert, optimize`,
    `Exemple : [ACTION:recommend|Activer MFA Azure AD|L'authentification multi-facteur n'est pas activee sur Azure AD.]`,
    ``,
    `L'utilisateur pourra approuver ou rejeter chaque action via l'interface.`,
    `Sois proactif : si tu detectes un probleme, signale-le meme si on ne te le demande pas.`,
    societe?.id ? `\nUtilise societe_id: "${societe.id}" pour les nouveaux enregistrements.` : '',
  ].join('\n')
}

// Parse action cards from AI response
function parseActions(text) {
  const regex = /\[ACTION:(\w+)\|([^|]+)\|([^\]]+)\]/g
  const actions = []
  let match
  while ((match = regex.exec(text)) !== null) {
    actions.push({ type: match[1], title: match[2], description: match[3], id: `action-${Date.now()}-${actions.length}` })
  }
  return actions
}

function cleanText(text) {
  return text.replace(/\[ACTION:\w+\|[^|]+\|[^\]]+\]/g, '').trim()
}

// ── Action Card ──
function ActionCard({ action, onApprove, onReject, approved }) {
  const typeConfig = {
    recommend: { icon: '💡', color: '#d97706', label: 'Recommandation' },
    deploy_agent: { icon: '🤖', color: '#6366f1', label: 'Deployer un agent' },
    alert: { icon: '🚨', color: '#dc2626', label: 'Alerte' },
    optimize: { icon: '⚡', color: '#16a34a', label: 'Optimisation' },
  }
  const cfg = typeConfig[action.type] || typeConfig.recommend
  const isDone = approved !== undefined

  return (
    <div style={{
      border: `1px solid ${isDone ? 'var(--border)' : cfg.color}40`,
      borderRadius: 10, padding: '.75rem', marginTop: '.5rem',
      background: isDone ? 'var(--surface, #f8fafc)' : `${cfg.color}08`,
      opacity: isDone ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.35rem' }}>
        <span>{cfg.icon}</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
        {isDone && <span style={{ fontSize: '.7rem', color: approved ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>{approved ? '✅ Approuve' : '❌ Ignore'}</span>}
      </div>
      <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.25rem' }}>{action.title}</div>
      <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{action.description}</p>
      {!isDone && (
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
          <button onClick={() => onApprove(action)} style={{
            flex: 1, padding: '.3rem', borderRadius: 6, border: 'none',
            background: '#16a34a', color: '#fff', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
          }}>Approuver</button>
          <button onClick={() => onReject(action)} style={{
            flex: 1, padding: '.3rem', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
          }}>Ignorer</button>
        </div>
      )}
    </div>
  )
}

// ── Main CockpitChat ──
export default function CockpitChat({ isOpen, onClose }) {
  const { profile } = useAuth()
  const { societeId, societe } = useSociete()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [siData, setSiData] = useState(null)
  const [siLoading, setSiLoading] = useState(false)
  const [actionStates, setActionStates] = useState({}) // { actionId: true/false }
  const [fullscreen, setFullscreen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (isOpen && !siData && societeId) loadSIData()
  }, [isOpen, societeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  async function loadSIData() {
    setSiLoading(true)
    const safe = async (q) => { try { const { data } = await q; return data || [] } catch { return [] } }
    const [apps, infra, flows, agents, sec, recos] = await Promise.all([
      safe(supabase.from('si_applications').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_infrastructure').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_data_flows').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_agents').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_security_scores').select('*').eq('societe_id', societeId).order('scan_date', { ascending: false }).limit(1)),
      safe(supabase.from('si_recommendations').select('*').eq('societe_id', societeId)),
    ])
    setSiData({ apps, infra, flows, agents, securityScore: sec[0] || null, recommendations: recos })
    setSiLoading(false)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const systemPrompt = siData
        ? buildCockpitSystemPrompt(societe, siData)
        : `Tu es un DSI augmente integre a TimeBlast. Reponds en francais.`

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
          messages: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`)

      const responseText = body.text || body.error || 'Pas de reponse.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: responseText }
        return updated
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `❌ Erreur : ${err.message}`, isError: true }
        return updated
      })
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  async function handleApproveAction(action) {
    setActionStates(prev => ({ ...prev, [action.id]: true }))
    // Create recommendation in DB
    if (action.type === 'recommend' || action.type === 'alert') {
      await supabase.from('si_recommendations').insert({
        societe_id: societeId,
        title: action.title,
        description: action.description,
        category: action.type === 'alert' ? 'security' : 'optimization',
        priority: action.type === 'alert' ? 'high' : 'medium',
        status: 'approved',
        ai_reasoning: 'Genere et approuve via le chat DSI IA',
        approved_at: new Date().toISOString(),
      })
    }
    if (action.type === 'deploy_agent') {
      await supabase.from('si_agents').insert({
        societe_id: societeId,
        name: action.title,
        description: action.description,
        type: 'monitor',
        status: 'pending_approval',
        created_by: profile?.id,
      })
    }
    // Audit log
    await supabase.from('si_audit_log').insert({
      societe_id: societeId,
      user_name: profile?.full_name || profile?.email || 'Utilisateur',
      action: `Action IA approuvee: ${action.type}`,
      entity_type: action.type,
      entity_name: action.title,
    })
  }

  function handleRejectAction(action) {
    setActionStates(prev => ({ ...prev, [action.id]: false }))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function clearChat() {
    if (loading && abortRef.current) abortRef.current.abort()
    setMessages([])
    setActionStates({})
  }

  if (!isOpen) return null

  const panelStyle = fullscreen ? {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'var(--card-bg, #fff)',
    display: 'flex', flexDirection: 'column',
  } : {
    width: 420, flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    background: 'var(--card-bg, #fff)',
    display: 'flex', flexDirection: 'column',
    height: '100%',
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{
        padding: '.75rem 1rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #195C82 0%, #1D9BF0 100%)',
        color: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🎛</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>DSI Augmente</div>
            <div style={{ fontSize: '.65rem', opacity: 0.8 }}>
              {siLoading ? 'Chargement du contexte SI...' : siData ? `${siData.apps.length} apps, ${siData.infra.length} infra, ${siData.flows.length} flux` : 'Non connecte'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.25rem' }}>
          <button onClick={() => setFullscreen(!fullscreen)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '.75rem' }}>
            {fullscreen ? '◱' : '◳'}
          </button>
          <button onClick={clearChat} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '.75rem' }}>🗑</button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>×</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem .5rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🎛</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.5rem' }}>DSI Augmente</h3>
            <p style={{ fontSize: '.8rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Posez vos questions sur votre SI, demandez une analyse de securite,
              ou laissez-moi detecter les optimisations possibles.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              {[
                'Analyse la posture de securite de mon SI',
                'Quelles applications ont des licences sous-utilisees ?',
                'Propose des agents IA pour mes flux critiques',
                'Quel est le cout total de mon SI par categorie ?',
              ].map((q, i) => (
                <button key={i}
                  onClick={() => { setInput(q); setTimeout(() => sendMessage({ preventDefault: () => {} }), 50) }}
                  style={{
                    padding: '.5rem .75rem', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface, #f8fafc)', cursor: 'pointer', fontSize: '.78rem',
                    textAlign: 'left', color: 'var(--text)', transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--accent)'}
                  onMouseLeave={e => e.target.style.background = 'var(--surface, #f8fafc)'}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const actions = !isUser ? parseActions(msg.content || '') : []
          const displayText = !isUser ? cleanText(msg.content || '') : msg.content

          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '.65rem .85rem', borderRadius: 12,
                background: isUser ? 'var(--accent, #1D9BF0)' : msg.isError ? '#fef2f2' : 'var(--surface, #f1f5f9)',
                color: isUser ? '#fff' : 'var(--text)',
                fontSize: '.82rem', lineHeight: 1.5,
                borderBottomRightRadius: isUser ? 2 : 12,
                borderBottomLeftRadius: isUser ? 12 : 2,
              }}>
                {displayText && <div style={{ whiteSpace: 'pre-wrap' }}>{displayText}</div>}
                {actions.map(action => (
                  <ActionCard key={action.id} action={action}
                    onApprove={handleApproveAction} onReject={handleRejectAction}
                    approved={actionStates[action.id]}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '.3rem', padding: '.5rem' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                animation: `cockpitPulse 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        padding: '.75rem', borderTop: '1px solid var(--border)',
        display: 'flex', gap: '.5rem', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Demandez au DSI IA..."
          disabled={loading || siLoading}
          style={{
            flex: 1, padding: '.55rem .75rem', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: '.85rem',
            background: 'var(--surface, #f8fafc)', outline: 'none',
          }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '.55rem .85rem', borderRadius: 10, border: 'none',
          background: loading || !input.trim() ? 'var(--border)' : 'var(--accent, #1D9BF0)',
          color: '#fff', cursor: loading ? 'wait' : 'pointer', fontSize: '.85rem', fontWeight: 600,
        }}>
          ➤
        </button>
      </form>

      {/* Pulse animation */}
      <style>{`
        @keyframes cockpitPulse { 0%, 80%, 100% { opacity: .3; transform: scale(.8); } 40% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
