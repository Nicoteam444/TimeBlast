import { useState, useEffect, useMemo } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { supabase } from '../../lib/supabase'
import { useDemo } from '../../contexts/DemoContext'
import { DEMO_IMPORTS, DEMO_ECRITURES } from '../../data/demoData'
import Spinner from '../../components/Spinner'

function fmtNum(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}

export default function ComptaEcrituresPage() {
  const navigate = useEnvNavigate()
  const { isDemoMode } = useDemo()
  const [imports, setImports] = useState([])
  const [selectedImportId, setSelectedImportId] = useState(null)
  const [ecritures, setEcritures] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingImports, setLoadingImports] = useState(true)

  const [filter, setFilter] = useState('')
  const [filterJournal, setFilterJournal] = useState('')
  const [filterCompte, setFilterCompte] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Charger la liste des imports
  useEffect(() => {
    if (isDemoMode) {
      setImports(DEMO_IMPORTS)
      setSelectedImportId(DEMO_IMPORTS[0].id)
      setLoadingImports(false)
      return
    }
    supabase.from('fec_imports').select('id, created_at, meta').order('created_at', { ascending: false }).then(({ data }) => {
        const parsed = (data || []).map(i => {
          let m = {}
          try { m = JSON.parse(i.meta || '{}') } catch {}
          return { ...i, ...m }
        })
        setImports(parsed)
        if (parsed.length > 0) setSelectedImportId(parsed[0].id)
        setLoadingImports(false)
      })
  }, [isDemoMode])

  // Charger les écritures de l'import sélectionné
  useEffect(() => {
    if (!selectedImportId) return
    setLoading(true)
    setPage(1)
    setFilter('')
    setFilterJournal('')
    setFilterCompte('')

    if (isDemoMode) {
      const rows = (DEMO_ECRITURES[selectedImportId] || []).slice()
      rows.sort((a, b) => (a.ecriture_date || '').localeCompare(b.ecriture_date || '') || (a.ecriture_num || '').localeCompare(b.ecriture_num || ''))
      setEcritures(rows)
      setLoading(false)
      return
    }

    supabase.from('fec_ecritures').select('id, import_id, data').eq('import_id', selectedImportId).then(({ data }) => {
        const parsed = (data || []).map(r => {
          let d = {}
          try { d = JSON.parse(r.data || '{}') } catch {}
          return { id: r.id, import_id: r.import_id, ...d }
        })
        parsed.sort((a, b) => (a.ecriture_date || '').localeCompare(b.ecriture_date || '') || (a.ecriture_num || '').localeCompare(b.ecriture_num || ''))
        setEcritures(parsed)
        setLoading(false)
      })
  }, [selectedImportId, isDemoMode])

  const selectedImport = imports.find(i => i.id === selectedImportId)

  const journals = useMemo(() =>
    [...new Set(ecritures.map(e => e.journal_code).filter(Boolean))].sort()
  , [ecritures])

  const filtered = useMemo(() => {
    let rows = ecritures
    if (filterJournal) rows = rows.filter(r => r.journal_code === filterJournal)
    if (filterCompte)  rows = rows.filter(r => r.compte_num?.startsWith(filterCompte))
    if (filter) {
      const q = filter.toLowerCase()
      rows = rows.filter(r =>
        r.compte_num?.toLowerCase().includes(q) ||
        r.compte_lib?.toLowerCase().includes(q) ||
        r.ecriture_lib?.toLowerCase().includes(q) ||
        r.ecriture_num?.toLowerCase().includes(q) ||
        r.piece_ref?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [ecritures, filter, filterJournal, filterCompte])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)
  const sumDebit   = filtered.reduce((s, r) => s + (r.debit  || 0), 0)
  const sumCredit  = filtered.reduce((s, r) => s + (r.credit || 0), 0)
  const balanced   = Math.abs(sumDebit - sumCredit) < 0.01

  if (loadingImports) return <div className="admin-page"><Spinner /></div>

  if (imports.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1>Écritures comptables</h1>
          <button className="btn-secondary" onClick={() => navigate('/finance/comptabilite')}>← Retour</button>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📂</p>
          <p style={{ marginBottom: '1.5rem' }}>Aucun fichier FEC importé</p>
          <button className="btn-primary" onClick={() => navigate('/finance/comptabilite/import')}>
            Importer un FEC →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Écritures comptables</h1>
          {selectedImport && (
            <p>{selectedImport.societe} · Exercice {selectedImport.exercice} · {selectedImport.nb_lignes?.toLocaleString('fr-FR')} lignes</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/finance/comptabilite/import')}>+ Importer</button>
          <button className="btn-secondary" onClick={() => navigate('/finance/comptabilite')}>← Retour</button>
        </div>
      </div>

      {/* Sélecteur d'import */}
      <div style={{ marginBottom: '1rem' }}>
        <select
          className="table-pagesize"
          style={{ minWidth: 320 }}
          value={selectedImportId || ''}
          onChange={e => setSelectedImportId(e.target.value)}
        >
          {imports.map(i => (
            <option key={i.id} value={i.id}>
              {i.societe} — {i.exercice} · {i.nb_lignes?.toLocaleString('fr-FR')} lignes · {new Date(i.created_at).toLocaleDateString('fr-FR')}
            </option>
          ))}
        </select>
      </div>

      {/* Barre de filtres */}
      <div className="table-toolbar">
        <input
          className="table-search"
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1) }}
          placeholder="Compte, libellé, pièce…"
        />
        <select className="table-pagesize" value={filterJournal} onChange={e => { setFilterJournal(e.target.value); setPage(1) }}>
          <option value="">Tous journaux</option>
          {journals.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <input
          className="table-search"
          value={filterCompte}
          onChange={e => { setFilterCompte(e.target.value); setPage(1) }}
          placeholder="Début compte (ex: 4)"
          style={{ width: 140 }}
        />
        <select className="table-pagesize" value={pageSize} onChange={e => { setPageSize(+e.target.value); setPage(1) }}>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>

      {/* Bande totaux */}
      {!loading && filtered.length > 0 && (
        <div className="fec-totals">
          <span style={{ fontWeight: 600 }}>{filtered.length.toLocaleString('fr-FR')} écritures</span>
          <span>Débit : <strong>{fmtNum(sumDebit)} €</strong></span>
          <span>Crédit : <strong>{fmtNum(sumCredit)} €</strong></span>
          <span style={{ color: balanced ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {balanced ? '✓ Équilibrée' : `Écart : ${fmtNum(Math.abs(sumDebit - sumCredit))} €`}
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '.8rem' }}>
            <thead>
              <tr className="data-table-header">
                <th>Journal</th>
                <th>N° écriture</th>
                <th>Date</th>
                <th>Compte</th>
                <th>Libellé compte</th>
                <th>Libellé écriture</th>
                <th>Pièce</th>
                <th style={{ textAlign: 'right' }}>Débit</th>
                <th style={{ textAlign: 'right' }}>Crédit</th>
                <th>Let.</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => (
                <tr key={r.id} className="data-table-row">
                  <td><span className="fec-journal-badge">{r.journal_code}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{r.ecriture_num}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.ecriture_date}</td>
                  <td><strong>{r.compte_num}</strong></td>
                  <td>{r.compte_lib}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.ecriture_lib}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{r.piece_ref}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.debit > 0 ? '#1a5c82' : '#cbd5e1' }}>
                    {r.debit > 0 ? fmtNum(r.debit) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.credit > 0 ? '#16a34a' : '#cbd5e1' }}>
                    {r.credit > 0 ? fmtNum(r.credit) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{r.ecriture_let}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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
  )
}
