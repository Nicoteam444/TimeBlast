import { supabase } from './supabase'
import { generateUBLXml, validateUBLXml } from './ublXmlGenerator'

/**
 * Invoice Distribution Service
 * Handles sending invoices via multiple channels
 */

/**
 * Send invoice via email
 */
export async function sendInvoiceByEmail(invoiceId, recipientEmail, pdfUrl, metadata = {}) {
  try {
    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        invoiceId,
        recipientEmail,
        pdfUrl,
        metadata,
      },
    })

    if (error) {
      console.error('Error sending invoice email:', error)
      return { success: false, error: error.message }
    }

    // Log the distribution
    await logDistribution(invoiceId, 'email', recipientEmail, 'sent')

    // Update invoice status
    await updateInvoiceDistributionStatus(invoiceId, 'sent')

    return { success: true, data }
  } catch (err) {
    console.error('Error in sendInvoiceByEmail:', err)
    await logDistribution(invoiceId, 'email', recipientEmail, 'failed', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Generate UBL XML and save to database
 */
export async function generateAndSaveUBLXml(invoice, company, client) {
  try {
    // Generate XML
    const xmlString = generateUBLXml(invoice, company, client)

    // Validate
    const validation = validateUBLXml(xmlString)
    if (!validation.valid) {
      console.error('XML validation failed:', validation.error)
      return { success: false, error: validation.error }
    }

    // Save to database
    const { error } = await supabase
      .from('factures')
      .update({ xml_ubl: xmlString })
      .eq('id', invoice.id)

    if (error) {
      console.error('Error saving XML:', error)
      return { success: false, error: error.message }
    }

    return { success: true, xml: xmlString }
  } catch (err) {
    console.error('Error generating XML:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Prepare invoice for Chorus Pro transmission
 */
export async function prepareForChorusPro(invoiceId) {
  try {
    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      throw new Error(`Invoice not found: ${invoiceError.message}`)
    }

    // Check if XML exists, if not generate it
    if (!invoice.xml_ubl) {
      // Need to fetch company and client data
      const { data: company } = await supabase
        .from('societes')
        .select('*')
        .eq('id', invoice.societe_id)
        .single()

      // Generate XML
      const xmlResult = await generateAndSaveUBLXml(invoice, company, {})
      if (!xmlResult.success) {
        return { success: false, error: xmlResult.error }
      }
    }

    // Update status
    await updateInvoiceDistributionStatus(invoiceId, 'pending_chorus_pro')

    return {
      success: true,
      message: 'Invoice prepared for Chorus Pro transmission',
    }
  } catch (err) {
    console.error('Error preparing for Chorus Pro:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update invoice distribution status
 */
export async function updateInvoiceDistributionStatus(invoiceId, status) {
  try {
    const { error } = await supabase
      .from('factures')
      .update({
        distribution_status: status,
        distribution_date: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      console.error('Error updating distribution status:', error)
      return false
    }

    // Also update status history
    await supabase
      .from('invoice_status_history')
      .insert([
        {
          facture_id: invoiceId,
          new_status: status,
          metadata: { timestamp: new Date().toISOString() },
        },
      ])

    return true
  } catch (err) {
    console.error('Error in updateInvoiceDistributionStatus:', err)
    return false
  }
}

/**
 * Log distribution action
 */
export async function logDistribution(
  invoiceId,
  method,
  recipientEmail,
  action,
  errorDetails = null
) {
  try {
    const { error } = await supabase
      .from('distribution_logs')
      .insert([
        {
          facture_id: invoiceId,
          method,
          recipient_email: recipientEmail,
          action,
          error_details: errorDetails,
          metadata: { timestamp: new Date().toISOString() },
        },
      ])

    if (error) {
      console.error('Error logging distribution:', error)
    }
  } catch (err) {
    console.error('Error in logDistribution:', err)
  }
}

/**
 * Create client access token for invoice portal
 */
export async function createClientAccessToken(invoiceId, clientEmail, expiresIn = 90) {
  try {
    // Generate random token
    const token = generateSecureToken()

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresIn)

    // Insert token
    const { data, error } = await supabase
      .from('invoice_access_tokens')
      .insert([
        {
          facture_id: invoiceId,
          token,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        },
      ])
      .select()

    if (error) {
      console.error('Error creating access token:', error)
      return { success: false, error: error.message }
    }

    return { success: true, token, data }
  } catch (err) {
    console.error('Error in createClientAccessToken:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Verify and access invoice with token
 */
export async function verifyInvoiceToken(invoiceId, token) {
  try {
    const { data, error } = await supabase
      .from('invoice_access_tokens')
      .select('*')
      .eq('facture_id', invoiceId)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error) {
      return { valid: false, error: 'Invalid or expired token' }
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Token expired' }
    }

    // Update access info
    await supabase
      .from('invoice_access_tokens')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: (data.access_count || 0) + 1,
      })
      .eq('id', data.id)

    return { valid: true, data }
  } catch (err) {
    console.error('Error verifying token:', err)
    return { valid: false, error: err.message }
  }
}

/**
 * Get distribution history for invoice
 */
export async function getDistributionHistory(invoiceId) {
  try {
    const { data, error } = await supabase
      .from('distribution_logs')
      .select('*')
      .eq('facture_id', invoiceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching distribution history:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getDistributionHistory:', err)
    return []
  }
}

/**
 * Generate secure random token
 */
function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Export invoice as XML file
 */
export function downloadXmlFile(xmlString, filename = 'invoice.xml') {
  try {
    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/xml;charset=utf-8,' + encodeURIComponent(xmlString)
    )
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    return true
  } catch (err) {
    console.error('Error downloading XML:', err)
    return false
  }
}
