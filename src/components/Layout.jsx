import { useState, useEffect } from 'react'
import { LayoutProvider } from '../contexts/LayoutContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function LayoutInner({ children }) {
  const { profile } = useAuth()
  const [societes, setSocietes] = useState([])
  const [selectedSociete, setSelectedSociete] = useState(null)

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'comptable') {
      supabase.from('societes').select('*').order('name').then(({ data }) => {
        if (data) setSocietes(data)
      })
    }
  }, [profile])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar
          societes={societes}
          selectedSociete={selectedSociete}
          onSelectSociete={setSelectedSociete}
        />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <LayoutProvider>
      <LayoutInner>{children}</LayoutInner>
    </LayoutProvider>
  )
}
