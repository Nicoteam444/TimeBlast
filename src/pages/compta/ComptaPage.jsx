import { useNavigate } from 'react-router-dom'

export default function ComptaPage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-inner">
          <div>
            <h1 className="home-hero-title">Comptabilité</h1>
            <p className="home-hero-sub">Import et visualisation des fichiers FEC</p>
          </div>
        </div>
      </div>

      <div className="home-modules">
        <button className="home-module-card" onClick={() => navigate('/finance/comptabilite/import')}>
          <div className="home-module-icon">📥</div>
          <div className="home-module-body">
            <h2>Import FEC</h2>
            <p>Importer un fichier FEC par société et par année</p>
          </div>
          <span className="home-module-arrow">→</span>
        </button>

        <button className="home-module-card" onClick={() => navigate('/finance/comptabilite/ecritures')}>
          <div className="home-module-icon">📊</div>
          <div className="home-module-body">
            <h2>Écritures</h2>
            <p>Consulter les écritures comptables par société et par période</p>
          </div>
          <span className="home-module-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
