import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_NOTES_DE_FRAIS, DEMO_USERS } from '../../data/demoData'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

// ── Constantes ──────────────────────────────────────────────────

const WORKFLOW_TYPES = {
  notes_de_frais: { label: 'Notes de frais', icon: '💰', color: '#f59e0b' },
  conges:         { label: 'Conges / Absences', icon: '🏖', color: '#6366f1' },
  temps:          { label: 'Saisie des temps', icon: '⏱', color: '#0ea5e9' }}

const WORKFLOW_STEPS = [
  { key: 'soumis',     label: 'Collaborateur',     desc: 'Soumission de la demande', icon: '👤', color: '#64748b' },
  { key: 'manager',    label: 'Manager (N+1)',     desc: 'Validation hierarchique',  icon: '👔', color: '#f59e0b' },
  { key: 'validation', label: 'Validation finale', desc: 'Approbation definitive',   icon: '✅', color: '#22c55e' },
]

const STATUT_NDF = {
  brouillon: { label: 'Brouillon',  color: '#64748b', bg: '#f1f5f9' },
  soumis:    { label: 'Soumis',     color: '#f59e0b', bg: '#fffbeb' },
  valide:    { label: 'Valide',     color: '#22c55e', bg: '#f0fdf4' },
  refuse:    { label: 'Refuse',     color: '#ef4444', bg: '#fef2f2' },
  rembourse: { label: 'Rembourse',  color: '#6366f1', bg: '#eef2ff' }}

const ABSENCE_TYPES = {
  conge:   { label: 'Conge',   color: '#6366f1', bg: '#eef2ff' },
  RTT:     { label: 'RTT',     color: '#0ea5e9', bg: '#e0f2fe' },
  maladie: { label: 'Maladie', color: '#dc2626', bg: '#fef2f2' },
  ferie:   { label: 'Ferie',   color: '#f59e0b', bg: '#fffbeb' }}

const CATEGORIE_META = {
  transport:   { label: 'Transport',    icon: '🚗' },
  hebergement: { label: 'Hebergement',  icon: '🏨' },
  repas:       { label: 'Repas',        icon: '🍽' },
  materiel:    { label: 'Materiel',     icon: '💻' },
  formation:   { label: 'Formation',    icon: '📚' },
  autre:       { label: 'Autre',        icon: '📎' }}

const STORAGE_KEY_WORKFLOWS = 'workflows_config'
const STORAGE_KEY_ABSENCES = 'absences_data'
const STORAGE_KEY_APPROVALS = 'workflow_approvals'

// ── Helpers ─────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMontant(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0, 10) }

function countWorkdays(dateDebut, dateFin) {
  let count = 0
  let cur = new Date(dateDebut + 'T12:00:00')
  const end = new Date(dateFin + 'T12:00:00')
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur = addDays(cur, 1)
  }
  return count
}

