import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// ─── DEMO DATA ───────────────────────────────────────────────────────

const REVENUS_PERDUS = [
  { client: 'Crédit Agricole IDF', projet: 'Migration SI Agence', heuresTravaillees: 342, heuresFacturees: 280, tauxJour: 850, statut: 'danger' },
  { client: 'SNCF Réseau', projet: 'Portail Maintenance', heuresTravaillees: 518, heuresFacturees: 490, tauxJour: 920, statut: 'warning' },
  { client: 'AXA France', projet: 'App Mobile Sinistres', heuresTravaillees: 195, heuresFacturees: 120, tauxJour: 780, statut: 'danger' },
  { client: 'Mairie de Créteil', projet: 'Dématérialisation RH', heuresTravaillees: 410, heuresFacturees: 405, tauxJour: 650, statut: 'good' },
  { client: 'Enedis', projet: 'Dashboard IoT Compteurs', heuresTravaillees: 276, heuresFacturees: 210, tauxJour: 900, statut: 'danger' },
  { client: 'BNP Paribas', projet: 'Refonte API Paiements', heuresTravaillees: 680, heuresFacturees: 650, tauxJour: 950, statut: 'warning' },
  { client: 'Sodexo', projet: 'Plateforme Tickets', heuresTravaillees: 155, heuresFacturees: 155, tauxJour: 720, statut: 'good' },
  { client: 'La Poste', projet: 'Tracking Colis v3', heuresTravaillees: 490, heuresFacturees: 390, tauxJour: 830, statut: 'danger' },
  { client: 'Orange Business', projet: 'SD-WAN Console', heuresTravaillees: 320, heuresFacturees: 300, tauxJour: 880, statut: 'warning' },
  { client: 'Dassault Systèmes', projet: 'Plugin 3DExperience', heuresTravaillees: 230, heuresFacturees: 228, tauxJour: 1050, statut: 'good' },
].map(r => ({
  ...r,
  ecartHeures: r.heuresTravaillees - r.heuresFacturees,
  ecartEuros: (r.heuresTravaillees - r.heuresFacturees) * (r.tauxJour / 8),
})).sort((a, b) => b.ecartEuros - a.ecartEuros)

const SANTE_CLIENTS = [
  { nom: 'Crédit Agricole IDF', rentabilite: 0.32, delaiPaiement: 45, pipelineActif: true, chiffreAffaires: '485K€' },
  { nom: 'SNCF Réseau', rentabilite: 0.28, delaiPaiement: 62, pipelineActif: true, chiffreAffaires: '1.2M€' },
  { nom: 'AXA France', rentabilite: 0.15, delaiPaiement: 78, pipelineActif: false, chiffreAffaires: '320K€' },
  { nom: 'Mairie de Créteil', rentabilite: 0.41, delaiPaiement: 30, pipelineActif: true, chiffreAffaires: '180K€' },
  { nom: 'Enedis', rentabilite: 0.22, delaiPaiement: 55, pipelineActif: true, chiffreAffaires: '650K€' },
  { nom: 'BNP Paribas', rentabilite: 0.38, delaiPaiement: 35, pipelineActif: true, chiffreAffaires: '2.1M€' },
  { nom: 'Sodexo', rentabilite: 0.45, delaiPaiement: 28, pipelineActif: true, chiffreAffaires: '95K€' },
  { nom: 'La Poste', rentabilite: 0.12, delaiPaiement: 90, pipelineActif: false, chiffreAffaires: '410K€' },
  { nom: 'Orange Business', rentabilite: 0.35, delaiPaiement: 40, pipelineActif: true, chiffreAffaires: '780K€' },
  { nom: 'Dassault Systèmes', rentabilite: 0.48, delaiPaiement: 25, pipelineActif: true, chiffreAffaires: '560K€' },
].map(c => {
  const scoreRenta = Math.min(100, c.rentabilite * 200)
  const scorePaiement = Math.max(0, 100 - (c.delaiPaiement - 30) * 1.5)
  const scoreActivite = c.pipelineActif ? 100 : 20
  const score = Math.round(scoreRenta * 0.4 + scorePaiement * 0.3 + scoreActivite * 0.3)
  return { ...c, score, scoreRenta: Math.round(scoreRenta), scorePaiement: Math.round(scorePaiement), scoreActivite: Math.round(scoreActivite) }
}).sort((a, b) => a.score - b.score)

