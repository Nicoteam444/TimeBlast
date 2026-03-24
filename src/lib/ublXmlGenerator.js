/**
 * UBL XML Generator for E-Invoices
 * Generates UBL 2.1 compliant XML for French e-invoicing
 */

/**
 * Generate UBL XML for invoice
 * @param {Object} invoice - Invoice data from database
 * @param {Object} company - Company/Emetteur data
 * @param {Object} client - Client/Destinataire data
 * @returns {string} UBL XML string
 */
export function generateUBLXml(invoice, company, client) {
  const invoiceLines = typeof invoice.lignes === 'string'
    ? JSON.parse(invoice.lignes || '[]')
    : (invoice.lignes || [])

  // Calculate totals and taxes
  const { totalHT, totalTTC, taxDetails } = calculateTotals(invoiceLines)

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">

  <!-- Identifiants de la facture -->
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#conformant#urn:facturx.eu:1p0:extended</cbc:CustomizationID>
  <cbc:ID>${escapeXml(invoice.num_facture)}</cbc:ID>
  <cbc:IssueDate>${formatDateISO(invoice.date_emission)}</cbc:IssueDate>
  <cbc:DueDate>${formatDateISO(invoice.date_echeance)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>

  <!-- Références commerciales -->
  <cbc:BuyerReference>${escapeXml(client.sirene || '')}</cbc:BuyerReference>

  <!-- Informations de facturation -->
  <cac:BillingReference>
    <cbc:ID>${escapeXml(invoice.num_facture)}</cbc:ID>
  </cac:BillingReference>

  <!-- Totaux -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${totalHT.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${totalHT.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${totalTTC.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PrepaidAmount currencyID="EUR">0.00</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="EUR">${totalTTC.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Taxes -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${(totalTTC - totalHT).toFixed(2)}</cbc:TaxAmount>
    ${Object.entries(taxDetails).map(([rate, amount]) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${amount.base.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${amount.tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${rate}</cbc:ID>
        <cbc:Percent>${parseFloat(rate).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join('')}
  </cac:TaxTotal>

  <!-- Vendeur (Émetteur) -->
  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>${escapeXml(company.siret || '')}</cbc:CustomerAssignedAccountID>
    <cac:Party>
      <cbc:WebsiteURI>${escapeXml(company.website || '')}</cbc:WebsiteURI>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0002">${escapeXml(company.siret || '')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(company.nom)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(company.adresse || '')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(company.ville || '')}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(company.code_postal || '')}</cbc:PostalZone>
        <cbc:CountrySubentity>FR</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>FR</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXml(company.email || '')}</cbc:ElectronicMail>
        <cbc:Telephone>${escapeXml(company.telephone || '')}</cbc:Telephone>
      </cac:Contact>
      <cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
        <cbc:CompanyID>${escapeXml(company.siret || '')}</cbc:CompanyID>
      </cac:TaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Acheteur (Destinataire) -->
  <cac:AccountingCustomerParty>
    <cbc:CustomerAssignedAccountID>${escapeXml(client.siret || '')}</cbc:CustomerAssignedAccountID>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0002">${escapeXml(client.siret || '')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(client.nom || client.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(client.adresse || '')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(client.ville || '')}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(client.code_postal || '')}</cbc:PostalZone>
        <cbc:CountrySubentity>FR</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(client.country_code || 'FR')}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXml(client.email || '')}</cbc:ElectronicMail>
      </cac:Contact>
      ${client.siret ? `<cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
        <cbc:CompanyID>${escapeXml(client.siret)}</cbc:CompanyID>
      </cac:TaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Lignes de facture -->
  <cac:InvoiceLine>
    ${invoiceLines.map((line, idx) => generateInvoiceLine(line, idx + 1)).join('')}
  </cac:InvoiceLine>

</Invoice>`

  return xml
}

/**
 * Generate individual invoice line XML
 */
function generateInvoiceLine(line, lineNumber) {
  const qty = parseFloat(line.qte) || 0
  const unitPrice = parseFloat(line.pu) || 0
  const taxRate = parseFloat(line.tva) || 0
  const lineTotal = qty * unitPrice
  const lineTax = lineTotal * (taxRate / 100)

  return `
    <cac:InvoiceLine>
      <cbc:ID>${lineNumber}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${qty.toFixed(2)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="EUR">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cbc:UnitPriceAmount currencyID="EUR">${unitPrice.toFixed(2)}</cbc:UnitPriceAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(line.desc || '')}</cbc:Description>
      </cac:Item>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="EUR">${lineTax.toFixed(2)}</cbc:TaxAmount>
      </cac:TaxTotal>
      <cac:TaxCategory>
        <cbc:ID>${taxRate.toFixed(0)}</cbc:ID>
        <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:InvoiceLine>`
}

/**
 * Calculate totals and tax details
 */
function calculateTotals(lines) {
  let totalHT = 0
  const taxDetails = {}

  for (const line of lines) {
    const qty = parseFloat(line.qte) || 0
    const pu = parseFloat(line.pu) || 0
    const rate = parseFloat(line.tva) || 0

    const lineTotal = qty * pu
    const lineTax = lineTotal * (rate / 100)

    totalHT += lineTotal

    if (!taxDetails[rate]) {
      taxDetails[rate] = { base: 0, tax: 0 }
    }
    taxDetails[rate].base += lineTotal
    taxDetails[rate].tax += lineTax
  }

  const totalTax = Object.values(taxDetails).reduce((sum, detail) => sum + detail.tax, 0)
  const totalTTC = totalHT + totalTax

  return { totalHT, totalTTC, taxDetails }
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format date to ISO format (YYYY-MM-DD)
 */
function formatDateISO(date) {
  if (!date) return new Date().toISOString().split('T')[0]
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Validate UBL XML
 */
export function validateUBLXml(xmlString) {
  try {
    // Basic validation
    if (!xmlString.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
      return { valid: false, error: 'Invalid UBL namespace' }
    }

    // Check required fields
    const requiredFields = [
      '<cbc:ID>',
      '<cbc:IssueDate>',
      '<cac:AccountingSupplierParty>',
      '<cac:AccountingCustomerParty>',
    ]

    for (const field of requiredFields) {
      if (!xmlString.includes(field)) {
        return { valid: false, error: `Missing required field: ${field}` }
      }
    }

    return { valid: true }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}
