import { useEffect } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useEnv } from '../contexts/EnvContext'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

export default function EnvRouteWrapper() {
  const { envId } = useParams()
  const { environments, currentEnv, setCurrentEnvByCode, loading: envLoading } = useEnv() || {}
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || envLoading) return
    if (!user) { navigate('/login', { replace: true }); return }
    if (!envId) return

    // Vérifier que l'envId est valide et que l'user y a accès
    const env = environments?.find(e => e.env_code === envId)
    if (!env) {
      // Env non trouvé ou pas accès → redirect vers le premier env accessible
      if (environments?.length > 0) {
        navigate(`/${environments[0].env_code}`, { replace: true })
      } else {
        navigate('/unauthorized', { replace: true })
      }
      return
    }

    // Mettre à jour l'env courant si différent
    if (currentEnv?.env_code !== envId) {
      setCurrentEnvByCode?.(envId)
    }
  }, [envId, environments, authLoading, envLoading, user])

  if (authLoading || envLoading) return <Spinner />

  return <Outlet />
}
