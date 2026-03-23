// ── Données de démonstration ─────────────────────────────────
// Société fictive : SRA Conseil SAS (ESN / cabinet de conseil)

// ── Utils ────────────────────────────────────────────────────
function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d) { return d.toISOString().slice(0, 10) }
function fmt(d) { return d.toISOString().slice(0, 10) }

// ── Clients ──────────────────────────────────────────────────
export const DEMO_CLIENTS = [
  { id: 'c1', name: 'Groupe Altéa',       created_at: '2023-03-15', projets: [{ count: 2 }] },
  { id: 'c2', name: 'Meridian Finance',   created_at: '2023-05-20', projets: [{ count: 1 }] },
  { id: 'c3', name: 'TechForge SAS',      created_at: '2023-07-01', projets: [{ count: 1 }] },
  { id: 'c4', name: 'Cabinet Marceau',    created_at: '2023-09-12', projets: [{ count: 1 }] },
  { id: 'c5', name: 'Industriel Nord SA', created_at: '2024-01-08', projets: [{ count: 0 }] },
  { id: 'c6', name: 'Datavision Group',   created_at: '2024-02-14', projets: [{ count: 0 }] },
  { id: 'c7', name: 'Pharma Innov',       created_at: '2024-04-22', projets: [{ count: 1 }] },
  { id: 'c8', name: 'Logistique Express', created_at: '2024-06-03', projets: [{ count: 0 }] },
]

// ── Transactions ─────────────────────────────────────────────
export const DEMO_TRANSACTIONS = [
  { id: 't1', name: 'Audit SI Altéa 2024',         client_id: 'c1', clients: { name: 'Groupe Altéa' },       montant: 85000,  phase: 'qualification',  created_at: '2024-09-01', date_fermeture_prevue: '2024-12-15', notes: 'RDV directeur DSI confirmé' },
  { id: 't2', name: 'Migration ERP Meridian',       client_id: 'c2', clients: { name: 'Meridian Finance' },   montant: 240000, phase: 'ferme_a_gagner',  created_at: '2024-07-15', date_fermeture_prevue: '2024-11-30', notes: 'Accord de principe reçu' },
  { id: 't3', name: 'Formation Data TechForge',     client_id: 'c3', clients: { name: 'TechForge SAS' },      montant: 32000,  phase: 'ferme',           created_at: '2024-05-10', date_fermeture_prevue: '2024-06-30', notes: null },
  { id: 't4', name: 'Conseil RH Cabinet Marceau',   client_id: 'c4', clients: { name: 'Cabinet Marceau' },    montant: 18500,  phase: 'ferme',           created_at: '2024-03-22', date_fermeture_prevue: '2024-04-30', notes: null },
  { id: 't5', name: 'Infra Cloud Industriel Nord',  client_id: 'c5', clients: { name: 'Industriel Nord SA' }, montant: 156000, phase: 'short_list',      created_at: '2024-10-05', date_fermeture_prevue: '2025-02-28', notes: 'En compétition avec 2 autres ESN' },
  { id: 't6', name: 'Dashboard BI Datavision',      client_id: 'c6', clients: { name: 'Datavision Group' },   montant: 67000,  phase: 'qualification',   created_at: '2024-08-18', date_fermeture_prevue: '2025-01-15', notes: null },
  { id: 't7', name: 'Conformité RGPD Pharma',       client_id: 'c7', clients: { name: 'Pharma Innov' },       montant: 45000,  phase: 'ferme',           created_at: '2024-04-30', date_fermeture_prevue: '2024-07-31', notes: null },
  { id: 't8', name: 'TMS Logistique Express',       client_id: 'c8', clients: { name: 'Logistique Express' }, montant: 98000,  phase: 'short_list',      created_at: '2024-11-02', date_fermeture_prevue: '2025-03-31', notes: 'Démo planifiée le 15/11' },
  { id: 't9', name: 'Support & MCO Altéa 2024',    client_id: 'c1', clients: { name: 'Groupe Altéa' },       montant: 48000,  phase: 'ferme',           created_at: '2024-01-10', date_fermeture_prevue: '2024-12-31', notes: 'Contrat annuel reconductible' },
  { id: 't10', name: 'Pentest Meridian Finance',    client_id: 'c2', clients: { name: 'Meridian Finance' },   montant: 22000,  phase: 'perdu',           created_at: '2024-06-01', date_fermeture_prevue: '2024-08-31', notes: 'Perdu face à concurrent moins cher' },
]

