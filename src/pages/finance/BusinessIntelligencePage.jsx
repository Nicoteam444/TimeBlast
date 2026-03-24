import { useState } from 'react'
import ComptaPage from '../compta/ComptaPage'
import ComptaEcrituresPage from '../compta/ComptaEcrituresPage'

/**
 * Business Intelligence Page
 * Fusionne Tableau de bord compta + Écritures FEC
 * Permet d'uploader des FEC et de les visualiser
 */

const TABS = [
  { id: 'dashboard', label: '📊 Tableau de bord', desc: 'Visualisation des données comptables' },
  { id: 'ecritures', label: '📒 Écritures FEC', desc: 'Import et consultation des FEC' },
]

export default function BusinessIntelligencePage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '0' }}>
        <div>
          <h1>📊 Business Intelligence</h1>
          <p>Importez vos FEC et visualisez vos données comptables</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid var(--border)',
        marginBottom: '1.5rem',
        marginTop: '.75rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '.92rem',
              cursor: 'pointer',
              transition: 'all .15s',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && <ComptaPage />}
      {activeTab === 'ecritures' && <ComptaEcrituresPage />}
    </div>
  )
}
