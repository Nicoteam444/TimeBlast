import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DemoProvider } from './contexts/DemoContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { SocieteProvider } from './contexts/SocieteContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/admin/AdminPage'
import AdminUtilisateursPage from './pages/admin/AdminUtilisateursPage'
import AdminAuditPage from './pages/admin/AdminAuditPage'
import AdminSocietesPage from './pages/admin/AdminSocietesPage'
import AdminSocieteDetailPage from './pages/admin/AdminSocieteDetailPage'
import AdminGroupesPage from './pages/admin/AdminGroupesPage'
import AdminOrganigrammePage from './pages/admin/AdminOrganigrammePage'
import ParametresPage from './pages/parametres/ParametresPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import ClientsPage from './pages/temps/ClientsPage'
import TransactionsPage from './pages/commerce/TransactionsPage'
import TransactionDetailPage from './pages/commerce/TransactionDetailPage'
import ProjetsWrapper from './pages/commerce/ProjetsWrapper'
import AchatsPage from './pages/commerce/AchatsPage'
import StockPage from './pages/commerce/StockPage'
import ProduitsPage from './pages/commerce/ProduitsPage'
import AbonnementsPage from './pages/commerce/AbonnementsPage'
import ReportingPage from './pages/activite/ReportingPage'
import SaisiePage from './pages/activite/SaisiePage'
import EquipePage from './pages/activite/EquipePage'
import ValidationPage from './pages/manager/ValidationPage'
import AbsencesPage from './pages/activite/AbsencesPage'
import PlanificationPage from './pages/temps/PlanificationPage'
import FacturationPage from './pages/facturation/FacturationPage'
import ComptaPage from './pages/compta/ComptaPage'
import ComptaImportPage from './pages/compta/ComptaImportPage'
import ComptaEcrituresPage from './pages/compta/ComptaEcrituresPage'
import ComptaAnalysePage from './pages/compta/ComptaAnalysePage'
import SaisieEcriturePage from './pages/compta/SaisieEcriturePage'
import PrevisionnelPage from './pages/finance/PrevisionnelPage'
import ImmobilisationsPage from './pages/finance/ImmobilisationsPage'
import TrombinosccopePage from './pages/equipe/TrombinosccopePage'
import CollaborateurPage from './pages/equipe/CollaborateurPage'
import OrganigrammePage from './pages/equipe/OrganigrammePage'
import NotesDeFraisPage from './pages/equipe/NotesDeFraisPage'
import SetPasswordPage from './pages/SetPasswordPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import SearchPage from './pages/SearchPage'
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
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/" element={
        <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
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

      {/* Finance */}
      <Route path="/finance/comptabilite" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/import" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaImportPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/ecritures" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaEcrituresPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/ecritures" element={<Navigate to="/finance/ecritures" replace />} />
      <Route path="/finance/saisie-ecriture" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><SaisieEcriturePage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/analyse" element={<Navigate to="/finance/comptabilite" replace />} />
      <Route path="/finance/facturation" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><FacturationPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/previsionnel" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><PrevisionnelPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/immobilisations" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ImmobilisationsPage /></Layout></ProtectedRoute>
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
        <SocieteProvider>
          <DemoProvider>
            <NotificationsProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </NotificationsProvider>
          </DemoProvider>
        </SocieteProvider>
      </AuthProvider>
    </AppearanceProvider>
  )
}
