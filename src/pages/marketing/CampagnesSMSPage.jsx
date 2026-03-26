import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS campagnes_sms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  message text,
  destinataires_ids jsonb DEFAULT '[]',
  nb_destinataires int DEFAULT 0,
  date_envoi timestamptz,
  statut text DEFAULT 'brouillon',
  nb_envoyes int DEFAULT 0,
  nb_livres int DEFAULT 0,
  taux_livraison numeric(5,2) DEFAULT 0
);
ALTER TABLE campagnes_sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campagnes_sms_all" ON campagnes_sms FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));`

const STATUTS = [
  { value: 'brouillon',  label: 'Brouillon',   color: '#94a3b8', bg: '#f8fafc' },
  { value: 'programmee', label: 'Programm\u00e9e', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'envoyee',    label: 'Envoy\u00e9e',    color: '#f59e0b', bg: '#fffbeb' },
  { value: 'terminee',   label: 'Termin\u00e9e',   color: '#22c55e', bg: '#f0fdf4' },
]

const EMPTY_FORM = {
  nom: '',
  message: '',
  destinataires_ids: [],
  date_envoi: '',
  statut: 'brouillon'}

function statutInfo(v) {
  return STATUTS.find(s => s.value === v) || { value: v, label: v || '\u2014', color: '#64748b', bg: '#f8fafc' }
}

function fmtDate(d) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function truncate(str, max) {
  if (!str) return '\u2014'
  return str.length > max ? str.slice(0, max) + '\u2026' : str
}

