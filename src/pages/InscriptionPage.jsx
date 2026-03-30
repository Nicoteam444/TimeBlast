import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function InscriptionPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.prenom || !form.nom || !form.email) {
      setError('Veuillez remplir les champs obligatoires.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.from('inscriptions').insert({
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim().toLowerCase(),
      telephone: form.telephone.trim() || null,
      message: form.message.trim() || null,
    })
    setLoading(false)
    if (err) { setError("Une erreur est survenue, veuillez réessayer."); return }
    setSuccess(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ padding: '1.2rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(25,92,130,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer' }} onClick={() => navigate('/login')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#195C82,#2d9cdb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#195C82', letterSpacing: '-.02em' }}>TimeBlast</span>
        </div>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: '1px solid #195C82', color: '#195C82', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
          Se connecter
        </button>
      </nav>

      {/* Contenu */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {success ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: '3rem 2.5rem', textAlign: 'center', boxShadow: '0 8px 40px rgba(25,92,130,0.10)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#195C82,#2d9cdb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2332', marginBottom: '.75rem' }}>Demande envoyée !</h2>
              <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
                Merci <strong>{form.prenom}</strong>, nous avons bien reçu votre demande.<br/>
                Notre équipe vous contactera sous 24h.
              </p>
              <button onClick={() => navigate('/login')} style={{ background: 'linear-gradient(135deg,#195C82,#2d9cdb)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', cursor: 'pointer', fontWeight: 600, fontSize: '.95rem' }}>
                Retour à l'accueil
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem 2.5rem', boxShadow: '0 8px 40px rgba(25,92,130,0.10)' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#195C82,#2d9cdb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a2332', marginBottom: '.4rem', letterSpacing: '-.02em' }}>Demande d'accès</h1>
                <p style={{ color: '#64748b', fontSize: '.9rem' }}>Remplissez ce formulaire et nous vous recontactons rapidement.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Prénom + Nom côte à côte */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Prénom <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Jean" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nom <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input name="nom" value={form.nom} onChange={handleChange} placeholder="Dupont" required style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Adresse e-mail <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@entreprise.fr" required style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="+33 6 00 00 00 00" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} placeholder="Décrivez votre besoin, la taille de votre équipe..." rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                {error && (
                  <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10, padding: '12px 16px', color: '#c53030', fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg,#195C82,#2d9cdb)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', marginTop: '.5rem', transition: 'all .2s', boxShadow: loading ? 'none' : '0 4px 16px rgba(25,92,130,0.25)' }}>
                  {loading ? 'Envoi en cours…' : 'Envoyer ma demande'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '.8rem', color: '#94a3b8', marginTop: '.25rem' }}>
                  Vous avez déjà un compte ?{' '}
                  <span onClick={() => navigate('/login')} style={{ color: '#195C82', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
                    Se connecter
                  </span>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '.82rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
  letterSpacing: '.01em',
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  fontSize: '.9rem',
  color: '#1a2332',
  background: '#f8fafc',
  outline: 'none',
  transition: 'border-color .2s',
  boxSizing: 'border-box',
}
