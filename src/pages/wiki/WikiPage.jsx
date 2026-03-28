import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = [
  { id: 'clients',      label: 'Clients',        icon: '👤', color: '#0891b2' },
  { id: 'contrats',     label: 'Contrats',        icon: '📄', color: '#7c3aed' },
  { id: 'commerce',     label: 'Commerce',        icon: '💼', color: '#0F4C75' },
  { id: 'offres_ia',    label: 'Offres IA',       icon: '🤖', color: '#F8B35A' },
  { id: 'process',      label: 'Process',         icon: '⚙️', color: '#64748b' },
  { id: 'documentation',label: 'Documentation',   icon: '📚', color: '#16a34a' },
  { id: 'roadmap',      label: 'Roadmap',         icon: '🗺️', color: '#dc2626' },
  { id: 'formation',    label: 'Formation',       icon: '🎓', color: '#6366f1' },
]

const VISIBILITY = [
  { id: 'public',    label: 'Tous les utilisateurs', icon: '🌐' },
  { id: 'managers',  label: 'Managers & Admins',      icon: '🔒' },
  { id: 'admins',    label: 'Admins uniquement',      icon: '🛡️' },
]

const EMPTY_ARTICLE = {
  title: '', category: 'documentation', content: '', visibility: 'public', pinned: false,
}

