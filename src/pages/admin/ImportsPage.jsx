import { useState, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import * as XLSX from 'xlsx'

// ── Tables importables et leurs colonnes attendues ───────────────────────────
const TABLES = [
  {
    id: 'clients', label: 'Clients', icon: '👤',
    columns: ['name', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'pays', 'siren', 'notes'],
    required: ['name'],
    descriptions: { name: 'Nom du client', email: 'Email', telephone: 'Téléphone', adresse: 'Adresse', ville: 'Ville', code_postal: 'Code postal', pays: 'Pays', siren: 'N° SIREN', notes: 'Notes' },
  },
  {
    id: 'contacts', label: 'Contacts CRM', icon: '📇',
    columns: ['nom', 'prenom', 'email', 'telephone', 'entreprise', 'poste', 'source', 'notes'],
    required: ['nom'],
    descriptions: { nom: 'Nom de famille', prenom: 'Prénom', email: 'Email', telephone: 'Téléphone', entreprise: 'Nom entreprise', poste: 'Poste / Fonction', source: 'Source (web, salon, etc.)', notes: 'Notes' },
  },
  {
    id: 'produits', label: 'Produits', icon: '🏷️',
    columns: ['reference', 'nom', 'description', 'categorie', 'prix_ht', 'taux_tva', 'unite', 'actif'],
    required: ['nom'],
    descriptions: { reference: 'Référence produit', nom: 'Nom', description: 'Description', categorie: 'Catégorie', prix_ht: 'Prix HT (€)', taux_tva: 'Taux TVA (%)', unite: 'Unité (h, jour, licence…)', actif: 'Actif (oui/non)' },
  },
  {
    id: 'transactions', label: 'Transactions', icon: '💼',
    columns: ['name', 'phase', 'montant', 'date_fermeture_prevue', 'notes'],
    required: ['name'],
    descriptions: { name: 'Nom de la transaction', phase: 'Phase (qualification, short_list, ferme_a_gagner, ferme, perdu)', montant: 'Montant (€)', date_fermeture_prevue: 'Date fermeture prévue (JJ/MM/AAAA)', notes: 'Notes' },
  },
  {
    id: 'achats', label: 'Achats', icon: '🛒',
    columns: ['fournisseur', 'description', 'montant_ht', 'taux_tva', 'date_achat', 'categorie', 'statut', 'notes'],
    required: ['fournisseur', 'montant_ht'],
    descriptions: { fournisseur: 'Nom du fournisseur', description: 'Description', montant_ht: 'Montant HT', taux_tva: 'Taux TVA (%)', date_achat: 'Date achat (JJ/MM/AAAA)', categorie: 'Catégorie', statut: 'Statut (en_attente, payé, annulé)', notes: 'Notes' },
  },
  {
    id: 'abonnements', label: 'Abonnements', icon: '🔄',
    columns: ['nom', 'montant', 'frequence', 'date_debut', 'date_fin', 'statut', 'notes'],
    required: ['nom', 'montant'],
    descriptions: { nom: 'Nom abonnement', montant: 'Montant (€)', frequence: 'Fréquence (mensuel, trimestriel, annuel)', date_debut: 'Date début', date_fin: 'Date fin', statut: 'Statut (actif, suspendu, résilié)', notes: 'Notes' },
  },
  {
    id: 'profiles', label: 'Collaborateurs (profiles)', icon: '👥',
    columns: ['full_name', 'email', 'role', 'telephone', 'poste', 'date_embauche', 'departement', 'localisation'],
    required: ['full_name'],
    descriptions: { full_name: 'Nom complet', email: 'Email (lecture seule si existant)', role: 'Rôle (collaborateur, manager, comptable, admin)', telephone: 'Téléphone', poste: 'Poste / Fonction', date_embauche: 'Date embauche', departement: 'Département', localisation: 'Localisation / Site' },
  },
]

// ── Parseur CSV/XLSX ─────────────────────────────────────────────────────────
function parseNum(s) {
  if (s === null || s === undefined || s === '') return null
  if (typeof s === 'number') return s
  return parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.')) || null
}

function parseDate(s) {
  if (!s) return null
  const str = String(s).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  return str
}

function parseBool(s) {
  if (s === true || s === false) return s
  const v = String(s).trim().toLowerCase()
  return ['oui', 'yes', 'true', '1', 'vrai', 'actif'].includes(v)
}

function detectSep(line) {
  const tabs  = (line.match(/\t/g) || []).length
  const semis = (line.match(/;/g)  || []).length
  const commas = (line.match(/,/g) || []).length
  if (tabs >= semis && tabs >= commas) return '\t'
  if (semis >= commas) return ';'
  return ','
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = detectSep(lines[0])
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  })
  return { headers, rows }
}

