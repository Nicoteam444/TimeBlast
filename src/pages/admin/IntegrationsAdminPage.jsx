import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const INTEGRATIONS = [
  { id: 'hubspot',    name: 'HubSpot',         icon: '🟠', desc: 'Synchronisation contacts, entreprises et deals CRM.', category: 'CRM' },
  { id: 'outlook',    name: 'Microsoft Outlook', icon: '📧', desc: 'Calendrier, emails, synchronisation bidirectionnelle.', category: 'Communication' },
  { id: 'sirene',     name: 'API SIRENE',       icon: '🏛', desc: 'Vérification et enrichissement tiers via le registre national.', category: 'Data' },
  { id: 'sage',       name: 'Sage',             icon: '💚', desc: 'Import/export comptabilité, factures, écritures FEC.', category: 'Comptabilité' },
  { id: 'pennylane',  name: 'Pennylane',        icon: '💜', desc: 'Synchronisation plan comptable, factures, rapprochement.', category: 'Comptabilité' },
  { id: 'cegid',      name: 'Cegid',            icon: '🔴', desc: 'ERP, gestion financière, RH et paie.', category: 'ERP' },
  { id: 'stripe',     name: 'Stripe',           icon: '💳', desc: 'Paiements en ligne, abonnements, factures auto.', category: 'Finance' },
  { id: 'qonto',      name: 'Qonto',            icon: '🏦', desc: 'Rapprochement bancaire, flux de trésorerie.', category: 'Finance' },
  { id: 'slack',      name: 'Slack',            icon: '💬', desc: 'Notifications, alertes, commandes bot.', category: 'Communication' },
  { id: 'teams',      name: 'Microsoft Teams',  icon: '🟣', desc: 'Notifications, réunions, intégration calendrier.', category: 'Communication' },
  { id: 'gmail',      name: 'Gmail / SMTP',     icon: '📬', desc: 'Envoi emails transactionnels, notifications.', category: 'Communication' },
  { id: 'zapier',     name: 'Zapier',           icon: '⚡', desc: 'Automatisations no-code avec 5000+ apps.', category: 'Automatisation' },
  { id: 'make',       name: 'Make (Integromat)', icon: '🟪', desc: 'Scénarios d\'automatisation avancés.', category: 'Automatisation' },
  { id: 'chatgpt',    name: 'OpenAI / ChatGPT', icon: '🤖', desc: 'Enrichissement IA, analyse, résumés automatiques.', category: 'IA' },
  { id: 'claude',     name: 'Claude AI',        icon: '🧠', desc: 'Assistant intelligent, analyse de données, suggestions.', category: 'IA' },
  { id: 'gsheets',    name: 'Google Sheets',    icon: '📊', desc: 'Import/export, synchronisation tableaux.', category: 'Data' },
  { id: 'api_rest',   name: 'API REST custom',  icon: '🔗', desc: 'Connecteur générique pour vos APIs internes.', category: 'Data' },
  { id: 'leadbyte',   name: 'LeadByte',         icon: '🎯', desc: 'Plateforme de distribution de leads : campagnes, leads, acheteurs, ventes.', category: 'Lead Gen' },
  { id: 'dolibarr',   name: 'Dolibarr',         icon: '📘', desc: 'ERP/CRM : tiers, devis, factures, paiements.', category: 'ERP' },
  { id: 'google_ads', name: 'Google Ads',       icon: '🔴', desc: 'Campagnes publicitaires, dépenses, conversions.', category: 'Publicité' },
  { id: 'meta_ads',   name: 'Meta Ads',         icon: '🔵', desc: 'Facebook/Instagram Ads + Lead Ads forms.', category: 'Publicité' },
]

const STATUS_MAP = {
  connected:    { label: 'Connecté',      color: '#16a34a', bg: '#f0fdf4', dot: '🟢' },
  pending:      { label: 'En cours',      color: '#f59e0b', bg: '#fffbeb', dot: '🟡' },
  disconnected: { label: 'Non configuré', color: '#64748b', bg: '#f8fafc', dot: '⚪' },
  error:        { label: 'Erreur',        color: '#dc2626', bg: '#fef2f2', dot: '🔴' },
}