// ── Projets ───────────────────────────────────────────────────
export const DEMO_PROJETS = [
  { id: 'p1', name: 'Migration ERP Meridian',     client_id: 'c2', statut: 'actif',   total_jours: 30,  clients: { name: 'Meridian Finance' } },
  { id: 'p2', name: 'Formation Data TechForge',   client_id: 'c3', statut: 'actif',   total_jours: 10,  clients: { name: 'TechForge SAS' } },
  { id: 'p3', name: 'Conseil RH Cabinet Marceau', client_id: 'c4', statut: 'actif',   total_jours: 15,  clients: { name: 'Cabinet Marceau' } },
  { id: 'p4', name: 'Conformité RGPD Pharma',     client_id: 'c7', statut: 'termine', total_jours: 20,  clients: { name: 'Pharma Innov' } },
  { id: 'p5', name: 'Support & MCO Altéa',        client_id: 'c1', statut: 'actif',   total_jours: 50,  clients: { name: 'Groupe Altéa' } },
]

// ── Utilisateurs démo ─────────────────────────────────────────
export const DEMO_USERS = [
  { id: 'u1', full_name: 'Nicolas Nabhan',  role: 'admin',         service: 'chef_projet', email: 'nicolas@sra.fr' },
  { id: 'u2', full_name: 'Alice Martin',    role: 'manager',       service: 'commercial',  email: 'alice@sra.fr' },
  { id: 'u3', full_name: 'Bob Dupont',      role: 'collaborateur', service: 'technique',   email: 'bob@sra.fr' },
  { id: 'u4', full_name: 'Claire Petit',    role: 'collaborateur', service: 'fonctionnel', email: 'claire@sra.fr' },
  { id: 'u5', full_name: 'David Lemaire',   role: 'collaborateur', service: 'technique',   email: 'david@sra.fr' },
]

// ── Plannings 3 mois (mars → mai 2026) ───────────────────────
export const DEMO_PLANNINGS = [
  // Nicolas — chef de projet
  { id: 'pl1',  user_id: 'u1', label: 'Migration ERP Meridian',    color: '#6366f1', date_debut: '2026-03-03', date_fin: '2026-03-27' },
  { id: 'pl2',  user_id: 'u1', label: 'Conseil RH Cabinet Marceau', color: '#0ea5e9', date_debut: '2026-04-07', date_fin: '2026-05-16' },
  // Alice — commercial
  { id: 'pl3',  user_id: 'u2', label: 'Formation Data TechForge',  color: '#f59e0b', date_debut: '2026-03-10', date_fin: '2026-04-04' },
  { id: 'pl4',  user_id: 'u2', label: 'Dashboard BI Datavision',   color: '#ec4899', date_debut: '2026-04-14', date_fin: '2026-05-30' },
  // Bob — technique
  { id: 'pl5',  user_id: 'u3', label: 'Migration ERP Meridian',    color: '#6366f1', date_debut: '2026-03-03', date_fin: '2026-04-17' },
  { id: 'pl6',  user_id: 'u3', label: 'Infra Cloud Industriel',    color: '#14b8a6', date_debut: '2026-04-22', date_fin: '2026-05-29' },
  // Claire — fonctionnel
  { id: 'pl7',  user_id: 'u4', label: 'Conformité RGPD Pharma',    color: '#16a34a', date_debut: '2026-03-03', date_fin: '2026-03-20' },
  { id: 'pl8',  user_id: 'u4', label: 'Support & MCO Altéa',       color: '#0ea5e9', date_debut: '2026-03-24', date_fin: '2026-04-30' },
  { id: 'pl9',  user_id: 'u4', label: 'Formation Data TechForge',  color: '#f59e0b', date_debut: '2026-05-04', date_fin: '2026-05-29' },
  // David — technique
  { id: 'pl10', user_id: 'u5', label: 'TMS Logistique Express',    color: '#f97316', date_debut: '2026-03-03', date_fin: '2026-03-14' },
  { id: 'pl11', user_id: 'u5', label: 'Infra Cloud Industriel',    color: '#14b8a6', date_debut: '2026-03-17', date_fin: '2026-05-29' },
]

