import { useState, useMemo } from 'react'
import { useSociete } from '../../contexts/SocieteContext'

function newLine() {
  return { id: Date.now() + Math.random(), desc: '', qte: 1, pu: '', tva: 20 }
}

function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}

function parseN(s) { return parseFloat(String(s).replace(',', '.')) || 0 }

const TVA_RATES = [0, 5.5, 10, 20]

export default function FacturationPage() {
  const { selectedSociete } = useSociete()

  // ── Infos émetteur ──────────────────────────────────────────
  const [emNom,     setEmNom]     = useState(selectedSociete?.name || '')
  const [emAdresse, setEmAdresse] = useState('')
  const [emSiret,   setEmSiret]   = useState('')
  const [emEmail,   setEmEmail]   = useState('')
  const [emTel,     setEmTel]     = useState('')

  // ── Infos client ────────────────────────────────────────────
  const [clNom,     setClNom]     = useState('')
  const [clAdresse, setClAdresse] = useState('')
  const [clSiret,   setClSiret]   = useState('')

  // ── Facture ─────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const [numFac,   setNumFac]   = useState(`FAC-${new Date().getFullYear()}-001`)
  const [dateFac,  setDateFac]  = useState(today)
  const [dateEch,  setDateEch]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [objet,    setObjet]    = useState('')
  const [notes,    setNotes]    = useState('Paiement par virement bancaire.\nIBAN : FR76 XXXX XXXX XXXX XXXX')
  const [lines,    setLines]    = useState([newLine()])
  const [logo,     setLogo]     = useState(null)

  // ── Calculs ─────────────────────────────────────────────────
  const totals = useMemo(() => {
    let ht = 0, tvaMap = {}
    for (const l of lines) {
      const montant = parseN(l.qte) * parseN(l.pu)
      ht += montant
      const tvaAmt = montant * (l.tva / 100)
      tvaMap[l.tva] = (tvaMap[l.tva] || 0) + tvaAmt
    }
    const totalTva = Object.values(tvaMap).reduce((s, v) => s + v, 0)
    return { ht, tvaMap, totalTva, ttc: ht + totalTva }
  }, [lines])

  function updateLine(id, field, val) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))
  }
  function addLine()       { setLines(prev => [...prev, newLine()]) }
  function removeLine(id)  { setLines(prev => prev.filter(l => l.id !== id)) }

  function handleLogo(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handlePrint() { window.print() }

  // ── Rendu ────────────────────────────────────────────────────
  return (
    <div className="fac-page">

      {/* ── FORMULAIRE GAUCHE ── */}
      <div className="fac-form-col">
        <h2 className="fac-section-title">Création de facture</h2>

        {/* Émetteur */}
        <div className="fac-card">
          <div className="fac-card-title">📤 Votre société</div>
          <div className="fac-fields">
            <div className="fac-field fac-field--full">
              <label>Nom / Raison sociale</label>
              <input value={emNom} onChange={e => setEmNom(e.target.value)} placeholder="Ma Société SAS" />
            </div>
            <div className="fac-field fac-field--full">
              <label>Adresse</label>
              <textarea value={emAdresse} onChange={e => setEmAdresse(e.target.value)} rows={2} placeholder="12 rue de la Paix&#10;75001 Paris" />
            </div>
            <div className="fac-field">
              <label>SIRET</label>
              <input value={emSiret} onChange={e => setEmSiret(e.target.value)} placeholder="123 456 789 00012" />
            </div>
            <div className="fac-field">
              <label>Email</label>
              <input value={emEmail} onChange={e => setEmEmail(e.target.value)} placeholder="contact@societe.fr" />
            </div>
            <div className="fac-field">
              <label>Téléphone</label>
              <input value={emTel} onChange={e => setEmTel(e.target.value)} placeholder="+33 1 23 45 67 89" />
            </div>
            <div className="fac-field">
              <label>Logo</label>
              <input type="file" accept="image/*" onChange={handleLogo} style={{ fontSize: '.8rem' }} />
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="fac-card">
          <div className="fac-card-title">📥 Client / Destinataire</div>
          <div className="fac-fields">
            <div className="fac-field fac-field--full">
              <label>Nom / Raison sociale</label>
              <input value={clNom} onChange={e => setClNom(e.target.value)} placeholder="Client SAS" />
            </div>
            <div className="fac-field fac-field--full">
              <label>Adresse</label>
              <textarea value={clAdresse} onChange={e => setClAdresse(e.target.value)} rows={2} placeholder="45 avenue des Champs-Élysées&#10;75008 Paris" />
            </div>
            <div className="fac-field">
              <label>SIRET</label>
              <input value={clSiret} onChange={e => setClSiret(e.target.value)} placeholder="987 654 321 00019" />
            </div>
          </div>
        </div>

        {/* Entête facture */}
        <div className="fac-card">
          <div className="fac-card-title">📄 Facture</div>
          <div className="fac-fields">
            <div className="fac-field">
              <label>N° de facture</label>
              <input value={numFac} onChange={e => setNumFac(e.target.value)} />
            </div>
            <div className="fac-field">
              <label>Objet</label>
              <input value={objet} onChange={e => setObjet(e.target.value)} placeholder="Prestation développement…" />
            </div>
            <div className="fac-field">
              <label>Date d'émission</label>
              <input type="date" value={dateFac} onChange={e => setDateFac(e.target.value)} />
            </div>
            <div className="fac-field">
              <label>Date d'échéance</label>
              <input type="date" value={dateEch} onChange={e => setDateEch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="fac-card">
          <div className="fac-card-title">📋 Prestations / Articles</div>
          <div className="fac-lines-head">
            <span style={{ flex: 1 }}>Description</span>
            <span style={{ width: 56, textAlign: 'center' }}>Qté</span>
            <span style={{ width: 90, textAlign: 'right' }}>P.U. HT</span>
            <span style={{ width: 60, textAlign: 'center' }}>TVA</span>
            <span style={{ width: 90, textAlign: 'right' }}>Total HT</span>
            <span style={{ width: 28 }}></span>
          </div>
          {lines.map(l => (
            <div key={l.id} className="fac-line-row">
              <input className="fac-line-input" style={{ flex: 1 }} value={l.desc}
                onChange={e => updateLine(l.id, 'desc', e.target.value)} placeholder="Développement feature X…" />
              <input className="fac-line-input" style={{ width: 56, textAlign: 'center' }} value={l.qte}
                onChange={e => updateLine(l.id, 'qte', e.target.value)} type="number" min="0" step="0.5" />
              <input className="fac-line-input" style={{ width: 90, textAlign: 'right' }} value={l.pu}
                onChange={e => updateLine(l.id, 'pu', e.target.value)} placeholder="0,00" />
              <select className="fac-line-input" style={{ width: 60, textAlign: 'center' }} value={l.tva}
                onChange={e => updateLine(l.id, 'tva', +e.target.value)}>
                {TVA_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
              <span className="fac-line-total" style={{ width: 90 }}>
                {fmtE(parseN(l.qte) * parseN(l.pu))}
              </span>
              <button className="fac-line-del" onClick={() => removeLine(l.id)}
                disabled={lines.length === 1} title="Supprimer">✕</button>
            </div>
          ))}
          <button className="btn-secondary" style={{ marginTop: '.5rem', fontSize: '.8rem' }} onClick={addLine}>
            + Ajouter une ligne
          </button>
        </div>

        {/* Notes */}
        <div className="fac-card">
          <div className="fac-card-title">📝 Notes / Mentions légales</div>
          <textarea className="fac-notes-input" value={notes}
            onChange={e => setNotes(e.target.value)} rows={4} />
        </div>
      </div>

      {/* ── PRÉVISUALISATION DROITE ── */}
      <div className="fac-preview-col">
        <div className="fac-preview-header">
          <span className="fac-preview-label">Prévisualisation</span>
          <button className="btn-primary" style={{ fontSize: '.8rem' }} onClick={handlePrint}>🖨 Imprimer / PDF</button>
        </div>

        <div className="fac-preview" id="fac-printable">

          {/* En-tête facture */}
          <div className="fac-p-header">
            <div className="fac-p-emetteur">
              {logo && <img src={logo} alt="logo" className="fac-p-logo" />}
              <div className="fac-p-em-name">{emNom || 'Votre société'}</div>
              {emAdresse && <div className="fac-p-em-addr">{emAdresse.split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}</div>}
              {emSiret   && <div className="fac-p-em-detail">SIRET : {emSiret}</div>}
              {emEmail   && <div className="fac-p-em-detail">{emEmail}</div>}
              {emTel     && <div className="fac-p-em-detail">{emTel}</div>}
            </div>
            <div className="fac-p-facture-box">
              <div className="fac-p-facture-title">FACTURE</div>
              <div className="fac-p-facture-num">{numFac}</div>
              <div className="fac-p-facture-meta">
                <span>Émise le</span>
                <strong>{new Date(dateFac).toLocaleDateString('fr-FR')}</strong>
              </div>
              <div className="fac-p-facture-meta">
                <span>Échéance</span>
                <strong>{new Date(dateEch).toLocaleDateString('fr-FR')}</strong>
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <div className="fac-p-destinataire">
            <div className="fac-p-dest-label">Facturé à</div>
            <div className="fac-p-dest-name">{clNom || 'Nom du client'}</div>
            {clAdresse && <div className="fac-p-dest-addr">{clAdresse.split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}</div>}
            {clSiret   && <div className="fac-p-dest-detail">SIRET : {clSiret}</div>}
          </div>

          {objet && <div className="fac-p-objet">Objet : <strong>{objet}</strong></div>}

          {/* Tableau lignes */}
          <table className="fac-p-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: 50, textAlign: 'center' }}>Qté</th>
                <th style={{ width: 90, textAlign: 'right' }}>P.U. HT</th>
                <th style={{ width: 55, textAlign: 'center' }}>TVA</th>
                <th style={{ width: 90, textAlign: 'right' }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className={i % 2 === 0 ? 'fac-p-row-even' : ''}>
                  <td>{l.desc || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ textAlign: 'center' }}>{l.qte}</td>
                  <td style={{ textAlign: 'right' }}>{l.pu ? fmtE(parseN(l.pu)) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{l.tva}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtE(parseN(l.qte) * parseN(l.pu))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="fac-p-totaux">
            <div className="fac-p-total-row">
              <span>Total HT</span>
              <span>{fmtE(totals.ht)}</span>
            </div>
            {Object.entries(totals.tvaMap).filter(([,v]) => v > 0).map(([rate, amt]) => (
              <div key={rate} className="fac-p-total-row">
                <span>TVA {rate}%</span>
                <span>{fmtE(amt)}</span>
              </div>
            ))}
            <div className="fac-p-total-row fac-p-total-ttc">
              <span>TOTAL TTC</span>
              <span>{fmtE(totals.ttc)}</span>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="fac-p-notes">
              {notes.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="fac-p-footer">
            {emNom} {emSiret ? `· SIRET ${emSiret}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
