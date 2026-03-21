import { useNavigate } from 'react-router-dom'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Accès refusé</h2>
        <p>Vous n'avez pas les droits pour accéder à cette page.</p>
        <button onClick={() => navigate('/')}>Retour à l'accueil</button>
      </div>
    </div>
  )
}
