import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import * as XLSX from 'xlsx'

// ── Parser FEC ───────────────────────────────────────────────
function parseFecDate(s) {
  if (!s) return null
  const str = String(s).trim()
  // Format YYYYMMDD (standard FEC)
  if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  // Format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  // Format YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  // Excel serial date number
  if (/^\d+$/.test(str)) {
    const n = parseInt(str)
    if (n > 40000 && n < 60000) {
      const d = new Date(Math.round((n - 25569) * 86400 * 1000))
      return d.toISOString().slice(0, 10)
    }
  }
  return null
}

function parseFecNum(s) {
  if (s === null || s === undefined || s === '') return 0
  if (typeof s === 'number') return s
  return parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.')) || 0
}

function detectSep(line) {
  const tabs  = (line.match(/\t/g)  || []).length
  const pipes = (line.match(/\|/g)  || []).length
  const semis = (line.match(/;/g)   || []).length
  if (tabs >= pipes && tabs >= semis) return '\t'
  if (pipes >= semis) return '|'
  return ';'
}

// Normalise un nom de colonne pour la correspondance
function normHeader(h) {
  return String(h).toLowerCase().trim().replace(/\s+/g, '').replace(/[_\-]/g, '').replace(/é|è|ê/g, 'e').replace(/[^a-z0-9]/g, '')
}

// Correspondances flexibles (alias normalisés → clé interne)
const HEADER_MAP = {
  journalcode:   'journal_code',
  codejournal:   'journal_code',
  journallib:    'journal_lib',
  libellejournal:'journal_lib',
  ecriturenum:   'ecriture_num',
  numerocriture: 'ecriture_num',
  ecrituredate:  'ecriture_date',
  datecriture:   'ecriture_date',
  date:          'ecriture_date',
  comptenum:     'compte_num',
  numerocompte:  'compte_num',
  numcompte:     'compte_num',
  comptelib:     'compte_lib',
  libellecompte: 'compte_lib',
  compauxnum:    'comp_aux_num',
  compteauxnum:  'comp_aux_num',
  compauxlib:    'comp_aux_lib',
  compteauxlib:  'comp_aux_lib',
  pieceref:      'piece_ref',
  reference:     'piece_ref',
  piecedate:     'piece_date',
  ecriturelib:   'ecriture_lib',
  libelle:       'ecriture_lib',
  libellecriture:'ecriture_lib',
  debit:         'debit',
  montantdebit:  'debit',
  credit:        'credit',
  montantcredit: 'credit',
  ecriturelet:   'ecriture_let',
  lettrage:      'ecriture_let',
  datelet:       'date_let',
  validdate:     'valid_date',
  datevalidation:'valid_date',
  montantdevise: 'montant_devise',
  idevise:       'idevise',
  devise:        'idevise'}

function buildRowFromObj(obj) {
  // Normalise les clés de l'objet
  const mapped = {}
  for (const [k, v] of Object.entries(obj)) {
    const norm = normHeader(k)
    const key = HEADER_MAP[norm]
    if (key) mapped[key] = v
  }
  return {
    journal_code:   String(mapped.journal_code || '').trim(),
    journal_lib:    String(mapped.journal_lib   || '').trim(),
    ecriture_num:   String(mapped.ecriture_num  || '').trim(),
    ecriture_date:  parseFecDate(mapped.ecriture_date),
    compte_num:     String(mapped.compte_num    || '').trim(),
    compte_lib:     String(mapped.compte_lib    || '').trim(),
    comp_aux_num:   mapped.comp_aux_num ? String(mapped.comp_aux_num).trim() : null,
    comp_aux_lib:   mapped.comp_aux_lib ? String(mapped.comp_aux_lib).trim() : null,
    piece_ref:      mapped.piece_ref    ? String(mapped.piece_ref).trim()    : null,
    piece_date:     parseFecDate(mapped.piece_date),
    ecriture_lib:   String(mapped.ecriture_lib  || '').trim(),
    debit:          parseFecNum(mapped.debit),
    credit:         parseFecNum(mapped.credit),
    ecriture_let:   mapped.ecriture_let ? String(mapped.ecriture_let).trim() : null,
    date_let:       parseFecDate(mapped.date_let) || null,
    valid_date:     parseFecDate(mapped.valid_date) || null,
    montant_devise: mapped.montant_devise ? parseFecNum(mapped.montant_devise) : null,
    idevise:        mapped.idevise ? String(mapped.idevise).trim() : null}
}

