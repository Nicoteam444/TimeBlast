import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'
import Spinner from '../../components/Spinner'

// ── HoldingOrgChart ──────────────────────────────────────────────────────────

function HoldingOrgChart({ holding, groupes, societes }) {
  return (
    <div className="holding-chart-wrap">
      {/* Root: SRA TEST holding */}
      <div className="holding-node-root">
        <div style={{ fontSize: '1.5rem' }}>👑</div>
        <div className="holding-root-title">{holding.name}</div>
        <div className="holding-root-sub">Holding</div>
      </div>

      {/* Connector line */}
      <div className="holding-connector" />

      {/* Groups row */}
      <div className="holding-groups-row">
        {groupes.map(g => {
          const societesInGroupe = societes.filter(
            s => s.groupe_id === g.id && s.name !== 'SRA TEST'
          )
          return (
            <div key={g.id} className="holding-group-col">
              <div
                className="holding-group-header"
                style={{ background: g.color || '#1a5c82' }}
              >
                🏛 {g.name}
              </div>
              <div className="holding-group-body">
                {societesInGroupe.length === 0 ? (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', padding: '.25rem' }}>
                    Aucune société
                  </div>
                ) : (
                  societesInGroupe.map(s => {
                    const initials = s.name
                      .split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <div key={s.id} className="holding-societe-card">
                        <div
                          className="holding-societe-avatar"
                          style={{ background: g.color || '#1a5c82' }}
                        >
                          {initials}
                        </div>
                        <span>{s.name}</span>
                        {s.ville && (
                          <span className="holding-societe-ville">{s.ville}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}

        {/* Orphan societes (no groupe, not SRA TEST) */}
        {(() => {
          const orphans = societes.filter(s => !s.groupe_id && s.name !== 'SRA TEST')
          if (!orphans.length) return null
          return (
            <div key="orphans" className="holding-group-col">
              <div
                className="holding-group-header"
                style={{ background: '#64748b' }}
              >
                Sans groupe
              </div>
              <div className="holding-group-body">
                {orphans.map(s => {
                  const initials = s.name
                    .split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={s.id} className="holding-societe-card">
                      <div
                        className="holding-societe-avatar"
                        style={{ background: '#64748b' }}
                      >
                        {initials}
                      </div>
                      <span>{s.name}</span>
                      {s.ville && (
                        <span className="holding-societe-ville">{s.ville}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── AdminSocieteDetailPage ───────────────────────────────────────────────────

export default function AdminSocieteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setSegments, clearSegments } = useBreadcrumb() || {}

  const [societe, setSociete] = useState(null)
  const [stats, setStats] = useState({ users: 0, clients: 0, transactions: 0, projets: 0 })
  const [groupes, setGroupes] = useState([])
  const [allSocietes, setAllSocietes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Edit modal
  const [showEdit, setShowEdit] = useState(false)
  const [allGroupes, setAllGroupes] = useState([])
  const [form, setForm] = useState({ name: '', siren: '', ville: '', groupe_id: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => { load() }, [id])
  useEffect(() => () => clearSegments?.(), [])

  async function load() {
    setLoading(true)
    setError(null)

    // Fetch société
    const { data: s, error: sErr } = await supabase
      .from('societes').select('*, groupes(id, name, color)').eq('id', id).single()

    if (sErr || !s) {
      setError('Société introuvable.')
      setLoading(false)
      return
    }

    setSociete(s)
    if (s?.name && setSegments) {
      setSegments([{ id, label: s.name }])
    }

    // Fetch stats in parallel
    const [
      { count: userCount },
      { count: clientCount },
      { count: transCount },
      { count: projetCount },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('societe_id', id),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('societe_id', id),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('societe_id', id),
      supabase.from('projets').select('id', { count: 'exact', head: true }).eq('societe_id', id),
    ])

    setStats({
      users: userCount || 0,
      clients: clientCount || 0,
      transactions: transCount || 0,
      projets: projetCount || 0})

    // If holding, fetch all groupes + societes for org chart
    if (s.name === 'SRA TEST') {
      const [{ data: grp }, { data: socs }] = await Promise.all([
        supabase.from('groupes').select('id, name, color').order('name'),
        supabase.from('societes').select('id, name, ville, groupe_id').order('name'),
      ])
      setGroupes(grp || [])
      setAllSocietes(socs || [])
    }

    setLoading(false)
  }

  function openEdit() {
    setForm({
      name: societe.name || '',
      siren: societe.siren || '',
      ville: societe.ville || '',
      groupe_id: societe.groupe_id || ''})
    setFormError(null)
    // Fetch groupes for select
    supabase.from('groupes').select('id, name, color').order('name').then(({ data }) => {
      setAllGroupes(data || [])
    })
    setShowEdit(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Le nom est obligatoire'); return }
    setFormLoading(true)
    setFormError(null)

    const payload = {
      name: form.name.trim(),
      siren: form.siren.trim() || null,
      ville: form.ville.trim() || null,
      groupe_id: form.groupe_id || null}

    const { error: upErr } = await supabase.from('societes').update(payload).eq('id', id)
    setFormLoading(false)
    if (upErr) { setFormError(upErr.message); return }
    setShowEdit(false)
    load()
  }

  if (loading) {
    return (
      <div className="admin-page">
        <Spinner />
      </div>
    )
  }

  if (error || !societe) {
    return (
      <div className="admin-page">
        <p style={{ color: 'var(--danger)' }}>{error || 'Erreur inconnue'}</p>
        <button className="btn-secondary" onClick={() => navigate('/admin/societes')}>
          ← Retour aux sociétés
        </button>
      </div>
    )
  }

  const groupe = societe.groupes
  const avatarColor = groupe?.color || '#1a5c82'
  const initials = societe.name
    .split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const isHolding = societe.name === 'SRA TEST'

  return (
    <div className="admin-page">
      {/* Back button */}
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/admin/societes')}>
          ← Sociétés
        </button>
      </div>

      {/* Header */}
      <div className="societe-detail-header">
        <div className="societe-detail-avatar" style={{ background: avatarColor }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div className="societe-detail-name">{societe.name}</div>
          <div className="societe-detail-meta">
            {groupe && (
              <span
                className="status-badge"
                style={{
                  color: groupe.color,
                  background: groupe.color + '18',
                  fontSize: '.72rem',
                  fontWeight: 600}}
              >
                🏛 {groupe.name}
              </span>
            )}
            {societe.ville && (
              <span className="status-badge" style={{ fontSize: '.72rem' }}>
                📍 {societe.ville}
              </span>
            )}
            {societe.siren && (
              <span className="status-badge" style={{ fontSize: '.72rem', fontFamily: 'monospace' }}>
                SIREN: {societe.siren}
              </span>
            )}
            {isHolding && (
              <span className="status-badge" style={{ background: '#0d1b2420', color: '#0d1b24', fontSize: '.72rem', fontWeight: 700 }}>
                👑 Holding
              </span>
            )}
          </div>
        </div>
        <div className="societe-detail-actions">
          <button className="btn-secondary" onClick={openEdit}>✏ Modifier</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="societe-stat-row">
        <div className="societe-stat-chip">
          <span className="societe-stat-icon">👥</span>
          <div>
            <div className="societe-stat-val">{stats.users}</div>
            <div className="societe-stat-label">Utilisateurs</div>
          </div>
        </div>
        <div className="societe-stat-chip">
          <span className="societe-stat-icon">👤</span>
          <div>
            <div className="societe-stat-val">{stats.clients}</div>
            <div className="societe-stat-label">Clients</div>
          </div>
        </div>
        <div className="societe-stat-chip">
          <span className="societe-stat-icon">💼</span>
          <div>
            <div className="societe-stat-val">{stats.transactions}</div>
            <div className="societe-stat-label">Transactions</div>
          </div>
        </div>
        <div className="societe-stat-chip">
          <span className="societe-stat-icon">📁</span>
          <div>
            <div className="societe-stat-val">{stats.projets}</div>
            <div className="societe-stat-label">Projets</div>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3>Informations</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 2rem', padding: '1rem 1.25rem' }}>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>Nom légal</div>
            <div style={{ fontWeight: 600 }}>{societe.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>SIREN</div>
            <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{societe.siren || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>Ville / Siège</div>
            <div style={{ fontWeight: 600 }}>{societe.ville || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>Groupe</div>
            <div style={{ fontWeight: 600 }}>
              {groupe ? (
                <span style={{ color: groupe.color }}>{groupe.name}</span>
              ) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>Créée le</div>
            <div style={{ fontWeight: 600 }}>
              {societe.created_at
                ? new Date(societe.created_at).toLocaleDateString('fr-FR')
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Structure du groupe — only for holding */}
      {isHolding && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><h3>Structure du groupe</h3></div>
          <HoldingOrgChart
            holding={societe}
            groupes={groupes}
            societes={allSocietes}
          />
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifier la société</h2>
              <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="field">
                <label>Nom de la société *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>
              <div className="field">
                <label>SIREN</label>
                <input
                  type="text"
                  value={form.siren}
                  onChange={e => setForm(f => ({ ...f, siren: e.target.value }))}
                  maxLength={9}
                />
              </div>
              <div className="field">
                <label>Ville / Siège</label>
                <input
                  type="text"
                  value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Groupe</label>
                <select
                  value={form.groupe_id}
                  onChange={e => setForm(f => ({ ...f, groupe_id: e.target.value }))}
                >
                  <option value="">— Aucun groupe —</option>
                  {allGroupes.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
