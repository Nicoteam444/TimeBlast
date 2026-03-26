import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isRouteEnabled } from '../config/modules'
import Spinner from './Spinner'

const SUPER_ADMIN_EMAIL = 'nicolas.nabhan@groupe-sra.fr'

export default function ProtectedRoute({ children, roles, superAdminOnly }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (superAdminOnly && user?.email !== SUPER_ADMIN_EMAIL) return <Navigate to="/" replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />
  // Bloquer les routes de modules masqués en production
  if (!isRouteEnabled(location.pathname)) return <Navigate to="/" replace />

  return children
}
