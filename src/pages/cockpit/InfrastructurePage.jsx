import { useState, useEffect } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const TYPES = ['server', 'vm', 'container', 'cloud_service', 'network', 'storage', 'firewall', 'load_balancer', 'database', 'other']
const STATUSES = ['running', 'stopped', 'maintenance', 'decommissioned']
const CRITICALITIES = ['critical', 'high', 'medium', 'low']
const HEALTH_STATUSES = ['healthy', 'warning', 'critical', 'unknown']

const STATUS_COLORS = { running: '#16a34a', stopped: '#94a3b8', maintenance: '#d97706', decommissioned: '#64748b' }
const HEALTH_COLORS = { healthy: '#16a34a', warning: '#d97706', critical: '#dc2626', unknown: '#94a3b8' }
const CRIT_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }

const emptyInfra = { name: '', type: 'server', provider: '', region: '', ip_address: '', os: '', monthly_cost: 0, status: 'running', criticality: 'medium', monitoring_url: '', health_status: 'unknown', notes: '' }

export default function InfrastructurePage() {
  const { societeId } = useSociete()
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyInfra })
  const [deleting, setDeleting] = useState(null)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => { if (!societeId) { setLoading(false); return }; load() }, [societeId])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('si_infrastructure').select('*').eq('societe_id', societeId).order('name')
      if (error) console.warn('[Infra]', error.message)
      setItems(data || [])
    } catch (e) { console.warn('[Infra]', e.message) }
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm({ ...emptyInfra }); setShowModal(true) }
  function openEdit(item) { setEditing(item); setForm({ ...item }); setShowModal(true) }

  async function handleSave() {
    const payload = { ...form, societe_id: societeId }
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.metadata; delete payload.specs
    if (editing) {
      await supabase.from('si_infrastructure').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('si_infrastructure').insert(payload)
    }
    setShowModal(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('si_infrastructure').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = items
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || (a.provider || '').toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalCost = filtered.reduce((s, a) => s + (parseFloat(a.monthly_cost) || 0), 0)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🖥 Infrastructure SI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>{filtered.length} ressources — Cout total : {fmtE(totalCost)}/mois</p>
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
                { key: 'type', label: 'Type' },
                { key: 'provider', label: 'Fournisseur' },
                { key: 'region', label: 'Region' },
                { key: 'status', label: 'Statut' },
                { key: 'health_status', label: 'Sante' },
                { key: 'criticality', label: 'Criticite' },
                { key: 'monthly_cost', label: 'Cout/mois' },
              ].map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '.65rem .75rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th style={{ padding: '.65rem .75rem', width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(item)}>
                <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '.55rem .75rem' }}>{item.type}</td>
                <td style={{ padding: '.55rem .75rem' }}>{item.provider || '-'}</td>
                <td style={{ padding: '.55rem .75rem' }}>{item.region || '-'}</td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[item.status] || '#94a3b8' }}>{item.status}</span>
                </td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: HEALTH_COLORS[item.health_status] || '#94a3b8' }}>{item.health_status || 'unknown'}</span>
                </td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: CRIT_COLORS[item.criticality] || '#94a3b8' }}>{item.criticality}</span>
                </td>
                <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{fmtE(item.monthly_cost)}</td>
                <td style={{ padding: '.55rem .75rem' }}>
                  <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                    <button onClick={() => setDeleting(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune ressource</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier la ressource' : 'Ajouter une ressource'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fournisseur</label>
                <input value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Region</label>
                <input value={form.region || ''} onChange={e => setForm({ ...form, region: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Adresse IP</label>
                <input value={form.ip_address || ''} onChange={e => setForm({ ...form, ip_address: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Systeme d'exploitation</label>
                <input value={form.os || ''} onChange={e => setForm({ ...form, os: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Criticite</label>
                <select value={form.criticality} onChange={e => setForm({ ...form, criticality: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sante</label>
                <select value={form.health_status || 'unknown'} onChange={e => setForm({ ...form, health_status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {HEALTH_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cout mensuel (EUR)</label>
                <input type="number" value={form.monthly_cost} onChange={e => setForm({ ...form, monthly_cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>URL de monitoring</label>
                <input value={form.monitoring_url || ''} onChange={e => setForm({ ...form, monitoring_url: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }} />
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