function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback } catch { return fallback }
}
function saveLocal(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// Demo absences generator
function generateDemoAbsences() {
  const monday = getMonday(new Date())
  return [
    { id: 'abs-w1', user_id: 'u2', type: 'conge',   date_debut: toISO(addDays(monday, 2)), date_fin: toISO(addDays(monday, 4)), note: 'Vacances familiales', statut: 'en_attente' },
    { id: 'abs-w2', user_id: 'u3', type: 'RTT',     date_debut: toISO(addDays(monday, 7)), date_fin: toISO(addDays(monday, 7)), note: '',                   statut: 'en_attente' },
    { id: 'abs-w3', user_id: 'u4', type: 'maladie', date_debut: toISO(addDays(monday, -2)), date_fin: toISO(addDays(monday, -1)), note: 'Arret medical',     statut: 'approuve' },
    { id: 'abs-w4', user_id: 'u5', type: 'conge',   date_debut: toISO(addDays(monday, 14)), date_fin: toISO(addDays(monday, 18)), note: 'Conges ete',        statut: 'en_attente' },
    { id: 'abs-w5', user_id: 'u1', type: 'RTT',     date_debut: toISO(addDays(monday, 21)), date_fin: toISO(addDays(monday, 21)), note: 'RTT pont',          statut: 'rejete' },
  ]
}

// Demo timesheets
function generateDemoTimesheets() {
  const monday = getMonday(new Date())
  return [
    { id: 'ts-1', user_id: 'u2', user_name: 'Alice Martin',  semaine: toISO(monday),           total_heures: 38.5, projets: [{ nom: 'Formation Data TechForge', heures: 24 }, { nom: 'Dashboard BI Datavision', heures: 14.5 }], statut: 'soumis' },
    { id: 'ts-2', user_id: 'u3', user_name: 'Bob Dupont',     semaine: toISO(monday),           total_heures: 40,   projets: [{ nom: 'Migration ERP Meridian', heures: 32 }, { nom: 'Infra Cloud Industriel', heures: 8 }],     statut: 'soumis' },
    { id: 'ts-3', user_id: 'u4', user_name: 'Claire Petit',   semaine: toISO(monday),           total_heures: 35,   projets: [{ nom: 'Conformite RGPD Pharma', heures: 20 }, { nom: 'Support & MCO Altea', heures: 15 }],      statut: 'soumis' },
    { id: 'ts-4', user_id: 'u5', user_name: 'David Lemaire',  semaine: toISO(addDays(monday, -7)), total_heures: 42, projets: [{ nom: 'Infra Cloud Industriel', heures: 35 }, { nom: 'TMS Logistique Express', heures: 7 }],    statut: 'valide' },
    { id: 'ts-5', user_id: 'u2', user_name: 'Alice Martin',   semaine: toISO(addDays(monday, -7)), total_heures: 37, projets: [{ nom: 'Formation Data TechForge', heures: 37 }],                                                statut: 'valide' },
  ]
}

// ── Composants utilitaires ──────────────────────────────────────

function StatusBadge({ statut, meta }) {
  const cfg = meta[statut] || { label: statut, color: '#64748b', bg: '#f1f5f9' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '.2rem .65rem', borderRadius: 20,
      fontSize: '.78rem', fontWeight: 700, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`}}>
      {cfg.label}
    </span>
  )
}

function UserCell({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
      <span style={{
        width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.65rem', fontWeight: 700, flexShrink: 0}}>
        {getInitials(name)}
      </span>
      <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{name || '—'}</span>
    </div>
  )
}

function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '.75rem 1.25rem', minWidth: 150, flex: '1 1 150px'}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--text)', marginTop: '.15rem' }}>
        {value}
      </div>
    </div>
  )
}

// ── Workflow Chain Visual ───────────────────────────────────────

function WorkflowChain({ currentStep }) {
  const stepIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStep)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {WORKFLOW_STEPS.map((step, i) => {
        const isCompleted = i < stepIdx
        const isCurrent = i === stepIdx
        const isUpcoming = i > stepIdx
        const circleColor = isCompleted ? '#22c55e' : isCurrent ? '#f59e0b' : '#cbd5e1'
        const lineColor = isCompleted ? '#22c55e' : '#e2e8f0'
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: circleColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.7rem', color: 'white', fontWeight: 700,
                border: isCurrent ? '2px solid #f59e0b' : 'none',
                boxShadow: isCurrent ? '0 0 0 3px #fef3c740' : 'none'}}>
                {isCompleted ? '✓' : step.icon}
              </div>
              <span style={{
                fontSize: '.68rem', fontWeight: isCurrent ? 700 : 500, marginTop: '.3rem',
                color: isUpcoming ? 'var(--text-muted)' : 'var(--text)', textAlign: 'center'}}>
                {step.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ width: 40, height: 2, background: lineColor, margin: '0 .25rem', marginBottom: '1.2rem' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Workflow Config Panel ───────────────────────────────────────

function WorkflowConfigPanel() {
  const [configs, setConfigs] = useState(() => loadLocal(STORAGE_KEY_WORKFLOWS, {
    notes_de_frais: { enabled: true, steps: ['soumis', 'manager', 'validation'] },
    conges:         { enabled: true, steps: ['soumis', 'manager', 'validation'] },
    temps:          { enabled: true, steps: ['soumis', 'manager', 'validation'] }}))

  function toggleWorkflow(type) {
    const updated = { ...configs, [type]: { ...configs[type], enabled: !configs[type].enabled } }
    setConfigs(updated)
    saveLocal(STORAGE_KEY_WORKFLOWS, updated)
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>
        Configuration des workflows
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {Object.entries(WORKFLOW_TYPES).map(([key, wf]) => {
          const cfg = configs[key]
          return (
            <div key={key} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.25rem', position: 'relative', overflow: 'hidden'}}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: cfg.enabled ? wf.color : '#e2e8f0'}} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{wf.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{wf.label}</span>
                </div>
                <button
                  onClick={() => toggleWorkflow(key)}
                  style={{
                    padding: '.25rem .75rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: '.75rem', fontWeight: 700,
                    background: cfg.enabled ? '#f0fdf4' : '#fef2f2',
                    color: cfg.enabled ? '#22c55e' : '#ef4444'}}
                >
                  {cfg.enabled ? 'Actif' : 'Inactif'}
                </button>
              </div>
              {cfg.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '.5rem 0' }}>
                  {WORKFLOW_STEPS.map((step, i) => (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70}}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: step.color + '22',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '.85rem', border: `2px solid ${step.color}`}}>
                          {step.icon}
                        </div>
                        <span style={{ fontSize: '.65rem', fontWeight: 600, marginTop: '.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {step.label}
                        </span>
                        <span style={{ fontSize: '.58rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          {step.desc}
                        </span>
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', marginBottom: '2rem'}}>
                          <div style={{ width: 24, height: 2, background: '#e2e8f0' }} />
                          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>→</span>
                          <div style={{ width: 24, height: 2, background: '#e2e8f0' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Notes de frais ─────────────────────────────────────────

function NotesDeFraisTab({ isDemoMode, profile }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [rejectId, setRejectId] = useState(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [commentId, setCommentId] = useState(null)
  const [comment, setComment] = useState('')
  const [historyId, setHistoryId] = useState(null)

  useEffect(() => { fetchNotes() }, [isDemoMode])

  async function fetchNotes() {
    setLoading(true)
    if (isDemoMode) {
      const pending = DEMO_NOTES_DE_FRAIS.filter(n => n.statut === 'soumis')
      setNotes(pending)
      setLoading(false)
      return
    }
    let q = supabase.from('notes_de_frais').select('*').eq('statut', 'soumis').order('date', { ascending: false })
    const { data } = await q
    setNotes(data || [])
    setLoading(false)
  }

  async function handleApprove(id) {
    if (isDemoMode) {
      setNotes(prev => prev.filter(n => n.id !== id))
      const approvals = loadLocal(STORAGE_KEY_APPROVALS, [])
      approvals.push({ id, type: 'note_de_frais', action: 'approuve', date: new Date().toISOString(), by: profile?.full_name })
      saveLocal(STORAGE_KEY_APPROVALS, approvals)
      return
    }
    await supabase.from('notes_de_frais').update({ statut: 'valide' }).eq('id', id)
    fetchNotes()
  }

  async function handleReject(id) {
    if (isDemoMode) {
      setNotes(prev => prev.filter(n => n.id !== id))
      const approvals = loadLocal(STORAGE_KEY_APPROVALS, [])
      approvals.push({ id, type: 'note_de_frais', action: 'rejete', motif: rejectMotif, date: new Date().toISOString(), by: profile?.full_name })
      saveLocal(STORAGE_KEY_APPROVALS, approvals)
    } else {
      await supabase.from('notes_de_frais').update({ statut: 'refuse' }).eq('id', id)
      fetchNotes()
    }
    setRejectId(null)
    setRejectMotif('')
  }

  function handleBatchApprove() {
    selected.forEach(id => handleApprove(id))
    setSelected([])
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selected.length === notes.length) {
      setSelected([])
    } else {
      setSelected(notes.map(n => n.id))
    }
  }

  // Demo history
  const getHistory = (id) => {
    const note = DEMO_NOTES_DE_FRAIS.find(n => n.id === id)
    return [
      { step: 'Soumission', date: note?.date, by: note?.user_name, status: 'completed' },
      { step: 'Revue Manager', date: null, by: '—', status: 'current' },
      { step: 'Validation finale', date: null, by: '—', status: 'pending' },
    ]
  }

  const { sortedData: sortedNotes, sortKey, sortDir, requestSort } = useSortableTable(notes, 'date', 'desc')

  if (loading) return <Spinner />

  return (
    <div>
      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem',
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: '1rem'}}>
          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>
            {selected.length} element{selected.length > 1 ? 's' : ''} selectionne{selected.length > 1 ? 's' : ''}
          </span>
          <button className="btn-primary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={handleBatchApprove}>
            Approuver la selection
          </button>
          <button className="btn-secondary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={() => setSelected([])}>
            Annuler
          </button>
        </div>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={notes.length > 0 && selected.length === notes.length} onChange={toggleSelectAll} />
              </th>
              <SortableHeader label="Collaborateur" field="user_name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Date" field="date" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Montant" field="montant" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Categorie" field="categorie" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <th>Description</th>
              <th>Justificatif</th>
              <th>Progression</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedNotes.map(n => {
              const cat = CATEGORIE_META[n.categorie] || CATEGORIE_META.autre
              return (
                <tr key={n.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(n.id)} onChange={() => toggleSelect(n.id)} />
                  </td>
                  <td><UserCell name={n.user_name} /></td>
                  <td className="date-cell">{fmtDate(n.date)}</td>
                  <td style={{ fontWeight: 600 }}>{fmtMontant(n.montant)}</td>
                  <td>
                    <span className="status-badge" style={{ color: '#64748b', background: '#f1f5f9' }}>
                      {cat.icon} {cat.label}
                    </span>
                  </td>
                  <td style={{ maxWidth: 220, fontSize: '.85rem' }}>{n.description}</td>
                  <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{n.justificatif || '—'}</td>
                  <td>
                    <WorkflowChain currentStep="manager" />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '.75rem', padding: '.25rem .6rem' }}
                        onClick={() => handleApprove(n.id)}
                      >
                        Approuver
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '.75rem', padding: '.25rem .6rem', color: '#ef4444', borderColor: '#ef444433' }}
                        onClick={() => { setRejectId(n.id); setRejectMotif('') }}
                      >
                        Rejeter
                      </button>
                      <button
                        className="btn-icon"
                        style={{ fontSize: '.75rem' }}
                        title="Commentaire"
                        onClick={() => { setCommentId(commentId === n.id ? null : n.id); setComment('') }}
                      >
                        💬
                      </button>
                      <button
                        className="btn-icon"
                        style={{ fontSize: '.75rem' }}
                        title="Historique"
                        onClick={() => setHistoryId(historyId === n.id ? null : n.id)}
                      >
                        📋
                      </button>
                    </div>
                    {commentId === n.id && (
                      <div style={{ marginTop: '.5rem', display: 'flex', gap: '.35rem' }}>
                        <input
                          type="text"
                          placeholder="Ajouter un commentaire..."
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          style={{ flex: 1, fontSize: '.78rem', padding: '.25rem .5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                        />
                        <button className="btn-primary" style={{ fontSize: '.7rem', padding: '.25rem .5rem' }} onClick={() => { setCommentId(null); setComment('') }}>
                          OK
                        </button>
                      </div>
                    )}
                    {historyId === n.id && (
                      <div style={{ marginTop: '.5rem', background: '#f8fafc', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.75rem' }}>
                        {getHistory(n.id).map((h, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.25rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: h.status === 'completed' ? '#22c55e' : h.status === 'current' ? '#f59e0b' : '#cbd5e1',
                              flexShrink: 0}} />
                            <span style={{ fontWeight: 600 }}>{h.step}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{h.by}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.date ? fmtDate(h.date) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {notes.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune note de frais en attente d'approbation
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal rejet */}
      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Rejeter la note de frais</h2>
              <button className="btn-icon" onClick={() => setRejectId(null)}>✕</button>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: '.5rem', display: 'block' }}>Motif du rejet *</label>
                <textarea
                  rows={3}
                  placeholder="Indiquez le motif du rejet..."
                  value={rejectMotif}
                  onChange={e => setRejectMotif(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '.5rem .75rem', fontSize: '.85rem', resize: 'vertical', fontFamily: 'inherit'}}
                />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={() => setRejectId(null)}>Annuler</button>
                <button
                  className="btn-primary"
                  style={{ background: '#ef4444' }}
                  disabled={!rejectMotif.trim()}
                  onClick={() => handleReject(rejectId)}
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Conges ─────────────────────────────────────────────────

function CongesTab({ isDemoMode, profile }) {
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [rejectId, setRejectId] = useState(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [historyId, setHistoryId] = useState(null)

  useEffect(() => { loadAbsences() }, [isDemoMode])

  async function loadAbsences() {
    setLoading(true)
    if (isDemoMode) {
      const data = generateDemoAbsences()
      setAbsences(data.filter(a => a.statut === 'en_attente'))
    } else {
      try {
        const { data } = await supabase.from('absences').select('*').eq('statut', 'en_attente').order('date_debut', { ascending: true })
        setAbsences(data || [])
      } catch { setAbsences([]) }
    }
    setLoading(false)
  }

  function getUserName(userId) {
    const user = DEMO_USERS.find(u => u.id === userId)
    return user?.full_name || userId
  }

  async function handleApprove(id) {
    if (isDemoMode) {
      setAbsences(prev => prev.filter(a => a.id !== id))
      const approvals = loadLocal(STORAGE_KEY_APPROVALS, [])
      approvals.push({ id, type: 'conge', action: 'approuve', date: new Date().toISOString(), by: profile?.full_name })
      saveLocal(STORAGE_KEY_APPROVALS, approvals)
      return
    }
    await supabase.from('absences').update({ statut: 'approuve' }).eq('id', id)
    loadAbsences()
  }

  async function handleReject(id) {
    if (isDemoMode) {
      setAbsences(prev => prev.filter(a => a.id !== id))
      const approvals = loadLocal(STORAGE_KEY_APPROVALS, [])
      approvals.push({ id, type: 'conge', action: 'rejete', motif: rejectMotif, date: new Date().toISOString(), by: profile?.full_name })
      saveLocal(STORAGE_KEY_APPROVALS, approvals)
    } else {
      await supabase.from('absences').update({ statut: 'rejete' }).eq('id', id)
      loadAbsences()
    }
    setRejectId(null)
    setRejectMotif('')
  }

  function handleBatchApprove() {
    selected.forEach(id => handleApprove(id))
    setSelected([])
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Mini calendar for team absences
  const calendarWeeks = useMemo(() => {
    const monday = getMonday(new Date())
    const weeks = []
    for (let w = 0; w < 4; w++) {
      const weekStart = addDays(monday, w * 7)
      const days = []
      for (let d = 0; d < 5; d++) {
        const date = addDays(weekStart, d)
        const dateStr = toISO(date)
        const usersOff = absences.filter(a => {
          return dateStr >= a.date_debut && dateStr <= a.date_fin
        }).map(a => getUserName(a.user_id))
        days.push({ date, dateStr, usersOff })
      }
      weeks.push({ start: weekStart, days })
    }
    return weeks
  }, [absences])

  const { sortedData: sortedAbsences, sortKey: absSortKey, sortDir: absSortDir, requestSort: absRequestSort } = useSortableTable(absences, 'date_debut', 'asc')

  if (loading) return <Spinner />

  return (
    <div>
      {/* Calendar preview */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '1rem 1.25rem', marginBottom: '1.25rem'}}>
        <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Apercu calendrier equipe (4 semaines)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.5rem', fontSize: '.75rem' }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(d => (
            <div key={d} style={{ fontWeight: 700, textAlign: 'center', color: 'var(--text-muted)', paddingBottom: '.35rem' }}>{d}</div>
          ))}
          {calendarWeeks.flatMap(w => w.days).map(day => (
            <div key={day.dateStr} style={{
              padding: '.35rem', borderRadius: 6, textAlign: 'center',
              background: day.usersOff.length > 0 ? '#fef3c7' : '#f8fafc',
              border: `1px solid ${day.usersOff.length > 0 ? '#fcd34d' : 'var(--border)'}`,
              minHeight: 40}}>
              <div style={{ fontWeight: 600, fontSize: '.7rem' }}>
                {day.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </div>
              {day.usersOff.map((name, i) => (
                <div key={i} style={{
                  fontSize: '.6rem', background: '#6366f122', color: '#6366f1',
                  borderRadius: 4, padding: '.1rem .25rem', marginTop: '.15rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {name.split(' ')[0]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem',
          background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, marginBottom: '1rem'}}>
          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>
            {selected.length} demande{selected.length > 1 ? 's' : ''} selectionnee{selected.length > 1 ? 's' : ''}
          </span>
          <button className="btn-primary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={handleBatchApprove}>
            Approuver la selection
          </button>
          <button className="btn-secondary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={() => setSelected([])}>
            Annuler
          </button>
        </div>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={absences.length > 0 && selected.length === absences.length} onChange={() => setSelected(selected.length === absences.length ? [] : absences.map(a => a.id))} />
              </th>
              <SortableHeader label="Collaborateur" field="user_id" sortKey={absSortKey} sortDir={absSortDir} onSort={absRequestSort} />
              <SortableHeader label="Type" field="type" sortKey={absSortKey} sortDir={absSortDir} onSort={absRequestSort} />
              <SortableHeader label="Date debut" field="date_debut" sortKey={absSortKey} sortDir={absSortDir} onSort={absRequestSort} />
              <SortableHeader label="Date fin" field="date_fin" sortKey={absSortKey} sortDir={absSortDir} onSort={absRequestSort} />
              <th>Nb jours</th>
              <th>Note</th>
              <th>Progression</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAbsences.map(a => {
              const typeCfg = ABSENCE_TYPES[a.type] || { label: a.type, color: '#64748b', bg: '#f1f5f9' }
              const nbJours = countWorkdays(a.date_debut, a.date_fin)
              return (
                <tr key={a.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                  </td>
                  <td><UserCell name={getUserName(a.user_id)} /></td>
                  <td>
                    <span style={{
                      display: 'inline-flex', padding: '.2rem .65rem', borderRadius: 20,
                      fontSize: '.78rem', fontWeight: 700, background: typeCfg.bg, color: typeCfg.color,
                      border: `1px solid ${typeCfg.color}33`}}>
                      {typeCfg.label}
                    </span>
                  </td>
                  <td>{fmtDate(a.date_debut)}</td>
                  <td>{fmtDate(a.date_fin)}</td>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{nbJours}j</span></td>
                  <td style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{a.note || '—'}</td>
                  <td><WorkflowChain currentStep="manager" /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '.75rem', padding: '.25rem .6rem' }}
                        onClick={() => handleApprove(a.id)}
                      >
                        Approuver
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '.75rem', padding: '.25rem .6rem', color: '#ef4444', borderColor: '#ef444433' }}
                        onClick={() => { setRejectId(a.id); setRejectMotif('') }}
                      >
                        Rejeter
                      </button>
                      <button
                        className="btn-icon"
                        style={{ fontSize: '.75rem' }}
                        title="Historique"
                        onClick={() => setHistoryId(historyId === a.id ? null : a.id)}
                      >
                        📋
                      </button>
                    </div>
                    {historyId === a.id && (
                      <div style={{ marginTop: '.5rem', background: '#f8fafc', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.75rem' }}>
                        {[
                          { step: 'Soumission', date: a.date_debut, by: getUserName(a.user_id), status: 'completed' },
                          { step: 'Revue Manager', date: null, by: '—', status: 'current' },
                          { step: 'Validation finale', date: null, by: '—', status: 'pending' },
                        ].map((h, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.25rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: h.status === 'completed' ? '#22c55e' : h.status === 'current' ? '#f59e0b' : '#cbd5e1',
                              flexShrink: 0}} />
                            <span style={{ fontWeight: 600 }}>{h.step}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{h.by}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.date ? fmtDate(h.date) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {absences.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune demande de conge en attente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal rejet */}
      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Rejeter la demande</h2>
              <button className="btn-icon" onClick={() => setRejectId(null)}>✕</button>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: '.5rem', display: 'block' }}>Motif du rejet *</label>
                <textarea
                  rows={3}
                  placeholder="Indiquez le motif du rejet..."
                  value={rejectMotif}
                  onChange={e => setRejectMotif(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '.5rem .75rem', fontSize: '.85rem', resize: 'vertical', fontFamily: 'inherit'}}
                />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={() => setRejectId(null)}>Annuler</button>
                <button
                  className="btn-primary"
                  style={{ background: '#ef4444' }}
                  disabled={!rejectMotif.trim()}
                  onClick={() => handleReject(rejectId)}
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Temps ──────────────────────────────────────────────────

function TempsTab({ isDemoMode, profile }) {
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [historyId, setHistoryId] = useState(null)

  useEffect(() => { loadTimesheets() }, [isDemoMode])

  async function loadTimesheets() {
    setLoading(true)
    if (isDemoMode) {
      setTimesheets(generateDemoTimesheets().filter(t => t.statut === 'soumis'))
    } else {
      // In real mode, would query saisie_temps or similar table
      setTimesheets([])
    }
    setLoading(false)
  }

  async function handleApprove(id) {
    if (isDemoMode) {
      setTimesheets(prev => prev.filter(t => t.id !== id))
      return
    }
    // Real Supabase update would go here
  }

  async function handleReject(id) {
    if (isDemoMode) {
      setTimesheets(prev => prev.filter(t => t.id !== id))
      return
    }
  }

  function handleBatchApprove() {
    selected.forEach(id => handleApprove(id))
    setSelected([])
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const { sortedData: sortedTimesheets, sortKey: tsSortKey, sortDir: tsSortDir, requestSort: tsRequestSort } = useSortableTable(timesheets, 'semaine', 'desc')

  if (loading) return <Spinner />

  return (
    <div>
      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem',
          background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8, marginBottom: '1rem'}}>
          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>
            {selected.length} feuille{selected.length > 1 ? 's' : ''} selectionnee{selected.length > 1 ? 's' : ''}
          </span>
          <button className="btn-primary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={handleBatchApprove}>
            Valider la selection
          </button>
          <button className="btn-secondary" style={{ fontSize: '.78rem', padding: '.3rem .75rem' }} onClick={() => setSelected([])}>
            Annuler
          </button>
        </div>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={timesheets.length > 0 && selected.length === timesheets.length} onChange={() => setSelected(selected.length === timesheets.length ? [] : timesheets.map(t => t.id))} />
              </th>
              <SortableHeader label="Collaborateur" field="user_name" sortKey={tsSortKey} sortDir={tsSortDir} onSort={tsRequestSort} />
              <SortableHeader label="Semaine" field="semaine" sortKey={tsSortKey} sortDir={tsSortDir} onSort={tsRequestSort} />
              <SortableHeader label="Total heures" field="total_heures" sortKey={tsSortKey} sortDir={tsSortDir} onSort={tsRequestSort} />
              <th>Repartition projets</th>
              <th>Progression</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTimesheets.map(t => (
              <tr key={t.id}>
                <td>
                  <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                </td>
                <td><UserCell name={t.user_name} /></td>
                <td style={{ fontSize: '.85rem' }}>
                  Sem. du {fmtDate(t.semaine)}
                </td>
                <td>
                  <span style={{
                    fontWeight: 700, color: t.total_heures >= 40 ? '#22c55e' : t.total_heures >= 35 ? '#f59e0b' : '#ef4444'}}>
                    {t.total_heures}h
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                    {t.projets.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem' }}>
                        <div style={{
                          width: Math.max(20, (p.heures / t.total_heures) * 100), height: 6,
                          borderRadius: 3, background: i === 0 ? '#6366f1' : i === 1 ? '#0ea5e9' : '#f59e0b'}} />
                        <span style={{ color: 'var(--text-muted)' }}>{p.nom}</span>
                        <span style={{ fontWeight: 600 }}>{p.heures}h</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td><WorkflowChain currentStep="manager" /></td>
                <td>
                  <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '.75rem', padding: '.25rem .6rem' }}
                      onClick={() => handleApprove(t.id)}
                    >
                      Valider
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '.75rem', padding: '.25rem .6rem', color: '#ef4444', borderColor: '#ef444433' }}
                      onClick={() => handleReject(t.id)}
                    >
                      Renvoyer
                    </button>
                    <button
                      className="btn-icon"
                      style={{ fontSize: '.75rem' }}
                      title="Historique"
                      onClick={() => setHistoryId(historyId === t.id ? null : t.id)}
                    >
                      📋
                    </button>
                  </div>
                  {historyId === t.id && (
                    <div style={{ marginTop: '.5rem', background: '#f8fafc', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.75rem' }}>
                      {[
                        { step: 'Soumission', date: t.semaine, by: t.user_name, status: 'completed' },
                        { step: 'Revue Manager', date: null, by: '—', status: 'current' },
                        { step: 'Validation finale', date: null, by: '—', status: 'pending' },
                      ].map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.25rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: h.status === 'completed' ? '#22c55e' : h.status === 'current' ? '#f59e0b' : '#cbd5e1',
                            flexShrink: 0}} />
                          <span style={{ fontWeight: 600 }}>{h.step}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{h.by}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.date ? fmtDate(h.date) : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {timesheets.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune feuille de temps en attente de validation
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────

export default function WorkflowsPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const [activeTab, setActiveTab] = useState('notes_de_frais')
  const [showConfig, setShowConfig] = useState(false)

  // KPI calculations
  const [kpis, setKpis] = useState({ enAttente: 0, approuvesMois: 0, rejetesMois: 0, tempsMoyen: '2.1j' })

  useEffect(() => {
    if (isDemoMode) {
      const pendingNdf = DEMO_NOTES_DE_FRAIS.filter(n => n.statut === 'soumis').length
      const pendingAbs = generateDemoAbsences().filter(a => a.statut === 'en_attente').length
      const pendingTs = generateDemoTimesheets().filter(t => t.statut === 'soumis').length

      const approuvedNdf = DEMO_NOTES_DE_FRAIS.filter(n => n.statut === 'valide' || n.statut === 'rembourse').length
      const rejectedNdf = DEMO_NOTES_DE_FRAIS.filter(n => n.statut === 'refuse').length

      setKpis({
        enAttente: pendingNdf + pendingAbs + pendingTs,
        approuvesMois: approuvedNdf + 3,
        rejetesMois: rejectedNdf,
        tempsMoyen: '2.1j'})
    } else {
      // Would query Supabase for real KPIs
      setKpis({ enAttente: 0, approuvesMois: 0, rejetesMois: 0, tempsMoyen: '—' })
    }
  }, [isDemoMode])

  const TABS = [
    { key: 'notes_de_frais', label: 'Notes de frais',  icon: '💰', count: isDemoMode ? DEMO_NOTES_DE_FRAIS.filter(n => n.statut === 'soumis').length : 0 },
    { key: 'conges',         label: 'Conges',           icon: '🏖', count: isDemoMode ? generateDemoAbsences().filter(a => a.statut === 'en_attente').length : 0 },
    { key: 'temps',          label: 'Temps',            icon: '⏱', count: isDemoMode ? generateDemoTimesheets().filter(t => t.statut === 'soumis').length : 0 },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Workflows d'approbation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
            Gestion des circuits de validation
          </p>
        </div>
        <button
          className={showConfig ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setShowConfig(v => !v)}
        >
          {showConfig ? '✕ Fermer config' : '⚙ Configurer les workflows'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <KpiCard label="En attente" value={kpis.enAttente} color="#f59e0b" icon="⏳" />
        <KpiCard label="Approuves ce mois" value={kpis.approuvesMois} color="#22c55e" icon="✅" />
        <KpiCard label="Rejetes ce mois" value={kpis.rejetesMois} color="#ef4444" icon="❌" />
        <KpiCard label="Temps moyen traitement" value={kpis.tempsMoyen} color="var(--primary)" icon="⚡" />
      </div>

      {/* Workflow Config */}
      {showConfig && <WorkflowConfigPanel />}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: '1.25rem',
        borderBottom: '2px solid var(--border)', overflow: 'auto'}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '.65rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px', fontSize: '.88rem', fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
              transition: 'all .15s'}}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={{
                background: activeTab === tab.key ? 'var(--primary)' : '#94a3b8',
                color: 'white', borderRadius: 10, padding: '.1rem .45rem',
                fontSize: '.7rem', fontWeight: 700, lineHeight: 1.3}}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'notes_de_frais' && (
        <NotesDeFraisTab isDemoMode={isDemoMode} profile={profile} />
      )}
      {activeTab === 'conges' && (
        <CongesTab isDemoMode={isDemoMode} profile={profile} />
      )}
      {activeTab === 'temps' && (
        <TempsTab isDemoMode={isDemoMode} profile={profile} />
      )}
    </div>
  )
}