const TRESORERIE_EVENTS = [
  { date: '2026-04-02', label: 'Facture BNP Paribas - Refonte API', montant: 58500, type: 'entree' },
  { date: '2026-04-05', label: 'Salaires Mars', montant: -142000, type: 'sortie' },
  { date: '2026-04-08', label: 'Facture SNCF Réseau - Portail', montant: 43200, type: 'entree' },
  { date: '2026-04-10', label: 'Loyers bureaux (3 sites)', montant: -18500, type: 'sortie' },
  { date: '2026-04-15', label: 'Facture Orange Business', montant: 32800, type: 'entree' },
  { date: '2026-04-15', label: 'Charges sociales T1', montant: -67000, type: 'sortie' },
  { date: '2026-04-22', label: 'Facture Enedis - Dashboard IoT', montant: 28400, type: 'entree' },
  { date: '2026-04-28', label: 'Facture Crédit Agricole', montant: 38700, type: 'entree' },
  { date: '2026-05-05', label: 'Salaires Avril', montant: -142000, type: 'sortie' },
  { date: '2026-05-12', label: 'Facture Dassault Systèmes', montant: 52000, type: 'entree' },
  { date: '2026-05-15', label: 'Facture Mairie de Créteil', montant: 15600, type: 'entree' },
  { date: '2026-05-20', label: 'Licences & infra cloud', montant: -12400, type: 'sortie' },
  { date: '2026-06-02', label: 'Facture La Poste - Tracking', montant: 41500, type: 'entree' },
  { date: '2026-06-05', label: 'Salaires Mai', montant: -142000, type: 'sortie' },
  { date: '2026-06-10', label: 'Loyers bureaux', montant: -18500, type: 'sortie' },
  { date: '2026-06-18', label: 'Facture AXA France', montant: 24800, type: 'entree' },
]

const OCCUPATION_DATA = [
  { nom: 'Marie Dupont', role: 'Dev Senior', taux: 95, projets: ['BNP API', 'SNCF Portail'] },
  { nom: 'Thomas Martin', role: 'Dev Full-Stack', taux: 88, projets: ['Enedis IoT'] },
  { nom: 'Julie Leroy', role: 'Chef de Projet', taux: 72, projets: ['AXA Mobile'] },
  { nom: 'Alexandre Petit', role: 'Dev Junior', taux: 45, projets: ['Mairie Créteil'] },
  { nom: 'Sophie Bernard', role: 'UX Designer', taux: 82, projets: ['BNP API', 'Orange SD-WAN'] },
  { nom: 'Lucas Moreau', role: 'Dev Back-End', taux: 91, projets: ['La Poste Tracking', 'Dassault Plugin'] },
  { nom: 'Emma Girard', role: 'Dev Front-End', taux: 67, projets: ['Sodexo Tickets'] },
  { nom: 'Hugo Roux', role: 'DevOps', taux: 98, projets: ['BNP API', 'SNCF Portail', 'Enedis IoT'] },
  { nom: 'Camille Fournier', role: 'QA Lead', taux: 55, projets: ['AXA Mobile'] },
  { nom: 'Nathan Durand', role: 'Dev Senior', taux: 85, projets: ['Orange SD-WAN', 'Crédit Agricole'] },
  { nom: 'Léa Bonnet', role: 'Data Analyst', taux: 38, projets: [] },
  { nom: 'Maxime Lambert', role: 'Dev Full-Stack', taux: 76, projets: ['Dassault Plugin'] },
  { nom: 'Chloé Mercier', role: 'Scrum Master', taux: 70, projets: ['La Poste Tracking', 'AXA Mobile'] },
  { nom: 'Antoine Faure', role: 'Architecte', taux: 92, projets: ['BNP API', 'SNCF Portail'] },
  { nom: 'Manon Garnier', role: 'Dev Junior', taux: 42, projets: ['Mairie Créteil'] },
]