// ── Saisies de temps (générées dynamiquement / semaine courante) ──
function makeSaisie(id, date, projetId, projetName, hDebut, hFin, note) {
  const [h1, m1] = hDebut.split(':').map(Number)
  const [h2, m2] = hFin.split(':').map(Number)
  const heures = Math.round(((h2 * 60 + m2) - (h1 * 60 + m1)) / 60 * 10) / 10
  return {
    id,
    date,
    heures,
    commentaire: JSON.stringify({ projet_id: projetId, projet_name: projetName, h_debut: hDebut, h_fin: hFin, note: note || null }),
  }
}

// Génère les saisies pour les 3 dernières semaines + semaine courante
function generateSaisies() {
  const monday = getMonday(new Date())
  const rows = []
  let n = 0

  const SLOTS = [
    // [semaine, jour(0=lun), projetIdx, hDebut, hFin, note]
    // Semaine courante (0)
    [0, 0, 0, '09:00', '12:30', 'Réunion de cadrage'],
    [0, 0, 1, '14:00', '17:00', 'Développement sprint'],
    [0, 1, 0, '09:00', '11:00', 'Point client'],
    [0, 1, 2, '13:30', '18:00', 'Intégration'],
    [0, 2, 1, '09:00', '12:30', 'Formation module'],
    [0, 2, 0, '14:00', '17:30', 'Tests fonctionnels'],
    [0, 3, 2, '09:30', '12:00', 'Documentation'],
    [0, 3, 1, '13:00', '16:00', 'Livraison V1'],
    [0, 4, 0, '09:00', '10:30', 'Bilan hebdo'],
    // Semaine -1
    [-1, 0, 1, '09:00', '13:00', 'Sprint planning'],
    [-1, 0, 0, '14:00', '17:00', 'Analyse fonctionnelle'],
    [-1, 1, 2, '09:00', '12:00', 'Atelier client'],
    [-1, 1, 0, '14:00', '18:00', 'Dev features'],
    [-1, 2, 1, '08:30', '12:00', 'Revue de code'],
    [-1, 2, 2, '13:00', '16:30', 'Tests intégration'],
    [-1, 3, 0, '09:00', '12:30', 'Rédaction specs'],
    [-1, 4, 1, '09:00', '11:30', 'Démo client'],
    [-1, 4, 0, '14:00', '16:00', 'Rétrospective'],
    // Semaine -2
    [-2, 0, 0, '09:00', '12:00', 'Kickoff projet'],
    [-2, 0, 2, '14:00', '17:30', 'Formation utilisateurs'],
    [-2, 1, 1, '09:00', '13:00', 'Développement'],
    [-2, 2, 0, '10:00', '12:00', 'Comité de pilotage'],
    [-2, 2, 1, '13:00', '17:00', 'Dev API'],
    [-2, 3, 2, '09:00', '12:30', 'Support technique'],
    [-2, 4, 0, '09:00', '11:00', 'Compte rendu'],
  ]

  const PROJETS_DEMO = [
    { id: 'p1', name: 'Migration ERP Meridian' },
    { id: 'p2', name: 'Formation Data TechForge' },
    { id: 'p5', name: 'Support & MCO Altéa' },
  ]

  for (const [semaine, jour, projetIdx, hDebut, hFin, note] of SLOTS) {
    const date = toISO(addDays(monday, semaine * 7 + jour))
    const p = PROJETS_DEMO[projetIdx]
    rows.push(makeSaisie(`demo-saisie-${n++}`, date, p.id, p.name, hDebut, hFin, note))
  }
  return rows
}

export const DEMO_SAISIES = generateSaisies()

