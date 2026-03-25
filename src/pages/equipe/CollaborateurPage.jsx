import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'
import Spinner from '../../components/Spinner'

/* ── helpers ── */
function calcAnciennete(dateEmbauche) {
  if (!dateEmbauche) return '—'
  const d = new Date(dateEmbauche + 'T12:00:00')
  const now = new Date()
  const totalMonths = Math.floor((now - d) / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} mois`
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`
}

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—'
  return val
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val + 'T12:00:00').toLocaleDateString('fr-FR')
}

const POSTE_COLOR = {
  'Directeur': '#1a5c82', 'DSI': '#1a5c82', 'DG': '#1a5c82',
  'PDG': '#0d1b24',
  'Chef de projet': '#6366f1', 'Directeur de projet': '#6366f1', 'PMO': '#6366f1',
  'Responsable': '#8b5cf6', 'Manager': '#8b5cf6',
  'Développeur': '#16a34a', 'Architecte': '#16a34a', 'Ingénieur': '#16a34a',
  'Consultant': '#f59e0b', 'Analyste': '#f59e0b',
  'Commercial': '#0ea5e9',
  'Comptable': '#8b5cf6', 'Contrôleur': '#8b5cf6',
}
function getColor(poste) {
  if (!poste) return '#64748b'
  for (const [k, v] of Object.entries(POSTE_COLOR)) {
    if (poste.includes(k)) return v
  }
  return '#64748b'
}

const CONTRAT_LABELS = {
  cdi: 'CDI', cdd: 'CDD', stage: 'Stage',
  alternance: 'Alternance', freelance: 'Freelance', autre: 'Autre',
}
const CONTRAT_COLORS = {
  cdi: '#16a34a', cdd: '#f59e0b', stage: '#6366f1',
  alternance: '#8b5cf6', freelance: '#0ea5e9', autre: '#64748b',
}

