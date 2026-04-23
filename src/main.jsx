import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// DEBUG SSO — capturer l'URL initiale avant tout (survit à la navigation)
try {
  const entry = { url: window.location.href, ts: new Date().toISOString() }
  const prev = JSON.parse(sessionStorage.getItem('__sso_debug') || '[]')
  prev.push(entry)
  sessionStorage.setItem('__sso_debug', JSON.stringify(prev.slice(-5)))
} catch {}


// StrictMode desactive volontairement : causait des crashes 'removeChild'
// en interaction avec les extensions Chrome qui modifient le DOM
createRoot(document.getElementById('root')).render(<App />)
