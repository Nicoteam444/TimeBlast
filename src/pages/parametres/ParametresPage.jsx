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
const TABS = [
  { id: 'affichage',     label: 'Affichage',     icon: '🎨' },
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
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'bdd'          && <BaseDeDonneesTab />}
    </div>
  )
}
