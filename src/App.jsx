import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/admin/AdminPage'
import AdminUtilisateursPage from './pages/admin/AdminUtilisateursPage'
import IntegrationsPage from './pages/parametres/IntegrationsPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import ClientsPage from './pages/temps/ClientsPage'
import TransactionsPage from './pages/commerce/TransactionsPage'
import TransactionDetailPage from './pages/commerce/TransactionDetailPage'
import ProjetsWrapper from './pages/commerce/ProjetsWrapper'
import SaisiePage from './pages/activite/SaisiePage'
import PlanificationPage from './pages/temps/PlanificationPage'
import ComptaPage from './pages/compta/ComptaPage'
import ComptaImportPage from './pages/compta/ComptaImportPage'
import ComptaEcrituresPage from './pages/compta/ComptaEcrituresPage'
import ComptaAnalysePage from './pages/compta/ComptaAnalysePage'
import PrevisionnelPage from './pages/finance/PrevisionnelPage'
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

      {/* Finance */}
      <Route path="/finance/comptabilite" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/import" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaImportPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/ecritures" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaEcrituresPage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/comptabilite/analyse" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><ComptaAnalysePage /></Layout></ProtectedRoute>
      } />
      <Route path="/finance/previsionnel" element={
        <ProtectedRoute roles={['admin','comptable']}><Layout><PrevisionnelPage /></Layout></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminPage /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/utilisateurs" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminUtilisateursPage /></Layout></ProtectedRoute>
      } />
      <Route path="/parametres" element={
        <ProtectedRoute roles={['admin']}><Layout><IntegrationsPage /></Layout></ProtectedRoute>
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
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
