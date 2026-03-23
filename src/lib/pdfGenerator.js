import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Génère un PDF de facture professionnelle
 */
export function generateInvoicePDF(facture) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const w = doc.internal.pageSize.getWidth()
  const lignes = typeof facture.lignes === 'string' ? JSON.parse(facture.lignes || '[]') : (facture.lignes || [])

  // ── Couleurs ──
  const primary = [26, 92, 130]   // #1a5c82
  const grey = [100, 116, 139]
  const dark = [30, 41, 59]

  // ── En-tête émetteur ──
  doc.setFontSize(18)
  doc.setTextColor(...primary)
  doc.setFont('helvetica', 'bold')
  doc.text(facture.emetteur_nom || 'Entreprise', 20, 25)

  doc.setFontSize(9)
  doc.setTextColor(...grey)
  doc.setFont('helvetica', 'normal')
  let y = 32
  if (facture.emetteur_adresse) {
    facture.emetteur_adresse.split('\n').forEach(l => { doc.text(l, 20, y); y += 4 })
  }
  if (facture.emetteur_siret) { doc.text(`SIRET : ${facture.emetteur_siret}`, 20, y); y += 4 }
  if (facture.emetteur_email) { doc.text(facture.emetteur_email, 20, y) }

  // ── Bloc FACTURE (droite) ──
  doc.setFillColor(...primary)
  doc.roundedRect(w - 80, 15, 60, 35, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', w - 50, 28, { align: 'center' })
  doc.setFontSize(10)
  doc.text(facture.num_facture || 'FAC-001', w - 50, 36, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${fmtDate(facture.date_emission)}`, w - 50, 44, { align: 'center' })

  // ── Ligne séparatrice ──
  doc.setDrawColor(...primary)
  doc.setLineWidth(0.5)
  doc.line(20, 55, w - 20, 55)

  // ── Destinataire ──
  y = 65
  doc.setFontSize(8)
  doc.setTextColor(...grey)
  doc.text('FACTURÉ À', 20, y)
  y += 6
  doc.setFontSize(11)
  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'bold')
  doc.text(facture.client_nom || 'Client', 20, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...grey)
  if (facture.client_adresse) {
    facture.client_adresse.split('\n').forEach(l => { doc.text(l, 20, y); y += 4 })
  }
  if (facture.client_siret) { doc.text(`SIRET : ${facture.client_siret}`, 20, y); y += 4 }

  // ── Dates (droite) ──
  doc.setFontSize(9)
  doc.setTextColor(...grey)
  doc.text('Date d\'émission :', w - 80, 65)
  doc.text('Date d\'échéance :', w - 80, 72)
  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'bold')
  doc.text(fmtDate(facture.date_emission), w - 20, 65, { align: 'right' })
  doc.text(fmtDate(facture.date_echeance), w - 20, 72, { align: 'right' })

  // ── Objet ──
  if (facture.objet) {
    y = Math.max(y, 80) + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...dark)
    doc.text(`Objet : ${facture.objet}`, 20, y)
    y += 8
  } else {
    y = Math.max(y, 85) + 5
  }

  // ── Tableau des lignes ──
  const tableBody = lignes.map(l => [
    l.desc || '',
    String(l.qte || 1),
    fmtE(parseFloat(l.pu) || 0),
    `${l.tva || 20}%`,
    fmtE((parseFloat(l.qte) || 1) * (parseFloat(l.pu) || 0))
  ])

  doc.autoTable({
    startY: y,
    head: [['Description', 'Qté', 'P.U. HT', 'TVA', 'Total HT']],
    body: tableBody,
    margin: { left: 20, right: 20 },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: dark,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  })

  // ── Totaux ──
  const finalY = doc.lastAutoTable.finalY + 10
  const totX = w - 80

  // Calcul TVA
  const tvaMap = {}
  for (const l of lignes) {
    const t = (parseFloat(l.qte) || 1) * (parseFloat(l.pu) || 0)
    const rate = l.tva || 20
    tvaMap[rate] = (tvaMap[rate] || 0) + t * (rate / 100)
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grey)
  doc.text('Total HT', totX, finalY)
  doc.setTextColor(...dark)
  doc.text(fmtE(facture.total_ht), w - 20, finalY, { align: 'right' })

  let ty = finalY + 6
  Object.entries(tvaMap).forEach(([rate, val]) => {
    doc.setTextColor(...grey)
    doc.text(`TVA ${rate}%`, totX, ty)
    doc.setTextColor(...dark)
    doc.text(fmtE(val), w - 20, ty, { align: 'right' })
    ty += 6
  })

  // Total TTC (encadré)
  ty += 2
  doc.setFillColor(...primary)
  doc.roundedRect(totX - 5, ty - 5, w - totX + 5 - 15, 12, 2, 2, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL TTC', totX, ty + 3)
  doc.text(fmtE(facture.total_ttc), w - 20, ty + 3, { align: 'right' })

  // ── Notes ──
  if (facture.notes) {
    ty += 20
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grey)
    doc.text('Notes :', 20, ty)
    ty += 4
    doc.setTextColor(...dark)
    facture.notes.split('\n').forEach(l => { doc.text(l, 20, ty); ty += 4 })
  }

  // ── Pied de page ──
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(20, pageH - 15, w - 20, pageH - 15)
  doc.setFontSize(7)
  doc.setTextColor(...grey)
  const footer = `${facture.emetteur_nom || ''}${facture.emetteur_siret ? ` · SIRET ${facture.emetteur_siret}` : ''}`
  doc.text(footer, w / 2, pageH - 10, { align: 'center' })

  return doc
}

/**
 * Génère un PDF de devis
 */
export function generateDevisPDF(devis) {
  // Même structure que facture mais avec titre DEVIS
  const fac = { ...devis, num_facture: devis.numero || 'DEV-001' }
  const doc = generateInvoicePDF(fac)
  // Remplacer le titre FACTURE → DEVIS (on recrée le bloc)
  // Note: simplification - on utilise le même layout
  return doc
}

/**
 * Génère un rapport de temps en PDF
 */
export function generateTimesheetPDF(data, period, userName) {
  const doc = new jsPDF('l', 'mm', 'a4') // paysage
  const w = doc.internal.pageSize.getWidth()
  const primary = [26, 92, 130]

  doc.setFontSize(16)
  doc.setTextColor(...primary)
  doc.setFont('helvetica', 'bold')
  doc.text(`Rapport de temps — ${userName || 'Collaborateur'}`, 20, 20)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text(`Période : ${period || 'N/A'}`, 20, 28)

  const tableBody = (data || []).map(d => [
    d.date || '',
    d.projet || '',
    d.client || '',
    `${d.heures || 0}h`,
    d.commentaire || ''
  ])

  doc.autoTable({
    startY: 35,
    head: [['Date', 'Projet', 'Client', 'Heures', 'Commentaire']],
    body: tableBody,
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  })

  const totalH = (data || []).reduce((s, d) => s + (d.heures || 0), 0)
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primary)
  doc.text(`Total : ${totalH}h`, w - 20, finalY, { align: 'right' })

  return doc
}

// ── Helpers ──
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}