function Stars({ niveau }) {
  const n = Math.min(5, Math.max(0, Number(niveau) || 0))
  return (
    <span className="collab-skill-stars">
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

const DOC_ICONS = {
  contrat: '📄', avenant: '📝', fiche_poste: '📋',
  evaluation: '📊', autre: '📎',
}

const TABS = ['Infos générales', 'Contrat & RH', 'Compétences', 'Documents', 'Notes']

/* ── empty shapes ── */
const EMPTY_COLLAB = {
  prenom: '', nom: '', email: '', telephone: '', poste: '', departement: '',
  date_embauche: '', date_naissance: '', type_contrat: '', salaire_brut: '',
  temps_travail: '', manager_direct: '', adresse: '', ville: '', code_postal: '',
  pays: 'France', linkedin: '', actif: true,
  competences: [], documents: [], notes: '',
  conges_restants: '', jours_maladie: '',
}

/* ════════════════════════════════════════════ */
export default function CollaborateurPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setSegments, clearSegments } = useBreadcrumb()

  const [collab, setCollab]     = useState(null)
  const [societe, setSociete]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [tab, setTab]           = useState(0)
  const [salaryRevealed, setSalaryRevealed] = useState(false)

  /* edit modal */
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')

  /* notes */
  const [notesValue, setNotesValue] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesMsg, setNotesMsg] = useState('')

  /* skill add */
  const [skillForm, setSkillForm] = useState({ nom: '', niveau: 3, categorie: '' })
  const [skillAdding, setSkillAdding] = useState(false)

  /* doc add modal */
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docForm, setDocForm] = useState({ nom: '', type: 'contrat', date: '', url: '' })

  /* ── fetch ── */
  useEffect(() => { fetchCollab(); return () => clearSegments() }, [id])

  async function fetchCollab() {
    setLoading(true)
    const { data, error } = await supabase.from('equipe').select('*').eq('id', id).single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCollab(data)
    setNotesValue(data.notes || '')
    // Set breadcrumb with collaborator name
    const fullName = [data.prenom, data.nom].filter(Boolean).join(' ') || 'Collaborateur'
    setSegments([{ id: data.id, label: fullName }])
    if (data.societe_id) {
      const { data: soc } = await supabase.from('societes').select('id, name').eq('id', data.societe_id).single()
      setSociete(soc || null)
    }
    setLoading(false)
  }

  /* ── edit modal open ── */
  function openEdit() {
    setEditForm({ ...EMPTY_COLLAB, ...collab })
    setSaveError('')
    setEditOpen(true)
  }

  /* ── save edit ── */
  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = { ...editForm }
    // clean numeric fields
    if (payload.salaire_brut === '') payload.salaire_brut = null
    if (payload.temps_travail === '') payload.temps_travail = null
    if (payload.conges_restants === '') payload.conges_restants = null
    if (payload.jours_maladie === '') payload.jours_maladie = null
    const { error } = await supabase.from('equipe').update(payload).eq('id', id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setEditOpen(false)
    setSaving(false)
    fetchCollab()
  }

  /* ── save notes ── */
  async function saveNotes() {
    setNotesSaving(true)
    const { error } = await supabase.from('equipe').update({ notes: notesValue }).eq('id', id)
    setNotesSaving(false)
    setNotesMsg(error ? 'Erreur lors de la sauvegarde.' : 'Notes sauvegardées.')
    setTimeout(() => setNotesMsg(''), 2500)
    if (!error) setCollab(prev => ({ ...prev, notes: notesValue }))
  }

  /* ── add skill ── */
  async function addSkill(e) {
    e.preventDefault()
    if (!skillForm.nom.trim()) return
    const current = Array.isArray(collab.competences) ? collab.competences : []
    const updated = [...current, { nom: skillForm.nom.trim(), niveau: Number(skillForm.niveau), categorie: skillForm.categorie.trim() }]
    const { error } = await supabase.from('equipe').update({ competences: updated }).eq('id', id)
    if (!error) {
      setCollab(prev => ({ ...prev, competences: updated }))
      setSkillForm({ nom: '', niveau: 3, categorie: '' })
      setSkillAdding(false)
    }
  }

  /* ── remove skill ── */
  async function removeSkill(idx) {
    const updated = (collab.competences || []).filter((_, i) => i !== idx)
    const { error } = await supabase.from('equipe').update({ competences: updated }).eq('id', id)
    if (!error) setCollab(prev => ({ ...prev, competences: updated }))
  }

  /* ── add document ── */
  async function addDocument(e) {
    e.preventDefault()
    const current = Array.isArray(collab.documents) ? collab.documents : []
    const updated = [...current, { nom: docForm.nom.trim(), type: docForm.type, date: docForm.date, url: docForm.url.trim() }]
    const { error } = await supabase.from('equipe').update({ documents: updated }).eq('id', id)
    if (!error) {
      setCollab(prev => ({ ...prev, documents: updated }))
      setDocForm({ nom: '', type: 'contrat', date: '', url: '' })
      setDocModalOpen(false)
    }
  }

  /* ── remove document ── */
  async function removeDocument(idx) {
    const updated = (collab.documents || []).filter((_, i) => i !== idx)
    const { error } = await supabase.from('equipe').update({ documents: updated }).eq('id', id)
    if (!error) setCollab(prev => ({ ...prev, documents: updated }))
  }

  /* ── render states ── */
  if (loading) return <div className="admin-page"><Spinner /></div>

  if (notFound) return (
    <div className="admin-page" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ marginBottom: '.5rem' }}>Collaborateur introuvable</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Ce dossier n'existe pas ou a été supprimé.</p>
      <button className="btn-secondary" onClick={() => navigate(-1)}>← Retour</button>
    </div>
  )

  const color = getColor(collab.poste)
  const initials = `${(collab.prenom || '')[0] || ''}${(collab.nom || '')[0] || ''}`.toUpperCase()
  const typeContrat = collab.type_contrat ? (CONTRAT_LABELS[collab.type_contrat] || collab.type_contrat) : null
  const contratColor = CONTRAT_COLORS[collab.type_contrat] || '#64748b'

  /* skill groups */
  const skills = Array.isArray(collab.competences) ? collab.competences : []
  const skillGroups = skills.reduce((acc, s) => {
    const cat = s.categorie || 'Autres'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const docs = Array.isArray(collab.documents) ? collab.documents : []

  return (
    <div className="admin-page">

      {/* ── HEADER ── */}
      <div className="collab-header">
        <div className="collab-header-avatar" style={{ background: color + '22', border: `2.5px solid ${color}` }}>
          <span style={{ color, fontWeight: 700 }}>{initials || '?'}</span>
        </div>
        <div className="collab-header-info">
          <div className="collab-header-name">{collab.prenom} {collab.nom}</div>
          <div className="collab-header-meta">
            {collab.poste && (
              <span className="status-badge" style={{ color, background: color + '18', fontSize: '.8rem' }}>{collab.poste}</span>
            )}
            {societe && (
              <span className="status-badge" style={{ color: 'var(--primary)', background: 'var(--primary-light)', fontSize: '.8rem' }}>{societe.name}</span>
            )}
            <span className="status-badge" style={{
              color: collab.actif !== false ? '#16a34a' : '#dc2626',
              background: collab.actif !== false ? '#f0fdf4' : '#fef2f2',
              fontSize: '.8rem'
            }}>
              {collab.actif !== false ? 'Actif' : 'Inactif'}
            </span>
          </div>
          {collab.departement && (
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{collab.departement}</div>
          )}
        </div>
        <div className="collab-header-actions">
          <button className="btn-secondary btn-sm" onClick={() => navigate(-1)}>← Retour</button>
          <button className="btn-primary btn-sm" onClick={openEdit}>✏️ Modifier</button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="collab-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`collab-tab${tab === i ? ' collab-tab--active' : ''}`}
            onClick={() => setTab(i)}
          >{t}</button>
        ))}
      </div>

      {/* ══ TAB 0 : Infos générales ══ */}
      {tab === 0 && (
        <div className="collab-section-card">
          <div className="collab-section-title">Informations personnelles</div>
          <div className="collab-info-grid">
            <div className="collab-info-item">
              <span className="collab-info-label">Email</span>
              <span className="collab-info-value">
                {collab.email
                  ? <a href={`mailto:${collab.email}`}>{collab.email}</a>
                  : '—'}
              </span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">Téléphone</span>
              <span className="collab-info-value">{fmt(collab.telephone)}</span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">Date de naissance</span>
              <span className="collab-info-value">{fmtDate(collab.date_naissance)}</span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">LinkedIn</span>
              <span className="collab-info-value">
                {collab.linkedin
                  ? <a href={collab.linkedin} target="_blank" rel="noopener noreferrer">Voir le profil ↗</a>
                  : '—'}
              </span>
            </div>
            <div className="collab-info-item" style={{ gridColumn: '1 / -1' }}>
              <span className="collab-info-label">Adresse</span>
              <span className="collab-info-value">
                {[collab.adresse, collab.code_postal && collab.ville ? `${collab.code_postal} ${collab.ville}` : (collab.ville || collab.code_postal), collab.pays || 'France'].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">Ville</span>
              <span className="collab-info-value">{fmt(collab.ville)}</span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">Code postal</span>
              <span className="collab-info-value">{fmt(collab.code_postal)}</span>
            </div>
            <div className="collab-info-item">
              <span className="collab-info-label">Pays</span>
              <span className="collab-info-value">{collab.pays || 'France'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 1 : Contrat & RH ══ */}
      {tab === 1 && (
        <>
          <div className="collab-section-card">
            <div className="collab-section-title">Contrat</div>
            <div className="collab-info-grid">
              <div className="collab-info-item">
                <span className="collab-info-label">Type de contrat</span>
                <span className="collab-info-value">
                  {typeContrat
                    ? <span className="status-badge" style={{ color: contratColor, background: contratColor + '18' }}>{typeContrat}</span>
                    : '—'}
                </span>
              </div>
              <div className="collab-info-item">
                <span className="collab-info-label">Date d'embauche</span>
                <span className="collab-info-value">
                  {collab.date_embauche
                    ? `${fmtDate(collab.date_embauche)} (${calcAnciennete(collab.date_embauche)})`
                    : '—'}
                </span>
              </div>
              {['cdd', 'stage'].includes(collab.type_contrat) && (
                <div className="collab-info-item">
                  <span className="collab-info-label">Date de fin</span>
                  <span className="collab-info-value">{fmtDate(collab.date_fin)}</span>
                </div>
              )}
              <div className="collab-info-item">
                <span className="collab-info-label">Temps de travail</span>
                <span className="collab-info-value">
                  {collab.temps_travail != null
                    ? (Number(collab.temps_travail) >= 100
                        ? 'Temps plein (100%)'
                        : `Temps partiel (${collab.temps_travail}%)`)
                    : '—'}
                </span>
              </div>
              <div className="collab-info-item">
                <span className="collab-info-label">Salaire brut annuel</span>
                <span className="collab-info-value">
                  {collab.salaire_brut != null ? (
                    <span
                      className={`salary-mask${salaryRevealed ? ' salary-mask--reveal' : ''}`}
                      onClick={() => setSalaryRevealed(r => !r)}
                      title={salaryRevealed ? 'Cliquer pour masquer' : 'Cliquer pour révéler'}
                    >
                      {Number(collab.salaire_brut).toLocaleString('fr-FR')} €
                    </span>
                  ) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="collab-section-card">
            <div className="collab-section-title">Organisation</div>
            <div className="collab-info-grid">
              <div className="collab-info-item">
                <span className="collab-info-label">Manager direct</span>
                <span className="collab-info-value">{fmt(collab.manager_direct)}</span>
              </div>
              <div className="collab-info-item">
                <span className="collab-info-label">Département / Service</span>
                <span className="collab-info-value">{fmt(collab.departement)}</span>
              </div>
            </div>
          </div>

          <div className="collab-section-card">
            <div className="collab-section-title">Compteurs</div>
            <div className="collab-info-grid">
              <div className="collab-info-item">
                <span className="collab-info-label">Congés restants</span>
                <span className="collab-info-value">
                  {collab.conges_restants != null
                    ? <span className="status-badge" style={{ color: '#16a34a', background: '#f0fdf4' }}>{collab.conges_restants} jour{collab.conges_restants > 1 ? 's' : ''}</span>
                    : '—'}
                </span>
              </div>
              <div className="collab-info-item">
                <span className="collab-info-label">Jours maladie</span>
                <span className="collab-info-value">
                  {collab.jours_maladie != null
                    ? <span className="status-badge" style={{ color: '#f59e0b', background: '#fffbeb' }}>{collab.jours_maladie} jour{collab.jours_maladie > 1 ? 's' : ''}</span>
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ TAB 2 : Compétences ══ */}
      {tab === 2 && (
        <div className="collab-section-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="collab-section-title" style={{ marginBottom: 0 }}>Compétences</div>
            <button className="btn-secondary btn-sm" onClick={() => setSkillAdding(a => !a)}>
              {skillAdding ? 'Annuler' : '+ Ajouter'}
            </button>
          </div>

          {skillAdding && (
            <form onSubmit={addSkill} style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
              <input
                className="field"
                placeholder="Compétence *"
                value={skillForm.nom}
                onChange={e => setSkillForm(f => ({ ...f, nom: e.target.value }))}
                style={{ flex: '1 1 150px' }}
                required
              />
              <input
                className="field"
                placeholder="Catégorie"
                value={skillForm.categorie}
                onChange={e => setSkillForm(f => ({ ...f, categorie: e.target.value }))}
                style={{ flex: '1 1 120px' }}
              />
              <select
                className="field"
                value={skillForm.niveau}
                onChange={e => setSkillForm(f => ({ ...f, niveau: e.target.value }))}
                style={{ flex: '0 0 auto' }}
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>)}
              </select>
              <button className="btn-primary btn-sm" type="submit">Ajouter</button>
            </form>
          )}

          {skills.length === 0 && !skillAdding && (
            <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>Aucune compétence renseignée.</p>
          )}

          {Object.entries(skillGroups).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: '.5rem' }}>{cat}</div>
              {items.map((s, i) => {
                const realIdx = skills.findIndex(x => x === s)
                return (
                  <div key={i} className="collab-skill-row">
                    <span style={{ fontSize: '.9rem' }}>{s.nom}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <Stars niveau={s.niveau} />
                      <button
                        className="btn-icon"
                        title="Supprimer"
                        onClick={() => removeSkill(realIdx)}
                        style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB 3 : Documents ══ */}
      {tab === 3 && (
        <div className="collab-section-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="collab-section-title" style={{ marginBottom: 0 }}>Documents</div>
            <button className="btn-secondary btn-sm" onClick={() => setDocModalOpen(true)}>+ Ajouter</button>
          </div>

          {docs.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>Aucun document renseigné.</p>
          )}

          {docs.map((doc, i) => (
            <div key={i} className="collab-doc-row">
              <span className="collab-doc-icon">{DOC_ICONS[doc.type] || '📎'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.9rem', fontWeight: 600 }}>{doc.nom}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                  {CONTRAT_LABELS[doc.type] || doc.type}
                  {doc.date ? ` · ${fmtDate(doc.date)}` : ''}
                </div>
              </div>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">⬇ Ouvrir</a>
              )}
              <button
                className="btn-icon"
                title="Supprimer"
                onClick={() => removeDocument(i)}
                style={{ color: 'var(--text-muted)' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB 4 : Notes ══ */}
      {tab === 4 && (
        <div className="collab-section-card">
          <div className="collab-section-title">Notes internes</div>
          <textarea
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            rows={10}
            style={{ width: '100%', resize: 'vertical', padding: '.75rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.9rem', fontFamily: 'inherit', marginBottom: '1rem', background: 'var(--bg)', color: 'var(--text)' }}
            placeholder="Notes libres sur ce collaborateur…"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-primary btn-sm" onClick={saveNotes} disabled={notesSaving}>
              {notesSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            {notesMsg && <span style={{ fontSize: '.83rem', color: notesMsg.includes('Erreur') ? 'var(--error)' : 'var(--success)' }}>{notesMsg}</span>}
          </div>
        </div>
      )}

      {/* ══ MODAL EDIT ══ */}
      {editOpen && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal" style={{ maxWidth: 640, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modifier le collaborateur</h3>
              <button className="modal-close" onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Prénom</label>
                  <input className="field" value={editForm.prenom || ''} onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nom</label>
                  <input className="field" value={editForm.nom || ''} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</label>
                  <input className="field" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Téléphone</label>
                  <input className="field" value={editForm.telephone || ''} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Poste</label>
                  <input className="field" value={editForm.poste || ''} onChange={e => setEditForm(f => ({ ...f, poste: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Département</label>
                  <input className="field" value={editForm.departement || ''} onChange={e => setEditForm(f => ({ ...f, departement: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date d'embauche</label>
                  <input className="field" type="date" value={editForm.date_embauche || ''} onChange={e => setEditForm(f => ({ ...f, date_embauche: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date de naissance</label>
                  <input className="field" type="date" value={editForm.date_naissance || ''} onChange={e => setEditForm(f => ({ ...f, date_naissance: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type de contrat</label>
                  <select className="field" value={editForm.type_contrat || ''} onChange={e => setEditForm(f => ({ ...f, type_contrat: e.target.value }))}>
                    <option value="">—</option>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="stage">Stage</option>
                    <option value="alternance">Alternance</option>
                    <option value="freelance">Freelance</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Salaire brut annuel (€)</label>
                  <input className="field" type="number" step="100" value={editForm.salaire_brut || ''} onChange={e => setEditForm(f => ({ ...f, salaire_brut: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Temps de travail (%)</label>
                  <input className="field" type="number" min="0" max="100" value={editForm.temps_travail || ''} onChange={e => setEditForm(f => ({ ...f, temps_travail: e.target.value }))} placeholder="100" />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Manager direct</label>
                  <input className="field" value={editForm.manager_direct || ''} onChange={e => setEditForm(f => ({ ...f, manager_direct: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Adresse</label>
                  <input className="field" value={editForm.adresse || ''} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ville</label>
                  <input className="field" value={editForm.ville || ''} onChange={e => setEditForm(f => ({ ...f, ville: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Code postal</label>
                  <input className="field" value={editForm.code_postal || ''} onChange={e => setEditForm(f => ({ ...f, code_postal: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Pays</label>
                  <input className="field" value={editForm.pays || ''} onChange={e => setEditForm(f => ({ ...f, pays: e.target.value }))} placeholder="France" />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>LinkedIn (URL)</label>
                  <input className="field" type="url" value={editForm.linkedin || ''} onChange={e => setEditForm(f => ({ ...f, linkedin: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Congés restants (jours)</label>
                  <input className="field" type="number" min="0" value={editForm.conges_restants ?? ''} onChange={e => setEditForm(f => ({ ...f, conges_restants: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Jours maladie</label>
                  <input className="field" type="number" min="0" value={editForm.jours_maladie ?? ''} onChange={e => setEditForm(f => ({ ...f, jours_maladie: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <input
                    id="actif-check"
                    type="checkbox"
                    checked={editForm.actif !== false}
                    onChange={e => setEditForm(f => ({ ...f, actif: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  <label htmlFor="actif-check" style={{ fontSize: '.9rem', fontWeight: 600 }}>Collaborateur actif</label>
                </div>
              </div>
              {saveError && <div className="error" style={{ margin: '0 1.25rem' }}>{saveError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL DOC ══ */}
      {docModalOpen && (
        <div className="modal-overlay" onClick={() => setDocModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter un document</h3>
              <button className="modal-close" onClick={() => setDocModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={addDocument}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nom du document *</label>
                  <input className="field" required value={docForm.nom} onChange={e => setDocForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex. Contrat de travail CDI" />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type</label>
                  <select className="field" value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="contrat">Contrat</option>
                    <option value="avenant">Avenant</option>
                    <option value="fiche_poste">Fiche de poste</option>
                    <option value="evaluation">Évaluation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date</label>
                  <input className="field" type="date" value={docForm.date} onChange={e => setDocForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>URL (lien de téléchargement)</label>
                  <input className="field" type="url" value={docForm.url} onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setDocModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
