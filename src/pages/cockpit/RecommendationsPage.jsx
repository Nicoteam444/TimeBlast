import { useState, useEffect } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['security', 'optimization', 'cost', 'integration', 'compliance', 'upgrade', 'automation', 'other']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUSES = ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'dismissed']
const EFFORTS = ['low', 'medium', 'high']

const PRIORITY_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' }
const CATEGORY_ICONS = { security: '\u{1F6E1}', optimization: '\u26A1', cost: '\u{1F4B0}', integration: '\u{1F517}', compliance: '\u{1F4CB}', upgrade: '\u{1F504}', automation: '\u{1F916}', other: '\u{1F4A1}' }

const STATUS_TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvees' },
  { key: 'rejected', label: 'Rejetees' },
]

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }

const emptyRec = { title: '', description: '', category: 'other', priority: 'medium', status: 'pending', impact: '', effort: 'medium', estimated_savings: 0, ai_reasoning: '' }

export default function RecommendationsPage() {
  const { societeId } = useSociete()
  const { profile } = useAuth()
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyRec })
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { if (!societeId) { setLoading(false); return }; load() }, [societeId])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('si_recommendations').select('*').eq('societe_id', societeId).order('created_at', { ascending: false })
      if (error) console.warn('[Recos]', error.message)
      setRecs(data || [])
    } catch (e) { console.warn('[Recos]', e.message) }
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm({ ...emptyRec }); setShowModal(true) }
  function openEdit(rec) { setEditing(rec); setForm({ ...rec }); setShowModal(true) }

  async function handleSave() {
    const payload = { ...form, societe_id: societeId }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    if (editing) {
      await supabase.from('si_recommendations').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('si_recommendations').insert(payload)
    }
    setShowModal(false)
    load()
  }

  async function handleApprove(rec) {
    await supabase.from('si_recommendations').update({ status: 'approved', approved_by: profile?.id, approved_at: new Date().toISOString() }).eq('id', rec.id)
    load()
  }

  async function handleDismiss(rec) {
    await supabase.from('si_recommendations').update({ status: 'dismissed' }).eq('id', rec.id)
    load()
  }

  const filtered = recs
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => priorityFilter === 'all' || r.priority === priorityFilter)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{'\u{1F4A1}'} Recommandations IA</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>{filtered.length} recommandation{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} style={{ padding: '.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--accent, #1D9BF0)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Ajouter
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)} style={{ padding: '.45rem .85rem', border: 'none', background: statusFilter === tab.key ? 'var(--accent, #1D9BF0)' : 'transparent', color: statusFilter === tab.key ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem' }}>
          <option value="all">Toutes priorites</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {filtered.map(rec => {
          const isDismissed = rec.status === 'dismissed'
          const isApproved = rec.status === 'approved'
          const isPending = rec.status === 'pending'
          const isExpanded = expandedId === rec.id

          return (
            <div key={rec.id} style={{ ...cardStyle, opacity: isDismissed ? 0.6 : 1, textDecoration: isDismissed ? 'line-through' : 'none', position: 'relative' }}>
              {/* Header row: category icon + priority badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[rec.category] || '\u{1F4A1}'}</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{rec.category}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  {isApproved && <span style={{ fontSize: '1rem', color: '#16a34a' }}>{'\u2705'}</span>}
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: PRIORITY_COLORS[rec.priority] || '#94a3b8' }}>{rec.priority}</span>
                </div>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '.95rem', fontWeight: 700, margin: '0 0 .4rem', lineHeight: 1.3 }}>{rec.title}</h3>

              {/* Description truncated */}
              {rec.description && (
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', margin: '0 0 .6rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rec.description}
                </p>
              )}

              {/* Meta row: savings + effort */}
              <div style={{ display: 'flex', gap: '.75rem', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.6rem', flexWrap: 'wrap' }}>
                {rec.estimated_savings > 0 && (
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{'\u{1F4B0}'} {fmtE(rec.estimated_savings)}</span>
                )}
                {rec.effort && (
                  <span>Effort : <strong>{rec.effort}</strong></span>
                )}
                {rec.impact && (
                  <span>Impact : {rec.impact}</span>
                )}
              </div>

              {/* AI Reasoning expandable */}
              {rec.ai_reasoning && (
                <div style={{ marginBottom: '.6rem' }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: 'var(--accent, #1D9BF0)', fontWeight: 600, padding: 0 }}>
                    {isExpanded ? '\u25BC' : '\u25B6'} Raisonnement IA
                  </button>
                  {isExpanded && (
                    <div style={{ marginTop: '.35rem', padding: '.6rem', background: 'var(--bg-muted, #f8fafc)', borderRadius: 8, fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {rec.ai_reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '.6rem' }}>
                <button onClick={() => openEdit(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem' }} title="Modifier">{'\u270F\uFE0F'}</button>
                {isPending && (
                  <>
                    <button onClick={() => handleApprove(rec)} style={{ padding: '.3rem .7rem', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: '.75rem', cursor: 'pointer' }}>Approuver</button>
                    <button onClick={() => handleDismiss(rec)} style={{ padding: '.3rem .7rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '.75rem', cursor: 'pointer' }}>Ignorer</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Aucune recommandation</div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier la recommandation' : 'Ajouter une recommandation'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Titre *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Categorie</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Priorite</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Effort</label>
                <select value={form.effort} onChange={e => setForm({ ...form, effort: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {EFFORTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Economies estimees (EUR)</label>
                <input type="number" value={form.estimated_savings} onChange={e => setForm({ ...form, estimated_savings: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Impact</label>
                <input value={form.impact || ''} onChange={e => setForm({ ...form, impact: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Raisonnement IA</label>
                <textarea value={form.ai_reasoning || ''} onChange={e => setForm({ ...form, ai_reasoning: e.target.value })} rows={3} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>Annuler</button>
              <button onClick={handleSave} disabled={!form.title} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: form.title ? 1 : 0.5 }}>
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
