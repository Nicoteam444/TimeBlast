import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import ProjetsPage from '../temps/ProjetsPage'
import ProjetDetailPage from '../temps/ProjetDetailPage'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'
import Spinner from '../../components/Spinner'

export default function ProjetsWrapper() {
  const { projetId } = useParams()
  const navigate = useEnvNavigate()
  const { setSegments, clearSegments } = useBreadcrumb()
  const [projet, setProjet] = useState(null)
  const [loading, setLoading] = useState(!!projetId)

  // Si on a un projetId dans l'URL, charger le projet
  useEffect(() => {
    if (projetId) {
      setLoading(true)
      supabase
        .from('projets').select('*, clients(name, societe_id)').eq('id', projetId).single().then(({ data }) => {
          setProjet(data)
          setLoading(false)
          if (data) {
            setSegments([{ label: data.name }])
          }
        })
    } else {
      setProjet(null)
      clearSegments()
    }
    return () => clearSegments()
  }, [projetId])

  function handleSelect(p) {
    navigate(`/activite/projets/${p.id}`)
  }

  function handleBack() {
    navigate('/activite/projets')
  }

  if (loading) return <div className="admin-page"><Spinner /></div>

  if (projet) return <ProjetDetailPage projet={projet} onBack={handleBack} />
  return <ProjetsPage onSelect={handleSelect} />
}
