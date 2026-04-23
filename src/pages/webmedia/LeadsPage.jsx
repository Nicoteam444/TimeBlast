import { useState, useMemo } from 'react'
import { useLeads, useCampaigns, useBuyers } from '../../hooks/useWebmediaData'
import { supabase } from '../../lib/supabase'

const STATUSES = ['generated', 'purchased', 'sold', 'dead']
const STATUS_COLORS = { generated: '#1D9BF0', purchased: '#8b5cf6', sold: '#16a34a', dead: '#64748b' }
const STATUS_LABELS = { generated: 'Generated', purchased: 'Purchased', sold: 'Sold', dead: 'Dead' }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0)
}

function fmtDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' }
}

function scoreColor(score) {
  const s = parseFloat(score) || 0
  if (s >= 80) return '#16a34a'
  if (s >= 60) return '#ea580c'
  return '#dc2626'
}

const emptyLead = {
  campaign_id: '',
  source: '',
  thematic: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  zip: '',
  city: '',
  status: 'generated',
  acquisition_cost: 0,
  quality_score: 0,
}

export default function LeadsPage() {
  const { data: leads = [], loading: leadsLoading, refresh: refreshLeads } = useLeads()
  const { data: campaigns = [] } = useCampaigns()
  const { data: buyers = [] } = useBuyers()

  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [thematicFilter, setThematicFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyLead })
  const [deleting, setDeleting] = useState(null)
  const [sellLead, setSellLead] = useState(null)
  const [sellForm, setSellForm] = useState({ buyer_id: '', sale_price: 0 })
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const campaignMap = useMemo(() => {
    const m = {}
    campaigns.forEach(c => { m[c.id] = c })
    return m
  }, [campaigns])

  const thematics = useMemo(() => {
    const s = new Set()
    leads.forEach(l => { if (l.thematic) s.add(l.thematic) })
    return Array.from(s).sort()
  }, [leads])

  function openAdd() { setEditing(null); setForm({ ...emptyLead }); setShowModal(true) }
  function openEdit(lead) {
    setEditing(lead)
    setForm({
      campaign_id: lead.campaign_id || '',
      source: lead.source || '',
      thematic: lead.thematic || '',
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      zip: lead.zip || '',
      city: lead.city || '',
      status: lead.status || 'generated',
      acquisition_cost: lead.acquisition_cost || 0,
      quality_score: lead.quality_score || 0,
    })
    setShowModal(true)
  }

  async function handleSave() {
    const payload = { ...form }
    if (!payload.campaign_id) delete payload.campaign_id
    let error
    if (editing) {
      ({ error } = await supabase.from('wm_leads').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('wm_leads').insert(payload))
    }
    if (error) {
      alert('Erreur : ' + error.message + '\n\nLa table wm_leads n\'existe peut-etre pas encore. Executez la migration SQL.')
      return
    }
    setShowModal(false)
    refreshLeads()
  }

  async function handleDelete(id) {
    await supabase.from('wm_leads').delete().eq('id', id)
    setDeleting(null)
    refreshLeads()
  }

  function openSell(lead) {
    setSellLead(lead)
    setSellForm({ buyer_id: '', sale_price: lead.sale_price || 0 })
  }

  async function handleSell() {
    if (!sellLead || !sellForm.buyer_id) return
    const price = parseFloat(sellForm.sale_price) || 0
    const { error: saleError } = await supabase.from('wm_lead_sales').insert({
      lead_id: sellLead.id,
      buyer_id: sellForm.buyer_id,
      sale_price: price,
    })
    if (saleError) {
      alert('Erreur vente : ' + saleError.message)
      return
    }
    const { error: updError } = await supabase.from('wm_leads').update({
      status: 'sold',
      sale_price: price,
    }).eq('id', sellLead.id)
    if (updError) {
      alert('Erreur mise a jour lead : ' + updError.message)
      return
    }
    setSellLead(null)
    refreshLeads()
  }

  async function changeStatus(leadId, newStatus) {
    const { error } = await supabase.from('wm_leads').update({ status: newStatus }).eq('id', leadId)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    refreshLeads()
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    return leads
      .filter(l => statusFilter === 'all' || l.status === statusFilter)
      .filter(l => thematicFilter === 'all' || l.thematic === thematicFilter)
      .filter(l => campaignFilter === 'all' || l.campaign_id === campaignFilter)
      .filter(l => {
        if (!filter) return true
        const f = filter.toLowerCase()
        return (
          (l.first_name || '').toLowerCase().includes(f) ||
          (l.last_name || '').toLowerCase().includes(f) ||
          (l.email || '').toLowerCase().includes(f)
        )
      })
      .sort((a, b) => {
        let va, vb
        if (sortKey === 'full_name') {
          va = `${a.last_name || ''} ${a.first_name || ''}`
          vb = `${b.last_name || ''} ${b.first_name || ''}`
        } else if (sortKey === 'campaign_id') {
          va = campaignMap[a.campaign_id]?.name || ''
          vb = campaignMap[b.campaign_id]?.name || ''
        } else {
          va = a[sortKey] ?? ''
          vb = b[sortKey] ?? ''
        }
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [leads, filter, statusFilter, thematicFilter, campaignFilter, sortKey, sortDir, campaignMap])

  const counts = useMemo(() => {
    const c = { generated: 0, purchased: 0, sold: 0, dead: 0 }
    leads.forEach(l => { if (c[l.status] !== undefined) c[l.status]++ })
    return c
  }, [leads])

  if (leadsLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  // Agregats LeadByte depuis wm_campaigns.metadata (API ne liste pas les leads individuels)
  const lbAgg = useMemo(() => {
    const total = campaigns.reduce((s, c) => s + (Number(c.metadata?.leads_total) || 0), 0)
    const sold = campaigns.reduce((s, c) => s + (Number(c.metadata?.leads_sold) || 0), 0)
    const revenue = campaigns.reduce((s, c) => s + (Number(c.metadata?.revenue) || 0), 0)
    const activeCampaigns = campaigns.filter(c => Number(c.metadata?.leads_total) > 0).length
    return { total, sold, revenue, activeCampaigns }
  }, [campaigns])

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* LeadByte aggregates — shown when local wm_leads is empty but synced campaigns exist */}
      {leads.length === 0 && lbAgg.total > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #195C82 100%)', color: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75 }}>Agrégat LeadByte</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '.25rem' }}>{fmtE(0).replace('0', '').trim() ? '' : ''}{new Intl.NumberFormat('fr-FR').format(lbAgg.total)} leads</div>
            <div style={{ fontSize: '.72rem', opacity: 0.75, marginTop: '.15rem' }}>sur {lbAgg.activeCampaigns} campagnes actives (12 derniers mois)</div>
          </div>
          <div>
            <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75 }}>Leads vendus</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '.25rem' }}>{new Intl.NumberFormat('fr-FR').format(lbAgg.sold)}</div>
            <div style={{ fontSize: '.72rem', opacity: 0.75, marginTop: '.15rem' }}>Taux de vente : {lbAgg.total > 0 ? ((lbAgg.sold / lbAgg.total) * 100).toFixed(1) : 0}%</div>
          </div>
          <div>
            <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75 }}>Revenu (12 mois)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '.25rem' }}>{fmtE(lbAgg.revenue)}</div>
            <div style={{ fontSize: '.72rem', opacity: 0.75, marginTop: '.15rem' }}>Rapports /reports/campaign</div>
          </div>
          <div style={{ fontSize: '.78rem', opacity: 0.9, lineHeight: 1.5, alignSelf: 'center' }}>
            <strong>ℹ️ Note</strong> — L'API LeadByte REST ne permet pas de lister les leads individuels.<br/>
            Les métriques ci-dessus sont récupérées via <code style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 4 }}>/reports/campaign</code> et sont détaillées dans la page <strong>Campagnes</strong>.
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>💧 Leads Webmedia</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>
            {leads.length > 0
              ? `${leads.length} leads — ${counts.generated} generated, ${counts.sold} sold, ${counts.dead} dead`
              : 'Saisie manuelle ou import CSV — l\'API LeadByte ne liste pas les leads individuels'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setView('list')}
              style={{ padding: '.4rem .9rem', border: 'none', background: view === 'list' ? '#195C82' : 'transparent', color: view === 'list' ? '#fff' : 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '.8rem' }}
            >Liste</button>
            <button
              onClick={() => setView('kanban')}
              style={{ padding: '.4rem .9rem', border: 'none', background: view === 'kanban' ? '#195C82' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '.8rem' }}
            >Kanban par statut</button>
          </div>
          <button onClick={openAdd} style={{ padding: '.5rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Rechercher nom ou email..."
          style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', minWidth: 220, background: 'var(--card-bg, #fff)', color: 'var(--text)' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
          <option value="all">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={thematicFilter} onChange={e => setThematicFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
          <option value="all">Toutes thematiques</option>
          {thematics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
          <option value="all">Toutes campagnes</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {view === 'list' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {[
                  { key: 'full_name', label: 'Nom complet' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Telephone' },
                  { key: 'thematic', label: 'Thematique' },
                  { key: 'campaign_id', label: 'Campagne' },
                  { key: 'status', label: 'Statut' },
                  { key: 'quality_score', label: 'Score' },
                  { key: 'acquisition_cost', label: 'Acq. cost' },
                  { key: 'sale_price', label: 'Sale price' },
                  { key: 'created_at', label: 'Date' },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '.65rem .75rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th style={{ padding: '.65rem .75rem', width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(lead)}>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{lead.email || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{lead.phone || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{lead.thematic || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{campaignMap[lead.campaign_id]?.name || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[lead.status] || '#94a3b8' }}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: scoreColor(lead.quality_score) }}>
                      {lead.quality_score ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '.55rem .75rem' }}>{fmtE(lead.acquisition_cost)}</td>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{lead.sale_price ? fmtE(lead.sale_price) : '-'}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text-muted)' }}>{fmtDate(lead.created_at)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}>
                      {lead.status !== 'sold' && lead.status !== 'dead' && (
                        <button
                          onClick={() => openSell(lead)}
                          style={{ padding: '2px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}
                          title="Vendre ce lead"
                        >Vendre</button>
                      )}
                      <button onClick={() => openEdit(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                      <button onClick={() => setDeleting(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun lead</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem' }}>
          {STATUSES.map(st => {
            const colLeads = filtered.filter(l => l.status === st)
            return (
              <div
                key={st}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) changeStatus(id, st)
                }}
                style={{ ...cardStyle, padding: '.75rem', minHeight: 400 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem', paddingBottom: '.5rem', borderBottom: `3px solid ${STATUS_COLORS[st]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[st] }} />
                    <strong style={{ fontSize: '.85rem' }}>{STATUS_LABELS[st]}</strong>
                  </div>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{colLeads.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', lead.id)}
                      onDoubleClick={() => openEdit(lead)}
                      style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderLeft: `3px solid ${STATUS_COLORS[st]}`, borderRadius: 8, padding: '.55rem .6rem', cursor: 'grab', fontSize: '.78rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '.4rem' }}>
                        <strong style={{ fontSize: '.82rem' }}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(sans nom)'}</strong>
                        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: '.65rem', fontWeight: 700, color: '#fff', background: scoreColor(lead.quality_score) }}>
                          {lead.quality_score ?? 0}
                        </span>
                      </div>
                      {lead.email && <div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginTop: 2 }}>{lead.email}</div>}
                      {lead.thematic && <div style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>{lead.thematic}</div>}
                      {campaignMap[lead.campaign_id] && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '.7rem', marginTop: 2 }}>
                          📣 {campaignMap[lead.campaign_id].name}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.4rem', fontSize: '.7rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Acq. {fmtE(lead.acquisition_cost)}</span>
                        {lead.sale_price ? <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmtE(lead.sale_price)}</span> : null}
                      </div>
                      {st !== 'sold' && st !== 'dead' && (
                        <button
                          onClick={() => openSell(lead)}
                          style={{ marginTop: '.4rem', width: '100%', padding: '3px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >Vendre</button>
                      )}
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '.75rem', fontStyle: 'italic' }}>Aucun lead</div>
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
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier le lead' : 'Ajouter un lead'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Campagne</label>
                <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
                  <option value="">-- Aucune --</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Source</label>
                <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thematique</label>
                <input value={form.thematic} onChange={e => setForm({ ...form, thematic: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prenom</label>
                <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom</label>
                <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Telephone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Code postal</label>
                <input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ville</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cout d'acquisition (EUR)</label>
                <input type="number" step="0.01" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Score qualite (0-100)</label>
                <input type="number" min={0} max={100} value={form.quality_score} onChange={e => setForm({ ...form, quality_score: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', color: 'var(--text)' }}>Annuler</button>
              <button onClick={handleSave} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {sellLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSellLead(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '.25rem' }}>Vendre ce lead</h2>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {[sellLead.first_name, sellLead.last_name].filter(Boolean).join(' ') || sellLead.email || '(sans nom)'}
            </p>
            <div style={{ display: 'grid', gap: '.75rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Acheteur *</label>
                <select value={sellForm.buyer_id} onChange={e => setSellForm({ ...sellForm, buyer_id: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }}>
                  <option value="">-- Selectionner --</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prix de vente (EUR) *</label>
                <input type="number" step="0.01" value={sellForm.sale_price} onChange={e => setSellForm({ ...sellForm, sale_price: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'var(--text)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setSellLead(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', color: 'var(--text)' }}>Annuler</button>
              <button
                onClick={handleSell}
                disabled={!sellForm.buyer_id || !sellForm.sale_price}
                style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: (sellForm.buyer_id && sellForm.sale_price) ? 1 : 0.5 }}
              >Confirmer la vente</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>
              Supprimer le lead "{[deleting.first_name, deleting.last_name].filter(Boolean).join(' ') || deleting.email || 'sans nom'}" ?
            </h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cette action est irreversible.</p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}>Annuler</button>
              <button onClick={() => handleDelete(deleting.id)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
