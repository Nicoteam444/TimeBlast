import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'
import ClientAutocomplete from '../../components/ClientAutocomplete'
import { phaseInfo } from './TransactionsPage'
import Spinner from '../../components/Spinner'

const PHASES = [
  { id: 'qualification',  label: 'Qualification',  color: '#6366f1', bg: '#eef2ff' },
  { id: 'short_list',     label: 'Short list',      color: '#f59e0b', bg: '#fffbeb' },
  { id: 'ferme_a_gagner', label: 'Ferme à gagner',  color: '#0ea5e9', bg: '#f0f9ff' },
  { id: 'ferme',          label: 'Ferme',            color: '#16a34a', bg: '#f0fdf4' },
  { id: 'perdu',          label: 'Perdu',            color: '#dc2626', bg: '#fef2f2' },
]

export default function TransactionDetailPage() {
  const { id } = useParams()
  const navigate = useEnvNavigate()
  const { setSegments, clearSegments } = useBreadcrumb() || {}
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [selectedClient, setSelectedClient] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTransaction() }, [id])
  useEffect(() => () => clearSegments?.(), [])

  async function fetchTransaction() {
    setLoading(true)
    const { data } = await supabase
      .from('transactions').select('*, clients(id, name)').eq('id', id).single()
    if (data) {
      setTransaction(data)
      setForm({
        name: data.name,
        phase: data.phase,
        montant: data.montant ?? '',
        date_fermeture_prevue: data.date_fermeture_prevue ?? '',
        notes: data.notes ?? ''})
      setSelectedClient(data.clients ? { id: data.clients.id, name: data.clients.name } : null)
      if (setSegments) {
        setSegments([{ id, label: data.name }])
      }
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('transactions').update({
      name: form.name,
      client_id: selectedClient?.id || null,
      phase: form.phase,
      montant: form.montant ? parseFloat(form.montant) : null,
      date_fermeture_prevue: form.date_fermeture_prevue || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString()}).eq('id', id)
    setSaving(false)
    setEditing(false)
    fetchTransaction()
  }

  async function handlePhaseChange(phase) {
    await supabase.from('transactions').update({ phase, updated_at: new Date().toISOString() }).eq('id', id)
    setTransaction(t => ({ ...t, phase }))
  }

  function formatMontant(v) {
    if (!v) return '—'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <div className="admin-page"><Spinner /></div>
  if (!transaction) return <div className="admin-page"><p className="empty-state">Transaction introuvable.</p></div>

  const currentPhaseIndex = PHASES.findIndex(p => p.id === transaction.phase)

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/commerce/transactions')} style={{ padding: '0.4rem 0.8rem' }}>
            ← Retour
          </button>
          <div>
            <h1>{transaction.name}</h1>
            <p>{transaction.clients?.name || 'Sans client'}</p>
          </div>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>Modifier</button>
        )}
      </div>

      {/* Pipeline stepper */}
      <div className="pipeline-stepper">
        {PHASES.filter(p => p.id !== 'perdu').map((p, i) => {
          const isDone = currentPhaseIndex > i && transaction.phase !== 'perdu'
          const isCurrent = transaction.phase === p.id
          const isLost = transaction.phase === 'perdu'
          return (
            <button
              key={p.id}
              className={`pipeline-step ${isCurrent ? 'pipeline-step--active' : ''} ${isDone ? 'pipeline-step--done' : ''}`}
              style={isCurrent ? { background: p.color, color: '#fff', borderColor: p.color } : isDone ? { background: p.color + '22', borderColor: p.color, color: p.color } : {}}
              onClick={() => !isLost && handlePhaseChange(p.id)}
              title={`Passer à : ${p.label}`}
            >
              <span className="pipeline-step-dot" style={{ background: isCurrent || isDone ? p.color : '#cbd5e1' }} />
              {p.label}
            </button>
          )
        })}
        <button
          className={`pipeline-step pipeline-step--lost ${transaction.phase === 'perdu' ? 'pipeline-step--active' : ''}`}
          style={transaction.phase === 'perdu' ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' } : {}}
          onClick={() => handlePhaseChange('perdu')}
        >
          <span className="pipeline-step-dot" style={{ background: transaction.phase === 'perdu' ? '#dc2626' : '#cbd5e1' }} />
          Perdu
        </button>
      </div>

      {/* Fiche */}
      {editing ? (
        <div className="detail-card">
          <div className="field">
            <label>Nom de la transaction</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Client</label>
            <ClientAutocomplete value={selectedClient} onChange={setSelectedClient} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Montant (€)</label>
              <input type="number" min="0" step="100" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 50000" />
            </div>
            <div className="field">
              <label>Fermeture prévue</label>
              <input type="date" value={form.date_fermeture_prevue} onChange={e => setForm(f => ({ ...f, date_fermeture_prevue: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem' }} />
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      ) : (
        <div className="detail-card">
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Client</span>
              <span className="detail-value">{transaction.clients?.name || '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Phase</span>
              <span className="detail-value">
                {(() => { const p = phaseInfo(transaction.phase); return <span className="status-badge" style={{ color: p.color, background: p.bg }}>{p.label}</span> })()}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Montant</span>
              <span className="detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{formatMontant(transaction.montant)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Fermeture prévue</span>
              <span className="detail-value">{formatDate(transaction.date_fermeture_prevue)}</span>
            </div>
            <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">Notes</span>
              <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{transaction.notes || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
