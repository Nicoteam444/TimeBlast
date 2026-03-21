import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function TempsPage() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-inner">
          <div>
            <h1 className="home-hero-title">Gestion du temps</h1>
            <p className="home-hero-sub">Planification des projets et saisie des heures</p>
          </div>
        </div>
      </div>

      <div className="home-modules">
        {hasRole('admin', 'manager') && (
          <button className="home-module-card" onClick={() => navigate('/temps/planification')}>
            <div className="home-module-icon">📅</div>
            <div className="home-module-body">
              <h2>Planification</h2>
              <p>Créer des projets, des lots et assigner les collaborateurs</p>
            </div>
            <span className="home-module-arrow">→</span>
          </button>
        )}

        <button className="home-module-card" onClick={() => navigate('/temps/saisie')}>
          <div className="home-module-icon">✏️</div>
          <div className="home-module-body">
            <h2>Saisie du temps</h2>
            <p>Pointer vos heures quotidiennes sur les projets et lots</p>
          </div>
          <span className="home-module-arrow">→</span>
        </button>

        {hasRole('admin', 'manager') && (
          <button className="home-module-card" onClick={() => navigate('/temps/suivi')}>
            <div className="home-module-icon">📈</div>
            <div className="home-module-body">
              <h2>Suivi</h2>
              <p>Vue d'ensemble des temps saisis par projet et collaborateur</p>
            </div>
            <span className="home-module-arrow">→</span>
          </button>
        )}
      </div>
    </div>
  )
}
