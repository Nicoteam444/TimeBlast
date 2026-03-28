import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    full_name: '', poste: '', telephone: '', departement: '', date_naissance: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name || '',
      poste: profile.poste || '',
      telephone: profile.telephone || '',
      departement: profile.departement || '',
      date_naissance: profile.date_naissance ? profile.date_naissance.split('T')[0] : '',
    })
    setLoading(false)
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      poste: form.poste || null,
      telephone: form.telephone || null,
      departement: form.departement || null,
      date_naissance: form.date_naissance || null,
    }).eq('id', user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const initials = (form.full_name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  if (loading) return <Spinner />

  return (
    <div className="admin-page" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Mon profil</h1>
      <p style={{ color: '#64748b', fontSize: '.9rem', marginBottom: 24 }}>
        {user?.email}
      </p>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2B4C7E, #1a8cff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '1.5rem', fontWeight: 800,
        }}>
          {initials}
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="field">
            <label>Prenom</label>
            <input type="text" value={form.full_name.split(' ')[0] || ''}
              onChange={e => {
                const parts = form.full_name.split(' ')
                parts[0] = e.target.value
                setForm(f => ({ ...f, full_name: parts.join(' ') }))
              }}
              placeholder="Prenom" />
          </div>
          <div className="field">
            <label>Nom</label>
            <input type="text" value={form.full_name.split(' ').slice(1).join(' ') || ''}
              onChange={e => {
                const prenom = form.full_name.split(' ')[0] || ''
                setForm(f => ({ ...f, full_name: `${prenom} ${e.target.value}`.trim() }))
              }}
              placeholder="Nom" />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input type="email" value={user?.email || ''} disabled
            style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="field">
            <label>Poste / Fonction</label>
            <input type="text" value={form.poste}
              onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}
              placeholder="Ex: Directeur technique" />
          </div>
          <div className="field">
            <label>Departement</label>
            <input type="text" value={form.departement}
              onChange={e => setForm(f => ({ ...f, departement: e.target.value }))}
              placeholder="Ex: DSI" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="field">
            <label>Telephone</label>
            <input type="tel" value={form.telephone}
              onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              placeholder="06 00 00 00 00" />
          </div>
          <div className="field">
            <label>Date de naissance</label>
            <input type="date" value={form.date_naissance}
              onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="field">
            <label>Role</label>
            <input type="text" value={profile?.role || ''} disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed', textTransform: 'capitalize' }} />
          </div>
          <div className="field">
            <label>Membre depuis</label>
            <input type="text" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : ''} disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="landing-btn-primary" disabled={saving}
            style={{ padding: '.6rem 2rem' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {saved && (
            <span style={{ color: '#16a34a', fontSize: '.9rem', fontWeight: 600 }}>
              ✅ Profil mis a jour
            </span>
          )}
        </div>
      </form>

      {/* Modules accessibles */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2332', marginBottom: '.75rem' }}>📋 Modules accessibles</h3>
        <p style={{ fontSize: '.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
          Vos accès sont définis par votre administrateur.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {[
            { id: 'calendrier', label: 'Calendrier', icon: '📆' },
            { id: 'activite', label: 'Activité', icon: '⏱' },
            { id: 'equipe', label: 'Équipe', icon: '👥' },
            { id: 'gestion', label: 'Gestion', icon: '🧾' },
            { id: 'crm', label: 'CRM', icon: '🎯' },
            { id: 'marketing', label: 'Marketing', icon: '📣' },
            { id: 'finance', label: 'Finance', icon: '💰' },
            { id: 'documents', label: 'Documents', icon: '📁' },
            { id: 'workflows', label: 'Workflows', icon: '🔀' },
            { id: 'wiki', label: 'Wiki', icon: '📖' },
            { id: 'documentation', label: 'Documentation', icon: '📚' },
          ].map(m => {
            const userModules = profile?.modules || []
            const hasAccess = userModules.length === 0 || userModules.includes(m.id)
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 8, border: '1.5px solid',
                borderColor: hasAccess ? '#195C82' : '#e2e8f0',
                background: hasAccess ? '#eef6fb' : '#f8fafc',
                fontSize: '.82rem', fontWeight: 600,
                color: hasAccess ? '#195C82' : '#cbd5e1',
              }}>
                <span>{m.icon}</span> {m.label}
                <span style={{ marginLeft: 'auto', fontSize: '.7rem' }}>{hasAccess ? '✅' : '🔒'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
