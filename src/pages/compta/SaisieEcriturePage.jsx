import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'

const JOURNALS = [
  { code: 'AC', label: 'Achats' },
  { code: 'VT', label: 'Ventes' },
  { code: 'BQ', label: 'Banque' },
  { code: 'CA', label: 'Caisse' },
  { code: 'OD', label: 'Opérations diverses' },
  { code: 'SA', label: 'Salaires' },
  { code: 'AN', label: 'À nouveau' },
]

const COMPTES_COURANTS = [
  { num: '101000', lib: 'Capital' },
  { num: '106000', lib: 'Réserves' },
  { num: '120000', lib: 'Résultat exercice' },
  { num: '164000', lib: 'Emprunts bancaires' },
  { num: '401000', lib: 'Fournisseurs' },
  { num: '411000', lib: 'Clients' },
  { num: '421000', lib: 'Personnel - rémunérations dues' },
  { num: '431000', lib: 'Sécurité sociale' },
  { num: '441100', lib: 'TVA collectée' },
  { num: '445600', lib: 'TVA déductible' },
  { num: '512000', lib: 'Banque' },
  { num: '530000', lib: 'Caisse' },
  { num: '601000', lib: 'Achats matières premières' },
  { num: '606000', lib: 'Achats fournitures' },
  { num: '607000', lib: 'Achats marchandises' },
  { num: '611000', lib: 'Sous-traitance' },
  { num: '613000', lib: 'Loyers' },
  { num: '615000', lib: 'Entretien et réparations' },
  { num: '616000', lib: 'Assurances' },
  { num: '621000', lib: 'Personnel extérieur' },
  { num: '622000', lib: 'Honoraires' },
  { num: '623000', lib: 'Publicité' },
  { num: '625000', lib: 'Déplacements' },
  { num: '626000', lib: 'Frais postaux' },
  { num: '627000', lib: 'Services bancaires' },
  { num: '641000', lib: 'Salaires' },
  { num: '645000', lib: 'Charges sociales' },
  { num: '681000', lib: 'Dotations aux amortissements' },
  { num: '706000', lib: 'Prestations de services' },
  { num: '707000', lib: 'Ventes marchandises' },
  { num: '708000', lib: 'Produits accessoires' },
  { num: '756000', lib: 'Subventions' },
]

function newLine() {
  return { compte_num: '', compte_lib: '', libelle: '', debit: '', credit: '' }
}

