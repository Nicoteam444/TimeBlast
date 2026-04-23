import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSales, useBuyers, useLeads, useInvoices } from '../../hooks/useWebmediaData'

// ── Formatters ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' } }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

export default function LeadSalesPage() {
  const { data: sales, loading: loadingSales, reload: reloadSales } = useSales()
  const { data: buyers } = useBuyers()
  const { data: leads } = useLeads()
  const { data: invoices, reload: reloadInvoices } = useInvoices()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [buyerFilter, setBuyerFilter] = useState('all')
  const [deleting, setDeleting] = useState(null)
  const [generating, setGenerating] = useState(null)

  // Lookups
  const leadById = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads])
  const buyerById = useMemo(() => Object.fromEntries(buyers.map(b => [b.id, b])), [buyers])
  const invoiceById = useMemo(() => Object.fromEntries(invoices.map(i => [i.id, i])), [invoices])

  // Filtered sales
  const filtered = useMemo(() => {
    return sales.filter(s => {
      if (from && s.sold_at && s.sold_at < from) return false
      if (to && s.sold_at && s.sold_at > to) return false
      if (buyerFilter !== 'all' && s.buyer_id !== buyerFilter) return false
      return true
    })
  }, [sales, from, to, buyerFilter])

  // KPIs
  const kpis = useMemo(() => {
    const totalSold = filtered.reduce((s, x) => s + (parseFloat(x.price) || 0), 0)
    const avgPrice = filtered.length > 0 ? totalSold / filtered.length : 0
    const totalUnbilled = filtered.filter(s => !s.invoice_id).reduce((s, x) => s + (parseFloat(x.price) || 0), 0)
    return { totalSold, avgPrice, totalUnbilled, count: filtered.length }
  }, [filtered])

  async function generateNextInvoiceNumber() {
    const year = new Date().getFullYear()
    const prefix = `WM-${year}-`
    const yearInvoices = invoices.filter(i => (i.number || '').startsWith(prefix))
    const maxSeq = yearInvoices.reduce((m, i) => {
      const n = parseInt((i.number || '').replace(prefix, ''), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
  }

  async function handleGenerateInvoice(sale) {
    if (sale.invoice_id) { alert('Cette vente a deja une facture.'); return }
    setGenerating(sale.id)
    try {
      const buyer = buyerById[sale.buyer_id]
      const lead = leadById[sale.lead_id]
      const number = await generateNextInvoiceNumber()
      const price = parseFloat(sale.price) || 0
      const vatRate = 20
      const amountHt = price
      const amountTtc = +(amountHt * (1 + vatRate / 100)).toFixed(2)
      const description = `Vente de lead${lead ? ' — ' + (lead.full_name || lead.email || lead.id) : ''}`
      const today = new Date().toISOString().slice(0, 10)
      const due = new Date(); due.setDate(due.getDate() + 30)
      const lines = [{ description, qty: 1, unit_price: price, total: price }]

      const payload = {
        number,
        buyer_id: sale.buyer_id,
        lines,
        amount_ht: amountHt,
        amount_ttc: amountTtc,
        vat_rate: vatRate,
        status: 'draft',
        issued_on: today,
        due_on: due.toISOString().slice(0, 10),
      }

      const { data: created, error } = await supabase.from('wm_invoices').insert(payload).select().single()
      if (error) { alert('Erreur creation facture : ' + error.message); setGenerating(null); return }

      const { error: upErr } = await supabase.from('wm_lead_sales').update({ invoice_id: created.id }).eq('id', sale.id)
      if (upErr) { alert('Facture creee mais erreur liaison : ' + upErr.message) }

      await Promise.all([reloadSales(), reloadInvoices()])
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
    setGenerating(null)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('wm_lead_sales').delete().eq('id', id)
    if (error) { alert('Erreur suppression : ' + error.message); return }
    setDeleting(null)
    reloadSales()
  }

  if (loadingSales) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>💰 Ventes de leads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
            {fmtN(kpis.count)} ventes — CA total : <strong>{fmtE(kpis.totalSold)}</strong>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>💰</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#195C82' }}>{fmtE(kpis.totalSold)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total vendu</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>📊</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1D9BF0' }}>{fmtE(kpis.avgPrice)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prix moyen</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>🧾</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{fmtE(kpis.totalUnbilled)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>A facturer</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Acheteur</label>
          <select value={buyerFilter} onChange={e => setBuyerFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem' }}>
            <option value="all">Tous</option>
            {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {(from || to || buyerFilter !== 'all') && (
          <button onClick={() => { setFrom(''); setTo(''); setBuyerFilter('all') }} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '.8rem', alignSelf: 'flex-end' }}>
            Reinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Lead</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Acheteur</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Prix</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Facture</th>
              <th style={{ padding: '.65rem .75rem', width: 180 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const lead = leadById[s.lead_id]
              const buyer = buyerById[s.buyer_id]
              const invoice = s.invoice_id ? invoiceById[s.invoice_id] : null
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>
                    {lead ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{lead.full_name || lead.name || '(sans nom)'}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{lead.email || ''}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>#{s.lead_id?.slice(0, 8) || '-'}</span>}
                  </td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{buyer?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', fontWeight: 700, color: '#195C82' }}>{fmtE(s.price)}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{fmtDate(s.sold_at)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    {invoice ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, color: '#fff', background: '#16a34a' }}>
                        {invoice.number}
                      </span>
                    ) : (
                      <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Non facturee</span>
                    )}
                  </td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                      {!s.invoice_id && (
                        <button
                          onClick={() => handleGenerateInvoice(s)}
                          disabled={generating === s.id}
                          style={{ padding: '.3rem .6rem', borderRadius: 6, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, opacity: generating === s.id ? 0.6 : 1 }}
                          title="Generer une facture"
                        >
                          {generating === s.id ? '...' : '🧾 Facturer'}
                        </button>
                      )}
                      <button onClick={() => setDeleting(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune vente</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 420, color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer cette vente ?</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cette action est irreversible. Si une facture est liee, elle ne sera pas supprimee automatiquement.</p>
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
