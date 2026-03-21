import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

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
