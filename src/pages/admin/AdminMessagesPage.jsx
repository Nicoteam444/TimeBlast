import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all') // all, unread, read

  useEffect(() => { fetchMessages() }, [])

  async function fetchMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contact_messages').select('*').order('created_at', { ascending: false })
    if (!error) setMessages(data || [])
    setLoading(false)
  }

  async function markRead(id, read) {
    await supabase.from('contact_messages').update({ read }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read } : m))
  }

  async function markReplied(id, replied) {
    await supabase.from('contact_messages').update({ replied }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, replied } : m))
  }

  async function deleteMessage(id) {
    if (!window.confirm('Supprimer ce message ?')) return
    await supabase.from('contact_messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.read
    if (filter === 'read') return m.read
    return true
  })

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered)
  const unreadCount = messages.filter(m => !m.read).length

  function fmtDate(d) {
    if (!d) return '-'
    const dt = new Date(d)
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function selectMessage(msg) {
    setSelected(msg)
    if (!msg.read) markRead(msg.id, true)
  }

  return (
    <div className="admin-page" style={{ display: 'flex', gap: 24 }}>
      {/* Liste */}
      <div style={{ flex: selected ? '0 0 45%' : '1', minWidth: 0 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h1>📬 Messages de contact</h1>
            <p style={{ color: '#64748b', marginTop: 4 }}>
              {messages.length} message{messages.length > 1 ? 's' : ''} · {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="table-toolbar" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'unread', 'read'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  background: filter === f ? '#2d6a4f' : '#f1f5f9', color: filter === f ? '#fff' : '#475569'
                }}>
                {f === 'all' ? `Tous (${messages.length})` : f === 'unread' ? `Non lus (${unreadCount})` : `Lus (${messages.length - unreadCount})`}
              </button>
            ))}
          </div>
          <button onClick={fetchMessages} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            🔄 Rafraîchir
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : sortedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p>Aucun message</p>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <SortableHeader label="Nom" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                  <SortableHeader label="Email" sortKey="email" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                  <SortableHeader label="Entreprise" sortKey="company" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                  <SortableHeader label="Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                  <th>Statut</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map(msg => (
                  <tr key={msg.id} onClick={() => selectMessage(msg)}
                    style={{
                      cursor: 'pointer',
                      fontWeight: msg.read ? 'normal' : '600',
                      background: selected?.id === msg.id ? '#f0f9ff' : msg.read ? 'transparent' : '#fefce8'
                    }}>
                    <td style={{ textAlign: 'center' }}>{msg.read ? '📭' : '📬'}</td>
                    <td className="user-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.name}</span>
                        {msg.message && (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                            {msg.message.replace(/\n/g, ' ').slice(0, 80)}{msg.message.length > 80 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="user-cell" style={{ color: '#2563eb' }}>{msg.email}</td>
                    <td className="user-cell">{msg.company || '-'}</td>
                    <td className="date-cell">{fmtDate(msg.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {msg.replied && <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>Répondu</span>}
                        {!msg.read && <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Nouveau</span>}
                      </div>
                    </td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); deleteMessage(msg.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Détail */}
      {selected && (
        <div style={{
          flex: '1 1 auto', minWidth: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          padding: 24, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>{selected.name}</h2>
              <a href={`mailto:${selected.email}`} style={{ color: '#2563eb', fontSize: 14 }}>{selected.email}</a>
              {selected.company && <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>🏢 {selected.company}</p>}
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
            Reçu le {fmtDate(selected.created_at)}
          </div>

          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20,
            lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1e293b',
            border: '1px solid #e2e8f0',
          }}>
            {selected.message}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`mailto:${selected.email}?subject=Re: Demande de contact TimeBlast`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 8, background: '#2d6a4f', color: '#fff', textDecoration: 'none', fontSize: 13
              }}>
              ✉️ Répondre par email
            </a>
            <button onClick={() => markReplied(selected.id, !selected.replied)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: selected.replied ? '#dcfce7' : '#fff', cursor: 'pointer', fontSize: 13
              }}>
              {selected.replied ? '✅ Marqué répondu' : '📋 Marquer répondu'}
            </button>
            <button onClick={() => markRead(selected.id, !selected.read)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', fontSize: 13
              }}>
              {selected.read ? '📬 Marquer non lu' : '📭 Marquer lu'}
            </button>
            <button onClick={() => deleteMessage(selected.id)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5',
                background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 13
              }}>
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
