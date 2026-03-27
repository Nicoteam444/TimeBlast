import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, defaultUrl, defaultKey, switchSupabaseClient, getCurrentSupabaseUrl } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const TABS = [
  { id: 'envs', label: 'Environnements', icon: '🌐' },
  { id: 'users', label: 'Utilisateurs & Acces', icon: '👥' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'backup', label: 'Sauvegarde', icon: '💾' },
]

function generateEnvCode() {
  return String(Math.floor(1000000 + Math.random() * 9000000))
}

// ── Onglet Environnements ──
function EnvsTab() {
  const [envs, setEnvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editEnv, setEditEnv] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', supabase_url: '', supabase_anon_key: '', is_production: false })

  useEffect(() => { loadEnvs() }, [])

  async function loadEnvs() {
    setLoading(true)
    const { data } = await supabase.from('environments').select('*, user_environments(count)')
    setEnvs(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const { error } = await supabase.from('environments').insert({
      env_code: generateEnvCode(),
      ...form,
    })
    if (!error) { setShowCreate(false); setForm({ name: '', description: '', supabase_url: '', supabase_anon_key: '', is_production: false }); loadEnvs() }
    else alert('Erreur: ' + error.message)
  }

  async function handleUpdate(e) {
    e.preventDefault()
    const { error } = await supabase.from('environments').update({
      name: editEnv.name,
      description: editEnv.description,
      supabase_url: editEnv.supabase_url,
      supabase_anon_key: editEnv.supabase_anon_key,
      is_production: editEnv.is_production,
      is_active: editEnv.is_active,
    }).eq('id', editEnv.id)
    if (!error) { setEditEnv(null); loadEnvs() }
    else alert('Erreur: ' + error.message)
  }

  async function toggleActive(env) {
    await supabase.from('environments').update({ is_active: !env.is_active }).eq('id', env.id)
    loadEnvs()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#64748b', margin: 0 }}>{envs.length} environnement{envs.length > 1 ? 's' : ''}</p>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nouvel environnement</button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {envs.map(env => (
          <div key={env.id} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem',
            opacity: env.is_active ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: env.is_production ? '#16a34a' : env.is_active ? '#f59e0b' : '#94a3b8' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{env.name}</h3>
                  <span style={{ fontSize: '.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>#{env.env_code}</span>
                  {env.is_production && <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>PRODUCTION</span>}
                  {!env.is_active && <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 4 }}>INACTIF</span>}
                </div>
                {env.description && <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>{env.description}</p>}
                <div style={{ marginTop: 8, fontSize: '.8rem', color: '#94a3b8' }}>
                  <span>🔗 {env.supabase_url}</span>
                  <span style={{ marginLeft: 16 }}>👥 {env.user_environments?.[0]?.count || 0} utilisateur(s)</span>
                  <span style={{ marginLeft: 16 }}>📅 Cree le {new Date(env.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditEnv({ ...env })} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '.8rem' }}>✏️ Modifier</button>
                <button onClick={() => toggleActive(env)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '.8rem', color: env.is_active ? '#dc2626' : '#16a34a' }}>
                  {env.is_active ? '⏸ Desactiver' : '▶ Activer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Creation */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h2>Nouvel environnement</h2></div>
            <form onSubmit={handleCreate} style={{ padding: '1rem' }}>
              <div className="field"><label>Nom</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Production Client X" /></div>
              <div className="field"><label>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle" /></div>
              <div className="field"><label>URL Supabase</label><input required value={form.supabase_url} onChange={e => setForm(f => ({ ...f, supabase_url: e.target.value }))} placeholder="https://xxxxx.supabase.co" /></div>
              <div className="field"><label>Cle Anon Supabase</label><textarea rows={3} required value={form.supabase_anon_key} onChange={e => setForm(f => ({ ...f, supabase_anon_key: e.target.value }))} placeholder="eyJ..." style={{ fontSize: '.8rem', fontFamily: 'monospace' }} /></div>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.is_production} onChange={e => setForm(f => ({ ...f, is_production: e.target.checked }))} />
                <label style={{ margin: 0 }}>Environnement de production</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" className="btn-primary">Creer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {editEnv && (
        <div className="modal-overlay" onClick={() => setEditEnv(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h2>Modifier {editEnv.name}</h2></div>
            <form onSubmit={handleUpdate} style={{ padding: '1rem' }}>
              <div className="field"><label>Code</label><input disabled value={editEnv.env_code} style={{ background: '#f1f5f9', fontFamily: 'monospace' }} /></div>
              <div className="field"><label>Nom</label><input required value={editEnv.name} onChange={e => setEditEnv(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="field"><label>Description</label><input value={editEnv.description || ''} onChange={e => setEditEnv(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="field"><label>URL Supabase</label><input required value={editEnv.supabase_url} onChange={e => setEditEnv(f => ({ ...f, supabase_url: e.target.value }))} /></div>
              <div className="field"><label>Cle Anon Supabase</label><textarea rows={3} required value={editEnv.supabase_anon_key} onChange={e => setEditEnv(f => ({ ...f, supabase_anon_key: e.target.value }))} style={{ fontSize: '.8rem', fontFamily: 'monospace' }} /></div>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editEnv.is_production} onChange={e => setEditEnv(f => ({ ...f, is_production: e.target.checked }))} />
                <label style={{ margin: 0 }}>Production</label>
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editEnv.is_active} onChange={e => setEditEnv(f => ({ ...f, is_active: e.target.checked }))} />
                <label style={{ margin: 0 }}>Actif</label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => setEditEnv(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Utilisateurs & Acces ──
function UsersTab() {
  const [envs, setEnvs] = useState([])
  const [access, setAccess] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEnv, setSelectedEnv] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [envsRes, accessRes, profilesRes] = await Promise.all([
      supabase.from('environments').select('id, env_code, name'),
      supabase.from('user_environments').select('*, environments(name, env_code), profiles:user_id(full_name)'),
      supabase.from('profiles').select('id, full_name, role'),
    ])
    setEnvs(envsRes.data || [])
    setAccess(accessRes.data || [])
    setProfiles(profilesRes.data || [])
    setLoading(false)
  }

  async function grantAccess(userId, envId, role = 'viewer') {
    const { error } = await supabase.from('user_environments').insert({ user_id: userId, environment_id: envId, role })
    if (!error) load()
    else alert('Erreur: ' + error.message)
  }

  async function revokeAccess(id) {
    if (!confirm('Revoquer cet acces ?')) return
    await supabase.from('user_environments').delete().eq('id', id)
    load()
  }

  async function changeRole(id, role) {
    await supabase.from('user_environments').update({ role }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  const filtered = selectedEnv ? access.filter(a => a.environment_id === selectedEnv) : access

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedEnv(null)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.85rem', background: !selectedEnv ? '#2B4C7E' : '#f1f5f9', color: !selectedEnv ? '#fff' : '#475569' }}>
          Tous ({access.length})
        </button>
        {envs.map(env => {
          const count = access.filter(a => a.environment_id === env.id).length
          return (
            <button key={env.id} onClick={() => setSelectedEnv(env.id)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.85rem', background: selectedEnv === env.id ? '#2B4C7E' : '#f1f5f9', color: selectedEnv === env.id ? '#fff' : '#475569' }}>
              {env.name} ({count})
            </button>
          )
        })}
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Environnement</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td className="user-cell"><span className="user-name">{a.profiles?.full_name || 'Inconnu'}</span></td>
                <td><span style={{ fontSize: '.8rem' }}>🌐 {a.environments?.name} <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>#{a.environments?.env_code}</span></span></td>
                <td>
                  <select value={a.role} onChange={e => changeRole(a.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '.85rem' }}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => revokeAccess(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '.85rem' }}>🗑 Revoquer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ajouter un acces */}
      {selectedEnv && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px' }}>Ajouter un utilisateur</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <select id="add-user" style={{ flex: 1, padding: '6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
              {profiles.filter(p => !access.some(a => a.user_id === p.id && a.environment_id === selectedEnv)).map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => { const el = document.getElementById('add-user'); if (el?.value) grantAccess(el.value, selectedEnv) }}>
              + Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Monitoring ──
function MonitoringTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [pv, profiles, envs] = await Promise.all([
      supabase.from('page_views').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('environments').select('id', { count: 'exact', head: true }),
    ])
    setStats({
      pageViews: pv.count || 0,
      users: profiles.count || 0,
      envs: envs.count || 0,
    })
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pages consultees (total)', value: stats.pageViews, icon: '👁', color: '#2B4C7E' },
          { label: 'Utilisateurs inscrits', value: stats.users, icon: '👥', color: '#16a34a' },
          { label: 'Environnements', value: stats.envs, icon: '🌐', color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize: '.85rem', color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 12px' }}>Informations systeme</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { label: 'Client Supabase actif', value: getCurrentSupabaseUrl() },
            { label: 'Environnement Vercel', value: import.meta.env.VITE_APP_ENV || 'staging' },
            { label: 'Version', value: `Build ${new Date().toLocaleDateString('fr-FR')}` },
            { label: 'Framework', value: 'React + Vite + Supabase' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>{item.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '.85rem', color: '#1e293b' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Sauvegarde ──
function BackupTab() {
  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
        <h3 style={{ margin: '0 0 8px' }}>Sauvegardes automatiques</h3>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Supabase effectue des sauvegardes automatiques quotidiennes de vos bases de donnees.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 400, margin: '0 auto' }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>✅ Actives</div>
            <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 4 }}>Sauvegardes quotidiennes</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2B4C7E' }}>7 jours</div>
            <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 4 }}>Retention</div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#2B4C7E', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '.9rem' }}>
            Ouvrir Supabase Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ──
export default function BackofficePage() {
  const [tab, setTab] = useState('envs')

  // Toujours forcer le client Supabase master (base principale)
  // Le backoffice est hors scope environnement, il doit lire la base master
  useEffect(() => {
    const prevUrl = getCurrentSupabaseUrl()
    if (prevUrl !== defaultUrl) {
      switchSupabaseClient(defaultUrl, defaultKey)
    }
    return () => {
      // Remettre le client précédent si on quitte le backoffice
      // (le EnvRouteWrapper se chargera de reswitcher au bon env)
    }
  }, [])

  return (
    <div className="admin-page">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 16, padding: '2rem', marginBottom: 24,
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 .25rem' }}>
          🛡 Backoffice Super Admin
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '.9rem' }}>
          Gestion centralisee des environnements, utilisateurs et configurations
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '.85rem',
            color: tab === t.id ? '#2B4C7E' : '#94a3b8',
            borderBottom: tab === t.id ? '3px solid #2B4C7E' : '3px solid transparent',
            marginBottom: -2,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'envs' && <EnvsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'monitoring' && <MonitoringTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  )
}
