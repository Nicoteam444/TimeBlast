// ── Générateur de données de démo ────────────────────────────
// Société fictive : SRA Conseil SAS (ESN / cabinet de conseil)

function fmt(d) { return d.toISOString().slice(0, 10) }

function entry(id, date, journal, num, compteNum, compteLib, lib, debit, credit) {
  return { id, ecriture_date: date, journal_code: journal, ecriture_num: num,
    compte_num: compteNum, compte_lib: compteLib, ecriture_lib: lib,
    debit: Math.round(debit * 100) / 100, credit: Math.round(credit * 100) / 100,
    piece_ref: null, ecriture_let: null }
}

// CA mensuel en k€ — 2023 et 2024
const CA_2023 = [110, 125, 145, 135, 160, 130, 80, 60, 155, 150, 145, 130]
const CA_2024 = [130, 145, 155, 160, 175, 150, 90, 70, 170, 168, 162, 148]
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function generateYear(year, caMonths) {
  const rows = []
  let id = 1
  let tresoBalance = 220000 // solde initial banque

  for (let m = 0; m < 12; m++) {
    const ca       = caMonths[m] * 1000
    const achats   = Math.round(ca * 0.148)
    const salaires = Math.round(ca * 0.32)
    const charges  = Math.round(ca * 0.17)
    const loyer    = 8500
    const autres   = Math.round(ca * 0.062)
    const dotations= Math.round(ca * 0.018)

    const dateStr  = fmt(new Date(year, m, 28))
    const dateEnc  = fmt(new Date(year, m + 1 > 11 ? 11 : m + 1, 5))
    const lib = MOIS[m]

    // Ventes → CA + Client
    rows.push(entry(id++, dateStr, 'VTE', `VTE${year}${String(m+1).padStart(2,'0')}`, '701000', 'Prestations de services', `CA ${lib}`, 0, ca))
    rows.push(entry(id++, dateStr, 'VTE', `VTE${year}${String(m+1).padStart(2,'0')}`, '411000', 'Clients', `CA ${lib}`, ca, 0))

    // Encaissement client (mois suivant)
    rows.push(entry(id++, dateEnc, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}E`, '512000', 'Banque', `Encaissement ${lib}`, ca, 0))
    rows.push(entry(id++, dateEnc, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}E`, '411000', 'Clients', `Encaissement ${lib}`, 0, ca))
    tresoBalance += ca

    // Achats / sous-traitance
    rows.push(entry(id++, dateStr, 'ACH', `ACH${year}${String(m+1).padStart(2,'0')}`, '607100', 'Sous-traitance', `ST ${lib}`, achats, 0))
    rows.push(entry(id++, dateStr, 'ACH', `ACH${year}${String(m+1).padStart(2,'0')}`, '401000', 'Fournisseurs', `ST ${lib}`, 0, achats))
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}A`, '401000', 'Fournisseurs', `Règl. ST ${lib}`, achats, 0))
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}A`, '512000', 'Banque', `Règl. ST ${lib}`, 0, achats))
    tresoBalance -= achats

    // Personnel — salaires
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}S`, '641100', 'Salaires bruts', `Salaires ${lib}`, salaires, 0))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}S`, '421000', 'Personnel — rémunérations dues', `Salaires ${lib}`, 0, salaires))

    // Personnel — charges patronales
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}C`, '645100', 'Cotisations URSSAF', `Charges soc. ${lib}`, charges, 0))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}C`, '431000', 'Organismes sociaux', `Charges soc. ${lib}`, 0, charges))

    // Règlement salaires + charges
    const paiePay = salaires + charges
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}P`, '421000', 'Personnel', `Paie ${lib}`, salaires, 0))
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}P`, '431000', 'Org. sociaux', `Charges ${lib}`, charges, 0))
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}P`, '512000', 'Banque', `Paie+charges ${lib}`, 0, paiePay))
    tresoBalance -= paiePay

    // Loyer
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}L`, '613200', 'Locations immobilières', `Loyer ${lib}`, loyer, 0))
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}L`, '512000', 'Banque', `Loyer ${lib}`, 0, loyer))
    tresoBalance -= loyer

    // Autres charges (frais, marketing, IT...)
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}A`, '626000', 'Frais postaux & télécom', `Télécom ${lib}`, 1800, 0))
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}A`, '512000', 'Banque', `Télécom ${lib}`, 0, 1800))
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}B`, '651000', 'Redevances pour concessions', `Licences ${lib}`, autres - 1800, 0))
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}B`, '512000', 'Banque', `Licences ${lib}`, 0, autres - 1800))
    tresoBalance -= autres

    // Dotations amortissements
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}D`, '681120', 'Dot. amort. immo. corp.', `Amort. ${lib}`, dotations, 0))
    rows.push(entry(id++, dateStr, 'OD', `OD${year}${String(m+1).padStart(2,'0')}D`, '281510', 'Amort. matériel inform.', `Amort. ${lib}`, 0, dotations))

    // Solde banque fin de mois (entrée normalisatrice)
    rows.push(entry(id++, dateStr, 'BQ', `BQ${year}${String(m+1).padStart(2,'0')}Z`, '512000', 'Banque — solde', `Solde ${lib}`, tresoBalance > 0 ? tresoBalance : 0, tresoBalance < 0 ? -tresoBalance : 0))
  }

  return rows
}

