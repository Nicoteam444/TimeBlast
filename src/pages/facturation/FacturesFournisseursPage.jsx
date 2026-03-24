import { useState, useEffect, useMemo, useRef } from 'react'
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
function statutMeta(s) { return STATUTS.find(x => x.id === s) || STATUTS[0] }

function sourceIcon(src) {
  switch (src) {
    case 'email': return '📧'
    case 'portail': return '🔗'
    case 'chorus_pro': return '🏛️'
    default: return '📥'
  }
}

// Demo data
const DEMO = [
  { id: '1', num_facture: 'FOURN-2026-001', fournisseur: 'Office Depot', date_reception: '2026-03-15', date_echeance: '2026-04-15', total_ht: 1250.00, total_ttc: 1500.00, statut: 'recue', source: 'email', objet: 'Fournitures bureau Q1', lignes: [{ desc: 'Papier A4 x50', qte: 50, pu: 5.00, tva: 20 }, { desc: 'Toner imprimante', qte: 10, pu: 75.00, tva: 20 }] },
  { id: '2', num_facture: 'FOURN-2026-002', fournisseur: 'OVH Cloud', date_reception: '2026-03-10', date_echeance: '2026-04-10', total_ht: 89.99, total_ttc: 107.99, statut: 'validee', source: 'portail', objet: 'Hébergement VPS mars', lignes: [{ desc: 'VPS Cloud Pro', qte: 1, pu: 89.99, tva: 20 }] },
  { id: '3', num_facture: 'FOURN-2026-003', fournisseur: 'Sage Logiciels', date_reception: '2026-03-01', date_echeance: '2026-03-31', total_ht: 450.00, total_ttc: 540.00, statut: 'payee', source: 'chorus_pro', objet: 'Licence Sage 100 mars', lignes: [{ desc: 'Licence Sage 100c', qte: 1, pu: 450.00, tva: 20 }] },
  { id: '4', num_facture: 'FOURN-2026-004', fournisseur: 'Amazon Business', date_reception: '2026-02-28', date_echeance: '2026-03-28', total_ht: 234.50, total_ttc: 281.40, statut: 'a_payer', source: 'email', objet: 'Matériel informatique', lignes: [{ desc: 'Clavier mécanique', qte: 2, pu: 65.00, tva: 20 }, { desc: 'Souris ergonomique', qte: 3, pu: 34.83, tva: 20 }] },
  { id: '5', num_facture: 'FOURN-2026-005', fournisseur: 'EDF Pro', date_reception: '2026-02-15', date_echeance: '2026-03-15', total_ht: 876.00, total_ttc: 1051.20, statut: 'contestee', source: 'portail', objet: 'Électricité février', lignes: [{ desc: 'Consommation électrique', qte: 1, pu: 876.00, tva: 20 }] },
]