function parseXLSX(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const headers = data.length > 0 ? Object.keys(data[0]) : []
  return { headers, rows: data }
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function ImportsPage() {
  const { selectedSociete } = useSociete()
  const [selectedTable, setSelectedTable] = useState(null)
  const [step, setStep] = useState('select') // select → upload → mapping → preview → done
  const [fileData, setFileData] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})     // fileHeader → tableColumn
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const table = TABLES.find(t => t.id === selectedTable)

  // ── Télécharger template CSV ──
  function downloadTemplate() {
    if (!table) return
    const header = table.columns.join(';')
    const descriptions = table.columns.map(c => table.descriptions[c] || c).join(';')
    const csv = header + '\n' + descriptions + '\n'
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template_${table.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Upload fichier ──
  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(null)
    try {
      let parsed
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        parsed = parseXLSX(buf)
      } else {
        const text = await file.text()
        parsed = parseCSV(text)
      }
      if (parsed.rows.length === 0) { setError('Fichier vide ou format non reconnu.'); return }
      setFileData(parsed)

      // Auto-mapping
      const autoMap = {}
      parsed.headers.forEach(fh => {
        const norm = fh.toLowerCase().replace(/[\s_\-]/g, '').replace(/é|è|ê/g, 'e')
        const match = table.columns.find(tc => {
          const tn = tc.toLowerCase().replace(/[\s_\-]/g, '')
          return norm === tn || norm.includes(tn) || tn.includes(norm)
        })
        if (match) autoMap[fh] = match
      })
      setMapping(autoMap)
      setStep('mapping')
    } catch (err) {
      setError('Erreur de lecture : ' + err.message)
    }
  }

  // ── Preview ──
  const previewRows = useMemo(() => {
    if (!fileData || !table) return []
    return fileData.rows.slice(0, 10).map(row => {
      const mapped = {}
      Object.entries(mapping).forEach(([fh, tc]) => {
        if (tc) mapped[tc] = row[fh]
      })
      return mapped
    })
  }, [fileData, mapping, table])

  // ── Import ──
  async function handleImport() {
    if (!fileData || !table) return
    setImporting(true)
    setError(null)
    setResult(null)

    const rows = fileData.rows.map(row => {
      const obj = {}
      Object.entries(mapping).forEach(([fh, tc]) => {
        if (!tc) return
        let val = row[fh]
        // Type coercion
        if (['montant', 'montant_ht', 'prix_ht', 'taux_tva'].includes(tc)) val = parseNum(val)
        else if (['date_fermeture_prevue', 'date_achat', 'date_debut', 'date_fin', 'date_embauche'].includes(tc)) val = parseDate(val)
        else if (['actif'].includes(tc)) val = parseBool(val)
        else val = val || null
        obj[tc] = val
      })
      // Auto-add societe_id if applicable
      if (selectedSociete?.id && !obj.societe_id && table.id !== 'profiles') {
        obj.societe_id = selectedSociete.id
      }
      return obj
    }).filter(r => {
      // Check required fields
      return table.required.every(req => r[req])
    })

    if (rows.length === 0) {
      setError('Aucune ligne valide à importer (champs requis manquants).')
      setImporting(false)
      return
    }

    // Batch insert (max 500 at a time)
    let inserted = 0, errors = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error: err } = await supabase.from(table.id).insert(batch)
      if (err) { errors += batch.length; console.error(err) }
      else inserted += batch.length
    }

    setImporting(false)
    setResult({ inserted, errors, total: fileData.rows.length, skipped: fileData.rows.length - rows.length })
    setStep('done')
  }

  function reset() {
    setSelectedTable(null)
    setStep('select')
    setFileData(null)
    setMapping({})
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>📥 Import de données</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            Importez des données dans n'importe quelle table depuis un fichier CSV ou Excel.
          </p>
        </div>
        {step !== 'select' && (
          <button className="btn-secondary" onClick={reset}>← Recommencer</button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '.9rem' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* ── Étape 1 : Choix de la table ── */}
      {step === 'select' && (
        <div className="import-table-grid">
          {TABLES.map(t => (
            <div
              key={t.id}
              className={`import-table-card ${selectedTable === t.id ? 'import-table-card--selected' : ''}`}
              onClick={() => setSelectedTable(t.id)}
            >
              <span className="import-table-icon">{t.icon}</span>
              <div>
                <strong>{t.label}</strong>
                <span className="import-table-cols">{t.columns.length} colonnes</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'select' && selectedTable && table && (
        <div className="import-selected-info">
          <div className="import-selected-header">
            <span>{table.icon} <strong>{table.label}</strong> — colonnes attendues :</span>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn-secondary" onClick={downloadTemplate}>
                📄 Télécharger le template CSV
              </button>
              <button className="btn-primary" onClick={() => { setStep('upload') }}>
                Continuer →
              </button>
            </div>
          </div>
          <div className="import-cols-list">
            {table.columns.map(c => (
              <div key={c} className="import-col-chip">
                <code>{c}</code>
                <span>{table.descriptions[c]}</span>
                {table.required.includes(c) && <span className="import-col-req">requis</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Étape 2 : Upload fichier ── */}
      {step === 'upload' && table && (
        <div className="import-upload-zone">
          <div className="import-upload-inner">
            <span style={{ fontSize: '3rem' }}>📁</span>
            <h3>Glissez votre fichier ou cliquez pour sélectionner</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>
              Formats acceptés : .csv, .xlsx, .xls — Séparateurs : virgule, point-virgule, tabulation
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              style={{ marginTop: '1rem' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: '.5rem' }}>
              💡 Pas de fichier ? <button className="btn-link" onClick={downloadTemplate}>Téléchargez le template CSV</button>
            </p>
          </div>
        </div>
      )}

      {/* ── Étape 3 : Mapping des colonnes ── */}
      {step === 'mapping' && table && fileData && (
        <>
          <div className="import-mapping-header">
            <h2>Correspondance des colonnes</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>
              {fileData.rows.length} lignes détectées. Associez chaque colonne de votre fichier à un champ de la table <strong>{table.label}</strong>.
            </p>
          </div>
          <div className="import-mapping-grid">
            {fileData.headers.map(fh => (
              <div key={fh} className="import-mapping-row">
                <span className="import-mapping-file-col">📄 {fh}</span>
                <span className="import-mapping-arrow">→</span>
                <select
                  className="import-mapping-select"
                  value={mapping[fh] || ''}
                  onChange={e => setMapping(m => ({ ...m, [fh]: e.target.value }))}
                >
                  <option value="">— Ignorer —</option>
                  {table.columns.map(tc => (
                    <option key={tc} value={tc}>
                      {tc} {table.required.includes(tc) ? '*' : ''} ({table.descriptions[tc]})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '.5rem' }}>Aperçu (10 premières lignes)</h3>
              <div className="users-table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="users-table" style={{ fontSize: '.78rem' }}>
                  <thead>
                    <tr>
                      {Object.values(mapping).filter(Boolean).map(tc => (
                        <th key={tc}>{tc}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(mapping).filter(Boolean).map(tc => (
                          <td key={tc}>{row[tc] != null ? String(row[tc]) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setStep('upload')}>← Retour</button>
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={importing || Object.values(mapping).filter(Boolean).length === 0}
            >
              {importing ? 'Import en cours...' : `Importer ${fileData.rows.length} lignes`}
            </button>
          </div>
        </>
      )}

      {/* ── Étape 4 : Résultat ── */}
      {step === 'done' && result && (
        <div className="import-result">
          <div className="import-result-icon">✅</div>
          <h2>Import terminé</h2>
          <div className="import-result-stats">
            <div className="import-result-stat">
              <span className="import-result-value" style={{ color: '#16a34a' }}>{result.inserted}</span>
              <span>lignes importées</span>
            </div>
            {result.skipped > 0 && (
              <div className="import-result-stat">
                <span className="import-result-value" style={{ color: '#f59e0b' }}>{result.skipped}</span>
                <span>lignes ignorées</span>
              </div>
            )}
            {result.errors > 0 && (
              <div className="import-result-stat">
                <span className="import-result-value" style={{ color: '#dc2626' }}>{result.errors}</span>
                <span>erreurs</span>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={reset} style={{ marginTop: '1.5rem' }}>
            Nouvel import
          </button>
        </div>
      )}
    </div>
  )
}
