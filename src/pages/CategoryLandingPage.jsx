import { useNavigate, useParams } from 'react-router-dom'

const CATEGORY_DATA = {
  crm: {
    title: 'CRM',
    subtitle: 'Gérez vos relations clients et développez votre activité commerciale.',
    icon: '🎯',
    items: [
      { to: '/crm/contacts', icon: '👤', label: 'Contacts', desc: 'Centralisez tous vos contacts professionnels. Historique des échanges, coordonnées et notes en un seul endroit.' },
      { to: '/crm/entreprises', icon: '🏢', label: 'Entreprises', desc: 'Gérez votre base d\'entreprises avec vérification SIRENE automatique et suivi des informations légales.' },
      { to: '/commerce/clients', icon: '👥', label: 'Clients', desc: 'Pilotez la relation client active : contrats, facturation, historique des transactions.' },
      { to: '/commerce/transactions', icon: '💼', label: 'Opportunités', desc: 'Visualisez votre pipeline commercial en Kanban. Suivez chaque deal par phase et par montant.' },
      { to: '/commerce/devis', icon: '📝', label: 'Devis', desc: 'Créez et envoyez des devis professionnels en quelques clics. Conversion automatique en facture.' },
      { to: '/commerce/produits', icon: '🏷️', label: 'Produits', desc: 'Gérez votre catalogue de produits et services avec prix, descriptions et catégories.' },
      { to: '/commerce/abonnements', icon: '🔄', label: 'Abonnements', desc: 'Suivez vos revenus récurrents. Gestion des renouvellements et alertes d\'échéance.' },
    ]},
  activite: {
    title: 'Activité',
    subtitle: 'Planifiez, suivez et analysez le temps de travail de vos équipes.',
    icon: '⏱',
    items: [
      { to: '/activite/saisie', icon: '✏️', label: 'Saisie des temps', desc: 'Saisissez vos heures par projet et par tâche. Calendrier drag & drop et validation manager.' },
      { to: '/activite/planification', icon: '📅', label: 'Planification', desc: 'Planifiez la charge de travail de vos équipes. Vue hebdomadaire et mensuelle par collaborateur.' },
      { to: '/activite/projets', icon: '📁', label: 'Gestion de projet', desc: 'Kanban, tâches, membres et dashboard. Suivez l\'avancement de chaque projet en temps réel.' },
      { to: '/activite/reporting', icon: '📊', label: 'Reporting temps', desc: 'Analysez la répartition du temps par projet, client et collaborateur. Exports détaillés.' },
      { to: '/activite/rentabilite', icon: '💹', label: 'Rentabilité', desc: 'Comparez le temps passé au budget prévu. Identifiez les projets rentables et ceux en dépassement.' },
    ]},
  equipe: {
    title: 'Équipe',
    subtitle: 'Gérez vos collaborateurs, absences et compétences.',
    icon: '👥',
    items: [
      { to: '/activite/equipe', icon: '📋', label: 'Collaborateurs', desc: 'Consultez les fiches de vos collaborateurs. Contrats, compétences et affectations projets.' },
      { to: '/activite/absences', icon: '🏖', label: 'Absences', desc: 'Posez et validez les congés et absences. Calendrier d\'équipe et soldes en temps réel.' },
      { to: '/activite/validation', icon: '✅', label: 'Validations', desc: 'Validez les saisies de temps, absences et notes de frais de vos équipes.' },
      { to: '/equipe/notes-de-frais', icon: '🧾', label: 'Notes de frais', desc: 'Soumettez et validez les notes de frais. Justificatifs, catégories et remboursements.' },
      { to: '/equipe/trombinoscope', icon: '🪪', label: 'Trombinoscope', desc: 'Retrouvez rapidement les visages et coordonnées de tous vos collaborateurs.' },
      { to: '/equipe/organigramme', icon: '🏢', label: 'Organigramme', desc: 'Visualisez la structure hiérarchique de votre organisation en un coup d\'oeil.' },
      { to: '/equipe/competences', icon: '🎯', label: 'Compétences', desc: 'Cartographiez les compétences de vos équipes. Identifiez les besoins en formation.' },
    ]},
  gestion: {
    title: 'Gestion',
    subtitle: 'Pilotez vos ventes, achats et flux de trésorerie au quotidien.',
    icon: '🧾',
    items: [
      { to: '/gestion/tableau-de-bord', icon: '📊', label: 'Tableau de bord', desc: 'Vue d\'ensemble de votre activité : CA, marge, encaissements et décaissements en temps réel.' },
      { to: '/gestion/transactions', icon: '🏦', label: 'Transactions', desc: 'Connectez vos banques et visualisez tous vos mouvements bancaires en temps réel.' },
      { to: '/finance/facturation', icon: '📤', label: 'Ventes', desc: 'Créez, envoyez et suivez vos factures clients. Export e-facture XML UBL inclus.' },
      { to: '/gestion/achats', icon: '📥', label: 'Achats', desc: 'Enregistrez vos factures fournisseurs. Suivi des échéances et rapprochement automatique.' },
      { to: '/commerce/stock', icon: '📦', label: 'Stock', desc: 'Gérez vos niveaux de stock, mouvements d\'entrée/sortie et alertes de réapprovisionnement.' },
    ]},
  finance: {
    title: 'Finance',
    subtitle: 'Comptabilité, prévisionnel et intelligence financière.',
    icon: '💰',
    items: [
      { to: '/finance/business-intelligence', icon: '📊', label: 'Business Intelligence', desc: 'Importez vos FEC et visualisez vos données comptables. Tableaux de bord et analyses.' },
      { to: '/finance/saisie-ecriture', icon: '✍️', label: 'Comptabilité', desc: 'Saisissez vos écritures comptables. Plan comptable, journaux et lettrage automatique.' },
      { to: '/finance/previsionnel', icon: '📈', label: 'Prévisionnel', desc: 'Construisez vos budgets prévisionnels. Comparez le réalisé au prévisionnel par poste.' },
      { to: '/finance/immobilisations', icon: '🏢', label: 'Immobilisations', desc: 'Gérez votre parc d\'immobilisations. Amortissements, cessions et inventaire.' },
      { to: '/finance/rapprochement', icon: '🔗', label: 'Rapprochement', desc: 'Rapprochez automatiquement vos relevés bancaires avec vos écritures comptables.' },
      { to: '/documents/archives', icon: '🗄️', label: 'Documents', desc: 'Archivez, indexez et retrouvez tous vos documents d\'entreprise avec OCR.' },
    ]},
  marketing: {
    title: 'Marketing',
    subtitle: 'Gérez vos campagnes marketing et convertissez vos leads en clients.',
    icon: '📣',
    items: [
      { to: '/marketing/campagnes', icon: '🎯', label: 'Campagnes', desc: 'Créez et pilotez vos campagnes marketing : emailing, réseaux sociaux, SEO, publicité et événements.' },
      { to: '/marketing/leads', icon: '🚀', label: 'Leads', desc: 'Suivez vos prospects du premier contact à la conversion. Scoring, qualification et nurturing automatisé.' },
    ]},
  documents: {
    title: 'Documents',
    subtitle: 'Archivez, indexez et retrouvez tous vos documents d\'entreprise.',
    icon: '📁',
    items: [
      { to: '/documents/archives', icon: '🗄️', label: 'Archives', desc: 'Recherche avancée avec OCR, aperçu des documents, filtres multicritères et indexation automatique.' },
    ]},
  automatisation: {
    title: 'Automatisation',
    subtitle: 'Automatisez vos processus metier avec des workflows intelligents.',
    icon: '⚡',
    items: [
      { to: '/automatisation/workflows', icon: '🔀', label: 'Workflows', desc: 'Creez des automatisations visuelles : quand un evenement se produit, declenchez des actions automatiques.' },
    ]}}

export default function CategoryLandingPage({ categoryId }) {
  const navigate = useNavigate()
  const { envId } = useParams()
  const envPrefix = envId ? `/${envId}` : ''
  const cat = CATEGORY_DATA[categoryId]

  if (!cat) return <div className="admin-page"><p>Catégorie non trouvée.</p></div>

  return (
    <div className="admin-page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{cat.icon} {cat.title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>{cat.subtitle}</p>
      </div>

      <div className="category-grid">
        {cat.items.map((item, i) => (
          <div key={i} className="category-card" onClick={() => navigate(envPrefix + item.to)}>
            <div className="category-card-icon">{item.icon}</div>
            <div>
              <h3 className="category-card-title">{item.label}</h3>
              <p className="category-card-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
