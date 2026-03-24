import { useState } from 'react'
import {
  sendInvoiceByEmail,
  generateAndSaveUBLXml,
  createClientAccessToken,
  downloadXmlFile,
} from '../lib/invoiceDistribution'

export default function InvoiceDistributionModal({ invoice, company, client, onClose }) {
  const [method, setMethod] = useState('email')
  const [recipientEmail, setRecipientEmail] = useState(invoice?.client_email || client?.email || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [customMessage, setCustomMessage] = useState('')

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setError('Veuillez entrer une adresse email')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generate PDF (would use existing pdfGenerator)
      const result = await sendInvoiceByEmail(
        invoice.id,
        recipientEmail,
        null, // PDF URL would be generated separately
        { customMessage }
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(result.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateXML = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await generateAndSaveUBLXml(invoice, company, client)

      if (result.success) {
        downloadXmlFile(result.xml, `facture-${invoice.num_facture}.xml`)
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setError(result.error || 'Erreur lors de la génération du XML')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePortalAccess = async () => {
    if (!recipientEmail) {
      setError('Veuillez entrer une adresse email')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await createClientAccessToken(invoice.id, recipientEmail)

      if (result.success) {
        const portalUrl = `${window.location.origin}/client/invoice/${invoice.id}?token=${result.token}`
        // Copy to clipboard
        navigator.clipboard.writeText(portalUrl)
        setSuccess(true)
        setError(null)
        // Could show the URL to user
        alert(`Lien copié dans le presse-papiers:\n${portalUrl}`)
      } else {
        setError(result.error || 'Erreur lors de la création du lien')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 style={{ marginBottom: '1.5rem' }}>📬 Envoyer la facture</h2>

        {success && (
          <div className="alert alert-success">
            ✓ Facture envoyée avec succès !
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            ✕ {error}
          </div>
        )}

        {/* Method selector */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>
            Méthode d'envoi
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { id: 'email', label: '📧 Email', desc: 'Envoyer par email' },
              { id: 'xml', label: '📄 XML UBL', desc: 'Télécharger le XML' },
              { id: 'portal', label: '🔗 Portail Client', desc: 'Lien d\'accès' },
              { id: 'chorus', label: '🏛️ Chorus Pro', desc: 'Transmission à l\'État' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  padding: '1rem',
                  border: `2px solid ${method === m.id ? '#195C82' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background: method === m.id ? '#f0f5f9' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all .2s',
                }}
                disabled={m.id === 'chorus'} // Not implemented yet
              >
                <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>{m.label}</div>
                <div style={{ fontSize: '.8rem', color: '#64748b' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Email input */}
        {(method === 'email' || method === 'portal') && (
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Email du destinataire</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
              className="form-control"
            />
          </div>
        )}

        {/* Custom message */}
        {method === 'email' && (
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Message personnalisé (optionnel)</label>
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Ajoutez un message personnel..."
              className="form-control"
              rows="4"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        )}

        {/* Info boxes */}
        {method === 'email' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '.9rem',
            color: '#166534',
          }}>
            <strong>💡 Email :</strong> La facture PDF sera envoyée directement au client avec un lien de suivi.
          </div>
        )}

        {method === 'xml' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '.9rem',
            color: '#166534',
          }}>
            <strong>💡 XML UBL :</strong> Vous allez télécharger le fichier XML au format UBL 2.1. Vous pourrez le partager via email ou vos systèmes internes.
          </div>
        )}

        {method === 'portal' && (
          <div style={{
            background: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '.9rem',
            color: '#0c4a6e',
          }}>
            <strong>💡 Portail Client :</strong> Le client recevra un lien unique pour accéder à la facture sans créer de compte.
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>

          <button
            onClick={
              method === 'email'
                ? handleSendEmail
                : method === 'xml'
                ? handleGenerateXML
                : method === 'portal'
                ? handleCreatePortalAccess
                : null
            }
            className="btn btn-primary"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Traitement...' : method === 'xml' ? '📥 Télécharger' : '✓ Envoyer'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #94a3b8;
          transition: color 0.2s;
        }

        .modal-close:hover {
          color: #195C82;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #195C82;
          margin-bottom: 0.5rem;
        }

        .form-control {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: #195C82;
          box-shadow: 0 0 0 3px rgba(15, 76, 117, 0.1);
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #195C82;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0a3a5a;
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.3);
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #0d1b24;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e1;
        }

        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}
