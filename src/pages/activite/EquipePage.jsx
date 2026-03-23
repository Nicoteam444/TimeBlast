import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

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

function SortIcon({ active, dir }) {
  if (!active) return <span className="sort-icon sort-icon--inactive">↕</span>
  return <span className="sort-icon sort-icon--active">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function EquipePage() {
  const navigate = useNavigate()
  const { selectedSociete } = useSociete()
  const [equipe, setEquipe]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterPoste, setFilterPoste] = useState('')
  const [sortKey, setSortKey]     = useState('nom')
  const [sortDir, setSortDir]     = useState('asc')
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(20)

  useEffect(() => {
    setPage(1)
    fetchEquipe()
  }, [selectedSociete?.id])

  async function fetchEquipe() {
    setLoading(true)
    let query = supabase.from('equipe').select('*')
    if (selectedSociete?.id) query = query.eq('societe_id', selectedSociete.id)
    const { data } = await query
    setEquipe(data || [])
    setLoading(false)
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const postes = useMemo(() => [...new Set(equipe.map(e => e.poste))].sort(), [equipe])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return equipe.filter(e => {
      const matchSearch = !q ||
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.poste.toLowerCase().includes(q)
      const matchPoste = !filterPoste || e.poste === filterPoste
      return matchSearch && matchPoste
    })
  }, [equipe, search, filterPoste])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb
      if (sortKey === 'anciennete') {
        va = calcAnciennete(a.date_embauche).months
        vb = calcAnciennete(b.date_embauche).months
        // Plus ancienne = plus petite date = plus grand nb de mois
        return sortDir === 'asc' ? vb - va : va - vb
      }
      va = (a[sortKey] || '').toLowerCase()
      vb = (b[sortKey] || '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

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
      'Comptable': '#8b5cf6', 'Contrôleur': '#8b5cf6',
    }
    for (const [k, v] of Object.entries(map)) {
      if (poste.includes(k)) return v
    }
    return '#64748b'
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Équipe</h1>
          <p>
            {filtered.length} collaborateur{filtered.length > 1 ? 's' : ''}
            {(search || filterPoste) ? ` sur ${equipe.length}` : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light, #eef2ff)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Rechercher nom, prénom, poste…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
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
        <div className="loading-inline">Chargement…</div>
      ) : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('nom')}>
                    Nom <SortIcon active={sortKey === 'nom'} dir={sortDir} />
                  </th>
                  <th className="sortable" onClick={() => handleSort('prenom')}>
                    Prénom <SortIcon active={sortKey === 'prenom'} dir={sortDir} />
                  </th>
                  <th className="sortable" onClick={() => handleSort('poste')}>
                    Poste <SortIcon active={sortKey === 'poste'} dir={sortDir} />
                  </th>
                  <th className="sortable" onClick={() => handleSort('anciennete')}>
                    Ancienneté <SortIcon active={sortKey === 'anciennete'} dir={sortDir} />
                  </th>
                  <th className="sortable" onClick={() => handleSort('date_naissance')}>
                    Date de naissance <SortIcon active={sortKey === 'date_naissance'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => {
                  const initials = `${e.prenom[0] || ''}${e.nom[0] || ''}`.toUpperCase()
                  const anc = calcAnciennete(e.date_embauche)
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
                        <span className="status-badge" style={{ color: avatarColor(e.poste), background: avatarColor(e.poste) + '18' }}>
                          {e.poste}
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
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
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
