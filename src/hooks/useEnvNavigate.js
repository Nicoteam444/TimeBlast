import { useNavigate, useParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Hook navigate() qui prefixe automatiquement /:envId devant les chemins absolus.
 * Remplace useNavigate() dans toutes les pages sous /:envId.
 *
 * Usage: const navigate = useEnvNavigate()
 *        navigate('/activite/projets')  →  /1924635/activite/projets
 *        navigate(-1)                   →  back (inchangé)
 */
export default function useEnvNavigate() {
  const nav = useNavigate()
  const { envId } = useParams()
  const prefix = envId ? `/${envId}` : ''

  return useCallback((to, options) => {
    if (typeof to === 'string' && to.startsWith('/')) {
      nav(prefix + to, options)
    } else if (typeof to === 'object' && to?.pathname?.startsWith('/')) {
      nav({ ...to, pathname: prefix + to.pathname }, options)
    } else {
      nav(to, options)
    }
  }, [nav, prefix])
}
