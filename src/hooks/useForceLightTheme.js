import { useEffect } from 'react'

// Force le theme light pendant que le composant est monte.
// A utiliser sur les pages admin/backoffice qui doivent rester
// en mode clair quelle que soit la preference utilisateur.
export default function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.style.setProperty('--bg', '#F0F0F0')
    root.style.setProperty('--surface', '#FFFFFF')
    root.style.setProperty('--card-bg', '#FFFFFF')
    root.style.setProperty('--border', '#e2e8f0')
    root.style.setProperty('--text', '#0D1B24')
    root.style.setProperty('--text-muted', '#5a7080')
    root.style.setProperty('--primary', '#195C82')
    root.style.setProperty('--accent', '#1D9BF0')
    root.style.setProperty('--error', '#dc2626')
    root.style.setProperty('--success', '#16a34a')
    return () => { if (prevTheme) root.setAttribute('data-theme', prevTheme) }
  }, [])
}
