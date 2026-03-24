import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const {
      invoiceId,
      recipientEmail,
      pdfUrl,
      metadata = {},
    } = await req.json()

    // Validate inputs
    if (!invoiceId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("factures")
      .select("*")
      .eq("id", invoiceId)
      .single()

    if (invoiceError) {
      throw new Error(`Invoice not found: ${invoiceError.message}`)
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from("societes")
      .select("*")
      .eq("id", invoice.societe_id)
      .single()

    if (companyError) {
      console.warn("Company not found:", companyError)
    }

    // Build email content
    const emailSubject = `Facture n° ${invoice.num_facture}`
    const customMessage = metadata.customMessage || ""

    const emailHtml = buildEmailHTML(
      invoice,
      company,
      recipientEmail,
      customMessage,
      pdfUrl
    )

    // Send email using SendGrid (or your preferred email service)
    const emailResponse = await sendEmailViaSendGrid({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      attachmentUrl: pdfUrl,
    })

    if (!emailResponse.success) {
      throw new Error(emailResponse.error || "Failed to send email")
    }

    // Log the distribution
    await supabase.from("distribution_logs").insert([
      {
        facture_id: invoiceId,
        method: "email",
        recipient_email: recipientEmail,
        action: "sent",
        metadata: { timestamp: new Date().toISOString(), ...metadata },
      },
    ])

    // Update invoice status
    await supabase
      .from("factures")
      .update({
        distribution_status: "sent",
        distribution_date: new Date().toISOString(),
        client_email: recipientEmail,
      })
      .eq("id", invoiceId)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        messageId: emailResponse.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

/**
 * Build professional HTML email for invoice
 */
function buildEmailHTML(
  invoice: any,
  company: any,
  recipientEmail: string,
  customMessage: string,
  pdfUrl?: string
): string {
  const companyName = company?.name || "Notre entreprise"
  const invoiceNumber = invoice.num_facture || "N/A"
  const issueDate = new Date(invoice.date_emission).toLocaleDateString("fr-FR")
  const dueDate = new Date(invoice.date_echeance).toLocaleDateString("fr-FR")
  const totalTTC = (invoice.total_ttc || 0).toFixed(2)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; }
    .header { background: linear-gradient(135deg, #0F4C75 0%, #1a5c82 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
    .section { margin-bottom: 20px; }
    .section h2 { color: #0F4C75; font-size: 16px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }
    .details { background: white; padding: 15px; border-radius: 4px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { color: #0F4C75; font-weight: 600; }
    .message { background: #e8f4f8; padding: 15px; border-left: 4px solid #0F4C75; border-radius: 4px; color: #0F4C75; }
    .button { display: inline-block; background: #0F4C75; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    .warning { background: #fff8e1; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; color: #856404; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Nouvelle facture</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">N° ${invoiceNumber}</p>
    </div>

    <div class="content">
      <p>Bonjour,</p>

      <p>Veuillez trouver ci-joint votre facture de la part de <strong>${companyName}</strong>.</p>

      ${customMessage ? `<div class="message"><strong>Message :</strong><br>${customMessage}</div>` : ""}

      <div class="section">
        <h2>Détails de la facture</h2>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Numéro de facture</span>
            <span class="detail-value">${invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date d'émission</span>
            <span class="detail-value">${issueDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date d'échéance</span>
            <span class="detail-value">${dueDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Montant total (TTC)</span>
            <span class="detail-value" style="font-size: 18px;">${totalTTC} €</span>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        ${pdfUrl ? `<a href="${pdfUrl}" class="button">📥 Télécharger la facture (PDF)</a>` : ""}
      </div>

      <div class="section">
        <h2>Informations de paiement</h2>
        <p>Merci d'effectuer le paiement avant le <strong>${dueDate}</strong>.</p>
        ${company?.iban ? `<p><strong>IBAN :</strong> ${company.iban}</p>` : ""}
        ${company?.bic ? `<p><strong>BIC :</strong> ${company.bic}</p>` : ""}
      </div>

      <div class="warning">
        <strong>✓ Facture dématérialisée</strong><br>
        Cette facture a été envoyée numériquement. Vous pouvez la conserver en tant que preuve d'achat.
      </div>

      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à nous contacter.</p>

      <p>Cordialement,<br>
      <strong>${companyName}</strong>
      ${company?.email ? `<br><a href="mailto:${company.email}">${company.email}</a>` : ""}
      </p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${companyName}. Tous droits réservés.<br>
      Facture générée par <strong>TimeBlast</strong></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Send email via SendGrid
 * You can replace this with your preferred email service (Mailgun, AWS SES, etc.)
 */
async function sendEmailViaSendGrid(options: {
  to: string
  subject: string
  html: string
  attachmentUrl?: string
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")

    if (!sendgridApiKey) {
      // Fallback: just log the email for development
      console.log("SendGrid key not configured. In production, implement email sending.")
      console.log({
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 100) + "...",
      })
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      }
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: { email: "noreply@timeblast.app", name: "TimeBlast" },
        content: [
          {
            type: "text/html",
            value: options.html,
          },
        ],
        reply_to: { email: "support@timeblast.app" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid error: ${response.status} - ${errorText}`)
    }

    return {
      success: true,
      messageId: response.headers.get("x-message-id") || `msg-${Date.now()}`,
    }
  } catch (error) {
    console.error("Email sending error:", error)
    return {
      success: false,
      error: error.message || "Failed to send email",
    }
  }
}
