import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PAIN_POINTS = [
  { icon: '😰', title: 'Données incomplètes', desc: 'SIRET manquant, adresses erronées, codes TVA absents — vos fiches clients ne sont pas prêtes pour l\'e-facture.' },
  { icon: '🔀', title: 'Systèmes fragmentés', desc: 'Compta, CRM, facturation dans 3 outils différents. Aucune donnée n\'est synchronisée.' },
  { icon: '📋', title: 'Saisie manuelle', desc: 'Copier-coller entre Excel, votre ERP et Chorus Pro. Erreurs garanties.' },
  { icon: '⏰', title: 'Deadline qui approche', desc: 'Sept. 2026 : réception obligatoire. Sept. 2027 : émission pour les PME. Le temps presse.' },
]

const BI_SOLUTION = [
  {
    num: '1', icon: '🔌',
    title: 'Connectez vos sources',
    desc: 'TimeBlast agrège vos données de Sage, Pennylane, QuickBooks, CRM, banque — 30+ connecteurs natifs. Fini les silos.',
  },
  {
    num: '2', icon: '📊',
    title: 'La BI enrichit vos données',
    desc: 'Détection automatique des champs manquants (SIRET, code TVA, adresse). L\'IA complète, normalise et valide vos fiches tiers via l\'API SIRENE.',
  },
  {
    num: '3', icon: '✅',
    title: 'Conformité automatique',
    desc: 'Vos données sont propres → vos factures sont conformes. Génération XML UBL, Factur-X, envoi Chorus Pro — tout est automatisé.',
  },
  {
    num: '4', icon: '🤖',
    title: 'L\'IA agit pour vous',
    desc: 'Relances clients automatiques, alertes trésorerie, rapprochement bancaire. De la donnée propre à l\'action autonome.',
  },
]

const ENRICHMENT_FEATURES = [
  { icon: '🏢', title: 'Vérification SIRENE', desc: 'Chaque tiers est vérifié via l\'API publique INSEE. SIRET, NAF, adresse — tout est contrôlé.' },
  { icon: '🔍', title: 'Détection d\'anomalies', desc: 'L\'IA détecte les doublons, les champs vides, les incohérences. Score de qualité par fiche.' },
  { icon: '📐', title: 'Normalisation', desc: 'Adresses normalisées (BAN), codes TVA validés, formats unifiés. Prêt pour le XML.' },
  { icon: '📊', title: 'Score de maturité data', desc: 'Tableau de bord BI : % de fiches complètes, champs manquants par catégorie, progression.' },
  { icon: '⚡', title: 'Enrichissement en masse', desc: 'Import CSV, enrichissement automatique, export conforme. Traitez 1000 fiches en 5 minutes.' },
  { icon: '🔄', title: 'Synchronisation continue', desc: 'Les données enrichies sont synchronisées avec votre compta et CRM en temps réel.' },
]

const COMPARE = [
  { process: 'Qualité des données', before: 'Vérification manuelle dans Excel', after: 'Score BI automatique + correction IA' },
  { process: 'Fiches tiers', before: 'SIRET manquant, adresses erronées', after: 'Vérifié SIRENE, normalisé, complet' },
  { process: 'Format facture', before: 'PDF non structuré par email', after: 'XML UBL / Factur-X automatique' },
  { process: 'Distribution', before: 'Email manuel, pas de traçabilité', after: 'Multi-canal : email, Chorus Pro, portail client' },
  { process: 'Suivi', before: 'Pas de visibilité sur les retards', after: 'Dashboard BI + alertes IA temps réel' },
  { process: 'Coût', before: '150€/user/mois par outil × 5 outils', after: 'Une seule plateforme BI, prix PME' },
]

