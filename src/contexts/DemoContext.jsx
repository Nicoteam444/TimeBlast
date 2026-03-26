import { createContext, useContext } from 'react'

const DemoContext = createContext()

export function DemoProvider({ children }) {
  return (
    <DemoContext.Provider value={{}}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return { isDemoMode: false, setIsDemoMode: () => {} }
}
