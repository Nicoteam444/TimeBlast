import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppearance } from '../../contexts/AppearanceContext'

// ── Onglet Affichage ─────────────────────────────────────────
function AffichageTab() {
  const { settings, update, updateAndSave, reset, COLOR_FIELDS } = useAppearance()
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

      {/* 5 couleurs personnalisables */}
      <div className="param-section">
        <div className="param-section-header">
          <h2>🎨 Couleurs de l'interface</h2>
          <p>Personnalisez les couleurs de votre espace. Les changements sont sauvegardés automatiquement.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {(COLOR_FIELDS || []).map(field => (
            <div key={field.key} style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <label style={{
                width: 44, height: 44, borderRadius: 8, cursor: 'pointer',
                border: '2px solid var(--border)',
                background: settings[field.key] || '#ccc',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <input
                  type="color"
                  value={settings[field.key] || '#195C82'}
                  onChange={e => updateAndSave({ [field.key]: e.target.value })}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </label>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text)' }}>{field.label}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{field.desc}</div>
                <div style={{ fontSize: '.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '.15rem' }}>
                  {settings[field.key] || '#---'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem' }}>
          <button className="param-chip" onClick={() => updateAndSave({
            menuColor: '#195C82', accentColor: '#1D9BF0', titleColor: '#0D1B24', surfaceColor: '#FFFFFF', bgColor: '#F0F0F0'
          })}>
            Restaurer les couleurs par défaut
          </button>
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

      {/* Vérification des tiers */}
      <TiersVerificationBlock />

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

      {/* Marketplace */}
      <MarketplaceBlock />
    </div>
  )
}

// ── Marketplace d'intégrations ────────────────────────────────
const MARKETPLACE_APPS = [
  { id: 'sage', name: 'Sage', cat: 'Comptabilité', icon: '💚', color: '#00DC82', desc: 'Synchronisation plan comptable, écritures et factures', status: 'available' },
  { id: 'pennylane', name: 'Pennylane', cat: 'Comptabilité', icon: '💜', color: '#6C5CE7', desc: 'Import/export écritures comptables et rapprochement bancaire', status: 'available' },
  { id: 'quickbooks', name: 'QuickBooks', cat: 'Comptabilité', icon: '🟢', color: '#2CA01C', desc: 'Synchronisation bidirectionnelle factures et paiements', status: 'available' },
  { id: 'cegid', name: 'Cegid', cat: 'Comptabilité', icon: '🔴', color: '#E74C3C', desc: 'Export FEC et synchronisation du plan comptable', status: 'available' },
  { id: 'stripe', name: 'Stripe', cat: 'Paiement', icon: '💳', color: '#635BFF', desc: 'Encaissements en ligne, webhooks et rapprochement automatique', status: 'available' },
  { id: 'gocardless', name: 'GoCardless', cat: 'Paiement', icon: '🏦', color: '#00B4D8', desc: 'Prélèvements SEPA et gestion des mandats', status: 'available' },
  { id: 'slack', name: 'Slack', cat: 'Communication', icon: '💬', color: '#4A154B', desc: 'Notifications en temps réel, alertes et commandes slash', status: 'available' },
  { id: 'teams', name: 'Microsoft Teams', cat: 'Communication', icon: '🟣', color: '#6264A7', desc: 'Notifications, réunions et synchronisation calendrier', status: 'coming' },
  { id: 'gmail', name: 'Gmail / Google', cat: 'Email', icon: '📧', color: '#EA4335', desc: 'Envoi d\'emails, import contacts et synchronisation agenda', status: 'available' },
  { id: 'outlook', name: 'Outlook 365', cat: 'Email', icon: '📬', color: '#0078D4', desc: 'Calendrier, contacts et emails bidirectionnels', status: 'coming' },
  { id: 'dropbox', name: 'Dropbox', cat: 'Stockage', icon: '📦', color: '#0061FF', desc: 'Stockage de documents, pièces jointes et partage', status: 'available' },
  { id: 'gdrive', name: 'Google Drive', cat: 'Stockage', icon: '📁', color: '#34A853', desc: 'Stockage cloud, import documents et OCR', status: 'available' },
  { id: 'onedrive', name: 'OneDrive', cat: 'Stockage', icon: '☁️', color: '#0078D4', desc: 'Synchronisation fichiers et archivage automatique', status: 'coming' },
  { id: 'zapier', name: 'Zapier', cat: 'Automatisation', icon: '⚡', color: '#FF4A00', desc: 'Connectez TimeBlast à 5000+ applications via Zaps', status: 'available' },
  { id: 'make', name: 'Make (Integromat)', cat: 'Automatisation', icon: '🔮', color: '#6D28D9', desc: 'Scénarios d\'automatisation visuels avancés', status: 'available' },
  { id: 'n8n', name: 'n8n', cat: 'Automatisation', icon: '🔗', color: '#EA4B71', desc: 'Workflows d\'automatisation open source et self-hosted', status: 'available' },
  { id: 'chorus', name: 'Chorus Pro', cat: 'E-Facture', icon: '🏛️', color: '#000091', desc: 'Transmission officielle des factures électroniques à l\'État', status: 'available' },
  { id: 'facturx', name: 'Factur-X', cat: 'E-Facture', icon: '📄', color: '#1E3A5F', desc: 'Génération et validation de factures au format Factur-X', status: 'available' },
  { id: 'bridge', name: 'Bridge (Bankin)', cat: 'Banque', icon: '🏧', color: '#00C853', desc: 'Agrégation bancaire, transactions temps réel et catégorisation', status: 'available' },
  { id: 'plaid', name: 'Plaid', cat: 'Banque', icon: '🟢', color: '#00D084', desc: 'Connexion bancaire sécurisée et vérification de comptes', status: 'coming' },
  { id: 'docusign', name: 'DocuSign', cat: 'Signature', icon: '✍️', color: '#FFCC00', desc: 'Signature électronique de devis, contrats et documents', status: 'available' },
  { id: 'yousign', name: 'Yousign', cat: 'Signature', icon: '🖊️', color: '#1B4F72', desc: 'Signature électronique conforme eIDAS', status: 'available' },
  { id: 'openai', name: 'OpenAI', cat: 'IA', icon: '🤖', color: '#10A37F', desc: 'Résumé automatique, extraction de données et assistant IA', status: 'available' },
  { id: 'anthropic', name: 'Claude (Anthropic)', cat: 'IA', icon: '🧠', color: '#D4A574', desc: 'Agent IA contextuel pour analyse et automatisation', status: 'available' },
]

const MARKETPLACE_CATS = ['Tous', 'Comptabilité', 'Paiement', 'Communication', 'Email', 'Stockage', 'Automatisation', 'E-Facture', 'Banque', 'Signature', 'IA']

function MarketplaceBlock() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tous')
  const [installed, setInstalled] = useState(new Set(['hubspot']))
  const [showConfig, setShowConfig] = useState(null)
  const [apiKey, setApiKey] = useState('')

  const filtered = MARKETPLACE_APPS.filter(app => {
    if (cat !== 'Tous' && app.cat !== cat) return false
    if (search && !app.name.toLowerCase().includes(search.toLowerCase()) && !app.desc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleInstall(appId) {
    setShowConfig(appId)
    setApiKey('')
  }

  function handleConnect() {
    if (showConfig) {
      setInstalled(prev => new Set([...prev, showConfig]))
      setShowConfig(null)
      setApiKey('')
    }
  }

  function handleDisconnect(appId) {
    setInstalled(prev => { const n = new Set(prev); n.delete(appId); return n })
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>🛒 Marketplace d'intégrations</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{MARKETPLACE_APPS.length} applications disponibles · {installed.size} connectée{installed.size > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une intégration..." style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13,
            width: 260, outline: 'none'
          }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {MARKETPLACE_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
              background: cat === c ? '#2B4C7E' : '#f1f5f9', color: cat === c ? '#fff' : '#475569',
              fontWeight: cat === c ? 600 : 400, transition: 'all .15s'
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grille apps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map(app => {
          const isInstalled = installed.has(app.id)
          const isComing = app.status === 'coming'
          return (
            <div key={app.id} style={{
              background: '#fff', borderRadius: 10, border: `1px solid ${isInstalled ? app.color + '40' : '#e2e8f0'}`,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
              opacity: isComing ? 0.65 : 1, transition: 'border-color .15s, box-shadow .15s',
              boxShadow: isInstalled ? `0 0 0 1px ${app.color}20` : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: app.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0
                }}>{app.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</span>
                    {isInstalled && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 600 }}>Connecté</span>}
                    {isComing && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>Bientôt</span>}
                  </div>
                  <div style={{ fontSize: 11, color: app.color, fontWeight: 500 }}>{app.cat}</div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5, flex: 1 }}>{app.desc}</p>
              <div>
                {isInstalled ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 12 }}>⚙️ Configurer</button>
                    <button onClick={() => handleDisconnect(app.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Déconnecter</button>
                  </div>
                ) : isComing ? (
                  <button disabled style={{ width: '100%', padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontSize: 12 }}>Disponible prochainement</button>
                ) : (
                  <button onClick={() => handleInstall(app.id)} style={{
                    width: '100%', padding: '6px 12px', borderRadius: 6, border: 'none',
                    background: app.color, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    transition: 'opacity .15s'
                  }}>+ Connecter</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <p>Aucune intégration trouvée</p>
        </div>
      )}

      {/* Modal de configuration */}
      {showConfig && (() => {
        const app = MARKETPLACE_APPS.find(a => a.id === showConfig)
        if (!app) return null
        return (
          <div className="modal-overlay" onClick={() => setShowConfig(null)}>
            <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: app.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>{app.icon}</div>
                  <div>
                    <h2 style={{ margin: 0 }}>Connecter {app.name}</h2>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{app.cat}</p>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setShowConfig(null)}>✕</button>
              </div>
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{app.desc}</p>
                <div className="field">
                  <label>Clé API / Token</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder={`Entrez votre clé API ${app.name}...`} autoFocus />
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>URL du webhook (optionnel)</label>
                  <input type="text" placeholder="https://..." />
                </div>
                <div style={{
                  marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 8,
                  border: '1px solid #bae6fd', fontSize: 12, color: '#0369a1'
                }}>
                  💡 Retrouvez votre clé API dans les paramètres de votre compte {app.name}.
                  Les données sont chiffrées et stockées de manière sécurisée.
                </div>
                <div className="modal-actions" style={{ justifyContent: 'flex-end', paddingTop: 16 }}>
                  <button className="btn-secondary" onClick={() => setShowConfig(null)}>Annuler</button>
                  <button className="btn-primary" onClick={handleConnect} disabled={!apiKey.trim()}
                    style={{ background: app.color }}>
                    ✓ Connecter {app.name}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function TiersVerificationBlock() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [enrichResult, setEnrichResult] = useState(null)
  const debounceRef = useRef(null)

  async function searchSirene(q) {
    if (!q.trim() || q.trim().length < 3) { setResults([]); return }
    setSearching(true); setSearchError(null)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=8`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) { setSearchError(e.message); setResults([]) }
    setSearching(false)
  }

  function handleInput(e) {
    setQuery(e.target.value); setEnrichResult(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchSirene(e.target.value), 400)
  }

  async function enrichClient(ent) {
    const nom = (ent.nom_complet || ent.nom_raison_sociale || '').toUpperCase()
    const siege = ent.siege || {}
    const ville = siege.libelle_commune || ''

    const { data: existing } = await supabase.from('clients').select('id, name').ilike('name', `%${nom}%`).limit(1)
    if (existing?.length > 0) {
      setEnrichResult({ type: 'exists', nom, siren: ent.siren, ville })
    } else {
      const { error } = await supabase.from('clients').insert({ name: nom, ville })
      if (error) { setEnrichResult({ type: 'error', message: error.message }) }
      else { setEnrichResult({ type: 'created', nom, siren: ent.siren, ville }) }
    }
  }

  const effectifMap = { '00':'0','01':'1-2','02':'3-5','03':'6-9','11':'10-19','12':'20-49','21':'50-99','22':'100-199','31':'200-249','32':'250-499','41':'500-999','42':'1000-1999','51':'2000-4999','52':'5000-9999','53':'10000+' }

  return (
    <div className="integration-card">
      <div className="integration-card-header">
        <div className="integration-logo">🏛</div>
        <div className="integration-info">
          <h2>Vérification des tiers</h2>
          <p>Recherche SIRENE — vérifiez la conformité et enrichissez vos clients</p>
        </div>
        <div className="integration-status">
          <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>API publique</span>
        </div>
      </div>

      <div style={{ padding: '0 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <input type="text" value={query} onChange={handleInput}
            placeholder="Rechercher par nom, SIREN ou SIRET..."
            style={{ flex: 1, padding: '.6rem .85rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.9rem', background: 'var(--bg)', color: 'var(--text)' }} />
          <button className="btn-primary" onClick={() => searchSirene(query)} disabled={searching || query.length < 3}>
            {searching ? '...' : '🔍 Rechercher'}
          </button>
        </div>

        {searchError && <p className="error" style={{ marginBottom: '.75rem' }}>Erreur : {searchError}</p>}

        {enrichResult && (
          <div style={{ padding: '.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
            background: enrichResult.type === 'created' ? '#f0fdf4' : enrichResult.type === 'exists' ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${enrichResult.type === 'created' ? '#86efac' : enrichResult.type === 'exists' ? '#fcd34d' : '#fca5a5'}`,
            fontSize: '.9rem',
          }}>
            {enrichResult.type === 'created' && <p style={{ color: '#166534' }}>✅ Client <strong>{enrichResult.nom}</strong> créé ! (SIREN : {enrichResult.siren})</p>}
            {enrichResult.type === 'exists' && <p style={{ color: '#92400e' }}>⚠ <strong>{enrichResult.nom}</strong> existe déjà dans votre base.</p>}
            {enrichResult.type === 'error' && <p style={{ color: '#dc2626' }}>❌ {enrichResult.message}</p>}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table className="users-table" style={{ margin: 0 }}>
              <thead><tr><th>Entreprise</th><th>SIREN</th><th>Ville</th><th>NAF</th><th>Effectif</th><th></th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.nom_complet || r.nom_raison_sociale || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--text-muted)' }}>{r.siren || '—'}</td>
                    <td style={{ fontSize: '.85rem' }}>{r.siege?.libelle_commune || '—'} {r.siege?.code_postal ? `(${r.siege.code_postal})` : ''}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{r.activite_principale || '—'}</td>
                    <td style={{ fontSize: '.82rem' }}>{effectifMap[r.tranche_effectif_salarie] || '—'}</td>
                    <td><button className="btn-primary" style={{ padding: '.25rem .65rem', fontSize: '.78rem' }} onClick={() => enrichClient(r)}>+ Ajouter</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onglet Base de données ─────────────────────────────────────
const DB_TABLES = [
  { name: 'projets',           label: 'Projets',            icon: '📁' },
  { name: 'kanban_tasks',      label: 'Taches Kanban',      icon: '✅' },
  { name: 'kanban_columns',    label: 'Colonnes Kanban',    icon: '📋' },
  { name: 'contacts',          label: 'Contacts',           icon: '👤' },
  { name: 'clients',           label: 'Clients',            icon: '👥' },
  { name: 'transactions',      label: 'Opportunites',       icon: '💼' },
  { name: 'factures',          label: 'Factures',           icon: '🧾' },
  { name: 'achats',            label: 'Achats',             icon: '📥' },
  { name: 'campagnes',         label: 'Campagnes',          icon: '📣' },
  { name: 'documents_archive', label: 'Documents',          icon: '📁' },
  { name: 'saisies_temps',     label: 'Saisies temps',      icon: '⏱️' },
  { name: 'profiles',          label: 'Utilisateurs',       icon: '🔑' },
  { name: 'societes',          label: 'Societes',           icon: '🏢' },
  { name: 'leads',             label: 'Leads',              icon: '🚀' },
  { name: 'user_favorites',    label: 'Favoris',            icon: '⭐' },
  { name: 'lots',              label: 'Lots',               icon: '📦' },
  { name: 'devis',             label: 'Devis',              icon: '📝' },
  { name: 'produits',          label: 'Produits',           icon: '🏷️' },
  { name: 'abonnements',       label: 'Abonnements',        icon: '🔄' },
]

function BaseDeDonneesTab() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRows, setTotalRows] = useState(0)
  const [expandedTable, setExpandedTable] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState({})

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    setLoading(true)
    const results = []
    for (const table of DB_TABLES) {
      try {
        const { count, error } = await supabase.from(table.name).select('*', { count: 'exact', head: true })
        results.push({ ...table, count: error ? '—' : (count || 0), error: error ? error.message : null })
      } catch {
        results.push({ ...table, count: '—', error: 'Table introuvable' })
      }
    }
    setStats(results)
    setTotalRows(results.reduce((s, r) => s + (typeof r.count === 'number' ? r.count : 0), 0))
    setLoading(false)
  }

  async function toggleDetail(tableName) {
    if (expandedTable === tableName) { setExpandedTable(null); return }
    setExpandedTable(tableName)
    if (detailData[tableName]) return // déjà chargé
    setDetailLoading(true)
    const { data: socs } = await supabase.from('societes').select('id, name').order('name')
    const bySociete = {}
    const isKanban = ['kanban_tasks', 'kanban_columns'].includes(tableName)
    const noSociete = ['profiles', 'societes', 'user_favorites'].includes(tableName)
    if (!noSociete && socs) {
      for (const soc of socs) {
        if (isKanban) {
          const { data: projIds } = await supabase.from('projets').select('id').eq('societe_id', soc.id)
          if (projIds?.length) {
            const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true }).in('projet_id', projIds.map(p => p.id))
            if (count > 0) bySociete[soc.name] = count
          }
        } else {
          const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('societe_id', soc.id)
          if (count > 0) bySociete[soc.name] = count
        }
      }
    }
    // Compter les sans société
    if (!noSociete && !isKanban) {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true }).is('societe_id', null)
      if (count > 0) bySociete['(Sans societe)'] = count
    }
    setDetailData(prev => ({ ...prev, [tableName]: bySociete }))
    setDetailLoading(false)
  }

  return (
    <div className="param-sections">
      <div className="param-section">
        <div className="param-section-header">
          <h2>Volumetrie de la base de donnees</h2>
          <p>Nombre d'enregistrements par table</p>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--hover-bg, #f1f5f9)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tables</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.filter(s => typeof s.count === 'number').length}</div>
          </div>
          <div style={{ background: 'var(--hover-bg, #f1f5f9)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total enregistrements</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{totalRows.toLocaleString('fr-FR')}</div>
          </div>
          <div style={{ background: 'var(--hover-bg, #f1f5f9)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tables vides</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.filter(s => s.count === 0).length > 0 ? '#f59e0b' : '#16a34a' }}>
              {stats.filter(s => s.count === 0).length}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-inline">Chargement...</div> : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.sort((a, b) => (typeof b.count === 'number' ? b.count : -1) - (typeof a.count === 'number' ? a.count : -1)).map(s => (
                  <React.Fragment key={s.name}>
                    <tr
                      style={{ cursor: 'pointer', background: expandedTable === s.name ? 'var(--hover-bg, #f8fafc)' : undefined }}
                      onClick={() => toggleDetail(s.name)}
                    >
                      <td>
                        <div className="user-cell">
                          <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                          <div>
                            <span className="user-name">{s.label}</span>
                            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: s.count > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                        {typeof s.count === 'number' ? s.count.toLocaleString('fr-FR') : s.count}
                        <span style={{ marginLeft: '.5rem', fontSize: '.7rem', color: 'var(--text-muted)' }}>
                          {expandedTable === s.name ? '▲' : '▼'}
                        </span>
                      </td>
                      <td>
                        {s.error ? (
                          <span className="status-badge" style={{ color: '#dc2626', background: '#fef2f2' }}>Erreur</span>
                        ) : s.count === 0 ? (
                          <span className="status-badge" style={{ color: '#f59e0b', background: '#fffbeb' }}>Vide</span>
                        ) : (
                          <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>OK</span>
                        )}
                      </td>
                    </tr>
                    {expandedTable === s.name && (
                      <tr>
                        <td colSpan={3} style={{ padding: 0 }}>
                          <div style={{ background: 'var(--hover-bg, #f8fafc)', padding: '.75rem 1rem .75rem 3rem', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                            {detailLoading ? (
                              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Chargement...</span>
                            ) : detailData[s.name] && Object.keys(detailData[s.name]).length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                                {Object.entries(detailData[s.name]).sort((a, b) => b[1] - a[1]).map(([socName, cnt]) => (
                                  <div key={socName} style={{
                                    display: 'flex', alignItems: 'center', gap: '.4rem',
                                    padding: '.3rem .65rem', borderRadius: 6,
                                    background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)',
                                    fontSize: '.8rem',
                                  }}>
                                    <span style={{ fontWeight: 500 }}>{socName}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{cnt.toLocaleString('fr-FR')}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Pas de ventilation par societe</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={fetchStats} className="btn-secondary" style={{ marginTop: '1rem' }}>
          🔄 Rafraichir
        </button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
// ── Onglet Flux Métier ──────────────────────────────────────
function FluxMetierTab() {
  const navigate = React.useCallback((path) => {
    window.location.href = path
  }, [])

  const B = '#2B4C7E'
  const GREY = '#94a3b8'

  // Étapes du processus complet lead → encaissement
  const steps = [
    // Ligne 1 : Acquisition
    { id: 'lead', label: 'Réception Lead', sub: 'Marketing', route: '/crm/leads', available: true, x: 60, y: 60 },
    { id: 'contact', label: 'Qualification Contact', sub: 'CRM', route: '/crm/contacts', available: true, x: 240, y: 60 },
    { id: 'entreprise', label: 'Fiche Entreprise', sub: 'CRM', route: '/crm/entreprises', available: true, x: 420, y: 60 },
    // Ligne 2 : Commercial
    { id: 'opportunite', label: 'Opportunité', sub: 'Commerce', route: '/commerce/transactions', available: true, x: 60, y: 160 },
    { id: 'devis', label: 'Devis', sub: 'Commerce', route: '/commerce/devis', available: true, x: 240, y: 160 },
    { id: 'client', label: 'Création Client', sub: 'Commerce', route: '/commerce/clients', available: true, x: 420, y: 160 },
    // Ligne 3 : Production
    { id: 'projet', label: 'Projet', sub: 'Activité', route: '/activite/projets', available: true, x: 60, y: 260 },
    { id: 'planif', label: 'Planification', sub: 'Activité', route: '/activite/planification', available: true, x: 240, y: 260 },
    { id: 'temps', label: 'Saisie des temps', sub: 'Calendrier', route: '/activite/saisie', available: true, x: 420, y: 260 },
    // Ligne 4 : Facturation & Encaissement
    { id: 'facture', label: 'Facturation', sub: 'Gestion', route: '/finance/facturation', available: true, x: 60, y: 360 },
    { id: 'envoi', label: 'Envoi e-facture', sub: 'Gestion', route: '/finance/facturation', available: true, x: 240, y: 360 },
    { id: 'encaissement', label: 'Encaissement', sub: 'Finance', route: '/gestion/transactions', available: true, x: 420, y: 360 },
    // Ligne 5 : Suivi & Analyse
    { id: 'rapproch', label: 'Rapprochement', sub: 'Finance', route: '/finance/rapprochement', available: true, x: 60, y: 460 },
    { id: 'compta', label: 'Comptabilité', sub: 'Finance', route: '/finance/business-intelligence', available: true, x: 240, y: 460 },
    { id: 'reporting', label: 'Reporting', sub: 'Activité', route: '/activite/reporting', available: true, x: 420, y: 460 },
  ]

  // Flux parallèles (non linéaires)
  const sideSteps = [
    { id: 'campagne', label: 'Campagne Marketing', sub: 'Marketing', route: '/marketing/campagnes', available: true, x: 600, y: 60 },
    { id: 'produits', label: 'Catalogue Produits', sub: 'Commerce', route: '/commerce/produits', available: true, x: 600, y: 160 },
    { id: 'achats', label: 'Achats Fournisseurs', sub: 'Gestion', route: '/gestion/achats', available: true, x: 600, y: 260 },
    { id: 'notes', label: 'Notes de frais', sub: 'Équipe', route: '/equipe/notes-de-frais', available: true, x: 600, y: 360 },
    { id: 'absences', label: 'Absences / Congés', sub: 'Équipe', route: '/activite/absences', available: true, x: 600, y: 460 },
  ]

  // Flèches principales (chaîne de valeur)
  const arrows = [
    ['lead', 'contact'], ['contact', 'entreprise'],
    ['entreprise', 'opportunite'], ['opportunite', 'devis'], ['devis', 'client'],
    ['client', 'projet'], ['projet', 'planif'], ['planif', 'temps'],
    ['temps', 'facture'], ['facture', 'envoi'], ['envoi', 'encaissement'],
    ['encaissement', 'rapproch'], ['rapproch', 'compta'], ['compta', 'reporting'],
  ]

  // Flèches latérales
  const sideArrows = [
    ['campagne', 'lead'], ['produits', 'devis'], ['achats', 'compta'], ['notes', 'compta'],
  ]

  const allSteps = [...steps, ...sideSteps]
  const stepMap = Object.fromEntries(allSteps.map(s => [s.id, s]))

  const W = 130, H = 52

  return (
    <div className="param-sections">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🔄 Flux métier — Du lead à l'encaissement</h2>
        <p style={{ color: '#64748b', fontSize: '.85rem', margin: '.25rem 0 0' }}>
          Cliquez sur une étape pour accéder à la page correspondante.
          <span style={{ marginLeft: 12, color: B, fontWeight: 600 }}>● Disponible</span>
          <span style={{ marginLeft: 12, color: GREY, fontWeight: 600 }}>● Bientôt</span>
        </p>
      </div>

      <div style={{ overflowX: 'auto', padding: '0 0 16px' }}>
        <svg viewBox="0 0 750 520" style={{ width: '100%', minWidth: 700, height: 'auto' }}>
          <defs>
            <marker id="arrowB" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill={B} />
            </marker>
            <marker id="arrowG" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill={GREY} />
            </marker>
            <filter id="cardSh"><feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.08" /></filter>
            <filter id="bGlow2"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* Labels de phases */}
          {[
            { y: 40, label: '1. ACQUISITION', color: '#0ea5e9' },
            { y: 140, label: '2. COMMERCIAL', color: '#8b5cf6' },
            { y: 240, label: '3. PRODUCTION', color: '#16a34a' },
            { y: 340, label: '4. FACTURATION', color: '#f59e0b' },
            { y: 440, label: '5. ANALYSE', color: '#ef4444' },
          ].map(p => (
            <text key={p.label} x={8} y={p.y} fill={p.color} fontSize="7" fontWeight="700" opacity="0.6" letterSpacing="0.5">{p.label}</text>
          ))}

          {/* Flèches principales */}
          {arrows.map(([from, to], i) => {
            const s = stepMap[from], e = stepMap[to]
            if (!s || !e) return null
            const sx = s.x + W / 2, sy = s.y + H / 2
            const ex = e.x + W / 2, ey = e.y + H / 2
            // Ajuster les points de départ/arrivée
            let x1 = sx, y1 = sy, x2 = ex, y2 = ey
            if (Math.abs(ex - sx) > Math.abs(ey - sy)) {
              x1 = sx + (ex > sx ? W / 2 + 4 : -W / 2 - 4); x2 = ex + (ex > sx ? -W / 2 - 4 : W / 2 + 4); y1 = sy; y2 = ey
            } else {
              y1 = sy + (ey > sy ? H / 2 + 4 : -H / 2 - 4); y2 = ey + (ey > sy ? -H / 2 - 4 : H / 2 + 4); x1 = sx; x2 = ex
            }
            const avail = s.available && e.available
            return (
              <g key={`arr-${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={avail ? B : GREY} strokeWidth="1.5" opacity={avail ? 0.3 : 0.15} markerEnd={avail ? 'url(#arrowB)' : 'url(#arrowG)'} />
                {avail && (
                  <circle r="3" fill={B} filter="url(#bGlow2)" opacity="0.8">
                    <animate attributeName="cx" values={`${x1};${x2}`} dur={`${2 + (i % 3) * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} />
                    <animate attributeName="cy" values={`${y1};${y2}`} dur={`${2 + (i % 3) * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} />
                  </circle>
                )}
              </g>
            )
          })}

          {/* Flèches latérales */}
          {sideArrows.map(([from, to], i) => {
            const s = stepMap[from], e = stepMap[to]
            if (!s || !e) return null
            const x1 = s.x, y1 = s.y + H / 2
            const x2 = e.x + W + 4, y2 = e.y + H / 2
            return <line key={`side-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={B} strokeWidth="1" opacity="0.15" strokeDasharray="4 4" markerEnd="url(#arrowB)" />
          })}

          {/* Label colonne latérale */}
          <text x={600 + W / 2} y={40} textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="700" letterSpacing="0.5">FLUX PARALLELES</text>

          {/* Cartes étapes */}
          {allSteps.map(step => {
            const color = step.available ? B : GREY
            return (
              <g key={step.id} style={{ cursor: step.available ? 'pointer' : 'default' }} onClick={() => step.available && navigate(step.route)}>
                <rect x={step.x} y={step.y} width={W} height={H} rx={8} fill="#fff" stroke={color} strokeWidth={step.available ? 1.5 : 1} filter="url(#cardSh)" />
                {step.available && <rect x={step.x} y={step.y} width={4} height={H} rx="2 0 0 2" fill={color} />}
                <text x={step.x + W / 2} y={step.y + 20} textAnchor="middle" fill={step.available ? '#1a2332' : '#94a3b8'} fontSize="8" fontWeight="700">{step.label}</text>
                <text x={step.x + W / 2} y={step.y + 34} textAnchor="middle" fill={step.available ? '#64748b' : '#cbd5e1'} fontSize="6.5" fontWeight="500">{step.sub}</text>
                {step.available && <circle cx={step.x + W - 10} cy={step.y + 10} r="3" fill={B} opacity="0.5" />}
                {!step.available && <circle cx={step.x + W - 10} cy={step.y + 10} r="3" fill={GREY} opacity="0.3" />}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'affichage',     label: 'Affichage',     icon: '🎨' },
  { id: 'flux',          label: 'Flux métier',    icon: '🔄' },
  { id: 'integrations',  label: 'Intégrations',  icon: '🔗' },
  { id: 'bdd',           label: 'Base de données', icon: '🗄️' },
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
      {tab === 'flux'          && <FluxMetierTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'bdd'          && <BaseDeDonneesTab />}
    </div>
  )
}
