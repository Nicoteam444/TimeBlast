import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DEMO_PROJECTS = [
  { id: 1, name: 'CRM Commercial', lastModified: '30 mars 2026', status: 'En cours' },
  { id: 2, name: 'Gestion Stock', lastModified: '28 mars 2026', status: 'Publié' },
  { id: 3, name: 'Portail Client', lastModified: '25 mars 2026', status: 'Brouillon' },
]

const DEMO_COLLABORATORS = [
  { name: 'Nicolas Nabhan', initials: 'NN', color: '#1a5c82', online: true, isYou: true },
  { name: 'Vincent Raspiengeas', initials: 'VR', color: '#7c3aed', online: true, isYou: false },
  { name: 'Clémence Gain', initials: 'CG', color: '#e11d48', online: false, isYou: false },
]

const DEMO_FILES = [
  { name: 'Dashboard', icon: '📊', active: true },
  { name: 'Contacts', icon: '👤', active: false },
  { name: 'Pipeline', icon: '📈', active: false },
  { name: 'Factures', icon: '🧾', active: false },
  { name: 'Paramètres', icon: '⚙️', active: false },
]

const DEMO_MESSAGES = [
  { role: 'user', content: 'Crée-moi un CRM avec gestion des contacts et un pipeline commercial' },
  { role: 'ai', content: 'Je vais créer votre CRM avec :\n\u2705 Page Contacts (CRUD complet)\n\u2705 Pipeline Kanban\n\u2705 Tableau de bord avec KPIs\n\nDéploiement en cours...' },
  { role: 'user', content: 'Ajoute un module de facturation' },
  { role: 'ai', content: 'Module facturation ajouté :\n\u2705 Création/édition factures\n\u2705 Calcul TVA automatique\n\u2705 Export PDF\n\nAperçu disponible \u2192' },
]

const STATUS_COLORS = {
  'En cours': { bg: '#dbeafe', color: '#1e40af' },
  'Publié': { bg: '#dcfce7', color: '#166534' },
  'Brouillon': { bg: '#fef3c7', color: '#92400e' },
}

