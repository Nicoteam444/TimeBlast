import { useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DemoProvider } from './contexts/DemoContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { SocieteProvider } from './contexts/SocieteContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import BackofficeLayout from './components/BackofficeLayout'
import OnboardingTour from './components/OnboardingTour'
import EnvRouteWrapper from './components/EnvRouteWrapper'
import { EnvProvider, useEnv } from './contexts/EnvContext'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

// Lazy loaded pages
const FactureElectroniquePage = lazy(() => import('./pages/FactureElectroniquePage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const AdminUtilisateursPage = lazy(() => import('./pages/admin/AdminUtilisateursPage'))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'))
const AdminMessagesPage = lazy(() => import('./pages/admin/AdminMessagesPage'))
const AdminPageViewsPage = lazy(() => import('./pages/admin/AdminPageViewsPage'))
const AdminSocietesPage = lazy(() => import('./pages/admin/AdminSocietesPage'))
const AdminSocieteDetailPage = lazy(() => import('./pages/admin/AdminSocieteDetailPage'))
const AdminGroupesPage = lazy(() => import('./pages/admin/AdminGroupesPage'))
const EnvSettingsPage = lazy(() => import('./pages/admin/EnvSettingsPage'))
const AdminOrganigrammePage = lazy(() => import('./pages/admin/AdminOrganigrammePage'))
const WorkflowsPage = lazy(() => import('./pages/admin/WorkflowsPage'))
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'))
const ParametresPage = lazy(() => import('./pages/parametres/ParametresPage'))
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'))
const ClientInvoicePortal = lazy(() => import('./pages/clients/ClientInvoicePortal'))
const ClientsPage = lazy(() => import('./pages/temps/ClientsPage'))
const TransactionsPage = lazy(() => import('./pages/commerce/TransactionsPage'))
const TransactionDetailPage = lazy(() => import('./pages/commerce/TransactionDetailPage'))
const ProjetsWrapper = lazy(() => import('./pages/commerce/ProjetsWrapper'))
const AchatsPage = lazy(() => import('./pages/commerce/AchatsPage'))
const StockPage = lazy(() => import('./pages/commerce/StockPage'))
const ProduitsPage = lazy(() => import('./pages/commerce/ProduitsPage'))
const AbonnementsPage = lazy(() => import('./pages/commerce/AbonnementsPage'))
const DevisPage = lazy(() => import('./pages/commerce/DevisPage'))
const ReportingPage = lazy(() => import('./pages/activite/ReportingPage'))
const RentabilitePage = lazy(() => import('./pages/activite/RentabilitePage'))
const SaisiePage = lazy(() => import('./pages/activite/SaisiePage'))
const CalendrierPage = lazy(() => import('./pages/CalendrierPage'))
const EquipePage = lazy(() => import('./pages/activite/EquipePage'))
const ValidationPage = lazy(() => import('./pages/manager/ValidationPage'))
const AbsencesPage = lazy(() => import('./pages/activite/AbsencesPage'))
const PlanificationPage = lazy(() => import('./pages/temps/PlanificationPage'))
const BusinessIntelligencePage = lazy(() => import('./pages/finance/BusinessIntelligencePage'))
const FacturationPage = lazy(() => import('./pages/facturation/FacturationPage'))
const FacturesFournisseursPage = lazy(() => import('./pages/facturation/FacturesFournisseursPage'))
const TransactionsBancairesPage = lazy(() => import('./pages/gestion/TransactionsBancairesPage'))
const TableauDeBordGestionPage = lazy(() => import('./pages/gestion/TableauDeBordGestionPage'))
const ComptaPage = lazy(() => import('./pages/compta/ComptaPage'))
const ComptaImportPage = lazy(() => import('./pages/compta/ComptaImportPage'))
const ComptaEcrituresPage = lazy(() => import('./pages/compta/ComptaEcrituresPage'))
const ComptaAnalysePage = lazy(() => import('./pages/compta/ComptaAnalysePage'))
const SaisieEcriturePage = lazy(() => import('./pages/compta/SaisieEcriturePage'))
const PrevisionnelPage = lazy(() => import('./pages/finance/PrevisionnelPage'))
const ImmobilisationsPage = lazy(() => import('./pages/finance/ImmobilisationsPage'))
const RapprochementPage = lazy(() => import('./pages/finance/RapprochementPage'))
const AutomationWorkflowsPage = lazy(() => import('./pages/finance/AutomationWorkflowsPage'))
const PredictionsIAPage = lazy(() => import('./pages/PredictionsIAPage'))
const TrombinosccopePage = lazy(() => import('./pages/equipe/TrombinosccopePage'))
const CollaborateurPage = lazy(() => import('./pages/equipe/CollaborateurPage'))
const OrganigrammePage = lazy(() => import('./pages/equipe/OrganigrammePage'))
const NotesDeFraisPage = lazy(() => import('./pages/equipe/NotesDeFraisPage'))
const CompetencesPage = lazy(() => import('./pages/equipe/CompetencesPage'))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'))
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const CrmContactsPage = lazy(() => import('./pages/crm/ContactsPage'))
const CrmEntreprisesPage = lazy(() => import('./pages/crm/EntreprisesPage'))
const CrmLeadsPage = lazy(() => import('./pages/crm/LeadsPage'))
const CrmContactDetailPage = lazy(() => import('./pages/crm/ContactDetailPage'))
const CategoryLandingPage = lazy(() => import('./pages/CategoryLandingPage'))
const CampagnesPage = lazy(() => import('./pages/marketing/CampagnesPage'))
const DocumentsArchivePage = lazy(() => import('./pages/documents/DocumentsArchivePage'))
const TaskDetailPage = lazy(() => import('./pages/temps/TaskDetailPage'))
const BackofficePage = lazy(() => import('./pages/admin/BackofficePage'))
const InfoPage = lazy(() => import('./pages/InfoPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ImportsPage = lazy(() => import('./pages/admin/ImportsPage'))
const TablesPage = lazy(() => import('./pages/admin/TablesPage'))
const IntegrationsAdminPage = lazy(() => import('./pages/admin/IntegrationsAdminPage'))
const WikiPage = lazy(() => import('./pages/wiki/WikiPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const InscriptionPage = lazy(() => import('./pages/InscriptionPage'))

// Spinner global pour lazy loading
function LazySpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#2B4C7E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
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

function EnvDefaultRedirect() {
  const { environments, loading } = useEnv() || {}
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Capturer l'état OAuth AU MONTAGE (avant que Supabase efface ?code= ou #hash de l'URL)
  const isOAuthCallbackRef = useRef((() => {
    const p = new URLSearchParams(window.location.search)
    const h = window.location.hash
    return !!p.get('code') || h.includes('access_token') || h.includes('refresh_token')
  })())
  const oauthErrorRef = useRef(new URLSearchParams(window.location.search).get('error'))

  useEffect(() => {
    console.log('[Redirect] authLoading=%s loading=%s user=%s envs=%s isOAuth=%s oauthErr=%s url=%s hash=%s',
      authLoading, loading, user?.email||'null', environments?.length,
      isOAuthCallbackRef.current, oauthErrorRef.current,
      window.location.search, window.location.hash.substring(0,50))
    if (authLoading || loading) return
    // Erreur OAuth explicite → login
    if (!user && oauthErrorRef.current) { console.log('[Redirect] → /login (oauth error)'); navigate('/login', { replace: true }); return }
    // Pas d'user et pas de callback OAuth → login
    if (!user && !isOAuthCallbackRef.current) { console.log('[Redirect] → /login (no user, no oauth)'); navigate('/login', { replace: true }); return }
    // Callback en cours mais user pas encore set → attendre
    if (!user) { console.log('[Redirect] waiting for user (oauth in progress)'); return }
    if (environments?.length > 0) {
      const defaultEnv = environments.find(e => e.is_production) || environments[0]
      console.log('[Redirect] → /' + defaultEnv.env_code)
      navigate(`/${defaultEnv.env_code}`, { replace: true })
    } else {
      console.log('[Redirect] → /login (no environments for user', user?.email, ')')
      navigate('/login', { replace: true })
    }
  }, [environments, loading, authLoading, user])

  return <LazySpinner />
}

function AppRoutes() {
  return (
    <Suspense fallback={<LazySpinner />}>
    <Routes>
      <Route path="/login" element={<><InviteHandler /><LoginPage /></>} />
      <Route path="/facture-electronique" element={<FactureElectroniquePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/client/invoice/:id" element={<ClientInvoicePortal />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* À propos — page publique */}
      <Route path="/about" element={<InfoPage />} />

      {/* Backoffice — hors scope environnement, auth geree par BackofficeLayout */}
      <Route path="/backoffice" element={
        <BackofficeLayout><BackofficePage /></BackofficeLayout>
      } />

      {/* Redirect racine vers le premier env */}
      <Route path="/" element={<EnvDefaultRedirect />} />

      {/* Toutes les routes protégées sous /:envId */}
      <Route path="/:envId" element={<EnvRouteWrapper />}>

      <Route index element={
        <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
      } />

      {/* Category Landing Pages */}
      <Route path="crm" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="crm" /></Layout></ProtectedRoute>
      } />
      <Route path="activite" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="activite" /></Layout></ProtectedRoute>
      } />
      <Route path="equipe" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CategoryLandingPage categoryId="equipe" /></Layout></ProtectedRoute>
      } />
      <Route path="gestion" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><CategoryLandingPage categoryId="gestion" /></Layout></ProtectedRoute>
      } />
      <Route path="finance" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><CategoryLandingPage categoryId="finance" /></Layout></ProtectedRoute>
      } />
      <Route path="automatisation" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CategoryLandingPage categoryId="automatisation" /></Layout></ProtectedRoute>
      } />

      {/* CRM */}
      <Route path="crm/contacts" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmContactsPage /></Layout></ProtectedRoute>
      } />
      <Route path="crm/contacts/:id" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmContactDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="crm/entreprises" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CrmEntreprisesPage /></Layout></ProtectedRoute>
      } />
      <Route path="crm/leads" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CrmLeadsPage /></Layout></ProtectedRoute>
      } />

      {/* Marketing */}
      <Route path="marketing" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CategoryLandingPage categoryId="marketing" /></Layout></ProtectedRoute>
      } />
      <Route path="marketing/campagnes" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CampagnesPage /></Layout></ProtectedRoute>
      } />
      <Route path="marketing/leads" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CrmLeadsPage /></Layout></ProtectedRoute>
      } />

      {/* Documents */}
      <Route path="documents" element={
        <ProtectedRoute><Layout><CategoryLandingPage categoryId="documents" /></Layout></ProtectedRoute>
      } />
      <Route path="documents/archives" element={
        <ProtectedRoute><Layout><DocumentsArchivePage /></Layout></ProtectedRoute>
      } />

      {/* Commerce */}
      <Route path="commerce/clients" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ClientsPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/transactions" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TransactionsPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/transactions/:id" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TransactionDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/achats" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><AchatsPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/stock" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><StockPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/produits" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><ProduitsPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/abonnements" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><AbonnementsPage /></Layout></ProtectedRoute>
      } />
      <Route path="commerce/devis" element={
        <ProtectedRoute roles={['admin','manager','comptable']}><Layout><DevisPage /></Layout></ProtectedRoute>
      } />

      {/* Calendrier */}
      <Route path="calendrier" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><CalendrierPage /></Layout></ProtectedRoute>
      } />

      {/* Activité */}
      <Route path="activite/saisie" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><SaisiePage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/planification" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><PlanificationPage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/projets" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ProjetsWrapper /></Layout></ProtectedRoute>
      } />
      <Route path="activite/projets/:projetId" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><ProjetsWrapper /></Layout></ProtectedRoute>
      } />
      <Route path="activite/projets/:projetId/taches/:taskId" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><TaskDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/validation" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><ValidationPage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/absences" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><AbsencesPage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/equipe" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><EquipePage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/reporting" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><ReportingPage /></Layout></ProtectedRoute>
      } />
      <Route path="activite/rentabilite" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><RentabilitePage /></Layout></ProtectedRoute>
      } />

      {/* Finance */}
      <Route path="finance/business-intelligence" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><BusinessIntelligencePage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/comptabilite" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="finance/ecritures" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="finance/comptabilite/import" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaImportPage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/comptabilite/ecritures" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="finance/saisie-ecriture" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><SaisieEcriturePage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/comptabilite/analyse" element={<Navigate to="/finance/business-intelligence" replace />} />
      <Route path="gestion/tableau-de-bord" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><TableauDeBordGestionPage /></Layout></ProtectedRoute>
      } />
      <Route path="gestion/transactions" element={
        <ProtectedRoute roles={['admin','comptable','manager']}><Layout><TransactionsBancairesPage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/facturation" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><FacturationPage /></Layout></ProtectedRoute>
      } />
      <Route path="gestion/achats" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><FacturesFournisseursPage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/previsionnel" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><PrevisionnelPage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/immobilisations" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ImmobilisationsPage /></Layout></ProtectedRoute>
      } />
      <Route path="finance/rapprochement" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><RapprochementPage /></Layout></ProtectedRoute>
      } />
      <Route path="automatisation/workflows" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><AutomationWorkflowsPage /></Layout></ProtectedRoute>
      } />
      <Route path="intelligence/predictions" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><PredictionsIAPage /></Layout></ProtectedRoute>
      } />

      {/* Équipe */}
      <Route path="equipe/trombinoscope" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><TrombinosccopePage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/collaborateurs/:id" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CollaborateurPage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/organigramme" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><OrganigrammePage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/notes-de-frais" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><NotesDeFraisPage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/competences" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><CompetencesPage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/societes" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><AdminSocietesPage /></Layout></ProtectedRoute>
      } />
      <Route path="equipe/societes/:id" element={
        <ProtectedRoute roles={['admin','manager']}><Layout><AdminSocieteDetailPage /></Layout></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="admin" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/utilisateurs" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminUtilisateursPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/audit" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminAuditPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/messages" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminMessagesPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/historique" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminPageViewsPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/societes" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminSocietesPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/societes/:id" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminSocieteDetailPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/organigramme" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AdminOrganigrammePage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/workflows" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><WorkflowsPage /></Layout></ProtectedRoute>
      } />
      <Route path="admin/analytics" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><AnalyticsPage /></Layout></ProtectedRoute>
      } />
      <Route path="wiki" element={
        <ProtectedRoute roles={['admin','manager','collaborateur']}><Layout><WikiPage /></Layout></ProtectedRoute>
      } />
      {/* Backoffice déplacé hors /:envId — voir route /backoffice */}
      <Route path="parametres" element={
        <ProtectedRoute roles={['admin']} superAdminOnly><Layout><ParametresPage /></Layout></ProtectedRoute>
      } />
      <Route path="infos" element={
        <ProtectedRoute><Layout><InfoPage /></Layout></ProtectedRoute>
      } />
      <Route path="profil" element={
        <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
      } />

      {/* Fiche client */}
      <Route path="clients/:id" element={
        <ProtectedRoute><Layout><ClientDetailPage /></Layout></ProtectedRoute>
      } />

      {/* Anciens liens → redirect */}
      <Route path="compta/*" element={<Navigate to="/finance/comptabilite" replace />} />
      <Route path="commerce/projets" element={<Navigate to="/activite/projets" replace />} />

      <Route path="notifications" element={
        <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
      } />

      <Route path="recherche" element={
        <ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>
      } />

      </Route>{/* Fin /:envId */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <PermissionsProvider>
        <FavoritesProvider>
          <SocieteProvider>
            <DemoProvider>
              <NotificationsProvider>
                <BrowserRouter>
                  <EnvProvider>
                    {/* <OnboardingTour /> — désactivé temporairement */}
                    <AppRoutes />
                  </EnvProvider>
                </BrowserRouter>
              </NotificationsProvider>
            </DemoProvider>
          </SocieteProvider>
        </FavoritesProvider>
        </PermissionsProvider>
      </AuthProvider>
    </AppearanceProvider>
  )
}
