import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_USERS } from '../../data/demoData'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const STORAGE_KEY = 'validation_statuts'

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0, 10) }

function fmtWeekRange(monday) {
  const friday = addDays(monday, 4)
  const opts = { day: '2-digit', month: 'short' }
  return `${monday.toLocaleDateString('fr-FR', opts)} – ${friday.toLocaleDateString('fr-FR', opts)}`
}

const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', color: '#64748b', bg: '#f1f5f9' },
  soumis:    { label: 'Soumis',    color: '#f59e0b', bg: '#fffbeb' },
  valide:    { label: 'Validé',    color: '#16a34a', bg: '#f0fdf4' },
  rejete:    { label: 'Rejeté',    color: '#dc2626', bg: '#fef2f2' },
}

// Default demo statuses for each user
const DEMO_DEFAULT_STATUSES = {
  u1: 'brouillon',
  u2: 'soumis',
  u3: 'soumis',
  u4: 'valide',
  u5: 'brouillon',
}

function loadStatuts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveStatuts(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.brouillon
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '.2rem .65rem',
      borderRadius: 20,
      fontSize: '.78rem',
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.label}
    </span>
  )
}

export default function ValidationPage() {
  const { profile } = useAuth()
  const { isDemoMode } = useDemo()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [statuts, setStatuts] = useState({})

  const mondayISO = toISO(weekStart)

  useEffect(() => {
    const stored = loadStatuts()
    setStatuts(stored)
  }, [])

  function getStatus(userId) {
    const key = `${userId}_${mondayISO}`
    if (statuts[key] !== undefined) return statuts[key]
    // In demo mode, use default demo statuses
    if (isDemoMode) return DEMO_DEFAULT_STATUSES[userId] || 'brouillon'
    return 'brouillon'
  }

  function setStatus(userId, newStatus) {
    const key = `${userId}_${mondayISO}`
    const updated = { ...statuts, [key]: newStatus }
    setStatuts(updated)
    saveStatuts(updated)
  }

  const users = isDemoMode ? DEMO_USERS : []

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(users, 'full_name', 'asc')

  const submittedCount = users.filter(u => getStatus(u.id) === 'soumis').length
  const validatedCount = users.filter(u => getStatus(u.id) === 'valide').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Validation des temps</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
            Semaine du {fmtWeekRange(weekStart)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, -7))}>← Préc.</button>
          <button className="btn-secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
          <button className="btn-secondary" onClick={() => setWeekStart(w => addDays(w, 7))}>Suiv. →</button>
        </div>
      </div>

      {/* KPI rapides */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem 1.25rem', minWidth: 130 }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>En attente</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '.1rem' }}>{submittedCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem 1.25rem', minWidth: 130 }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Validées</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '.1rem' }}>{validatedCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem 1.25rem', minWidth: 130 }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Total équipe</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginTop: '.1rem' }}>{users.length}</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr className="data-table-header">
              <SortableHeader label="Collaborateur" field="full_name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Rôle" field="role" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(user => {
              const status = getStatus(user.id)
              return (
                <tr key={user.id} className="data-table-row">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
                      }}>
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{user.full_name}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</span>
                  </td>
                  <td>
                    <StatusBadge status={status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                      {status === 'soumis' && (
                        <>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '.78rem', padding: '.3rem .75rem' }}
                            onClick={() => setStatus(user.id, 'valide')}
                          >
                            ✓ Valider
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '.78rem', padding: '.3rem .75rem', color: '#dc2626', borderColor: '#dc262633' }}
                            onClick={() => setStatus(user.id, 'rejete')}
                          >
                            ✕ Renvoyer
                          </button>
                        </>
                      )}
                      {status === 'valide' && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '.78rem', padding: '.3rem .75rem' }}
                          onClick={() => setStatus(user.id, 'brouillon')}
                        >
                          Réinitialiser
                        </button>
                      )}
                      {status === 'rejete' && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '.78rem', padding: '.3rem .75rem' }}
                          onClick={() => setStatus(user.id, 'brouillon')}
                        >
                          Réinitialiser
                        </button>
                      )}
                      {status === 'brouillon' && (
                        <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucun collaborateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