const ALERTES = [
  { id: 1, severity: 'danger', icon: '🔴', title: '3 factures en retard > 60 jours pour La Poste', description: 'Montant total impayé : 41 500 €. Dernière relance il y a 15 jours. Risque de créance irrécouvrable.', action: 'Relancer le client', timestamp: '2026-03-28 09:15' },
  { id: 2, severity: 'danger', icon: '🔴', title: 'Projet AXA Mobile : dépassement budget de 38%', description: '195h travaillées vs 120h facturées. Écart de 58 500 €. Aucun avenant signé.', action: 'Créer un avenant', timestamp: '2026-03-28 08:42' },
  { id: 3, severity: 'warning', icon: '🟡', title: 'Trésorerie tendue prévue début mai', description: 'Solde prévisionnel à J+35 : 28 400 €. Les salaires d\'avril risquent de mettre le compte à découvert.', action: 'Anticiper la trésorerie', timestamp: '2026-03-28 08:30' },
  { id: 4, severity: 'warning', icon: '🟡', title: 'Léa Bonnet sous-occupée depuis 3 semaines', description: 'Taux d\'occupation à 38%. Aucun projet assigné depuis le 6 mars. Compétences : Data, Python, SQL.', action: 'Affecter à un projet', timestamp: '2026-03-27 17:00' },
  { id: 5, severity: 'warning', icon: '🟡', title: 'Hugo Roux en surcharge à 98%', description: 'Affecté à 3 projets simultanés. Risque de burnout et de qualité dégradée.', action: 'Réaffecter des tâches', timestamp: '2026-03-27 16:45' },
  { id: 6, severity: 'info', icon: '🔵', title: 'Rentabilité en hausse sur BNP Paribas (+5pts)', description: 'La marge est passée de 33% à 38% ce mois grâce à l\'optimisation des sprints.', action: 'Voir le détail', timestamp: '2026-03-27 14:20' },
  { id: 7, severity: 'danger', icon: '🔴', title: 'Client AXA France : score santé critique (35/100)', description: 'Rentabilité faible (15%), paiements à 78 jours, aucun pipeline actif. Risque de perte du client.', action: 'Plan d\'action client', timestamp: '2026-03-27 11:00' },
  { id: 8, severity: 'info', icon: '🔵', title: 'Sodexo : facturation à jour, aucune fuite détectée', description: 'Toutes les heures sont facturées. Taux de fuite : 0%. Client exemplaire.', action: 'Voir le rapport', timestamp: '2026-03-27 10:30' },
  { id: 9, severity: 'warning', icon: '🟡', title: 'Projet Enedis : 66h non facturées ce mois', description: 'Écart croissant entre heures saisies et facturées. Vérifier les bons de commande.', action: 'Vérifier la facturation', timestamp: '2026-03-26 16:00' },
  { id: 10, severity: 'info', icon: '🔵', title: '2 nouveaux projets détectés dans le pipeline Dassault', description: 'Potentiel CA additionnel estimé : 180K€. Phase d\'avant-vente en cours.', action: 'Voir le pipeline', timestamp: '2026-03-26 09:15' },
]

// ─── STYLES ──────────────────────────────────────────────────────────

const COLORS = {
  good: '#16a34a',
  goodBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  info: '#2563eb',
  infoBg: '#dbeafe',
}