function fmtNum(n) {
  if (!n && n !== 0) return ''
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function parseNum(s) {
  if (!s) return 0
  return parseFloat(String(s).replace(',', '.')) || 0
}

function toISO(d) { return d.toISOString().slice(0, 10) }

export default function SaisieEcriturePage() {
  const { selectedSociete } = useSociete()
  const { profile } = useAuth()

  // ── Formulaire ─────────────────────────────────────────────
  const [date, setDate] = useState(toISO(new Date()))
  const [journal, setJournal] = useState('OD')
  const [pieceRef, setPieceRef] = useState('')
  const [libelle, setLibelle] = useState('')
  const [exercice, setExercice] = useState(String(new Date().getFullYear()))
  const [lines, setLines] = useState([newLine(), newLine()])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveOk, setSaveOk] = useState(false)

  // ── Liste des écritures ─────────────────────────────────────
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterJournal, setFilterJournal] = useState('')

  useEffect(() => { loadEntries() }, [selectedSociete?.id])

  async function loadEntries() {
    setLoading(true)
    let q = supabase
      .from('journal_entries')
      .select(`id, date, piece_ref, journal_code, libelle, exercice, created_at,
               journal_lines(id, compte_num, compte_lib, libelle, debit, credit)`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (!error) setEntries(data || [])
    setLoading(false)
  }

  // ── Totaux débit / crédit ───────────────────────────────────
  const totalDebit  = useMemo(() => lines.reduce((s, l) => s + parseNum(l.debit), 0), [lines])
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + parseNum(l.credit), 0), [lines])
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0
  const hasLines    = lines.some(l => l.compte_num)

  // ── Gestion des lignes ──────────────────────────────────────
  function updateLine(i, field, val) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const updated = { ...l, [field]: val }
      // Suggestions compte
      if (field === 'compte_num') {
        const found = COMPTES_COURANTS.find(c => c.num === val)
        if (found) updated.compte_lib = found.lib
      }
      // Débit et crédit s'excluent
      if (field === 'debit' && val) updated.credit = ''
      if (field === 'credit' && val) updated.debit = ''
      return updated
    }))
  }

  function addLine() { setLines(prev => [...prev, newLine()]) }

  function removeLine(i) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function autoBalance() {
    const diff = totalDebit - totalCredit
    if (Math.abs(diff) < 0.01) return
    const lastEmpty = [...lines].reverse().findIndex(l => !l.debit && !l.credit)
    if (lastEmpty === -1) {
      setLines(prev => [...prev, { ...newLine(), debit: diff > 0 ? '' : fmtNum(Math.abs(diff)), credit: diff > 0 ? fmtNum(diff) : '' }])
    } else {
      const idx = lines.length - 1 - lastEmpty
      updateLine(idx, diff > 0 ? 'credit' : 'debit', fmtNum(Math.abs(diff)))
    }
  }

  // ── Sauvegarde ──────────────────────────────────────────────
  async function handleSave(e) {
    e?.preventDefault()
    if (!balanced || !hasLines || !selectedSociete?.id) return
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)

    // Créer l'en-tête
    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        societe_id: selectedSociete.id,
        date,
        piece_ref: pieceRef || null,
        journal_code: journal,
        libelle: libelle || null,
        exercice,
        created_by: profile?.id || null,
      })
      .select()
      .single()

    if (entryErr) { setSaveError(entryErr.message); setSaving(false); return }

    // Créer les lignes
    const validLines = lines.filter(l => l.compte_num)
    const { error: linesErr } = await supabase
      .from('journal_lines')
      .insert(validLines.map(l => ({
        entry_id: entry.id,
        compte_num: l.compte_num,
        compte_lib: l.compte_lib || null,
        libelle: l.libelle || null,
        debit: parseNum(l.debit) || 0,
        credit: parseNum(l.credit) || 0,
      })))

    if (linesErr) { setSaveError(linesErr.message); setSaving(false); return }

    setSaveOk(true)
    setSaving(false)
    // Reset form
    setDate(toISO(new Date()))
    setJournal('OD')
    setPieceRef('')
    setLibelle('')
    setLines([newLine(), newLine()])
    setTimeout(() => setSaveOk(false), 3000)
    loadEntries()
  }

  async function deleteEntry(id) {
    if (!window.confirm('Supprimer cette écriture ?')) return
    await supabase.from('journal_entries').delete().eq('id', id)
    loadEntries()
  }

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  // Aplatir entries → lignes individuelles pour le tableau
  const allRows = useMemo(() => {
    const rows = []
    for (const e of entries) {
      for (const l of (e.journal_lines || [])) {
        rows.push({
          entry_id: e.id,
          date: e.date,
          journal_code: e.journal_code,
          piece_ref: e.piece_ref,
          entry_lib: e.libelle,
          compte_num: l.compte_num,
          compte_lib: l.compte_lib,
          libelle: l.libelle || e.libelle,
          debit: l.debit,
          credit: l.credit,
          line_id: l.id,
        })
      }
    }
    return rows
  }, [entries])

  const filteredRows = useMemo(() => {
    let rows = allRows
    if (filterJournal) rows = rows.filter(r => r.journal_code === filterJournal)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.compte_num?.includes(q) ||
        r.compte_lib?.toLowerCase().includes(q) ||
        r.libelle?.toLowerCase().includes(q) ||
        r.piece_ref?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [allRows, search, filterJournal])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows  = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const sumDebit   = filteredRows.reduce((s, r) => s + (r.debit || 0), 0)
  const sumCredit  = filteredRows.reduce((s, r) => s + (r.credit || 0), 0)

  const journauxExistants = useMemo(() =>
    [...new Set(entries.map(e => e.journal_code))].sort()
  , [entries])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Saisie des écritures</h1>
        {selectedSociete && <span className="badge-info">{selectedSociete.name}</span>}
      </div>

      {!selectedSociete?.id && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Sélectionnez une société pour saisir des écritures.
        </div>
      )}

      {selectedSociete?.id && (
        <div className="saisie-ecriture-layout-vertical">

          {/* ── FORMULAIRE ───────────────────────────── */}
          <div className="saisie-ecriture-form-wrap">
            <div className="saisie-ecriture-card">
              <h2 className="saisie-ecriture-section-title">Nouvelle écriture</h2>

              <form onSubmit={handleSave}>
                {/* En-tête */}
                <div className="saisie-ecriture-header-fields">
                  <div className="form-field">
                    <label>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <label>Journal</label>
                    <select value={journal} onChange={e => setJournal(e.target.value)}>
                      {JOURNALS.map(j => (
                        <option key={j.code} value={j.code}>{j.code} — {j.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Exercice</label>
                    <input
                      type="text" value={exercice}
                      onChange={e => setExercice(e.target.value)}
                      style={{ width: 80 }}
                    />
                  </div>
                  <div className="form-field">
                    <label>N° pièce</label>
                    <input
                      type="text" value={pieceRef}
                      onChange={e => setPieceRef(e.target.value)}
                      placeholder="FAC-2024-001"
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Libellé général</label>
                    <input
                      type="text" value={libelle}
                      onChange={e => setLibelle(e.target.value)}
                      placeholder="Achat fournitures bureau…"
                    />
                  </div>
                </div>

                {/* Lignes */}
                <div className="saisie-lignes-wrap">
                  <div className="saisie-lignes-head">
                    <span style={{ flex: '0 0 120px' }}>Compte</span>
                    <span style={{ flex: '0 0 160px' }}>Libellé compte</span>
                    <span style={{ flex: 1 }}>Libellé ligne</span>
                    <span style={{ flex: '0 0 100px', textAlign: 'right' }}>Débit</span>
                    <span style={{ flex: '0 0 100px', textAlign: 'right' }}>Crédit</span>
                    <span style={{ flex: '0 0 28px' }}></span>
                  </div>

                  {lines.map((line, i) => (
                    <div key={i} className="saisie-ligne-row">
                      <div style={{ flex: '0 0 120px', position: 'relative' }}>
                        <input
                          className="saisie-ligne-input"
                          value={line.compte_num}
                          onChange={e => updateLine(i, 'compte_num', e.target.value)}
                          placeholder="411000"
                          list={`comptes-list-${i}`}
                        />
                        <datalist id={`comptes-list-${i}`}>
                          {COMPTES_COURANTS.map(c => (
                            <option key={c.num} value={c.num}>{c.num} — {c.lib}</option>
                          ))}
                        </datalist>
                      </div>
                      <input
                        className="saisie-ligne-input"
                        style={{ flex: '0 0 160px' }}
                        value={line.compte_lib}
                        onChange={e => updateLine(i, 'compte_lib', e.target.value)}
                        placeholder="Clients"
                      />
                      <input
                        className="saisie-ligne-input"
                        style={{ flex: 1 }}
                        value={line.libelle}
                        onChange={e => updateLine(i, 'libelle', e.target.value)}
                        placeholder="Libellé…"
                      />
                      <input
                        className={`saisie-ligne-input saisie-ligne-input--num ${parseNum(line.debit) > 0 ? 'saisie-ligne-input--debit' : ''}`}
                        style={{ flex: '0 0 100px', textAlign: 'right' }}
                        value={line.debit}
                        onChange={e => updateLine(i, 'debit', e.target.value)}
                        placeholder="0,00"
                      />
                      <input
                        className={`saisie-ligne-input saisie-ligne-input--num ${parseNum(line.credit) > 0 ? 'saisie-ligne-input--credit' : ''}`}
                        style={{ flex: '0 0 100px', textAlign: 'right' }}
                        value={line.credit}
                        onChange={e => updateLine(i, 'credit', e.target.value)}
                        placeholder="0,00"
                      />
                      <button
                        type="button"
                        className="saisie-ligne-del"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        title="Supprimer la ligne"
                      >✕</button>
                    </div>
                  ))}

                  {/* Totaux */}
                  <div className="saisie-totaux-row">
                    <span style={{ flex: 1 }}>Totaux</span>
                    <span style={{ flex: '0 0 100px', textAlign: 'right', fontWeight: 700, color: '#1a5c82' }}>
                      {fmtNum(totalDebit)} €
                    </span>
                    <span style={{ flex: '0 0 100px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {fmtNum(totalCredit)} €
                    </span>
                    <span style={{ flex: '0 0 28px' }}></span>
                  </div>

                  {/* Balance */}
                  <div className={`saisie-balance ${balanced ? 'saisie-balance--ok' : totalDebit === 0 && totalCredit === 0 ? 'saisie-balance--neutral' : 'saisie-balance--err'}`}>
                    {balanced
                      ? '✓ Écriture équilibrée'
                      : totalDebit === 0 && totalCredit === 0
                        ? 'Saisissez les montants débit / crédit'
                        : `Écart : ${fmtNum(Math.abs(totalDebit - totalCredit))} €`
                    }
                    {!balanced && (totalDebit > 0 || totalCredit > 0) && totalDebit !== totalCredit && (
                      <button type="button" className="btn-link" onClick={autoBalance} style={{ marginLeft: '.75rem' }}>
                        Équilibrer auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="saisie-actions">
                  <button type="button" className="btn-secondary" onClick={addLine}>
                    + Ajouter une ligne
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!balanced || !hasLines || saving}
                  >
                    {saving ? 'Enregistrement…' : '💾 Enregistrer'}
                  </button>
                </div>

                {saveError && <div className="saisie-error">❌ {saveError}</div>}
                {saveOk    && <div className="saisie-success">✅ Écriture enregistrée</div>}
              </form>
            </div>
          </div>

          {/* ── LISTE ────────────────────────────────── */}
          <div className="saisie-ecriture-list-wrap">
            <div className="saisie-ecriture-card">
              <h2 className="saisie-ecriture-section-title">
                Balance générale
                <span className="badge-count">{filteredRows.length} lignes</span>
              </h2>

              <div className="table-toolbar" style={{ marginBottom: '.75rem' }}>
                <input
                  className="table-search"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Compte, libellé, pièce…"
                />
                <select
                  className="table-pagesize"
                  value={filterJournal}
                  onChange={e => { setFilterJournal(e.target.value); setPage(1) }}
                >
                  <option value="">Tous journaux</option>
                  {journauxExistants.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              {loading ? (
                <Spinner />
              ) : filteredRows.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune écriture pour l'instant.
                </p>
              ) : (
                <>
                  {/* Totaux */}
                  <div className="fec-totals" style={{ marginBottom: '.5rem' }}>
                    <span>Débit total : <strong>{fmtNum(sumDebit)} €</strong></span>
                    <span>Crédit total : <strong>{fmtNum(sumCredit)} €</strong></span>
                    <span style={{ color: Math.abs(sumDebit - sumCredit) < 0.01 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {Math.abs(sumDebit - sumCredit) < 0.01 ? '✓ Équilibrée' : `Écart : ${fmtNum(Math.abs(sumDebit - sumCredit))} €`}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="users-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Journal</th>
                          <th>Pièce</th>
                          <th>Compte</th>
                          <th>Libellé</th>
                          <th style={{ textAlign: 'right' }}>Débit</th>
                          <th style={{ textAlign: 'right' }}>Crédit</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((r, i) => (
                          <tr key={r.line_id || i} className="users-table-row">
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.date}</td>
                            <td><span className="fec-journal-badge">{r.journal_code}</span></td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>{r.piece_ref || '—'}</td>
                            <td><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{r.compte_num}</strong><br /><span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{r.compte_lib}</span></td>
                            <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.libelle || '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: r.debit > 0 ? '#1a5c82' : 'var(--text-muted)', fontSize: '.82rem' }}>
                              {r.debit > 0 ? fmtNum(r.debit) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: r.credit > 0 ? '#16a34a' : 'var(--text-muted)', fontSize: '.82rem' }}>
                              {r.credit > 0 ? fmtNum(r.credit) : '—'}
                            </td>
                            <td>
                              <button
                                className="saisie-entry-del"
                                onClick={() => deleteEntry(r.entry_id)}
                                title="Supprimer l'écriture"
                              >🗑</button>
                            </td>
                          </tr>
                        ))}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
