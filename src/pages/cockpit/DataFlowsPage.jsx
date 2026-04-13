import { useState, useEffect } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const PROTOCOLS = ['api_rest', 'api_graphql', 'sftp', 'database', 'webhook', 'manual', 'etl', 'message_queue', 'other']
const FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'on_demand']
const VOLUMES = ['low', 'medium', 'high']
const STATUSES = ['active', 'inactive', 'error', 'planned']
const SOURCE_TYPES = ['application', 'infrastructure']

const STATUS_COLORS = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626', planned: '#6366f1' }
const VOLUME_COLORS = { low: '#16a34a', medium: '#d97706', high: '#dc2626' }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

const emptyFlow = { name: '', source_type: 'application', source_id: '', destination_type: 'application', destination_id: '', protocol: 'api_rest', frequency: 'daily', data_type: '', volume: 'medium', is_encrypted: false, status: 'active', error_rate: 0, notes: '' }

export default function DataFlowsPage() {
  const { societeId } = useSociete()
  const { profile } = useAuth()
  const [flows, setFlows] = useState([])
  const [apps, setApps] = useState([])
  const [infras, setInfras] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyFlow })
  const [deleting, setDeleting] = useState(null)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => { if (!societeId) { setLoading(false); return }; load() }, [societeId])

  async function load() {
    setLoading(true)
    const safe = async (q) => { try { const { data, error } = await q; if (error) console.warn('[Flux]', error.message); return data || [] } catch (e) { console.warn('[Flux]', e.message); return [] } }
    const [flowsData, appsData, infrasData] = await Promise.all([
      safe(supabase.from('si_data_flows').select('*').eq('societe_id', societeId).order('name')),
      safe(supabase.from('si_applications').select('id, name').eq('societe_id', societeId).order('name')),
      safe(supabase.from('si_infrastructure').select('id, name').eq('societe_id', societeId).order('name')),
    ])
    setFlows(flowsData)
    setApps(appsData)
    setInfras(infrasData)
    setLoading(false)
  }

  function resolveEndpoint(type, id) {
    if (type === 'application') {
      const app = apps.find(a => a.id === id)
      return app ? `${app.name} (Application)` : '-'
    }
    const infra = infras.find(i => i.id === id)
    return infra ? `${infra.name} (Infrastructure)` : '-'
  }

  function endpointOptions(type) {
    if (type === 'application') return apps.map(a => ({ id: a.id, label: `${a.name} (Application)` }))
    return infras.map(i => ({ id: i.id, label: `${i.name} (Infrastructure)` }))
  }

  function openAdd() { setEditing(null); setForm({ ...emptyFlow }); setShowModal(true) }
  function openEdit(flow) { setEditing(flow); setForm({ ...flow }); setShowModal(true) }

  async function handleSave() {
    const payload = { ...form, societe_id: societeId, error_rate: parseFloat(form.error_rate) || 0 }
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.metadata
    if (editing) {
      await supabase.from('si_data_flows').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('si_data_flows').insert(payload)
    }
    setShowModal(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('si_data_flows').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = flows
    .filter(f => statusFilter === 'all' || f.status === statusFilter)
    .filter(f => {
      if (!filter) return true
      const q = filter.toLowerCase()
      return f.name.toLowerCase().includes(q) || (f.data_type || '').toLowerCase().includes(q) || (f.protocol || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🔗 Flux de donnees</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>{filtered.length} flux de donnees</p>
        </div>
        <button onClick={openAdd} style={{ padding: '.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--accent, #1D9BF0)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Ajouter
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher..." style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', minWidth: 200 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem' }}>
          <option value="all">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {[
                { key: 'name', label: 'Nom' },
                { key: 'source_id', label: 'Source' },
                { key: 'destination_id', label: 'Destination' },
                { key: 'protocol', label: 'Protocole' },
                { key: 'frequency', label: 'Frequence' },
                { key: 'is_encrypted', label: 'Chiffre' },
                { key: 'status', label: 'Statut' },
                { key: 'error_rate', label: "Taux d'erreur" },
              ].map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '.65rem .75rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th style={{ padding: '.65rem .75rem', width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(flow => (
              <tr key={flow.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(flow)}>
                <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{flow.name}</td>
                <td style={{ padding: '.55rem .75rem' }}>{resolveEndpoint(flow.source_type, flow.source_id)}</td>
                <td style={{ padding: '.55rem .75rem' }}>{resolveEndpoint(flow.destination_type, flow.destination_id)}</td>
                <td style={{ padding: '.55rem .75rem' }}>{flow.protocol}</td>
                <td style={{ padding: '.55rem .75rem' }}>{flow.frequency}</td>
                <td style={{ padding: '.55rem .75rem', textAlign: 'center' }}>{flow.is_encrypted ? '🔒' : '-'}</td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[flow.status] || '#94a3b8' }}>{flow.status}</span>
                </td>
                <td style={{ padding: '.55rem .75rem', textAlign: 'center' }}>{flow.error_rate != null ? `${flow.error_rate}%` : '-'}</td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button onClick={() => openEdit(flow)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                    <button onClick={() => setDeleting(flow)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun flux de donnees</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier le flux' : 'Ajouter un flux'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type source</label>
                <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value, source_id: '' })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Source</label>
                <select value={form.source_id} onChange={e => setForm({ ...form, source_id: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  <option value="">-- Selectionner --</option>
                  {endpointOptions(form.source_type).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type destination</label>
                <select value={form.destination_type} onChange={e => setForm({ ...form, destination_type: e.target.value, destination_id: '' })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Destination</label>
                <select value={form.destination_id} onChange={e => setForm({ ...form, destination_id: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  <option value="">-- Selectionner --</option>
                  {endpointOptions(form.destination_type).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Protocole</label>
                <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Frequence</label>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type de donnees</label>
                <input value={form.data_type || ''} onChange={e => setForm({ ...form, data_type: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Volume</label>
                <select value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Taux d'erreur (%)</label>
                <input type="number" step="0.1" value={form.error_rate} onChange={e => setForm({ ...form, error_rate: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '1.2rem' }}>
                <input type="checkbox" checked={form.is_encrypted || false} onChange={e => setForm({ ...form, is_encrypted: e.target.checked })} id="is_encrypted" />
                <label htmlFor="is_encrypted" style={{ fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}>🔒 Chiffre</label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>Annuler</button>
              <button onClick={handleSave} disabled={!form.name} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: form.name ? 1 : 0.5 }}>
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer "{deleting.name}" ?</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cette action est irreversible.</p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={() => handleDelete(deleting.id)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
