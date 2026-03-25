import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const PHASES = [
  { id: 'nouveau',      label: 'Nouveau',      color: '#94a3b8', bg: '#f1f5f9' },
  { id: 'contacte',     label: 'Contacté',      color: '#3b82f6', bg: '#eff6ff' },
  { id: 'qualifie',     label: 'Qualifié',      color: '#06b6d4', bg: '#ecfeff' },
  { id: 'proposition',  label: 'Proposition',    color: '#f59e0b', bg: '#fffbeb' },
  { id: 'negociation',  label: 'Négociation',   color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'gagne',        label: 'Gagné',          color: '#22c55e', bg: '#f0fdf4' },
  { id: 'perdu',        label: 'Perdu',          color: '#ef4444', bg: '#fef2f2' },
]

const SOURCES = [
  'Site web', 'LinkedIn', 'Salon', 'Recommandation', 'Appel entrant', 'Autre',
]

function phaseInfo(id) {
  return PHASES.find(p => p.id === id) || { id, label: id || '—', color: '#64748b', bg: '#f8fafc' }
}

const EMPTY_FORM = {
  titre: '', contact_id: '', client_id: '', source: '',
  phase: 'nouveau', montant_estime: '', date_relance: '', notes: '',
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
function KanbanCard({ lead, onDragStart, onClick }) {
  const overdue = lead.date_relance && new Date(lead.date_relance) < new Date()
  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={() => onClick(lead)}
    >
      <div className="kanban-card-name">{lead.titre}</div>
      {lead.contacts && (
        <div className="kanban-card-client">👤 {lead.contacts.prenom} {lead.contacts.nom}</div>
      )}
      {lead.clients?.name && (
        <div className="kanban-card-client" style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>🏢 {lead.clients.name}</div>
      )}
      <div className="kanban-card-footer">
        {lead.montant_estime ? (
          <span className="kanban-card-montant">{formatMontant(lead.montant_estime)}</span>
        ) : <span />}
        <span style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
          {lead.source && (
            <span style={{ fontSize: '.7rem', background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '1px 6px' }}>{lead.source}</span>
          )}
          {lead.date_relance && (
            <span className={`kanban-card-date ${overdue && lead.phase !== 'perdu' ? 'kanban-card-date--overdue' : ''}`}>
              📅 {formatDate(lead.date_relance)}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ phase, cards, onDragStart, onDrop, onClick }) {
  const [dragOver, setDragOver] = useState(false)
  const total = cards.reduce((s, c) => s + (c.montant_estime || 0), 0)

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
        {cards.map(lead => (
          <KanbanCard key={lead.id} lead={lead} onDragStart={onDragStart} onClick={onClick} />
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
export default function LeadsPage() {
  const { selectedSociete, societes } = useSociete()
  const [leads, setLeads] = useState([])
  const [contacts, setContacts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [filterSociete, setFilterSociete] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [view, setView] = useState('kanban')
  const dragCard = useRef(null)

  useEffect(() => { fetchLeads(); fetchContacts(); fetchClients() }, [])

  async function fetchLeads() {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, contacts(nom, prenom), clients(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setLeads(data || [])
    setLoading(false)
  }

  async function fetchContacts() {
    const { data } = await supabase.from('contacts').select('id, nom, prenom').order('nom')
    setContacts(data || [])
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, name').order('name')
    setClients(data || [])
  }

  function openCreate() {
    setEditingLead(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(lead) {
    setEditingLead(lead)
    setForm({
      titre: lead.titre || '',
      contact_id: lead.contact_id || '',
      client_id: lead.client_id || '',
      source: lead.source || '',
      phase: lead.phase || 'nouveau',
      montant_estime: lead.montant_estime || '',
      date_relance: lead.date_relance || '',
      notes: lead.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      titre: form.titre,
      contact_id: form.contact_id || null,
      client_id: form.client_id || null,
      source: form.source || null,
      phase: form.phase,
      montant_estime: form.montant_estime ? parseFloat(form.montant_estime) : null,
      date_relance: form.date_relance || null,
      notes: form.notes || null,
      societe_id: selectedSociete?.id || null,
    }

    let err
    if (editingLead) {
      const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id)
      err = error
    } else {
      const { error } = await supabase.from('leads').insert(payload)
      err = error
    }
    if (err) { setError(err.message); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingLead(null)
    fetchLeads()
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce lead ?')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) { setError(error.message); return }
    fetchLeads()
  }

  async function handleDrop(targetPhase) {
    const card = dragCard.current
    if (!card || card.phase === targetPhase) return
    const { error } = await supabase.from('leads').update({ phase: targetPhase }).eq('id', card.id)
    if (!error) {
      setLeads(prev => prev.map(l => l.id === card.id ? { ...l, phase: targetPhase } : l))
    }
    dragCard.current = null
  }

  const filtered = useMemo(() => {
    let list = leads
    if (filterSociete) list = list.filter(l => l.societe_id === filterSociete)
    const q = filter.toLowerCase()
    if (q) list = list.filter(l =>
      (l.titre || '').toLowerCase().includes(q) ||
      (l.contacts?.nom || '').toLowerCase().includes(q) ||
      (l.contacts?.prenom || '').toLowerCase().includes(q) ||
      (l.clients?.name || '').toLowerCase().includes(q)
    )
    return list
  }, [leads, filter, filterSociete])

  const { sortedData: sortedFiltered, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'created_at', 'desc')
  const totalPages = Math.ceil(sortedFiltered.length / pageSize)
  const paginated = sortedFiltered.slice((page - 1) * pageSize, page * pageSize)

  // KPIs
  const now = new Date()
  const thisMonth = filtered.filter(l => {
    if (!l.created_at) return false
    const d = new Date(l.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const pipeline = filtered.filter(l => l.phase !== 'gagne' && l.phase !== 'perdu').reduce((s, l) => s + (l.montant_estime || 0), 0)
  const gained = filtered.filter(l => l.phase === 'gagne').reduce((s, l) => s + (l.montant_estime || 0), 0)
  const totalCount = filtered.length
  const gainedCount = filtered.filter(l => l.phase === 'gagne').length
  const tauxConversion = totalCount > 0 ? ((gainedCount / totalCount) * 100).toFixed(1) : '0'

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Leads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {filtered.length} lead{filtered.length > 1 ? 's' : ''}
            {filterSociete && societes?.length > 0 && (
              <span style={{ marginLeft: '.5rem' }}>
                — {societes.find(s => s.id === filterSociete)?.name || ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
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
          <button className="btn-primary" onClick={openCreate}>+ Nouveau lead</button>
        </div>
      </div>

      {/* KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 4 }}>Pipeline total</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#6366f1' }}>{formatMontant(pipeline)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 4 }}>Leads ce mois</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#3b82f6' }}>{thisMonth.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 4 }}>Taux de conversion</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e' }}>{tauxConversion} %</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 4 }}>Montant gagné</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a' }}>{formatMontant(gained)}</div>
        </div>
      </div>

      {/* Modal création / édition */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingLead(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLead ? 'Modifier le lead' : 'Nouveau lead'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingLead(null) }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Titre</label>
                <input type="text" value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex : Projet digitalisation Groupe ABC" required autoFocus />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Contact</label>
                  <select value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Entreprise</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {SOURCES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Phase</label>
                  <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
                    {PHASES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Montant estimé (€)</label>
                  <input type="number" min="0" step="100" value={form.montant_estime}
                    onChange={e => setForm(f => ({ ...f, montant_estime: e.target.value }))} placeholder="Ex : 50000" />
                </div>
                <div className="field">
                  <label>Date de relance</label>
                  <input type="date" value={form.date_relance}
                    onChange={e => setForm(f => ({ ...f, date_relance: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Contexte, besoins identifiés..." rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingLead(null) }}>Annuler</button>
                <button type="submit" className="btn-primary">{editingLead ? 'Enregistrer' : 'Créer'}</button>
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

      {/* Filtre société */}
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
      </div>

      {loading ? <Spinner /> : (
        view === 'kanban' ? (
          // ── KANBAN VIEW ──
          <div className="kanban-board">
            {PHASES.map(phase => (
              <KanbanColumn
                key={phase.id}
                phase={phase}
                cards={filtered.filter(l => l.phase === phase.id)}
                onDragStart={l => { dragCard.current = l }}
                onDrop={handleDrop}
                onClick={openEdit}
              />
            ))}
          </div>
        ) : (
          // ── LIST VIEW ──
          <>
            <div className="table-toolbar">
              <input className="table-search" type="text" placeholder="Filtrer par titre, contact ou entreprise..."
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
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <SortableHeader label="Titre" field="titre" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Nom" field="contacts.nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Prénom" field="contacts.prenom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Entreprise" field="clients.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Source" field="source" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Phase" field="phase" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Montant" field="montant_estime" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <SortableHeader label="Relance" field="date_relance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(l => {
                    const p = phaseInfo(l.phase)
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{l.titre}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{l.contacts?.nom || '—'}</td>
                        <td>{l.contacts?.prenom || '—'}</td>
                        <td>{l.clients?.name || '—'}</td>
                        <td>
                          {l.source ? (
                            <span style={{ fontSize: '.78rem', background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px' }}>{l.source}</span>
                          ) : '—'}
                        </td>
                        <td><span className="status-badge" style={{ color: p.color, background: p.bg }}>{p.label}</span></td>
                        <td>{formatMontant(l.montant_estime)}</td>
                        <td className="date-cell">{formatDate(l.date_relance)}</td>
                        <td>
                          <span style={{ display: 'flex', gap: '.35rem' }}>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem' }} onClick={() => openEdit(l)}>✏️</button>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem', color: '#dc2626' }} onClick={() => handleDelete(l.id)}>🗑</button>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Aucun lead trouvé.</td></tr>
                  )}
                </tbody>
              </table>
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
