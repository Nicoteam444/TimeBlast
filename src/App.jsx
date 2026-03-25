import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DemoProvider } from './contexts/DemoContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { SocieteProvider } from './contexts/SocieteContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import FactureElectroniquePage from './pages/FactureElectroniquePage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/admin/AdminPage'
import AdminUtilisateursPage from './pages/admin/AdminUtilisateursPage'
import AdminAuditPage from './pages/admin/AdminAuditPage'
import AdminMessagesPage from './pages/admin/AdminMessagesPage'
import AdminPageViewsPage from './pages/admin/AdminPageViewsPage'
import AdminSocietesPage from './pages/admin/AdminSocietesPage'
import AdminSocieteDetailPage from './pages/admin/AdminSocieteDetailPage'
import AdminGroupesPage from './pages/admin/AdminGroupesPage'
import AdminOrganigrammePage from './pages/admin/AdminOrganigrammePage'
import WorkflowsPage from './pages/admin/WorkflowsPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import ParametresPage from './pages/parametres/ParametresPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import ClientInvoicePortal from './pages/clients/ClientInvoicePortal'
import ClientsPage from './pages/temps/ClientsPage'
import TransactionsPage from './pages/commerce/TransactionsPage'
import TransactionDetailPage from './pages/commerce/TransactionDetailPage'
import ProjetsWrapper from './pages/commerce/ProjetsWrapper'
import AchatsPage from './pages/commerce/AchatsPage'
import StockPage from './pages/commerce/StockPage'
import ProduitsPage from './pages/commerce/ProduitsPage'
import AbonnementsPage from './pages/commerce/AbonnementsPage'
import DevisPage from './pages/commerce/DevisPage'
import ReportingPage from './pages/activite/ReportingPage'
import RentabilitePage from './pages/activite/RentabilitePage'
import SaisiePage from './pages/activite/SaisiePage'
import CalendrierPage from './pages/CalendrierPage'
import EquipePage from './pages/activite/EquipePage'
import ValidationPage from './pages/manager/ValidationPage'
import AbsencesPage from './pages/activite/AbsencesPage'
import PlanificationPage from './pages/temps/PlanificationPage'
import BusinessIntelligencePage from './pages/finance/BusinessIntelligencePage'
import FacturationPage from './pages/facturation/FacturationPage'
import FacturesFournisseursPage from './pages/facturation/FacturesFournisseursPage'
import TransactionsBancairesPage from './pages/gestion/TransactionsBancairesPage'
import TableauDeBordGestionPage from './pages/gestion/TableauDeBordGestionPage'
import ComptaPage from './pages/compta/ComptaPage'
import ComptaImportPage from './pages/compta/ComptaImportPage'
import ComptaEcrituresPage from './pages/compta/ComptaEcrituresPage'
import ComptaAnalysePage from './pages/compta/ComptaAnalysePage'
import SaisieEcriturePage from './pages/compta/SaisieEcriturePage'
import PrevisionnelPage from './pages/finance/PrevisionnelPage'
import ImmobilisationsPage from './pages/finance/ImmobilisationsPage'
import RapprochementPage from './pages/finance/RapprochementPage'
import AutomationWorkflowsPage from './pages/finance/AutomationWorkflowsPage'
import TrombinosccopePage from './pages/equipe/TrombinosccopePage'
import CollaborateurPage from './pages/equipe/CollaborateurPage'
import OrganigrammePage from './pages/equipe/OrganigrammePage'
import NotesDeFraisPage from './pages/equipe/NotesDeFraisPage'
import CompetencesPage from './pages/equipe/CompetencesPage'
import SetPasswordPage from './pages/SetPasswordPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import SearchPage from './pages/SearchPage'
import NotificationsPage from './pages/NotificationsPage'
import CrmContactsPage from './pages/crm/ContactsPage'
import CrmEntreprisesPage from './pages/crm/EntreprisesPage'
import CrmLeadsPage from './pages/crm/LeadsPage'
import CrmContactDetailPage from './pages/crm/ContactDetailPage'
import CategoryLandingPage from './pages/CategoryLandingPage'
import CampagnesPage from './pages/marketing/CampagnesPage'
import DocumentsArchivePage from './pages/documents/DocumentsArchivePage'
import TaskDetailPage from './pages/temps/TaskDetailPage'
import './App.css'

function InviteHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      navigate('/set-password' + hash, { replace: true })
    }
  }, [])
  return null
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<><InviteHandler /><LoginPage /></>} />
      <Route path="/facture-electronique" element={<FactureElectroniquePage />} />
      <Route path="/client/invoice/:id" element={<ClientInvoicePortal />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/" element={
        <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
      } />

      {/* Category Landing Pages */}
      <Route path="/crm" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="crm" /></Layout></ProtectedRoute>
      } />
      <Route path="/activite" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="activite" /></Layout></ProtectedRoute>
      } />
      <Route path="/equipe" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="equipe" /></Layout></ProtectedRoute>
      } />
      <Route path="/gestion" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><CategoryLandingPage categoryId="gestion" /></Layout></ProtectedRoute>
      } />
      <Route path="/finance" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><CategoryLandingPage categoryId="finance" /></Layout></ProtectedRoute>
      } />
      <Route path="/automatisation" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CategoryLandingPage categoryId="automatisation" /></Layout></ProtectedRoute>
      } />

      {/* CRM */}
      <Route path="/crm/contacts" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmContactsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/crm/contacts/:id" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmContactDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="/crm/entreprises" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmEntreprisesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/crm/leads" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CrmLeadsPage /></Layout></ProtectedRoute>
      } />

      {/* Marketing */}
      <Route path="/marketing" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CategoryLandingPage categoryId="marketing" /></Layout></ProtectedRoute>
      } />
      <Route path="/marketing/campagnes" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CampagnesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/marketing/leads" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CrmLeadsPage /></Layout></ProtectedRoute>
      } />

      {/* Documents */}
      <Route path="/documents" element={
        <ProtectedRoute><Layout><CategoryLandingPage categoryId="documents" /></Layout></ProtectedRoute>
      } />
      <Route path="/documents/archives" element={
        <ProtectedRoute><Layout><DocumentsArchivePage /></Layout></ProtectedRoute>
      } />

      {/* Commerce */}
      <Route path="/commerce/clients" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ClientsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/transactions" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TransactionsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/transactions/:id" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TransactionDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/achats" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><AchatsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/stock" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><StockPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/produits" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><ProduitsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/abonnements" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><AbonnementsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/commerce/devis" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><DevisPage /></Layout></ProtectedRoute>
      } />

      {/* Calendrier */}
      <Route path="/calendrier" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CalendrierPage /></Layout></ProtectedRoute>
      } />

      {/* Activité */}
      <Route path="/activite/saisie" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><SaisiePage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/planification" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><PlanificationPage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/projets" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ProjetsWrapper /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/projets/:projetId" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ProjetsWrapper /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/projets/:projetId/taches/:taskId" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><TaskDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/validation" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><ValidationPage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/absences" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><AbsencesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/equipe" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><EquipePage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/reporting" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><ReportingPage /></Layout></ProtectedRoute>
      } />
      <Route path="/activite/rentabilite" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><RentabilitePage /></Layout></ProtectedRoute>
      } />

      {/* Finance */}
      <Route path="/finance/business-intelligence" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><BusinessIntelligencePage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="/finance/ecritures" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="/finance/comptabilite/import" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaImportPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/ecritures" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="/finance/saisie-ecriture" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><SaisieEcriturePage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/analyse" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="/gestion/tableau-de-bord" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><TableauDeBordGestionPage /></Layout></ProtectedRoute>
      } />
      <Route path="/gestion/transactions" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><TransactionsBancairesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/facturation" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><FacturationPage /></Layout></ProtectedRoute>
      } />
      <Route path="/gestion/achats" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><FacturesFournisseursPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/previsionnel" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><PrevisionnelPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/immobilisations" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ImmobilisationsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/rapprochement" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><RapprochementPage /></Layout></ProtectedRoute>
      } />
      <Route path="/automatisation/workflows" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><AutomationWorkflowsPage /></Layout></ProtectedRoute>
      } />

      {/* Équipe */}
      <Route path="/equipe/trombinoscope" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TrombinosccopePage /></Layout></ProtectedRoute>
      } />
      <Route path="/equipe/collaborateurs/:id" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CollaborateurPage /></Layout></ProtectedRoute>
      } />
      <Route path="/equipe/organigramme" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><OrganigrammePage /></Layout></ProtectedRoute>
      } />
      <Route path="/equipe/notes-de-frais" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><NotesDeFraisPage /></Layout></ProtectedRoute>
      } />
      <Route path="/equipe/competences" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CompetencesPage /></Layout></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/utilisateurs" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminUtilisateursPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminAuditPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/messages" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminMessagesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/historique" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminPageViewsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/societes" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminSocietesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/societes/:id" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminSocieteDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/groupes" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminGroupesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/organigramme" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminOrganigrammePage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/workflows" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><WorkflowsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><AnalyticsPage /></Layout></ProtectedRoute>
      } />
      <Route path="/parametres" element={
        <ProtectedRoute roles={['admin']}><Layout><ParametresPage /></Layout></ProtectedRoute>
      } />

      {/* Fiche client */}
      <Route path="/clients/:id" element={
        <ProtectedRoute><Layout><ClientDetailPage /></Layout></ProtectedRoute>
      } />

      {/* Anciens liens → redirect */}
      <Route path="/compta/*" element={<Navigate to="/finance/comptabilite" replace />} />
      <Route path="/commerce/projets" element={<Navigate to="/activite/projets" replace />} />

      <Route path="/notifications" element={
        <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
      } />

      <Route path="/recherche" element={
        <ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <FavoritesProvider>
          <SocieteProvider>
            <DemoProvider>
              <NotificationsProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </NotificationsProvider>
            </DemoProvider>
          </SocieteProvider>
        </FavoritesProvider>
      </AuthProvider>
    </AppearanceProvider>
  )
}
