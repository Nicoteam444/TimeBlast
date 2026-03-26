import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

const STATUTS = [
  { id: 'actif', label: 'Actif', color: '#22c55e', bg: '#f0fdf4' },
  { id: 'inactif', label: 'Inactif', color: '#94a3b8', bg: '#f1f5f9' },
  { id: 'archive', label: 'Archivé', color: '#f59e0b', bg: '#fffbeb' },
]

const CHAMP_TYPES = [
  { id: 'text', label: 'Texte' },
  { id: 'email', label: 'Email' },
  { id: 'tel', label: 'Téléphone' },
  { id: 'select', label: 'Liste déroulante' },
  { id: 'textarea', label: 'Zone de texte' },
  { id: 'checkbox', label: 'Case à cocher' },
]

export default function FormulairesPage() {
  const [formulaires, setFormulaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')
  const [tableExists, setTableExists] = useState(true)

  useEffect(() => { loadFormulaires() }, [])

  async function loadFormulaires() {
    setLoading(true)
    let q = supabase.from('formulaires').select('*').order('created_at', { ascending: false })
    if (sid) q = q.eq('societe_id', sid)
    const { data, error } = await q
    if (error?.code === '42P01') { setTableExists(false); setLoading(false); return }
    setFormulaires(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return formulaires
    const q = search.toLowerCase()
    return formulaires.filter(f => f.nom?.toLowerCase().includes(q))
  }, [formulaires, search])

  const kpis = useMemo(() => ({
    total: formulaires.length,
    actifs: formulaires.filter(f => f.statut === 'actif').length,
    soumissions: formulaires.reduce((s, f) => s + (f.nb_soumissions || 0), 0),
    tauxConversion: formulaires.length > 0
      ? (formulaires.reduce((s, f) => s + (f.nb_soumissions || 0), 0) / Math.max(1, formulaires.reduce((s, f) => s + (f.nb_vues || 0), 0)) * 100)
      : 0}), [formulaires])

  async function handleSave(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    const champs = modal?.champs || []
    const payload = {
      nom: form.get('nom'),
      description: form.get('description'),
      statut: form.get('statut'),
      champs: JSON.stringify(champs),
      redirect_url: form.get('redirect_url'),
      notification_email: form.get('notification_email')}
    if (modal?.id) {
      await supabase.from('formulaires').update(payload).eq('id', modal.id)
    } else {
      await supabase.from('formulaires').insert(payload)
    }
    setModal(null); loadFormulaires()
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce formulaire ?')) return
    await supabase.from('formulaires').delete().eq('id', id)
    loadFormulaires()
  }

  function handleDuplicate(f) {
    setModal({ ...f, id: null, nom: f.nom + ' (copie)', champs: typeof f.champs === 'string' ? JSON.parse(f.champs || '[]') : (f.champs || []) })
  }

  function addChamp() {
    setModal(prev => ({
      ...prev,
      champs: [...(prev.champs || []), { id: Date.now(), label: '', type: 'text', required: false, options: '' }]}))
  }

  function updateChamp(id, field, val) {
    setModal(prev => ({
      ...prev,
      champs: (prev.champs || []).map(c => c.id === id ? { ...c, [field]: val } : c)}))
  }

  function removeChamp(id) {
    setModal(prev => ({ ...prev, champs: (prev.champs || []).filter(c => c.id !== id) }))
  }

  if (!tableExists) return (
    <div className="admin-page">
      <div className="admin-page-header"><div><h1>📝 Formulaires</h1></div></div>
      <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 12, padding: '2rem', maxWidth: 700 }}>
        <h3 style={{ color: '#92400e', marginBottom: '.75rem' }}>Table "formulaires" introuvable</h3>
        <p style={{ color: '#78350f', marginBottom: '1rem', lineHeight: 1.6 }}>
          Exécutez la migration SQL dans Supabase SQL Editor.
        </p>
        <pre style={{ background: '#1a1a2e', color: '#e2e8f0', padding: '1rem', borderRadius: 8, fontSize: '.8rem', overflowX: 'auto' }}>{`CREATE TABLE IF NOT EXISTS formulaires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  description text,
  champs jsonb DEFAULT '[]',
  statut text DEFAULT 'actif',
  redirect_url text,
  notification_email text,
  nb_vues int DEFAULT 0,
  nb_soumissions int DEFAULT 0
);
ALTER TABLE formulaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "formulaires_all" ON formulaires FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));`}</pre>
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>📝 Formulaires</h1>
          <p>{formulaires.length} formulaire{formulaires.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ champs: [{ id: Date.now(), label: 'Nom', type: 'text', required: true }, { id: Date.now() + 1, label: 'Email', type: 'email', required: true }, { id: Date.now() + 2, label: 'Téléphone', type: 'tel', required: false }, { id: Date.now() + 3, label: 'Message', type: 'textarea', required: false }] })}>+ Nouveau formulaire</button>
      </div>

      {/* KPIs */}
      <div className="produit-kpi-bar" style={{ marginBottom: '1rem' }}>
        <div className="produit-kpi-chip" style={{ borderColor: '#1a5c82' }}><span className="produit-kpi-label" style={{ color: '#1a5c82' }}>Total</span><span className="produit-kpi-val">{kpis.total}</span></div>
        <div className="produit-kpi-chip" style={{ borderColor: '#22c55e' }}><span className="produit-kpi-label" style={{ color: '#22c55e' }}>Actifs</span><span className="produit-kpi-val">{kpis.actifs}</span></div>
        <div className="produit-kpi-chip" style={{ borderColor: '#8b5cf6' }}><span className="produit-kpi-label" style={{ color: '#8b5cf6' }}>Soumissions</span><span className="produit-kpi-val">{kpis.soumissions}</span></div>
        <div className="produit-kpi-chip" style={{ borderColor: '#f59e0b' }}><span className="produit-kpi-label" style={{ color: '#f59e0b' }}>Taux conversion</span><span className="produit-kpi-val">{kpis.tauxConversion.toFixed(1)}%</span></div>
      </div>

      <div className="table-toolbar"><input className="table-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" /></div>

      <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="users-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Formulaire</th>
              <th>Description</th>
              <th style={{ textAlign: 'center' }}>Champs</th>
              <th>Statut</th>
              <th style={{ textAlign: 'center' }}>Vues</th>
              <th style={{ textAlign: 'center' }}>Soumissions</th>
              <th style={{ textAlign: 'center' }}>Taux</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><Spinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucun formulaire</td></tr>
            ) : filtered.map(f => {
              const champs = typeof f.champs === 'string' ? JSON.parse(f.champs || '[]') : (f.champs || [])
              const sm = STATUTS.find(s => s.id === f.statut) || STATUTS[0]
              const taux = f.nb_vues > 0 ? ((f.nb_soumissions || 0) / f.nb_vues * 100).toFixed(1) : '—'
              return (
                <tr key={f.id} className="users-table-row">
                  <td style={{ fontWeight: 600 }}>{f.nom}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{champs.length}</td>
                  <td><span className="fac-statut-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span></td>
                  <td style={{ textAlign: 'center' }}>{f.nb_vues || 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{f.nb_soumissions || 0}</td>
                  <td style={{ textAlign: 'center' }}>{taux}%</td>
                  <td>
                    <button className="btn-icon" title="Prévisualiser" onClick={() => setPreview(f)}>👁</button>
                    <button className="btn-icon" title="Modifier" onClick={() => setModal({ ...f, champs })}>✏️</button>
                    <button className="btn-icon" title="Dupliquer" onClick={() => handleDuplicate(f)}>📋</button>
                    <button className="btn-icon" title="Supprimer" onClick={() => handleDelete(f.id)}>🗑</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="plan-modal-overlay" onClick={() => setPreview(null)}>
          <div className="plan-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="plan-modal-header">
              <h3>Aperçu : {preview.nom}</h3>
              <button className="plan-modal-close" onClick={() => setPreview(null)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {preview.description && <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '.9rem' }}>{preview.description}</p>}
              {(typeof preview.champs === 'string' ? JSON.parse(preview.champs || '[]') : (preview.champs || [])).map((c, i) => (
                <div key={i} style={{ marginBottom: '.75rem' }}>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: '.25rem' }}>
                    {c.label} {c.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {c.type === 'textarea' ? (
                    <textarea disabled rows={3} style={{ width: '100%', padding: '.5rem', border: '1.5px solid var(--border)', borderRadius: 8 }} placeholder={c.label} />
                  ) : c.type === 'select' ? (
                    <select disabled style={{ width: '100%', padding: '.5rem', border: '1.5px solid var(--border)', borderRadius: 8 }}>
                      <option>— Sélectionner —</option>
                      {(c.options || '').split(',').map((o, j) => <option key={j}>{o.trim()}</option>)}
                    </select>
                  ) : c.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
                      <input type="checkbox" disabled /> {c.label}
                    </label>
                  ) : (
                    <input disabled type={c.type} style={{ width: '100%', padding: '.5rem', border: '1.5px solid var(--border)', borderRadius: 8 }} placeholder={c.label} />
                  )}
                </div>
              ))}
              <button className="btn-primary" disabled style={{ marginTop: '.5rem', width: '100%' }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {modal && (
        <div className="plan-modal-overlay" onClick={() => setModal(null)}>
          <div className="fac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="plan-modal-header">
              <h3>{modal.id ? 'Modifier le formulaire' : 'Nouveau formulaire'}</h3>
              <button className="plan-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
                <div className="fac-field"><label>Nom *</label><input name="nom" defaultValue={modal.nom || ''} required /></div>
                <div className="fac-field"><label>Statut</label><select name="statut" defaultValue={modal.statut || 'actif'}>{STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              </div>
              <div className="fac-field" style={{ marginBottom: '.75rem' }}><label>Description</label><input name="description" defaultValue={modal.description || ''} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
                <div className="fac-field"><label>URL de redirection</label><input name="redirect_url" defaultValue={modal.redirect_url || ''} placeholder="https://..." /></div>
                <div className="fac-field"><label>Email notification</label><input name="notification_email" defaultValue={modal.notification_email || ''} type="email" /></div>
              </div>

              <div style={{ marginBottom: '.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '.85rem', fontWeight: 700 }}>📋 Champs du formulaire</h4>
                <button type="button" className="btn-secondary" style={{ fontSize: '.78rem' }} onClick={addChamp}>+ Ajouter un champ</button>
              </div>

              {(modal.champs || []).map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginBottom: '.4rem', padding: '.4rem .5rem', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', width: 20 }}>{i + 1}</span>
                  <input value={c.label} onChange={e => updateChamp(c.id, 'label', e.target.value)} placeholder="Label" style={{ flex: 1, padding: '.3rem .5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem' }} />
                  <select value={c.type} onChange={e => updateChamp(c.id, 'type', e.target.value)} style={{ padding: '.3rem .4rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.8rem' }}>
                    {CHAMP_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  {c.type === 'select' && (
                    <input value={c.options || ''} onChange={e => updateChamp(c.id, 'options', e.target.value)} placeholder="Option1, Option2…" style={{ width: 140, padding: '.3rem .5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.8rem' }} />
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.2rem', fontSize: '.75rem', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={c.required} onChange={e => updateChamp(c.id, 'required', e.target.checked)} /> Requis
                  </label>
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem' }} onClick={() => removeChamp(c.id)}>✕</button>
                </div>
              ))}

              <div className="plan-modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary">💾 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
