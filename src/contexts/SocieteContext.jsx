import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SocieteContext = createContext(null)

const STORAGE_KEY = 'timeblast_selected_societe'

export function SocieteProvider({ children }) {
  const { profile } = useAuth()
  const [societes, setSocietes] = useState([])
  const [selectedSociete, setSelectedSociete] = useState(null)
  const [loadingSocietes, setLoadingSocietes] = useState(true)

  useEffect(() => {
    if (!profile) { setLoadingSocietes(false); return }

    const canSeeAll = profile.role === 'admin' || profile.role === 'comptable'

    if (canSeeAll) {
      // Admin/comptable : charge toutes les sociétés
      supabase.from('societes').select('*').order('name').then(({ data }) => {
        const list = data || []
        setSocietes(list)
        if (list.length > 0) {
          // Restaure la sélection depuis localStorage, sinon prend la société du profil, sinon la première
          const stored = localStorage.getItem(STORAGE_KEY)
          const found = (stored && list.find(s => s.id === stored))
            || list.find(s => s.id === profile.societe_id)
            || list[0]
          setSelectedSociete(found)
        }
        setLoadingSocietes(false)
      })
    } else {
      // Autres rôles : charge uniquement leur société
      if (profile.societe_id) {
        supabase.from('societes').select('*').eq('id', profile.societe_id).single().then(({ data }) => {
          if (data) { setSocietes([data]); setSelectedSociete(data) }
          setLoadingSocietes(false)
        })
      } else {
        setLoadingSocietes(false)
      }
    }
  }, [profile])

  function handleSelectSociete(societe) {
    setSelectedSociete(societe)
    if (societe) localStorage.setItem(STORAGE_KEY, societe.id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <SocieteContext.Provider value={{
      societes,
      selectedSociete,
      setSelectedSociete: handleSelectSociete,
      loadingSocietes,
    }}>
      {children}
    </SocieteContext.Provider>
  )
}

export const useSociete = () => useContext(SocieteContext)
