import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const TARGETS = [
  { id: 'contacts', label: 'Contacts CRM', icon: '👤', fields: ['nom', 'prenom', 'email', 'telephone', 'poste', 'entreprise'] },
  { id: 'clients', label: 'Entreprises', icon: '🏢', fields: ['name', 'ville', 'siret'] },
  { id: 'leads', label: 'Leads', icon: '🚀', fields: ['titre', 'source', 'phase', 'montant_estime', 'contact', 'entreprise'] },
]

function parseCSV(text) {
  const sep = text.includes(';') ? ';' : ','
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
  return { headers, rows }
}

export default function ImportPage() {
  const [target, setTarget] = useState('contacts')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [step, setStep] = useState(1) // 1=upload, 2=mapping, 3=preview, 4=done
  const fileRef = useRef()

  const targetDef = TARGETS.find(t => t.id === target)

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = parseCSV(ev.target.result)
      setParsed(data)
      // Auto-map by similar names
      const autoMap = {}
      targetDef.fields.forEach(field => {
        const match = data.headers.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, '') === field.toLowerCase().replace(/[_\s-]/g, '') ||
          h.toLowerCase().includes(field.toLowerCase()) ||
          field.toLowerCase().includes(h.toLowerCase())
        )
        if (match) autoMap[field] = match
      })
      setMapping(autoMap)
      setStep(2)
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function handleImport() {
    if (!parsed?.rows?.length) return
    setImporting(true); setResult(null)
    let inserted = 0, errors = 0

    for (const row of parsed.rows) {
      const record = {
}

      if (target === 'contacts') {
        record.nom = row[mapping.nom] || ''
        record.prenom = row[mapping.prenom] || ''
        record.email = row[mapping.email] || null
        record.telephone = row[mapping.telephone] || null
        record.poste = row[mapping.poste] || null
        if (!record.nom) { errors++; continue }
        // Try to match entreprise
        if (mapping.entreprise && row[mapping.entreprise]) {
          const { data } = await supabase.from('clients').select('id').ilike('name', `%${row[mapping.entreprise]}%`).limit(1)
          if (data?.length) record.entreprise_id = data[0].id
        }
        const { error } = await supabase.from('contacts').insert(record)
        if (error) errors++; else inserted++
      }

      if (target === 'clients') {
        record.name = row[mapping.name] || ''
        record.ville = row[mapping.ville] || null
        if (!record.name) { errors++; continue }
        const { error } = await supabase.from('clients').insert(record)
        if (error) errors++; else inserted++
      }

      if (target === 'leads') {
        record.titre = row[mapping.titre] || ''
        record.source = row[mapping.source] || 'autre'
        record.phase = row[mapping.phase] || 'nouveau'
        record.montant_estime = parseFloat(String(row[mapping.montant_estime] || '0').replace(',', '.')) || 0
        if (!record.titre) { errors++; continue }
        // Match contact
        if (mapping.contact && row[mapping.contact]) {
          const { data } = await supabase.from('contacts').select('id').ilike('nom', `%${row[mapping.contact]}%`).limit(1)
          if (data?.length) record.contact_id = data[0].id
        }
        // Match entreprise
        if (mapping.entreprise && row[mapping.entreprise]) {
          const { data } = await supabase.from('clients').select('id').ilike('name', `%${row[mapping.entreprise]}%`).limit(1)
          if (data?.length) record.entreprise_id = data[0].id
        }
        const { error } = await supabase.from('leads').insert(record)
        if (error) errors++; else inserted++
      }
    }

    setResult({ inserted, errors, total: parsed.rows.length })
    setImporting(false)
    setStep(4)
  }

  function reset() {
    setFile(null); setParsed(null); setMapping({}); setResult(null); setStep(1)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>📥 Import manuel</h1>
          <p>Importez vos données depuis un fichier CSV</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem' }}>
        {[
          { n: 1, label: 'Fichier' },
          { n: 2, label: 'Mapping' },
          { n: 3, label: 'Aperçu' },
          { n: 4, label: 'Résultat' },
        ].map(s => (
          <div key={s.n} style={{
            flex: 1, padding: '.6rem', textAlign: 'center', fontSize: '.82rem', fontWeight: step >= s.n ? 700 : 400,
            background: step >= s.n ? 'var(--primary)' : 'var(--border)',
            color: step >= s.n ? '#fff' : 'var(--text-muted)',
            borderRadius: s.n === 1 ? '8px 0 0 8px' : s.n === 4 ? '0 8px 8px 0' : 0}}>
            {s.n}. {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: File upload */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📄</div>
          <h3 style={{ marginBottom: '.5rem' }}>Choisir le type de données</h3>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {TARGETS.map(t => (
              <button key={t.id} onClick={() => setTarget(t.id)}
                className={target === t.id ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '.85rem' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '.85rem' }}>
            Format CSV (séparateur point-virgule ou virgule). Première ligne = en-têtes.
          </p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '.8rem' }}>
            Colonnes attendues : <strong>{targetDef.fields.join(', ')}</strong>
          </p>
          <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
            📎 Choisir un fichier CSV
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && parsed && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '.5rem' }}>🔗 Mapping des colonnes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: '1rem' }}>
            Fichier : <strong>{file?.name}</strong> — {parsed.rows.length} lignes détectées
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', maxWidth: 500 }}>
            {targetDef.fields.map(field => (
              <div key={field} style={{ display: 'contents' }}>
                <label style={{ fontWeight: 600, fontSize: '.85rem', padding: '.4rem 0' }}>{field}</label>
                <select value={mapping[field] || ''} onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{ padding: '.4rem .5rem', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '.85rem' }}>
                  <option value="">— Ignorer —</option>
                  {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.25rem' }}>
            <button className="btn-secondary" onClick={reset}>← Retour</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Aperçu →</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsed && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '.75rem' }}>👁 Aperçu des {Math.min(5, parsed.rows.length)} premières lignes</h3>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table className="users-table" style={{ margin: 0 }}>
              <thead>
                <tr>{targetDef.fields.filter(f => mapping[f]).map(f => <th key={f}>{f}</th>)}</tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {targetDef.fields.filter(f => mapping[f]).map(f => (
                      <td key={f} style={{ fontSize: '.85rem' }}>{row[mapping[f]] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: '.75rem' }}>
            {parsed.rows.length} lignes seront importées dans <strong>{targetDef.label}</strong>
          </p>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>← Mapping</button>
            <button className="btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? '⏳ Import en cours…' : `🚀 Importer ${parsed.rows.length} lignes`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>{result.errors === 0 ? '✅' : '⚠️'}</div>
          <h3 style={{ marginBottom: '.75rem' }}>Import terminé</h3>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#22c55e' }}>{result.inserted}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>importées</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{result.errors}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>erreurs</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{result.total}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>total</div>
            </div>
          </div>
          <button className="btn-primary" onClick={reset}>🔄 Nouvel import</button>
        </div>
      )}
    </div>
  )
}
