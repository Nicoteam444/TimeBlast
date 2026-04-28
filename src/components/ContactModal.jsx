import React, { useEffect } from 'react'
import HubSpotForm from './HubSpotForm'

export default function ContactModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Formulaire de contact TimeBlast"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(11, 29, 49, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto',
        animation: 'tbContactFadeIn .2s ease-out',
      }}
    >
      <style>{`
        @keyframes tbContactFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tbContactSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20,
          padding: '2.5rem 2rem 2rem',
          maxWidth: 560, width: '100%',
          boxShadow: '0 24px 80px rgba(11, 29, 49, 0.45)',
          position: 'relative',
          animation: 'tbContactSlideUp .25s ease-out',
          maxHeight: 'calc(100vh - 4rem)',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(25, 92, 130, 0.08)',
            border: 'none', color: '#195C82',
            fontSize: '1.2rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25, 92, 130, 0.16)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(25, 92, 130, 0.08)' }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
          <h3 style={{
            margin: '0 0 .5rem', fontSize: '1.4rem', fontWeight: 800,
            color: '#0f172a', letterSpacing: '-0.02em',
          }}>
            Parlons de votre projet
          </h3>
          <p style={{
            margin: 0, fontSize: '.95rem', color: '#64748b', lineHeight: 1.55,
          }}>
            Laissez-nous vos coordonnées, on vous recontacte au plus vite.
          </p>
        </div>

        <HubSpotForm
          portalId="26870220"
          formId="2c5d0f37-c450-496e-ba75-76ec738fdf11"
          region="eu1"
        />
      </div>
    </div>
  )
}
