import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const S = {
  neon: '#195C82',
  dark: '#0f172a',
  gray: '#64748b',
  lightGray: '#94a3b8',
  bg: '#fff',
  bgAlt: '#fafbfc',
}

const PLANS = [
  {
    id: 'free',
    name: 'Découverte',
    subtitle: 'Pour tester TimeBlast',
    price: { monthly: 0, yearly: 0 },
    badge: null,
    highlight: false,
    cta: 'Commencer gratuitement',
    ctaStyle: 'secondary',
    features: [
      { text: '1 utilisateur', included: true },
      { text: '1 société', included: true },
      { text: 'Saisie des temps', included: true },
      { text: 'Gestion de projet (3 projets)', included: true },
      { text: 'CRM (50 contacts)', included: true },
      { text: 'Données de démonstration', included: true },
      { text: 'Support communautaire', included: true },
      { text: 'Facturation', included: false },
      { text: 'Comptabilité', included: false },
      { text: 'IA agentique', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Pour les TPE',
    price: { monthly: 19, yearly: 15 },
    badge: null,
    highlight: false,
    cta: 'Essai gratuit 14 jours',
    ctaStyle: 'secondary',
    features: [
      { text: 'Jusqu\'à 10 utilisateurs', included: true },
      { text: '1 société', included: true },
      { text: 'Saisie des temps illimitée', included: true },
      { text: 'Gestion de projet illimitée', included: true },
      { text: 'CRM complet', included: true },
      { text: 'Facturation & devis', included: true },
      { text: 'Notes de frais', included: true },
      { text: 'Export PDF & Excel', included: true },
      { text: 'Support email', included: true },
      { text: 'Comptabilité', included: false },
      { text: 'IA agentique', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'Pour les PME',
    price: { monthly: 39, yearly: 31 },
    badge: 'Plus populaire',
    highlight: true,
    cta: 'Essai gratuit 14 jours',
    ctaStyle: 'primary',
    features: [
      { text: 'Jusqu\'à 50 utilisateurs', included: true },
      { text: 'Multi-sociétés', included: true },
      { text: 'Tout du plan Starter', included: true },
      { text: 'Comptabilité & FEC', included: true },
      { text: 'Business Intelligence', included: true },
      { text: 'Prévisionnel & trésorerie', included: true },
      { text: 'Rapprochement bancaire', included: true },
      { text: 'Immobilisations', included: true },
      { text: 'Sync SIRH (Lucca)', included: true },
      { text: 'Marketing & campagnes', included: true },
      { text: 'Support prioritaire', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Pour les ETI & groupes',
    price: { monthly: null, yearly: null },
    badge: null,
    highlight: false,
    cta: 'Nous contacter',
    ctaStyle: 'secondary',
    features: [
      { text: 'Utilisateurs illimités', included: true },
      { text: 'Multi-sociétés illimité', included: true },
      { text: 'Tout du plan Business', included: true },
      { text: 'IA agentique (agents autonomes)', included: true },
      { text: 'SSO Microsoft / SAML', included: true },
      { text: 'API complète', included: true },
      { text: 'Workflows d\'approbation', included: true },
      { text: 'Journal d\'audit', included: true },
      { text: 'Onboarding dédié', included: true },
      { text: 'SLA & support dédié', included: true },
      { text: 'Déploiement on-premise possible', included: true },
    ],
  },
]

const FAQ = [
  { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Le changement est effectif immédiatement et la facturation est ajustée au prorata.' },
  { q: 'Y a-t-il un engagement ?', a: 'Non, aucun engagement. Vous pouvez résilier à tout moment. Le plan annuel offre simplement une réduction de 20% mais reste résiliable.' },
  { q: 'Qu\'est-ce qu\'un utilisateur actif ?', a: 'Un utilisateur actif est un utilisateur qui s\'est connecté au moins une fois dans le mois. Les utilisateurs en lecture seule (accès aux rapports, portail factures) sont gratuits.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Vos données sont hébergées en Europe (France/Allemagne) sur des serveurs certifiés. Chiffrement AES-256 au repos et TLS 1.3 en transit. Sauvegardes automatiques quotidiennes.' },
  { q: 'Puis-je importer mes données existantes ?', a: 'Oui, TimeBlast supporte l\'import depuis Excel, CSV et FEC. Notre équipe vous accompagne sur le plan Business et Enterprise.' },
  { q: 'Comment fonctionne la synchronisation SIRH ?', a: 'TimeBlast se connecte à votre SIRH en lecture/écriture via API. Les collaborateurs, absences et notes de frais sont synchronisés automatiquement. Disponible à partir du plan Business.' },
  { q: 'L\'IA agentique, c\'est quoi concrètement ?', a: 'Des agents IA autonomes qui exécutent des tâches métier : relancer les factures impayées, analyser la rentabilité d\'un projet, préparer un reporting. Disponible sur le plan Enterprise.' },
]

const COMPARE_CATEGORIES = [
  {
    name: 'Gestion du temps',
    features: [
      { name: 'Saisie des temps', free: true, starter: true, business: true, enterprise: true },
      { name: 'Planification', free: false, starter: true, business: true, enterprise: true },
      { name: 'Reporting temps', free: false, starter: true, business: true, enterprise: true },
      { name: 'Rentabilité projet', free: false, starter: false, business: true, enterprise: true },
    ],
  },
  {
    name: 'CRM & Commerce',
    features: [
      { name: 'Contacts & entreprises', free: '50', starter: '∞', business: '∞', enterprise: '∞' },
      { name: 'Opportunités', free: false, starter: true, business: true, enterprise: true },
      { name: 'Devis & factures', free: false, starter: true, business: true, enterprise: true },
      { name: 'Produits & abonnements', free: false, starter: true, business: true, enterprise: true },
    ],
  },
  {
    name: 'Finance',
    features: [
      { name: 'Comptabilité & FEC', free: false, starter: false, business: true, enterprise: true },
      { name: 'Business Intelligence', free: false, starter: false, business: true, enterprise: true },
      { name: 'Prévisionnel', free: false, starter: false, business: true, enterprise: true },
      { name: 'Rapprochement bancaire', free: false, starter: false, business: true, enterprise: true },
      { name: 'Immobilisations', free: false, starter: false, business: true, enterprise: true },
    ],
  },
  {
    name: 'Équipe & RH',
    features: [
      { name: 'Collaborateurs', free: '1', starter: '10', business: '50', enterprise: '∞' },
      { name: 'Absences & congés', free: false, starter: true, business: true, enterprise: true },
      { name: 'Notes de frais', free: false, starter: true, business: true, enterprise: true },
      { name: 'Sync SIRH (Lucca)', free: false, starter: false, business: true, enterprise: true },
    ],
  },
  {
    name: 'Administration & sécurité',
    features: [
      { name: 'Multi-sociétés', free: false, starter: false, business: true, enterprise: true },
      { name: 'SSO / SAML', free: false, starter: false, business: false, enterprise: true },
      { name: 'API', free: false, starter: false, business: false, enterprise: true },
      { name: 'Audit & logs', free: false, starter: false, business: false, enterprise: true },
      { name: 'IA agentique', free: false, starter: false, business: false, enterprise: true },
    ],
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const navigate = useNavigate()

  const fmtPrice = (plan) => {
    const p = annual ? plan.price.yearly : plan.price.monthly
    if (p === null) return null
    return p
  }

  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(25,92,130,0.08)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        }}>
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/login#contact')}>
            <img src="/logo-full.svg" alt="TimeBlast" style={{ height: 40 }} />
          </div>

          <div style={{ alignItems: 'center', gap: '2rem', fontSize: '.85rem', fontWeight: 500 }} className="landing-nav-links">
            <a href="/login#comment" style={{ color: S.gray, textDecoration: 'none' }}>Comment ça marche</a>
            <a href="/login#modules" style={{ color: S.gray, textDecoration: 'none' }}>Modules</a>
            <span style={{ color: S.neon, fontWeight: 700, cursor: 'default' }}>Tarifs</span>
            <a href="/facture-electronique" style={{ color: S.gray, textDecoration: 'none', fontWeight: 600 }}>E-Facture 2026</a>
          </div>

          <button className="landing-burger" onClick={() => setMobileMenu(true)}>☰</button>

          <button onClick={() => navigate('/login#contact')} style={{
            padding: '9px 22px', borderRadius: 10, background: S.neon,
            border: 'none', color: '#fff', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(25,92,130,0.3)', transition: 'all .25s',
          }}
          onMouseEnter={e => { e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.5)'; e.target.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)'; e.target.style.transform = 'none' }}>
            Se connecter
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
          <button onClick={() => setMobileMenu(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer' }}>✕</button>
          <a href="/login#comment" style={{ fontSize: '1.2rem', color: S.dark, textDecoration: 'none', fontWeight: 600 }}>Comment ça marche</a>
          <a href="/login#modules" style={{ fontSize: '1.2rem', color: S.dark, textDecoration: 'none', fontWeight: 600 }}>Modules</a>
          <span style={{ fontSize: '1.2rem', color: S.neon, fontWeight: 700 }}>Tarifs</span>
          <a href="/facture-electronique" style={{ fontSize: '1.2rem', color: S.dark, textDecoration: 'none', fontWeight: 600 }}>E-Facture 2026</a>
          <button onClick={() => { setMobileMenu(false); navigate('/login#contact') }} style={{ padding: '12px 32px', borderRadius: 10, background: S.neon, border: 'none', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Se connecter</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: 140, paddingBottom: 40, textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1.5rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: S.dark, lineHeight: 1.15, margin: 0, letterSpacing: '-0.03em' }}>
            Un prix simple.<br />
            <span style={{ color: S.neon }}>Une plateforme complète.</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: S.gray, marginTop: '1rem', lineHeight: 1.6 }}>
            Là où il faut 4 logiciels chez les autres, TimeBlast fait tout en un. Payez un seul outil au lieu de quatre.
          </p>
        </div>

        {/* Toggle Monthly / Annual */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          <span style={{ fontSize: '.9rem', fontWeight: annual ? 500 : 700, color: annual ? S.gray : S.dark }}>Mensuel</span>
          <button onClick={() => setAnnual(!annual)} style={{
            width: 56, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', position: 'relative',
            background: annual ? S.neon : '#cbd5e1', transition: 'background .3s',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 12, background: '#fff',
              position: 'absolute', top: 3,
              left: annual ? 29 : 3, transition: 'left .3s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }} />
          </button>
          <span style={{ fontSize: '.9rem', fontWeight: annual ? 700 : 500, color: annual ? S.dark : S.gray }}>
            Annuel
            <span style={{ marginLeft: 6, fontSize: '.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>-20%</span>
          </span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRICING CARDS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {PLANS.map(plan => {
            const price = fmtPrice(plan)
            return (
              <div key={plan.id} style={{
                background: plan.highlight ? S.neon : '#fff',
                borderRadius: 16,
                border: plan.highlight ? 'none' : '1px solid #e2e8f0',
                padding: '2rem 1.75rem',
                position: 'relative',
                boxShadow: plan.highlight ? '0 20px 60px rgba(25,92,130,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'transform .3s, box-shadow .3s',
                transform: plan.highlight ? 'scale(1.03)' : 'none',
              }}
              onMouseEnter={e => { if (!plan.highlight) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)' } }}
              onMouseLeave={e => { if (!plan.highlight) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' } }}>

                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: '#F8B35A', color: '#fff', fontSize: '.75rem', fontWeight: 700,
                    padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(248,179,90,0.4)',
                  }}>{plan.badge}</div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: plan.highlight ? '#fff' : S.dark }}>{plan.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: plan.highlight ? 'rgba(255,255,255,0.7)' : S.gray }}>{plan.subtitle}</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  {price !== null ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '3rem', fontWeight: 800, color: plan.highlight ? '#fff' : S.dark, letterSpacing: '-0.04em', lineHeight: 1 }}>{price}</span>
                      <span style={{ fontSize: '.95rem', color: plan.highlight ? 'rgba(255,255,255,0.7)' : S.gray, fontWeight: 500 }}>€ /user /mois</span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: S.dark, lineHeight: 1 }}>Sur mesure</span>
                      <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: S.gray }}>Adapté à votre organisation</p>
                    </div>
                  )}
                  {price !== null && price > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: plan.highlight ? 'rgba(255,255,255,0.5)' : S.lightGray }}>
                      {annual ? `${plan.price.monthly}€/mois en mensuel` : `${plan.price.yearly}€/mois en annuel (-20%)`}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => navigate('/login#contact')}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: '.9rem',
                    cursor: 'pointer', transition: 'all .25s', marginBottom: '1.5rem', border: 'none',
                    ...(plan.ctaStyle === 'primary' ? {
                      background: '#fff', color: S.neon,
                      boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
                    } : plan.highlight ? {
                      background: 'rgba(255,255,255,0.15)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)',
                    } : {
                      background: S.bgAlt, color: S.neon,
                      border: `1px solid ${S.neon}20`,
                    }),
                  }}
                  onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.target.style.transform = 'none' }}>
                  {plan.cta}
                </button>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: '.85rem', color: plan.highlight ? (f.included ? '#fff' : 'rgba(255,255,255,0.35)') : (f.included ? S.dark : S.lightGray),
                      textDecoration: f.included ? 'none' : 'line-through',
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.7rem', flexShrink: 0,
                        background: f.included ? (plan.highlight ? 'rgba(255,255,255,0.2)' : '#dcfce7') : (plan.highlight ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                        color: f.included ? (plan.highlight ? '#fff' : '#16a34a') : (plan.highlight ? 'rgba(255,255,255,0.25)' : '#94a3b8'),
                      }}>
                        {f.included ? '✓' : '—'}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          COMPARISON TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: S.bgAlt, padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: S.dark, marginBottom: '3rem', letterSpacing: '-0.02em' }}>
            Comparer les plans en détail
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #e2e8f0', color: S.gray, fontWeight: 600, minWidth: 200 }}></th>
                  {['Découverte', 'Starter', 'Business', 'Enterprise'].map(p => (
                    <th key={p} style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '2px solid #e2e8f0', color: p === 'Business' ? S.neon : S.dark, fontWeight: 700, minWidth: 100 }}>{p}</th>
                  ))}
                </tr>
              </thead>
                {COMPARE_CATEGORIES.map(cat => (
                  <tbody key={cat.name}>
                    <tr>
                      <td colSpan={5} style={{ padding: '16px 16px 8px', fontWeight: 700, color: S.dark, fontSize: '.9rem', borderBottom: '1px solid #e2e8f0' }}>{cat.name}</td>
                    </tr>
                    {cat.features.map((f, i) => (
                      <tr key={f.name} style={{ background: i % 2 === 0 ? '#fff' : S.bgAlt }}>
                        <td style={{ padding: '10px 16px', color: S.gray, borderBottom: '1px solid #f1f5f9' }}>{f.name}</td>
                        {['free', 'starter', 'business', 'enterprise'].map(plan => {
                          const val = f[plan]
                          return (
                            <td key={plan} style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                              {val === true ? <span style={{ color: '#16a34a', fontSize: '1rem' }}>✓</span>
                                : val === false ? <span style={{ color: '#cbd5e1' }}>—</span>
                                : <span style={{ color: S.dark, fontWeight: 600 }}>{val}</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
            </table>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '4rem 1.5rem 5rem', background: S.bgAlt }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: S.dark, marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            Questions fréquentes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 12,
                border: '1px solid #e2e8f0',
                overflow: 'hidden', transition: 'box-shadow .2s',
                boxShadow: openFaq === i ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', textAlign: 'left', padding: '1rem 1.25rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '.9rem', fontWeight: 600, color: S.dark,
                }}>
                  {item.q}
                  <span style={{
                    fontSize: '1.2rem', color: S.gray, transition: 'transform .3s',
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    flexShrink: 0, marginLeft: 12,
                  }}>▾</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 1.25rem 1rem', fontSize: '.85rem', color: S.gray, lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', background: '#fff' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: S.dark, margin: 0, letterSpacing: '-0.02em' }}>
          Prêt à simplifier votre gestion ?
        </h2>
        <p style={{ color: S.gray, fontSize: '1rem', marginTop: '.75rem' }}>
          Essayez gratuitement pendant 14 jours. Aucune carte bancaire requise.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/login#contact')} style={{
            padding: '14px 36px', borderRadius: 12, background: S.neon, border: 'none',
            color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(25,92,130,0.3)', transition: 'all .25s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(25,92,130,0.4)' }}
          onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(25,92,130,0.3)' }}>
            Commencer gratuitement
          </button>
          <button onClick={() => window.location.href = 'mailto:contact@timeblast.ai'} style={{
            padding: '14px 36px', borderRadius: 12, background: 'transparent',
            border: `2px solid ${S.neon}`, color: S.neon, fontWeight: 700,
            fontSize: '1rem', cursor: 'pointer', transition: 'all .25s',
          }}
          onMouseEnter={e => { e.target.style.background = S.neon + '08' }}
          onMouseLeave={e => { e.target.style.background = 'transparent' }}>
            Demander une démo
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{ padding: '2rem 1.5rem', background: S.dark, textAlign: 'center' }}>
        <img src="/logo-full-white.svg" alt="TimeBlast" style={{ height: 28, opacity: .7, marginBottom: '1rem' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.8rem', margin: 0 }}>
          © {new Date().getFullYear()} TimeBlast.ai — Groupe SRA. Tous droits réservés.
        </p>
      </footer>
    </div>
  )
}
