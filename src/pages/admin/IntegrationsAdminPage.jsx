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
]

const STATUS_MAP = {
  connected:    { label: 'Connecté',      color: '#16a34a', bg: '#f0fdf4', dot: '🟢' },
  pending:      { label: 'En cours',      color: '#f59e0b', bg: '#fffbeb', dot: '🟡' },
  disconnected: { label: 'Non configuré', color: '#64748b', bg: '#f8fafc', dot: '⚪' },
  error:        { label: 'Erreur',        color: '#dc2626', bg: '#fef2f2', dot: '🔴' },
}

export default function IntegrationsAdminPage() {
  const [statuses, setStatuses] = useState({})
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Load integration statuses from Supabase or localStorage
    loadStatuses()
  }, [])

  async function loadStatuses() {
    const { data } = await supabase.from('integrations').select('*')
    const map = {}
    ;(data || []).forEach(row => { map[row.provider] = row.status || 'disconnected' })
    // Default everything not in DB to disconnected
    INTEGRATIONS.forEach(i => { if (!map[i.id]) map[i.id] = 'disconnected' })
    // HubSpot and SIRENE are already connected
    if (!map.hubspot || map.hubspot === 'disconnected') map.hubspot = 'connected'
    if (!map.sirene || map.sirene === 'disconnected') map.sirene = 'connected'
    if (!map.outlook || map.outlook === 'disconnected') map.outlook = 'connected'
    setStatuses(map)
  }

  async function toggleStatus(id) {
    const current = statuses[id] || 'disconnected'
    const next = current === 'connected' ? 'disconnected' : 'connected'
    setStatuses(prev => ({ ...prev, [id]: next }))
    // Try to persist
    await supabase.from('integrations').upsert({ provider: id, status: next, updated_at: new Date().toISOString() }, { onConflict: 'provider' }).catch(() => {})
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
                {isConnected && (
                  <button className="btn-secondary" style={{ fontSize: '.82rem', padding: '.4rem .75rem' }}>
                    ⚙️ Configurer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
