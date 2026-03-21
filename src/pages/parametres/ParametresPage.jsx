import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppearance } from '../../contexts/AppearanceContext'

// ── Onglet Affichage ─────────────────────────────────────────
function AffichageTab() {
  const { settings, update, reset } = useAppearance()
  const fileRef = useRef()

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert('Fichier trop lourd (max 500 Ko)'); return }
    const reader = new FileReader()
    reader.onload = ev => update({ logoUrl: ev.target.result })
    reader.readAsDataURL(file)
  }

  const ACCENTS = [
    { label: 'Bleu SRA',  value: '#1a5c82', tag: 'SRA' },
    { label: 'Indigo',    value: '#4f46e5' },
    { label: 'Violet',    value: '#7c3aed' },
    { label: 'Vert',      value: '#16a34a' },
    { label: 'Teal',      value: '#0d9488' },
    { label: 'Slate',     value: '#475569' },
    { label: 'Personnalisé', value: 'custom' },
  ]

  const isCustom = !ACCENTS.slice(0, -1).find(a => a.value === settings.accentColor)

  return (
    <div className="param-sections">

      {/* Thème */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Thème</h2>
          <p>Apparence générale de l'interface</p>
        </div>
        <div className="param-theme-row">
          {[
            { id: 'light', label: 'Clair', icon: '☀️' },
            { id: 'dark',  label: 'Sombre', icon: '🌙' },
          ].map(t => (
            <button
              key={t.id}
              className={`param-theme-btn ${settings.theme === t.id ? 'param-theme-btn--active' : ''}`}
              onClick={() => update({ theme: t.id })}
            >
              <span className="param-theme-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Taille du texte */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Taille du texte</h2>
          <p>Taille de base de la typographie</p>
        </div>
        <div className="param-font-row">
          {[
            { id: 'sm', label: 'Petite', sample: 'Aa' },
            { id: 'md', label: 'Normale', sample: 'Aa' },
            { id: 'lg', label: 'Grande', sample: 'Aa' },
          ].map(f => (
            <button
              key={f.id}
              className={`param-font-btn ${settings.fontSize === f.id ? 'param-font-btn--active' : ''}`}
              onClick={() => update({ fontSize: f.id })}
            >
              <span style={{ fontSize: f.id === 'sm' ? '1em' : f.id === 'lg' ? '1.5em' : '1.2em', fontWeight: 700 }}>{f.sample}</span>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Densité */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Densité des tableaux</h2>
          <p>Espacement entre les lignes</p>
        </div>
        <div className="param-density-row">
          {[
            { id: 'compact', label: 'Compacte' },
            { id: 'normal', label: 'Normale' },
            { id: 'comfortable', label: 'Aérée' },
          ].map(d => (
            <button
              key={d.id}
              className={`param-chip ${settings.density === d.id ? 'param-chip--active' : ''}`}
              onClick={() => update({ density: d.id })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur d'accent */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Couleur d'accentuation</h2>
          <p>Couleur principale des boutons et éléments actifs</p>
        </div>
        <div className="param-accent-row">
          {ACCENTS.slice(0, -1).map(a => (
            <div key={a.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem' }}>
              <button
                className={`param-accent-swatch ${settings.accentColor === a.value ? 'param-accent-swatch--active' : ''}`}
                style={{ background: a.value }}
                title={a.label}
                onClick={() => update({ accentColor: a.value })}
              />
              {a.tag && <span style={{ fontSize: '.65rem', fontWeight: 700, color: settings.accentColor === a.value ? 'var(--primary)' : 'var(--text-muted)', letterSpacing: '.04em' }}>{a.tag}</span>}
            </div>
          ))}
          <label className="param-accent-custom" title="Couleur personnalisée">
            <input type="color" value={isCustom ? settings.accentColor : '#1a5c82'}
              onChange={e => update({ accentColor: e.target.value })} />
            <span style={{ fontSize: '.75rem' }}>Autre…</span>
          </label>
        </div>
      </div>

      {/* Nom de la plateforme */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Nom de la plateforme</h2>
          <p>Affiché dans la barre latérale</p>
        </div>
        <input
          type="text"
          className="param-input"
          value={settings.platformName || ''}
          maxLength={32}
          placeholder="Ex : MonApp"
          onChange={e => update({ platformName: e.target.value })}
        />
      </div>

      {/* Logo */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>Icône / Logo</h2>
          <p>Affiché dans la barre latérale (max 500 Ko, PNG/SVG recommandé)</p>
        </div>
        <div className="param-logo-row">
          <div className="param-logo-preview">
            {settings.logoUrl
              ? <img src={settings.logoUrl} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8 }} />
              : <span style={{ fontSize: '2rem' }}>🖼</span>
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
              Choisir un fichier…
            </button>
            {settings.logoUrl && (
              <button className="btn-secondary" onClick={() => update({ logoUrl: null })}>
                Supprimer
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Reset */}
      <div className="param-section param-section--footer">
        <button className="btn-secondary" onClick={reset}>
          Réinitialiser les paramètres d'affichage
        </button>
      </div>
    </div>
  )
}

// ── Onglet Intégrations ───────────────────────────────────────
function IntegrationsTab() {
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
    const { data, error } = await supabase.functions.invoke('hubspot-sync', { body: { action } })
    setSyncing(null)
    if (error || data?.error) setError(data?.error || error.message)
    else { setResult(data); fetchIntegrations() }
  }

  function formatDate(date) {
    if (!date) return 'Jamais'
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  function formatElapsed(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s` }

  return (
    <div className="param-sections">
      <div className="integration-card">
        <div className="integration-card-header">
          <div className="integration-logo">🟠</div>
          <div className="integration-info">
            <h2>HubSpot</h2>
            <p>Synchronisation des clients (companies) et transactions (deals)</p>
          </div>
          <div className="integration-status">
            <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>Connecté</span>
          </div>
        </div>
        <div className="integration-meta">
          Dernière synchro : <strong>{formatDate(hubspot?.last_sync_at)}</strong>
        </div>
        {syncing && (
          <div className="sync-progress">
            <div className="sync-progress-header">
              <span>{syncing === 'sync_companies' ? '↓ Synchronisation des clients…' : '↓ Synchronisation des transactions…'}</span>
              <span className="sync-elapsed">{formatElapsed(elapsed)}</span>
            </div>
            <div className="progress-bar"><div className="progress-bar-fill progress-bar-fill--indeterminate" /></div>
          </div>
        )}
        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}
        {result && !syncing && (
          <div className="sync-result">✅ {result.synced} {result.type === 'companies' ? 'client(s)' : 'transaction(s)'} synchronisé(s)</div>
        )}
        <div className="integration-actions">
          <button className="btn-primary" onClick={() => handleSync('sync_companies')} disabled={!!syncing}>↓ Synchroniser les clients</button>
          <button className="btn-secondary" onClick={() => handleSync('sync_deals')} disabled={!!syncing}>↓ Synchroniser les transactions</button>
        </div>
      </div>

      <div className="integration-card integration-card--disabled">
        <div className="integration-card-header">
          <div className="integration-logo">📅</div>
          <div className="integration-info">
            <h2>Microsoft Outlook</h2>
            <p>Synchronisation bidirectionnelle du calendrier</p>
          </div>
          <div className="integration-status">
            <span className="status-badge" style={{ color: '#64748b', background: '#f8fafc' }}>Bientôt</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
const TABS = [
  { id: 'affichage',     label: 'Affichage',     icon: '🎨' },
  { id: 'integrations',  label: 'Intégrations',  icon: '🔗' },
]

export default function ParametresPage() {
  const [tab, setTab] = useState('affichage')

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Paramètres</h1>
      </div>

      <div className="param-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`param-tab ${tab === t.id ? 'param-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'affichage'    && <AffichageTab />}
      {tab === 'integrations' && <IntegrationsTab />}
    </div>
  )
}
