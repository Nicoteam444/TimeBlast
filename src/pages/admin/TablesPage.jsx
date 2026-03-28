import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TABLES = [
  { id: 'profiles',       label: 'Profiles (utilisateurs)', icon: '👥' },
  { id: 'societes',       label: 'Sociétés',                icon: '🏢' },
  { id: 'groupes',        label: 'Groupes',                 icon: '🏛' },
  { id: 'clients',        label: 'Clients',                 icon: '👤' },
  { id: 'contacts',       label: 'Contacts CRM',            icon: '📇' },
  { id: 'transactions',   label: 'Transactions',            icon: '💼' },
  { id: 'produits',       label: 'Produits',                icon: '🏷️' },
  { id: 'abonnements',    label: 'Abonnements',             icon: '🔄' },
  { id: 'achats',         label: 'Achats',                  icon: '🛒' },
  { id: 'stocks',         label: 'Stock',                   icon: '📦' },
  { id: 'factures',       label: 'Factures',                icon: '🧾' },
  { id: 'ecritures',      label: 'Écritures comptables',    icon: '📒' },
  { id: 'projets',        label: 'Projets',                 icon: '📁' },
  { id: 'lots',           label: 'Lots',                    icon: '📂' },
  { id: 'saisies_temps',  label: 'Saisies temps',           icon: '⏱' },
  { id: 'absences',       label: 'Absences',                icon: '🏖' },
  { id: 'notes_de_frais', label: 'Notes de frais',          icon: '🧾' },
  { id: 'leads',          label: 'Leads',                   icon: '🚀' },
  { id: 'entreprises',    label: 'Entreprises CRM',         icon: '🏢' },
  { id: 'devis',          label: 'Devis',                   icon: '📝' },
  { id: 'immobilisations',label: 'Immobilisations',         icon: '🏗' },
  { id: 'audit_log',      label: 'Journal d\'audit',        icon: '📋' },
  { id: 'integrations',   label: 'Intégrations',            icon: '🔌' },
]

export default function TablesPage() {
  const [selected, setSelected] = useState(null)
  const [data, setData] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const pageSize = 50

  async function loadTable(tableId) {
    setSelected(tableId)
    setLoading(true)
    setError(null)
    setPage(1)
    setSearch('')

    // Count
    const { count: cnt } = await supabase.from(tableId).select('*', { count: 'exact', head: true })
    setCount(cnt || 0)

    // First page
    const { data: rows, error: err } = await supabase
      .from(tableId)
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1)

    if (err) {
      // Try without ordering
      const { data: rows2, error: err2 } = await supabase.from(tableId).select('*').range(0, pageSize - 1)
      if (err2) { setError(err2.message); setLoading(false); return }
      setData(rows2 || [])
      setColumns(rows2?.length > 0 ? Object.keys(rows2[0]) : [])
    } else {
      setData(rows || [])
      setColumns(rows?.length > 0 ? Object.keys(rows[0]) : [])
    }
    setLoading(false)
  }

  async function loadPage(p) {
    if (!selected) return
    setLoading(true)
    const from = (p - 1) * pageSize
    const { data: rows } = await supabase
      .from(selected)
      .select('*')
      .range(from, from + pageSize - 1)
    setData(rows || [])
    setPage(p)
    setLoading(false)
  }

  function exportCSV() {
    if (!data.length || !columns.length) return
    const header = columns.join(';')
    const rows = data.map(r => columns.map(c => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v).replace(/;/g, ',')
    }).join(';'))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_${selected}_page${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(count / pageSize)
  const filteredTables = TABLES.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search.toLowerCase())
  )

  function formatCell(val) {
    if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>null</span>
    if (typeof val === 'boolean') return val ? '✅' : '❌'
    if (typeof val === 'object') return <code style={{ fontSize: '.72rem' }}>{JSON.stringify(val).slice(0, 60)}</code>
    const s = String(val)
    if (s.length > 80) return s.slice(0, 77) + '…'
    return s
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>🗄 Explorateur de tables</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            Visualisez le contenu de toutes les tables de la base de données.
          </p>
        </div>
        {selected && (
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn-secondary" onClick={exportCSV}>📥 Exporter CSV</button>
            <button className="btn-secondary" onClick={() => { setSelected(null); setData([]); setColumns([]) }}>← Toutes les tables</button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* ── Liste des tables ── */}
      {!selected && (
        <>
          <input
            className="table-search"
            type="text"
            placeholder="🔍 Rechercher une table..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '1rem', maxWidth: 400 }}
          />
          <div className="tables-grid">
            {filteredTables.map(t => (
              <div key={t.id} className="tables-card" onClick={() => loadTable(t.id)}>
                <span className="tables-card-icon">{t.icon}</span>
                <div>
                  <strong>{t.label}</strong>
                  <code className="tables-card-id">{t.id}</code>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Données de la table ── */}
      {selected && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{TABLES.find(t => t.id === selected)?.icon} {selected}</h2>
            <span className="status-badge" style={{ color: '#0F4C75', background: '#eef6fb', fontWeight: 600 }}>
              {count} lignes
            </span>
            <span className="status-badge" style={{ color: '#64748b', background: '#f1f5f9' }}>
              {columns.length} colonnes
            </span>
          </div>

          {loading ? (
            <div className="loading-inline">Chargement...</div>
          ) : (
            <div className="users-table-wrapper" style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="users-table" style={{ fontSize: '.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    {columns.map(c => (
                      <th key={c} style={{ whiteSpace: 'nowrap' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{(page - 1) * pageSize + i + 1}</td>
                      {columns.map(c => (
                        <td key={c} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formatCell(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Table vide</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="table-pagination" style={{ marginTop: '1rem' }}>
              <button className="btn-secondary" disabled={page === 1} onClick={() => loadPage(page - 1)}>← Précédent</button>
              <span>Page {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page === totalPages} onClick={() => loadPage(page + 1)}>Suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
