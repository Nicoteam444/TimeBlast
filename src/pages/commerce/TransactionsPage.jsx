import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ClientAutocomplete from '../../components/ClientAutocomplete'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_TRANSACTIONS } from '../../data/demoData'

const PHASES = [
  { id: 'qualification',   label: 'Qualification',    color: '#6366f1', bg: '#eef2ff' },
  { id: 'short_list',      label: 'Short list',       color: '#f59e0b', bg: '#fffbeb' },
  { id: 'ferme_a_gagner',  label: 'Ferme à gagner',   color: '#0ea5e9', bg: '#f0f9ff' },
  { id: 'ferme',           label: 'Ferme',             color: '#16a34a', bg: '#f0fdf4' },
  { id: 'perdu',           label: 'Perdu',             color: '#dc2626', bg: '#fef2f2' },
]

export function phaseInfo(id) {
  return PHASES.find(p => p.id === id) || { id, label: id || '—', color: '#64748b', bg: '#f8fafc' }
}

const EMPTY_FORM = {
  name: '', phase: 'qualification', montant: '',
  date_fermeture_prevue: '', notes: '',
}

export default function TransactionsPage() {
  const navigate = useNavigate()
  const { isDemoMode } = useDemo()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedClient, setSelectedClient] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchTransactions() }, [isDemoMode])

  async function fetchTransactions() {
    setLoading(true)
    if (isDemoMode) {
      setTransactions(DEMO_TRANSACTIONS)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setTransactions(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (isDemoMode) { setShowForm(false); setForm(EMPTY_FORM); setSelectedClient(null); return }
    const { error } = await supabase.from('transactions').insert({
      name: form.name,
      client_id: selectedClient?.id || null,
      phase: form.phase,
      montant: form.montant ? parseFloat(form.montant) : null,
      date_fermeture_prevue: form.date_fermeture_prevue || null,
      notes: form.notes || null,
    })
    if (error) { setError(error.message); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    setSelectedClient(null)
    fetchTransactions()
  }

  function formatMontant(v) {
    if (!v) return '—'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return q ? transactions.filter(t =>
      t.name.toLowerCase().includes(q) || (t.clients?.name || '').toLowerCase().includes(q)
    ) : transactions
  }, [transactions, filter])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleFilterChange(e) { setFilter(e.target.value); setPage(1) }
  function handlePageSizeChange(e) { setPageSize(Number(e.target.value)); setPage(1) }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Transactions</h1>
          <p>{filtered.length} transaction{filtered.length > 1 ? 's' : ''}{filter ? ` sur ${transactions.length}` : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle transaction</button>
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
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
          {error.includes('relation') && <span> — La table <code>transactions</code> n'existe pas encore. Lance le SQL dans Supabase.</span>}
        </div>
      )}

      {/* Toolbar */}
      <div className="table-toolbar">
        <input className="table-search" type="text" placeholder="Filtrer par nom ou client..."
          value={filter} onChange={handleFilterChange} />
        <div className="table-pagesize">
          <label>Afficher</label>
          <select value={pageSize} onChange={handlePageSizeChange}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>lignes</span>
        </div>
      </div>

      {loading ? <div className="loading-inline">Chargement...</div> : (
        <>
          <div className="transactions-list">
            <div className="transactions-header-row">
              <span>Transaction</span>
              <span>Client</span>
              <span>Phase</span>
              <span>Montant</span>
              <span>Fermeture</span>
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
            {paginated.length === 0 && (
              <p className="empty-state">Aucune transaction trouvée.</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="table-pagination">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
              <span>Page {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
