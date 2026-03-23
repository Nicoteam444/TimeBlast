import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const PALETTE = [
  '#1a5c82', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#22c55e', '#14b8a6', '#0ea5e9', '#ef4444', '#f97316',
  '#64748b', '#0d1b24',
]

const SQL_MIGRATION = `-- ══════════════════════════════════════════
-- GROUPES — Migration SQL à exécuter une fois
-- ══════════════════════════════════════════

-- 1. Table des groupes
CREATE TABLE IF NOT EXISTS groupes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#1a5c82'
);
ALTER TABLE groupes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groupes_select" ON groupes FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "groupes_admin" ON groupes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Lier les sociétés à un groupe
ALTER TABLE societes
  ADD COLUMN IF NOT EXISTS groupe_id uuid REFERENCES groupes(id) ON DELETE SET NULL;

-- 3. Lier les utilisateurs à un groupe (optionnel, peut être inféré depuis la société)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS groupe_id uuid REFERENCES groupes(id) ON DELETE SET NULL;`

const EMPTY_FORM = { name: '', description: '', color: '#1a5c82' }

export default function AdminGroupesPage() {
  const [groupes, setGroupes]         = useState([])
  const [societes, setSocietes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [sqlMissing, setSqlMissing]   = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: g, error }, { data: s }] = await Promise.all([
      supabase.from('groupes').select('*').order('name'),
      supabase.from('societes').select('id, name, groupe_id').order('name'),
    ])
    if (error?.code === '42P01') { setSqlMissing(true); setLoading(false); return }
    setGroupes(g || [])
    setSocietes(s || [])
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(g) {
    setEditItem(g)
    setForm({ name: g.name || '', description: g.description || '', color: g.color || '#1a5c82' })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Le nom est obligatoire'); return }
    setSaving(true)
    setFormError(null)
    const payload = { name: form.name.trim(), description: form.description.trim() || null, color: form.color }
    const { error } = editItem
      ? await supabase.from('groupes').update(payload).eq('id', editItem.id)
      : await supabase.from('groupes').insert(payload)
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false)
    fetchAll()
  }

  async function handleDelete(id) {
    await supabase.from('groupes').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchAll()
  }

  function copySql() {
    navigator.clipboard.writeText(SQL_MIGRATION)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Nb de sociétés par groupe
  const societesParGroupe = useMemo(() => {
    const map = {}
    for (const s of societes) {
      if (s.groupe_id) map[s.groupe_id] = (map[s.groupe_id] || []).concat(s.name)
    }
    return map
  }, [societes])

  if (sqlMissing) return (
    <div className="admin-page">
      <div className="admin-page-header"><h1>Groupes</h1></div>
      <div className="fec-sql-box">
        <p>⚠ La table <code>groupes</code> n'existe pas encore.<br />
          Exécutez cette migration SQL dans <strong>Supabase → SQL Editor</strong> :
        </p>
        <pre style={{ fontSize: '.76rem', maxHeight: 320, overflow: 'auto' }}>{SQL_MIGRATION}</pre>
        <button className="btn-secondary" onClick={copySql}>
          {copied ? '✓ Copié !' : 'Copier le SQL'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="admin-page">

      <div className="admin-page-header">
        <div>
          <h1>Groupes</h1>
          <p>{groupes.length} groupe{groupes.length !== 1 ? 's' : ''} · {societes.filter(s => s.groupe_id).length} sociétés assignées</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouveau groupe</button>
      </div>

      {/* Bloc SQL migration (première fois) */}
      <div className="fec-sql-box" style={{ marginBottom: '1.5rem' }}>
        <p style={{ marginBottom: '.5rem', fontSize: '.82rem' }}>
          💡 Si la migration n'est pas encore effectuée, exécutez ce SQL dans Supabase :
        </p>
        <pre style={{ fontSize: '.73rem', maxHeight: 120, overflow: 'auto', marginBottom: '.5rem' }}>{SQL_MIGRATION}</pre>
        <button className="btn-secondary" style={{ fontSize: '.78rem' }} onClick={copySql}>
          {copied ? '✓ Copié !' : '📋 Copier le SQL'}
        </button>
      </div>

      {/* Modal création / édition */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier le groupe' : 'Nouveau groupe'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nom du groupe *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : Groupe Altéa, Holding Nord…"
                  autoFocus
                  required
                />
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description courte (optionnel)"
                />
              </div>
              <div className="field">
                <label>Couleur</label>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c,
                        border: form.color === c ? '3px solid #0d1b24' : '2px solid transparent',
                        cursor: 'pointer', outline: 'none', boxShadow: form.color === c ? '0 0 0 2px #fff, 0 0 0 4px ' + c : 'none',
                        transition: 'all .15s',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Couleur personnalisée"
                  />
                </div>
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : (editItem ? 'Enregistrer' : 'Créer le groupe')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Supprimer le groupe</h2></div>
            <p style={{ padding: '0 0 1rem' }}>
              Supprimer <strong>{deleteConfirm.name}</strong> ?<br />
              <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                Les sociétés liées ne seront pas supprimées, leur lien sera effacé.
              </span>
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="loading-inline">Chargement…</div>
      ) : groupes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛</div>
          <p style={{ fontWeight: 600, marginBottom: '.5rem', color: 'var(--text)' }}>Aucun groupe créé</p>
          <p style={{ fontSize: '.9rem', marginBottom: '1.5rem' }}>
            Les groupes permettent de regrouper plusieurs sociétés sous une même entité (holding, client groupe…).
          </p>
          <button className="btn-primary" onClick={openCreate}>+ Créer un groupe</button>
        </div>
      ) : (
        <div className="groupe-cards">
          {groupes.map(g => {
            const members = societesParGroupe[g.id] || []
            return (
              <div key={g.id} className="groupe-card">
                {/* Bandeau couleur */}
                <div className="groupe-card-bar" style={{ background: g.color || '#1a5c82' }} />
                <div className="groupe-card-body">
                  <div className="groupe-card-header">
                    <div>
                      <div className="groupe-card-name">{g.name}</div>
                      {g.description && <div className="groupe-card-desc">{g.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0 }}>
                      <button className="btn-icon" title="Modifier" onClick={() => openEdit(g)}>✏️</button>
                      <button className="btn-icon btn-icon--danger" title="Supprimer" onClick={() => setDeleteConfirm(g)}>🗑</button>
                    </div>
                  </div>

                  <div className="groupe-card-societes">
                    {members.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', fontStyle: 'italic' }}>
                        Aucune société assignée
                      </span>
                    ) : (
                      members.map(name => (
                        <span key={name} className="groupe-societe-chip" style={{ borderColor: g.color + '60', color: g.color }}>
                          🏢 {name}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="groupe-card-footer">
                    <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>
                      {members.length} société{members.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>
                      Créé le {new Date(g.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
