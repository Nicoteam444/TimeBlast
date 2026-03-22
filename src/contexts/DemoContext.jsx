import { createContext, useContext } from 'react'
import { useSociete } from './SocieteContext'

const DemoContext = createContext()

export function DemoProvider({ children }) {
  return (
    <DemoContext.Provider value={{}}>
      {children}
    </DemoContext.Provider>
  )
}

// isDemoMode est vrai quand la société sélectionnée est "SRA TEST"
export function useDemo() {
  const { selectedSociete } = useSociete() || {}
  const isDemoMode = selectedSociete?.name === 'SRA TEST'
  return { isDemoMode, setIsDemoMode: () => {} }
}