// ── Saisies équipe (multi-utilisateurs) ──────────────────────
function generateTeamSaisies() {
  const monday = getMonday(new Date())
  const rows = []
  let n = 0

  // [userId, semaine, jour(0=lun), projetIdx, hDebut, hFin, note]
  const SLOTS = [
    // Nicolas (u1)
    ['u1', 0, 0, 0, '09:00', '12:30', 'Réunion de cadrage'],
    ['u1', 0, 0, 1, '14:00', '17:00', 'Développement sprint'],
    ['u1', 0, 1, 0, '09:00', '11:00', 'Point client'],
    ['u1', 0, 2, 2, '09:00', '12:30', 'Documentation'],
    ['u1', 0, 3, 0, '10:00', '12:00', 'Comité de pilotage'],
    ['u1', 0, 4, 1, '09:00', '11:30', 'Démo client'],
    // Alice (u2)
    ['u2', 0, 0, 1, '08:30', '12:00', 'Sprint planning'],
    ['u2', 0, 0, 2, '13:30', '17:00', 'Formation module'],
    ['u2', 0, 1, 0, '09:00', '12:30', 'Analyse fonctionnelle'],
    ['u2', 0, 1, 1, '14:00', '18:00', 'Développement'],
    ['u2', 0, 2, 0, '09:00', '11:00', 'Revue de code'],
    ['u2', 0, 3, 2, '09:30', '12:00', 'Tests intégration'],
    ['u2', 0, 4, 1, '14:00', '17:00', 'Livraison V1'],
    // Bob (u3)
    ['u3', 0, 0, 2, '09:00', '11:30', 'Support technique'],
    ['u3', 0, 1, 0, '14:00', '17:30', 'Intégration API'],
    ['u3', 0, 2, 1, '09:30', '12:30', 'Dev features'],
    ['u3', 0, 2, 2, '13:00', '16:00', 'Tests fonctionnels'],
    ['u3', 0, 3, 0, '09:00', '12:30', 'Rédaction specs'],
    ['u3', 0, 4, 1, '09:00', '11:00', 'Bilan hebdo'],
    // Claire (u4)
    ['u4', 0, 0, 0, '10:00', '12:00', 'Kickoff projet'],
    ['u4', 0, 1, 2, '09:00', '12:00', 'Atelier client'],
    ['u4', 0, 2, 1, '14:00', '17:00', 'Dev API'],
    ['u4', 0, 3, 0, '09:00', '11:30', 'Rétrospective'],
    ['u4', 0, 4, 2, '13:00', '16:30', 'Support'],
    // David (u5)
    ['u5', 0, 0, 1, '09:00', '13:00', 'Développement'],
    ['u5', 0, 1, 0, '14:00', '18:00', 'Dev features'],
    ['u5', 0, 2, 2, '09:00', '12:00', 'Tests'],
    ['u5', 0, 3, 1, '10:00', '12:30', 'Revue'],
    ['u5', 0, 4, 0, '09:00', '12:00', 'Compte rendu'],
  ]

  const PROJETS_DEMO = [
    { id: 'p1', name: 'Migration ERP Meridian' },
    { id: 'p2', name: 'Formation Data TechForge' },
    { id: 'p5', name: 'Support & MCO Altéa' },
  ]

  for (const [userId, semaine, jour, projetIdx, hDebut, hFin, note] of SLOTS) {
    const date = toISO(addDays(monday, semaine * 7 + jour))
    const p = PROJETS_DEMO[projetIdx]
    rows.push({
      ...makeSaisie(`demo-team-${n++}`, date, p.id, p.name, hDebut, hFin, note),
      user_id: userId,
    })
  }
  return rows
}

export const DEMO_TEAM_SAISIES = generateTeamSaisies()

// ── FEC ───────────────────────────────────────────────────────
function entry(id, date, journal, num, compteNum, compteLib, lib, debit, credit) {
  return { id, ecriture_date: date, journal_code: journal, ecriture_num: num,
    compte_num: compteNum, compte_lib: compteLib, ecriture_lib: lib,
    debit: Math.round(debit * 100) / 100, credit: Math.round(credit * 100) / 100,
    piece_ref: null, ecriture_let: null }
}

