import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'

const SECTIONS = [
  {
    key: 'clients',
    label: 'Clients',
    icon: '👥',
    color: '#6366f1',
    fetch: async (q) => {
      const { data } = await supabase.from('clients').select('id, name').ilike('name', `%${q}%`).limit(10)
      return (data || []).map(r => ({ ...r, subtitle: 'Client', path: `/clients/${r.id}` }))
    },
  },
  {
    key: 'transactions',
    label: 'Transactions',
    icon: '💼',
    color: '#f59e0b',
    fetch: async (q) => {
      const { data } = await supabase.from('transactions').select('id, name, phase, clients(name)').ilike('name', `%${q}%`).limit(10)
      return (data || []).map(r => ({ ...r, subtitle: r.clients?.name || 'Sans client', path: `/commerce/transactions/${r.id}` }))
    },
  },
  {
    key: 'projets',
    label: 'Projets',
    icon: '📁',
    color: '#0ea5e9',
    fetch: async (q) => {
      const { data } = await supabase.from('projets').select('id, name, statut, clients(name)').ilike('name', `%${q}%`).limit(10)
      return (data || []).map(r => ({ ...r, subtitle: r.clients?.name || 'Sans client', path: `/activite/projets` }))
    },
  },
  {
    key: 'saisies',
    label: 'Saisies de temps',
    icon: '⏱',
    color: '#16a34a',
    fetch: async (q) => {
      // Recherche dans le commentaire JSON (contient projet_name)
      const { data } = await supabase.from('saisies_temps').select('id, date, heures, commentaire').ilike('commentaire', `%${q}%`).limit(10)
      return (data || []).map(r => {
        let meta = {}
        try { meta = JSON.parse(r.commentaire || '{}') } catch {}
        return {
          ...r,
          name: meta.projet_name || '—',
          subtitle: new Date(r.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ` · ${r.heures}h`,
          path: `/activite/saisie`,
        }
      })
    },
  },
]

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) return
    setLoading(true)
    setResults({})
    Promise.all(
      SECTIONS.map(s => s.fetch(q).then(data => ({ key: s.key, data })))
    ).then(all => {
      const map = {}
      for (const { key, data } of all) map[key] = data
      setResults(map)
      setLoading(false)
    })
  }, [q])

  const total = Object.values(results).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Résultats de recherche</h1>
          <p>
            {q
              ? loading ? 'Recherche en cours...' : `${total} résultat${total > 1 ? 's' : ''} pour « ${q} »`
              : 'Saisissez un terme dans la barre de recherche'}
          </p>
        </div>
      </div>

      {loading && <Spinner />}

      {!loading && q && total === 0 && (
        <p className="empty-state" style={{ marginTop: '3rem' }}>Aucun résultat pour « {q} ».</p>
      )}

      {!loading && SECTIONS.map(section => {
        const items = results[section.key] || []
        if (!items.length) return null
        return (
          <div key={section.key} className="search-section">
            <div className="search-section-header">
              <span className="search-section-icon" style={{ background: section.color + '22', color: section.color }}>{section.icon}</span>
              <h2 className="search-section-title">{section.label}</h2>
              <span className="search-section-count">{items.length}</span>
            </div>
            <div className="data-table">
              {items.map(item => (
                <div key={item.id} className="data-table-row" onClick={() => navigate(item.path)}>
                  <span className="data-table-name">
                    <span style={{ marginRight: '.5rem' }}>{section.icon}</span>{item.name}
                  </span>
                  <span className="data-table-sub">{item.subtitle}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
