import { useState, useEffect } from 'react'
import { useDemo } from '../../contexts/DemoContext'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const ACTION_TYPES = {
  user_created:    { label: 'Utilisateur créé',   color: '#16a34a', bg: '#f0fdf4' },
  user_deleted:    { label: 'Utilisateur supprimé', color: '#dc2626', bg: '#fef2f2' },
  role_changed:    { label: 'Rôle modifié',        color: '#6366f1', bg: '#eef2ff' },
  saisie_validee:  { label: 'Saisie validée',      color: '#0ea5e9', bg: '#e0f2fe' },
  saisie_rejetee:  { label: 'Saisie rejetée',      color: '#f59e0b', bg: '#fffbeb' },
  login:           { label: 'Connexion',           color: '#64748b', bg: '#f1f5f9' },
  absence_added:   { label: 'Absence ajoutée',     color: '#8b5cf6', bg: '#f5f3ff' },
  settings_changed:{ label: 'Paramètres modifiés', color: '#14b8a6', bg: '#f0fdfa' },
}

function generateDemoAudit() {
  const now = new Date()
  const d = (n) => { const dt = new Date(now); dt.setHours(dt.getHours() - n); return dt.toISOString() }
  return [
    { id: 1, action: 'user_created',    description: 'Utilisateur David Lemaire créé (collaborateur)', user_id: 'u1', date: d(1),   ip: '192.168.1.10' },
    { id: 2, action: 'role_changed',    description: 'Rôle de Bob Dupont changé : collaborateur → manager', user_id: 'u1', date: d(3),   ip: '192.168.1.10' },
    { id: 3, action: 'saisie_validee',  description: 'Semaine du 10/03 validée pour Alice Martin',     user_id: 'u2', date: d(5),   ip: '192.168.1.12' },
    { id: 4, action: 'login',           description: 'Connexion de Claire Petit',                      user_id: 'u4', date: d(8),   ip: '192.168.1.15' },
    { id: 5, action: 'saisie_rejetee',  description: 'Semaine du 03/03 renvoyée à David Lemaire',      user_id: 'u2', date: d(12),  ip: '192.168.1.12' },
    { id: 6, action: 'absence_added',   description: 'Absence congé ajoutée pour Alice Martin (17-21/03)', user_id: 'u1', date: d(24),  ip: '192.168.1.10' },
    { id: 7, action: 'settings_changed',description: 'Paramètres d\'apparence modifiés',               user_id: 'u1', date: d(36),  ip: '192.168.1.10' },
    { id: 8, action: 'user_deleted',    description: 'Utilisateur Paul Martin supprimé',               user_id: 'u1', date: d(48),  ip: '192.168.1.10' },
    { id: 9, action: 'saisie_validee',  description: 'Semaine du 24/02 validée pour Bob Dupont',       user_id: 'u2', date: d(72),  ip: '192.168.1.12' },
    { id: 10, action: 'user_created',   description: 'Utilisateur Alice Martin créé (manager)',        user_id: 'u1', date: d(168), ip: '192.168.1.10' },
  ]
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ActionBadge({ action }) {
  const cfg = ACTION_TYPES[action] || { label: action, color: '#64748b', bg: '#f1f5f9' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '.2rem .65rem', borderRadius: 20,
      fontSize: '.75rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

export default function AdminAuditPage() {
  const { isDemoMode } = useDemo()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  async function loadAudit() {
    setLoading(true)
    let rows = []

    if (isDemoMode) {
      rows = generateDemoAudit()
    } else {
      // Try Supabase first
      try {
        const { data } = await supabase.from('audit_log').select('*').order('date', { ascending: false }).limit(200)
        if (data && data.length > 0) {
          rows = data
        }
      } catch {}
      // Merge with localStorage entries
      try {
        const local = JSON.parse(localStorage.getItem('audit_log') || '[]')
        const combined = [...local, ...rows]
        // Deduplicate by id
        const seen = new Set()
        rows = combined.filter(e => {
          if (seen.has(e.id)) return false
          seen.add(e.id)
          return true
        }).sort((a, b) => new Date(b.date) - new Date(a.date))
      } catch {}
    }

    setEntries(rows)
    setLoading(false)
  }

  useEffect(() => { loadAudit() }, [isDemoMode])

  const filtered = filterAction ? entries.filter(e => e.action === filterAction) : entries

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date', 'desc')

  const actionCounts = entries.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1
    return acc
  }, {})

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Journal d'audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
            {entries.length} entrée{entries.length > 1 ? 's' : ''} enregistrée{entries.length > 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-secondary" onClick={loadAudit}>
          ↻ Actualiser
        </button>
      </div>

      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          style={{
            fontSize: '.78rem', padding: '.28rem .7rem', borderRadius: 20,
            border: '1px solid var(--border)',
            background: !filterAction ? 'var(--primary)' : 'var(--surface)',
            color: !filterAction ? 'white' : 'var(--text-muted)',
            cursor: 'pointer', fontWeight: !filterAction ? 700 : 500,
          }}
          onClick={() => setFilterAction('')}
        >
          Tous ({entries.length})
        </button>
        {Object.entries(ACTION_TYPES).map(([key, cfg]) => {
          const count = actionCounts[key] || 0
          if (count === 0 && !isDemoMode) return null
          return (
            <button
              key={key}
              style={{
                fontSize: '.78rem', padding: '.28rem .7rem', borderRadius: 20,
                border: `1px solid ${cfg.color}44`,
                background: filterAction === key ? cfg.bg : 'var(--surface)',
                color: filterAction === key ? cfg.color : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: filterAction === key ? 700 : 500,
              }}
              onClick={() => setFilterAction(filterAction === key ? '' : key)}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr className="data-table-header">
                <SortableHeader label="Date" field="date" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Type" field="action" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Description" field="description" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="IP" field="ip" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sortedData.map(entry => (
                <tr key={entry.id} className="data-table-row">
                  <td style={{ whiteSpace: 'nowrap', fontSize: '.82rem', color: 'var(--text-muted)' }}>
                    {fmtDate(entry.date)}
                  </td>
                  <td><ActionBadge action={entry.action} /></td>
                  <td style={{ fontSize: '.85rem' }}>{entry.description}</td>
                  <td style={{ fontSize: '.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {entry.ip || '—'}
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Aucune entrée dans le journal
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