const CA_2023 = [110, 125, 145, 135, 160, 130, 80, 60, 155, 150, 145, 130]
const CA_2024 = [130, 145, 155, 160, 175, 150, 90, 70, 170, 168, 162, 148]
const MOIS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function generateYear(year, caMonths) {
  const rows = []
  let id = 1
  for (let m = 0; m < 12; m++) {
    const ca       = caMonths[m] * 1000
    const achats   = Math.round(ca * 0.148)
    const salaires = Math.round(ca * 0.32)
    const charges  = Math.round(ca * 0.17)
    const loyer    = 8500
    const autres   = Math.round(ca * 0.062)
    const dotations= Math.round(ca * 0.018)
    const dateStr  = fmt(new Date(year, m, 28))
    const dateEnc  = fmt(new Date(year, Math.min(m + 1, 11), 5))
    const lib = MOIS[m]

    rows.push(entry(id++, dateStr, 'VTE', `VTE${year}${String(m+1).padStart(2,'0')}`, '701000', 'Prestations de services', `CA ${lib}`, 0, ca))
    rows.push(entry(id++, dateStr, 'VTE', `VTE${year}${String(m+1).padStart(2,'0')}`, '411000', 'Clients', `CA ${lib}`, ca, 0))
    rows.push(entry(id++, dateEnc, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}E`, '512000', 'Banque', `Encaissement ${lib}`, ca, 0))
    rows.push(entry(id++, dateEnc, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}E`, '411000', 'Clients', `Encaissement ${lib}`, 0, ca))
    rows.push(entry(id++, dateStr, 'ACH', `ACH${year}${String(m+1).padStart(2,'0')}`, '607100', 'Sous-traitance', `ST ${lib}`, achats, 0))
    rows.push(entry(id++, dateStr, 'ACH', `ACH${year}${String(m+1).padStart(2,'0')}`, '401000', 'Fournisseurs', `ST ${lib}`, 0, achats))
    rows.push(entry(id++, dateStr, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}A`, '401000', 'Fournisseurs', `Règl. ST ${lib}`, achats, 0))
    rows.push(entry(id++, dateStr, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}A`, '512000', 'Banque', `Règl. ST ${lib}`, 0, achats))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}S`, '641100', 'Salaires bruts', `Salaires ${lib}`, salaires, 0))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}S`, '421000', 'Personnel — rémunérations', `Salaires ${lib}`, 0, salaires))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}C`, '645100', 'Cotisations URSSAF', `Charges soc. ${lib}`, charges, 0))
    rows.push(entry(id++, dateStr, 'PAY', `PAY${year}${String(m+1).padStart(2,'0')}C`, '431000', 'Organismes sociaux', `Charges soc. ${lib}`, 0, charges))
    rows.push(entry(id++, dateStr, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}P`, '421000', 'Personnel', `Paie ${lib}`, salaires, 0))
    rows.push(entry(id++, dateStr, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}P`, '431000', 'Org. sociaux', `Charges ${lib}`, charges, 0))
    rows.push(entry(id++, dateStr, 'BQ',  `BQ${year}${String(m+1).padStart(2,'0')}P`, '512000', 'Banque', `Paie+charges ${lib}`, 0, salaires + charges))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}L`, '613200', 'Locations', `Loyer ${lib}`, loyer, 0))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}L`, '512000', 'Banque', `Loyer ${lib}`, 0, loyer))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}A`, '626000', 'Frais télécom', `Télécom ${lib}`, 1800, 0))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}A`, '512000', 'Banque', `Télécom ${lib}`, 0, 1800))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}B`, '651000', 'Autres charges', `Autres ${lib}`, Math.max(0, autres - 1800), 0))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}B`, '512000', 'Banque', `Autres ${lib}`, 0, Math.max(0, autres - 1800)))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}D`, '681120', 'Dot. amort.', `Amort. ${lib}`, dotations, 0))
    rows.push(entry(id++, dateStr, 'OD',  `OD${year}${String(m+1).padStart(2,'0')}D`, '281510', 'Amort. matériel', `Amort. ${lib}`, 0, dotations))
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

// ── Notes de frais démo ───────────────────────────────────────
// Données réalistes pour une ESN — 5 collaborateurs, 3 mois glissants
function daysAgo(n) { return fmt(addDays(new Date(), -n)) }