// ── Preview A4-like ──
function AchatPreview({ fac }) {
  if (!fac) return (
    <div className="fac-a4-container">
      <div className="fac-a4-empty-inner">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
        <div>Sélectionnez une facture<br />pour la prévisualiser</div>
      </div>
    </div>
  )

  const lignes = fac.lignes || []
  const sm = statutMeta(fac.statut)
  const totalHT = lignes.reduce((s, l) => s + (l.qte * l.pu), 0)
  const totalTVA = lignes.reduce((s, l) => s + (l.qte * l.pu * (l.tva || 0) / 100), 0)

  return (
    <div style={{ padding: '2rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>{fac.fournisseur}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
            {sourceIcon(fac.source)} Via {fac.source === 'email' ? 'Email' : fac.source === 'portail' ? 'Portail' : 'Chorus Pro'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>FACTURE</div>
          <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{fac.num_facture}</div>
          <div style={{ marginTop: '.5rem' }}>
            <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 6, fontSize: '.78rem', fontWeight: 700 }}>{sm.label}</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Objet</div>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{fac.objet}</div>
        </div>
        <div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Reçue le</div>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{new Date(fac.date_reception).toLocaleDateString('fr-FR')}</div>
        </div>
        <div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Échéance</div>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{new Date(fac.date_echeance).toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      {/* Lignes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '.6rem .5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>Qté</th>
            <th style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>P.U. HT</th>
            <th style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>TVA</th>
            <th style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '.6rem .5rem', fontSize: '.88rem' }}>{l.desc}</td>
              <td style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.88rem' }}>{l.qte}</td>
              <td style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.88rem' }}>{fmtE(l.pu)}</td>
              <td style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.88rem' }}>{l.tva}%</td>
              <td style={{ textAlign: 'right', padding: '.6rem .5rem', fontSize: '.88rem', fontWeight: 600 }}>{fmtE(l.qte * l.pu)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>Total HT</span>
            <span style={{ fontWeight: 600 }}>{fmtE(totalHT)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>TVA</span>
            <span style={{ fontWeight: 600 }}>{fmtE(totalTVA)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.6rem 0', fontWeight: 700, fontSize: '1.1rem' }}>
            <span style={{ color: 'var(--text)' }}>Total TTC</span>
            <span style={{ color: 'var(--accent)' }}>{fmtE(fac.total_ttc)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn-primary" style={{ fontSize: '.82rem' }}>✅ Valider</button>
        <button className="btn-secondary" style={{ fontSize: '.82rem' }}>💳 Marquer payée</button>
        <button className="btn-secondary" style={{ fontSize: '.82rem' }}>📊 Comptabiliser</button>
        <button className="btn-secondary" style={{ fontSize: '.82rem', color: '#ef4444' }}>❌ Contester</button>
      </div>
    </div>
  )
}

// ── Page principale ──
export default function FacturesFournisseursPage() {
  const { selectedSociete } = useSociete()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [sortCol, setSortCol] = useState('date_reception')
  const [sortDir, setSortDir] = useState('desc')
  const [showPortalConnect, setShowPortalConnect] = useState(false)

  useEffect(() => {
    setFactures(DEMO)
    setSelected(DEMO[0])
    setLoading(false)
  }, [selectedSociete?.id])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = factures
    if (filterStatut) rows = rows.filter(f => f.statut === filterStatut)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(f => f.num_facture?.toLowerCase().includes(q) || f.fournisseur?.toLowerCase().includes(q) || f.objet?.toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      let va = a[sortCol] || '', vb = b[sortCol] || ''
      if (sortCol === 'total_ttc') { va = +va; vb = +vb }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return rows
  }, [factures, search, filterStatut, sortCol, sortDir])

  const totauxStatuts = useMemo(() => {
    const r = {}
    for (const f of factures) r[f.statut] = (r[f.statut] || 0) + (f.total_ttc || 0)
    return r
  }, [factures])

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="sort-icon">↕</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="fac-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1>Achats</h1>
          <p>{factures.length} facture{factures.length !== 1 ? 's' : ''} reçue{factures.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn-secondary" onClick={() => setShowPortalConnect(true)}>🔗 Connecter un portail</button>
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

      <div className="fac-main-layout">
        {/* Left column — Liste */}
        <div className="fac-left-col">
          <div className="fac-toolbar" style={{ flexShrink: 0 }}>
            <input className="fac-search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="fac-filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="fac-left-scroll">
            <table className="fac-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('num_facture')}>N° Facture <SortIcon col="num_facture" /></th>
                  <th onClick={() => toggleSort('fournisseur')}>Fournisseur <SortIcon col="fournisseur" /></th>
                  <th onClick={() => toggleSort('date_reception')}>Reçue le <SortIcon col="date_reception" /></th>
                  <th onClick={() => toggleSort('date_echeance')}>Échéance <SortIcon col="date_echeance" /></th>
                  <th onClick={() => toggleSort('total_ttc')} style={{ textAlign: 'right' }}>Total TTC <SortIcon col="total_ttc" /></th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune facture</td></tr>
                ) : filtered.map(f => {
                  const sm = statutMeta(f.statut)
                  return (
                    <tr key={f.id} className={`fac-row ${selected?.id === f.id ? 'fac-row--selected' : ''}`} onClick={() => setSelected(f)}>
                      <td style={{ fontWeight: 600 }}>{f.num_facture}</td>
                      <td>{f.fournisseur}</td>
                      <td>{new Date(f.date_reception).toLocaleDateString('fr-FR')}</td>
                      <td>{new Date(f.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmtE(f.total_ttc)}</td>
                      <td>
                        <span style={{ background: sm.bg, color: sm.color, padding: '2px 8px', borderRadius: 4, fontSize: '.75rem', fontWeight: 700 }}>{sm.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — Preview */}
        <div className="fac-right-col">
          <div className="fac-preview-header">
            <span className="fac-preview-label">Prévisualisation</span>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {selected && <button className="btn-secondary" style={{ fontSize: '.78rem' }}>📄 PDF</button>}
              {selected && <button className="btn-primary" style={{ fontSize: '.78rem' }}>✅ Valider</button>}
            </div>
          </div>
          <div className="fac-right-scroll">
            <AchatPreview fac={selected} />
          </div>
        </div>
      </div>

      {/* Modal connexion portail */}
      {showPortalConnect && (
        <div className="landing-modal-overlay" onClick={() => setShowPortalConnect(false)}>
          <div className="landing-login-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowPortalConnect(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem' }}>🔗</span>
              <h2 style={{ margin: '.5rem 0 0' }}>Connecter un portail fournisseur</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>Recevez automatiquement les factures</p>
            </div>
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
                }}>
                  <div style={{ fontSize: '1.5rem' }}>{m.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{m.label}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
