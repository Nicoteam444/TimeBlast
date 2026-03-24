import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const OBLIGATIONS = [
  {
    icon: '📅',
    title: 'Dates clés de la réforme',
    items: [
      { date: '✓ Depuis mars 2024', desc: 'Obligation de réception pour le secteur public via Chorus Pro' },
      { date: '📌 1er septembre 2026', desc: 'Obligation de réception pour TOUTES les entreprises + émission pour les grandes entreprises et ETI' },
      { date: '⚠️ 1er septembre 2027', desc: 'Obligation d\'émission pour les PME et micro-entreprises' },
    ]
  },
]

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Zéro perte de temps',
    desc: 'Générez vos factures électroniques automatiquement. TimeBlast le fait pour vous.'
  },
  {
    icon: '📊',
    title: 'Conformité garantie',
    desc: 'Respect des normes Chorus Pro, Factur-X et UBL. Audit trail complet pour les contrôles.'
  },
  {
    icon: '🔄',
    title: 'Données unifiées nativement',
    desc: 'CRM, compta, facturation — tout est connecté. Pas besoin d\'intégrateur pour relier vos outils.'
  },
  {
    icon: '💰',
    title: 'Prix PME accessible',
    desc: 'Pas de licence à 150€/user/mois. Une plateforme convergente pensée pour les PME/ETI.'
  },
  {
    icon: '🤖',
    title: 'IA agentique intégrée',
    desc: 'L\'IA ne suggère pas, elle agit : relances automatiques, détection d\'anomalies, validation intelligente.'
  },
  {
    icon: '🤝',
    title: 'Portail client intégré',
    desc: 'Vos clients accèdent à leurs factures via un lien sécurisé. Sans créer de compte, sans complication.'
  },
]

const HOW_WORKS = [
  {
    num: '1',
    title: 'Branchez vos outils',
    desc: 'TimeBlast se connecte à vos logiciels existants (Sage, Cegid, QuickBooks, Pennylane...) en un clic. 30+ connecteurs natifs.'
  },
  {
    num: '2',
    title: 'L\'IA structure vos données',
    desc: 'Vos données deviennent propres, connectées et exploitables. Validation SIRENE, détection d\'anomalies, enrichissement automatique.'
  },
  {
    num: '3',
    title: 'Distribution multi-canal',
    desc: 'Envoyez vos factures par email, XML UBL, portail client ou Chorus Pro. Tout depuis une seule interface.'
  },
  {
    num: '4',
    title: 'Les agents IA agissent',
    desc: 'Relances client automatiques, alertes trésorerie, rapprochement bancaire IA. De la donnée propre à l\'action autonome.'
  },
]

const FAQ = [
  {
    q: 'Qu\'est-ce que la facture électronique ?',
    a: 'La facture électronique est un document dématérialisé transmis en format structuré (XML UBL, Factur-X). Elle remplace la facture papier et PDF simple pour les transactions B2B en France.'
  },
  {
    q: 'Quelles sont les vraies dates de la réforme ?',
    a: 'Au 1er septembre 2026, toutes les entreprises devront pouvoir recevoir des e-factures, et les grandes entreprises/ETI devront émettre. Au 1er septembre 2027, l\'obligation d\'émission s\'étend aux PME et micro-entreprises.'
  },
  {
    q: 'Qui est concerné ?',
    a: 'TOUTES les entreprises assujetties à la TVA en France sont concernées, quelle que soit leur taille : grandes entreprises, ETI, PME, TPE et micro-entreprises.'
  },
  {
    q: 'Qu\'est-ce que Chorus Pro et les PDP ?',
    a: 'Chorus Pro est le portail public de facturation. Les Plateformes de Dématérialisation Partenaires (PDP) sont des intermédiaires privés agréés. TimeBlast s\'intègre aux deux.'
  },
  {
    q: 'TimeBlast s\'intègre à mon logiciel comptable ?',
    a: 'Oui, TimeBlast se connecte à Sage, Cegid, QuickBooks, Pennylane et 30+ autres outils. Pas besoin d\'intégrateur, tout est natif.'
  },
  {
    q: 'Pourquoi TimeBlast plutôt qu\'un autre outil ?',
    a: 'TimeBlast est la plateforme convergente : CRM, compta, facturation, RH — tout dans un seul outil. Vos données sont unifiées nativement, prêtes pour l\'IA agentique. Pas 10 logiciels à connecter.'
  },
]

