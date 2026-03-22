import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-inner">
          <div>
            <h1 className="home-hero-title">Administration</h1>
            <p className="home-hero-sub">Gestion des utilisateurs et de la configuration</p>
          </div>
        </div>
      </div>

      <div className="home-modules">
        <button className="home-module-card" onClick={() => navigate('/admin/societes')}>
          <div className="home-module-icon">🏢</div>
          <div className="home-module-body">
            <h2>Sociétés</h2>
            <p>Créer et gérer les sociétés du groupe</p>
          </div>
          <span className="home-module-arrow">→</span>
        </button>

        <button className="home-module-card" onClick={() => navigate('/admin/utilisateurs')}>
          <div className="home-module-icon">👥</div>
          <div className="home-module-body">
            <h2>Utilisateurs</h2>
            <p>Créer, modifier et supprimer les comptes collaborateurs</p>
          </div>
          <span className="home-module-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