function parseFecText(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Fichier vide ou invalide')
  const sep = detectSep(lines[0])
  const rawHeaders = lines[0].split(sep)
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep)
    if (cols.length < 3) continue
    const obj = {}
    rawHeaders.forEach((h, idx) => { obj[h] = cols[idx] || '' })
    const row = buildRowFromObj(obj)
    if (!row.compte_num && !row.ecriture_date) continue
    rows.push(row)
  }
  if (rows.length === 0) throw new Error('Aucune écriture détectée — vérifiez le format du fichier')
  return rows
}

function parseFecXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  // raw: true pour garder les nombres Excel bruts (dates sérielles incluses)
  const jsonRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' })
  if (!jsonRows.length) throw new Error('Feuille Excel vide ou non reconnue')
  const rows = jsonRows.map(buildRowFromObj).filter(r => r.compte_num || r.ecriture_date)
  if (rows.length === 0) throw new Error('Aucune écriture détectée — vérifiez les colonnes du fichier Excel')
  return rows
}

async function parseFec(file) {
  const isXlsx = /\.(xlsx|xls|xlsm)$/i.test(file.name)
  if (isXlsx) {
    const buffer = await file.arrayBuffer()
    return parseFecXlsx(new Uint8Array(buffer))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try { resolve(parseFecText(e.target.result)) }
      catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsText(file, 'UTF-8')
  })
}

