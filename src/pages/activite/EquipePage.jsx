import { useState, useEffect, useMemo } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import { syncUsersToSupabase } from '../../lib/luccaClient'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

function calcAnciennete(dateEmbauche) {
  if (!dateEmbauche) return { label: '—', months: 0 }
  const d = new Date(dateEmbauche + 'T12:00:00')
  const now = new Date()
  const totalMonths = Math.floor((now - d) / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  let label
  if (years === 0) label = `${months} mois`
  else if (months === 0) label = `${years} an${years > 1 ? 's' : ''}`
  else label = `${years} an${years > 1 ? 's' : ''} ${months} mois`
  return { label, months: totalMonths }
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function EquipePage() {
  const navigate = useEnvNavigate()
  const [equipe, setEquipe]       = useState([])
  const [societes, setSocietes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterPoste, setFilterPoste] = useState('')
  const [filterSociete, setFilterSociete] = useState('')
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(20)
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    setPage(1)
    fetchEquipe()
    fetchSocietes()
  }, [])

  async function fetchEquipe() {
    setLoading(true)
    const { data } = await supabase.from('equipe').select('*, societes(id, name)')
    setEquipe(data || [])
    setLoading(false)
  }

  async function fetchSocietes() {
    const { data } = await supabase.from('societes').select('id, name').order('name')
    setSocietes(data || [])
  }

  const postes = useMemo(() => [...new Set(equipe.map(e => e.poste).filter(Boolean))].sort(), [equipe])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return equipe.filter(e => {
      const matchSearch = !q ||
        (e.nom || '').toLowerCase().includes(q) ||
        (e.prenom || '').toLowerCase().includes(q) ||
        (e.poste || '').toLowerCase().includes(q) ||
        (e.societes?.name || '').toLowerCase().includes(q)
      const matchPoste = !filterPoste || e.poste === filterPoste
      const matchSociete = !filterSociete || e.societe_id === filterSociete
      return matchSearch && matchPoste && matchSociete
    })
  }, [equipe, search, filterPoste, filterSociete])

  const { sortedData: sorted, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'nom')

  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize)

  // Couleur de pastille basée sur le poste
  function avatarColor(poste) {
    const map = {
      'Directeur': '#1a5c82', 'DSI': '#1a5c82',
      'Chef de projet': '#6366f1', 'Directeur de projet': '#6366f1', 'PMO': '#6366f1',
      'Développeur': '#16a34a', 'Architecte': '#16a34a', 'Ingénieur': '#16a34a',
      'Consultant': '#f59e0b', 'Analyste': '#f59e0b',
      'Commercial': '#0ea5e9', 'Responsable commercial': '#0ea5e9',
      'Comptable': '#8b5cf6', 'Contrôleur': '#8b5cf6'}
    for (const [k, v] of Object.entries(map)) {
      if ((poste || '').includes(k)) return v
    }
    return '#64748b'
  }

  // Couleur de pastille pour la société
  const SOCIETE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#dc2626', '#059669', '#d97706', '#6366f1', '#0ea5e9']
  function societeColor(societeId) {
    if (!societeId) return '#94a3b8'
    const idx = societes.findIndex(s => s.id === societeId)
    return SOCIETE_COLORS[idx % SOCIETE_COLORS.length] || '#94a3b8'
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Équipe</h1>
          <p>
            {filtered.length} collaborateur{filtered.length > 1 ? 's' : ''}
            {(search || filterPoste || filterSociete) ? ` sur ${equipe.length}` : ''}
          </p>
        </div>
        <button
          disabled={syncing}
          onClick={async () => {
            setSyncing(true); setSyncResult(null)
            try {
              const res = await syncUsersToSupabase()
              setSyncResult(res)
              fetchEquipe() // Recharger la liste
            } catch (err) {
              setSyncResult({ errors: [err.message] })
            } finally { setSyncing(false) }
          }}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: syncing ? 'wait' : 'pointer',
            background: '#0078D4', color: '#fff', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, opacity: syncing ? .6 : 1
          }}>
          {syncing ? '⟳ Synchronisation...' : '🔄 Sync Lucca'}
        </button>
      </div>
      {syncResult && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13,
          background: syncResult.errors?.length ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${syncResult.errors?.length ? '#fecaca' : '#bbf7d0'}`,
          color: syncResult.errors?.length ? '#991b1b' : '#166534'
        }}>
          {syncResult.created !== undefined && `✅ ${syncResult.created} créé(s), ${syncResult.updated} mis à jour. `}
          {syncResult.errors?.length > 0 && `⚠️ ${syncResult.errors.length} erreur(s): ${syncResult.errors[0]}`}
          <button onClick={() => setSyncResult(null)} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Rechercher nom, prénom, poste, société…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <select
          className="table-filter-select"
          value={filterSociete}
          onChange={e => { setFilterSociete(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les sociétés</option>
          {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="table-filter-select"
          value={filterPoste}
          onChange={e => { setFilterPoste(e.target.value); setPage(1) }}
        >
          <option value="">Tous les postes</option>
          {postes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
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

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Prénom" field="prenom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Société" field="societes.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Poste" field="poste" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Ancienneté" field="date_embauche" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Date de naissance" field="date_naissance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => {
                  const initials = `${(e.prenom || '')[0] || ''}${(e.nom || '')[0] || ''}`.toUpperCase()
                  const anc = calcAnciennete(e.date_embauche)
                  const sName = e.societes?.name || '—'
                  return (
                    <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipe/collaborateurs/${e.id}`)}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar" style={{ background: avatarColor(e.poste), fontSize: '.72rem' }}>
                            {initials}
                          </span>
                          <span className="user-name">{e.nom}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text)' }}>{e.prenom}</td>
                      <td>
                        <span className="status-badge" style={{
                          color: societeColor(e.societe_id),
                          background: societeColor(e.societe_id) + '15',
                          fontSize: '.78rem'
                        }}>
                          🏛 {sName}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: avatarColor(e.poste), background: avatarColor(e.poste) + '18' }}>
                          {e.poste || '—'}
                        </span>
                      </td>
                      <td className="date-cell">
                        <span title={fmtDate(e.date_embauche)}>{anc.label}</span>
                      </td>
                      <td className="date-cell">{fmtDate(e.date_naissance)}</td>
                    </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      Aucun collaborateur trouvé.
                    </td>
                  </tr>
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
      )}
    </div>
  )
}
