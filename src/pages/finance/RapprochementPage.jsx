import { useState, useMemo, useCallback } from 'react'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function parseDate(str) {
  if (!str) return null
  // Try DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  let m = str.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1])
  m = str.match(/^(\d{4})[/\-.](\d{2})[/\-.](\d{2})$/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function fmtDate(d) {
  if (!d) return '—'
  if (typeof d === 'string') d = parseDate(d)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR')
}

function parseFrenchNumber(str) {
  if (str === null || str === undefined || str === '') return 0
  // French: "1 234,56" or "1234,56" or "-1234.56"
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return Infinity
  const a = typeof d1 === 'string' ? parseDate(d1) : d1
  const b = typeof d2 === 'string' ? parseDate(d2) : d2
  if (!a || !b) return Infinity
  return Math.abs((a - b) / (1000 * 60 * 60 * 24))
}

function parseCSV(text) {
  // Detect separator (semicolon for French banks, comma otherwise)
  const firstLine = text.split('\n')[0] || ''
  const sep = firstLine.includes(';') ? ';' : ','

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(sep).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase())

  // Map common French bank column names
  const dateIdx = headers.findIndex(h => /^date/.test(h))
  const libelleIdx = headers.findIndex(h => /libell|description|label|intitul/i.test(h))
  const montantIdx = headers.findIndex(h => /montant|amount/i.test(h))
  const debitIdx = headers.findIndex(h => /d[ée]bit/i.test(h))
  const creditIdx = headers.findIndex(h => /cr[ée]dit/i.test(h))

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g, '').trim())
    const date = dateIdx >= 0 ? cols[dateIdx] : ''
    const libelle = libelleIdx >= 0 ? cols[libelleIdx] : cols[1] || ''

    let montant = 0
    if (montantIdx >= 0) {
      montant = parseFrenchNumber(cols[montantIdx])
    } else if (debitIdx >= 0 && creditIdx >= 0) {
      const deb = parseFrenchNumber(cols[debitIdx])
      const cred = parseFrenchNumber(cols[creditIdx])
      montant = cred ? cred : (deb ? -deb : 0)
    }

    if (!date && !libelle && montant === 0) continue

    rows.push({
      id: `bank-${i}`,
      date,
      libelle,
      montant,
      matchId: null,
    })
  }
  return rows
}

// Demo accounting entries for testing
const DEMO_ECRITURES = [
  { id: 'ec-1', ecriture_date: '2024-01-05', libelle: 'Loyer bureau janvier', montant: -1500.00, compte: '613100', journal: 'ACH' },
  { id: 'ec-2', ecriture_date: '2024-01-08', libelle: 'Facture client ACME', montant: 3200.00, compte: '411000', journal: 'VE' },
  { id: 'ec-3', ecriture_date: '2024-01-12', libelle: 'Abonnement logiciel', montant: -49.90, compte: '615100', journal: 'ACH' },
  { id: 'ec-4', ecriture_date: '2024-01-15', libelle: 'Salaires janvier', montant: -8500.00, compte: '641000', journal: 'OD' },
  { id: 'ec-5', ecriture_date: '2024-01-18', libelle: 'Facture client Beta Corp', montant: 1750.00, compte: '411000', journal: 'VE' },
  { id: 'ec-6', ecriture_date: '2024-01-22', libelle: 'Fournitures de bureau', montant: -234.50, compte: '606400', journal: 'ACH' },
  { id: 'ec-7', ecriture_date: '2024-01-25', libelle: 'Remboursement note de frais', montant: -128.00, compte: '625100', journal: 'OD' },
  { id: 'ec-8', ecriture_date: '2024-01-28', libelle: 'Vente prestation conseil', montant: 5600.00, compte: '706000', journal: 'VE' },
]

