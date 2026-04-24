import { useState, useMemo } from 'react'
import { useCampaigns } from '../../hooks/useWebmediaData'
import { supabase } from '../../lib/supabase'

const CHANNELS = ['meta_ads', 'google_ads', 'sms', 'jeux_concours', 'lemlist', 'linkedin', 'autres']
const STATUSES = ['active', 'paused', 'ended', 'draft']

const CHANNEL_LABELS = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  sms: 'SMS',
  jeux_concours: 'Jeux concours',
  lemlist: 'Lemlist',
  linkedin: 'LinkedIn',
  autres: 'Autres',
}

const CHANNEL_COLORS = {
  meta_ads: '#1877f2',
  google_ads: '#4285f4',
  sms: '#f59e0b',
  jeux_concours: '#ec4899',
  lemlist: '#8b5cf6',
  linkedin: '#0a66c2',
  autres: '#64748b',
}

const STATUS_COLORS = {
  active: '#16a34a',
  paused: '#d97706',
  ended: '#64748b',
  draft: '#6366f1',
}

const STATUS_LABELS = {
  active: 'Active',
  paused: 'En pause',
  ended: 'Terminee',
  draft: 'Brouillon',
}

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }

function fmtDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

const emptyCampaign = {
  name: '',
  channel: 'meta_ads',
  thematic: '',
  status: 'draft',
  budget: 0,
  cost: 0,
  starts_on: '',
  ends_on: '',
  notes: '',
}