export default function WikiPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_ARTICLE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [viewArticle, setViewArticle] = useState(null)
  const [useFallback, setUseFallback] = useState(false)

  const userRole = profile?.role

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('wiki_articles')
      .select('*, profiles(full_name)')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (err) {
      // Table doesn't exist yet — use demo data
      setUseFallback(true)
      setArticles(getDemoArticles())
    } else {
      setArticles(data || [])
    }
    setLoading(false)
  }

  function getDemoArticles() {
    return [
      { id: 'd1', title: 'Roadmap IA — 3 phases', category: 'roadmap', content: '## Phase 1 : Agrégateur interne\nHub qui discute avec un LLM pour synthétiser les données.\n\n## Phase 2 : IA SRA native\nIntégration directe dans le produit.\n\n## Phase 3 : MCP Client + Agents IT\nAgents orchestrateurs connectés aux outils clients via MCP.', visibility: 'public', pinned: true, created_by: profile?.id, updated_at: new Date().toISOString(), profiles: { full_name: 'Admin' } },
      { id: 'd2', title: 'Offre Diagnostic IA', category: 'offres_ia', content: '## Diagnostic IA\nÉvaluation de la maturité IA de l\'entreprise.\n\n### Contenu\n- Audit des outils existants\n- Identification des cas d\'usage IA\n- Recommandations personnalisées\n- Plan d\'action 90 jours', visibility: 'public', pinned: true, created_by: profile?.id, updated_at: new Date().toISOString(), profiles: { full_name: 'Admin' } },
      { id: 'd3', title: 'Offre Agrégateur interne', category: 'offres_ia', content: '## Agrégateur intelligent\nConnectez tous vos outils en une multiprise intelligente.\n\n### Fonctionnalités\n- Synchronisation multi-outils\n- Tableau de bord unifié\n- Alertes et anomalies\n- Rapports automatiques', visibility: 'public', pinned: false, created_by: profile?.id, updated_at: new Date().toISOString(), profiles: { full_name: 'Admin' } },
      { id: 'd4', title: 'Process de vente — Commerce', category: 'commerce', content: '## Process de vente\n1. Qualification du lead\n2. Découverte des besoins\n3. Proposition commerciale\n4. Négociation\n5. Closing\n6. Onboarding client', visibility: 'managers', pinned: false, created_by: profile?.id, updated_at: new Date().toISOString(), profiles: { full_name: 'Admin' } },
    ]
  }

  function canView(article) {
    if (article.visibility === 'public') return true
    if (article.visibility === 'managers' && ['admin', 'manager'].includes(userRole)) return true
    if (article.visibility === 'admins' && userRole === 'admin') return true
    return false
  }

  function canEdit(article) {
    return userRole === 'admin' || article.created_by === profile?.id
  }

  const filtered = useMemo(() => {
    let list = articles.filter(a => canView(a))
    if (filterCat) list = list.filter(a => a.category === filterCat)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q))
    }
    return list
  }, [articles, search, filterCat, userRole])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_ARTICLE)
    setShowForm(true)
    setError(null)
  }

  function openEdit(article) {
    setEditId(article.id)
    setForm({ title: article.title, category: article.category, content: article.content, visibility: article.visibility, pinned: article.pinned || false })
    setShowForm(true)
    setViewArticle(null)
    setError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, updated_at: new Date().toISOString() }

    if (useFallback) {
      // Demo mode — just update local state
      if (editId) {
        setArticles(prev => prev.map(a => a.id === editId ? { ...a, ...payload } : a))
      } else {
        setArticles(prev => [{ id: 'new-' + Date.now(), ...payload, created_by: profile?.id, profiles: { full_name: profile?.full_name } }, ...prev])
      }
      setSaving(false)
      setShowForm(false)
      return
    }

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
    fetchArticles()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet article ?')) return
    if (useFallback) {
      setArticles(prev => prev.filter(a => a.id !== id))
      setViewArticle(null)
      return
    }
    await supabase.from('wiki_articles').delete().eq('id', id)
    setViewArticle(null)
    fetchArticles()
  }

  // Simple markdown → HTML (basique)
  function renderMarkdown(md) {
    if (!md) return ''
    return md
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
  }

  const catInfo = (id) => CATEGORIES.find(c => c.id === id) || { label: id, icon: '📄', color: '#64748b' }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>📚 Base de connaissances</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {filtered.length} article{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'manager') && (
          <button className="btn-primary" onClick={openCreate}>+ Nouvel article</button>
        )}
      </div>

      {/* SQL migration hint */}
      {useFallback && userRole === 'admin' && (
        <div className="fec-sql-box" style={{ marginBottom: '1rem' }}>
          <p>⚠ La table <code>wiki_articles</code> n'existe pas encore. Exécutez ce SQL :</p>
          <pre>{`CREATE TABLE wiki_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'documentation',
  content text,
  visibility text NOT NULL DEFAULT 'public',
  pinned boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_read" ON wiki_articles FOR SELECT USING (true);
CREATE POLICY "wiki_write" ON wiki_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);`}</pre>
          <button className="btn-secondary" style={{ marginTop: '.5rem', fontSize: '.82rem' }}
            onClick={() => navigator.clipboard.writeText(`CREATE TABLE wiki_articles (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  title text NOT NULL,\n  category text NOT NULL DEFAULT 'documentation',\n  content text,\n  visibility text NOT NULL DEFAULT 'public',\n  pinned boolean DEFAULT false,\n  created_by uuid REFERENCES profiles(id),\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);\nALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "wiki_read" ON wiki_articles FOR SELECT USING (true);\nCREATE POLICY "wiki_write" ON wiki_articles FOR ALL USING (\n  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))\n);`)}>
            📋 Copier le SQL
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="users-filter-bar">
        <input className="table-search" type="text" placeholder="🔍 Rechercher un article..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="table-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* ── Modale création/édition ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>{editId ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Titre *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de l'article" required autoFocus />
                </div>
                <div className="field">
                  <label>Catégorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
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
                  <div className="toggle-group">
                    <button type="button" className={`toggle-btn ${form.pinned ? 'toggle-btn--active' : ''}`} onClick={() => setForm(f => ({ ...f, pinned: true }))}>📌 Oui</button>
                    <button type="button" className={`toggle-btn ${!form.pinned ? 'toggle-btn--active' : ''}`} onClick={() => setForm(f => ({ ...f, pinned: false }))}>Non</button>
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
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Vue article ── */}
      {viewArticle && (
        <div className="modal-overlay" onClick={() => setViewArticle(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span>{catInfo(viewArticle.category).icon}</span>
                <h2 style={{ margin: 0 }}>{viewArticle.title}</h2>
                {viewArticle.pinned && <span>📌</span>}
              </div>
              <button className="modal-close" onClick={() => setViewArticle(null)}>✕</button>
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Par {viewArticle.profiles?.full_name || '—'} · {new Date(viewArticle.updated_at).toLocaleDateString('fr-FR')}
              {' · '}
              <span className="status-badge" style={{ color: catInfo(viewArticle.category).color, background: catInfo(viewArticle.category).color + '15' }}>
                {catInfo(viewArticle.category).label}
              </span>
            </div>
            <div className="wiki-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(viewArticle.content) }} />
            {canEdit(viewArticle) && (
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn-danger" onClick={() => handleDelete(viewArticle.id)}>🗑 Supprimer</button>
                <button className="btn-primary" onClick={() => openEdit(viewArticle)}>✏️ Modifier</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Liste articles ── */}
      {loading ? (
        <div className="loading-inline">Chargement...</div>
      ) : (
        <div className="wiki-grid">
          {filtered.map(article => {
            const cat = catInfo(article.category)
            return (
              <div key={article.id} className={`wiki-card ${article.pinned ? 'wiki-card--pinned' : ''}`} onClick={() => setViewArticle(article)}>
                <div className="wiki-card-header">
                  <span className="wiki-card-cat" style={{ color: cat.color, background: cat.color + '15' }}>{cat.icon} {cat.label}</span>
                  {article.pinned && <span style={{ fontSize: '.75rem' }}>📌</span>}
                  {article.visibility !== 'public' && (
                    <span style={{ fontSize: '.72rem', color: '#f59e0b' }}>
                      {article.visibility === 'managers' ? '🔒' : '🛡️'}
                    </span>
                  )}
                </div>
                <h3 className="wiki-card-title">{article.title}</h3>
                <p className="wiki-card-excerpt">
                  {(article.content || '').replace(/[#*`\-]/g, '').slice(0, 120)}
                  {(article.content || '').length > 120 ? '…' : ''}
                </p>
                <div className="wiki-card-meta">
                  <span>{article.profiles?.full_name || '—'}</span>
                  <span>{new Date(article.updated_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Aucun article trouvé.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