// Champs de configuration par intégration
const CONFIG_FIELDS = {
  claude:  [{ key: 'api_key', label: 'Clé API Anthropic', placeholder: 'sk-ant-api03-...', type: 'password' }, { key: 'model', label: 'Modèle', placeholder: 'claude-sonnet-4-20250514', type: 'text' }],
  chatgpt: [{ key: 'api_key', label: 'Clé API OpenAI', placeholder: 'sk-proj-...', type: 'password' }, { key: 'model', label: 'Modèle', placeholder: 'gpt-4o', type: 'text' }],
  hubspot: [{ key: 'api_key', label: 'Clé API HubSpot', placeholder: 'pat-na1-...', type: 'password' }],
  outlook: [{ key: 'client_id', label: 'Azure Client ID', placeholder: '06b90767-...', type: 'text' }, { key: 'tenant_id', label: 'Azure Tenant ID', placeholder: '2dfeda59-...', type: 'text' }],
  sage:    [{ key: 'api_key', label: 'Clé API Sage', placeholder: '', type: 'password' }, { key: 'endpoint', label: 'URL endpoint', placeholder: 'https://...', type: 'text' }],
  stripe:  [{ key: 'api_key', label: 'Clé secrète Stripe', placeholder: 'sk_live_...', type: 'password' }],
  qonto:   [{ key: 'api_key', label: 'Clé API Qonto', placeholder: '', type: 'password' }, { key: 'slug', label: 'Slug organisation', placeholder: 'mon-entreprise', type: 'text' }],
  slack:   [{ key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...', type: 'text' }],
  gmail:   [{ key: 'smtp_user', label: 'Email SMTP', placeholder: 'noreply@groupe-sra.fr', type: 'text' }, { key: 'smtp_pass', label: 'Mot de passe app', placeholder: '', type: 'password' }],
  leadbyte: [
    { key: 'subdomain', label: 'Sous-domaine LeadByte', placeholder: 'webmediarm', type: 'text' },
    { key: 'api_key',   label: 'Clé API REST',          placeholder: '16283b8fefd8c37a4d3cb17e04584bb6', type: 'password' },
    { key: 'tld',       label: 'TLD (.com ou .co.uk)',  placeholder: '.com', type: 'text' },
  ],
  dolibarr: [
    { key: 'base_url', label: 'URL de base', placeholder: 'https://erp.example.com', type: 'text' },
    { key: 'api_key',  label: 'DOLAPIKEY',   placeholder: '', type: 'password' },
  ],
  google_ads: [
    { key: 'developer_token', label: 'Developer Token', placeholder: '', type: 'password' },
    { key: 'customer_id',     label: 'Customer ID MCC', placeholder: '123-456-7890', type: 'text' },
    { key: 'refresh_token',   label: 'Refresh Token OAuth', placeholder: '', type: 'password' },
  ],
  meta_ads: [
    { key: 'access_token',  label: 'Access Token (long-lived)', placeholder: '', type: 'password' },
    { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_1234567890', type: 'text' },
  ],
}

// Intégrations qui exposent un sync à la demande (Edge Function <provider>-sync)
const SYNC_PROVIDERS = ['leadbyte']

export default function IntegrationsAdminPage() {
  const [statuses, setStatuses] = useState({})
  const [configs, setConfigs] = useState({})
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [configModal, setConfigModal] = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(null)
  const [syncResult, setSyncResult] = useState({})

  useEffect(() => { loadStatuses() }, [])

  async function runSync(providerId) {
    const cfg = configs[providerId]
    if (!cfg || !cfg.api_key || !cfg.subdomain) {
      setSyncResult(prev => ({ ...prev, [providerId]: { ok: false, error: 'Configuration manquante : subdomain + api_key requis.' } }))
      return
    }
    setSyncing(providerId)
    setSyncResult(prev => ({ ...prev, [providerId]: null }))
    try {
      const { data, error } = await supabase.functions.invoke(`${providerId}-sync`, {
        body: { action: 'sync', subdomain: cfg.subdomain, api_key: cfg.api_key, tld: cfg.tld || '.com' },
      })
      if (error) throw error
      setSyncResult(prev => ({ ...prev, [providerId]: data?.ok ? data : { ok: false, error: data?.error || 'Erreur inconnue' } }))
      // Reload configs to get updated last_sync
      loadStatuses()
    } catch (e) {
      setSyncResult(prev => ({ ...prev, [providerId]: { ok: false, error: e.message } }))
    } finally {
      setSyncing(null)
    }
  }

  async function loadStatuses() {
    const { data } = await supabase.from('integrations').select('*')
    const map = {}
    const cfgMap = {}
    ;(data || []).forEach(row => {
      map[row.provider] = row.status || 'disconnected'
      if (row.config) cfgMap[row.provider] = row.config
    })
    INTEGRATIONS.forEach(i => { if (!map[i.id]) map[i.id] = 'disconnected' })
    setStatuses(map)
    setConfigs(cfgMap)
  }

  async function toggleStatus(id) {
    const current = statuses[id] || 'disconnected'
    const next = current === 'connected' ? 'disconnected' : 'connected'
    setStatuses(prev => ({ ...prev, [id]: next }))
    await supabase.from('integrations').upsert({ provider: id, status: next, updated_at: new Date().toISOString() }, { onConflict: 'provider,environment_id' }).catch(() => {})
  }

  function openConfig(integ) {
    setConfigForm(configs[integ.id] || {})
    setConfigModal(integ)
  }

  async function saveConfig() {
    if (!configModal) return
    setSaving(true)
    await supabase.from('integrations').upsert({
      provider: configModal.id,
      status: 'connected',
      config: configForm,
      updated_at: new Date().toISOString()
    }, { onConflict: 'provider,environment_id' }).catch(() => {})
    setConfigs(prev => ({ ...prev, [configModal.id]: configForm }))
    setStatuses(prev => ({ ...prev, [configModal.id]: 'connected' }))
    setSaving(false)
    setConfigModal(null)
  }

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]
  const filtered = INTEGRATIONS.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const connectedCount = Object.values(statuses).filter(s => s === 'connected').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>🔌 Intégrations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {connectedCount} intégration{connectedCount > 1 ? 's' : ''} active{connectedCount > 1 ? 's' : ''} sur {INTEGRATIONS.length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="users-filter-bar">
        <input
          className="table-search"
          type="text"
          placeholder="🔍 Rechercher une intégration..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="table-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grille intégrations */}
      <div className="integ-grid">
        {filtered.map(integ => {
          const status = STATUS_MAP[statuses[integ.id]] || STATUS_MAP.disconnected
          const isConnected = statuses[integ.id] === 'connected'
          return (
            <div key={integ.id} className={`integ-card ${isConnected ? 'integ-card--connected' : ''}`}>
              <div className="integ-card-top">
                <span className="integ-card-icon">{integ.icon}</span>
                <div>
                  <strong>{integ.name}</strong>
                  <span className="integ-card-cat">{integ.category}</span>
                </div>
                <span className="status-badge" style={{ color: status.color, background: status.bg, marginLeft: 'auto' }}>
                  {status.dot} {status.label}
                </span>
              </div>
              <p className="integ-card-desc">{integ.desc}</p>
              <div className="integ-card-actions">
                <button
                  className={isConnected ? 'btn-secondary' : 'btn-primary'}
                  style={{ fontSize: '.82rem', padding: '.4rem .75rem' }}
                  onClick={() => toggleStatus(integ.id)}
                >
                  {isConnected ? 'Déconnecter' : 'Connecter'}
                </button>
                {(isConnected || CONFIG_FIELDS[integ.id]) && (
                  <button className="btn-secondary" style={{ fontSize: '.82rem', padding: '.4rem .75rem' }}
                    onClick={() => openConfig(integ)}>
                    ⚙️ Configurer
                  </button>
                )}
                {SYNC_PROVIDERS.includes(integ.id) && isConnected && (
                  <button className="btn-primary" style={{ fontSize: '.82rem', padding: '.4rem .75rem' }}
                    onClick={() => runSync(integ.id)} disabled={syncing === integ.id}>
                    {syncing === integ.id ? '⏳ Sync…' : '🔄 Sync now'}
                  </button>
                )}
              </div>
              {/* Indicateur config */}
              {configs[integ.id] && Object.keys(configs[integ.id]).length > 0 && (
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>✓ Configuré</div>
              )}
              {configs[integ.id]?.last_sync && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Dernier sync : {new Date(configs[integ.id].last_sync).toLocaleString('fr-FR')}
                </div>
              )}
              {syncResult[integ.id] && (
                <div style={{ fontSize: 11, color: syncResult[integ.id].ok ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                  {syncResult[integ.id].ok
                    ? `✓ ${syncResult[integ.id].summary?.campaigns?.upserted || 0} campagnes, ${syncResult[integ.id].summary?.buyers?.upserted || 0} acheteurs, ${syncResult[integ.id].summary?.leads?.upserted || 0} leads`
                    : `✗ ${syncResult[integ.id].error}`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal configuration */}
      {configModal && (
        <div className="modal-overlay" onClick={() => setConfigModal(null)}>
          <div className="modal modal--md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{configModal.icon}</span>
                Configurer {configModal.name}
              </h2>
              <button className="modal-close" onClick={() => setConfigModal(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{configModal.desc}</p>

            {CONFIG_FIELDS[configModal.id] ? (
              CONFIG_FIELDS[configModal.id].map(field => (
                <div key={field.key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '.85rem' }}>{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    value={configForm[field.key] || ''}
                    onChange={e => setConfigForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '.6rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              ))
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Aucune configuration requise pour cette intégration.</p>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setConfigModal(null)}>Annuler</button>
              <button className="btn-primary" onClick={saveConfig} disabled={saving}>
                {saving ? 'Enregistrement...' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