export default function CampaignsPage() {
  const { campaigns, loading, reload } = useCampaigns()
  const [filter, setFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyCampaign })
  const [deleting, setDeleting] = useState(null)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function openAdd() { setEditing(null); setForm({ ...emptyCampaign }); setShowModal(true) }
  function openEdit(c) {
    setEditing(c)
    setForm({
      ...emptyCampaign,
      ...c,
      starts_on: c.starts_on ? String(c.starts_on).slice(0, 10) : '',
      ends_on: c.ends_on ? String(c.ends_on).slice(0, 10) : '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    const payload = { ...form }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    if (!payload.starts_on) payload.starts_on = null
    if (!payload.ends_on) payload.ends_on = null
    payload.budget = parseFloat(payload.budget) || 0
    payload.cost = parseFloat(payload.cost) || 0

    let error
    if (editing) {
      ({ error } = await supabase.from('wm_campaigns').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('wm_campaigns').insert(payload))
    }
    if (error) {
      alert('Erreur : ' + error.message + '\n\nLa table wm_campaigns n\'existe peut-etre pas encore. Executez la migration SQL.')
      return
    }
    setShowModal(false)
    reload && reload()
  }

  async function handleDelete(id) {
    await supabase.from('wm_campaigns').delete().eq('id', id)
    setDeleting(null)
    reload && reload()
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    return (campaigns || [])
      .filter(c => channelFilter === 'all' || c.channel === channelFilter)
      .filter(c => statusFilter === 'all' || c.status === statusFilter)
      .filter(c => !filter || (c.name || '').toLowerCase().includes(filter.toLowerCase()) || (c.thematic || '').toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        const va = a[sortKey] ?? ''
        const vb = b[sortKey] ?? ''
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [campaigns, filter, channelFilter, statusFilter, sortKey, sortDir])

  const totalBudget = filtered.reduce((s, c) => s + (parseFloat(c.budget) || 0), 0)
  const totalCost = filtered.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>📢 Campagnes Webmedia</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>
            {filtered.length} campagne{filtered.length > 1 ? 's' : ''} — Budget : {fmtE(totalBudget)} — Cout : {fmtE(totalCost)}
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: '.5rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Ajouter
        </button>
      </div>

      {/* Filters + view toggle */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher par nom ou thematique..." style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', minWidth: 240, background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
          <option value="all">Tous les leviers</option>
          {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
          <option value="all">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setView('list')} style={{ padding: '.45rem .9rem', border: 'none', background: view === 'list' ? '#195C82' : 'transparent', color: view === 'list' ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' }}>Liste</button>
          <button onClick={() => setView('kanban')} style={{ padding: '.45rem .9rem', border: 'none', background: view === 'kanban' ? '#195C82' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' }}>Kanban par levier</button>
        </div>
      </div>

      {/* Table view */}
      {view === 'list' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem', color: 'var(--text)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {[
                  { key: 'name', label: 'Nom' },
                  { key: 'thematic', label: 'Référence' },
                  { key: 'country', label: 'Pays' },
                  { key: 'status', label: 'Statut' },
                  { key: 'leads_total', label: 'Leads' },
                  { key: 'leads_sold', label: 'Vendus' },
                  { key: 'conversion', label: '% vente' },
                  { key: 'revenue', label: 'Revenu' },
                  { key: 'cost', label: 'Coût' },
                  { key: 'profit', label: 'Marge' },
                  { key: 'margin_pct', label: 'Marge %' },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '.65rem .75rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th style={{ padding: '.65rem .75rem', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const meta = c.metadata || {}
                const leadsTotal = Number(meta.leads_total) || 0
                const leadsSold = Number(meta.leads_sold) || 0
                const revenue = Number(meta.revenue) || 0
                const profit = Number(meta.profit) || 0
                const cost = Number(c.cost) || Number(meta.payout) || 0
                const conversionPct = leadsTotal > 0 ? (leadsSold / leadsTotal * 100) : 0
                const marginPct = revenue > 0 ? (profit / revenue * 100) : 0
                const profitColor = profit > 0 ? '#16a34a' : profit < 0 ? '#dc2626' : '#64748b'
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(c)}>
                    <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '.55rem .75rem', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '.75rem', color: '#475569' }}>{c.thematic || meta.reference || '-'}</td>
                    <td style={{ padding: '.55rem .75rem', fontSize: '.78rem' }}>{meta.country || '-'}</td>
                    <td style={{ padding: '.55rem .75rem' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[c.status] || '#94a3b8' }}>{STATUS_LABELS[c.status] || c.status}</span>
                    </td>
                    <td style={{ padding: '.55rem .75rem', fontWeight: 700, textAlign: 'right' }}>{leadsTotal.toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '.55rem .75rem', fontWeight: 700, textAlign: 'right', color: '#1D9BF0' }}>{leadsSold.toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '.55rem .75rem', textAlign: 'right', color: conversionPct >= 80 ? '#16a34a' : conversionPct >= 60 ? '#d97706' : '#64748b', fontWeight: 600 }}>{conversionPct.toFixed(0)}%</td>
                    <td style={{ padding: '.55rem .75rem', fontWeight: 700, textAlign: 'right', color: '#195C82' }}>{fmtE(revenue)}</td>
                    <td style={{ padding: '.55rem .75rem', textAlign: 'right' }}>{fmtE(cost)}</td>
                    <td style={{ padding: '.55rem .75rem', textAlign: 'right', fontWeight: 700, color: profitColor }}>{fmtE(profit)}</td>
                    <td style={{ padding: '.55rem .75rem', textAlign: 'right', fontWeight: 700, color: profitColor }}>{marginPct.toFixed(1)}%</td>
                    <td style={{ padding: '.55rem .75rem' }}>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                        <button onClick={() => setDeleting(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune campagne</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '.85rem' }}>
          {CHANNELS.map(ch => {
            const items = filtered.filter(c => c.channel === ch)
            const chBudget = items.reduce((s, c) => s + (parseFloat(c.budget) || 0), 0)
            return (
              <div key={ch} style={{ ...cardStyle, padding: '.85rem', background: 'var(--card-bg, #f8fafc)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem', paddingBottom: '.5rem', borderBottom: `2px solid ${CHANNEL_COLORS[ch]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: CHANNEL_COLORS[ch] }} />
                    <strong style={{ fontSize: '.85rem', color: 'var(--text)' }}>{CHANNEL_LABELS[ch]}</strong>
                  </div>
                  <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{items.length} · {fmtE(chBudget)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', minHeight: 50 }}>
                  {items.map(c => (
                    <div key={c.id} onClick={() => openEdit(c)} style={{ padding: '.6rem .7rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
                        <strong style={{ fontSize: '.82rem', color: 'var(--text)' }}>{c.name}</strong>
                        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 5, fontSize: '.62rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[c.status] || '#94a3b8', whiteSpace: 'nowrap' }}>{STATUS_LABELS[c.status] || c.status}</span>
                      </div>
                      {c.thematic && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{c.thematic}</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                        <span>Budget : <strong style={{ color: 'var(--text)' }}>{fmtE(c.budget)}</strong></span>
                        <span>Cout : <strong style={{ color: 'var(--text)' }}>{fmtE(c.cost)}</strong></span>
                      </div>
                      {(c.starts_on || c.ends_on) && (
                        <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                          {fmtDate(c.starts_on)} → {fmtDate(c.ends_on)}
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ padding: '.75rem', textAlign: 'center', fontSize: '.72rem', color: 'var(--text-muted)' }}>Aucune campagne</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', color: 'var(--text)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier la campagne' : 'Ajouter une campagne'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Levier</label>
                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
                  {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thematique</label>
                <input value={form.thematic || ''} onChange={e => setForm({ ...form, thematic: e.target.value })} placeholder="Ex: Soldes d'ete, Notoriete de marque..." style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Budget (EUR)</label>
                <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cout reel (EUR)</label>
                <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date de debut</label>
                <input type="date" value={form.starts_on || ''} onChange={e => setForm({ ...form, starts_on: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date de fin</label>
                <input type="date" value={form.ends_on || ''} onChange={e => setForm({ ...form, ends_on: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>Annuler</button>
              <button onClick={handleSave} disabled={!form.name} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: form.name ? 1 : 0.5 }}>
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', color: 'var(--text)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer "{deleting.name}" ?</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cette action est irreversible.</p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={() => handleDelete(deleting.id)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
