import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'

function fmtK(n) {
  if (!n) return '0 €'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' K€'
  return Math.round(n) + ' €'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PHASE_META = {
  nouveau: { label: 'Nouveau', color: '#94a3b8', bg: '#f1f5f9' },
  contacte: { label: 'Contacté', color: '#3b82f6', bg: '#eff6ff' },
  qualifie: { label: 'Qualifié', color: '#06b6d4', bg: '#ecfeff' },
  proposition: { label: 'Proposition', color: '#f59e0b', bg: '#fffbeb' },
  negoce: { label: 'Négociation', color: '#8b5cf6', bg: '#faf5ff' },
  gagne: { label: 'Gagné', color: '#22c55e', bg: '#f0fdf4' },
  perdu: { label: 'Perdu', color: '#ef4444', bg: '#fef2f2' },
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setSegments, clearSegments } = useBreadcrumb() || {}
  const [contact, setContact] = useState(null)
  const [entreprise, setEntreprise] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => { loadContact() }, [id])
  useEffect(() => () => clearSegments?.(), [])

  async function loadContact() {
    setLoading(true)
    const { data } = await supabase.from('contacts').select('*').eq('id', id).single()
    setContact(data)
    if (data?.entreprise_id) {
      const { data: ent } = await supabase.from('clients').select('*').eq('id', data.entreprise_id).single()
      setEntreprise(ent)
    }
    const { data: l } = await supabase.from('leads').select('*').eq('contact_id', id).order('created_at', { ascending: false })
    setLeads(l || [])
    setLoading(false)
    if (data && setSegments) {
      const fullName = [data.prenom, data.nom].filter(Boolean).join(' ')
      setSegments([{ id, label: fullName || 'Contact' }])
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    await supabase.from('contacts').update({
      nom: form.get('nom'),
      prenom: form.get('prenom'),
      email: form.get('email'),
      telephone: form.get('telephone'),
      poste: form.get('poste'),
      linkedin: form.get('linkedin'),
      notes: form.get('notes'),
    }).eq('id', id)
    setEditing(false)
    loadContact()
  }

  if (loading) return <div className="admin-page"><p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Chargement…</p></div>
  if (!contact) return <div className="admin-page"><p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Contact introuvable</p></div>

  const totalPipeline = leads.filter(l => !['perdu', 'gagne'].includes(l.phase)).reduce((s, l) => s + (l.montant_estime || 0), 0)
  const totalGagne = leads.filter(l => l.phase === 'gagne').reduce((s, l) => s + (l.montant_estime || 0), 0)

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/crm/contacts')} style={{ padding: '.4rem .7rem' }}>← Retour</button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              👤 {contact.prenom} {contact.nom}
              <span className="fac-statut-badge" style={{
                color: contact.statut === 'actif' ? '#22c55e' : '#94a3b8',
                background: contact.statut === 'actif' ? '#f0fdf4' : '#f1f5f9',
                fontSize: '.75rem',
              }}>{contact.statut === 'actif' ? 'Actif' : 'Inactif'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
              {contact.poste}{contact.poste && entreprise ? ' · ' : ''}{entreprise?.name || ''}
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setEditing(!editing)}>
          {editing ? '✕ Annuler' : '✏️ Modifier'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
        {/* Infos contact */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.75rem' }}>📋 Informations</h3>
          {editing ? (
            <form onSubmit={handleSave}>
              {[
                { name: 'prenom', label: 'Prénom', value: contact.prenom },
                { name: 'nom', label: 'Nom', value: contact.nom },
                { name: 'email', label: 'Email', value: contact.email },
                { name: 'telephone', label: 'Téléphone', value: contact.telephone },
                { name: 'poste', label: 'Poste', value: contact.poste },
                { name: 'linkedin', label: 'LinkedIn', value: contact.linkedin },
              ].map(f => (
                <div key={f.name} style={{ marginBottom: '.5rem' }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '.15rem' }}>{f.label}</label>
                  <input name={f.name} defaultValue={f.value || ''} style={{ width: '100%', padding: '.4rem .6rem', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '.85rem' }} />
                </div>
              ))}
              <div style={{ marginBottom: '.5rem' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '.15rem' }}>Notes</label>
                <textarea name="notes" defaultValue={contact.notes || ''} rows={3} style={{ width: '100%', padding: '.4rem .6rem', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '.85rem' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '.5rem' }}>💾 Enregistrer</button>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: '.5rem' }}>
              {[
                { label: '📧 Email', value: contact.email, link: contact.email ? `mailto:${contact.email}` : null },
                { label: '📞 Téléphone', value: contact.telephone },
                { label: '💼 Poste', value: contact.poste },
                { label: '🔗 LinkedIn', value: contact.linkedin, link: contact.linkedin },
                { label: '🏢 Entreprise', value: entreprise?.name },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', fontSize: '.88rem' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>{f.label}</span>
                  {f.link ? (
                    <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>{f.value || '—'}</a>
                  ) : (
                    <span style={{ fontWeight: 500 }}>{f.value || '—'}</span>
                  )}
                </div>
              ))}
              {contact.notes && (
                <div style={{ marginTop: '.5rem', padding: '.5rem .75rem', background: 'var(--bg)', borderRadius: 8, fontSize: '.85rem', color: 'var(--text-muted)' }}>
                  {contact.notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats + Leads */}
        <div>
          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leads</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#8b5cf6' }}>{leads.length}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>{fmtK(totalPipeline)}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gagné</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>{fmtK(totalGagne)}</div>
            </div>
          </div>

          {/* Leads list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.75rem' }}>🎯 Leads associés</h3>
            {leads.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Aucun lead pour ce contact</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {leads.map(l => {
                  const pm = PHASE_META[l.phase] || PHASE_META.nouveau
                  return (
                    <div key={l.id} style={{
                      padding: '.6rem .85rem', border: '1px solid var(--border)', borderRadius: 8,
                      borderLeft: `3px solid ${pm.color}`, cursor: 'pointer',
                    }} onClick={() => navigate('/crm/leads')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{l.titre}</span>
                        <span className="fac-statut-badge" style={{ color: pm.color, background: pm.bg, fontSize: '.72rem' }}>{pm.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '.25rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                        <span>{fmtK(l.montant_estime)}</span>
                        {l.date_relance && <span>📅 {fmtDate(l.date_relance)}</span>}
                        {l.source && <span>📍 {l.source}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