export const DEMO_NOTES_DE_FRAIS = [
  // ── Nicolas (u1 — admin / chef de projet) ──────────────────
  { id: 'ndf-01', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(2),  categorie: 'repas',       description: 'Déjeuner client — Groupe Altéa (3 pers.)',          montant: 87.50,  statut: 'soumis',    justificatif: 'FAC-2026-0312' },
  { id: 'ndf-02', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(8),  categorie: 'transport',   description: 'Train Paris–Lyon A/R — mission Meridian Finance',   montant: 142.00, statut: 'valide',    justificatif: 'SNCF-26048712' },
  { id: 'ndf-03', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(10), categorie: 'hebergement', description: 'Nuit hôtel Lyon — mission Meridian (1 nuit)',         montant: 128.00, statut: 'valide',    justificatif: 'HTL-00291' },
  { id: 'ndf-04', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(22), categorie: 'repas',       description: 'Repas d\'équipe — rétrospective sprint',             montant: 156.80, statut: 'rembourse', justificatif: 'FAC-2026-0289' },
  { id: 'ndf-05', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(35), categorie: 'transport',   description: 'Taxi aéroport CDG → bureau',                        montant: 58.00,  statut: 'rembourse', justificatif: 'UBER-26-0219' },
  { id: 'ndf-06', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(45), categorie: 'materiel',    description: 'Câble HDMI + hub USB-C pour présentation client',    montant: 43.90,  statut: 'rembourse', justificatif: 'AMZN-FR-0182' },
  { id: 'ndf-07', user_id: 'u1', user_name: 'Nicolas Nabhan',   date: daysAgo(60), categorie: 'formation',   description: 'Conférence Agile France — inscription',             montant: 490.00, statut: 'rembourse', justificatif: 'AGILE-2026-042' },

  // ── Alice (u2 — manager / commercial) ──────────────────────
  { id: 'ndf-08', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(1),  categorie: 'repas',       description: 'Déjeuner prospect — TechForge SAS (2 pers.)',       montant: 64.00,  statut: 'brouillon', justificatif: '' },
  { id: 'ndf-09', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(5),  categorie: 'transport',   description: 'TGV Paris–Bordeaux — salon commercial',            montant: 118.50, statut: 'soumis',    justificatif: 'SNCF-26051090' },
  { id: 'ndf-10', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(5),  categorie: 'hebergement', description: 'Hôtel Bordeaux — salon commercial (1 nuit)',        montant: 145.00, statut: 'soumis',    justificatif: 'HTL-BDX-0055' },
  { id: 'ndf-11', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(18), categorie: 'repas',       description: 'Business lunch Datavision Group (4 pers.)',         montant: 210.00, statut: 'valide',    justificatif: 'FAC-2026-0301' },
  { id: 'ndf-12', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(28), categorie: 'transport',   description: 'Location voiture — mission Industriel Nord (3 j)', montant: 215.00, statut: 'valide',    justificatif: 'HERTZ-26-1103' },
  { id: 'ndf-13', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(30), categorie: 'hebergement', description: 'Hôtel Lille ×2 nuits — mission Industriel Nord',    montant: 276.00, statut: 'valide',    justificatif: 'HTL-LIL-0391' },
  { id: 'ndf-14', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(50), categorie: 'autre',       description: 'Abonnement LinkedIn Sales Navigator (1 mois)',      montant: 89.99,  statut: 'refuse',    justificatif: 'LI-2026-02' },
  { id: 'ndf-15', user_id: 'u2', user_name: 'Alice Martin',     date: daysAgo(62), categorie: 'repas',       description: 'Déjeuner équipe commerciale — bilan Q1',            montant: 185.00, statut: 'rembourse', justificatif: 'FAC-2026-0241' },

  // ── Bob (u3 — développeur) ──────────────────────────────────
  { id: 'ndf-16', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(3),  categorie: 'transport',   description: 'Métro/RER — déplacements client semaine',          montant: 22.10,  statut: 'brouillon', justificatif: '' },
  { id: 'ndf-17', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(12), categorie: 'materiel',    description: 'Clavier mécanique ergonomique — télétravail',      montant: 134.99, statut: 'soumis',    justificatif: 'AMZN-FR-0341' },
  { id: 'ndf-18', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(25), categorie: 'repas',       description: 'Repas chez client Meridian (mission déjeuner)',     montant: 18.50,  statut: 'valide',    justificatif: 'FAC-2026-0277' },
  { id: 'ndf-19', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(40), categorie: 'formation',   description: 'Udemy — cours certification AWS',                   montant: 19.99,  statut: 'valide',    justificatif: 'UDEMY-2026-031' },
  { id: 'ndf-20', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(55), categorie: 'transport',   description: 'Train Paris–Nantes A/R — audit infra client',      montant: 98.00,  statut: 'rembourse', justificatif: 'SNCF-26038890' },
  { id: 'ndf-21', user_id: 'u3', user_name: 'Bob Dupont',       date: daysAgo(57), categorie: 'hebergement', description: 'Hôtel Nantes — audit infra (1 nuit)',               montant: 112.00, statut: 'rembourse', justificatif: 'HTL-NTS-0612' },

  // ── Claire (u4 — consultante fonctionnelle) ─────────────────
  { id: 'ndf-22', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(4),  categorie: 'repas',       description: 'Atelier client Pharma Innov — déjeuner (5 pers.)', montant: 145.00, statut: 'soumis',    justificatif: 'FAC-2026-0318' },
  { id: 'ndf-23', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(14), categorie: 'transport',   description: 'Taxi vers aéroport CDG — vol mission Pharma',      montant: 65.00,  statut: 'valide',    justificatif: 'BOLT-26-0441' },
  { id: 'ndf-24', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(15), categorie: 'hebergement', description: 'Hôtel Strasbourg ×2 nuits — séminaire RGPD',       montant: 258.00, statut: 'valide',    justificatif: 'HTL-STR-0187' },
  { id: 'ndf-25', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(16), categorie: 'transport',   description: 'TGV Paris–Strasbourg A/R — séminaire RGPD',        montant: 134.00, statut: 'valide',    justificatif: 'SNCF-26044211' },
  { id: 'ndf-26', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(38), categorie: 'materiel',    description: 'Fournitures bureau — post-its, marqueurs atelier',  montant: 31.40,  statut: 'rembourse', justificatif: 'LFDUP-2026-089' },
  { id: 'ndf-27', user_id: 'u4', user_name: 'Claire Petit',     date: daysAgo(70), categorie: 'formation',   description: 'Certification PMP — frais d\'inscription',          montant: 555.00, statut: 'rembourse', justificatif: 'PMI-2026-CLR' },

  // ── David (u5 — ingénieur infra) ───────────────────────────
  { id: 'ndf-28', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(6),  categorie: 'transport',   description: 'Essence voiture perso — mission Industriel Nord',  montant: 78.40,  statut: 'brouillon', justificatif: '' },
  { id: 'ndf-29', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(9),  categorie: 'repas',       description: 'Repas sur site client Industriel Nord',            montant: 24.90,  statut: 'soumis',    justificatif: 'FAC-2026-0309' },
  { id: 'ndf-30', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(20), categorie: 'materiel',    description: 'Disque SSD externe — sauvegarde audit client',      montant: 89.99,  statut: 'valide',    justificatif: 'AMZN-FR-0398' },
  { id: 'ndf-31', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(33), categorie: 'hebergement', description: 'Hôtel Valenciennes ×3 nuits — déploiement infra',   montant: 324.00, statut: 'rembourse', justificatif: 'HTL-VAL-0044' },
  { id: 'ndf-32', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(35), categorie: 'transport',   description: 'Train Paris–Valenciennes A/R — mission infra',     montant: 87.00,  statut: 'rembourse', justificatif: 'SNCF-26041775' },
  { id: 'ndf-33', user_id: 'u5', user_name: 'David Lemaire',    date: daysAgo(48), categorie: 'autre',       description: 'Parking aéroport 4 jours — déplacement client',    montant: 72.00,  statut: 'rembourse', justificatif: 'PARK-CDG-4412' },
]
