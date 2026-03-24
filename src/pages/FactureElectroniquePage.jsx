import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const OBLIGATIONS = [
  {
    icon: '📅',
    title: 'Dates clés de la réforme',
    items: [
      { date: '✓ Depuis janvier 2024', desc: 'Obligation pour les gros volumes (> 10M€ CA)' },
      { date: '📌 Janvier 2025', desc: 'Extension à toutes les entreprises' },
      { date: '⚠️ Janvier 2026', desc: 'Fin de transition — E-facture OBLIGATOIRE' },
    ]
  },
]

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Zéro perte de temps',
    desc: 'Générez vos factures électroniques automatiquement. TimeBlast.ai le fait pour vous.'
  },
  {
    icon: '📊',
    title: 'Conformité garantie',
    desc: 'Respect des normes Chorus Pro et UBL. Audit trail complet pour les contrôles.'
  },
  {
    icon: '🔄',
    title: 'Synchronisation en temps réel',
    desc: 'Vos factures en PDF, XML, EDI — le tout intégré à votre comptabilité.'
  },
  {
    icon: '💰',
    title: 'Réduction des coûts',
    desc: 'Moins de retours, moins de rejets. Les données se valident d\'elles-mêmes.'
  },
  {
    icon: '🏛️',
    title: 'Traçabilité légale',
    desc: 'Historique complète de chaque facture. Prêt pour les contrôles DGFIP/Urssaf.'
  },
  {
    icon: '🤝',
    title: 'Intégration fournisseurs',
    desc: 'Vos clients reçoivent les factures directement. Moins de demandes d\'accès.'
  },
]

const HOW_WORKS = [
  {
    num: '1',
    title: 'Votre logiciel génère',
    desc: 'TimeBlast.ai capture vos factures depuis votre système comptable (Sage, Cegid, QuickBooks, etc.)'
  },
  {
    num: '2',
    title: 'TimeBlast.ai enrichit',
    desc: 'Validation automatique des données, enrichissement SIRENE, détection des anomalies.'
  },
  {
    num: '3',
    title: 'Transmission Chorus Pro',
    desc: 'Envoi sécurisé vers Chorus Pro ou à vos clients en format e-facture standard (UBL XML).'
  },
  {
    num: '4',
    title: 'Archivage & Traçabilité',
    desc: 'Archivage légal, audit trail complet, rapports de conformité pour vos audits.'
  },
]

