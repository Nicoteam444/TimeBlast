import { useState, useEffect } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

export default function AdminSocietesPage() {
  const navigate = useEnvNavigate()
  const [societes, setSocietes]       = useState([])
  const [groupes, setGroupes]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm]               = useState({ name: '', siren: '', adresse: '', ville: '', code_postal: '', groupe_id: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sqlMissing, setSqlMissing]   = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data, error }, { data: g }] = await Promise.all([
      supabase.from('societes').select('*, groupes(id, name, color)').order('name'),
      supabase.from('groupes').select('id, name, color').order('name'),
    ])
    if (error?.code === '42P01') { setSqlMissing(true); setLoading(false); return }
    setSocietes(data || [])
    setGroupes(g || [])
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', siren: '', adresse: '', ville: '', code_postal: '', groupe_id: '' })
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(s) {
    setEditItem(s)
    setForm({ name: s.name || '', siren: s.siren || '', adresse: s.adresse || '', ville: s.ville || '', code_postal: s.code_postal || '', groupe_id: s.groupe_id || '' })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Le nom est obligatoire'); return }
    setFormLoading(true)
    setFormError(null)

    const payload = {
      name: form.name.trim(),
      siren: form.siren.trim() || null,
      adresse: form.adresse.trim() || null,
      ville: form.ville.trim() || null,
      code_postal: form.code_postal.trim() || null,
      groupe_id: form.groupe_id || null}
    let error

    if (editItem) {
      ;({ error } = await supabase.from('societes').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('societes').insert(payload))
    }

    setFormLoading(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false)
    fetchAll()
  }

  async function handleDelete(id) {
    await supabase.from('societes').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchSocietes()
  }

  const SQL_CREATE = `-- Table sociétés
CREATE TABLE IF NOT EXISTS societes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name       text NOT NULL,
  siren      text,
  ville      text
);
ALTER TABLE societes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "societes_admin" ON societes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')));

-- Lien user → société
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);`

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(societes, 'name', 'asc')

  if (sqlMissing) {
    return (
      <div className="admin-page">
        <div className="admin-page-header"><h1>Sociétés</h1></div>
        <div className="fec-sql-box">
          <p>⚠ La table <code>societes</code> n'existe pas encore.<br />
          Exécutez ce SQL dans <strong>Supabase → SQL Editor</strong> :</p>
          <pre>{SQL_CREATE}</pre>
          <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(SQL_CREATE) }}>
            Copier le SQL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Sociétés</h1>
          <p>{societes.length} société{societes.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvelle société</button>
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Modifier la société' : 'Nouvelle société'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nom de la société *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : AXIS Solutions"
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
                  placeholder="Ex : 123456789"
                  maxLength={9}
                />
              </div>
              <div className="field">
                <label>Adresse</label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  placeholder="Ex : 12 rue de la Paix"
                />
              </div>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <div className="field" style={{ flex: 2 }}>
                  <label>Ville</label>
                  <input
                    type="text"
                    value={form.ville}
                    onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                    placeholder="Ex : Paris"
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Code postal</label>
                  <input
                    type="text"
                    value={form.code_postal}
                    onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))}
                    placeholder="75001"
                    maxLength={5}
                  />
                </div>
              </div>
              <div className="field">
                <label>Groupe</label>
                <select
                  value={form.groupe_id}
                  onChange={e => setForm(f => ({ ...f, groupe_id: e.target.value }))}
                >
                  <option value="">— Aucun groupe —</option>
                  {groupes.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {groupes.length === 0 && (
                  <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>
                    Créez d'abord un groupe dans <em>Admin → Groupes</em>.
                  </p>
                )}
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Enregistrement...' : (editItem ? 'Enregistrer' : 'Créer')}
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
            <div className="modal-header"><h2>Supprimer la société</h2></div>
            <p style={{ padding: '0 0 1.5rem' }}>
              Supprimer <strong>{deleteConfirm.name}</strong> ? Les utilisateurs liés à cette société ne seront pas supprimés mais leur lien sera effacé.
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
        <Spinner />
      ) : societes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢</p>
          <p style={{ fontWeight: 600, marginBottom: '.5rem' }}>Aucune société créée</p>
          <p style={{ fontSize: '.9rem', marginBottom: '1.5rem' }}>Créez votre première société pour activer le sélecteur dans la barre de navigation.</p>
          <button className="btn-primary" onClick={openCreate}>+ Créer une société</button>
        </div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader label="Société" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Groupe" field="groupes.name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="SIREN" field="siren" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Adresse" field="adresse" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Ville" field="ville" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Créée le" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(s => {
                const groupe = s.groupes
                return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/societes/' + s.id)}>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar" style={{ background: groupe?.color || 'var(--primary)', fontSize: '.75rem' }}>
                        {s.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                      <span className="user-name">{s.name}</span>
                    </div>
                  </td>
                  <td>
                    {groupe ? (
                      <span className="status-badge" style={{
                        color: groupe.color,
                        background: groupe.color + '18',
                        fontSize: '.72rem',
                        fontWeight: 600}}>
                        🏛 {groupe.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{s.siren || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{s.adresse || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{[s.ville, s.code_postal].filter(Boolean).join(' ') || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-sm btn-secondary" onClick={e => { e.stopPropagation(); openEdit(s) }}>✏ Modifier</button>
                    <button className="btn-icon btn-icon--danger" onClick={e => { e.stopPropagation(); setDeleteConfirm(s) }} title="Supprimer">🗑</button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
