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

// Root ErrorBoundary — capture tous les crashes React et affiche l'erreur
class RootErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[Root crash]', error, info) }
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
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600, margin: '1rem 0 .5rem' }}>Component stack</summary>
            <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 11 }}>
              {this.state.error?.componentStack || '(non disponible)'}
            </pre>
          </details>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload() }}
            style={{ marginTop: 16, padding: '.6rem 1.2rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            Vider le cache et recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary><App /></RootErrorBoundary>
)
