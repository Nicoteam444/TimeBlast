import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

// ── Recherche tiers via API publique ──
function TiersVerification() {
  const { selectedSociete } = useSociete()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [enrichResult, setEnrichResult] = useState(null)
  const debounce = useRef(null)

  async function searchSirene(q) {
    if (!q.trim() || q.trim().length < 3) { setResults([]); return }
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=8`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) {
      setSearchError(e.message)
      setResults([])
    }
    setSearching(false)
  }

  function handleInput(e) {
    const v = e.target.value
    setQuery(v)
    setEnrichResult(null)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => searchSirene(v), 400)
  }

  async function enrichClient(entreprise) {
    const siren = entreprise.siren
    const nom = entreprise.nom_complet || entreprise.nom_raison_sociale || '—'
    const siege = entreprise.siege || {}
    const ville = siege.libelle_commune || ''
    const adresse = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' ')
    const codePostal = siege.code_postal || ''
    const naf = entreprise.activite_principale || ''
    const tranche = entreprise.tranche_effectif_salarie || ''

    // Vérifier si le client existe déjà
    const { data: existing } = await supabase.from('clients').select('id, name').ilike('name', `%${nom}%`).limit(1)

    if (existing?.length > 0) {
      setEnrichResult({ type: 'exists', client: existing[0], entreprise: { nom, siren, ville, adresse, codePostal, naf, tranche } })
    } else {
      // Créer le client
      const { data, error } = await supabase.from('clients').insert({
        name: nom.toUpperCase(),
        ville,
        societe_id: selectedSociete?.id || null,
      }).select().single()

      if (error) {
        setEnrichResult({ type: 'error', message: error.message })
      } else {
        setEnrichResult({ type: 'created', client: data, entreprise: { nom, siren, ville, adresse, codePostal, naf, tranche } })
      }
    }
  }

  function fmtEffectif(tranche) {
    const map = { '00': '0', '01': '1-2', '02': '3-5', '03': '6-9', '11': '10-19', '12': '20-49', '21': '50-99', '22': '100-199', '31': '200-249', '32': '250-499', '41': '500-999', '42': '1000-1999', '51': '2000-4999', '52': '5000-9999', '53': '10000+' }
    return map[tranche] || tranche || '—'
  }

  return (
    <div className="integration-card">
      <div className="integration-card-header">
        <div className="integration-logo">🏛</div>
        <div className="integration-info">
          <h2>Vérification des tiers</h2>
          <p>Recherche via l'API publique SIRENE — vérifiez et enrichissez vos clients</p>
        </div>
        <div className="integration-status">
          <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>
            API publique
          </span>
        </div>
      </div>

      <div style={{ padding: '0 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Rechercher par nom d'entreprise, SIREN ou SIRET..."
            style={{ flex: 1, padding: '.6rem .85rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.9rem', background: 'var(--bg)', color: 'var(--text)' }}
          />
          <button className="btn-primary" onClick={() => searchSirene(query)} disabled={searching || query.length < 3}>
            {searching ? '...' : '🔍 Rechercher'}
          </button>
        </div>

        {searchError && <p className="error" style={{ marginBottom: '.75rem' }}>Erreur : {searchError}</p>}

        {enrichResult && (
          <div style={{ padding: '.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
            background: enrichResult.type === 'created' ? '#f0fdf4' : enrichResult.type === 'exists' ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${enrichResult.type === 'created' ? '#86efac' : enrichResult.type === 'exists' ? '#fcd34d' : '#fca5a5'}`,
          }}>
            {enrichResult.type === 'created' && (
              <p style={{ color: '#166534', fontSize: '.9rem' }}>
                ✅ Client <strong>{enrichResult.entreprise.nom}</strong> créé avec succès !
                <br /><span style={{ fontSize: '.82rem' }}>SIREN : {enrichResult.entreprise.siren} — {enrichResult.entreprise.ville} {enrichResult.entreprise.codePostal}</span>
              </p>
            )}
            {enrichResult.type === 'exists' && (
              <p style={{ color: '#92400e', fontSize: '.9rem' }}>
                ⚠ Le client <strong>{enrichResult.client.name}</strong> existe déjà dans votre base.
                <br /><span style={{ fontSize: '.82rem' }}>SIREN : {enrichResult.entreprise.siren} — {enrichResult.entreprise.ville}</span>
              </p>
            )}
            {enrichResult.type === 'error' && (
              <p style={{ color: '#dc2626', fontSize: '.9rem' }}>❌ Erreur : {enrichResult.message}</p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table className="users-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>SIREN</th>
                  <th>Ville</th>
                  <th>NAF</th>
                  <th>Effectif</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const siege = r.siege || {}
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.nom_complet || r.nom_raison_sociale || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--text-muted)' }}>{r.siren || '—'}</td>
                      <td style={{ fontSize: '.85rem' }}>{siege.libelle_commune || '—'} {siege.code_postal ? `(${siege.code_postal})` : ''}</td>
                      <td style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{r.activite_principale || '—'}</td>
                      <td style={{ fontSize: '.82rem' }}>{fmtEffectif(r.tranche_effectif_salarie)}</td>
                      <td>
                        <button className="btn-primary" style={{ padding: '.25rem .65rem', fontSize: '.78rem' }}
                          onClick={() => enrichClient(r)}>
                          + Ajouter client
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!searching && results.length === 0 && query.length >= 3 && !searchError && (
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem' }}>
            Aucun résultat trouvé pour « {query} »
          </p>
        )}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [hubspot, setHubspot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => { fetchIntegrations() }, [])

  useEffect(() => {
    if (syncing) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [syncing])

  async function fetchIntegrations() {
    setLoading(true)
    const { data } = await supabase.from('integrations').select('*').eq('id', 'hubspot').maybeSingle()
    setHubspot(data)
    setLoading(false)
  }

  async function handleSync(action) {
    setSyncing(action)
    setResult(null)
    setError(null)

    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { action },
    })

    setSyncing(null)

    if (error || data?.error) {
      setError(data?.error || error.message)
    } else {
      setResult(data)
      fetchIntegrations()
    }
  }

  function formatDate(date) {
    if (!date) return 'Jamais'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function formatElapsed(s) {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Intégrations</h1>
          <p>Synchronisation avec vos outils externes</p>
        </div>
      </div>

      {/* HubSpot */}
      <div className="integration-card">
        <div className="integration-card-header">
          <div className="integration-logo">🟠</div>
          <div className="integration-info">
            <h2>HubSpot</h2>
            <p>Synchronisation des clients (companies) et transactions (deals)</p>
          </div>
          <div className="integration-status">
            <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>
              Connecté
            </span>
          </div>
        </div>

        <div className="integration-meta">
          Dernière synchro : <strong>{formatDate(hubspot?.last_sync_at)}</strong>
        </div>

        {/* Barre de progression pendant synchro */}
        {syncing && (
          <div className="sync-progress">
            <div className="sync-progress-header">
              <span>
                {syncing === 'sync_companies' ? '↓ Synchronisation des clients en cours...' : '↓ Synchronisation des transactions en cours...'}
              </span>
              <span className="sync-elapsed">{formatElapsed(elapsed)}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill progress-bar-fill--indeterminate" />
            </div>
          </div>
        )}

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        {result && !syncing && (
          <div className="sync-result">
            ✅ {result.synced} {result.type === 'companies' ? 'client(s)' : 'transaction(s)'} synchronisé(s) en {formatElapsed(elapsed)}
          </div>
        )}

        <div className="integration-actions">
          <button
            className="btn-primary"
            onClick={() => handleSync('sync_companies')}
            disabled={!!syncing}
          >
            ↓ Synchroniser les clients
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleSync('sync_deals')}
            disabled={!!syncing}
          >
            ↓ Synchroniser les transactions
          </button>
        </div>
      </div>

      {/* Vérification des tiers */}
      <TiersVerification />

      {/* Outlook - à venir */}
      <div className="integration-card integration-card--disabled">
        <div className="integration-card-header">
          <div className="integration-logo">📅</div>
          <div className="integration-info">
            <h2>Microsoft Outlook</h2>
            <p>Synchronisation bidirectionnelle du calendrier</p>
          </div>
          <div className="integration-status">
            <span className="status-badge" style={{ color: '#64748b', background: '#f8fafc' }}>
              Bientôt
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
