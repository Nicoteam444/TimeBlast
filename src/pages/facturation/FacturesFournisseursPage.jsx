import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}

const STATUTS = [
  { id: 'recue',      label: 'Reçue',       color: '#1D9BF0', bg: '#e8f4fd' },
  { id: 'validee',    label: 'Validée',     color: '#22c55e', bg: '#f0fdf4' },
  { id: 'a_payer',    label: 'À payer',     color: '#f59e0b', bg: '#fffbeb' },
  { id: 'payee',      label: 'Payée',       color: '#195C82', bg: '#e3f0f7' },
  { id: 'contestee',  label: 'Contestée',   color: '#ef4444', bg: '#fef2f2' },
]

export default function FacturesFournisseursPage() {
  const { selectedSociete } = useSociete()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [showPortalConnect, setShowPortalConnect] = useState(false)
  const [portalUrl, setPortalUrl] = useState('')
  const [portalStatus, setPortalStatus] = useState(null)

  // Simulated supplier invoices (in production, fetched from DB)
  useEffect(() => {
    if (!selectedSociete?.id) { setFactures([]); setLoading(false); return }
    setLoading(true)
    // For now, show demo data — in production this would be from a supplier_invoices table
    const demoFactures = [
      { id: '1', num_facture: 'FOURN-2026-001', fournisseur: 'Office Depot', date_reception: '2026-03-15', date_echeance: '2026-04-15', total_ht: 1250.00, total_ttc: 1500.00, statut: 'recue', source: 'email' },
      { id: '2', num_facture: 'FOURN-2026-002', fournisseur: 'OVH Cloud', date_reception: '2026-03-10', date_echeance: '2026-04-10', total_ht: 89.99, total_ttc: 107.99, statut: 'validee', source: 'portail' },
      { id: '3', num_facture: 'FOURN-2026-003', fournisseur: 'Sage Logiciels', date_reception: '2026-03-01', date_echeance: '2026-03-31', total_ht: 450.00, total_ttc: 540.00, statut: 'payee', source: 'chorus_pro' },
      { id: '4', num_facture: 'FOURN-2026-004', fournisseur: 'Amazon Business', date_reception: '2026-02-28', date_echeance: '2026-03-28', total_ht: 234.50, total_ttc: 281.40, statut: 'a_payer', source: 'email' },
      { id: '5', num_facture: 'FOURN-2026-005', fournisseur: 'EDF Pro', date_reception: '2026-02-15', date_echeance: '2026-03-15', total_ht: 876.00, total_ttc: 1051.20, statut: 'contestee', source: 'portail' },
    ]
    setFactures(demoFactures)
    setLoading(false)
    if (demoFactures.length > 0) setSelected(demoFactures[0])
  }, [selectedSociete?.id])

  const filtered = factures.filter(f => {
    if (filterStatut && f.statut !== filterStatut) return false
    if (search) {
      const q = search.toLowerCase()
      return f.num_facture?.toLowerCase().includes(q) || f.fournisseur?.toLowerCase().includes(q)
    }
    return true
  })

  const totauxStatuts = {}
  for (const f of factures) totauxStatuts[f.statut] = (totauxStatuts[f.statut] || 0) + (f.total_ttc || 0)

  function statutMeta(s) { return STATUTS.find(x => x.id === s) || STATUTS[0] }

  function sourceIcon(src) {
    switch (src) {
      case 'email': return '📧'
      case 'portail': return '🔗'
      case 'chorus_pro': return '🏛️'
      case 'xml': return '📄'
      default: return '📥'
    }
  }

  function handleConnectPortal() {
    if (!portalUrl.trim()) return
    setPortalStatus('connecting')
    // Simulate portal connection
    setTimeout(() => {
      setPortalStatus('connected')
      setTimeout(() => {
        setShowPortalConnect(false)
        setPortalStatus(null)
      }, 2000)
    }, 1500)
  }

  return (
    <div className="fac-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1>📥 Achats</h1>
          <p>{factures.length} facture{factures.length !== 1 ? 's' : ''} reçue{factures.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn-secondary" onClick={() => setShowPortalConnect(true)}>
            🔗 Connecter un portail fournisseur
          </button>
          <button className="btn-primary">+ Importer une facture</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="fac-kpi-bar" style={{ flexShrink: 0 }}>
        {STATUTS.map(s => (
          <div key={s.id} className="fac-kpi-chip" style={{ borderColor: s.color }}>
            <span className="fac-kpi-label" style={{ color: s.color }}>{s.label}</span>
            <span className="fac-kpi-val">{fmtE(totauxStatuts[s.id] || 0)}</span>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="fac-main-layout">
        {/* Left: Liste des factures */}
        <div className="fac-left-col">
          {/* Filtres */}
          <div className="fac-toolbar" style={{ flexShrink: 0 }}>
            <input
              className="fac-search"
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="fac-filter-select"
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="fac-left-scroll">
            <table className="fac-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>N° Facture</th>
                  <th>Fournisseur</th>
                  <th>Reçu le</th>
                  <th>Échéance</th>
                  <th style={{ textAlign: 'right' }}>Total TTC</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune facture fournisseur</td></tr>
                ) : filtered.map(f => {
                  const sm = statutMeta(f.statut)
                  return (
                    <tr
                      key={f.id}
                      className={`fac-row ${selected?.id === f.id ? 'fac-row--selected' : ''}`}
                      onClick={() => setSelected(f)}
                    >
                      <td style={{ textAlign: 'center', fontSize: '1.1rem' }} title={f.source}>
                        {sourceIcon(f.source)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{f.num_facture}</td>
                      <td>{f.fournisseur}</td>
                      <td>{new Date(f.date_reception).toLocaleDateString('fr-FR')}</td>
                      <td>{new Date(f.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmtE(f.total_ttc)}</td>
                      <td>
                        <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 6, fontSize: '.78rem', fontWeight: 600 }}>
                          {sm.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Détail */}
        <div className="fac-right-col">
          <div className="fac-preview-header">
            <span className="fac-preview-label">Détail facture fournisseur</span>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {selected && <button className="btn-secondary" style={{ fontSize: '.78rem' }}>✅ Valider</button>}
              {selected && <button className="btn-primary" style={{ fontSize: '.78rem' }}>💳 Marquer payée</button>}
            </div>
          </div>
          <div className="fac-right-scroll">
            {!selected ? (
              <div className="fac-a4-container">
                <div className="fac-a4-empty-inner">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
                  <div>Sélectionnez une facture<br />pour voir les détails</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem' }}>
                {/* Fournisseur info */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h2 style={{ margin: 0, color: 'var(--text)' }}>{selected.fournisseur}</h2>
                      <p style={{ margin: '.25rem 0 0', color: 'var(--text-muted)', fontSize: '.9rem' }}>
                        {sourceIcon(selected.source)} Reçue via {selected.source === 'email' ? 'Email' : selected.source === 'portail' ? 'Portail fournisseur' : selected.source === 'chorus_pro' ? 'Chorus Pro' : 'Import'}
                      </p>
                    </div>
                    <span style={{
                      background: statutMeta(selected.statut).bg,
                      color: statutMeta(selected.statut).color,
                      padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: '.85rem'
                    }}>
                      {statutMeta(selected.statut).label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>N° Facture</div>
                      <div style={{ fontWeight: 600 }}>{selected.num_facture}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Date de réception</div>
                      <div style={{ fontWeight: 600 }}>{new Date(selected.date_reception).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Échéance</div>
                      <div style={{ fontWeight: 600 }}>{new Date(selected.date_echeance).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>

                {/* Montants */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>💰 Montants</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Total HT</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{fmtE(selected.total_ht)}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--accent-light, #e8f4fd)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '.8rem', color: 'var(--accent)' }}>Total TTC</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{fmtE(selected.total_ttc)}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>⚡ Actions rapides</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <button className="btn-secondary" style={{ padding: '.75rem', borderRadius: 8 }}>📄 Voir le PDF original</button>
                    <button className="btn-secondary" style={{ padding: '.75rem', borderRadius: 8 }}>📊 Comptabiliser</button>
                    <button className="btn-secondary" style={{ padding: '.75rem', borderRadius: 8 }}>❌ Contester</button>
                    <button className="btn-primary" style={{ padding: '.75rem', borderRadius: 8 }}>💳 Programmer le paiement</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal connexion portail fournisseur */}
      {showPortalConnect && (
        <div className="landing-modal-overlay" onClick={() => setShowPortalConnect(false)}>
          <div className="landing-login-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowPortalConnect(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem' }}>🔗</span>
              <h2 style={{ margin: '.5rem 0 0' }}>Connecter un portail fournisseur</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', margin: '.5rem 0 0' }}>
                Recevez automatiquement les factures de vos fournisseurs
              </p>
            </div>

            {portalStatus === 'connected' ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f0fdf4', borderRadius: 12 }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ color: '#16a34a' }}>Portail connecté avec succès !</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>Les factures seront synchronisées automatiquement.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600, fontSize: '.9rem' }}>
                    URL du portail fournisseur
                  </label>
                  <input
                    type="url"
                    value={portalUrl}
                    onChange={e => setPortalUrl(e.target.value)}
                    placeholder="https://portail.fournisseur.com/api"
                    style={{
                      width: '100%', padding: '.75rem', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: '.9rem', fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600, fontSize: '.9rem' }}>
                    Méthode de connexion
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    {[
                      { icon: '🏛️', label: 'Chorus Pro', desc: 'Portail de l\'État' },
                      { icon: '📧', label: 'Email', desc: 'Réception par email' },
                      { icon: '🔗', label: 'API REST', desc: 'Connexion directe' },
                      { icon: '📄', label: 'Import XML', desc: 'Upload manuel' },
                    ].map((m, i) => (
                      <div key={i} style={{
                        padding: '.75rem', border: '1px solid var(--border)',
                        borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                        transition: 'all .2s',
                      }}>
                        <div style={{ fontSize: '1.5rem' }}>{m.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{m.label}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '.75rem' }}
                  onClick={handleConnectPortal}
                  disabled={portalStatus === 'connecting'}
                >
                  {portalStatus === 'connecting' ? '⏳ Connexion en cours...' : '🔗 Connecter le portail'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
