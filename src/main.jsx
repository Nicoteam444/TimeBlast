import { Component } from 'react'
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

// Root ErrorBoundary — ignore les erreurs DOM non-fatales (removeChild)
// qui arrivent quand React veut cleanup un noeud deja nettoye par une extension
// navigateur ou le hoisting de styles. Ces erreurs ne cassent pas le rendu.
function isIgnorableError(error) {
  const msg = error?.message || ''
  return msg.includes('removeChild') && msg.includes('not a child')
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, retryKey: 0 }
  }
  static getDerivedStateFromError(error) {
    // Les erreurs removeChild sont ignorees → on retry avec un nouveau key
    if (isIgnorableError(error)) return null
    return { error }
  }
  componentDidCatch(error, info) {
    if (isIgnorableError(error)) {
      // Ignorer silencieusement et forcer un remount propre
      console.warn('[Root] Ignoring transient DOM error:', error.message)
      this.setState(s => ({ error: null, retryKey: s.retryKey + 1 }))
      return
    }
    console.error('[Root crash]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'ui-monospace, monospace', background: '#fff', color: '#1e293b', minHeight: '100vh' }}>
          <h1 style={{ color: '#dc2626', marginTop: 0 }}>Erreur d'application</h1>
          <p><strong>Message :</strong> {this.state.error?.message}</p>
          <details open>
            <summary style={{ cursor: 'pointer', fontWeight: 600, margin: '1rem 0 .5rem' }}>Stack trace</summary>
            <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 11, lineHeight: 1.5 }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload() }}
            style={{ marginTop: 16, padding: '.6rem 1.2rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            Vider le cache et recharger
          </button>
        </div>
      )
    }
    // Le key change au retry, ce qui force un remount complet et resout le probleme
    return <div key={this.state.retryKey}>{this.props.children}</div>
  }
}

// Safety net : patch global de window.onerror pour swallow les removeChild errors
// avant qu'elles n'atteignent l'ErrorBoundary React
window.addEventListener('error', (e) => {
  if (e.error && isIgnorableError(e.error)) {
    e.preventDefault()
    e.stopImmediatePropagation()
    return true
  }
}, true)
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && isIgnorableError(e.reason)) {
    e.preventDefault()
    return true
  }
})

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary><App /></RootErrorBoundary>
)
