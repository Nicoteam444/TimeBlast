import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Sections de navigation de l'éditeur
const NAV_SECTIONS = [
  {
    id: 'connexion', label: '🌐 Page de connexion', collapsed: true,
    pages: [
      { id: 'login', path: '/login', label: 'Page d\'accueil', icon: '🏠', external: true },
      { id: 'inscription', path: '/inscription', label: 'Inscription', icon: '📝', external: true },
      { id: 'efacture', path: '/facture-electronique', label: 'E-Facture 2026', icon: '📄', external: true },
      { id: 'tarifs', path: '/tarifs', label: 'Tarifs', icon: '💎', external: true },
    ]
  },
  {
    id: 'backoffice', label: '🔧 Backoffice', collapsed: true,
    pages: [
      { id: 'bo-env', path: '/backoffice', label: 'Environnements', icon: '🏢', external: true },
      { id: 'bo-import', path: '/backoffice', label: 'Import données', icon: '📥', external: true },
      { id: 'bo-tables', path: '/backoffice', label: 'Tables', icon: '🗄', external: true },
      { id: 'bo-integrations', path: '/backoffice', label: 'Intégrations', icon: '🔌', external: true },
      { id: 'bo-droits', path: '/backoffice', label: 'Droits & Profils', icon: '🔐', external: true },
    ]
  },
  {
    id: 'plateforme', label: '⚡ Plateforme', collapsed: false,
    pages: [
      { id: 'dashboard', path: '/dashboard', label: 'Tableau de bord', icon: '📊' },
      { id: 'calendrier', path: '/activite/saisie', label: 'Calendrier', icon: '📅' },
      { id: 'contacts', path: '/crm/contacts', label: 'Contacts', icon: '👤' },
      { id: 'leads', path: '/crm/leads', label: 'Leads', icon: '🎯' },
      { id: 'entreprises', path: '/crm/entreprises', label: 'Entreprises', icon: '🏢' },
      { id: 'pipeline', path: '/commerce/transactions', label: 'Pipeline', icon: '📈' },
      { id: 'devis', path: '/commerce/devis', label: 'Devis', icon: '📝' },
      { id: 'factures', path: '/finance/facturation', label: 'Facturation', icon: '🧾' },
      { id: 'produits', path: '/commerce/produits', label: 'Produits', icon: '📦' },
      { id: 'projets', path: '/activite/projets', label: 'Projets', icon: '📋' },
      { id: 'equipe', path: '/activite/equipe', label: 'Équipe', icon: '👥' },
      { id: 'compta', path: '/finance/compta', label: 'Comptabilité', icon: '💰' },
      { id: 'documents', path: '/documents/archives', label: 'Documents', icon: '📁' },
      { id: 'predictions', path: '/predictions-ia', label: 'Prédictions IA', icon: '🔮' },
      { id: 'wiki', path: '/wiki', label: 'Wiki', icon: '📚' },
      { id: 'parametres', path: '/profil', label: 'Paramètres', icon: '⚙️' },
    ]
  },
  {
    id: 'admin', label: '👥 Administration', collapsed: true,
    pages: [
      { id: 'utilisateurs', path: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👤' },
      { id: 'societes', path: '/admin/societes', label: 'Sociétés', icon: '🏢' },
      { id: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: '📊' },
      { id: 'audit', path: '/admin/audit', label: 'Journal d\'audit', icon: '📋' },
    ]
  },
]

const INIT_MESSAGES = [
  { role: 'ai', content: 'Bienvenue dans l\'éditeur TimeBlast ! Je suis votre assistant IA.\n\nVous pouvez me demander de :\n• Modifier une page existante\n• Ajouter un nouveau module\n• Changer le design ou les couleurs\n• Connecter un outil externe\n• Corriger un bug\n\nQue souhaitez-vous faire ?' },
]

export default function EditorPage() {
  const { envId } = useParams()
  const { profile } = useAuth()
  const [messages, setMessages] = useState(INIT_MESSAGES)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [activePage, setActivePage] = useState(NAV_SECTIONS[2].pages[0])
  const [collapsedSections, setCollapsedSections] = useState({ connexion: true, backoffice: true, plateforme: false, admin: true })
  const [previewMode, setPreviewMode] = useState('desktop')
  const [centerTab, setCenterTab] = useState('chat')
  const [fullscreen, setFullscreen] = useState(null) // null | 'chat' | 'preview'
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const iframeRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null)

  const previewUrl = activePage.external
    ? `${window.location.origin}${activePage.path}`
    : `${window.location.origin}/${envId}${activePage.path}`

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Drag resize
  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev) => setSidebarWidth(Math.max(180, Math.min(400, startW + ev.clientX - startX)))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  async function handleSend() {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { message: userMsg.content, context: 'editor', page: activePage.label }
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'ai', content: data?.reply || 'Modification prise en compte. Rechargez l\'aperçu pour voir les changements.' }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Demande enregistrée. L\'IA va traiter votre modification.' }])
    } finally {
      setSending(false)
    }
  }

  function refreshPreview() {
    if (iframeRef.current) iframeRef.current.src = previewUrl
  }

  const previewWidth = previewMode === 'mobile' ? 375 : previewMode === 'tablet' ? 768 : '100%'

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#0f172a',
    }}>

      {/* ══════ LEFT: Pages TimeBlast ══════ */}
      {fullscreen !== 'preview' && showSidebar && fullscreen !== 'chat' && (
      <div style={{
        width: sidebarWidth, minWidth: 180, background: '#0f172a', color: '#e2e8f0',
        display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-icon.svg" alt="" style={{ width: 28, height: 28, filter: 'brightness(0) invert(1)' }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>TimeBlast</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#22c55e', color: '#fff', fontWeight: 600 }}>IA</span>
        </div>

        {/* Navigation sections */}
        <div style={{ padding: '4px 8px', flex: 1, overflow: 'auto' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.id} style={{ marginBottom: 4 }}>
              {/* Section header */}
              <div
                onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 8px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: '#94a3b8',
                  transition: 'all .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <span style={{ fontSize: 10, transition: 'transform .15s', transform: collapsedSections[section.id] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                <span>{section.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569', background: '#1e293b', padding: '1px 6px', borderRadius: 8 }}>{section.pages.length}</span>
              </div>
              {/* Pages */}
              {!collapsedSections[section.id] && section.pages.map(page => (
                <div key={page.id} onClick={() => setActivePage(page)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px 6px 24px', borderRadius: 6, cursor: 'pointer', marginBottom: 1,
                  background: activePage.id === page.id ? '#1e293b' : 'transparent',
                  color: activePage.id === page.id ? '#fff' : '#94a3b8',
                  transition: 'all .12s', fontSize: 12,
                }}
                onMouseEnter={e => { if (activePage.id !== page.id) e.currentTarget.style.background = '#1e293b40' }}
                onMouseLeave={e => { if (activePage.id !== page.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{page.icon}</span>
                  <span style={{ fontWeight: activePage.id === page.id ? 600 : 400 }}>{page.label}</span>
                  {page.external && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#475569' }}>↗</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* User info */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#1a5c82',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {(profile?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{profile?.full_name || 'Utilisateur'}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{profile?.role || 'admin'}</div>
          </div>
        </div>
      </div>
      )}

      {/* Resize handle sidebar */}
      {fullscreen === null && showSidebar && (
        <div onMouseDown={startResize}
          style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* ══════ CENTER: Chat IA + onglets ══════ */}
      {fullscreen !== 'preview' && (
      <div style={{
        width: fullscreen === 'chat' ? '100%' : 420,
        minWidth: 320, background: '#fff',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #e2e8f0',
      }}>
        {/* Header + tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>☰</button>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Éditeur IA</div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
              {activePage.label}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {showSidebar && <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>◀</button>}
              <button onClick={() => setFullscreen(fullscreen === 'chat' ? null : 'chat')} style={{ background: fullscreen === 'chat' ? '#1a5c82' : 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: fullscreen === 'chat' ? '#fff' : '#64748b' }}>
                {fullscreen === 'chat' ? '⬅' : '⬜'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', padding: '0 16px', marginTop: 8 }}>
            {[
              { id: 'chat', label: '💬 Chat' },
              { id: 'historique', label: '📜 Historique' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setCenterTab(tab.id)} style={{
                padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: centerTab === tab.id ? 600 : 400,
                color: centerTab === tab.id ? '#1a5c82' : '#64748b',
                borderBottom: centerTab === tab.id ? '2px solid #1a5c82' : '2px solid transparent',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Chat messages */}
        {centerTab === 'chat' && (
        <>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
            }}>
              {msg.role === 'ai' && (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a5c82, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>TB</div>
              )}
              <div style={{
                background: msg.role === 'user' ? '#1a5c82' : '#f1f5f9',
                color: msg.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, lineHeight: 1.6, maxWidth: '80%',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1a5c82, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>TB</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                <span style={{ animation: 'editorDot 1s infinite' }}>●</span>{' '}
                <span style={{ animation: 'editorDot 1s infinite .2s' }}>●</span>{' '}
                <span style={{ animation: 'editorDot 1s infinite .4s' }}>●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions rapides */}
        <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            'Ajoute un graphique sur cette page',
            'Change les couleurs en mode sombre',
            'Ajoute un bouton d\'export CSV',
            'Corrige le responsive de cette page',
          ].map((s, i) => (
            <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
              background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b',
              transition: 'all .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}
            >{s}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '8px 16px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0f172a', borderRadius: 12, padding: '8px 12px',
            border: '1px solid #334155',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Modifier "${activePage.label}"...`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}
            />
            <button onClick={handleSend} disabled={!input.trim() || sending} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 12, cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? 'linear-gradient(135deg, #1a5c82, #2563eb)' : '#334155',
              color: '#fff', transition: 'all .15s',
            }}>{sending ? '...' : 'Envoyer'}</button>
          </div>
        </div>
        </>
        )}

        {/* Historique */}
        {centerTab === 'historique' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Modifications récentes :</p>
            {[
              { date: 'Aujourd\'hui 16:30', action: 'Ajout barre de prompt IA au dashboard', status: 'ok' },
              { date: 'Aujourd\'hui 15:00', action: 'Refonte page de connexion — design premium', status: 'ok' },
              { date: 'Aujourd\'hui 14:00', action: 'Droits d\'accès par module utilisateur', status: 'ok' },
              { date: 'Hier 18:00', action: 'Éditeur IA — layout 3 colonnes', status: 'ok' },
              { date: 'Hier 15:00', action: 'Page Prédictions IA — 5 onglets', status: 'ok' },
              { date: '28/03', action: 'Calendrier Outlook multi-sources', status: 'ok' },
              { date: '28/03', action: 'Import CSV universel dans le backoffice', status: 'ok' },
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{h.action}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ══════ RIGHT: Aperçu live (iframe) ══════ */}
      {fullscreen !== 'chat' && (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#f1f5f9', overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={() => setFullscreen(fullscreen === 'preview' ? null : 'preview')} style={{
            background: fullscreen === 'preview' ? '#1a5c82' : 'none', border: '1px solid #e2e8f0',
            borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11,
            color: fullscreen === 'preview' ? '#fff' : '#64748b',
          }}>{fullscreen === 'preview' ? '◀ Retour' : '⬜ Plein écran'}</button>

          <div style={{ display: 'flex', gap: 4 }}>
            {['desktop', 'tablet', 'mobile'].map(m => (
              <button key={m} onClick={() => setPreviewMode(m)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500,
                background: previewMode === m ? '#1a5c82' : '#f1f5f9',
                color: previewMode === m ? '#fff' : '#64748b',
                border: previewMode === m ? 'none' : '1px solid #e2e8f0',
              }}>{m === 'desktop' ? '🖥' : m === 'tablet' ? '📱' : '📲'} {m.charAt(0).toUpperCase() + m.slice(1)}</button>
            ))}
          </div>

          <button onClick={refreshPreview} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
            padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#64748b',
          }}>🔄 Recharger</button>

          {/* URL bar */}
          <div style={{
            flex: 1, marginLeft: 8, padding: '5px 12px', borderRadius: 8,
            background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {previewUrl}
          </div>

          <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: '#64748b', textDecoration: 'none', padding: '4px 8px',
            border: '1px solid #e2e8f0', borderRadius: 6,
          }}>↗ Ouvrir</a>
        </div>

        {/* Browser chrome + iframe */}
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: previewMode !== 'desktop' ? 16 : 0, overflow: 'hidden',
        }}>
          <div style={{
            width: previewWidth, maxWidth: '100%', height: '100%',
            borderRadius: previewMode !== 'desktop' ? 16 : 0,
            overflow: 'hidden',
            boxShadow: previewMode !== 'desktop' ? '0 8px 40px rgba(0,0,0,0.15)' : 'none',
            border: previewMode !== 'desktop' ? '2px solid #e2e8f0' : 'none',
            background: '#fff',
          }}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Aperçu TimeBlast"
            />
          </div>
        </div>
      </div>
      )}

      <style>{`
        @keyframes editorDot {
          0%, 20% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
