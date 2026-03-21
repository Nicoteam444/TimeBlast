import { createContext, useContext, useState } from 'react'

const DemoContext = createContext()

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  return (
    <DemoContext.Provider value={{ isDemoMode, setIsDemoMode }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return useContext(DemoContext)
}
