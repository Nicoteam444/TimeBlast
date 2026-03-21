import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjetsPage from './ProjetsPage'
import ProjetDetailPage from './ProjetDetailPage'
import ClientsPage from './ClientsPage'

const VIEWS = [
  { id: 'projets', label: '📁 Projets' },
  { id: 'clients', label: '🏢 Clients' },
]

export default function PlanificationPage() {
  const navigate = useNavigate()
  const [view, setView] = useState('projets')
  const [selectedProjet, setSelectedProjet] = useState(null)

  if (selectedProjet) {
    return <ProjetDetailPage projet={selectedProjet} onBack={() => setSelectedProjet(null)} />
  }

  return (
    <div>
      <div className="sub-tabs">
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={`sub-tab ${view === v.id ? 'sub-tab--active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'projets' && <ProjetsPage onSelect={setSelectedProjet} />}
      {view === 'clients' && <ClientsPage />}
    </div>
  )
}
