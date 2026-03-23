import { supabase } from './supabase'

/**
 * Service d'envoi d'email via Edge Function
 * L'Edge Function doit être déployée sur Supabase
 */

/**
 * Envoie une facture par email
 */
export async function sendInvoiceEmail(facture, recipientEmail, options = {}) {
  const { cc, subject, body } = options

  const lignes = typeof facture.lignes === 'string' ? JSON.parse(facture.lignes || '[]') : (facture.lignes || [])

  const defaultSubject = `Facture ${facture.num_facture} — ${facture.emetteur_nom || ''}`
  const defaultBody = `
Bonjour,

Veuillez trouver ci-joint la facture ${facture.num_facture} d'un montant de ${fmtE(facture.total_ttc)}.

Date d'émission : ${fmtDate(facture.date_emission)}
Date d'échéance : ${fmtDate(facture.date_echeance)}

Détail :
${lignes.map(l => `  - ${l.desc} : ${fmtE((l.qte || 1) * (parseFloat(l.pu) || 0))}`).join('\n')}

Total HT : ${fmtE(facture.total_ht)}
Total TTC : ${fmtE(facture.total_ttc)}

${facture.notes || 'Paiement par virement bancaire.\nMerci de mentionner le numéro de facture.'}

Cordialement,
${facture.emetteur_nom || ''}
`.trim()

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: recipientEmail,
      cc: cc || null,
      subject: subject || defaultSubject,
      body: body || defaultBody,
      facture_id: facture.id,
      type: 'facture',
    }
  })

  if (error) throw error
  return data
}

/**
 * Envoie un email de relance pour facture impayée
 */
export async function sendReminderEmail(facture, recipientEmail) {
  const daysPast = Math.ceil((new Date() - new Date(facture.date_echeance)) / (1000 * 60 * 60 * 24))

  const subject = `Relance — Facture ${facture.num_facture} en retard (${daysPast}j)`
  const body = `
Bonjour,

Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture suivante :

  Facture : ${facture.num_facture}
  Montant TTC : ${fmtE(facture.total_ttc)}
  Échéance : ${fmtDate(facture.date_echeance)} (il y a ${daysPast} jours)

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si le paiement a été effectué entre-temps, merci de ne pas tenir compte de ce message.

Cordialement,
${facture.emetteur_nom || ''}
`.trim()

  return sendInvoiceEmail(facture, recipientEmail, { subject, body })
}

/**
 * Envoie un email personnalisé
 */
export async function sendCustomEmail(to, subject, body) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body, type: 'custom' }
  })
  if (error) throw error
  return data
}

// Helpers
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}