function fmtNum(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

// ── SQL à exécuter ───────────────────────────────────────────
const SQL = `-- À exécuter dans Supabase SQL Editor (Dashboard → SQL)

CREATE TABLE IF NOT EXISTS fec_imports (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id),
  societe      text NOT NULL,
  exercice     text NOT NULL,
  filename     text,
  nb_lignes    integer,
  total_debit  numeric(15,2),
  total_credit numeric(15,2)
);

CREATE TABLE IF NOT EXISTS fec_ecritures (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id      uuid REFERENCES fec_imports(id) ON DELETE CASCADE,
  journal_code   text,
  journal_lib    text,
  ecriture_num   text,
  ecriture_date  date,
  compte_num     text,
  compte_lib     text,
  comp_aux_num   text,
  comp_aux_lib   text,
  piece_ref      text,
  piece_date     date,
  ecriture_lib   text,
  debit          numeric(15,2) DEFAULT 0,
  credit         numeric(15,2) DEFAULT 0,
  ecriture_let   text,
  date_let       date,
  valid_date     date,
  montant_devise numeric(15,2),
  idevise        text
);

ALTER TABLE fec_imports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fec_ecritures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fec_imports_all" ON fec_imports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable')));
CREATE POLICY "fec_ecritures_all" ON fec_ecritures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable')));`

// ── Page ─────────────────────────────────────────────────────
export default function ComptaImportPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [step, setStep] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [societe, setSociete] = useState('')
  const [exercice, setExercice] = useState('')
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState(null)
  const [sqlCopied, setSqlCopied] = useState(false)

  function reset() {
    setStep(1); setRows([]); setError(null); setProgress(0)
    setFileName(''); setSociete(''); setExercice('')
  }

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setError(null)

    // Auto-detect société (SIREN 9 chiffres) et exercice depuis le nom
    const siren = file.name.match(/(\d{9})/)
    if (siren) setSociete(siren[1])
    const year = file.name.match(/20\d{2}/)
    if (year) setExercice(year[0])

    try {
      const parsed = await parseFec(file)
      setRows(parsed)
      if (!year && parsed[0]?.ecriture_date) setExercice(parsed[0].ecriture_date.slice(0, 4))
      setStep(2)
    } catch (err) {
      setError(err.message)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleImport() {
    if (!societe.trim()) { setError('Veuillez renseigner la société ou le SIREN'); return }
    if (!exercice.trim()) { setError('Veuillez renseigner l\'exercice'); return }
    setStep(3)
    setError(null)
    setProgress(0)

    const totalDebit  = rows.reduce((s, r) => s + r.debit,  0)
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

    const { data: importRec, error: impErr } = await supabase
      .from('fec_imports').insert({ meta: JSON.stringify({ societe: societe.trim(), exercice: exercice.trim(), filename: fileName, nb_lignes: rows.length, total_debit: totalDebit, total_credit: totalCredit }) }).select('id').single()

    if (impErr) {
      setError(impErr.code === '42P01' ? 'TABLE_MISSING' : impErr.message)
      setStep(2)
      return
    }

    const BATCH = 500
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(r => ({ import_id: importRec.id, data: JSON.stringify(r) }))
      const { error: bErr } = await supabase.from('fec_ecritures').insert(batch)
      if (bErr) {
        await supabase.from('fec_imports').delete().eq('id', importRec.id)
        setError(bErr.message)
        setStep(2)
        return
      }
      setProgress(Math.min(100, Math.round(((i + BATCH) / rows.length) * 100)))
    }

    setImportResult({ id: importRec.id, societe: societe.trim(), exercice: exercice.trim(), nb: rows.length, totalDebit, totalCredit })
    setStep(4)
  }

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Import FEC</h1>
          <p>Fichier des Écritures Comptables — format DGFiP</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/finance/comptabilite')}>← Retour</button>
      </div>

      {/* Alerte tables manquantes */}
      {error === 'TABLE_MISSING' && (
        <div className="fec-sql-box">
          <p>⚠ Les tables <code>fec_imports</code> et <code>fec_ecritures</code> n'existent pas encore.<br />
          Exécutez ce SQL dans <strong>Supabase → SQL Editor</strong> :</p>
          <pre>{SQL}</pre>
          <button className="btn-secondary" onClick={() => {
            navigator.clipboard.writeText(SQL)
            setSqlCopied(true)
            setTimeout(() => setSqlCopied(false), 2000)
          }}>{sqlCopied ? '✓ Copié !' : 'Copier le SQL'}</button>
        </div>
      )}

      {/* Stepper */}
      <div className="fec-stepper">
        {['Fichier', 'Vérification', 'Import', 'Terminé'].map((label, i) => (
          <div key={i} className={`fec-step ${step === i + 1 ? 'fec-step--active' : ''} ${step > i + 1 ? 'fec-step--done' : ''}`}>
            <div className="fec-step-dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Step 1 : Upload ── */}
      {step === 1 && (
        <div
          className={`fec-dropzone ${dragging ? 'fec-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".txt,.csv,.tsv,.xlsx,.xls,.xlsm" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <div className="fec-dropzone-icon">📁</div>
          <p className="fec-dropzone-label">Glissez votre fichier FEC ici</p>
          <p className="fec-dropzone-sub">ou cliquez pour sélectionner · Formats acceptés : .txt, .csv (TAB, pipe, ;) · .xlsx, .xls</p>
          {error && error !== 'TABLE_MISSING' && <p className="fec-error">⚠ {error}</p>}
        </div>
      )}

      {/* ── Step 2 : Preview ── */}
      {step === 2 && (
        <div>
          <div className="fec-meta-bar">
            <div className="field">
              <label>Société / SIREN</label>
              <input value={societe} onChange={e => setSociete(e.target.value)}
                placeholder="Ex : 123456789 ou Ma Société SAS" style={{ minWidth: 260 }} />
            </div>
            <div className="field">
              <label>Exercice</label>
              <input value={exercice} onChange={e => setExercice(e.target.value)}
                placeholder="Ex : 2023" style={{ width: 100 }} />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end', alignSelf: 'flex-end' }}>
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>📄 {fileName}</span>
            </div>
          </div>

          <div className="fec-stats">
            <div className="fec-stat">
              <span className="fec-stat-label">Lignes</span>
              <span className="fec-stat-value">{rows.length.toLocaleString('fr-FR')}</span>
            </div>
            <div className="fec-stat">
              <span className="fec-stat-label">Total débit</span>
              <span className="fec-stat-value">{fmtNum(totalDebit)} €</span>
            </div>
            <div className="fec-stat">
              <span className="fec-stat-label">Total crédit</span>
              <span className="fec-stat-value">{fmtNum(totalCredit)} €</span>
            </div>
            <div className={`fec-stat ${balanced ? 'fec-stat--ok' : 'fec-stat--err'}`}>
              <span className="fec-stat-label">Balance</span>
              <span className="fec-stat-value">
                {balanced ? '✓ Équilibrée' : `⚠ Écart ${fmtNum(Math.abs(totalDebit - totalCredit))} €`}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
            Aperçu — 20 premières lignes sur {rows.length.toLocaleString('fr-FR')}
          </p>
          <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
            <table className="data-table" style={{ fontSize: '.78rem', minWidth: 900 }}>
              <thead>
                <tr className="data-table-header">
                  <th>Journal</th>
                  <th>N° écriture</th>
                  <th>Date</th>
                  <th>Compte</th>
                  <th>Libellé compte</th>
                  <th>Libellé écriture</th>
                  <th style={{ textAlign: 'right' }}>Débit</th>
                  <th style={{ textAlign: 'right' }}>Crédit</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="data-table-row">
                    <td><span className="fec-journal-badge">{r.journal_code}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.ecriture_num}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.ecriture_date}</td>
                    <td><strong>{r.compte_num}</strong></td>
                    <td>{r.compte_lib}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ecriture_lib}</td>
                    <td style={{ textAlign: 'right', color: '#1a5c82' }}>{r.debit > 0 ? fmtNum(r.debit) : ''}</td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>{r.credit > 0 ? fmtNum(r.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && error !== 'TABLE_MISSING' && <p className="fec-error">⚠ {error}</p>}

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button className="btn-secondary" onClick={reset}>← Recommencer</button>
            <button className="btn-primary" onClick={handleImport}>
              Importer {rows.length.toLocaleString('fr-FR')} écritures →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 : Progression ── */}
      {step === 3 && (
        <div className="fec-progress-wrap">
          <div className="fec-progress-icon">⏳</div>
          <p style={{ fontWeight: 600 }}>Import en cours…</p>
          <div className="fec-progress-bar">
            <div className="fec-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
            {progress}% · {Math.round(rows.length * progress / 100).toLocaleString('fr-FR')} / {rows.length.toLocaleString('fr-FR')} lignes
          </p>
        </div>
      )}

      {/* ── Step 4 : Succès ── */}
      {step === 4 && importResult && (
        <div className="fec-done">
          <div className="fec-done-icon">✅</div>
          <h2>Import réussi !</h2>
          <p style={{ fontSize: '1.05rem', marginBottom: '.5rem' }}>
            {importResult.nb.toLocaleString('fr-FR')} écritures importées
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            {importResult.societe} · Exercice {importResult.exercice}
          </p>
          <div className="fec-stats" style={{ justifyContent: 'center', marginTop: '1.5rem', maxWidth: 500, margin: '1.5rem auto' }}>
            <div className="fec-stat">
              <span className="fec-stat-label">Total débit</span>
              <span className="fec-stat-value">{fmtNum(importResult.totalDebit)} €</span>
            </div>
            <div className="fec-stat">
              <span className="fec-stat-label">Total crédit</span>
              <span className="fec-stat-value">{fmtNum(importResult.totalCredit)} €</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={reset}>Importer un autre fichier</button>
            <button className="btn-primary" onClick={() => navigate('/finance/comptabilite/ecritures')}>
              Voir les écritures →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