const FAQ = [
  { q: 'Qu\'est-ce que la facture électronique ?', a: 'Un document dématérialisé transmis en format structuré (XML UBL, Factur-X). Elle remplace la facture PDF simple pour les transactions B2B en France.' },
  { q: 'Quelles sont les dates de la réforme ?', a: '1er septembre 2026 : réception obligatoire pour toutes les entreprises + émission pour les grandes entreprises/ETI. 1er septembre 2027 : émission obligatoire pour les PME et micro-entreprises.' },
  { q: 'Quel rapport entre la BI et l\'e-facture ?', a: 'La conformité e-facture exige des données propres (SIRET, TVA, adresses normalisées). Un outil de BI comme TimeBlast détecte les lacunes, enrichit vos données et génère automatiquement des factures conformes.' },
  { q: 'TimeBlast remplace mon logiciel comptable ?', a: 'Non, TimeBlast s\'y connecte. Il agrège vos données de Sage, Pennylane, QuickBooks etc., les enrichit, et renvoie les écritures conformes. C\'est une couche décisionnelle au-dessus de vos outils.' },
  { q: 'Combien de temps pour être conforme ?', a: 'Avec TimeBlast : quelques jours. Connectez vos sources, laissez l\'IA analyser et enrichir vos données, et vous êtes prêt pour l\'e-facture.' },
  { q: 'Qu\'est-ce que Chorus Pro et les PDP ?', a: 'Chorus Pro est le portail public de facturation. Les PDP (Plateformes de Dématérialisation Partenaires) sont des intermédiaires privés agréés. TimeBlast s\'intègre aux deux.' },
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
            <img src="/logo-icon.svg" alt="TimeBlast" style={{ height: 28 }} />
          </div>
          <div className="landing-nav-links">
            <a href="/login">Accueil</a>
            <a href="#probleme">Le problème</a>
            <a href="#solution">La solution BI</a>
            <a href="#enrichissement">Enrichissement</a>
            <a href="#faq">FAQ</a>
          </div>
          <button className="landing-nav-btn" onClick={() => setShowLogin(true)}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — TimeBlast BI + e-facture
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">📊 Business Intelligence + E-Facture 2026</div>
            <h1 className="landing-hero-title">
              TimeBlast
            </h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#475569', marginBottom: '1.25rem', marginTop: '-.5rem', lineHeight: 1.3 }}>
              La BI qui rend vos données<br />
              <span style={{ color: '#16a34a' }}>conformes à l'e-facture</span>
            </h2>
            <p className="landing-hero-subtitle">
              <strong>La réforme e-facture exige des données propres.</strong> TimeBlast est la plateforme
              décisionnelle qui enrichit, normalise et valide vos données — pour que vos factures soient
              conformes automatiquement.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn-primary" onClick={() => navigate('/login#contact')}>
                Diagnostic data gratuit →
              </button>
              <a href="#solution" className="landing-btn-secondary">
                Comment ça marche
              </a>
            </div>
          </div>
          <div className="landing-hero-visual" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Mini dashboard conformité */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: 24, width: 320, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#195C82', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                📊 Score de maturité data
              </div>
              {[
                { label: 'Fiches tiers complètes', pct: 72, color: '#f59e0b' },
                { label: 'SIRET vérifiés', pct: 45, color: '#ef4444' },
                { label: 'Adresses normalisées', pct: 88, color: '#16a34a' },
                { label: 'Codes TVA valides', pct: 91, color: '#16a34a' },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', marginBottom: 4 }}>
                    <span style={{ color: '#475569' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: item.color, width: `${item.pct}%`, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#fef3c7', borderRadius: 8, fontSize: '.65rem', color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>⚠️</span>
                <span><strong>28% de fiches incomplètes</strong> — risque de rejet e-facture. TimeBlast peut enrichir automatiquement.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
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
          <span className="landing-stat-value">Sept. 2026</span>
          <span className="landing-stat-label">deadline réception obligatoire</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LE VRAI PROBLÈME — données pas prêtes
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-features" id="probleme">
        <h2 className="landing-section-title">Le vrai problème : vos données ne sont pas prêtes</h2>
        <p className="landing-section-subtitle">
          La réforme e-facture ne demande pas juste un nouveau format — elle exige des données complètes, normalisées, vérifiées.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="landing-feature-card" style={{ borderColor: '#fecaca', background: '#fffbfb' }}>
              <span className="landing-feature-icon">{p.icon}</span>
              <h3 style={{ color: '#dc2626' }}>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timeline réforme ── */}
      <section className="landing-obligations" id="timeline">
        <h2 className="landing-section-title">Le calendrier officiel</h2>
        <p className="landing-section-subtitle">
          Loi de Finances 2024 — dates définitives de la facturation électronique obligatoire.
        </p>
        <div className="landing-timeline">
          <div className="timeline-item">
            <div className="timeline-marker" style={{ background: '#10b981' }}>✓</div>
            <div className="timeline-content">
              <h3>Depuis 2020</h3>
              <p>Obligation pour les fournisseurs du <strong>secteur public</strong> via Chorus Pro.</p>
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
              <h3>1er septembre 2027</h3>
              <p>Les <strong>PME et micro-entreprises</strong> doivent également émettre. Plus aucune exception.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LA SOLUTION BI — 4 étapes
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-how" id="solution">
        <h2 className="landing-section-title">La solution : la BI qui enrichit vos données</h2>
        <p className="landing-section-subtitle">
          TimeBlast ne génère pas juste des factures — il rend vos données exploitables et conformes.
        </p>
        <div className="landing-how-grid">
          {BI_SOLUTION.map((item, i) => (
            <div key={i} className="how-card">
              <div className="how-number">{item.num}</div>
              <h3>{item.icon} {item.title}</h3>
              <p>{item.desc}</p>
              {i < BI_SOLUTION.length - 1 && <div className="how-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ENRICHISSEMENT DATA — 6 features
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-benefits" id="enrichissement">
        <h2 className="landing-section-title">Enrichissement de données intelligent</h2>
        <p className="landing-section-subtitle">
          La BI de TimeBlast analyse, détecte les lacunes et enrichit automatiquement vos fiches tiers.
        </p>
        <div className="landing-benefits-grid">
          {ENRICHMENT_FEATURES.map((f, i) => (
            <div key={i} className="benefit-card">
              <span className="benefit-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          COMPARAISON Avant / Après
      ══════════════════════════════════════════════════════════════════ */}
      <section className="landing-comparison">
        <h2 className="landing-section-title">Avant vs. Après TimeBlast</h2>
        <div className="comparison-table">
          <div className="comparison-row header">
            <div className="comparison-col">Processus</div>
            <div className="comparison-col">❌ Sans BI</div>
            <div className="comparison-col">✅ Avec TimeBlast</div>
          </div>
          {COMPARE.map((row, i) => (
            <div key={i} className="comparison-row">
              <div className="comparison-col label">{row.process}</div>
              <div className="comparison-col">{row.before}</div>
              <div className="comparison-col">{row.after}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="landing-roadmap" id="roadmap">
        <h2 className="landing-section-title">De la conformité à l'IA décisionnelle</h2>
        <p className="landing-section-subtitle">
          L'e-facture est le point de départ. TimeBlast prépare vos données pour le pilotage intelligent.
        </p>
        <div className="landing-roadmap-grid">
          {[
            { phase: 'Phase 1', timing: 'Disponible', color: '#16a34a', title: 'Données propres & conformes',
              items: ['Conformité e-facture 2026', 'Enrichissement SIRENE automatique', '30+ connecteurs natifs', 'Score de maturité data'] },
            { phase: 'Phase 2', timing: '3–6 mois', color: '#1D9BF0', title: 'BI prédictive',
              items: ['Prévisions trésorerie & CA', 'Détection d\'anomalies comptables', 'Assistant IA en langage naturel', 'Rapprochement bancaire IA'] },
            { phase: 'Phase 3', timing: '6–12 mois', color: '#7c3aed', title: 'Agents IA autonomes',
              items: ['Relances clients automatiques', 'Validation notes de frais par IA', 'Alertes trésorerie intelligentes', 'Workflows décisionnels sur mesure'] },
          ].map((p, i) => (
            <div key={i} className="landing-roadmap-card" style={{ '--phase-color': p.color }}>
              <div className="landing-roadmap-header">
                <span className="landing-roadmap-badge" style={{ background: p.color }}>{p.phase}</span>
                <span className="landing-roadmap-timing">{p.timing}</span>
              </div>
              <h3 className="landing-roadmap-title">{p.title}</h3>
              <ul className="landing-roadmap-list">
                {p.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-faq" id="faq">
        <h2 className="landing-section-title">Questions fréquentes</h2>
        <div className="faq-grid">
          {FAQ.map((item, i) => (
            <div key={i} className="faq-item">
              <button className="faq-question" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                <span>{item.q}</span>
                <span className={`faq-toggle ${expandedFaq === i ? 'open' : ''}`}>▼</span>
              </button>
              {expandedFaq === i && <div className="faq-answer">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <span className="landing-cta-icon">📊</span>
          <h2>Vos données sont-elles prêtes pour l'e-facture ?</h2>
          <p>Diagnostic gratuit en 30 minutes — on évalue votre maturité data et votre niveau de conformité.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/login#contact')}>
              Diagnostic data gratuit →
            </button>
            <button className="landing-btn-secondary landing-btn-lg" onClick={() => setShowLogin(true)}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src="/logo-icon.svg" alt="TimeBlast" style={{ height: 24 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem' }}>
            © {new Date().getFullYear()} TimeBlast.ai — Plateforme décisionnelle intelligente pour PME
          </span>
        </div>
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="landing-login-card" onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowLogin(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>📊</span>
              <h2 style={{ margin: '.25rem 0 0' }}>Connexion</h2>
              <p style={{ color: '#64748b', fontSize: '.88rem', margin: '.25rem 0 0' }}>
                Accédez à votre espace décisionnel
              </p>
            </div>
            <form>
              <div className="field">
                <label htmlFor="email-ef">Email</label>
                <input id="email-ef" type="email" placeholder="nom@entreprise.com" autoFocus />
              </div>
              <div className="field">
                <label htmlFor="password-ef">Mot de passe</label>
                <input id="password-ef" type="password" placeholder="••••••••" />
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