const styles = {
  wrapper: {
    height: 'calc(100vh - 140px)',
    margin: '5px 0 20px 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    padding: '3px 10px',
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: 'var(--surface)',
    borderRadius: 10,
    padding: 4,
    border: '1px solid var(--border)',
    flexShrink: 0,
    marginBottom: 12,
    overflowX: 'auto',
  },
  tab: (active) => ({
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: 4,
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: (accent) => ({
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow)',
    borderLeft: `4px solid ${accent || 'var(--primary)'}`,
  }),
  kpiLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--text)',
  },
  kpiSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  th: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'left',
    background: '#f8fafc',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '10px 14px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  clientCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: 16,
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    background: '#e2e8f0',
    overflow: 'hidden',
    width: '100%',
  },
  scoreFill: (score) => ({
    height: '100%',
    borderRadius: 4,
    width: `${score}%`,
    background: score >= 70 ? COLORS.good : score >= 45 ? COLORS.warning : COLORS.danger,
    transition: 'width 0.6s ease',
  }),
  collabGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
  },
  collabCard: (taux) => ({
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    boxShadow: 'var(--shadow)',
    borderLeft: `4px solid ${taux >= 80 ? COLORS.good : taux >= 60 ? COLORS.warning : COLORS.danger}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }),
  alertCard: (severity) => ({
    background: severity === 'danger' ? COLORS.dangerBg : severity === 'warning' ? COLORS.warningBg : COLORS.infoBg,
    borderRadius: 'var(--radius)',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    borderLeft: `4px solid ${severity === 'danger' ? COLORS.danger : severity === 'warning' ? COLORS.warning : COLORS.info}`,
  }),
  alertBtn: (severity) => ({
    padding: '5px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    background: severity === 'danger' ? COLORS.danger : severity === 'warning' ? COLORS.warning : COLORS.info,
    color: '#fff',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  timelineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  timelineBar: (type, maxAbs, montant) => ({
    height: 22,
    borderRadius: 4,
    background: type === 'entree' ? COLORS.good : COLORS.danger,
    opacity: 0.8,
    width: `${Math.max(8, (Math.abs(montant) / maxAbs) * 100)}%`,
    transition: 'width 0.4s ease',
  }),
  recoCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 13,
  },
}

// ─── HELPERS ─────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
const fmtEur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const statusIcon = (s) => s === 'good' ? '🟢' : s === 'warning' ? '🟡' : '🔴'
const statusColor = (s) => s === 'good' ? COLORS.good : s === 'warning' ? COLORS.warning : COLORS.danger

// ─── TABS CONFIG ─────────────────────────────────────────────────────

const TABS = [
  { id: 'revenus', label: 'Revenus perdus', icon: '💸' },
  { id: 'sante', label: 'Santé client', icon: '❤️' },
  { id: 'tresorerie', label: 'Trésorerie', icon: '🏦' },
  { id: 'occupation', label: 'Occupation', icon: '👥' },
  { id: 'alertes', label: 'Alertes IA', icon: '🚨' },
]

// ─── TAB COMPONENTS ──────────────────────────────────────────────────

function TabRevenus() {
  const totalNonFacture = REVENUS_PERDUS.reduce((s, r) => s + r.ecartEuros, 0)
  const nbProjets = REVENUS_PERDUS.filter(r => r.ecartHeures > 0).length
  const totalHeures = REVENUS_PERDUS.reduce((s, r) => s + r.heuresTravaillees, 0)
  const totalFacture = REVENUS_PERDUS.reduce((s, r) => s + r.heuresFacturees, 0)
  const tauxFuite = ((1 - totalFacture / totalHeures) * 100).toFixed(1)

  return (
    <>
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard(COLORS.danger)}>
          <div style={styles.kpiLabel}>Total non facturé</div>
          <div style={styles.kpiValue}>{fmtEur(totalNonFacture)}</div>
          <div style={styles.kpiSub}>sur les 12 derniers mois</div>
        </div>
        <div style={styles.kpiCard(COLORS.warning)}>
          <div style={styles.kpiLabel}>Projets concernés</div>
          <div style={styles.kpiValue}>{nbProjets}</div>
          <div style={styles.kpiSub}>sur {REVENUS_PERDUS.length} projets actifs</div>
        </div>
        <div style={styles.kpiCard(COLORS.danger)}>
          <div style={styles.kpiLabel}>Taux de fuite</div>
          <div style={styles.kpiValue}>{tauxFuite}%</div>
          <div style={styles.kpiSub}>heures travaillées non facturées</div>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Client</th>
            <th style={styles.th}>Projet</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>H. travaillées</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>H. facturées</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Écart (€)</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {REVENUS_PERDUS.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...styles.td, fontWeight: 600 }}>{r.client}</td>
              <td style={styles.td}>{r.projet}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.heuresTravaillees)}h</td>
              <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.heuresFacturees)}h</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: statusColor(r.statut), fontVariantNumeric: 'tabular-nums' }}>
                {r.ecartEuros > 0 ? fmtEur(r.ecartEuros) : '—'}
              </td>
              <td style={{ ...styles.td, textAlign: 'center', fontSize: 18 }}>{statusIcon(r.statut)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function TabSante() {
  const sains = SANTE_CLIENTS.filter(c => c.score >= 70).length
  const risque = SANTE_CLIENTS.filter(c => c.score >= 45 && c.score < 70).length
  const critiques = SANTE_CLIENTS.filter(c => c.score < 45).length

  return (
    <>
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard(COLORS.good)}>
          <div style={styles.kpiLabel}>Clients sains</div>
          <div style={{ ...styles.kpiValue, color: COLORS.good }}>{sains}</div>
          <div style={styles.kpiSub}>score &ge; 70</div>
        </div>
        <div style={styles.kpiCard(COLORS.warning)}>
          <div style={styles.kpiLabel}>À risque</div>
          <div style={{ ...styles.kpiValue, color: COLORS.warning }}>{risque}</div>
          <div style={styles.kpiSub}>score 45–69</div>
        </div>
        <div style={styles.kpiCard(COLORS.danger)}>
          <div style={styles.kpiLabel}>Critiques</div>
          <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{critiques}</div>
          <div style={styles.kpiSub}>score &lt; 45</div>
        </div>
      </div>

      <div style={styles.cardGrid}>
        {SANTE_CLIENTS.map((c, i) => {
          const color = c.score >= 70 ? COLORS.good : c.score >= 45 ? COLORS.warning : COLORS.danger
          return (
            <div key={i} style={{ ...styles.clientCard, borderTop: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</span>
                <span style={{ fontWeight: 800, fontSize: 22, color }}>{c.score}</span>
              </div>
              <div style={styles.scoreBar}>
                <div style={styles.scoreFill(c.score)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Rentabilité</span>
                  <div style={{ fontWeight: 600 }}>{(c.rentabilite * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Délai paiement</span>
                  <div style={{ fontWeight: 600, color: c.delaiPaiement > 60 ? COLORS.danger : c.delaiPaiement > 45 ? COLORS.warning : COLORS.good }}>
                    {c.delaiPaiement}j
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Pipeline actif</span>
                  <div style={{ fontWeight: 600 }}>{c.pipelineActif ? '✅ Oui' : '❌ Non'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CA annuel</span>
                  <div style={{ fontWeight: 600 }}>{c.chiffreAffaires}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function TabTresorerie() {
  const soldeActuel = 245000
  let solde = soldeActuel
  const timeline = TRESORERIE_EVENTS.map(e => {
    solde += e.montant
    return { ...e, soldeCumulé: solde }
  })
  const maxAbs = Math.max(...TRESORERIE_EVENTS.map(e => Math.abs(e.montant)))

  const j30 = timeline.filter(e => new Date(e.date) <= new Date('2026-04-28')).at(-1)?.soldeCumulé || soldeActuel
  const j60 = timeline.filter(e => new Date(e.date) <= new Date('2026-05-28')).at(-1)?.soldeCumulé || j30
  const j90 = timeline.at(-1)?.soldeCumulé || j60

  return (
    <>
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard('var(--primary)')}>
          <div style={styles.kpiLabel}>Solde actuel</div>
          <div style={styles.kpiValue}>{fmtEur(soldeActuel)}</div>
          <div style={styles.kpiSub}>au 28 mars 2026</div>
        </div>
        <div style={styles.kpiCard(j30 > 100000 ? COLORS.good : COLORS.warning)}>
          <div style={styles.kpiLabel}>Prévision J+30</div>
          <div style={{ ...styles.kpiValue, color: j30 > 100000 ? COLORS.good : COLORS.warning }}>{fmtEur(j30)}</div>
        </div>
        <div style={styles.kpiCard(j60 > 100000 ? COLORS.good : j60 > 50000 ? COLORS.warning : COLORS.danger)}>
          <div style={styles.kpiLabel}>Prévision J+60</div>
          <div style={{ ...styles.kpiValue, color: j60 > 100000 ? COLORS.good : j60 > 50000 ? COLORS.warning : COLORS.danger }}>{fmtEur(j60)}</div>
        </div>
        <div style={styles.kpiCard(j90 > 100000 ? COLORS.good : j90 > 50000 ? COLORS.warning : COLORS.danger)}>
          <div style={styles.kpiLabel}>Prévision J+90</div>
          <div style={{ ...styles.kpiValue, color: j90 > 100000 ? COLORS.good : j90 > 50000 ? COLORS.warning : COLORS.danger }}>{fmtEur(j90)}</div>
        </div>
      </div>

      {/* Visual timeline */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>FLUX DE TRÉSORERIE</div>
        {timeline.map((e, i) => (
          <div key={i} style={{ ...styles.timelineRow, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 72, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={styles.timelineBar(e.type, maxAbs, e.montant)} />
              <span style={{ fontSize: 12, fontWeight: 600, color: e.type === 'entree' ? COLORS.good : COLORS.danger, fontVariantNumeric: 'tabular-nums' }}>
                {e.type === 'entree' ? '+' : ''}{fmtEur(e.montant)}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              Solde: {fmtEur(e.soldeCumulé)}
            </span>
          </div>
        ))}
      </div>

      {/* Events table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Libellé</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Montant</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Solde cumulé</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((e, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...styles.td, fontVariantNumeric: 'tabular-nums' }}>
                {new Date(e.date).toLocaleDateString('fr-FR')}
              </td>
              <td style={styles.td}>{e.label}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: e.type === 'entree' ? COLORS.good : COLORS.danger, fontVariantNumeric: 'tabular-nums' }}>
                {e.type === 'entree' ? '+' : ''}{fmtEur(e.montant)}
              </td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: e.soldeCumulé < 50000 ? COLORS.danger : 'var(--text)' }}>
                {fmtEur(e.soldeCumulé)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function TabOccupation() {
  const tauxMoyen = Math.round(OCCUPATION_DATA.reduce((s, c) => s + c.taux, 0) / OCCUPATION_DATA.length)
  const sousOccupes = OCCUPATION_DATA.filter(c => c.taux < 60).length
  const surOccupes = OCCUPATION_DATA.filter(c => c.taux >= 95).length

  const recommendations = [
    { icon: '💡', text: 'Affecter Léa Bonnet (Data Analyst, 38%) au projet Enedis Dashboard IoT — besoin en data identifié' },
    { icon: '💡', text: 'Affecter Alexandre Petit (Dev Junior, 45%) au projet Orange SD-WAN — renfort développement' },
    { icon: '💡', text: 'Affecter Manon Garnier (Dev Junior, 42%) au projet La Poste Tracking v3 — phase de test' },
    { icon: '⚠️', text: 'Réduire la charge de Hugo Roux (98%) — transférer le suivi Enedis IoT à Thomas Martin (88%)' },
  ]

  return (
    <>
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard('var(--primary)')}>
          <div style={styles.kpiLabel}>Taux moyen</div>
          <div style={styles.kpiValue}>{tauxMoyen}%</div>
          <div style={styles.kpiSub}>objectif : 80%</div>
        </div>
        <div style={styles.kpiCard(COLORS.danger)}>
          <div style={styles.kpiLabel}>Sous-occupés (&lt;60%)</div>
          <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{sousOccupes}</div>
          <div style={styles.kpiSub}>collaborateurs disponibles</div>
        </div>
        <div style={styles.kpiCard(COLORS.warning)}>
          <div style={styles.kpiLabel}>Sur-occupés (&ge;95%)</div>
          <div style={{ ...styles.kpiValue, color: COLORS.warning }}>{surOccupes}</div>
          <div style={styles.kpiSub}>risque de surcharge</div>
        </div>
      </div>

      <div style={styles.collabGrid}>
        {OCCUPATION_DATA.sort((a, b) => a.taux - b.taux).map((c, i) => (
          <div key={i} style={styles.collabCard(c.taux)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{c.nom}</span>
              <span style={{
                fontWeight: 800,
                fontSize: 18,
                color: c.taux >= 80 ? COLORS.good : c.taux >= 60 ? COLORS.warning : COLORS.danger,
              }}>
                {c.taux}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.role}</div>
            <div style={styles.scoreBar}>
              <div style={{
                height: '100%',
                borderRadius: 4,
                width: `${c.taux}%`,
                background: c.taux >= 80 ? COLORS.good : c.taux >= 60 ? COLORS.warning : COLORS.danger,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {c.projets.length > 0 ? c.projets.join(', ') : 'Aucun projet assigné'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Recommandations IA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recommendations.map((r, i) => (
            <div key={i} style={styles.recoCard}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function TabAlertes() {
  const dangers = ALERTES.filter(a => a.severity === 'danger').length
  const warnings = ALERTES.filter(a => a.severity === 'warning').length
  const infos = ALERTES.filter(a => a.severity === 'info').length

  return (
    <>
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard(COLORS.danger)}>
          <div style={styles.kpiLabel}>Critiques</div>
          <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{dangers}</div>
          <div style={styles.kpiSub}>action immédiate requise</div>
        </div>
        <div style={styles.kpiCard(COLORS.warning)}>
          <div style={styles.kpiLabel}>Avertissements</div>
          <div style={{ ...styles.kpiValue, color: COLORS.warning }}>{warnings}</div>
          <div style={styles.kpiSub}>à surveiller</div>
        </div>
        <div style={styles.kpiCard(COLORS.info)}>
          <div style={styles.kpiLabel}>Informations</div>
          <div style={{ ...styles.kpiValue, color: COLORS.info }}>{infos}</div>
          <div style={styles.kpiSub}>mises à jour positives</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ALERTES.map((a) => (
          <div key={a.id} style={styles.alertCard(a.severity)}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{a.description}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.timestamp}</div>
            </div>
            <button style={styles.alertBtn(a.severity)}>{a.action}</button>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export default function PredictionsIAPage() {
  const [activeTab, setActiveTab] = useState('revenus')

  const renderTab = () => {
    switch (activeTab) {
      case 'revenus': return <TabRevenus />
      case 'sante': return <TabSante />
      case 'tresorerie': return <TabTresorerie />
      case 'occupation': return <TabOccupation />
      case 'alertes': return <TabAlertes />
      default: return null
    }
  }

  return (
    <div className="admin-page" style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.title}>
          <span>🤖</span>
          Prédictions IA
          <span style={styles.badge}>BÊTA</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Dernière analyse : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={styles.tab(activeTab === t.id)}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {renderTab()}
      </div>
    </div>
  )
}
