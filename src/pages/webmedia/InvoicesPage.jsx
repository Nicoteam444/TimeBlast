import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useInvoices, useBuyers } from '../../hooks/useWebmediaData'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Formatters ──
function fmtE(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) }
function fmtN(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' } }

const STATUS_COLORS = {
  draft: '#64748b',
  sent: '#1D9BF0',
  paid: '#16a34a',
  overdue: '#dc2626',
  cancelled: '#64748b',
}
const STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  paid: 'Payee',
  overdue: 'En retard',
  cancelled: 'Annulee',
}
const STATUS_LIST = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function emptyInvoice() {
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(); due.setDate(due.getDate() + 30)
  return {
    number: '',
    buyer_id: '',
    lines: [{ description: '', qty: 1, unit_price: 0, total: 0 }],
    vat_rate: 20,
    status: 'draft',
    issued_on: today,
    due_on: due.toISOString().slice(0, 10),
    paid_on: null,
  }
}

export default function InvoicesPage() {
  const { data: invoices, loading, reload } = useInvoices()
  const { data: buyers } = useBuyers()

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyInvoice())
  const [deleting, setDeleting] = useState(null)

  const buyerById = useMemo(() => Object.fromEntries(buyers.map(b => [b.id, b])), [buyers])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (search && !((i.number || '').toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
  }, [invoices, statusFilter, search])

  // KPIs
  const kpis = useMemo(() => {
    const total = invoices.reduce((s, i) => s + (parseFloat(i.amount_ttc) || 0), 0)
    const pending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (parseFloat(i.amount_ttc) || 0), 0)
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount_ttc) || 0), 0)
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (parseFloat(i.amount_ttc) || 0), 0)
    return { total, pending, paid, overdue }
  }, [invoices])

  function openAdd() {
    setEditing(null)
    const f = emptyInvoice()
    // Auto-generate number suggestion
    const year = new Date().getFullYear()
    const prefix = `WM-${year}-`
    const yearInvoices = invoices.filter(i => (i.number || '').startsWith(prefix))
    const maxSeq = yearInvoices.reduce((m, i) => {
      const n = parseInt((i.number || '').replace(prefix, ''), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)
    f.number = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
    setForm(f)
    setShowModal(true)
  }

  function openEdit(inv) {
    setEditing(inv)
    setForm({
      number: inv.number || '',
      buyer_id: inv.buyer_id || '',
      lines: Array.isArray(inv.lines) && inv.lines.length ? inv.lines : [{ description: '', qty: 1, unit_price: 0, total: 0 }],
      vat_rate: inv.vat_rate ?? 20,
      status: inv.status || 'draft',
      issued_on: inv.issued_on || new Date().toISOString().slice(0, 10),
      due_on: inv.due_on || '',
      paid_on: inv.paid_on || null,
    })
    setShowModal(true)
  }

  function updateLine(idx, field, value) {
    const lines = [...form.lines]
    lines[idx] = { ...lines[idx], [field]: value }
    const qty = parseFloat(lines[idx].qty) || 0
    const price = parseFloat(lines[idx].unit_price) || 0
    lines[idx].total = +(qty * price).toFixed(2)
    setForm({ ...form, lines })
  }
  function addLine() { setForm({ ...form, lines: [...form.lines, { description: '', qty: 1, unit_price: 0, total: 0 }] }) }
  function removeLine(idx) {
    const lines = form.lines.filter((_, i) => i !== idx)
    setForm({ ...form, lines: lines.length ? lines : [{ description: '', qty: 1, unit_price: 0, total: 0 }] })
  }

  const formTotals = useMemo(() => {
    const ht = form.lines.reduce((s, l) => s + (parseFloat(l.total) || 0), 0)
    const vatRate = parseFloat(form.vat_rate) || 0
    const vat = +(ht * (vatRate / 100)).toFixed(2)
    const ttc = +(ht + vat).toFixed(2)
    return { ht: +ht.toFixed(2), vat, ttc }
  }, [form.lines, form.vat_rate])

  async function handleSave() {
    const payload = {
      number: form.number,
      buyer_id: form.buyer_id || null,
      lines: form.lines,
      amount_ht: formTotals.ht,
      amount_ttc: formTotals.ttc,
      vat_rate: parseFloat(form.vat_rate) || 0,
      status: form.status,
      issued_on: form.issued_on,
      due_on: form.due_on || null,
      paid_on: form.status === 'paid' ? (form.paid_on || new Date().toISOString().slice(0, 10)) : null,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('wm_invoices').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('wm_invoices').insert(payload))
    }
    if (error) { alert('Erreur : ' + error.message); return }
    setShowModal(false)
    reload()
  }

  async function handleUpdateStatus(inv, newStatus) {
    const upd = { status: newStatus }
    if (newStatus === 'paid' && !inv.paid_on) upd.paid_on = new Date().toISOString().slice(0, 10)
    if (newStatus !== 'paid') upd.paid_on = null
    const { error } = await supabase.from('wm_invoices').update(upd).eq('id', inv.id)
    if (error) { alert('Erreur : ' + error.message); return }
    reload()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('wm_invoices').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setDeleting(null)
    reload()
  }

  function downloadPDF(inv) {
    const doc = new jsPDF()
    const buyer = buyerById[inv.buyer_id]
    const w = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(25, 92, 130)
    doc.rect(0, 0, w, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('WEBMEDIA', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Lead generation & media buying', 14, 26)

    // Invoice title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`FACTURE ${inv.number || ''}`, 14, 46)

    // Dates
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date d'emission : ${fmtDate(inv.issued_on)}`, 14, 54)
    doc.text(`Echeance : ${fmtDate(inv.due_on)}`, 14, 60)
    if (inv.paid_on) doc.text(`Payee le : ${fmtDate(inv.paid_on)}`, 14, 66)

    // Buyer info
    doc.setFont('helvetica', 'bold')
    doc.text('Facture a :', w - 80, 46)
    doc.setFont('helvetica', 'normal')
    if (buyer) {
      doc.text(buyer.name || '', w - 80, 54)
      if (buyer.email) doc.text(buyer.email, w - 80, 60)
      if (buyer.address) doc.text(buyer.address, w - 80, 66)
      if (buyer.vat_number) doc.text(`TVA : ${buyer.vat_number}`, w - 80, 72)
    } else {
      doc.text('(Client non specifie)', w - 80, 54)
    }

    // Lines table
    const lines = Array.isArray(inv.lines) ? inv.lines : []
    autoTable(doc, {
      startY: 82,
      head: [['Description', 'Qte', 'Prix unitaire', 'Total HT']],
      body: lines.map(l => [
        l.description || '',
        fmtN(l.qty || 0),
        fmtE(l.unit_price || 0),
        fmtE(l.total || 0),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [25, 92, 130], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    })

    // Totals
    const finalY = doc.lastAutoTable.finalY + 8
    const ht = parseFloat(inv.amount_ht) || 0
    const ttc = parseFloat(inv.amount_ttc) || 0
    const vatRate = parseFloat(inv.vat_rate) || 0
    const vat = ttc - ht
    const rightX = w - 14
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total HT : ${fmtE(ht)}`, rightX, finalY, { align: 'right' })
    doc.text(`TVA (${vatRate}%) : ${fmtE(vat)}`, rightX, finalY + 6, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Total TTC : ${fmtE(ttc)}`, rightX, finalY + 14, { align: 'right' })

    // Footer
    const h = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('Webmedia — Merci de votre confiance.', w / 2, h - 14, { align: 'center' })
    doc.text('Paiement par virement — En cas de retard, penalites de 3x le taux legal applicables.', w / 2, h - 9, { align: 'center' })

    doc.save(`Facture_${inv.number || inv.id}.pdf`)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>🧾 Facturation Webmedia</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
            {fmtN(invoices.length)} factures
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: '.55rem 1.1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' }}>
          + Nouvelle facture
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>📦</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#195C82' }}>{fmtE(kpis.total)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total facture</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>⏳</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1D9BF0' }}>{fmtE(kpis.pending)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>En attente</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>✅</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a' }}>{fmtE(kpis.paid)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payees</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '.2rem' }}>⚠️</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#dc2626' }}>{fmtE(kpis.overdue)}</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>En retard</div>
        </div>
      </div>

      {/* Filters tabs + search */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'draft', label: 'Brouillons' },
          { key: 'sent', label: 'Envoyees' },
          { key: 'paid', label: 'Payees' },
          { key: 'overdue', label: 'En retard' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '.4rem .9rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: statusFilter === tab.key ? '#195C82' : 'transparent',
              color: statusFilter === tab.key ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '.8rem',
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un N° de facture..."
          style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', minWidth: 240, marginLeft: 'auto' }}
        />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>N°</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Acheteur</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Lignes</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>HT</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>TTC</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Statut</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Emise le</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Echeance</th>
              <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Payee le</th>
              <th style={{ padding: '.65rem .75rem', width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const buyer = buyerById[inv.buyer_id]
              const lines = Array.isArray(inv.lines) ? inv.lines : []
              const preview = lines.length === 0
                ? '-'
                : lines.length === 1
                  ? (lines[0].description || '').slice(0, 40)
                  : `${lines.length} lignes`
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }} onDoubleClick={() => openEdit(inv)}>
                  <td style={{ padding: '.55rem .75rem', fontWeight: 700, color: 'var(--text)' }}>{inv.number}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{buyer?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text-muted)', fontSize: '.75rem' }}>{preview}</td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', color: 'var(--text)' }}>{fmtE(inv.amount_ht)}</td>
                  <td style={{ padding: '.55rem .75rem', textAlign: 'right', fontWeight: 700, color: '#195C82' }}>{fmtE(inv.amount_ttc)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <select
                      value={inv.status}
                      onChange={e => handleUpdateStatus(inv, e.target.value)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '.72rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: STATUS_COLORS[inv.status] || '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {STATUS_LIST.map(s => <option key={s} value={s} style={{ color: '#000' }}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{fmtDate(inv.issued_on)}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{fmtDate(inv.due_on)}</td>
                  <td style={{ padding: '.55rem .75rem', color: 'var(--text)' }}>{fmtDate(inv.paid_on)}</td>
                  <td style={{ padding: '.55rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => downloadPDF(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Telecharger PDF">📥</button>
                      <button onClick={() => openEdit(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Modifier">✏️</button>
                      <button onClick={() => setDeleting(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }} title="Supprimer">🗑</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune facture</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '95%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editing ? `Modifier la facture ${editing.number || ''}` : 'Nouvelle facture'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>N° de facture *</label>
                <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Acheteur *</label>
                <select value={form.buyer_id} onChange={e => setForm({ ...form, buyer_id: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  <option value="">-- Selectionner --</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date d'emission</label>
                <input type="date" value={form.issued_on} onChange={e => setForm({ ...form, issued_on: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Echeance</label>
                <input type="date" value={form.due_on || ''} onChange={e => setForm({ ...form, due_on: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TVA (%)</label>
                <input type="number" step="0.01" value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.85rem', marginTop: '.2rem' }} />
              </div>
            </div>

            {/* Lines */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                <label style={{ fontSize: '.85rem', color: 'var(--text)', fontWeight: 700 }}>Lignes</label>
                <button onClick={addLine} style={{ padding: '.25rem .6rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }}>+ Ajouter une ligne</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--border)' }}>
                      <th style={{ padding: '.4rem .5rem', textAlign: 'left', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '.4rem .5rem', textAlign: 'right', fontWeight: 600, width: 80 }}>Qte</th>
                      <th style={{ padding: '.4rem .5rem', textAlign: 'right', fontWeight: 600, width: 120 }}>PU (EUR)</th>
                      <th style={{ padding: '.4rem .5rem', textAlign: 'right', fontWeight: 600, width: 120 }}>Total</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((l, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '.3rem .4rem' }}>
                          <input value={l.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" style={{ width: '100%', padding: '.3rem .4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.78rem' }} />
                        </td>
                        <td style={{ padding: '.3rem .4rem' }}>
                          <input type="number" step="0.01" value={l.qty} onChange={e => updateLine(idx, 'qty', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '.3rem .4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.78rem', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '.3rem .4rem' }}>
                          <input type="number" step="0.01" value={l.unit_price} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '.3rem .4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '.78rem', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '.3rem .5rem', textAlign: 'right', fontWeight: 600 }}>{fmtE(l.total)}</td>
                        <td style={{ padding: '.3rem' }}>
                          <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '.9rem' }} title="Supprimer">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div style={{ padding: '.75rem 1rem', borderRadius: 8, background: 'var(--border)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                <span>Total HT</span><strong>{fmtE(formTotals.ht)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginTop: '.2rem' }}>
                <span>TVA ({form.vat_rate}%)</span><strong>{fmtE(formTotals.vat)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '.3rem', paddingTop: '.3rem', borderTop: '1px solid var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>Total TTC</span>
                <strong style={{ color: '#195C82' }}>{fmtE(formTotals.ttc)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>Annuler</button>
              <button onClick={handleSave} disabled={!form.number || !form.buyer_id} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', opacity: (form.number && form.buyer_id) ? 1 : 0.5 }}>
                {editing ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 420, color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer la facture {deleting.number} ?</h3>
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
