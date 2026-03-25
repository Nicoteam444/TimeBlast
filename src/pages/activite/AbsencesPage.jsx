import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDemo } from '../../contexts/DemoContext'
import { useSociete } from '../../contexts/SocieteContext'
import { DEMO_USERS } from '../../data/demoData'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const STORAGE_KEY = 'absences_data'

const ABSENCE_TYPES = {
  conge:    { color: '#6366f1', bg: '#eef2ff', label: 'Conge' },
  RTT:      { color: '#0ea5e9', bg: '#e0f2fe', label: 'RTT' },
  maladie:  { color: '#dc2626', bg: '#fef2f2', label: 'Maladie' },
  ferie:    { color: '#f59e0b', bg: '#fffbeb', label: 'Ferie' },
}

const STATUT_META = {
  brouillon:  { label: 'Brouillon',   color: '#64748b', bg: '#f1f5f9' },
  en_attente: { label: 'En attente',  color: '#f59e0b', bg: '#fffbeb' },
  approuve:   { label: 'Approuve',    color: '#22c55e', bg: '#f0fdf4' },
  rejete:     { label: 'Rejete',      color: '#ef4444', bg: '#fef2f2' },
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

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TypeBadge({ type }) {
  const cfg = ABSENCE_TYPES[type] || { color: '#64748b', bg: '#f1f5f9', label: type }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '.2rem .65rem', borderRadius: 20,
      fontSize: '.78rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.label}
    </span>
  )
}

function StatutBadge({ statut }) {
  const cfg = STATUT_META[statut] || STATUT_META.brouillon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '.2rem .65rem', borderRadius: 20,
      fontSize: '.78rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.label}
    </span>
  )
}

function generateDemoAbsences() {
  const monday = getMonday(new Date())
  return [
    {
      id: 'abs-1',
      user_id: 'u2',
      type: 'conge',
      date_debut: toISO(addDays(monday, -7)),
      date_fin: toISO(addDays(monday, -3)),
      note: 'Vacances d\'hiver',
      statut: 'approuve',
    },
    {
      id: 'abs-2',
      user_id: 'u3',
      type: 'RTT',
      date_debut: toISO(addDays(monday, 1)),
      date_fin: toISO(addDays(monday, 1)),
      note: '',
      statut: 'en_attente',
    },
    {
      id: 'abs-3',
      user_id: 'u4',
      type: 'maladie',
      date_debut: toISO(addDays(monday, -2)),
      date_fin: toISO(addDays(monday, -1)),
      note: 'Arret medical',
      statut: 'approuve',
    },
    {
      id: 'abs-4',
      user_id: 'u5',
      type: 'ferie',
      date_debut: toISO(addDays(monday, 14)),
      date_fin: toISO(addDays(monday, 14)),
      note: 'Jour ferie',
      statut: 'en_attente',
    },
    {
      id: 'abs-5',
      user_id: 'u1',
      type: 'conge',
      date_debut: toISO(addDays(monday, 21)),
      date_fin: toISO(addDays(monday, 25)),
      note: 'Conges printemps',
      statut: 'brouillon',
    },
  ]
}

