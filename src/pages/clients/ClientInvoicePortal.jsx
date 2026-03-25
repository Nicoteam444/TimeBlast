import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { verifyInvoiceToken, downloadXmlFile } from '../../lib/invoiceDistribution'
import { generateInvoicePDF } from '../../lib/pdfGenerator'
import Spinner from '../../components/Spinner'

/**
 * Public Invoice Portal Page
 * Allows clients to view invoices shared with them via token
 */

export default function ClientInvoicePortal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const invoiceId = searchParams.get('id')

  const [invoice, setInvoice] = useState(null)
  const [company, setCompany] = useState(null)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verify token and load invoice
  useEffect(() => {
    if (!token || !invoiceId) {
      setError('Token ou facture manquante')
      setLoading(false)
      return
    }

    const verifyAndLoad = async () => {
      try {
        // Verify token
        const verification = await verifyInvoiceToken(invoiceId, token)

        if (!verification.valid) {
          setError(verification.error || 'Accès refusé')
          setLoading(false)
          return
        }

        // Load invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('factures')
          .select('*')
          .eq('id', invoiceId)
          .single()

        if (invoiceError) {
          throw new Error('Facture non trouvée')
        }

        setInvoice(invoiceData)

        // Load company data
        const { data: companyData } = await supabase
          .from('societes')
          .select('*')
          .eq('id', invoiceData.societe_id)
          .single()

        setCompany(companyData)
        setVerified(true)
        setLoading(false)
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement')
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [token, invoiceId])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
      }}>
        <Spinner />
      </div>
    )
  }

  if (error || !verified) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
      }}>
        <div style={{
          maxWidth: '400px',
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ marginBottom: '1rem', color: '#195C82' }}>Accès refusé</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {error || 'Le lien d\'accès n\'est pas valide ou a expiré.'}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#195C82',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const lignes = typeof invoice?.lignes === 'string'
    ? JSON.parse(invoice.lignes || '[]')
    : (invoice?.lignes || [])

  const totalHT = lignes.reduce((sum, l) => sum + (parseFloat(l.qte) * parseFloat(l.pu || 0)), 0)
  const totalTax = lignes.reduce((sum, l) => {
    const lineTotal = parseFloat(l.qte) * parseFloat(l.pu || 0)
    return sum + lineTotal * (parseFloat(l.tva || 0) / 100)
  }, 0)
  const totalTTC = totalHT + totalTax

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, color: '#195C82', marginBottom: '.5rem' }}>
                Facture n° {invoice.num_facture}
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '.9rem' }}>
                {company?.name} · {new Date(invoice.date_emission).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  const doc = generateInvoicePDF(invoice, company)
                  doc.save(`${invoice.num_facture || 'facture'}.pdf`)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#195C82',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                📥 Télécharger PDF
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {/* Émetteur et Destinataire */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
            {/* Émetteur */}
            <div>
              <h3 style={{ fontSize: '.85rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '.5rem' }}>
                Facturé par
              </h3>
              <div style={{ color: '#195C82', fontWeight: 600 }}>{company?.name}</div>
              {company?.adresse && <div style={{ color: '#64748b', fontSize: '.9rem' }}>{company.adresse}</div>}
              {company?.code_postal && <div style={{ color: '#64748b', fontSize: '.9rem' }}>
                {company.code_postal} {company.ville}
              </div>}
              {company?.siret && <div style={{ color: '#64748b', fontSize: '.85rem', marginTop: '.5rem' }}>
                SIRET : {company.siret}
              </div>}
            </div>

            {/* Destinataire */}
            <div>
              <h3 style={{ fontSize: '.85rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '.5rem' }}>
                Facturé à
              </h3>
              <div style={{ color: '#195C82', fontWeight: 600 }}>{invoice.client_nom}</div>
              {invoice.client_adresse && <div style={{ color: '#64748b', fontSize: '.9rem' }}>
                {invoice.client_adresse}
              </div>}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '.85rem', color: '#94a3b8' }}>Date d'émission</div>
              <div style={{ color: '#195C82', fontWeight: 600 }}>
                {new Date(invoice.date_emission).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '.85rem', color: '#94a3b8' }}>Date d'échéance</div>
              <div style={{ color: '#195C82', fontWeight: 600 }}>
                {new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Lignes */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#195C82' }}>Détails de la facture</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '.9rem' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '.9rem' }}>Qté</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '.9rem' }}>P.U.</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '.9rem' }}>TVA</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '.9rem' }}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((line, idx) => {
                  const qty = parseFloat(line.qte) || 0
                  const pu = parseFloat(line.pu) || 0
                  const total = qty * pu
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', color: '#195C82' }}>{line.desc}</td>
                      <td style={{ textAlign: 'right', padding: '1rem', color: '#64748b' }}>{qty.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '1rem', color: '#64748b' }}>{pu.toFixed(2)} €</td>
                      <td style={{ textAlign: 'right', padding: '1rem', color: '#64748b' }}>{line.tva || 0}%</td>
                      <td style={{ textAlign: 'right', padding: '1rem', color: '#195C82', fontWeight: 600 }}>
                        {total.toFixed(2)} €
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px',
            gap: '2rem',
            paddingTop: '2rem',
            borderTop: '2px solid #e2e8f0',
          }}>
            <div />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Total HT</span>
                <span style={{ color: '#195C82', fontWeight: 600 }}>{totalHT.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>TVA</span>
                <span style={{ color: '#195C82', fontWeight: 600 }}>{totalTax.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#195C82', fontWeight: 700, fontSize: '1.1rem' }}>Total TTC</span>
                <span style={{ color: '#195C82', fontWeight: 700, fontSize: '1.1rem' }}>{totalTTC.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e2e8f0',
            }}>
              <h4 style={{ color: '#64748b', marginBottom: '.5rem' }}>Notes</h4>
              <p style={{ color: '#195C82', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '.85rem',
        }}>
          <p>Facture générée par TimeBlast.ai · Portail Client Sécurisé</p>
        </div>
      </div>
    </div>
  )
}