export default function RapprochementPage() {
  const [bankTransactions, setBankTransactions] = useState([])
  const [accountingEntries, setAccountingEntries] = useState(DEMO_ECRITURES)
  const [matches, setMatches] = useState([]) // [{bankId, accountingId}]
  const [selectedBank, setSelectedBank] = useState(null)
  const [selectedAccounting, setSelectedAccounting] = useState(null)
  const [bankSearch, setBankSearch] = useState('')
  const [acctSearch, setAcctSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)

  // Derived sets for quick lookup
  const matchedBankIds = useMemo(() => new Set(matches.map(m => m.bankId)), [matches])
  const matchedAcctIds = useMemo(() => new Set(matches.map(m => m.accountingId)), [matches])

  // CSV import handler
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setImportError('Aucune transaction trouvée dans le fichier. Vérifiez le format CSV.')
        } else {
          setBankTransactions(rows)
          setMatches([])
          setSelectedBank(null)
          setSelectedAccounting(null)
        }
      } catch (err) {
        setImportError('Erreur lors de la lecture du fichier : ' + err.message)
      }
      setImporting(false)
    }
    reader.onerror = () => {
      setImportError('Impossible de lire le fichier.')
      setImporting(false)
    }
    reader.readAsText(file, 'UTF-8')
    // Reset file input
    e.target.value = ''
  }, [])

  // Auto-match: same amount + date within 3 days
  const handleAutoMatch = useCallback(() => {
    const newMatches = []
    const usedBank = new Set(matches.map(m => m.bankId))
    const usedAcct = new Set(matches.map(m => m.accountingId))

    for (const bt of bankTransactions) {
      if (usedBank.has(bt.id)) continue
      let bestMatch = null
      let bestDays = Infinity
      for (const ae of accountingEntries) {
        if (usedAcct.has(ae.id)) continue
        // Compare amounts (allow tiny rounding diff)
        if (Math.abs(bt.montant - ae.montant) > 0.01) continue
        const days = daysBetween(bt.date, ae.ecriture_date)
        if (days <= 3 && days < bestDays) {
          bestDays = days
          bestMatch = ae
        }
      }
      if (bestMatch) {
        newMatches.push({ bankId: bt.id, accountingId: bestMatch.id })
        usedBank.add(bt.id)
        usedAcct.add(bestMatch.id)
      }
    }
    if (newMatches.length > 0) {
      setMatches(prev => [...prev, ...newMatches])
    }
  }, [bankTransactions, accountingEntries, matches])

  // Manual match: click one on each side
  const handleBankClick = useCallback((id) => {
    if (matchedBankIds.has(id)) return
    setSelectedBank(prev => prev === id ? null : id)
  }, [matchedBankIds])

  const handleAcctClick = useCallback((id) => {
    if (matchedAcctIds.has(id)) return
    setSelectedAccounting(prev => prev === id ? null : id)
  }, [matchedAcctIds])

  // When both sides selected, create match
  useMemo(() => {
    if (selectedBank && selectedAccounting) {
      setMatches(prev => [...prev, { bankId: selectedBank, accountingId: selectedAccounting }])
      setSelectedBank(null)
      setSelectedAccounting(null)
    }
  }, [selectedBank, selectedAccounting])

  // Remove a match
  const removeMatch = useCallback((bankId, accountingId) => {
    setMatches(prev => prev.filter(m => !(m.bankId === bankId && m.accountingId === accountingId)))
  }, [])

  // Clear everything
  const handleClear = useCallback(() => {
    setBankTransactions([])
    setMatches([])
    setSelectedBank(null)
    setSelectedAccounting(null)
    setBankSearch('')
    setAcctSearch('')
    setImportError(null)
  }, [])

  // Export unmatched as CSV
  const handleExportUnmatched = useCallback(() => {
    const unmatchedBank = bankTransactions.filter(bt => !matchedBankIds.has(bt.id))
    const unmatchedAcct = accountingEntries.filter(ae => !matchedAcctIds.has(ae.id))

    let csv = 'Type;Date;Libelle;Montant\n'
    unmatchedBank.forEach(bt => {
      csv += `Banque;${bt.date};${bt.libelle};${String(bt.montant).replace('.', ',')}\n`
    })
    unmatchedAcct.forEach(ae => {
      csv += `Comptabilite;${ae.ecriture_date};${ae.libelle};${String(ae.montant).replace('.', ',')}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ecarts_rapprochement.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [bankTransactions, accountingEntries, matchedBankIds, matchedAcctIds])

  // Filtered lists
  const filteredBank = useMemo(() => {
    const q = bankSearch.toLowerCase()
    return bankTransactions.filter(bt =>
      !q || bt.libelle.toLowerCase().includes(q) || String(bt.montant).includes(q) || (bt.date || '').includes(q)
    )
  }, [bankTransactions, bankSearch])

  const filteredAcct = useMemo(() => {
    const q = acctSearch.toLowerCase()
    return accountingEntries.filter(ae =>
      !q || ae.libelle.toLowerCase().includes(q) || String(ae.montant).includes(q) || (ae.ecriture_date || '').includes(q) || (ae.compte || '').includes(q)
    )
  }, [accountingEntries, acctSearch])

  const { sortedData: sortedBank, sortKey: bankSortKey, sortDir: bankSortDir, requestSort: bankRequestSort } = useSortableTable(filteredBank)
  const { sortedData: sortedAcct, sortKey: acctSortKey, sortDir: acctSortDir, requestSort: acctRequestSort } = useSortableTable(filteredAcct)

  // KPIs
  const totalBank = bankTransactions.reduce((s, bt) => s + bt.montant, 0)
  const totalAcct = accountingEntries.reduce((s, ae) => s + ae.montant, 0)
  const matchedCount = matches.length
  const totalItems = bankTransactions.length + accountingEntries.length
  const matchPct = totalItems > 0 ? Math.round((matchedCount * 2 / totalItems) * 100) : 0
  const ecart = totalBank - totalAcct

  // Matched pairs table data (MUST be defined before useSortableTable)
  const matchedPairs = useMemo(() => {
    return matches.map(m => {
      const bt = bankTransactions.find(b => b.id === m.bankId)
      const ae = accountingEntries.find(a => a.id === m.accountingId)
      return { ...m, bank: bt, acct: ae }
    }).filter(p => p.bank && p.acct)
  }, [matches, bankTransactions, accountingEntries])

  const { sortedData: sortedPairs, sortKey: pairsSortKey, sortDir: pairsSortDir, requestSort: pairsRequestSort } = useSortableTable(matchedPairs)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Rapprochement bancaire</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            Comparez vos releves bancaires avec vos ecritures comptables
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {bankTransactions.length > 0 && (
            <>
              <button className="btn-secondary" onClick={handleAutoMatch}>
                Rapprochement auto
              </button>
              <button className="btn-secondary" onClick={handleExportUnmatched}>
                Exporter ecarts
              </button>
              <button className="btn-secondary" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleClear}>
                Reinitialiser
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Bar */}
      <div className="produit-kpi-bar">
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value">{fmt(totalBank)} </span>
          <span className="produit-kpi-label">Total operations bancaires</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: 'var(--primary)' }}>{fmt(totalAcct)} </span>
          <span className="produit-kpi-label">Total ecritures comptables</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: '#16a34a' }}>{matchedCount} ({matchPct}%)</span>
          <span className="produit-kpi-label">Rapprochees</span>
        </div>
        <div className="produit-kpi-chip">
          <span className="produit-kpi-value" style={{ color: Math.abs(ecart) < 0.01 ? '#16a34a' : '#dc2626' }}>{fmt(ecart)} </span>
          <span className="produit-kpi-label">Ecart</span>
        </div>
      </div>

      {/* CSV Import Section */}
      {bankTransactions.length === 0 && (
        <div style={{
          margin: '0 0 1.5rem',
          background: 'var(--surface)',
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: '2.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🏦</div>
          <h3 style={{ marginBottom: '.5rem', fontWeight: 600 }}>Importer un releve bancaire</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem', marginBottom: '1.25rem' }}>
            Formats acceptes : CSV (separateur point-virgule ou virgule). Colonnes attendues : Date, Libelle, Montant (ou Debit/Credit).
          </p>
          <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
            <span>Choisir un fichier CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          {importing && <p style={{ marginTop: '.75rem', color: 'var(--text-muted)' }}>Import en cours...</p>}
          {importError && (
            <p style={{ marginTop: '.75rem', color: '#dc2626', fontSize: '.875rem' }}>{importError}</p>
          )}
        </div>
      )}

      {/* Split View */}
      {bankTransactions.length > 0 && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: '1rem' }}>
            Cliquez sur une ligne de chaque cote pour creer un rapprochement manuel. Les lignes rapprochees apparaissent en vert.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* LEFT: Bank Transactions */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '.75rem 1rem',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '.5rem',
              }}>
                <strong style={{ fontSize: '.9rem' }}>Releve bancaire ({bankTransactions.length})</strong>
                <label className="btn-secondary" style={{ cursor: 'pointer', padding: '.2rem .6rem', fontSize: '.75rem' }}>
                  Re-importer
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ padding: '.5rem .75rem', borderBottom: '1px solid var(--border)' }}>
                <input
                  className="table-search"
                  type="text"
                  placeholder="Rechercher..."
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  style={{ width: '100%', margin: 0 }}
                />
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="users-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <SortableHeader label="Date" field="date" sortKey={bankSortKey} sortDir={bankSortDir} onSort={bankRequestSort} />
                      <SortableHeader label="Libelle" field="libelle" sortKey={bankSortKey} sortDir={bankSortDir} onSort={bankRequestSort} />
                      <SortableHeader label="Montant" field="montant" sortKey={bankSortKey} sortDir={bankSortDir} onSort={bankRequestSort} style={{ textAlign: 'right' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBank.map(bt => {
                      const isMatched = matchedBankIds.has(bt.id)
                      const isSelected = selectedBank === bt.id
                      return (
                        <tr
                          key={bt.id}
                          onClick={() => handleBankClick(bt.id)}
                          style={{
                            cursor: isMatched ? 'default' : 'pointer',
                            background: isMatched ? '#dcfce7' : isSelected ? '#dbeafe' : 'transparent',
                            opacity: isMatched ? 0.7 : 1,
                          }}
                        >
                          <td style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>{fmtDate(bt.date)}</td>
                          <td style={{ fontSize: '.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bt.libelle}</td>
                          <td style={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '.8rem',
                            fontWeight: 600,
                            color: bt.montant >= 0 ? '#16a34a' : '#dc2626',
                          }}>{fmt(bt.montant)}</td>
                        </tr>
                      )
                    })}
                    {filteredBank.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucune transaction</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Accounting Entries */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '.75rem 1rem',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <strong style={{ fontSize: '.9rem' }}>Ecritures comptables ({accountingEntries.length})</strong>
              </div>
              <div style={{ padding: '.5rem .75rem', borderBottom: '1px solid var(--border)' }}>
                <input
                  className="table-search"
                  type="text"
                  placeholder="Rechercher..."
                  value={acctSearch}
                  onChange={e => setAcctSearch(e.target.value)}
                  style={{ width: '100%', margin: 0 }}
                />
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="users-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <SortableHeader label="Date" field="ecriture_date" sortKey={acctSortKey} sortDir={acctSortDir} onSort={acctRequestSort} />
                      <SortableHeader label="Libelle" field="libelle" sortKey={acctSortKey} sortDir={acctSortDir} onSort={acctRequestSort} />
                      <SortableHeader label="Compte" field="compte" sortKey={acctSortKey} sortDir={acctSortDir} onSort={acctRequestSort} />
                      <SortableHeader label="Montant" field="montant" sortKey={acctSortKey} sortDir={acctSortDir} onSort={acctRequestSort} style={{ textAlign: 'right' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAcct.map(ae => {
                      const isMatched = matchedAcctIds.has(ae.id)
                      const isSelected = selectedAccounting === ae.id
                      return (
                        <tr
                          key={ae.id}
                          onClick={() => handleAcctClick(ae.id)}
                          style={{
                            cursor: isMatched ? 'default' : 'pointer',
                            background: isMatched ? '#dcfce7' : isSelected ? '#dbeafe' : 'transparent',
                            opacity: isMatched ? 0.7 : 1,
                          }}
                        >
                          <td style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>{fmtDate(ae.ecriture_date)}</td>
                          <td style={{ fontSize: '.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ae.libelle}</td>
                          <td style={{ fontSize: '.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{ae.compte || '—'}</td>
                          <td style={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '.8rem',
                            fontWeight: 600,
                            color: ae.montant >= 0 ? '#16a34a' : '#dc2626',
                          }}>{fmt(ae.montant)}</td>
                        </tr>
                      )
                    })}
                    {filteredAcct.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucune ecriture</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Matched Pairs Table */}
          {matchedPairs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '.75rem' }}>
                Rapprochements valides ({matchedPairs.length})
              </h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <SortableHeader label="Date banque" field="bank.date" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} />
                      <SortableHeader label="Libelle banque" field="bank.libelle" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} />
                      <SortableHeader label="Montant banque" field="bank.montant" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} style={{ textAlign: 'right' }} />
                      <SortableHeader label="Date ecriture" field="acct.ecriture_date" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} />
                      <SortableHeader label="Libelle ecriture" field="acct.libelle" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} />
                      <SortableHeader label="Compte" field="acct.compte" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} />
                      <SortableHeader label="Montant ecriture" field="acct.montant" sortKey={pairsSortKey} sortDir={pairsSortDir} onSort={pairsRequestSort} style={{ textAlign: 'right' }} />
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPairs.map(p => {
                      const diff = Math.abs(p.bank.montant - p.acct.montant)
                      return (
                        <tr key={`${p.bankId}-${p.accountingId}`} style={{ background: '#f0fdf4' }}>
                          <td style={{ fontSize: '.8rem' }}>{fmtDate(p.bank.date)}</td>
                          <td style={{ fontSize: '.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bank.libelle}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '.8rem', fontWeight: 600 }}>{fmt(p.bank.montant)}</td>
                          <td style={{ fontSize: '.8rem' }}>{fmtDate(p.acct.ecriture_date)}</td>
                          <td style={{ fontSize: '.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.acct.libelle}</td>
                          <td style={{ fontSize: '.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.acct.compte || '—'}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '.8rem', fontWeight: 600 }}>{fmt(p.acct.montant)}</td>
                          <td>
                            <span style={{
                              padding: '.15rem .55rem', borderRadius: 12, fontSize: '.75rem', fontWeight: 600,
                              color: diff < 0.01 ? '#16a34a' : '#f59e0b',
                              background: diff < 0.01 ? '#dcfce7' : '#fef3c7',
                            }}>
                              {diff < 0.01 ? 'OK' : `Ecart ${fmt(diff)}`}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-secondary"
                              style={{ padding: '.2rem .5rem', fontSize: '.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => removeMatch(p.bankId, p.accountingId)}
                            >
                              Dissocier
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmatched summary */}
          {bankTransactions.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}>
              <div style={{
                padding: '1rem',
                background: bankTransactions.filter(bt => !matchedBankIds.has(bt.id)).length > 0 ? '#fff7ed' : '#f0fdf4',
                border: '1px solid',
                borderColor: bankTransactions.filter(bt => !matchedBankIds.has(bt.id)).length > 0 ? '#fed7aa' : '#bbf7d0',
                borderRadius: 8,
              }}>
                <strong style={{ fontSize: '.85rem' }}>
                  Operations bancaires non rapprochees : {bankTransactions.filter(bt => !matchedBankIds.has(bt.id)).length}
                </strong>
              </div>
              <div style={{
                padding: '1rem',
                background: accountingEntries.filter(ae => !matchedAcctIds.has(ae.id)).length > 0 ? '#fff7ed' : '#f0fdf4',
                border: '1px solid',
                borderColor: accountingEntries.filter(ae => !matchedAcctIds.has(ae.id)).length > 0 ? '#fed7aa' : '#bbf7d0',
                borderRadius: 8,
              }}>
                <strong style={{ fontSize: '.85rem' }}>
                  Ecritures comptables non rapprochees : {accountingEntries.filter(ae => !matchedAcctIds.has(ae.id)).length}
                </strong>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