export const DEMO_ECRITURES_2023 = generateYear(2023, CA_2023)
export const DEMO_ECRITURES_2024 = generateYear(2024, CA_2024)

export const DEMO_IMPORTS = [
  { id: 'demo-2024', societe: 'SRA Conseil SAS', exercice: '2024', nb_lignes: DEMO_ECRITURES_2024.length, created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-2023', societe: 'SRA Conseil SAS', exercice: '2023', nb_lignes: DEMO_ECRITURES_2023.length, created_at: '2024-01-15T10:00:00Z' },
]

export const DEMO_ECRITURES = {
  'demo-2024': DEMO_ECRITURES_2024,
  'demo-2023': DEMO_ECRITURES_2023,
}

// ── Clients démo ─────────────────────────────────────────────
export const DEMO_CLIENTS = [
  { id: 'c1', name: 'Groupe Altéa', hubspot_id: null, created_at: '2023-03-15' },
  { id: 'c2', name: 'Meridian Finance', hubspot_id: null, created_at: '2023-05-20' },
  { id: 'c3', name: 'TechForge SAS', hubspot_id: null, created_at: '2023-07-01' },
  { id: 'c4', name: 'Cabinet Marceau', hubspot_id: null, created_at: '2023-09-12' },
  { id: 'c5', name: 'Industriel Nord SA', hubspot_id: null, created_at: '2024-01-08' },
  { id: 'c6', name: 'Datavision Group', hubspot_id: null, created_at: '2024-02-14' },
  { id: 'c7', name: 'Pharma Innov', hubspot_id: null, created_at: '2024-04-22' },
  { id: 'c8', name: 'Logistique Express', hubspot_id: null, created_at: '2024-06-03' },
]

// ── Transactions démo ─────────────────────────────────────────
export const DEMO_TRANSACTIONS = [
  { id: 't1', name: 'Audit SI Altéa 2024', client_id: 'c1', client_name: 'Groupe Altéa', montant: 85000, phase: 'proposition', created_at: '2024-09-01' },
  { id: 't2', name: 'Migration ERP Meridian', client_id: 'c2', client_name: 'Meridian Finance', montant: 240000, phase: 'negociation', created_at: '2024-07-15' },
  { id: 't3', name: 'Formation Data TechForge', client_id: 'c3', client_name: 'TechForge SAS', montant: 32000, phase: 'gagne', created_at: '2024-05-10' },
  { id: 't4', name: 'Conseil RH Cabinet Marceau', client_id: 'c4', client_name: 'Cabinet Marceau', montant: 18500, phase: 'gagne', created_at: '2024-03-22' },
  { id: 't5', name: 'Infra Cloud Industriel Nord', client_id: 'c5', client_name: 'Industriel Nord SA', montant: 156000, phase: 'qualification', created_at: '2024-10-05' },
  { id: 't6', name: 'Dashboard BI Datavision', client_id: 'c6', client_name: 'Datavision Group', montant: 67000, phase: 'proposition', created_at: '2024-08-18' },
  { id: 't7', name: 'Conformité RGPD Pharma', client_id: 'c7', client_name: 'Pharma Innov', montant: 45000, phase: 'gagne', created_at: '2024-04-30' },
  { id: 't8', name: 'TMS Logistique Express', client_id: 'c8', client_name: 'Logistique Express', montant: 98000, phase: 'negociation', created_at: '2024-11-02' },
  { id: 't9', name: 'Support & MCO Altéa', client_id: 'c1', client_name: 'Groupe Altéa', montant: 48000, phase: 'gagne', created_at: '2024-01-10' },
  { id: 't10', name: 'Pentest Meridian', client_id: 'c2', client_name: 'Meridian Finance', montant: 22000, phase: 'perdu', created_at: '2024-06-01' },
]

// ── Projets démo ──────────────────────────────────────────────
export const DEMO_PROJETS = [
  { id: 'p1', name: 'Migration ERP Meridian', client_id: 'c2', statut: 'actif' },
  { id: 'p2', name: 'Formation Data TechForge', client_id: 'c3', statut: 'actif' },
  { id: 'p3', name: 'Conseil RH Cabinet Marceau', client_id: 'c4', statut: 'actif' },
  { id: 'p4', name: 'Conformité RGPD Pharma', client_id: 'c7', statut: 'termine' },
  { id: 'p5', name: 'Support & MCO Altéa', client_id: 'c1', statut: 'actif' },
]
