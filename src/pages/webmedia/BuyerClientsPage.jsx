import { useState, useEffect } from 'react'
import { useBuyers } from '../../hooks/useWebmediaData'
import { supabase } from '../../lib/supabase'

const BILLING_MODES = ['per_lead', 'per_hour', 'per_batch', 'mixed']
const BILLING_LABELS = { per_lead: 'Par lead', per_hour: 'Par heure', per_batch: 'Par batch', mixed: 'Mixte' }
const STATUSES = ['active', 'paused', 'ended', 'prospect']
const STATUS_LABELS = { active: 'Actif', paused: 'En pause', ended: 'Termine', prospect: 'Prospect' }
const STATUS_COLORS = { active: '#16a34a', paused: '#d97706', ended: '#64748b', prospect: '#6366f1' }

const THEMATICS = ['Investissement', 'Banque/Assurance', 'Silver', 'Travaux', 'B2B', 'Formation', 'E-commerce', 'Voyance', 'Autre']

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }

function hashColor(str) {
  if (!str) return '#94a3b8'
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  const palette = ['#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#db2777', '#ea580c', '#0d9488', '#4f46e5', '#7c3aed', '#059669']
  return palette[Math.abs(h) % palette.length]
}

const emptyBuyer = {
  name: '', contact_name: '', email: '', phone: '', address: '',
  thematics: [], monthly_volume: 0, unit_price: 0, hourly_rate: 0,
  billing_mode: 'per_lead', status: 'prospect', notes: ''
}

