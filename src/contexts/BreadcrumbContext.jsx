import { createContext, useContext, useState, useCallback } from 'react'

const BreadcrumbContext = createContext()

export function BreadcrumbProvider({ children }) {
  const [customSegments, setCustomSegments] = useState([])

  const setSegments = useCallback((segments) => {
    setCustomSegments(segments)
  }, [])

  const clearSegments = useCallback(() => {
    setCustomSegments([])
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ customSegments, setSegments, clearSegments }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}
