import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

// Niveaux hiérarchiques selon le poste
const LEVELS = [
  { level: 0, label: 'Direction',      keywords: ['PDG', 'DG', 'Directeur général', 'Président'] },
  { level: 1, label: 'Direction métier', keywords: ['Directeur', 'DSI', 'DRH', 'DAF', 'DGA', 'Directrice'] },
  { level: 2, label: 'Management',     keywords: ['Chef de projet', 'Directeur de projet', 'Responsable', 'Manager', 'PMO', 'Lead'] },
  { level: 3, label: 'Experts',        keywords: ['Architecte', 'Expert', 'Senior', 'Référent'] },
  { level: 4, label: 'Collaborateurs', keywords: [] }, // fallback
]

const LEVEL_COLORS = ['#1a5c82', '#6366f1', '#8b5cf6', '#0ea5e9', '#64748b']

function getLevel(poste) {
  if (!poste) return 4
  for (const { level, keywords } of LEVELS) {
    if (keywords.some(k => poste.toLowerCase().includes(k.toLowerCase()))) return level
  }
  return 4
}

function getColor(poste) {
  return LEVEL_COLORS[getLevel(poste)]
}

function OrgNode({ person, color }) {
  const initials = `${(person.prenom || '')[0] || ''}${(person.nom || '')[0] || ''}`.toUpperCase()
  return (
    <div className="org-node">
      <div className="org-node-avatar" style={{ background: color + '20', border: `2.5px solid ${color}` }}>
        <span style={{ color, fontWeight: 700, fontSize: '1rem' }}>{initials}</span>
      </div>
      <div className="org-node-name">{person.prenom} {person.nom}</div>
      <div className="org-node-poste" style={{ color }}>
        <span style={{ background: color + '15', color, padding: '.1rem .5rem', borderRadius: 8, fontSize: '.68rem', fontWeight: 600 }}>
          {person.poste || '—'}
        </span>
      </div>
      {person.email && (
        <div className="org-node-email">
          <a href={`mailto:${person.email}`} onClick={e => e.stopPropagation()}>{person.email}</a>
        </div>
      )}
    </div>
  )
}

export default function OrganigrammePage() {
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')

  useEffect(() => {
    fetchEquipe()
  }, [])

  async function fetchEquipe() {
    setLoading(true)
    let q = supabase.from('equipe').select('*').order('nom')
    const { data } = await q
    setEquipe(data || [])
    setLoading(false)
  }

  // Grouper par niveau hiérarchique
  const byLevel = useMemo(() => {
    const groups = {}
    for (const e of equipe) {
      const lvl = getLevel(e.poste)
      if (!groups[lvl]) groups[lvl] = []
      groups[lvl].push(e)
    }
    return groups
  }, [equipe])

  const levelKeys = Object.keys(byLevel).map(Number).sort()

  // Postes uniques pour filtre
  const departements = useMemo(() => {
    const postes = [...new Set(equipe.map(e => e.poste).filter(Boolean))].sort()
    return postes
  }, [equipe])

  const filteredByLevel = useMemo(() => {
    if (!filterDept) return byLevel
    const filtered = {}
    for (const [k, arr] of Object.entries(byLevel)) {
      const f = arr.filter(e => e.poste === filterDept)
      if (f.length) filtered[k] = f
    }
    return filtered
  }, [byLevel, filterDept])

  const filteredLevelKeys = Object.keys(filteredByLevel).map(Number).sort()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Organigramme</h1>
          <p>
            {equipe.length} collaborateur{equipe.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="table-toolbar">
        <select
          className="table-filter-select"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          style={{ minWidth: 220 }}
        >
          <option value="">Tous les postes</option>
          {departements.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Légende des niveaux */}
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {LEVELS.map((l, i) => (
            <span key={l.level} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEVEL_COLORS[i], display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : equipe.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏢</div>
          <p>Aucun collaborateur dans l'équipe.</p>
        </div>
      ) : (
        <div className="org-chart">
          {filteredLevelKeys.map((lvl, idx) => {
            const members = filteredByLevel[lvl]
            const meta = LEVELS[lvl] || LEVELS[4]
            const color = LEVEL_COLORS[lvl] || '#64748b'
            return (
              <div key={lvl} className="org-level">
                {/* Connecteur vertical entre niveaux */}
                {idx > 0 && (
                  <div className="org-connector">
                    <div className="org-connector-line" style={{ borderColor: color + '55' }} />
                  </div>
                )}

                <div className="org-level-label" style={{ color }}>
                  <span className="org-level-badge" style={{ background: color + '15', borderColor: color + '30' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {meta.label}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {members.length}</span>
                  </span>
                </div>

                <div className="org-level-row">
                  {members.map(person => (
                    <OrgNode key={person.id} person={person} color={color} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