export default function BuyerClientsPage() {
  const { buyers, loading, reload } = useBuyers()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('list') // 'list' | 'cards'
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyBuyer })
  const [deleting, setDeleting] = useState(null)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function openAdd() { setEditing(null); setForm({ ...emptyBuyer }); setShowModal(true) }
  function openEdit(b) {
    setEditing(b)
    setForm({
      ...emptyBuyer,
      ...b,
      thematics: Array.isArray(b.thematics) ? b.thematics : []
    })
    setShowModal(true)
  }

  function toggleThematic(t) {
    setForm(f => ({
      ...f,
      thematics: f.thematics.includes(t) ? f.thematics.filter(x => x !== t) : [...f.thematics, t]
    }))
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      thematics: form.thematics || [],
      monthly_volume: parseInt(form.monthly_volume) || 0,
      unit_price: parseFloat(form.unit_price) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      billing_mode: form.billing_mode,
      status: form.status,
      notes: form.notes || null
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('wm_buyer_clients').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('wm_buyer_clients').insert(payload))
    }
    if (error) {
      alert('Erreur : ' + error.message + '\n\nLa table wm_buyer_clients n\'existe peut-etre pas encore. Executez la migration SQL.')
      return
    }
    setShowModal(false)
    reload && reload()
  }

  async function handleDelete(id) {
    await supabase.from('wm_buyer_clients').delete().eq('id', id)
    setDeleting(null)
    reload && reload()
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = (buyers || [])
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .filter(b => {
      if (!filter) return true
      const q = filter.toLowerCase()
      return (b.name || '').toLowerCase().includes(q)
        || (b.contact_name || '').toLowerCase().includes(q)
        || (b.email || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (Array.isArray(va)) va = va.join(',')
      if (Array.isArray(vb)) vb = vb.join(',')
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalCA = filtered.reduce((s, b) => s + ((parseInt(b.monthly_volume) || 0) * (parseFloat(b.unit_price) || 0)), 0)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🤝 Acheteurs Webmedia</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>
            {filtered.length} acheteur{filtered.length > 1 ? 's' : ''} — CA cumule potentiel : {fmtE(totalCA)}/mois
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: '.5rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Ajouter
        </button>
      </div>

      {/* Filters + view toggle */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher..." style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', minWidth: 200, background: 'var(--card-bg, #fff)', color: 'inherit' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--card-bg, #fff)', color: 'inherit' }}>
          <option value="all">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setView('list')} style={{ padding: '.45rem .9rem', border: 'none', cursor: 'pointer', background: view === 'list' ? '#195C82' : 'transparent', color: view === 'list' ? '#fff' : 'inherit', fontWeight: 600, fontSize: '.8rem' }}>Liste</button>
          <button onClick={() => setView('cards')} style={{ padding: '.45rem .9rem', border: 'none', cursor: 'pointer', background: view === 'cards' ? '#195C82' : 'transparent', color: view === 'cards' ? '#fff' : 'inherit', fontWeight: 600, fontSize: '.8rem' }}>Cartes</button>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {[
                  { key: 'name', label: 'Nom' },
                  { key: 'contact_name', label: 'Contact' },
                  { key: 'email', label: 'Email' },
                  { key: 'thematics', label: 'Thematiques' },
                  { key: 'monthly_volume', label: 'Volume mensuel' },
                  { key: 'unit_price', label: 'Prix unitaire' },
                  { key: 'billing_mode', label: 'Mode facturation' },
                  { key: 'status', label: 'Statut' },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '.65rem .75rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th style={{ padding: '.65rem .75rem', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(b)}>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{b.name}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{b.contact_name || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{b.email || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(b.thematics || []).map(t => (
                        <span key={t} style={{ padding: '2px 6px', borderRadius: 6, fontSize: '.68rem', fontWeight: 600, color: '#fff', background: hashColor(t) }}>{t}</span>
                      ))}
                      {(!b.thematics || b.thematics.length === 0) && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </div>
                  </td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right' }}>{fmtN(b.monthly_volume)}</td>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 600 }}>{fmtE(b.unit_price)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>{BILLING_LABELS[b.billing_mode] || b.billing_mode}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[b.status] || '#94a3b8' }}>{STATUS_LABELS[b.status] || b.status}</span>
                  </td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem' }}>
                      <button onClick={() => openEdit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                      <button onClick={() => setDeleting(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun acheteur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards view */}
      {view === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(b => {
            const caPotentiel = (parseInt(b.monthly_volume) || 0) * (parseFloat(b.unit_price) || 0)
            return (
              <div key={b.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.name}</div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.68rem', fontWeight: 700, color: '#fff', background: STATUS_COLORS[b.status] || '#94a3b8', whiteSpace: 'nowrap' }}>{STATUS_LABELS[b.status] || b.status}</span>
                </div>

                {b.contact_name && <div style={{ fontSize: '.82rem' }}><strong>Contact :</strong> {b.contact_name}</div>}
                {b.email && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{b.email}</div>}
                {b.phone && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{b.phone}</div>}

                {(b.thematics || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(b.thematics || []).map(t => (
                      <span key={t} style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 600, color: '#fff', background: hashColor(t) }}>{t}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginTop: '.25rem' }}>
                  <div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Volume / mois</div>
                    <div style={{ fontWeight: 600 }}>{fmtN(b.monthly_volume)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Prix unitaire</div>
                    <div style={{ fontWeight: 600 }}>{fmtE(b.unit_price)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Facturation</div>
                    <div style={{ fontWeight: 600 }}>{BILLING_LABELS[b.billing_mode] || b.billing_mode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>CA potentiel</div>
                    <div style={{ fontWeight: 700, color: '#195C82' }}>{fmtE(caPotentiel)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '.35rem', marginTop: 'auto', paddingTop: '.5rem', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => openEdit(b)} style={{ flex: 1, padding: '.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, color: 'inherit' }}>✏️ Modifier</button>
                  <button onClick={() => setDeleting(b)} style={{ flex: 1, padding: '.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, color: '#dc2626' }}>🗑 Supprimer</button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun acheteur</div>
          )}
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier l\'acheteur' : 'Ajouter un acheteur'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contact</label>
                <input value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Telephone</label>
                <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Adresse</label>
                <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thematiques</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '.4rem' }}>
                  {THEMATICS.map(t => {
                    const active = form.thematics.includes(t)
                    return (
                      <label key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '.3rem .6rem', borderRadius: 8, border: `1px solid ${active ? hashColor(t) : 'var(--border)'}`, background: active ? hashColor(t) : 'transparent', color: active ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                        <input type="checkbox" checked={active} onChange={() => toggleThematic(t)} style={{ margin: 0 }} />
                        {t}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Volume mensuel</label>
                <input type="number" value={form.monthly_volume} onChange={e => setForm({ ...form, monthly_volume: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mode de facturation</label>
                <select value={form.billing_mode} onChange={e => setForm({ ...form, billing_mode: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }}>
                  {BILLING_MODES.map(m => <option key={m} value={m}>{BILLING_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prix unitaire (EUR)</label>
                <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tarif horaire (EUR)</label>
                <input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical', background: 'var(--card-bg, #fff)', color: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', color: 'inherit' }}>Annuler</button>
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
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer "{deleting.name}" ?</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cette action est irreversible.</p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}>Annuler</button>
              <button onClick={() => handleDelete(deleting.id)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
