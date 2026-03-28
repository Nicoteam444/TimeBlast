import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useEnv } from '../../contexts/EnvContext'

export default function EnvSettingsPage() {
  const { currentEnv } = useEnv() || {}
  const [settings, setSettings] = useState({
    name: '', description: '', supabase_url: '', is_production: false, is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Charger les paramètres de l'environnement
  useEffect(() => {
    if (!currentEnv?.id) return
    setSettings({
      name: currentEnv.name || '',
      description: currentEnv.description || '',
      supabase_url: currentEnv.supabase_url || '',
      is_production: currentEnv.is_production || false,
      is_active: currentEnv.is_active !== false,
    })
    setLoading(false)
  }, [currentEnv])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('environments').update({
      name: settings.name,
      description: settings.description,
      is_production: settings.is_production,
      is_active: settings.is_active,
    }).eq('id', currentEnv.id)
    setSaving(false)
    if (error) alert('Erreur: ' + error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Chargement...</div>

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a2332', marginBottom: '.25rem' }}>⚙️ Paramètres de l'environnement</h1>
      <p style={{ color: '#64748b', fontSize: '.9rem', marginBottom: '2rem' }}>
        Configuration de l'environnement <strong>{currentEnv?.env_code}</strong>
      </p>

      {/* Infos environnement */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: 4 }}>Code environnement</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#195C82' }}>{currentEnv?.env_code}</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: 4 }}>Statut</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: settings.is_active ? '#16a34a' : '#ef4444' }}>
            {settings.is_active ? '🟢 Actif' : '🔴 Inactif'}
          </div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: 4 }}>Type</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: settings.is_production ? '#195C82' : '#f59e0b' }}>
            {settings.is_production ? '🏢 Production' : '🧪 Test'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-grid-2">
          <div className="field">
            <label>Nom de l'environnement</label>
            <input type="text" value={settings.name}
              onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
              placeholder="Ex: Production SRA" />
          </div>
          <div className="field">
            <label>URL Supabase</label>
            <input type="text" value={settings.supabase_url} disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea value={settings.description} rows={3}
              onChange={e => setSettings(s => ({ ...s, description: e.target.value }))}
              placeholder="Description de l'environnement..."
              style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '.9rem', resize: 'vertical' }} />
          </div>
          <div className="field">
            <label>Production</label>
            <div className="toggle-group">
              <button type="button"
                className={`toggle-btn ${settings.is_production ? 'toggle-btn--active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, is_production: true }))}>
                🏢 Production
              </button>
              <button type="button"
                className={`toggle-btn ${!settings.is_production ? 'toggle-btn--active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, is_production: false }))}>
                🧪 Test
              </button>
            </div>
          </div>
          <div className="field">
            <label>Environnement actif</label>
            <div className="toggle-group">
              <button type="button"
                className={`toggle-btn ${settings.is_active ? 'toggle-btn--active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, is_active: true }))}>
                ✅ Actif
              </button>
              <button type="button"
                className={`toggle-btn ${!settings.is_active ? 'toggle-btn--active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, is_active: false }))}>
                ⏸ Inactif
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: '1.5rem' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
          {saved && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Paramètres sauvegardés</span>}
        </div>
      </form>

      {/* Section danger */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
        <h3 style={{ color: '#dc2626', fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>⚠️ Zone dangereuse</h3>
        <p style={{ color: '#b91c1c', fontSize: '.85rem', marginBottom: '1rem' }}>
          Désactiver l'environnement empêchera tous les utilisateurs d'y accéder.
        </p>
        <button type="button" onClick={() => {
          if (confirm('Êtes-vous sûr de vouloir désactiver cet environnement ?')) {
            setSettings(s => ({ ...s, is_active: false }))
          }
        }} style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1.5px solid #ef4444', background: '#fff', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>
          ⏸ Désactiver l'environnement
        </button>
      </div>
    </div>
  )
}