export default function CampagnesSMSPage() {
  const [campagnes, setCampagnes] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [showPreview, setShowPreview] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchCampagnes()
    fetchContacts()
  }, [])

  async function fetchCampagnes() {
    setLoading(true)
    setMigrationNeeded(false)
    setError(null)
    let query = supabase
      .from('campagnes_sms').select('*').order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') {
        setMigrationNeeded(true)
      } else {
        setError(error.message)
      }
      setCampagnes([])
    } else {
      setCampagnes(data || [])
    }
    setLoading(false)
  }

  async function fetchContacts() {
    let query = supabase
      .from('contacts').select('id, nom, prenom, telephone').not('telephone', 'is', null).neq('telephone', '').order('nom', { ascending: true })
    const { data } = await query
    setContacts(data || [])
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(c) {
    setEditingId(c.id)
    setForm({
      nom:                c.nom || '',
      message:            c.message || '',
      destinataires_ids:  c.destinataires_ids || [],
      date_envoi:         c.date_envoi ? c.date_envoi.slice(0, 16) : '',
      statut:             c.statut || 'brouillon'})
    setFormError(null)
    setShowModal(true)
  }

  function openDuplicate(c) {
    setEditingId(null)
    setForm({
      nom:                (c.nom || '') + ' (copie)',
      message:            c.message || '',
      destinataires_ids:  c.destinataires_ids || [],
      date_envoi:         '',
      statut:             'brouillon'})
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleDestinataire(contactId) {
    setForm(f => {
      const ids = f.destinataires_ids || []
      if (ids.includes(contactId)) {
        return { ...f, destinataires_ids: ids.filter(id => id !== contactId) }
      }
      return { ...f, destinataires_ids: [...ids, contactId] }
    })
  }

  function selectAllDestinataires() {
    setForm(f => {
      if (f.destinataires_ids.length === contacts.length) {
        return { ...f, destinataires_ids: [] }
      }
      return { ...f, destinataires_ids: contacts.map(c => c.id) }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const payload = {
      nom:               form.nom,
      message:           form.message || null,
      destinataires_ids: form.destinataires_ids,
      nb_destinataires:  form.destinataires_ids.length,
      date_envoi:        form.date_envoi || null,
      statut:            form.statut}
    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('campagnes_sms').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase.from('campagnes_sms').insert(payload))
    }
    setSaving(false)
    if (err) { setFormError(err.message); return }
    closeModal()
    fetchCampagnes()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('campagnes_sms').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setDeleteId(null)
    fetchCampagnes()
  }

  async function handleEnvoyer(c) {
    const { error } = await supabase
      .from('campagnes_sms').update({
        statut: 'envoyee',
        date_envoi: new Date().toISOString(),
        nb_envoyes: c.nb_destinataires,
        nb_livres: c.nb_destinataires,
        taux_livraison: 100}).eq('id', c.id)
    if (error) { setError(error.message); return }
    fetchCampagnes()
  }

  function handleCopy() {
    navigator.clipboard.writeText(SQL_MIGRATION).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return campagnes.filter(c => {
      if (q && !c.nom.toLowerCase().includes(q) && !(c.message || '').toLowerCase().includes(q)) return false
      if (filterStatut && c.statut !== filterStatut) return false
      return true
    })
  }, [campagnes, search, filterStatut])

  const kpiTotal    = campagnes.length
  const kpiEnvoyees = campagnes.filter(c => c.statut === 'envoyee' || c.statut === 'terminee').length
  const kpiSMS      = campagnes.reduce((s, c) => s + (c.nb_envoyes || 0), 0)
  const campagnesAvecTaux = campagnes.filter(c => c.taux_livraison > 0)
  const kpiTaux     = campagnesAvecTaux.length > 0
    ? campagnesAvecTaux.reduce((s, c) => s + parseFloat(c.taux_livraison || 0), 0) / campagnesAvecTaux.length
    : 0

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Campagnes SMS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {filtered.length} campagne{filtered.length !== 1 ? 's' : ''}
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nouvelle campagne</button>
      </div>

      {/* Migration banner */}
      {migrationNeeded && (
        <div style={{ margin: '1rem 1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>
            Table <code>campagnes_sms</code> introuvable — lancez la migration SQL suivante dans Supabase :
          </p>
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#1e293b', color: '#e2e8f0', borderRadius: 8,
              padding: '1rem', fontSize: '.8rem', overflowX: 'auto',
              lineHeight: 1.6, margin: 0}}>{SQL_MIGRATION}</pre>
            <button
              onClick={handleCopy}
              style={{
                position: 'absolute', top: '.5rem', right: '.5rem',
                background: copied ? '#16a34a' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6, color: '#fff', fontSize: '.75rem',
                padding: '.25rem .65rem', cursor: 'pointer', transition: 'background .15s'}}
            >{copied ? 'Copi\u00e9 !' : 'Copier'}</button>
          </div>
        </div>
      )}

      {/* General error */}
      {error && (
        <div style={{ margin: '1rem 1.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {!migrationNeeded && (
        <>
          {/* KPI bar */}
          <div className="produit-kpi-bar">
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{kpiTotal}</span>
              <span className="produit-kpi-label">Campagnes SMS</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#f59e0b' }}>{kpiEnvoyees}</span>
              <span className="produit-kpi-label">Envoy\u00e9es</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: 'var(--primary)' }}>{kpiSMS}</span>
              <span className="produit-kpi-label">SMS envoy\u00e9s</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#22c55e' }}>{kpiTaux.toFixed(1)} %</span>
              <span className="produit-kpi-label">Taux livraison moy.</span>
            </div>
          </div>

          {/* Filters */}
          <div className="table-toolbar">
            <input
              className="table-search"
              type="text"
              placeholder="Rechercher par nom ou message..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="table-select"
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
            >
              <option value="">Tous statuts</option>
              {STATUTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <Spinner />
          ) : (
            <div style={{ padding: '0 1.5rem 2rem', overflowX: 'auto' }}>
              <table className="users-table" style={{ minWidth: 920 }}>
                <thead>
                  <tr>
                    <th>Nom campagne</th>
                    <th>Message</th>
                    <th style={{ textAlign: 'center' }}>Destinataires</th>
                    <th>Statut</th>
                    <th>Date envoi</th>
                    <th style={{ textAlign: 'right' }}>SMS envoy\u00e9s</th>
                    <th style={{ textAlign: 'right' }}>Taux livraison</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const si = statutInfo(c.statut)
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.nom}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '.85rem', maxWidth: 220 }}>
                          {truncate(c.message, 50)}
                        </td>
                        <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                          {c.nb_destinataires || 0}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '.2rem .6rem',
                            borderRadius: 20,
                            fontSize: '.78rem',
                            fontWeight: 600,
                            color: si.color,
                            background: si.bg,
                            border: `1px solid ${si.color}25`}}>{si.label}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                          {fmtDate(c.date_envoi)}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {c.nb_envoyes || 0}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {c.taux_livraison != null ? `${parseFloat(c.taux_livraison).toFixed(1)} %` : '\u2014'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '.25rem .55rem', fontSize: '.78rem' }}
                              onClick={() => openEdit(c)}
                            >Modifier</button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '.25rem .55rem', fontSize: '.78rem' }}
                              onClick={() => openDuplicate(c)}
                            >Dupliquer</button>
                            {(c.statut === 'brouillon' || c.statut === 'programmee') && (
                              <button
                                style={{
                                  padding: '.25rem .55rem', fontSize: '.78rem',
                                  background: '#3b82f6', border: '1px solid #3b82f6',
                                  color: '#fff', borderRadius: 6, cursor: 'pointer',
                                  fontWeight: 500}}
                                onClick={() => handleEnvoyer(c)}
                              >Envoyer</button>
                            )}
                            <button
                              style={{
                                padding: '.25rem .55rem', fontSize: '.78rem',
                                background: 'transparent', border: '1px solid #fca5a5',
                                color: '#dc2626', borderRadius: 6, cursor: 'pointer'}}
                              onClick={() => setDeleteId(c.id)}
                            >Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucune campagne SMS trouv\u00e9e.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier la campagne' : 'Nouvelle campagne SMS'}</h2>
              <button className="modal-close" onClick={closeModal}>{'\u2715'}</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="field">
                <label>Nom de la campagne <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setField('nom', e.target.value)}
                  placeholder="Ex : Promo \u00e9t\u00e9 2026"
                  required
                  autoFocus={!editingId}
                />
              </div>

              {/* Message SMS with character counter */}
              <div className="field">
                <label>Message SMS</label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={form.message}
                    onChange={e => {
                      if (e.target.value.length <= 160) setField('message', e.target.value)
                    }}
                    placeholder="Saisissez votre message SMS (160 caract\u00e8res max)..."
                    rows={3}
                    maxLength={160}
                    style={{
                      resize: 'vertical', fontFamily: 'inherit', fontSize: '.9rem',
                      padding: '.625rem .875rem', border: '1px solid var(--border)',
                      borderRadius: 8, outline: 'none', width: '100%'}}
                  />
                  <div style={{
                    textAlign: 'right', fontSize: '.78rem', marginTop: '.25rem',
                    color: form.message.length >= 150 ? '#dc2626' : 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums'}}>
                    {form.message.length} / 160 caract\u00e8res
                  </div>
                </div>
              </div>

              {/* SMS Preview */}
              {form.message && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '.5rem', display: 'block' }}>
                    Aper\u00e7u SMS
                  </label>
                  <div style={{
                    width: 260, margin: '0 auto',
                    background: '#1e1e1e', borderRadius: 28, padding: '40px 12px 28px',
                    boxShadow: '0 8px 32px rgba(0,0,0,.18)',
                    position: 'relative'}}>
                    {/* Phone notch */}
                    <div style={{
                      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                      width: 80, height: 6, borderRadius: 3, background: '#333'}} />
                    {/* Screen area */}
                    <div style={{
                      background: '#f0f0f0', borderRadius: 18, padding: '1rem .75rem',
                      minHeight: 160, display: 'flex', flexDirection: 'column',
                      justifyContent: 'flex-start'}}>
                      {/* Header */}
                      <div style={{
                        textAlign: 'center', fontSize: '.7rem', color: '#999',
                        marginBottom: '.75rem', fontWeight: 600}}>Messages</div>
                      {/* Message bubble */}
                      <div style={{
                        background: '#e2e2e2', borderRadius: '16px 16px 16px 4px',
                        padding: '.6rem .8rem', fontSize: '.8rem', lineHeight: 1.4,
                        color: '#1a1a1a', maxWidth: '90%', wordBreak: 'break-word'}}>
                        {form.message}
                      </div>
                      <div style={{ fontSize: '.65rem', color: '#aaa', marginTop: '.25rem' }}>
                        {form.date_envoi
                          ? new Date(form.date_envoi).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'Maintenant'}
                      </div>
                    </div>
                    {/* Home bar */}
                    <div style={{
                      width: 80, height: 4, borderRadius: 2, background: '#555',
                      margin: '10px auto 0'}} />
                  </div>
                </div>
              )}

              {/* Destinataires */}
              <div className="field">
                <label>
                  Destinataires ({(form.destinataires_ids || []).length} s\u00e9lectionn\u00e9{(form.destinataires_ids || []).length !== 1 ? 's' : ''})
                </label>
                {contacts.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '.2rem .6rem', fontSize: '.78rem' }}
                        onClick={selectAllDestinataires}
                      >
                        {form.destinataires_ids.length === contacts.length ? 'D\u00e9s\u00e9lectionner tout' : 'Tout s\u00e9lectionner'}
                      </button>
                    </div>
                    <div style={{
                      maxHeight: 180, overflowY: 'auto',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '.5rem'}}>
                      {contacts.map(ct => (
                        <label
                          key={ct.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '.5rem',
                            padding: '.3rem .4rem', cursor: 'pointer', borderRadius: 6,
                            background: (form.destinataires_ids || []).includes(ct.id) ? 'var(--primary-light)' : 'transparent',
                            fontSize: '.85rem'}}
                        >
                          <input
                            type="checkbox"
                            checked={(form.destinataires_ids || []).includes(ct.id)}
                            onChange={() => toggleDestinataire(ct.id)}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 500 }}>
                            {ct.prenom ? `${ct.prenom} ${ct.nom}` : ct.nom}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>
                            {ct.telephone}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                    Aucun contact avec num\u00e9ro de t\u00e9l\u00e9phone trouv\u00e9.
                  </p>
                )}
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Date d'envoi programm\u00e9</label>
                  <input
                    type="datetime-local"
                    value={form.date_envoi}
                    onChange={e => setField('date_envoi', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setField('statut', e.target.value)}>
                    {STATUTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p style={{ color: 'var(--error)', fontSize: '.875rem', marginBottom: '.5rem' }}>
                  {formError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Cr\u00e9er')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer cette campagne ?</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>{'\u2715'}</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Cette action est irr\u00e9versible. La campagne sera d\u00e9finitivement supprim\u00e9e.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button
                className="btn-primary"
                style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={() => handleDelete(deleteId)}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
