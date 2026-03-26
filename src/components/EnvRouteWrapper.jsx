import { useEffect } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useEnv } from '../contexts/EnvContext'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

export default function EnvRouteWrapper() {
  const { envId } = useParams()
  const { environments, currentEnv, setCurrentEnvByCode, loading: envLoading, clientReady } = useEnv() || {}
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || envLoading) return
    if (!user) { navigate('/login', { replace: true }); return }
    if (!envId) return

    // Attendre que les environments soient chargés
    if (!environments || environments.length === 0) return

    // Vérifier que l'envId est valide et que l'user y a accès
    const env = environments.find(e => e.env_code === envId)
    if (!env) {
      // Env non trouvé → redirect vers le premier env accessible
      navigate(`/${environments[0].env_code}`, { replace: true })
      return
    }

    // Mettre à jour l'env courant si différent
    if (currentEnv?.env_code !== envId) {
      setCurrentEnvByCode?.(envId)
    }
  }, [envId, environments, authLoading, envLoading, user])

  // Afficher spinner tant que le client n'est pas prêt
  if (authLoading || envLoading || !clientReady || !environments || environments.length === 0) return <Spinner />

  // Si l'envId ne matche aucun env accessible, spinner (le useEffect redirigera)
  const env = environments?.find(e => e.env_code === envId)
  if (!env) return <Spinner />

  return <Outlet />
}
