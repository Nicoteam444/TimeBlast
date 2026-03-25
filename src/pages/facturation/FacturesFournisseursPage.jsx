import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

// ── Helpers ───────────────────────────────────────────────────
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

// ── Prévisualisation A4 ───────────────────────────────────────
const A4_W = 794, A4_H = 1123, PAD = 20

function AchatPreview({ fac }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const w = el.offsetWidth - PAD * 2
      const h = el.offsetHeight - PAD * 2
      setScale(Math.min(w / A4_W, h / A4_H))
    }
    compute()
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!fac) return (
    <div ref={containerRef} className="fac-a4-container">
      <div className="fac-a4-empty-inner">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
        <div>Sélectionnez une facture<br />pour la prévisualiser</div>
      </div>
    </div>
  )

  const lignes = fac.lignes || []
  const tvaMap = {}
  for (const l of lignes) {
    const t = (l.qte || 0) * (l.pu || 0)
    tvaMap[l.tva] = (tvaMap[l.tva] || 0) + t * ((l.tva || 0) / 100)
  }
  const sm = statutMeta(fac.statut)

  return (
    <div ref={containerRef} className="fac-a4-container">
      <div className="fac-a4-wrap" style={{ width: A4_W * scale, height: A4_H * scale }}>
        <div className="fac-a4-paper" style={{ width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>

          {/* En-tête */}
          <div className="fac-p-header">
            <div className="fac-p-emetteur">
              <div className="fac-p-em-name">{fac.fournisseur}</div>
              <div className="fac-p-em-detail">Facture fournisseur</div>
            </div>
            <div className="fac-p-facture-box">
              <div className="fac-p-facture-title">FACTURE</div>
              <div className="fac-p-facture-num">{fac.num_facture}</div>
              <div className="fac-p-facture-meta"><span>Reçue le</span><strong>{new Date(fac.date_reception).toLocaleDateString('fr-FR')}</strong></div>
              <div className="fac-p-facture-meta"><span>Échéance</span><strong>{new Date(fac.date_echeance).toLocaleDateString('fr-FR')}</strong></div>
              <div style={{ marginTop: '.5rem', textAlign: 'right' }}>
                <span style={{ background: sm.bg, color: sm.color, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{sm.label}</span>
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <div className="fac-p-destinataire">
            <div className="fac-p-dest-label">Facturé à</div>
            <div className="fac-p-dest-name">Votre entreprise</div>
          </div>

          {/* Objet */}
          <div className="fac-p-objet">
            <strong>Objet :</strong> {fac.objet}
          </div>

          {/* Table lignes */}
          <table className="fac-p-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>DESCRIPTION</th>
                <th>QTÉ</th>
                <th>P.U. HT</th>
                <th>TVA</th>
                <th>TOTAL HT</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>{l.desc}</td>
                  <td>{l.qte}</td>
                  <td>{fmtE(l.pu)}</td>
                  <td>{l.tva}%</td>
                  <td>{fmtE(l.qte * l.pu)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="fac-p-totaux">
            <div className="fac-p-totaux-row"><span>Total HT</span><span>{fmtE(fac.total_ht)}</span></div>
            {Object.entries(tvaMap).map(([rate, amount]) =>
              <div key={rate} className="fac-p-totaux-row"><span>TVA {rate}%</span><span>{fmtE(amount)}</span></div>
            )}
            <div className="fac-p-totaux-row fac-p-ttc"><span>TOTAL TTC</span><span>{fmtE(fac.total_ttc)}</span></div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Demo data ──
const DEMO = [
  { id: '1', num_facture: 'FOURN-2026-001', fournisseur: 'Office Depot', date_reception: '2026-03-15', date_echeance: '2026-04-15', total_ht: 1250.00, total_ttc: 1500.00, statut: 'recue', objet: 'Fournitures bureau Q1', lignes: [{ desc: 'Papier A4 x50', qte: 50, pu: 5.00, tva: 20 }, { desc: 'Toner imprimante', qte: 10, pu: 75.00, tva: 20 }] },
  { id: '2', num_facture: 'FOURN-2026-002', fournisseur: 'OVH Cloud', date_reception: '2026-03-10', date_echeance: '2026-04-10', total_ht: 89.99, total_ttc: 107.99, statut: 'validee', objet: 'Hébergement VPS mars', lignes: [{ desc: 'VPS Cloud Pro', qte: 1, pu: 89.99, tva: 20 }] },
  { id: '3', num_facture: 'FOURN-2026-003', fournisseur: 'Sage Logiciels', date_reception: '2026-03-01', date_echeance: '2026-03-31', total_ht: 450.00, total_ttc: 540.00, statut: 'payee', objet: 'Licence Sage 100 mars', lignes: [{ desc: 'Licence Sage 100c', qte: 1, pu: 450.00, tva: 20 }] },
  { id: '4', num_facture: 'FOURN-2026-004', fournisseur: 'Amazon Business', date_reception: '2026-02-28', date_echeance: '2026-03-28', total_ht: 234.50, total_ttc: 281.40, statut: 'a_payer', objet: 'Matériel informatique', lignes: [{ desc: 'Clavier mécanique', qte: 2, pu: 65.00, tva: 20 }, { desc: 'Souris ergonomique', qte: 3, pu: 34.83, tva: 20 }] },
  { id: '5', num_facture: 'FOURN-2026-005', fournisseur: 'EDF Pro', date_reception: '2026-02-15', date_echeance: '2026-03-15', total_ht: 876.00, total_ttc: 1051.20, statut: 'contestee', objet: 'Électricité février', lignes: [{ desc: 'Consommation électrique', qte: 1, pu: 876.00, tva: 20 }] },
]

// ── Page principale ───────────────────────────────────────────
export default function FacturesFournisseursPage() {
  const { selectedSociete } = useSociete()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  useEffect(() => {
    setFactures(DEMO)
    setSelected(DEMO[0])
    setLoading(false)
  }, [selectedSociete?.id])

  const filtered = useMemo(() => {
    let rows = factures
    if (filterStatut) rows = rows.filter(f => f.statut === filterStatut)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(f => f.num_facture?.toLowerCase().includes(q) || f.fournisseur?.toLowerCase().includes(q) || f.objet?.toLowerCase().includes(q))
    }
    return rows
  }, [factures, search, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date_reception', 'desc')

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paged = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totauxStatuts = useMemo(() => {
    const r = {}
    for (const f of factures) r[f.statut] = (r[f.statut] || 0) + (f.total_ttc || 0)
    return r
  }, [factures])

  return (
    <div className="fac-page">

      {/* Titre de page */}
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1>Achats</h1>
          <p>{factures.length} facture{factures.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <button className="btn-primary">+ Importer une facture</button>
      </div>

      {/* KPIs — pleine largeur */}
      <div className="fac-kpi-bar" style={{ flexShrink: 0 }}>
        {STATUTS.map(s => (
          <div key={s.id} className="fac-kpi-chip" style={{ borderColor: s.color }}>
            <span className="fac-kpi-label" style={{ color: s.color }}>{s.label}</span>
            <span className="fac-kpi-val">{fmtE(totauxStatuts[s.id] || 0)}</span>
          </div>
        ))}
      </div>

      <div className="fac-main-layout">

        {/* ── COLONNE GAUCHE : toolbar + tableau ── */}
        <div className="fac-left-col">

          {/* Toolbar */}
          <div className="table-toolbar">
            <input className="table-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher…" />
            <select className="table-pagesize" value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1) }}>
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Tableau */}
          <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="users-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <SortableHeader label="N°" field="num_facture" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Fournisseur" field="fournisseur" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Objet" field="objet" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Reçue le" field="date_reception" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Échéance" field="date_echeance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <th>Statut</th>
                  <SortableHeader label="Total TTC" field="total_ttc" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><Spinner /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune facture</td></tr>
                ) : paged.map(f => {
                  const sm = statutMeta(f.statut)
                  const isSelected = selected?.id === f.id
                  return (
                    <tr key={f.id} className={`users-table-row ${isSelected ? 'fac-row--selected' : ''}`}
                      onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{f.num_facture}</td>
                      <td style={{ fontWeight: 500 }}>{f.fournisseur}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{f.objet}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(f.date_reception).toLocaleDateString('fr-FR')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(f.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td><span className="fac-statut-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtE(f.total_ttc)}</td>
                      <td>
                        <button className="btn-icon" title="Valider" onClick={e => { e.stopPropagation() }}>✅</button>
                        <button className="btn-icon" title="Supprimer" onClick={e => { e.stopPropagation() }}>🗑</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span>Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          )}
        </div>

        {/* ── COLONNE DROITE : prévisualisation ── */}
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
    </div>
  )
}
