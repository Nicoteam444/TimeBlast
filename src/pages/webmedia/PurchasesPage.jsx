import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { usePurchases } from '../../hooks/useWebmediaData'

// ── Formatters ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' } }

const THEMATICS = ['Investissement', 'Banque/Assurance', 'Silver', 'Travaux', 'B2B', 'Formation', 'E-commerce', 'Voyance', 'Autre']

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

const emptyPurchase = {
  source_provider: '',
  price: 0,
  thematic: 'Autre',
  volume: 1,
  purchased_at: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function PurchasesPage() {
  const { data: purchases, loading, reload } = usePurchases()
  const [search, setSearch] = useState('')
  const [thematicFilter, setThematicFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyPurchase })
  const [deleting, setDeleting] = useState(null)

  const filtered = useMemo(() => {
    return purchases.filter(p => {
      if (search && !((p.source_provider || '').toLowerCase().includes(search.toLowerCase()))) return false
      if (thematicFilter !== 'all' && p.thematic !== thematicFilter) return false
      return true
    })
  }, [purchases, search, thematicFilter])

  const totalCost = useMemo(() =>
    filtered.reduce((s, p) => s + (parseFloat(p.price) || 0) * (parseInt(p.volume) || 1), 0)
  , [filtered])

  const totalVolume = useMemo(() =>
    filtered.reduce((s, p) => s + (parseInt(p.volume) || 0), 0)
  , [filtered])

  function openAdd() { setEditing(null); setForm({ ...emptyPurchase }); setShowModal(true) }
  function openEdit(p) {
    setEditing(p)
    setForm({
      source_provider: p.source_provider || '',
      price: p.price || 0,
      thematic: p.thematic || 'Autre',
      volume: p.volume || 1,
      purchased_at: p.purchased_at ? p.purchased_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: p.notes || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    const payload = {
      source_provider: form.source_provider,
      price: parseFloat(form.price) || 0,
      thematic: form.thematic,
      volume: parseInt(form.volume) || 1,
      purchased_at: form.purchased_at,
      notes: form.notes || null,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('wm_lead_purchases').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('wm_lead_purchases').insert(payload))
    }
    if (error) { alert('Erreur : ' + error.message); return }
    setShowModal(false)
    reload()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('wm_lead_purchases').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setDeleting(null)
    reload()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>🛒 Achats de leads externes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
            {fmtN(filtered.length)} achats — {fmtN(totalVolume)} leads — Cout total : <strong>{fmtE(totalCost)}</strong>
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: '.55rem 1.1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Ajouter un achat
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>💸</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#195C82' }}>{fmtE(totalCost)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cout total</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>💧</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1D9BF0' }}>{fmtN(totalVolume)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Leads achetes</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>📊</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8B35A' }}>{fmtE(totalVolume > 0 ? totalCost / totalVolume : 0)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cout / lead moyen</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur..."
          style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', minWidth: 240 }}
        />
        <select value={thematicFilter} onChange={e => setThematicFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem' }}>
          <option value="all">Toutes thematiques</option>
          {THEMATICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Fournisseur</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Thematique</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Volume</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Prix unitaire</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Total</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '.65rem .75rem', width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const unit = parseFloat(p.price) || 0
              const vol = parseInt(p.volume) || 1
              const total = unit * vol
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(p)}>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 600, color: 'var(--text)' }}>{p.source_provider || '-'}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 600, background: 'var(--border)', color: 'var(--text)' }}>
                      {p.thematic || 'Autre'}
                    </span>
                  </td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', color: 'var(--text)' }}>{fmtN(vol)}</td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', color: 'var(--text)' }}>{fmtE(unit)}</td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', fontWeight: 700, color: '#195C82' }}>{fmtE(total)}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{fmtDate(p.purchased_at)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem' }}>
                      <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                      <button onClick={() => setDeleting(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun achat</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? 'Modifier l\'achat' : 'Ajouter un achat'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fournisseur *</label>
                <input value={form.source_provider} onChange={e => setForm({ ...form, source_provider: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thematique</label>
                <select value={form.thematic} onChange={e => setForm({ ...form, thematic: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {THEMATICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date d'achat</label>
                <input type="date" value={form.purchased_at} onChange={e => setForm({ ...form, purchased_at: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Volume (nb leads)</label>
                <input type="number" min="1" value={form.volume} onChange={e => setForm({ ...form, volume: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prix unitaire (EUR)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ padding: '.5rem .75rem', borderRadius: 8, background: 'var(--border)', fontSize: '.82rem', fontWeight: 600 }}>
                  Total : <span style={{ color: '#195C82' }}>{fmtE((parseFloat(form.price) || 0) * (parseInt(form.volume) || 1))}</span>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>Annuler</button>
              <button onClick={handleSave} disabled={!form.source_provider} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: form.source_provider ? 1 : 0.5 }}>
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 420, color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer cet achat ?</h3>
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
