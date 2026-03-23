import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ClientAutocomplete from '../../components/ClientAutocomplete'
import { useSociete } from '../../contexts/SocieteContext'

const PHASES = [
  { id: 'qualification',  label: 'Qualification',   color: '#6366f1', bg: '#eef2ff' },
  { id: 'short_list',     label: 'Short list',      color: '#f59e0b', bg: '#fffbeb' },
  { id: 'ferme_a_gagner', label: 'Fermé à gagner',  color: '#0ea5e9', bg: '#f0f9ff' },
  { id: 'ferme',          label: 'Fermé ✓',         color: '#16a34a', bg: '#f0fdf4' },
  { id: 'perdu',          label: 'Perdu',            color: '#dc2626', bg: '#fef2f2' },
]

export function phaseInfo(id) {
  return PHASES.find(p => p.id === id) || { id, label: id || '—', color: '#64748b', bg: '#f8fafc' }
}

const EMPTY_FORM = {
  name: '', phase: 'qualification', montant: '',
  date_fermeture_prevue: '', notes: '',
}

function formatMontant(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ t, onDragStart, onClick }) {
  const p = phaseInfo(t.phase)
  const overdue = t.date_fermeture_prevue && new Date(t.date_fermeture_prevue) < new Date()
  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={() => onDragStart(t)}
      onClick={() => onClick(t.id)}
    >
      <div className="kanban-card-name">{t.name}</div>
      {t.clients?.name && (
        <div className="kanban-card-client">👤 {t.clients.name}</div>
      )}
      <div className="kanban-card-footer">
        {t.montant ? (
          <span className="kanban-card-montant">{formatMontant(t.montant)}</span>
        ) : <span />}
        {t.date_fermeture_prevue && (
          <span className={`kanban-card-date ${overdue && t.phase !== 'perdu' ? 'kanban-card-date--overdue' : ''}`}>
            📅 {formatDate(t.date_fermeture_prevue)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ phase, cards, onDragStart, onDrop, onClick }) {
  const [dragOver, setDragOver] = useState(false)
  const total = cards.reduce((s, c) => s + (c.montant || 0), 0)

  return (
    <div
      className={`kanban-col ${dragOver ? 'kanban-col--dragover' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(phase.id) }}
    >
      <div className="kanban-col-header" style={{ borderTopColor: phase.color }}>
        <span className="kanban-col-title">{phase.label}</span>
        <span className="kanban-col-count" style={{ background: phase.bg, color: phase.color }}>
          {cards.length}
        </span>
      </div>
      <div className="kanban-col-cards">
        {cards.map(t => (
          <KanbanCard key={t.id} t={t} onDragStart={onDragStart} onClick={onClick} />
        ))}
        {cards.length === 0 && (
          <div className="kanban-col-empty">Déposez ici</div>
        )}
      </div>
      <div className="kanban-col-footer">
        <span>{total >= 1000000 ? `${(total / 1000000).toFixed(1).replace('.', ',')} M€` : total >= 1000 ? `${Math.round(total / 1000)} k€` : formatMontant(total)}</span>
        <span style={{ color: 'var(--text-muted)' }}>Montant total</span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const navigate = useNavigate()
  const { selectedSociete, societes } = useSociete()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedClient, setSelectedClient] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [filterSociete, setFilterSociete] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [view, setView] = useState('kanban')
  const dragCard = useRef(null)

  useEffect(() => { fetchTransactions() }, [])

  async function fetchTransactions() {
    setLoading(true)
    const query = supabase
      .from('transactions')
      .select('*, clients(name), societes(name)')
      .order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) setError(error.message)
    setTransactions(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const { error } = await supabase.from('transactions').insert({
      name: form.name,
      client_id: selectedClient?.id || null,
      societe_id: selectedSociete?.id || null,
      phase: form.phase,
      montant: form.montant ? parseFloat(form.montant) : null,
      date_fermeture_prevue: form.date_fermeture_prevue || null,
      notes: form.notes || null,
    })
    if (error) { setError(error.message); return }
    setShowForm(false); setForm(EMPTY_FORM); setSelectedClient(null)
    fetchTransactions()
  }

  async function handleDrop(targetPhase) {
    const card = dragCard.current
    if (!card || card.phase === targetPhase) return
    const { error } = await supabase.from('transactions').update({ phase: targetPhase }).eq('id', card.id)
    if (!error) {
      setTransactions(prev => prev.map(t => t.id === card.id ? { ...t, phase: targetPhase } : t))
    }
    dragCard.current = null
  }

  const filtered = useMemo(() => {
    let list = transactions
    if (filterSociete) list = list.filter(t => t.societe_id === filterSociete)
    const q = filter.toLowerCase()
    if (q) list = list.filter(t =>
      t.name.toLowerCase().includes(q) || (t.clients?.name || '').toLowerCase().includes(q)
    )
    return list
  }, [transactions, filter, filterSociete])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // KPI totaux sur les transactions filtrées
  const pipeline = filtered.filter(t => t.phase !== 'perdu').reduce((s, t) => s + (t.montant || 0), 0)
  const gained = filtered.filter(t => t.phase === 'ferme').reduce((s, t) => s + (t.montant || 0), 0)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Transactions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            {filterSociete && societes?.length > 0 && (
              <span style={{ marginLeft: '.5rem' }}>
                — {societes.find(s => s.id === filterSociete)?.name || ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* View toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'kanban' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setView('kanban')}
              title="Vue Kanban"
            >⊞ Kanban</button>
            <button
              className={`view-toggle-btn ${view === 'list' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setView('list')}
              title="Vue liste"
            >☰ Liste</button>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle</button>
        </div>
      </div>

      {/* Modale création */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle transaction</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nom de la transaction</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : Refonte SI Groupe SRA" required autoFocus />
              </div>
              <div className="field">
                <label>Client</label>
                <ClientAutocomplete value={selectedClient} onChange={setSelectedClient} />
              </div>
              <div className="field">
                <label>Phase</label>
                <div className="phase-selector">
                  {PHASES.map(p => (
                    <button key={p.id} type="button"
                      className={`phase-btn ${form.phase === p.id ? 'phase-btn--active' : ''}`}
                      style={form.phase === p.id ? { background: p.color, color: '#fff', borderColor: p.color } : {}}
                      onClick={() => setForm(f => ({ ...f, phase: p.id }))}
                    >{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Montant (€)</label>
                  <input type="number" min="0" step="100" value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 50000" />
                </div>
                <div className="field">
                  <label>Fermeture prévue</label>
                  <input type="date" value={form.date_fermeture_prevue}
                    onChange={e => setForm(f => ({ ...f, date_fermeture_prevue: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Contexte, contacts clés..." rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', margin: '1rem 0', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Filtre société + totaux */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select
          className="table-select"
          value={filterSociete}
          onChange={e => setFilterSociete(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">Toutes les sociétés</option>
          {(societes || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {pipeline > 0 && <span style={{ fontSize: '.85rem', color: '#6366f1', fontWeight: 600 }}>Pipeline : {formatMontant(pipeline)}</span>}
        {gained > 0 && <span style={{ fontSize: '.85rem', color: '#16a34a', fontWeight: 600 }}>Gagné : {formatMontant(gained)}</span>}
      </div>

      {loading ? <div className="loading-inline">Chargement...</div> : (
        view === 'kanban' ? (
          // ── KANBAN VIEW ──
          <div className="kanban-board">
            {PHASES.map(phase => (
              <KanbanColumn
                key={phase.id}
                phase={phase}
                cards={filtered.filter(t => t.phase === phase.id)}
                onDragStart={t => { dragCard.current = t }}
                onDrop={handleDrop}
                onClick={id => navigate(`/commerce/transactions/${id}`)}
              />
            ))}
          </div>
        ) : (
          // ── LIST VIEW ──
          <>
            <div className="table-toolbar">
              <input className="table-search" type="text" placeholder="Filtrer par nom ou client..."
                value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} />
              <div className="table-pagesize">
                <label>Afficher</label>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>lignes</span>
              </div>
            </div>
            <div className="transactions-list">
              <div className="transactions-header-row">
                <span>Transaction</span><span>Client</span><span>Phase</span>
                <span>Montant</span><span>Fermeture</span>
              </div>
              {paginated.map(t => {
                const p = phaseInfo(t.phase)
                return (
                  <div key={t.id} className="transaction-row" onClick={() => navigate(`/commerce/transactions/${t.id}`)}>
                    <span className="transaction-name">{t.name}</span>
                    <span className="transaction-client">{t.clients?.name || '—'}</span>
                    <span><span className="status-badge" style={{ color: p.color, background: p.bg }}>{p.label}</span></span>
                    <span className="transaction-montant">{formatMontant(t.montant)}</span>
                    <span className="transaction-date">{formatDate(t.date_fermeture_prevue)}</span>
                  </div>
                )
              })}
              {paginated.length === 0 && <p className="empty-state">Aucune transaction trouvée.</p>}
            </div>
            {totalPages > 1 && (
              <div className="table-pagination">
                <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
                <span>Page {page} / {totalPages}</span>
                <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