export default function EditorPage() {
  const { profile } = useAuth()
  const [selectedProject, setSelectedProject] = useState(DEMO_PROJECTS[0])
  const [messages, setMessages] = useState(DEMO_MESSAGES)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [activeFile, setActiveFile] = useState('Dashboard')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [fullscreen, setFullscreen] = useState(null) // null | 'chat' | 'preview'
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [chatWidth, setChatWidth] = useState(null) // null = flex:1
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null)

  // Drag-to-resize handler
  function startResize(panel) {
    return (e) => {
      e.preventDefault()
      dragRef.current = { panel, startX: e.clientX, startSidebar: sidebarWidth, startChat: chatWidth || (window.innerWidth - sidebarWidth) * 0.5 }
      const onMove = (ev) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.startX
        if (dragRef.current.panel === 'sidebar') {
          setSidebarWidth(Math.max(200, Math.min(400, dragRef.current.startSidebar + dx)))
        } else if (dragRef.current.panel === 'chat') {
          setChatWidth(Math.max(300, Math.min(window.innerWidth * 0.7, dragRef.current.startChat + dx)))
        }
      }
      const onUp = () => {
        dragRef.current = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { message: userMsg.content, projectId: selectedProject.id }
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'ai', content: data?.reply || 'Modification appliquée avec succès.' }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Erreur : ' + (err.message || 'Impossible de contacter l\'IA.') }])
    } finally {
      setSending(false)
    }
  }

  const previewWidth = previewMode === 'mobile' ? 375 : previewMode === 'tablet' ? 768 : '100%'

  return (
    <div className="admin-page" style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ── LEFT SIDEBAR ── */}
      {fullscreen !== 'preview' && showSidebar && fullscreen !== 'chat' && (
      <div style={{
        width: sidebarWidth,
        minWidth: 200,
        background: '#0f172a',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1e293b',
        overflow: 'hidden',
      }}>
        {/* Project selector */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            Projet
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#f1f5f9',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 500 }}>{selectedProject.name}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>{showProjectDropdown ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showProjectDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                marginTop: 4,
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {DEMO_PROJECTS.map(p => {
                  const sc = STATUS_COLORS[p.status] || { bg: '#e2e8f0', color: '#334155' }
                  return (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedProject(p); setShowProjectDropdown(false) }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: p.id === selectedProject.id ? '#334155' : 'transparent',
                        borderBottom: '1px solid #334155',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                      onMouseLeave={e => e.currentTarget.style.background = p.id === selectedProject.id ? '#334155' : 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          fontWeight: 600,
                        }}>{p.status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Modifié le {p.lastModified}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <button style={{
            width: '100%',
            marginTop: 10,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px dashed #334155',
            borderRadius: 8,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 13,
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a5c82'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
          >
            + Nouveau projet
          </button>
        </div>

        {/* Project files */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flex: '0 0 auto' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            Pages
          </div>
          {DEMO_FILES.map(f => (
            <div
              key={f.name}
              onClick={() => setActiveFile(f.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: activeFile === f.name ? '#1e293b' : 'transparent',
                color: activeFile === f.name ? '#f1f5f9' : '#94a3b8',
                fontSize: 13,
                transition: 'all 0.15s',
                marginBottom: 2,
              }}
              onMouseEnter={e => { if (activeFile !== f.name) e.currentTarget.style.background = '#1e293b' }}
              onMouseLeave={e => { if (activeFile !== f.name) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{f.icon}</span>
              <span>{f.name}</span>
            </div>
          ))}
        </div>

        {/* Collaborators */}
        <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            Collaborateurs
          </div>
          {DEMO_COLLABORATORS.map(c => (
            <div key={c.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {c.initials}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: c.online ? '#22c55e' : '#6b7280',
                  border: '2px solid #0f172a',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                  {c.name}{c.isYou ? ' (vous)' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {c.online ? 'En ligne' : 'Hors ligne'}
                </div>
              </div>
            </div>
          ))}
          <button style={{
            width: '100%',
            marginTop: 12,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px dashed #334155',
            borderRadius: 8,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 13,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a5c82'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
          >
            Inviter
          </button>
        </div>
      </div>
      )}

      {/* ── Resize handle sidebar ── */}
      {fullscreen !== 'preview' && showSidebar && fullscreen !== 'chat' && (
        <div
          onMouseDown={startResize('sidebar')}
          style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* ── CENTER PANEL ── */}
      {fullscreen !== 'preview' && (
      <div style={{
        flex: chatWidth ? 'none' : 1,
        width: chatWidth || undefined,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        minWidth: 0,
      }}>
        {/* Chat header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {!showSidebar && (
            <button onClick={() => setShowSidebar(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '0 4px', color: '#64748b' }} title="Afficher le panneau projet">☰</button>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{selectedProject.name}</div>
          <span style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 99,
            background: (STATUS_COLORS[selectedProject.status] || {}).bg || '#e2e8f0',
            color: (STATUS_COLORS[selectedProject.status] || {}).color || '#334155',
            fontWeight: 600,
          }}>{selectedProject.status}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {showSidebar && (
              <button onClick={() => setShowSidebar(false)} title="Masquer le panneau projet" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>◀</button>
            )}
            <button onClick={() => setFullscreen(fullscreen === 'chat' ? null : 'chat')} title={fullscreen === 'chat' ? 'Quitter plein écran' : 'Chat plein écran'} style={{ background: fullscreen === 'chat' ? '#1a5c82' : 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: fullscreen === 'chat' ? '#fff' : '#64748b' }}>
              {fullscreen === 'chat' ? '▢' : '⬜'}
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              {msg.role === 'ai' && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a5c82, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  TB
                </div>
              )}
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #1a5c82, #0f4c6e)'
                  : '#f1f5f9',
                color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a5c82, #0f172a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>TB</div>
              <div style={{
                padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                background: '#f1f5f9', color: '#64748b', fontSize: 14,
              }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <span style={{ animation: 'editorDot 1.4s infinite', animationDelay: '0s' }}>{'\u2022'}</span>
                  <span style={{ animation: 'editorDot 1.4s infinite', animationDelay: '0.2s' }}>{'\u2022'}</span>
                  <span style={{ animation: 'editorDot 1.4s infinite', animationDelay: '0.4s' }}>{'\u2022'}</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#0f172a',
            borderRadius: 12,
            padding: '4px 4px 4px 16px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Décrivez votre modification..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f1f5f9',
                fontSize: 14,
                padding: '10px 0',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                padding: '10px 20px',
                background: (sending || !input.trim()) ? '#334155' : 'linear-gradient(135deg, #1a5c82, #2563eb)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Resize handle chat/preview ── */}
      {fullscreen === null && (
        <div
          onMouseDown={startResize('chat')}
          style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* ── RIGHT PANEL (PREVIEW) ── */}
      {fullscreen !== 'chat' && (
      <div style={{
        flex: fullscreen === 'preview' ? 1 : undefined,
        width: fullscreen === 'preview' ? '100%' : '45%',
        minWidth: fullscreen === 'preview' ? 0 : 400,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Preview toolbar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setFullscreen(fullscreen === 'preview' ? null : 'preview')} title={fullscreen === 'preview' ? 'Quitter plein écran' : 'Aperçu plein écran'} style={{ background: fullscreen === 'preview' ? '#1a5c82' : 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: fullscreen === 'preview' ? '#fff' : '#64748b' }}>
              {fullscreen === 'preview' ? '◀ Retour' : '⬜'}
            </button>
            {['desktop', 'tablet', 'mobile'].map(mode => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: previewMode === mode ? '#1a5c82' : '#e2e8f0',
                  background: previewMode === mode ? '#eff6ff' : '#fff',
                  color: previewMode === mode ? '#1a5c82' : '#64748b',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'desktop' ? '\uD83D\uDDA5 Desktop' : mode === 'tablet' ? '\uD83D\uDCF1 Tablet' : '\uD83D\uDCF1 Mobile'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
              Ouvrir dans un nouvel onglet
            </span>
            <button style={{
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #1a5c82, #2563eb)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}>
              Publier
            </button>
          </div>
        </div>

        {/* Browser chrome */}
        <div style={{
          padding: '8px 16px',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <div style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 12,
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}>
            app.timeblast.ai/crm
          </div>
        </div>

        {/* Preview content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: previewMode !== 'desktop' ? 16 : 0,
        }}>
          <div style={{
            width: previewWidth,
            maxWidth: '100%',
            background: '#ffffff',
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            borderRadius: previewMode !== 'desktop' ? 12 : 0,
            boxShadow: previewMode !== 'desktop' ? '0 4px 24px rgba(0,0,0,0.1)' : 'none',
            border: previewMode !== 'desktop' ? '1px solid #e2e8f0' : 'none',
          }}>
            {/* Mini sidebar */}
            <div style={{
              width: 52,
              minWidth: 52,
              background: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 16,
              gap: 8,
            }}>
              {['\uD83D\uDCCA', '\uD83D\uDC64', '\uD83D\uDCB0', '\uD83D\uDCCB', '\u2699\uFE0F'].map((icon, i) => (
                <div key={i} style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: i === 0 ? '#1e293b' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                }}>
                  {icon}
                </div>
              ))}
            </div>

            {/* Mini app content */}
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                  Tableau de bord
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Vue d'ensemble de votre CRM
                </div>
              </div>

              {/* KPI cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}>
                {[
                  { label: 'CA', value: '72 450\u20AC', change: '+12%', color: '#22c55e' },
                  { label: 'Pipeline', value: '343k\u20AC', change: '+8%', color: '#22c55e' },
                  { label: 'Clients', value: '156', change: '+3', color: '#2563eb' },
                ].map((kpi, i) => (
                  <div key={i} style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                  }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{kpi.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, color: kpi.color, fontWeight: 600 }}>{kpi.change}</div>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                  Chiffre d'affaires mensuel
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                  {[40, 65, 50, 80, 55, 70, 90, 60, 75, 85, 68, 95].map((h, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${h}%`,
                      background: i === 11 ? 'linear-gradient(180deg, #1a5c82, #2563eb)' : '#e2e8f0',
                      borderRadius: 3,
                      transition: 'all 0.3s',
                    }} />
                  ))}
                </div>
              </div>

              {/* Mini table */}
              <div style={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  Derniers contacts
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Nom</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Entreprise</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Marie Dupont', company: 'Acme Corp', amount: '12 400\u20AC' },
                      { name: 'Jean Martin', company: 'Tech SA', amount: '8 750\u20AC' },
                      { name: 'Sophie Leroy', company: 'Digital SAS', amount: '23 100\u20AC' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0f172a' }}>{row.name}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.company}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      )}

      {/* Keyframes for typing dots */}
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
