import { useState } from 'react'

/**
 * Composant global de confirmation de suppression sécurisée.
 * L'utilisateur doit taper "SUPPRIMER" pour valider.
 * Réutilisable dans toute l'application.
 */
export default function ConfirmDeleteModal({ title, message, onConfirm, onCancel }) {
  const [input, setInput] = useState('')
  const isValid = input === 'SUPPRIMER'

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ color: '#dc2626' }}>🗑 {title || 'Confirmer la suppression'}</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: '#475569', lineHeight: 1.5 }}>
            {message || 'Cette action est irréversible.'}
          </p>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: '#991b1b', fontWeight: 600, marginBottom: '.5rem' }}>
              Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
            </p>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tapez SUPPRIMER"
              autoFocus
              style={{
                width: '100%',
                padding: '.5rem .75rem',
                border: `2px solid ${isValid ? '#16a34a' : '#fecaca'}`,
                borderRadius: 6,
                fontSize: '.95rem',
                fontWeight: 600,
                textAlign: 'center',
                letterSpacing: 1,
                outline: 'none',
                transition: 'border-color .15s'}}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onCancel}>Annuler</button>
            <button
              className="btn-danger"
              disabled={!isValid}
              onClick={onConfirm}
              style={{ opacity: isValid ? 1 : 0.4, cursor: isValid ? 'pointer' : 'not-allowed' }}
            >
              Supprimer définitivement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
