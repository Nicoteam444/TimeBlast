import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ── Dossiers racine ──
const ROOT_FOLDERS = [
  { id: 'clients',       label: 'Clients',         icon: '👤', color: '#0891b2' },
  { id: 'contrats',      label: 'Contrats',        icon: '📄', color: '#7c3aed' },
  { id: 'commerce',      label: 'Commerce',        icon: '💼', color: '#0F4C75' },
  { id: 'offres_ia',     label: 'Offres IA',       icon: '🤖', color: '#F8B35A' },
  { id: 'process',       label: 'Process internes', icon: '⚙️', color: '#64748b' },
  { id: 'documentation', label: 'Documentation',   icon: '📚', color: '#16a34a' },
  { id: 'roadmap',       label: 'Roadmap',         icon: '🗺️', color: '#dc2626' },
  { id: 'formation',     label: 'Formation',       icon: '🎓', color: '#6366f1' },
  { id: 'templates',     label: 'Templates',       icon: '📋', color: '#ea580c' },
  { id: 'rh',            label: 'Ressources RH',   icon: '👥', color: '#0d9488' },
]

const VISIBILITY = [
  { id: 'public',   label: 'Tous', icon: '🌐' },
  { id: 'managers', label: 'Managers & Admins', icon: '🔒' },
  { id: 'admins',   label: 'Admins uniquement', icon: '🛡️' },
]

const FILE_ICONS = {
  pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', csv: '📗',
  ppt: '📙', pptx: '📙', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
  svg: '🖼️', mp4: '🎬', zip: '📦', txt: '📝', md: '📝', default: '📄',
}

function getFileIcon(name) {
  if (!name) return '📝'
  const ext = name.split('.').pop()?.toLowerCase()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}

function renderMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.85em">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function WikiPage() {
  const { profile } = useAuth()
  const userRole = profile?.role
  const fileInputRef = useRef()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('wiki_view') || 'grid')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ title: '', category: '', content: '', visibility: 'public', pinned: false, file_type: 'article' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { fetchItems() }, [])
  useEffect(() => { localStorage.setItem('wiki_view', viewMode) }, [viewMode])

  async function fetchItems() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('wiki_articles')
      .select('*, profiles(full_name)')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (err) {
      // Fallback demo
      setItems(getDemoItems())
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  function getDemoItems() {
    const base = { created_by: profile?.id, updated_at: new Date().toISOString(), profiles: { full_name: 'Admin' }, file_type: 'article' }
    return [
      { id: 'd1', title: 'Roadmap IA — 3 phases', category: 'roadmap', content: '## Phase 1 : Agrégateur interne\nHub qui discute avec un LLM.\n\n## Phase 2 : IA SRA native\nIntégration directe.\n\n## Phase 3 : MCP Client + Agents IT\nAgents orchestrateurs.', visibility: 'public', pinned: true, ...base },
      { id: 'd2', title: 'Offre Diagnostic IA', category: 'offres_ia', content: '## Diagnostic IA\nÉvaluation maturité IA.\n\n- Audit outils\n- Cas d\'usage IA\n- Recommandations\n- Plan 90 jours', visibility: 'public', pinned: true, ...base },
      { id: 'd3', title: 'Offre Agrégateur interne', category: 'offres_ia', content: '## Agrégateur intelligent\nMultiprise intelligente.\n\n- Sync multi-outils\n- Dashboard unifié\n- Alertes\n- Rapports auto', visibility: 'public', pinned: false, ...base },
      { id: 'd4', title: 'Process de vente', category: 'commerce', content: '1. Qualification lead\n2. Découverte besoins\n3. Proposition\n4. Négociation\n5. Closing\n6. Onboarding', visibility: 'managers', pinned: false, ...base },
      { id: 'd5', title: 'Catalogue prestations 2026.pdf', category: 'commerce', content: '', visibility: 'public', pinned: false, file_type: 'file', file_size: 2450000, ...base },
      { id: 'd6', title: 'Template proposition commerciale.docx', category: 'templates', content: '', visibility: 'managers', pinned: false, file_type: 'file', file_size: 185000, ...base },
      { id: 'd7', title: 'Onboarding nouveau collaborateur', category: 'rh', content: '## Checklist onboarding\n- Création comptes\n- Remise matériel\n- Formation outils\n- Parrainage\n- Point J+30', visibility: 'public', pinned: false, ...base },
      { id: 'd8', title: 'Guide utilisation TimeBlast', category: 'documentation', content: '## Prise en main\n1. Se connecter\n2. Découvrir le dashboard\n3. Naviguer les modules\n4. Créer son premier rapport', visibility: 'public', pinned: true, ...base },
    ]
  }

  function canView(item) {
    if (item.visibility === 'public') return true
    if (item.visibility === 'managers' && ['admin', 'manager'].includes(userRole)) return true
    if (item.visibility === 'admins' && userRole === 'admin') return true
    return false
  }

  function canEdit() { return userRole === 'admin' || userRole === 'manager' }

  // ── Filtered & sorted items ──
  const displayed = useMemo(() => {
    let list = items.filter(a => canView(a))
    if (currentFolder) list = list.filter(a => a.category === currentFolder)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
      const va = a[sortBy] || ''
      const vb = b[sortBy] || ''
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return list
  }, [items, currentFolder, search, sortBy, sortDir, userRole])

  // Folder counts
  const folderCounts = useMemo(() => {
    const counts = {}
    items.filter(a => canView(a)).forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1 })
    return counts
  }, [items, userRole])

  // ── CRUD ──
  function openCreate() {
    setEditId(null)
    setForm({ title: '', category: currentFolder || 'documentation', content: '', visibility: 'public', pinned: false, file_type: 'article' })
    setShowForm(true)
    setError(null)
  }

  function openEdit(item) {
    setEditId(item.id)
    setForm({ title: item.title, category: item.category, content: item.content || '', visibility: item.visibility, pinned: item.pinned || false, file_type: item.file_type || 'article' })
    setShowForm(true)
    setViewItem(null)
    setError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, updated_at: new Date().toISOString() }

    if (editId) {
      const { error: err } = await supabase.from('wiki_articles').update(payload).eq('id', editId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      payload.created_by = profile?.id
      const { error: err } = await supabase.from('wiki_articles').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
    setShowForm(false)
    fetchItems()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet élément ?')) return
    await supabase.from('wiki_articles').delete().eq('id', id)
    setViewItem(null)
    fetchItems()
  }

  // ── Drag & drop upload ──
  function handleDragOver(e) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave() { setDragOver(false) }
  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) await uploadFiles(files)
  }

  async function uploadFiles(files) {
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const payload = {
        title: file.name,
        category: currentFolder || 'documentation',
        content: '',
        visibility: 'public',
        pinned: false,
        file_type: 'file',
        file_size: file.size,
        created_by: profile?.id,
        updated_at: new Date().toISOString(),
      }
      await supabase.from('wiki_articles').insert(payload)
    }
    setUploading(false)
    fetchItems()
  }

  const folderInfo = (id) => ROOT_FOLDERS.find(f => f.id === id) || { label: id, icon: '📁', color: '#64748b' }

  // ── Styles ──
  const S = {
    sidebar: { width: 260, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    folderItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderRadius: 8,
      background: active ? '#0F4C7510' : 'transparent', color: active ? '#0F4C75' : '#475569',
      fontWeight: active ? 700 : 500, fontSize: '.87rem', transition: 'all .15s', margin: '1px 8px',
    }),
    breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: '#64748b', marginBottom: 16 },
    dropzone: (active) => ({
      border: active ? '2px dashed #0F4C75' : '2px dashed transparent',
      background: active ? '#0F4C7508' : 'transparent',
      borderRadius: 12, transition: 'all .2s', minHeight: 400, padding: 4,
    }),
  }

  return (
    <div className="admin-page" style={{ display: 'flex', gap: 0, height: 'calc(100vh - 140px)', overflow: 'hidden', margin: '5px 0 20px 0' }}>

      {/* ── Sidebar dossiers ── */}
      <div style={S.sidebar}>
        <div style={{ padding: '16px 14px 12px' }}>
          <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            📁 Drive TimeBlast
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: '#94a3b8' }}>{items.length} éléments · {ROOT_FOLDERS.length} dossiers</p>
        </div>

        <div style={{ padding: '0 6px', marginBottom: 8 }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher..." style={{
              width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: '.82rem', outline: 'none', boxSizing: 'border-box'
            }} />
        </div>

        {/* All files */}
        <div style={S.folderItem(!currentFolder)} onClick={() => setCurrentFolder(null)}>
          <span style={{ fontSize: 18 }}>🏠</span>
          <span style={{ flex: 1 }}>Tous les fichiers</span>
          <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>{items.filter(a => canView(a)).length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
          {ROOT_FOLDERS.map(f => (
            <div key={f.id} style={S.folderItem(currentFolder === f.id)} onClick={() => setCurrentFolder(f.id)}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: '.75rem', color: '#94a3b8', minWidth: 16, textAlign: 'right' }}>{folderCounts[f.id] || 0}</span>
            </div>
          ))}
        </div>

        {/* Storage info */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', fontSize: '.75rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Espace utilisé</span>
            <span>{formatSize(items.reduce((s, i) => s + (i.file_size || 500), 0))}</span>
          </div>
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{ height: 4, background: '#0F4C75', borderRadius: 2, width: '12%' }} />
          </div>
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexShrink: 0 }}>
          {/* Breadcrumb */}
          <div style={S.breadcrumb}>
            <span style={{ cursor: 'pointer', color: '#0F4C75', fontWeight: 600 }} onClick={() => setCurrentFolder(null)}>Drive</span>
            {currentFolder && (
              <>
                <span>/</span>
                <span style={{ color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {folderInfo(currentFolder).icon} {folderInfo(currentFolder).label}
                </span>
              </>
            )}
            <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: '.8rem' }}>({displayed.length} éléments)</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Sort */}
            <select value={sortBy + '_' + sortDir} onChange={e => {
              const [by, dir] = e.target.value.split('_')
              setSortBy(by); setSortDir(dir)
            }} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '.8rem', color: '#64748b' }}>
              <option value="updated_at_desc">Récent</option>
              <option value="updated_at_asc">Ancien</option>
              <option value="title_asc">A → Z</option>
              <option value="title_desc">Z → A</option>
            </select>

            {/* View mode */}
            <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <button onClick={() => setViewMode('grid')} style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: viewMode === 'grid' ? '#0F4C75' : '#fff', color: viewMode === 'grid' ? '#fff' : '#64748b'
              }}>⊞</button>
              <button onClick={() => setViewMode('list')} style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: viewMode === 'list' ? '#0F4C75' : '#fff', color: viewMode === 'list' ? '#fff' : '#64748b'
              }}>☰</button>
            </div>

            {/* Upload */}
            {canEdit() && (
              <>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: '.82rem', fontWeight: 500, color: '#475569'
                }}>
                  📤 Importer
                </button>
                <input ref={fileInputRef} type="file" multiple hidden onChange={e => uploadFiles(Array.from(e.target.files || []))} />
                <button onClick={openCreate} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0F4C75',
                  color: '#fff', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700
                }}>
                  + Nouveau
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content area with drag & drop */}
        <div style={{ flex: 1, overflowY: 'auto', ...S.dropzone(dragOver) }}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

          {uploading && (
            <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 8, marginBottom: 12, fontSize: '.85rem', color: '#2563eb' }}>
              ⟳ Upload en cours...
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Chargement...</div>
          ) : viewMode === 'grid' ? (
            /* ── GRID VIEW ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {/* Sub-folders when at root */}
              {!currentFolder && ROOT_FOLDERS.filter(f => folderCounts[f.id]).map(f => (
                <div key={f.id} onClick={() => setCurrentFolder(f.id)} style={{
                  padding: '16px 14px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
                  background: '#fafbfc', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 12,
                }} onMouseEnter={e => e.currentTarget.style.borderColor = f.color} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b' }}>{f.label}</div>
                    <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{folderCounts[f.id] || 0} éléments</div>
                  </div>
                </div>
              ))}

              {/* Files */}
              {displayed.map(item => {
                const isFile = item.file_type === 'file'
                const icon = isFile ? getFileIcon(item.title) : '📝'
                return (
                  <div key={item.id} onClick={() => setViewItem(item)} style={{
                    padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
                    background: '#fff', transition: 'all .15s', position: 'relative',
                  }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    {item.pinned && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 12 }}>📌</span>}
                    <div style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(item.updated_at).toLocaleDateString('fr-FR')}</span>
                      <span>{isFile ? formatSize(item.file_size) : 'Article'}</span>
                    </div>
                    {item.visibility !== 'public' && (
                      <span style={{ fontSize: 10, position: 'absolute', top: 8, left: 8 }}>
                        {item.visibility === 'managers' ? '🔒' : '🛡️'}
                      </span>
                    )}
                  </div>
                )
              })}

              {!displayed.length && currentFolder && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                  <p>Ce dossier est vide</p>
                  {canEdit() && <button onClick={openCreate} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0F4C75', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>+ Ajouter un élément</button>}
                </div>
              )}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Nom</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, width: 140 }}>Dossier</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, width: 120 }}>Modifié</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, width: 100 }}>Taille</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, width: 100 }}>Auteur</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(item => {
                  const isFile = item.file_type === 'file'
                  const icon = isFile ? getFileIcon(item.title) : '📝'
                  const cat = folderInfo(item.category)
                  return (
                    <tr key={item.id} onClick={() => setViewItem(item)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        {item.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                        {item.visibility !== 'public' && <span style={{ fontSize: 11 }}>{item.visibility === 'managers' ? '🔒' : '🛡️'}</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: cat.color, fontSize: '.8rem' }}>{cat.icon} {cat.label}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(item.updated_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{isFile ? formatSize(item.file_size) : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.profiles?.full_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Drop overlay */}
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(15,76,117,.08)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10, pointerEvents: 'none'
            }}>
              <div style={{ padding: '2rem 3rem', background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📥</div>
                <p style={{ fontWeight: 700, color: '#0F4C75' }}>Déposez vos fichiers ici</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal création/édition ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>{editId ? 'Modifier' : 'Nouveau document'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Titre *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom du document" required autoFocus />
                </div>
                <div className="field">
                  <label>Dossier</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {ROOT_FOLDERS.map(f => <option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Visibilité</label>
                  <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                    {VISIBILITY.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Épinglé</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setForm(f => ({ ...f, pinned: true }))} style={{
                      padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer',
                      background: form.pinned ? '#0F4C75' : '#fff', color: form.pinned ? '#fff' : '#64748b', fontWeight: 600, fontSize: '.85rem'
                    }}>📌 Oui</button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, pinned: false }))} style={{
                      padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer',
                      background: !form.pinned ? '#0F4C75' : '#fff', color: !form.pinned ? '#fff' : '#64748b', fontWeight: 600, fontSize: '.85rem'
                    }}>Non</button>
                  </div>
                </div>
              </div>
              <div className="field" style={{ marginTop: '.5rem' }}>
                <label>Contenu (Markdown)</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Écrivez en markdown : ## Titre, **gras**, - liste..."
                  rows={12} style={{ fontFamily: 'monospace', fontSize: '.85rem', resize: 'vertical' }} />
              </div>
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal prévisualisation ── */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{viewItem.file_type === 'file' ? getFileIcon(viewItem.title) : '📝'}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{viewItem.title}</h2>
                  <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 2 }}>
                    {folderInfo(viewItem.category).icon} {folderInfo(viewItem.category).label}
                    {' · '}{viewItem.profiles?.full_name || '—'}
                    {' · '}{new Date(viewItem.updated_at).toLocaleDateString('fr-FR')}
                    {viewItem.file_size ? ' · ' + formatSize(viewItem.file_size) : ''}
                  </div>
                </div>
                {viewItem.pinned && <span>📌</span>}
              </div>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>

            {viewItem.content ? (
              <div className="wiki-content" style={{ padding: '1rem 0', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(viewItem.content) }} />
            ) : viewItem.file_type === 'file' ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>{getFileIcon(viewItem.title)}</div>
                <p style={{ fontWeight: 600 }}>Fichier : {viewItem.title}</p>
                <p style={{ fontSize: '.85rem' }}>{formatSize(viewItem.file_size)}</p>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '2rem 0' }}>Aucun contenu.</p>
            )}

            {canEdit() && (
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-danger" onClick={() => handleDelete(viewItem.id)} style={{ fontSize: '.85rem' }}>🗑 Supprimer</button>
                <button className="btn-primary" onClick={() => openEdit(viewItem)} style={{ fontSize: '.85rem' }}>✏️ Modifier</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