function loadLocalAbsences() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
function saveLocalAbsences(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export default function AbsencesPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const { selectedSociete } = useSociete()
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    user_id: '',
    type: 'conge',
    date_debut: toISO(new Date()),
    date_fin: toISO(new Date()),
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  async function loadAbsences() {
    setLoading(true)
    if (isDemoMode) {
      const stored = loadLocalAbsences()
      // Ensure demo data has statut field
      const data = stored || generateDemoAbsences()
      setAbsences(data.map(a => ({ ...a, statut: a.statut || 'brouillon' })))
    } else {
      try {
        let q = supabase.from('absences').select('*')
        if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
        if (profile?.role === 'collaborateur') q = q.eq('user_id', profile.id)
        const { data } = await q.order('date_debut', { ascending: false })
        setAbsences((data || []).map(a => ({ ...a, statut: a.statut || 'brouillon' })))
      } catch {
        setAbsences([])
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadAbsences() }, [isDemoMode, selectedSociete?.id])

  function getUserName(userId) {
    const user = DEMO_USERS.find(u => u.id === userId)
    if (user) return user.full_name
    if (userId === profile?.id) return profile?.full_name || userId
    return userId
  }

  function getUserNom(userId) {
    const name = getUserName(userId)
    const parts = (name || '').trim().split(/\s+/)
    return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '—'
  }

  function getUserPrenom(userId) {
    const name = getUserName(userId)
    const parts = (name || '').trim().split(/\s+/)
    return parts.length > 1 ? parts[0] : ''
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.user_id || !form.date_debut || !form.date_fin) return
    setSaving(true)
    const newAbs = {
      id: `abs-${Date.now()}`,
      ...form,
      statut: 'brouillon',
    }
    if (isDemoMode) {
      const updated = [newAbs, ...absences]
      setAbsences(updated)
      saveLocalAbsences(updated)
    } else {
      try {
        await supabase.from('absences').insert({
          user_id: form.user_id,
          type: form.type,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          note: form.note || null,
          statut: 'brouillon',
        })
        await loadAbsences()
      } catch {
        const updated = [newAbs, ...absences]
        setAbsences(updated)
      }
    }
    setSaving(false)
    setShowForm(false)
    setForm({ user_id: '', type: 'conge', date_debut: toISO(new Date()), date_fin: toISO(new Date()), note: '' })
  }

  async function handleStatut(id, newStatut) {
    if (isDemoMode) {
      const updated = absences.map(a => a.id === id ? { ...a, statut: newStatut } : a)
      setAbsences(updated)
      saveLocalAbsences(updated)
    } else {
      try {
        await supabase.from('absences').update({ statut: newStatut }).eq('id', id)
        await loadAbsences()
      } catch {
        const updated = absences.map(a => a.id === id ? { ...a, statut: newStatut } : a)
        setAbsences(updated)
      }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette absence ?')) return
    if (isDemoMode) {
      const updated = absences.filter(a => a.id !== id)
      setAbsences(updated)
      saveLocalAbsences(updated)
    } else {
      try {
        await supabase.from('absences').delete().eq('id', id)
        await loadAbsences()
      } catch {
        const updated = absences.filter(a => a.id !== id)
        setAbsences(updated)
      }
    }
  }

  const users = isDemoMode ? DEMO_USERS : (profile ? [{ id: profile.id, full_name: profile.full_name, role: profile.role }] : [])
  const canManage = ['admin', 'manager'].includes(profile?.role)

  const filtered = absences.filter(a => {
    const matchType = !filterType || a.type === filterType
    const matchStatut = !filterStatut || a.statut === filterStatut
    return matchType && matchStatut
  })

  const { sortedData: sortedFiltered, sortKey, sortDir, requestSort } = useSortableTable(filtered)

  const countByStatut = {
    en_attente: absences.filter(a => a.statut === 'en_attente').length,
    approuve: absences.filter(a => a.statut === 'approuve').length,
    rejete: absences.filter(a => a.statut === 'rejete').length,
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Absences</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
            Conges, RTT, maladies et jours feries
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* KPIs workflow */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'En attente', value: countByStatut.en_attente, color: '#f59e0b' },
          { label: 'Approuvees', value: countByStatut.approuve, color: '#22c55e' },
          { label: 'Rejetees', value: countByStatut.rejete, color: '#ef4444' },
          { label: 'Total', value: absences.length, color: 'var(--primary)' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '.6rem 1rem', minWidth: 110, flex: '1 1 110px',
          }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color, marginTop: '.1rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '.95rem', fontWeight: 700 }}>Nouvelle absence</h3>
          <form onSubmit={handleAdd}>
            <div className="form-row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 180px' }}>
                <label>Collaborateur</label>
                <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} required>
                  <option value="">Selectionner...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: '1 1 140px' }}>
                <label>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(ABSENCE_TYPES).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: '1 1 140px' }}>
                <label>Date debut</label>
                <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} required />
              </div>
              <div className="field" style={{ flex: '1 1 140px' }}>
                <label>Date fin</label>
                <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} required />
              </div>
              <div className="field" style={{ flex: '2 1 220px' }}>
                <label>Note (optionnel)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex: Arret medical" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Ajouter l\'absence'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn-secondary ${!filterType ? 'btn-secondary--active' : ''}`}
          style={{ fontSize: '.8rem', ...((!filterType) ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}) }}
          onClick={() => setFilterType('')}
        >
          Tous
        </button>
        {Object.entries(ABSENCE_TYPES).map(([key, cfg]) => (
          <button
            key={key}
            style={{
              fontSize: '.8rem', padding: '.3rem .75rem', borderRadius: 20, border: `1px solid ${cfg.color}44`,
              background: filterType === key ? cfg.bg : 'var(--surface)',
              color: filterType === key ? cfg.color : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: filterType === key ? 700 : 500,
            }}
            onClick={() => setFilterType(filterType === key ? '' : key)}
          >
            {cfg.label}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 .25rem' }} />
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          style={{
            fontSize: '.8rem', padding: '.3rem .6rem', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr className="data-table-header">
                <SortableHeader label="Nom" field="user_id" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Prénom</th>
                <SortableHeader label="Type" field="type" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Debut" field="date_debut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Fin" field="date_fin" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Duree</th>
                <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map(absence => (
                <tr key={absence.id} className="data-table-row">
                  <td style={{ fontWeight: 600 }}>{getUserNom(absence.user_id)}</td>
                  <td style={{ fontWeight: 500 }}>{getUserPrenom(absence.user_id)}</td>
                  <td><TypeBadge type={absence.type} /></td>
                  <td>{fmtDate(absence.date_debut)}</td>
                  <td>{fmtDate(absence.date_fin)}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {countWorkdays(absence.date_debut, absence.date_fin)}j
                    </span>
                  </td>
                  <td>
                    {canManage && absence.statut === 'en_attente' ? (
                      <div style={{ display: 'flex', gap: '.3rem' }}>
                        <button
                          className="btn-icon"
                          style={{ color: '#22c55e', fontSize: '.8rem' }}
                          title="Approuver"
                          onClick={() => handleStatut(absence.id, 'approuve')}
                        >✓</button>
                        <button
                          className="btn-icon"
                          style={{ color: '#ef4444', fontSize: '.8rem' }}
                          title="Rejeter"
                          onClick={() => handleStatut(absence.id, 'rejete')}
                        >✕</button>
                      </div>
                    ) : (
                      <StatutBadge statut={absence.statut} />
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{absence.note || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}>
                      {absence.statut === 'brouillon' && (
                        <button
                          style={{
                            background: 'none', border: '1px solid #f59e0b33',
                            color: '#f59e0b', borderRadius: 6, padding: '.25rem .6rem',
                            cursor: 'pointer', fontSize: '.78rem', fontWeight: 600,
                          }}
                          onClick={() => handleStatut(absence.id, 'en_attente')}
                        >
                          Soumettre
                        </button>
                      )}
                      {(absence.statut === 'brouillon' || canManage) && (
                        <button
                          style={{
                            background: 'none', border: '1px solid #dc262633',
                            color: '#dc2626', borderRadius: 6, padding: '.25rem .6rem',
                            cursor: 'pointer', fontSize: '.78rem', fontWeight: 600,
                          }}
                          onClick={() => handleDelete(absence.id)}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Aucune absence enregistree
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