const FAQ = [
  {
    q: 'Qu\'est-ce que la facture électronique ?',
    a: 'La facture électronique est un document factuel dématérialisé transmis en XML (norme UBL). Elle remplace la facture papier et PDF pour les transactions B2B.'
  },
  {
    q: 'Qui est concerné ?',
    a: 'Depuis janvier 2025, TOUTES les entreprises sont concernées (TPE, PME, ETI). Les auto-entrepreneurs suivront progressivement.'
  },
  {
    q: 'Qu\'est-ce que Chorus Pro ?',
    a: 'C\'est la plateforme de l\'État pour la transmission des factures électroniques. Obligatoire pour les marchés publics et la plupart des appels d\'offres.'
  },
  {
    q: 'TimeBlast.ai s\'intègre à mon logiciel comptable ?',
    a: 'Oui, TimeBlast.ai se connecte à Sage, Cegid, QuickBooks, Pennylane et 30+ autres. Zéro reconfiguration.'
  },
  {
    q: 'Quel est le coût de la réforme ?',
    a: 'Sans TimeBlast.ai : restructuration complète de votre chaîne facturation + formation équipe. Avec TimeBlast.ai : intégration en quelques jours.'
  },
  {
    q: 'Comment gérer la transition ?',
    a: 'TimeBlast.ai gère les deux formats en parallèle : PDF pour clients non-connectés, XML pour Chorus Pro. Zéro rupture.'
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
            <img src="/logo4.png" alt="TimeBlast.ai" style={{ height: 28 }} />
          </div>
          <div className="landing-nav-links">
            <a href="#obligations">La réforme</a>
            <a href="#benefices">Bénéfices</a>
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
            <div className="landing-hero-badge">📋 Réforme Facture Électronique 2024-2026</div>
            <h1 className="landing-hero-title">
              Facture électronique :<br />
              Soyez prêt<br />
              <span className="landing-hero-accent">avant la date limite.</span>
            </h1>
            <p className="landing-hero-subtitle">
              L'e-facture devient <strong>obligatoire en janvier 2026</strong>. TimeBlast.ai vous rend
              conforme en quelques jours — pas de refonte complète, pas de perte de données, pas de complications.
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
        <h2 className="landing-section-title">La réforme en chiffres</h2>
        <p className="landing-section-subtitle">
          Les dates clés de la transformation obligatoire.
        </p>
        <div className="landing-timeline">
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#10b981' }}>✓</div>
            <div className="timeline-content">
              <h3>Depuis janvier 2024</h3>
              <p>Les grandes entreprises (&gt; 10M€) doivent émettre en e-facture.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#f59e0b' }}>📌</div>
            <div className="timeline-content">
              <h3>Janvier 2025 (En cours)</h3>
              <p><strong>TOUTES les entreprises</strong> doivent émettre en e-facture. Auto-entrepreneurs suivent progressivement.</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#ef4444' }}>⏰</div>
            <div className="timeline-content">
              <h3>Janvier 2026 (Deadline finale)</h3>
              <p>L'e-facture est <strong>100% obligatoire</strong>. Les PDF et papier ne sont plus acceptés pour les B2B.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats" style={{ marginTop: '3rem' }}>
        <div className="landing-stat">
          <span className="landing-stat-value">95%</span>
          <span className="landing-stat-label">des entreprises non préparées</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">12 mois</span>
          <span className="landing-stat-label">temps moyen de migration</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">€</span>
          <span className="landing-stat-label">pénalités par facture non-conforme</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">30 000€</span>
          <span className="landing-stat-label">amende pour infraction</span>
        </div>
      </section>

      {/* ── Obligations détail ── */}
      <section className="landing-what-is" id="obligations-detail">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 className="landing-section-title">Qu'est-ce que la facture électronique ?</h2>
          <div className="obligations-grid">
            <div className="obligation-card">
              <h3>📄 Format standardisé</h3>
              <p>Fichier XML au format UBL (Universal Business Language) reconnu internationalement. Plus de PDF chaotiques.</p>
            </div>
            <div className="obligation-card">
              <h3>🔐 Sécurisée & traçable</h3>
              <p>Signature électronique, audit trail complet. Chaque facture a un historique inviolable.</p>
            </div>
            <div className="obligation-card">
              <h3>🏛️ Pour le public</h3>
              <p>Les marchés publics passent par Chorus Pro. Les factures B2B normales vont directement aux clients.</p>
            </div>
            <div className="obligation-card">
              <h3>💡 Simplifiée pour l'État</h3>
              <p>Permet à l'administration de lutter contre la fraude, améliorer les stats fiscales, simplifier les déclarations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment TimeBlast.ai aide ── */}
      <section className="landing-how" id="comment">
        <h2 className="landing-section-title">Comment TimeBlast.ai vous rend conforme</h2>
        <p className="landing-section-subtitle">
          4 étapes pour transformer vos factures en e-factures légales.
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
        <h2 className="landing-section-title">Les bénéfices pour votre entreprise</h2>
        <p className="landing-section-subtitle">
          Au-delà de la conformité légale, gagnez en efficacité.
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
        <h2 className="landing-section-title">Avant vs. Après TimeBlast.ai</h2>
        <div className="comparison-table">
          <div className="comparison-row header">
            <div className="comparison-col">Processus</div>
            <div className="comparison-col">❌ Avant</div>
            <div className="comparison-col">✅ Après TimeBlast.ai</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Génération facture</div>
            <div className="comparison-col">Manuel dans Excel/logiciel</div>
            <div className="comparison-col">Automatique depuis Sage/Cegid</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Validation données</div>
            <div className="comparison-col">À la main, erreurs fréquentes</div>
            <div className="comparison-col">Validation IA, zéro anomalies</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Transmission Chorus Pro</div>
            <div className="comparison-col">Reconfiguration complète nécessaire</div>
            <div className="comparison-col">Branchement Chorus Pro intégré</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Format clients</div>
            <div className="comparison-col">PDF ou papier non-conforme</div>
            <div className="comparison-col">XML UBL + PDF optionnel</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Traçabilité légale</div>
            <div className="comparison-col">Dossiers éparpillés, audit difficile</div>
            <div className="comparison-col">Historique centralisé & auditable</div>
          </div>

          <div className="comparison-row">
            <div className="comparison-col label">Temps implémentation</div>
            <div className="comparison-col">12-18 mois de restructuration</div>
            <div className="comparison-col">Quelques jours seulement</div>
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
          <span className="landing-cta-icon">📋</span>
          <h2>Déjà en retard ?</h2>
          <p>La réforme est en cours. Lancez votre conformité e-facture dès maintenant avec TimeBlast.ai.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={() => setShowLogin(true)}>
            Commencer la transformation →
          </button>
          <p style={{ marginTop: '1rem', fontSize: '.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Inclus : mise en place, vérification de conformité, formation équipe.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo4.png" alt="TimeBlast.ai" style={{ height: 24 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} — La multiprise intelligente pour votre entreprise
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
                Accédez à votre espace TimeBlast.ai
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
