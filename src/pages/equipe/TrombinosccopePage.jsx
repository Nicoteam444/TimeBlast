import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

function calcAnciennete(dateEmbauche) {
  if (!dateEmbauche) return '—'
  const d = new Date(dateEmbauche + 'T12:00:00')
  const now = new Date()
  const totalMonths = Math.floor((now - d) / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} mois`
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`
}

const POSTE_COLOR = {
  'Directeur':           '#1a5c82',
  'DSI':                 '#1a5c82',
  'DG':                  '#1a5c82',
  'PDG':                 '#0d1b24',
  'Chef de projet':      '#6366f1',
  'Directeur de projet': '#6366f1',
  'PMO':                 '#6366f1',
  'Responsable':         '#8b5cf6',
  'Manager':             '#8b5cf6',
  'Développeur':         '#16a34a',
  'Architecte':          '#16a34a',
  'Ingénieur':           '#16a34a',
  'Consultant':          '#f59e0b',
  'Analyste':            '#f59e0b',
  'Commercial':          '#0ea5e9',
  'Comptable':           '#8b5cf6',
  'Contrôleur':          '#8b5cf6',
}

function getColor(poste) {
  if (!poste) return '#64748b'
  for (const [k, v] of Object.entries(POSTE_COLOR)) {
    if (poste.includes(k)) return v
  }
  return '#64748b'
}

export default function TrombinosccopePage() {
  const { selectedSociete } = useSociete()
  const navigate = useNavigate()
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPoste, setFilterPoste] = useState('')
  const [view, setView] = useState('grid') // 'grid' | 'list'

  useEffect(() => {
    fetchEquipe()
  }, [selectedSociete?.id])

  async function fetchEquipe() {
    setLoading(true)
    let q = supabase.from('equipe').select('*').order('nom')
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data } = await q
    setEquipe(data || [])
    setLoading(false)
  }

  const postes = useMemo(() => [...new Set(equipe.map(e => e.poste).filter(Boolean))].sort(), [equipe])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return equipe.filter(e => {
      const matchSearch = !q ||
        (e.nom || '').toLowerCase().includes(q) ||
        (e.prenom || '').toLowerCase().includes(q) ||
        (e.poste || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      const matchPoste = !filterPoste || e.poste === filterPoste
      return matchSearch && matchPoste
    })
  }, [equipe, search, filterPoste])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Trombinoscope</h1>
          <p>
            {filtered.length} collaborateur{filtered.length > 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="table-toolbar">
        <input
          className="table-search"
          type="text"
          placeholder="Rechercher nom, prénom, poste…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="table-filter-select"
          value={filterPoste}
          onChange={e => setFilterPoste(e.target.value)}
        >
          <option value="">Tous les postes</option>
          {postes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.35rem' }}>
          <button
            className={view === 'grid' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => setView('grid')}
            title="Vue grille"
          >⊞ Grille</button>
          <button
            className={view === 'list' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => setView('list')}
            title="Vue liste"
          >☰ Liste</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-inline">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
          <p>Aucun collaborateur trouvé.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="trombi-grid">
          {filtered.map(e => {
            const color = getColor(e.poste)
            const initials = `${(e.prenom || '')[0] || ''}${(e.nom || '')[0] || ''}`.toUpperCase()
            const anc = calcAnciennete(e.date_embauche)
            return (
              <div key={e.id} className="trombi-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipe/collaborateurs/${e.id}`)}>
                <div className="trombi-avatar" style={{ background: color + '22', border: `2.5px solid ${color}` }}>
                  <span style={{ color, fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-.02em' }}>{initials || '?'}</span>
                </div>
                <div className="trombi-name">{e.prenom} {e.nom}</div>
                <div className="trombi-poste" style={{ color }}>
                  <span className="status-badge" style={{ color, background: color + '18', fontSize: '.72rem' }}>{e.poste || '—'}</span>
                </div>
                {e.email && (
                  <div className="trombi-email">
                    <a href={`mailto:${e.email}`} onClick={ev => ev.stopPropagation()}>{e.email}</a>
                  </div>
                )}
                {e.telephone && (
                  <div className="trombi-tel">📞 {e.telephone}</div>
                )}
                <div className="trombi-anc">🗓 {anc}</div>
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '.5rem', width: '100%' }}
                  onClick={ev => { ev.stopPropagation(); navigate(`/equipe/collaborateurs/${e.id}`) }}
                >→ Voir dossier</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Poste</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Ancienneté</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const color = getColor(e.poste)
                const initials = `${(e.prenom || '')[0] || ''}${(e.nom || '')[0] || ''}`.toUpperCase()
                const anc = calcAnciennete(e.date_embauche)
                return (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipe/collaborateurs/${e.id}`)}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar" style={{ background: color, fontSize: '.72rem' }}>{initials}</span>
                        <span className="user-name">{e.nom}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.prenom}</td>
                    <td>
                      <span className="status-badge" style={{ color, background: color + '18' }}>{e.poste || '—'}</span>
                    </td>
                    <td onClick={ev => ev.stopPropagation()}>{e.email ? <a href={`mailto:${e.email}`}>{e.email}</a> : '—'}</td>
                    <td>{e.telephone || '—'}</td>
                    <td className="date-cell">{anc}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
