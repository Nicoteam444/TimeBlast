import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ── Parser FEC ───────────────────────────────────────────────
function parseFecDate(s) {
  if (!s || s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function parseFecNum(s) {
  if (!s || s.trim() === '') return 0
  return parseFloat(s.trim().replace(',', '.')) || 0
}

function detectSep(line) {
  const tabs  = (line.match(/\t/g)  || []).length
  const pipes = (line.match(/\|/g)  || []).length
  const semis = (line.match(/;/g)   || []).length
  if (tabs >= pipes && tabs >= semis) return '\t'
  if (pipes >= semis) return '|'
  return ';'
}

function parseFec(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Fichier vide ou invalide')

  const sep = detectSep(lines[0])
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s/g, ''))

  const ALIAS = {
    journal_code:  'journalcode',
    journal_lib:   'journallib',
    ecriture_num:  'ecriturenum',
    ecriture_date: 'ecrituredate',
    compte_num:    'comptenum',
    compte_lib:    'comptelib',
    comp_aux_num:  'compauxnum',
    comp_aux_lib:  'compauxlib',
    piece_ref:     'pieceref',
    piece_date:    'piecedate',
    ecriture_lib:  'ecriturelib',
    debit:         'debit',
    credit:        'credit',
    ecriture_let:  'ecriturelet',
    date_let:      'datelet',
    valid_date:    'validdate',
    montant_devise:'montantdevise',
    idevise:       'idevise',
  }

  const idx = {}
  for (const [key, alias] of Object.entries(ALIAS)) {
    idx[key] = headers.indexOf(alias)
  }

  const get = (cols, key) => idx[key] >= 0 ? (cols[idx[key]] || '').trim() : ''

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep)
    if (cols.length < 3) continue
    rows.push({
      journal_code:   get(cols, 'journal_code'),
      journal_lib:    get(cols, 'journal_lib'),
      ecriture_num:   get(cols, 'ecriture_num'),
      ecriture_date:  parseFecDate(get(cols, 'ecriture_date')),
      compte_num:     get(cols, 'compte_num'),
      compte_lib:     get(cols, 'compte_lib'),
      comp_aux_num:   get(cols, 'comp_aux_num') || null,
      comp_aux_lib:   get(cols, 'comp_aux_lib') || null,
      piece_ref:      get(cols, 'piece_ref') || null,
      piece_date:     parseFecDate(get(cols, 'piece_date')),
      ecriture_lib:   get(cols, 'ecriture_lib'),
      debit:          parseFecNum(get(cols, 'debit')),
      credit:         parseFecNum(get(cols, 'credit')),
      ecriture_let:   get(cols, 'ecriture_let') || null,
      date_let:       parseFecDate(get(cols, 'date_let')) || null,
      valid_date:     parseFecDate(get(cols, 'valid_date')) || null,
      montant_devise: parseFecNum(get(cols, 'montant_devise')) || null,
      idevise:        get(cols, 'idevise') || null,
    })
  }
  if (rows.length === 0) throw new Error('Aucune écriture détectée — vérifiez le format du fichier')
  return rows
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

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setError(null)

    // Auto-detect société (SIREN 9 chiffres) et exercice depuis le nom
    const siren = file.name.match(/(\d{9})/)
    if (siren) setSociete(siren[1])
    const year = file.name.match(/20\d{2}/)
    if (year) setExercice(year[0])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseFec(e.target.result)
        setRows(parsed)
        if (!year && parsed[0]?.ecriture_date) setExercice(parsed[0].ecriture_date.slice(0, 4))
        setStep(2)
      } catch (err) {
        setError(err.message)
      }
    }
    reader.onerror = () => setError('Erreur de lecture du fichier')
    // Try UTF-8 first
    reader.readAsText(file, 'UTF-8')
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
      .from('fec_imports')
      .insert({ meta: JSON.stringify({ societe: societe.trim(), exercice: exercice.trim(), filename: fileName, nb_lignes: rows.length, total_debit: totalDebit, total_credit: totalCredit }) })
      .select('id')
      .single()

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
          <input ref={fileRef} type="file" accept=".txt,.csv,.tsv" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <div className="fec-dropzone-icon">📁</div>
          <p className="fec-dropzone-label">Glissez votre fichier FEC ici</p>
          <p className="fec-dropzone-sub">ou cliquez pour sélectionner · Formats acceptés : .txt, .csv (TAB, pipe ou point-virgule)</p>
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
