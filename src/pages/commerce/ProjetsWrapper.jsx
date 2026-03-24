import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ProjetsPage from '../temps/ProjetsPage'
import ProjetDetailPage from '../temps/ProjetDetailPage'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext'

export default function ProjetsWrapper() {
  const { projetId } = useParams()
  const navigate = useNavigate()
  const { setSegments, clearSegments } = useBreadcrumb()
  const [projet, setProjet] = useState(null)
  const [loading, setLoading] = useState(!!projetId)

  // Si on a un projetId dans l'URL, charger le projet
  useEffect(() => {
    if (projetId) {
      setLoading(true)
      supabase
        .from('projets')
        .select('*, clients(name, societe_id)')
        .eq('id', projetId)
        .single()
        .then(({ data }) => {
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

  if (loading) return <div className="admin-page"><div className="loading-inline">Chargement...</div></div>

  if (projet) return <ProjetDetailPage projet={projet} onBack={handleBack} />
  return <ProjetsPage onSelect={handleSelect} />
}
