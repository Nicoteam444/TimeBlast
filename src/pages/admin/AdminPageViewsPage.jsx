import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

export default function AdminPageViewsPage() {
  const [views, setViews] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [filterPath, setFilterPath] = useState('')
  const [limit, setLimit] = useState(200)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => { fetchData() }, [limit])

  async function fetchData() {
    setLoading(true)
    const [vRes, uRes] = await Promise.all([
      supabase.from('page_views').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('profiles').select('id, full_name, role')
    ])
    setViews(vRes.data || [])
    setUsers(uRes.data || [])
    setLoading(false)
  }

  function userName(uid) {
    const u = users.find(u => u.id === uid)
    return u?.full_name || uid?.slice(0, 8) || '—'
  }

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d)
    const now = new Date()
    const diff = now - dt
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = views.filter(v => {
    if (filterUser && !userName(v.user_id).toLowerCase().includes(filterUser.toLowerCase())) return false
    if (filterPath && !v.page_path.toLowerCase().includes(filterPath.toLowerCase())) return false
    return true
  })

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'created_at', 'desc')

  // Stats
  const uniqueUsers = new Set(views.map(v => v.user_id)).size
  const todayViews = views.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length

  // Pages les plus visitées
  const pageCounts = {}
  views.forEach(v => { pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1 })
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="admin-page admin-page--full">
      <div className="admin-page-header">
        <div>
          <h1>👁️ Historique de navigation</h1>
          <p style={{ color: '#64748b' }}>{views.length} pages consultées · {uniqueUsers} utilisateur{uniqueUsers > 1 ? 's' : ''} · {todayViews} aujourd'hui</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={fetchData}>🔄 Rafraîchir</button>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value={100}>100 dernières</option>
            <option value={200}>200 dernières</option>
            <option value={500}>500 dernières</option>
            <option value={1000}>1000 dernières</option>
          </select>
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {topPages.map(([path, count]) => (
          <div key={path} style={{
            padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 12
          }}>
            <span style={{ fontWeight: 600 }}>{path}</span>
            <span style={{ color: '#64748b', marginLeft: 8 }}>{count}×</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input type="text" value={filterUser} onChange={e => setFilterUser(e.target.value)}
          placeholder="Filtrer par utilisateur..." style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, width: 200
          }} />
        <input type="text" value={filterPath} onChange={e => setFilterPath(e.target.value)}
          placeholder="Filtrer par page..." style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, width: 200
          }} />
      </div>

      {loading ? (
        <Spinner />
      ) : sortedData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <p>Aucune donnée de navigation</p>
        </div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                <SortableHeader label="Utilisateur" sortKey="user_id" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                <SortableHeader label="Page" sortKey="page_path" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
                <SortableHeader label="Titre" sortKey="page_title" currentKey={sortKey} direction={sortDir} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sortedData.map(v => (
                <tr key={v.id}>
                  <td className="date-cell" style={{ whiteSpace: 'nowrap' }}>{fmtDate(v.created_at)}</td>
                  <td><span className="user-name" onClick={e => { e.stopPropagation(); setSelectedUser(v.user_id) }} style={{ cursor: 'pointer', color: '#2B4C7E', textDecoration: 'underline' }}>{userName(v.user_id)}</span></td>
                  <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{v.page_path}</code></td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{v.page_title || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Panneau détail utilisateur */}
      {selectedUser && (() => {
        const u = users.find(u => u.id === selectedUser)
        const userViews = views.filter(v => v.user_id === selectedUser)
        const pageStats = {}
        userViews.forEach(v => {
          const p = v.page_path
          if (!pageStats[p]) pageStats[p] = { count: 0, last: v.created_at }
          pageStats[p].count++
          if (v.created_at > pageStats[p].last) pageStats[p].last = v.created_at
        })
        const sortedPages = Object.entries(pageStats).sort((a, b) => b[1].count - a[1].count)
        const totalPages = userViews.length
        const uniquePages = sortedPages.length
        const todayCount = userViews.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length
        const initials = (u?.full_name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}
            onClick={() => setSelectedUser(null)}>
            <div style={{ width: 420, background: '#fff', height: '100vh', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', overflowY: 'auto', padding: 24 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Profil utilisateur</h2>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>✕</button>
              </div>

              {/* Avatar + nom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2B4C7E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{u?.full_name || 'Inconnu'}</div>
                  <div style={{ fontSize: '.8rem', color: '#64748b' }}>{u?.role || '—'}</div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2B4C7E' }}>{totalPages}</div>
                  <div style={{ fontSize: '.7rem', color: '#64748b' }}>Pages vues</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{uniquePages}</div>
                  <div style={{ fontSize: '.7rem', color: '#64748b' }}>Pages uniques</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{todayCount}</div>
                  <div style={{ fontSize: '.7rem', color: '#64748b' }}>Aujourd'hui</div>
                </div>
              </div>

              {/* Pages les plus visitées */}
              <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#1a2332', marginBottom: 8 }}>Pages les plus consultees</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sortedPages.slice(0, 15).map(([path, stats]) => {
                  const pct = totalPages > 0 ? (stats.count / sortedPages[0][1].count) * 100 : 0
                  return (
                    <div key={path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 500, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</div>
                        <div style={{ height: 3, borderRadius: 2, background: '#e2e8f0', marginTop: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: '#2B4C7E' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#2B4C7E' }}>{stats.count}×</div>
                        <div style={{ fontSize: '.6rem', color: '#94a3b8' }}>{fmtDate(stats.last)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