export default function FactureElectroniquePage() {
  const navigate = useNavigate()
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
            <img src="/logo4.png" alt="TimeBlast" style={{ height: 28 }} />
          </div>
          <div className="landing-nav-links">
            <a href="/login">Accueil</a>
            <a href="#obligations">La réforme</a>
            <a href="#benefices">Avantages</a>
            <a href="#comment">Comment</a>
            <a href="#faq">FAQ</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">🤖 La donnée propre, le socle de l'IA agentique</div>
            <h1 className="landing-hero-title">
              E-Facture 2026 :<br />
              Soyez conforme<br />
              <span className="landing-hero-accent">sans tout changer.</span>
            </h1>
            <p className="landing-hero-subtitle">
              <strong>68% des PME sont immatures en données.</strong> La réforme e-facture arrive en septembre 2026.
              TimeBlast est la plateforme convergente qui rend vos données propres, connectées et conformes — en quelques jours.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn-primary" onClick={() => setShowLogin(true)}>
                Lancer votre e-facturation →
              </button>
              <a href="#comment" className="landing-btn-secondary">
                Voir comment ça marche
              </a>
            </div>
          </div>
          <div className="landing-hero-visual" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              fontSize: '6rem',
              textAlign: 'center',
              opacity: 0.15,
              letterSpacing: '-0.1em'
            }}>
              📋<br />✅
            </div>
          </div>
        </div>
      </section>

      {/* ── Obligations / Timeline ── */}
      <section className="landing-obligations" id="obligations">
        <h2 className="landing-section-title">Le vrai calendrier de la réforme</h2>
        <p className="landing-section-subtitle">
          Les dates officielles de la facturation électronique obligatoire (Loi de Finances 2024).
        </p>
        <div className="landing-timeline">
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#10b981' }}>✓</div>
            <div className="timeline-content">
              <h3>Depuis 2020</h3>
              <p>Obligation de facturation électronique pour les fournisseurs du <strong>secteur public</strong> via Chorus Pro.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#1D9BF0' }}>📌</div>
            <div className="timeline-content">
              <h3>1er septembre 2026</h3>
              <p><strong>Toutes les entreprises</strong> doivent pouvoir <strong>recevoir</strong> des e-factures. Les grandes entreprises et ETI doivent aussi <strong>émettre</strong>.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#ef4444' }}>⏰</div>
            <div className="timeline-content">
              <h3>1er septembre 2027 (Deadline finale)</h3>
              <p>Les <strong>PME et micro-entreprises</strong> doivent également émettre en e-facture. Plus aucune exception.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats" style={{ marginTop: '3rem' }}>
        <div className="landing-stat">
          <span className="landing-stat-value">68%</span>
          <span className="landing-stat-label">des PME immatures en données</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">4M</span>
          <span className="landing-stat-label">d'entreprises concernées</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">15€</span>
          <span className="landing-stat-label">d'amende par facture non-conforme</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">1</span>
          <span className="landing-stat-label">seul outil pour tout gérer</span>
        </div>
      </section>

      {/* ── Obligations détail ── */}
      <section className="landing-what-is" id="obligations-detail">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 className="landing-section-title">Qu'est-ce que la facture électronique ?</h2>
          <div className="obligations-grid">
            <div className="obligation-card">
              <h3>📄 Format standardisé</h3>
              <p>Fichier XML au format UBL ou Factur-X, reconnu internationalement. Fini les PDF non exploitables.</p>
            </div>
            <div className="obligation-card">
              <h3>🔐 Sécurisée & traçable</h3>
              <p>Signature électronique, audit trail complet. Chaque facture a un historique inviolable.</p>
            </div>
            <div className="obligation-card">
              <h3>🏛️ Chorus Pro & PDP</h3>
              <p>Transmission via le portail public (Chorus Pro) ou une Plateforme de Dématérialisation Partenaire agréée.</p>
            </div>
            <div className="obligation-card">
              <h3>💡 E-reporting obligatoire</h3>
              <p>En plus de l'e-facture, le e-reporting des transactions B2C et internationales devient obligatoire.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment TimeBlast aide ── */}
      <section className="landing-how" id="comment">
        <h2 className="landing-section-title">Comment TimeBlast vous rend conforme</h2>
        <p className="landing-section-subtitle">
          De la donnée brute à l'action automatisée — 4 étapes.
        </p>
        <div className="landing-how-grid">
          {HOW_WORKS.map((item, i) => (
            <div key={i} className="how-card">
              <div className="how-number">{item.num}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              {i < HOW_WORKS.length - 1 && <div className="how-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Bénéfices ── */}
      <section className="landing-benefits" id="benefices">
        <h2 className="landing-section-title">Pourquoi TimeBlast pour l'e-facture ?</h2>
        <p className="landing-section-subtitle">
          Une plateforme convergente — pas juste un outil de facturation.
        </p>
        <div className="landing-benefits-grid">
          {BENEFITS.map((b, i) => (
            <div key={i} className="benefit-card">
              <span className="benefit-icon">{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparaison Avant/Après ── */}
      <section className="landing-comparison">
        <h2 className="landing-section-title">Avant vs. Après TimeBlast</h2>
        <div className="comparison-table">
          <div className="comparison-row header">
            <div className="comparison-col">Processus</div>
            <div className="comparison-col">❌ Avant</div>
            <div className="comparison-col">✅ Après TimeBlast</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Outils</div>
            <div className="comparison-col">10 logiciels fragmentés</div>
            <div className="comparison-col">1 seule plateforme convergente</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Données</div>
            <div className="comparison-col">Silos, doublons, erreurs</div>
            <div className="comparison-col">Propres, connectées, exploitables</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">E-facture</div>
            <div className="comparison-col">Reconfiguration complète nécessaire</div>
            <div className="comparison-col">Conforme en quelques jours</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Distribution</div>
            <div className="comparison-col">Email manuel, PDF non-conforme</div>
            <div className="comparison-col">Email, XML, portail client, Chorus Pro</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Intelligence</div>
            <div className="comparison-col">Reporting manuel dans Excel</div>
            <div className="comparison-col">IA agentique : relances, alertes, validation</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Prix</div>
            <div className="comparison-col">150€/user/mois par outil</div>
            <div className="comparison-col">Prix PME accessible</div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="landing-roadmap" id="roadmap-efacture">
        <h2 className="landing-section-title">Notre vision : de la conformité à l'IA agentique</h2>
        <p className="landing-section-subtitle">
          L'e-facture n'est que le début. TimeBlast prépare vos données pour l'ère de l'IA.
        </p>
        <div className="landing-roadmap-grid">
          <div className="landing-roadmap-card" style={{ '--phase-color': '#16a34a' }}>
            <div className="landing-roadmap-header">
              <span className="landing-roadmap-badge" style={{ background: '#16a34a' }}>Phase 1</span>
              <span className="landing-roadmap-timing">Maintenant</span>
            </div>
            <h3 className="landing-roadmap-title">Données propres & conformes</h3>
            <ul className="landing-roadmap-list">
              <li>Conformité e-facture 2026</li>
              <li>Qualité des données & normalisation</li>
              <li>30+ connecteurs natifs</li>
              <li>API ouvertes & exports structurés</li>
            </ul>
          </div>
          <div className="landing-roadmap-card" style={{ '--phase-color': '#1D9BF0' }}>
            <div className="landing-roadmap-header">
              <span className="landing-roadmap-badge" style={{ background: '#1D9BF0' }}>Phase 2</span>
              <span className="landing-roadmap-timing">3-6 mois</span>
            </div>
            <h3 className="landing-roadmap-title">Assistant IA contextuel</h3>
            <ul className="landing-roadmap-list">
              <li>ChatWidget IA qui agit sur vos données</li>
              <li>Créer une facture en langage naturel</li>
              <li>Analyser la rentabilité en 1 question</li>
              <li>Rapprochement bancaire automatisé</li>
            </ul>
          </div>
          <div className="landing-roadmap-card" style={{ '--phase-color': '#7c3aed' }}>
            <div className="landing-roadmap-header">
              <span className="landing-roadmap-badge" style={{ background: '#7c3aed' }}>Phase 3</span>
              <span className="landing-roadmap-timing">6-12 mois</span>
            </div>
            <h3 className="landing-roadmap-title">Agents IA autonomes</h3>
            <ul className="landing-roadmap-list">
              <li>Relance client automatique</li>
              <li>Alertes trésorerie intelligentes</li>
              <li>Validation de notes de frais par IA</li>
              <li>Workflows IA sur mesure</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-faq" id="faq">
        <h2 className="landing-section-title">Questions fréquentes</h2>
        <div className="faq-grid">
          {FAQ.map((item, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className={`faq-toggle ${expandedFaq === i ? 'open' : ''}`}>▼</span>
              </button>
              {expandedFaq === i && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="landing-cta" id="cta">
        <div className="landing-cta-inner">
          <span className="landing-cta-icon">🤖</span>
          <h2>Préparez votre entreprise à l'ère de l'IA agentique</h2>
          <p>La conformité e-facture n'est que le début. Activez vos données avec TimeBlast.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
              Commencer maintenant →
            </button>
            <a href="/login#contact" className="landing-btn-secondary landing-btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Demander une démo
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo4.png" alt="TimeBlast" style={{ height: 24 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} TimeBlast — La plateforme IA qui active vos données
          </span>
        </div>
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="landing-login-card" onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowLogin(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>⚡</span>
              <h2 style={{ margin: '.25rem 0 0' }}>Connexion</h2>
              <p style={{ color: '#64748b', fontSize: '.88rem', margin: '.25rem 0 0' }}>
                Accédez à votre espace TimeBlast
              </p>
            </div>
            <form>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" placeholder="nom@entreprise.com" autoFocus />
              </div>
              <div className="field">
                <label htmlFor="password">Mot de passe</label>
                <input id="password" type="password" placeholder="••••••••" />
              </div>
              <button type="button" className="landing-btn-primary" style={{ width: '100%', marginTop: '.75rem' }}>
                Se connecter →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
