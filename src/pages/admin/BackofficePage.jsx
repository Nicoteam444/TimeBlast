import { useState, useEffect, useMemo, lazy, Suspense, Component } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, defaultUrl, defaultKey, switchSupabaseClient, getCurrentSupabaseUrl } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { luccaTest, luccaFullSync, syncUsersToSupabase, syncLeavesToSupabase, syncTimeEntriesToSupabase } from '../../lib/luccaClient'
import Spinner from '../../components/Spinner'

// ── Helpers ──
function timeAgo(date) {
  if (!date) return '-'
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'il y a quelques secondes'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`
  if (s < 2592000) return `il y a ${Math.floor(s / 86400)}j`
  return new Date(date).toLocaleDateString('fr-FR')
}

function generateEnvCode() {
  return String(Math.floor(1000000 + Math.random() * 9000000))
}

const S = {
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardPad: { padding: '1.25rem' },
  badge: (bg, color) => ({ fontSize: '.7rem', fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 20, letterSpacing: .3, textTransform: 'uppercase' }),
  btn: { padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, transition: 'all .15s' },
  btnPrimary: { padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2B4C7E, #3b6cb4)', color: '#fff', cursor: 'pointer', fontSize: '.85rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(43,76,126,.25)' },
  btnDanger: { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 },
  btnSuccess: { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '.9rem', outline: 'none', transition: 'border .15s', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 },
  stat: (color) => ({ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }),
}

// ── Onglet Environnements ──
function EnvsTab() {
  const [envs, setEnvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editEnv, setEditEnv] = useState(null)
  const [envStats, setEnvStats] = useState({})
  const [form, setForm] = useState({ name: '', description: '', supabase_url: '', supabase_anon_key: '', is_production: false })

  useEffect(() => { loadEnvs() }, [])

  async function loadEnvs() {
    setLoading(true)
    const { data } = await supabase.from('environments').select('*, user_environments(count)')
    const envList = data || []
    setEnvs(envList)
    setLoading(false)

    // Charger les stats de chaque env en background
    for (const env of envList) {
      // Utilisateurs : toujours via user_environments (lie par env, pas count profiles global)
      const usersFromAccess = env.user_environments?.[0]?.count || 0

      if (env.supabase_url && env.supabase_anon_key) {
        try {
          const client = createClient(env.supabase_url, env.supabase_anon_key)
          // Page views : tenter de filtrer par environment_id pour eviter les stats globales
          let pageViewsCount = 0
          try {
            const { count } = await client.from('page_views').select('id', { count: 'exact', head: true }).eq('environment_id', env.id)
            pageViewsCount = count || 0
          } catch {
            // Fallback : count global (cas ou la colonne environment_id n'existe pas)
            const { count } = await client.from('page_views').select('id', { count: 'exact', head: true })
            pageViewsCount = count || 0
          }
          setEnvStats(prev => ({ ...prev, [env.id]: {
            users: usersFromAccess,
            pageViews: pageViewsCount,
            online: true,
          } }))
        } catch {
          setEnvStats(prev => ({ ...prev, [env.id]: {
            users: usersFromAccess,
            pageViews: 0,
            online: false,
          } }))
        }
      } else {
        setEnvStats(prev => ({ ...prev, [env.id]: { users: usersFromAccess, pageViews: 0, online: false } }))
      }
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const { error } = await supabase.from('environments').insert({ env_code: generateEnvCode(), ...form })
    if (!error) { setShowCreate(false); setForm({ name: '', description: '', supabase_url: '', supabase_anon_key: '', is_production: false }); loadEnvs() }
    else alert('Erreur: ' + error.message)
  }

  async function handleUpdate(e) {
    e.preventDefault()
    const { error } = await supabase.from('environments').update({
      name: editEnv.name, description: editEnv.description, supabase_url: editEnv.supabase_url,
      supabase_anon_key: editEnv.supabase_anon_key, is_production: editEnv.is_production, is_active: editEnv.is_active,
    }).eq('id', editEnv.id)
    if (!error) { setEditEnv(null); loadEnvs() }
    else alert('Erreur: ' + error.message)
  }

  async function handleDeleteEnv() {
    if (!editEnv) return
    if (!confirm(`Supprimer définitivement l'environnement "${editEnv.name}" (${editEnv.env_code}) ? Cette action est irréversible.`)) return
    // Supprimer les accès utilisateurs liés
    await supabase.from('user_environments').delete().eq('environment_id', editEnv.id)
    // Supprimer l'environnement
    const { error } = await supabase.from('environments').delete().eq('id', editEnv.id)
    if (!error) { setEditEnv(null); loadEnvs() }
    else alert('Erreur: ' + error.message)
  }

  async function toggleActive(env) {
    await supabase.from('environments').update({ is_active: !env.is_active }).eq('id', env.id)
    loadEnvs()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>

  return (
    <div>
      {/* Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Environnements', value: envs.length, icon: '🌐', color: '#2B4C7E', sub: `${envs.filter(e => e.is_active).length} actifs` },
          { label: 'Production', value: envs.filter(e => e.is_production).length, icon: '🟢', color: '#16a34a', sub: 'instances live' },
          { label: 'Utilisateurs total', value: Object.values(envStats).reduce((a, s) => a + (s.users || 0), 0), icon: '👥', color: '#7c3aed', sub: 'tous envs confondus' },
          { label: 'Pages vues total', value: Object.values(envStats).reduce((a, s) => a + (s.pageViews || 0), 0), icon: '📊', color: '#f59e0b', sub: 'toutes bases' },
        ].map((s, i) => (
          <div key={i} style={S.stat(s.color)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tous les environnements</h3>
        <button style={S.btnPrimary} onClick={() => setShowCreate(true)}>+ Nouvel environnement</button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {envs.map(env => {
          const stats = envStats[env.id]
          return (
            <div key={env.id} style={{ ...S.card, opacity: env.is_active ? 1 : 0.6, transition: 'opacity .2s' }}>
              {/* Color bar */}
              <div style={{ height: 4, background: env.is_production ? 'linear-gradient(90deg, #16a34a, #22c55e)' : env.is_active ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : '#94a3b8' }} />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{env.name}</h3>
                      <span style={{ fontSize: '.75rem', color: '#94a3b8', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>#{env.env_code}</span>
                      {env.is_production && <span style={S.badge('#f0fdf4', '#16a34a')}>Production</span>}
                      {!env.is_active && <span style={S.badge('#fef2f2', '#dc2626')}>Inactif</span>}
                      {stats?.online && <span style={S.badge('#eff6ff', '#2563eb')}>En ligne</span>}
                      {stats && !stats.online && <span style={S.badge('#fef2f2', '#dc2626')}>Hors ligne</span>}
                    </div>
                    {env.description && <p style={{ margin: '0 0 12px', fontSize: '.85rem', color: '#64748b' }}>{env.description}</p>}

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 24, fontSize: '.8rem', color: '#64748b' }}>
                      <span title="Utilisateurs (profiles dans la base)">👥 <strong style={{ color: '#1e293b' }}>{stats?.users ?? '...'}</strong> utilisateur{(stats?.users || 0) > 1 ? 's' : ''}</span>
                      <span title="Pages vues">📊 <strong style={{ color: '#1e293b' }}>{stats?.pageViews?.toLocaleString('fr-FR') ?? '...'}</strong> pages vues</span>
                      <span title="Date de creation">📅 {new Date(env.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* URL */}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '.75rem', fontFamily: 'monospace', color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        {env.supabase_url}
                      </span>
                      <a href={`/${env.env_code}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.75rem', color: '#2B4C7E', textDecoration: 'none', fontWeight: 600 }}>
                        Ouvrir l'app &rarr;
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                    <button onClick={() => setEditEnv({ ...env })} style={S.btn}>✏️ Modifier</button>
                    <button onClick={() => toggleActive(env)} style={env.is_active ? S.btnDanger : S.btnSuccess}>
                      {env.is_active ? '⏸ Désactiver' : '▶ Activer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Creation */}
      {showCreate && <EnvModal title="Nouvel environnement" form={form} setForm={setForm} onSubmit={handleCreate} onClose={() => setShowCreate(false)} submitLabel="Creer" />}

      {/* Modal Edition */}
      {editEnv && <EnvModal title={`Modifier ${editEnv.name}`} form={editEnv} setForm={setEditEnv} onSubmit={handleUpdate} onDelete={handleDeleteEnv} onClose={() => setEditEnv(null)} submitLabel="Enregistrer" isEdit />}
    </div>
  )
}

function EnvModal({ title, form, setForm, onSubmit, onClose, onDelete, submitLabel, isEdit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem 1.5rem 0' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          {isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Code environnement</label>
              <input disabled value={form.env_code} style={{ ...S.input, background: '#f1f5f9', fontFamily: 'monospace', color: '#64748b' }} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Nom *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={S.input} placeholder="Ex: Production Client X" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Description</label>
            <input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={S.input} placeholder="Description optionnelle" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>URL Supabase *</label>
            <input required value={form.supabase_url} onChange={e => setForm(f => ({ ...f, supabase_url: e.target.value }))} style={S.input} placeholder="https://xxxxx.supabase.co" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Cle Anon Supabase *</label>
            <textarea rows={3} required value={form.supabase_anon_key} onChange={e => setForm(f => ({ ...f, supabase_anon_key: e.target.value }))} style={{ ...S.input, fontFamily: 'monospace', fontSize: '.8rem', resize: 'vertical' }} placeholder="eyJ..." />
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_production} onChange={e => setForm(f => ({ ...f, is_production: e.target.checked }))} />
              <span>Production</span>
            </label>
            {isEdit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span>Actif</span>
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            {isEdit && onDelete && (
              <button type="button" onClick={onDelete} style={{ ...S.btnDanger, marginRight: 'auto' }}>🗑 Supprimer</button>
            )}
            <button type="button" onClick={onClose} style={S.btn}>Annuler</button>
            <button type="submit" style={S.btnPrimary}>{submitLabel}</button>
          </div>
        </form>
      </div>
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
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [envsRes, accessRes, profilesRes] = await Promise.all([
      supabase.from('environments').select('id, env_code, name, is_production, is_active'),
      supabase.from('user_environments').select('*, environments(name, env_code, is_production), profiles:user_id(full_name, email, role)'),
      supabase.from('profiles').select('id, full_name, email, role'),
    ])
    setEnvs(envsRes.data || [])
    setAccess(accessRes.data || [])
    setProfiles(profilesRes.data || [])
    setLoading(false)
  }

  async function grantAccess(userId, envId, role = 'editor') {
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>

  const filtered = access.filter(a => {
    if (selectedEnv && a.environment_id !== selectedEnv) return false
    if (search) {
      const q = search.toLowerCase()
      return (a.profiles?.full_name || '').toLowerCase().includes(q) || (a.profiles?.email || '').toLowerCase().includes(q)
    }
    return true
  })

  const ROLE_COLORS = { viewer: '#64748b', editor: '#2563eb', admin: '#dc2626' }
  const ROLE_LABELS = { viewer: 'Lecteur', editor: 'Editeur', admin: 'Admin' }

  return (
    <div>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setSelectedEnv(null)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, background: !selectedEnv ? '#2B4C7E' : 'transparent', color: !selectedEnv ? '#fff' : '#475569' }}>
            Tous ({access.length})
          </button>
          {envs.map(env => {
            const count = access.filter(a => a.environment_id === env.id).length
            return (
              <button key={env.id} onClick={() => setSelectedEnv(env.id)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, background: selectedEnv === env.id ? '#2B4C7E' : 'transparent', color: selectedEnv === env.id ? '#fff' : '#475569' }}>
                {env.is_production ? '🟢' : '🟡'} {env.name} ({count})
              </button>
            )
          })}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..." style={{ ...S.input, width: 240, padding: '8px 14px' }} />
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '.8rem' }}>Utilisateur</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '.8rem' }}>Environnement</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '.8rem' }}>Role app</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '.8rem' }}>Role env</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '.8rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.profiles?.full_name || 'Inconnu'}</div>
                  <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{a.profiles?.email}</div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.environments?.is_production ? '#16a34a' : '#f59e0b' }} />
                    <span>{a.environments?.name}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '.7rem', color: '#94a3b8' }}>#{a.environments?.env_code}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={S.badge('#f1f5f9', '#475569')}>{a.profiles?.role || '-'}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <select value={a.role} onChange={e => changeRole(a.id, e.target.value)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '.8rem', fontWeight: 600, color: ROLE_COLORS[a.role] || '#475569', background: '#fff', cursor: 'pointer' }}>
                    <option value="viewer">Lecteur</option>
                    <option value="editor">Editeur</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button onClick={() => revokeAccess(a.id)} style={{ ...S.btnDanger, padding: '5px 12px', fontSize: '.75rem' }}>Revoquer</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Aucun acces trouve</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ajouter un acces */}
      {selectedEnv && (() => {
        const available = profiles.filter(p => !access.some(a => a.user_id === p.id && a.environment_id === selectedEnv))
        if (!available.length) return null
        return (
          <div style={{ marginTop: 16, ...S.card, ...S.cardPad }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '.9rem', fontWeight: 700 }}>Ajouter un utilisateur a {envs.find(e => e.id === selectedEnv)?.name}</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <select id="add-user-select" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '.85rem' }}>
                {available.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.role}) - {p.email}</option>
                ))}
              </select>
              <button style={S.btnPrimary} onClick={() => { const el = document.getElementById('add-user-select'); if (el?.value) grantAccess(el.value, selectedEnv) }}>
                + Ajouter
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Onglet Monitoring ──
function MonitoringTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [envHealth, setEnvHealth] = useState([])

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [pv, profiles, envs] = await Promise.all([
      supabase.from('page_views').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('environments').select('*'),
    ])
    setStats({ pageViews: pv.count || 0, users: profiles.count || 0, envs: (envs.data || []).length })

    // Health check de chaque env
    const health = []
    for (const env of (envs.data || [])) {
      if (!env.supabase_url || !env.supabase_anon_key) { health.push({ ...env, status: 'unknown' }); continue }
      try {
        const client = createClient(env.supabase_url, env.supabase_anon_key)
        const start = Date.now()
        await client.from('profiles').select('id', { count: 'exact', head: true })
        health.push({ ...env, status: 'ok', latency: Date.now() - start })
      } catch {
        health.push({ ...env, status: 'error', latency: null })
      }
    }
    setEnvHealth(health)
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>

  return (
    <div>
      {/* Health status */}
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Sante des environnements</h3>
      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        {envHealth.map(env => (
          <div key={env.id} style={{ ...S.card, ...S.cardPad, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: env.status === 'ok' ? '#16a34a' : env.status === 'error' ? '#dc2626' : '#94a3b8',
                boxShadow: env.status === 'ok' ? '0 0 8px rgba(22,163,106,.4)' : 'none',
              }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{env.name}</div>
                <div style={{ fontSize: '.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{env.supabase_url}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {env.latency != null && (
                <span style={{ fontSize: '.8rem', fontFamily: 'monospace', color: env.latency < 300 ? '#16a34a' : env.latency < 1000 ? '#f59e0b' : '#dc2626' }}>
                  {env.latency}ms
                </span>
              )}
              <span style={S.badge(
                env.status === 'ok' ? '#f0fdf4' : env.status === 'error' ? '#fef2f2' : '#f1f5f9',
                env.status === 'ok' ? '#16a34a' : env.status === 'error' ? '#dc2626' : '#94a3b8'
              )}>
                {env.status === 'ok' ? 'En ligne' : env.status === 'error' ? 'Erreur' : 'Inconnu'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* System info */}
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Informations systeme</h3>
      <div style={{ ...S.card, ...S.cardPad }}>
        <div style={{ display: 'grid', gap: 0 }}>
          {[
            { label: 'Client Supabase master', value: defaultUrl, icon: '🗄' },
            { label: 'Client Supabase actif', value: getCurrentSupabaseUrl(), icon: '🔌' },
            { label: 'Environnement Vercel', value: import.meta.env.VITE_APP_ENV || 'production', icon: '▲' },
            { label: 'Version', value: `Build ${new Date().toLocaleDateString('fr-FR')}`, icon: '🏗' },
            { label: 'Framework', value: 'React + Vite + Supabase', icon: '⚡' },
            { label: 'Domaines', value: 'timeblast.ai, timeblast.co, admin.timeblast.ai', icon: '🌐' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>{item.icon} {item.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '.8rem', color: '#1e293b', background: '#f8fafc', padding: '4px 10px', borderRadius: 4 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Deploiement ──
function DeployTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Supabase */}
        <div style={{ ...S.card, ...S.cardPad }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3ecf8e, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🗄</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Supabase</div>
              <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Base de donnees & Auth</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Sauvegardes</span>
              <span style={S.badge('#f0fdf4', '#16a34a')}>Quotidiennes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Retention</span>
              <span style={{ fontWeight: 600 }}>7 jours</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0' }}>
              <span style={{ color: '#64748b' }}>RLS</span>
              <span style={S.badge('#f0fdf4', '#16a34a')}>Active</span>
            </div>
          </div>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 16, ...S.btnPrimary, textDecoration: 'none' }}>
            Ouvrir Supabase &rarr;
          </a>
        </div>

        {/* Vercel */}
        <div style={{ ...S.card, ...S.cardPad }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff' }}>▲</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Vercel</div>
              <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Hebergement & CDN</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Projet</span>
              <span style={{ fontWeight: 600 }}>time-blast</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Branche</span>
              <span style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>main</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '6px 0' }}>
              <span style={{ color: '#64748b' }}>CDN</span>
              <span style={S.badge('#f0fdf4', '#16a34a')}>Global Edge</span>
            </div>
          </div>
          <a href="https://vercel.com/nicoteam444s-projects/time-blast" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 16, ...S.btnPrimary, background: '#000', boxShadow: '0 2px 8px rgba(0,0,0,.25)', textDecoration: 'none' }}>
            Ouvrir Vercel &rarr;
          </a>
        </div>
      </div>

      {/* Architecture */}
      <div style={{ marginTop: 24, ...S.card, ...S.cardPad }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Architecture multi-environnement</h3>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 20, fontFamily: 'monospace', fontSize: '.8rem', lineHeight: 1.8, color: '#475569' }}>
          <div>{'admin.timeblast.ai ─────── /backoffice (master DB)'}</div>
          <div>{'                            │'}</div>
          <div>{'www.timeblast.ai ──┬── /:envId/ ─── Supabase Env A'}</div>
          <div>{'                   └── /:envId/ ─── Supabase Env B'}</div>
          <div>{'                   └── /:envId/ ─── Supabase Env ...'}</div>
          <div style={{ marginTop: 12, color: '#94a3b8' }}>
            {'Chaque environnement = 1 Supabase isole + 1 code unique (ex: /1924635/)'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Onglet Intégrations ──
function IntegrationsTab() {
  const [luccaStatus, setLuccaStatus] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [results, setResults] = useState({})
  const [luccaStats, setLuccaStats] = useState(null)
  const [aiConfigs, setAiConfigs] = useState({})
  const [editingConfig, setEditingConfig] = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [savingConfig, setSavingConfig] = useState(false)

  // Load AI configs from integrations table
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('integrations').select('provider, config, status')
      const map = {}
      ;(data || []).forEach(r => { if (r.config) map[r.provider] = r.config })
      setAiConfigs(map)
    })()
  }, [])

  async function saveAiConfig(integId) {
    setSavingConfig(true)
    await supabase.from('integrations').upsert({
      provider: integId, config: configForm, status: 'connected',
      updated_at: new Date().toISOString()
    }, { onConflict: 'provider' }).catch(() => {})
    setAiConfigs(prev => ({ ...prev, [integId]: configForm }))
    setSavingConfig(false)
    setEditingConfig(null)
  }

  async function testLucca() {
    setLuccaStatus('testing')
    try {
      const res = await luccaTest()
      const count = res?.sample?.data?.items?.length || 0
      setLuccaStatus('ok')
      setLuccaStats({ users: count > 0 ? 'Connecté' : '0' })
    } catch (err) {
      setLuccaStatus('error')
      setLuccaStats({ error: err.message })
    }
  }

  async function runSync(type) {
    setSyncing(type)
    setResults(prev => ({ ...prev, [type]: null }))
    try {
      let res
      if (type === 'users') res = await syncUsersToSupabase()
      else if (type === 'leaves') res = await syncLeavesToSupabase()
      else if (type === 'time') res = await syncTimeEntriesToSupabase()
      setResults(prev => ({ ...prev, [type]: res }))
    } catch (err) {
      setResults(prev => ({ ...prev, [type]: { errors: [err.message] } }))
    } finally {
      setSyncing(null)
    }
  }

  const INTEGRATIONS = [
    {
      id: 'lucca', name: 'Lucca SIRH', icon: '🟣', color: '#7c3aed',
      desc: 'Synchronisation des collaborateurs, absences, temps et notes de frais depuis groupe-sra.ilucca.net',
      status: luccaStatus,
      actions: [
        { id: 'users', label: 'Collaborateurs', icon: '👥', desc: 'Sync fiches collaborateurs → table equipe' },
        { id: 'leaves', label: 'Absences', icon: '🏖', desc: 'Sync congés/absences → table absences' },
        { id: 'time', label: 'Temps', icon: '⏱', desc: 'Sync saisies temps → table saisies_temps' },
      ]
    },
    {
      id: 'outlook', name: 'Microsoft Outlook', icon: '📅', color: '#0078D4',
      desc: 'Synchronisation bidirectionnelle du calendrier via Microsoft Graph API',
      status: 'configured',
      actions: []
    },
    {
      id: 'claude', name: 'Claude AI (Anthropic)', icon: '🧠', color: '#6366f1',
      desc: 'Assistant IA, analyse de données, enrichissement automatique et chat intelligent',
      status: aiConfigs.claude?.api_key ? 'ok' : 'disconnected',
      actions: [],
      configFields: [
        { key: 'api_key', label: 'Clé API Anthropic', placeholder: 'sk-ant-api03-...', type: 'password' },
        { key: 'model', label: 'Modèle', placeholder: 'claude-sonnet-4-20250514', type: 'text' },
      ]
    },
    {
      id: 'chatgpt', name: 'OpenAI / ChatGPT', icon: '🤖', color: '#10A37F',
      desc: 'Enrichissement IA, résumés automatiques, extraction de données',
      status: aiConfigs.chatgpt?.api_key ? 'ok' : 'disconnected',
      actions: [],
      configFields: [
        { key: 'api_key', label: 'Clé API OpenAI', placeholder: 'sk-proj-...', type: 'password' },
        { key: 'model', label: 'Modèle', placeholder: 'gpt-4o', type: 'text' },
      ]
    },
  ]

  function renderResult(type) {
    const r = results[type]
    if (!r) return null
    const hasErrors = r.errors?.length > 0
    return (
      <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: '.8rem',
        background: hasErrors ? '#fef2f2' : '#f0fdf4',
        border: `1px solid ${hasErrors ? '#fecaca' : '#bbf7d0'}`,
        color: hasErrors ? '#991b1b' : '#166534' }}>
        {r.created !== undefined && `✅ ${r.created} créé(s), ${r.updated} mis à jour. `}
        {r.synced !== undefined && `✅ ${r.synced} synchronisé(s). `}
        {hasErrors && `⚠️ ${r.errors.length} erreur(s): ${r.errors[0]}`}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 20 }}>
        {INTEGRATIONS.map(integ => (
          <div key={integ.id} style={{ ...S.card }}>
            <div style={{ height: 4, background: integ.color }} />
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: integ.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {integ.icon}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{integ.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>{integ.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {integ.status === 'ok' && <span style={S.badge('#f0fdf4', '#16a34a')}>✓ Connecté</span>}
                  {integ.status === 'error' && <span style={S.badge('#fef2f2', '#dc2626')}>✗ Erreur</span>}
                  {integ.status === 'configured' && <span style={S.badge('#eff6ff', '#2563eb')}>Configuré</span>}
                  {integ.status === 'testing' && <span style={S.badge('#f1f5f9', '#64748b')}>Test...</span>}
                  {integ.id === 'lucca' && (
                    <button onClick={testLucca} style={S.btn} disabled={luccaStatus === 'testing'}>
                      🔌 Tester la connexion
                    </button>
                  )}
                </div>
              </div>

              {luccaStats?.error && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '.8rem', marginBottom: 12 }}>
                  {luccaStats.error}
                </div>
              )}

              {integ.actions.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${integ.actions.length}, 1fr)`, gap: 12 }}>
                  {integ.actions.map(action => (
                    <div key={action.id} style={{ padding: '1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fafbfc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{action.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{action.label}</span>
                      </div>
                      <p style={{ fontSize: '.78rem', color: '#64748b', margin: '0 0 12px' }}>{action.desc}</p>
                      <button
                        onClick={() => runSync(action.id)}
                        disabled={syncing === action.id}
                        style={{ ...S.btnPrimary, width: '100%', opacity: syncing === action.id ? .6 : 1, fontSize: '.8rem', padding: '8px 16px' }}>
                        {syncing === action.id ? '⟳ Synchronisation...' : '🔄 Synchroniser'}
                      </button>
                      {renderResult(action.id)}
                    </div>
                  ))}
                </div>
              )}

              {/* Config fields for AI integrations */}
              {integ.configFields && (
                editingConfig === integ.id ? (
                  <div style={{ marginTop: 12, padding: '1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fafbfc' }}>
                    {integ.configFields.map(field => (
                      <div key={field.key} style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '.82rem', marginBottom: 4 }}>{field.label}</label>
                        <input
                          type={field.type || 'text'}
                          value={configForm[field.key] || ''}
                          onChange={e => setConfigForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '.85rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => setEditingConfig(null)} style={S.btn}>Annuler</button>
                      <button onClick={() => saveAiConfig(integ.id)} disabled={savingConfig}
                        style={{ ...S.btnPrimary, fontSize: '.82rem', padding: '8px 16px' }}>
                        {savingConfig ? '⟳ ...' : '💾 Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => { setConfigForm(aiConfigs[integ.id] || {}); setEditingConfig(integ.id) }}
                      style={S.btn}>
                      ⚙️ {aiConfigs[integ.id]?.api_key ? 'Modifier la configuration' : 'Configurer le token API'}
                    </button>
                    {aiConfigs[integ.id]?.api_key && (
                      <span style={{ fontSize: '.8rem', color: '#16a34a' }}>✓ Clé configurée · Modèle: {aiConfigs[integ.id]?.model || 'par défaut'}</span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Onglet Import données ──
function ImportsTab() {
  const Comp = lazy(() => import('./ImportsPage'))
  return <Suspense fallback={<Spinner />}><Comp /></Suspense>
}

// ── Onglet Tables ──
// IMPORTANT : lazy() doit etre hors du composant sinon React recrée le composant
// lazy a chaque render -> crash 'removeChild not a child'.
const LazyTablesPage = lazy(() => import('./TablesPage'))
function TablesTab() {
  return <Suspense fallback={<Spinner />}><LazyTablesPage /></Suspense>
}

// ── Droits & Profils ──
const PROFILS_METIER_BO = {
  commercial: { label: 'Commercial', icon: '🎯', modules: ['calendrier','crm','marketing','documents'] },
  daf: { label: 'DAF / Comptable', icon: '💰', modules: ['finance','gestion','calendrier','documents'] },
  chef_projet: { label: 'Chef de projet', icon: '📋', modules: ['activite','equipe','calendrier','crm','documents'] },
  rh: { label: 'RH', icon: '👥', modules: ['equipe','calendrier','documents'] },
  direction: { label: 'Direction', icon: '👔', modules: ['calendrier','activite','equipe','gestion','crm','marketing','finance','documents','workflows','documentation'] },
  personnalise: { label: 'Personnalisé', icon: '⚙️', modules: [] },
}

const BO_MODULES = [
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
]

const BO_ROLES = ['collaborateur', 'manager', 'comptable', 'admin']
const BO_ROLE_LABELS = { collaborateur: 'Collaborateur', manager: 'Manager', comptable: 'Comptable', admin: 'Admin' }

function RightsTab() {
  const [selectedProfil, setSelectedProfil] = useState('direction')
  const [moduleAccess, setModuleAccess] = useState({})
  const [selectedRole, setSelectedRole] = useState('manager')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const profil = PROFILS_METIER_BO[selectedProfil]
    if (profil && selectedProfil !== 'personnalise') {
      const access = {}
      BO_MODULES.forEach(m => { access[m.id] = profil.modules.includes(m.id) })
      setModuleAccess(access)
    }
  }, [selectedProfil])

  function toggleModule(moduleId) {
    setModuleAccess(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
    setSelectedProfil('personnalise')
    setSaved(false)
  }

  function selectProfil(profilId) {
    setSelectedProfil(profilId)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Sauvegarde dans role_permissions de l'environnement
      const records = []
      BO_MODULES.forEach(m => {
        const isOn = !!moduleAccess[m.id]
        records.push({
          role: selectedRole,
          module: m.id,
          sub_module: '*',
          can_view: isOn,
          can_create: isOn && ['manager','admin'].includes(selectedRole),
          can_edit: isOn && ['manager','admin'].includes(selectedRole),
          can_delete: isOn && ['admin'].includes(selectedRole),
        })
      })
      // Upsert
      for (const rec of records) {
        await supabase.from('role_permissions').upsert(rec, { onConflict: 'role,module,sub_module' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Erreur sauvegarde droits:', err)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = Object.values(moduleAccess).filter(Boolean).length

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🔐 Configuration des droits & profils métier</h2>
      <p style={{ color: '#64748b', fontSize: '.85rem', marginBottom: '1.5rem' }}>
        Configurez les profils métier et les modules accessibles par rôle. Ces paramètres s'appliquent à tous les environnements.
      </p>

      {/* Profil métier */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#1a2332', display: 'block', marginBottom: '.5rem' }}>Profil métier à configurer</label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {Object.entries(PROFILS_METIER_BO).map(([id, p]) => (
            <button key={id} onClick={() => selectProfil(id)} style={{
              padding: '.5rem 1rem', borderRadius: 8, border: '2px solid', cursor: 'pointer',
              borderColor: selectedProfil === id ? '#195C82' : '#e2e8f0',
              background: selectedProfil === id ? '#eef6fb' : '#fff',
              color: selectedProfil === id ? '#195C82' : '#64748b',
              fontWeight: 600, fontSize: '.82rem', transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: '.4rem'
            }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rôle */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#1a2332', display: 'block', marginBottom: '.5rem' }}>Rôle cible</label>
        <select value={selectedRole} onChange={e => { setSelectedRole(e.target.value); setSaved(false) }}
          style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.9rem', background: '#fff' }}>
          {BO_ROLES.map(r => <option key={r} value={r}>{BO_ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', fontWeight: 600, color: '#16a34a' }}>
          ✅ {activeCount} modules activés
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', fontWeight: 600, color: '#64748b' }}>
          {BO_MODULES.length - activeCount} désactivés
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saving} style={{
          padding: '.6rem 1.5rem', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: saved ? '#16a34a' : '#195C82', color: '#fff', fontWeight: 700, fontSize: '.85rem', transition: 'all .15s'
        }}>
          {saving ? '⏳ Sauvegarde...' : saved ? '✅ Enregistré !' : '💾 Enregistrer dans l\'environnement'}
        </button>
      </div>

      {/* Module grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.75rem' }}>
        {BO_MODULES.map(m => {
          const isOn = !!moduleAccess[m.id]
          return (
            <div key={m.id} onClick={() => toggleModule(m.id)} style={{
              display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem',
              borderRadius: 10, border: '1.5px solid', cursor: 'pointer', transition: 'all .15s',
              borderColor: isOn ? '#195C82' : '#e2e8f0', background: isOn ? '#eef6fb' : '#fff',
            }}>
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: isOn ? '#195C82' : '#94a3b8' }}>{m.label}</div>
              </div>
              <div style={{
                width: 36, height: 20, borderRadius: 10, padding: 2,
                background: isOn ? '#195C82' : '#e2e8f0', transition: 'background .2s',
                display: 'flex', alignItems: 'center',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transform: isOn ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Note super admin */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', fontSize: '.82rem', color: '#92400e' }}>
        ⚠️ <strong>Le rôle Super Admin</strong> ne peut être attribué que depuis ce backoffice. Il n'apparaît pas dans l'interface d'administration front-office.
      </div>
    </div>
  )
}

// ── Tabs config ──
const TABS = [
  { id: 'envs', label: 'Environnements', icon: '🌐' },
  { id: 'users', label: 'Utilisateurs & Acces', icon: '👥' },
  { id: 'messages', label: 'Messages', icon: '📬' },
  { id: 'inscriptions', label: 'Inscriptions', icon: '📋' },
  { id: 'integrations', label: 'Intégrations', icon: '🔌' },
  { id: 'imports', label: 'Import données', icon: '📥' },
  { id: 'tables', label: 'Tables', icon: '🗄' },
  { id: 'rights', label: 'Droits & Profils', icon: '🔐' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'deploy', label: 'Infrastructure', icon: '🏗' },
]

// ── Error Boundary pour capturer les crashs React ──
class BOErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[Backoffice crash]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'ui-monospace, monospace', background: '#fff', color: '#1e293b', minHeight: '100vh' }}>
          <h1 style={{ color: '#dc2626' }}>Backoffice crash</h1>
          <p><strong>Message :</strong> {this.state.error?.message}</p>
          <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: 11 }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Réessayer</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Page principale ──
function BackofficePageInner() {
  const [tab, setTab] = useState('envs')

  useEffect(() => { document.title = 'Admin TimeBlast' }, [])

  useEffect(() => {
    const prevUrl = getCurrentSupabaseUrl()
    if (prevUrl !== defaultUrl) {
      switchSupabaseClient(defaultUrl, defaultKey)
    }
  }, [])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        borderRadius: 16, padding: '2rem 2.5rem', marginBottom: 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 .25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'linear-gradient(135deg, #2B4C7E, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TimeBlast</span>
            <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>Backoffice</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '.85rem' }}>
            Gestion centralisee des environnements, utilisateurs et infrastructure
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontSize: '.8rem', fontFamily: 'monospace' }}>
            master: {defaultUrl.replace('https://', '').replace('.supabase.co', '')}
          </span>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '.65rem 1.25rem', background: tab === t.id ? '#fff' : 'transparent', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '.85rem', borderRadius: 8, flex: 1, transition: 'all .15s',
            color: tab === t.id ? '#1e293b' : '#94a3b8',
            boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'envs' && <EnvsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'messages' && <MessagesTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'imports' && <ImportsTab />}
      {tab === 'tables' && <TablesTab />}
      {tab === 'rights' && <RightsTab />}
      {tab === 'monitoring' && <MonitoringTab />}
      {tab === 'inscriptions' && <InscriptionsTab />}
      {tab === 'deploy' && <DeployTab />}
    </div>
  )
}

// Default export wrappant l'inner dans l'ErrorBoundary
export default function BackofficePage() {
  return <BOErrorBoundary><BackofficePageInner /></BOErrorBoundary>
}

// ── Modal generique pour afficher/gerer un message recu ──
function MessageDetailModal({ item, type, onClose, onDelete, onMarkRead, onMarkReplied }) {
  if (!item) return null
  const isContact = type === 'contact'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: 640, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                {isContact ? (item.name || '—') : [item.prenom, item.nom].filter(Boolean).join(' ')}
              </h2>
              <a href={`mailto:${item.email}`} style={{ color: '#2563eb', fontSize: '.9rem', textDecoration: 'none' }}>{item.email}</a>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '.8rem', color: '#64748b' }}>
                {item.telephone && <span>📞 {item.telephone}</span>}
                {item.company && <span>🏢 {item.company}</span>}
                <span>📅 {new Date(item.created_at).toLocaleString('fr-FR')}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8', padding: 0, lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Message</div>
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: 16, lineHeight: 1.7, fontSize: 14,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1e293b', border: '1px solid #e2e8f0',
          }}>
            {item.message || 'Aucun message.'}
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`mailto:${item.email}?subject=Re: ${isContact ? 'Demande de contact' : 'Demande d\'inscription'} TimeBlast`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#195C82', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            ✉️ Répondre
          </a>
          {isContact && onMarkRead && (
            <button onClick={() => onMarkRead(item)} style={S.btn}>
              {item.read ? '📬 Marquer non lu' : '📭 Marquer lu'}
            </button>
          )}
          {isContact && onMarkReplied && (
            <button onClick={() => onMarkReplied(item)} style={S.btn}>
              {item.replied ? '✅ Répondu' : '📋 Marquer répondu'}
            </button>
          )}
          {onDelete && (
            <button onClick={() => { if (confirm('Supprimer definitivement ?')) onDelete(item) }} style={S.btnDanger}>
              🗑 Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Inscriptions ──
function InscriptionsTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('inscriptions').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    await supabase.from('inscriptions').delete().eq('id', item.id)
    setSelected(null)
    load()
  }

  return (
    <div style={S.card}>
      <div style={{ ...S.cardPad, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📋 Demandes d'inscription</h3>
          <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: '#94a3b8' }}>{rows.length} demande{rows.length > 1 ? 's' : ''} reçue{rows.length > 1 ? 's' : ''} · cliquez sur une ligne pour voir le message complet</p>
        </div>
        <button onClick={load} style={S.btn}>🔄 Actualiser</button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Aucune demande pour l'instant.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Prénom', 'Nom', 'Email', 'Téléphone', 'Message', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setSelected(r)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{r.prenom}</td>
                  <td style={{ padding: '12px 16px', color: '#1e293b' }}>{r.nom}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`mailto:${r.email}`} style={{ color: '#195C82', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>{r.email}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.telephone || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.message}>{r.message || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '.8rem' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MessageDetailModal item={selected} type="inscription" onClose={() => setSelected(null)} onDelete={handleDelete} />
    </div>
  )
}

// ── Onglet Messages de contact ──
function MessagesTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    await supabase.from('contact_messages').delete().eq('id', item.id)
    setSelected(null)
    load()
  }
  async function handleMarkRead(item) {
    await supabase.from('contact_messages').update({ read: !item.read }).eq('id', item.id)
    const next = { ...item, read: !item.read }
    setSelected(next); load()
  }
  async function handleMarkReplied(item) {
    await supabase.from('contact_messages').update({ replied: !item.replied }).eq('id', item.id)
    const next = { ...item, replied: !item.replied }
    setSelected(next); load()
  }
  async function selectRow(msg) {
    setSelected(msg)
    if (!msg.read) {
      await supabase.from('contact_messages').update({ read: true }).eq('id', msg.id)
      setSelected({ ...msg, read: true })
      load()
    }
  }

  const filtered = rows.filter(m => filter === 'all' ? true : filter === 'unread' ? !m.read : m.read)
  const unreadCount = rows.filter(m => !m.read).length

  return (
    <div style={S.card}>
      <div style={{ ...S.cardPad, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📬 Messages de contact</h3>
          <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: '#94a3b8' }}>{rows.length} message{rows.length > 1 ? 's' : ''} · {unreadCount} non lu{unreadCount > 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'unread', 'read'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...S.btn, background: filter === f ? '#195C82' : '#fff', color: filter === f ? '#fff' : '#475569', border: filter === f ? 'none' : '1px solid #e2e8f0' }}>
              {f === 'all' ? `Tous (${rows.length})` : f === 'unread' ? `Non lus (${unreadCount})` : `Lus (${rows.length - unreadCount})`}
            </button>
          ))}
          <button onClick={load} style={S.btn}>🔄</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Aucun message.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['', 'Nom', 'Email', 'Entreprise', 'Message', 'Statut', 'Date'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => selectRow(r)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: r.read ? 'transparent' : '#fefce8', fontWeight: r.read ? 'normal' : '600' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = r.read ? 'transparent' : '#fefce8'}>
                  <td style={{ padding: '12px 16px', fontSize: 16 }}>{r.read ? '📭' : '📬'}</td>
                  <td style={{ padding: '12px 16px', color: '#1e293b' }}>{r.name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`mailto:${r.email}`} style={{ color: '#195C82', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>{r.email}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.company || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.message}>{r.message || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.replied && <span style={S.badge('#dcfce7', '#166534')}>Répondu</span>}
                      {!r.read && <span style={S.badge('#fef3c7', '#92400e')}>Nouveau</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '.8rem' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MessageDetailModal item={selected} type="contact" onClose={() => setSelected(null)} onDelete={handleDelete} onMarkRead={handleMarkRead} onMarkReplied={handleMarkReplied} />
    </div>
  )
}
