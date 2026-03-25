import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import { generateInvoicePDF } from '../../lib/pdfGenerator'
import InvoiceDistributionModal from '../../components/InvoiceDistributionModal'
import { getDistributionHistory } from '../../lib/invoiceDistribution'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

// ── Helpers ───────────────────────────────────────────────────
function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}
function parseN(s) { return parseFloat(String(s).replace(',', '.')) || 0 }
function newLine() { return { id: Date.now() + Math.random(), desc: '', qte: 1, pu: '', tva: 20 } }
const TVA_RATES = [0, 5.5, 10, 20]
const STATUTS = [
  { id: 'brouillon', label: 'Brouillon',  color: '#94a3b8', bg: '#f1f5f9' },
  { id: 'envoyee',   label: 'Envoyée',    color: '#f59e0b', bg: '#fffbeb' },
  { id: 'payee',     label: 'Payée',      color: '#22c55e', bg: '#f0fdf4' },
  { id: 'retard',    label: 'En retard',  color: '#ef4444', bg: '#fef2f2' },
]
function statutMeta(s) { return STATUTS.find(x => x.id === s) || STATUTS[0] }

// ── Prévisualisation A4 ───────────────────────────────────────
// Dimensions de référence : A4 à 96dpi → 794 × 1123 px
const A4_W = 794
const A4_H = 1123
const PAD  = 20   // marge intérieure du conteneur gris

function InvoicePreview({ fac }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const w = el.offsetWidth  - PAD * 2
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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
        <div>Sélectionnez une facture<br />pour la prévisualiser</div>
      </div>
    </div>
  )

  const lignes = typeof fac.lignes === 'string' ? JSON.parse(fac.lignes || '[]') : (fac.lignes || [])
  const tvaMap = {}
  for (const l of lignes) {
    const t = parseN(l.qte) * parseN(l.pu || 0)
    tvaMap[l.tva] = (tvaMap[l.tva] || 0) + t * (l.tva / 100)
  }
  const sm = statutMeta(fac.statut)

  return (
    <div ref={containerRef} className="fac-a4-container">
      {/* Wrapper dimensionné exactement au scale calculé */}
      <div
        className="fac-a4-wrap"
        style={{ width: A4_W * scale, height: A4_H * scale }}
      >
        {/* Page intérieure à taille fixe, scalée depuis le coin supérieur gauche */}
        <div
          className="fac-a4-paper"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
        {/* ── En-tête émetteur / facture ── */}
        <div className="fac-p-header">
          <div className="fac-p-emetteur">
            <div className="fac-p-em-name">{fac.emetteur_nom}</div>
            {fac.emetteur_adresse && <div className="fac-p-em-addr">{fac.emetteur_adresse.split('\n').map((l,i)=><span key={i}>{l}<br/></span>)}</div>}
            {fac.emetteur_siret && <div className="fac-p-em-detail">SIRET : {fac.emetteur_siret}</div>}
            {fac.emetteur_email && <div className="fac-p-em-detail">{fac.emetteur_email}</div>}
          </div>
          <div className="fac-p-facture-box">
            <div className="fac-p-facture-title">FACTURE</div>
            <div className="fac-p-facture-num">{fac.num_facture}</div>
            <div className="fac-p-facture-meta"><span>Émise le</span><strong>{new Date(fac.date_emission).toLocaleDateString('fr-FR')}</strong></div>
            <div className="fac-p-facture-meta"><span>Échéance</span><strong>{new Date(fac.date_echeance).toLocaleDateString('fr-FR')}</strong></div>
            <div style={{ marginTop: '.5rem', textAlign: 'right' }}>
              <span style={{ background: sm.bg, color: sm.color, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{sm.label}</span>
            </div>
          </div>
        </div>

        {/* ── Destinataire ── */}
        <div className="fac-p-destinataire">
          <div className="fac-p-dest-label">Facturé à</div>
          <div className="fac-p-dest-name">{fac.client_nom}</div>
          {fac.client_adresse && <div className="fac-p-dest-addr">{fac.client_adresse.split('\n').map((l,i)=><span key={i}>{l}<br/></span>)}</div>}
          {fac.client_siret && <div className="fac-p-dest-detail">SIRET : {fac.client_siret}</div>}
        </div>

        {fac.objet && <div className="fac-p-objet">Objet : <strong>{fac.objet}</strong></div>}

        {/* ── Lignes ── */}
        <table className="fac-p-table">
          <thead><tr>
            <th>Description</th>
            <th style={{width:60,textAlign:'center'}}>Qté</th>
            <th style={{width:100,textAlign:'right'}}>P.U. HT</th>
            <th style={{width:60,textAlign:'center'}}>TVA</th>
            <th style={{width:110,textAlign:'right'}}>Total HT</th>
          </tr></thead>
          <tbody>{lignes.map((l,i) => (
            <tr key={i} className={i%2===0?'fac-p-row-even':''}>
              <td>{l.desc}</td>
              <td style={{textAlign:'center'}}>{l.qte}</td>
              <td style={{textAlign:'right'}}>{fmtE(parseN(l.pu))}</td>
              <td style={{textAlign:'center'}}>{l.tva}%</td>
              <td style={{textAlign:'right',fontWeight:600}}>{fmtE(l.montant || parseN(l.qte)*parseN(l.pu))}</td>
            </tr>
          ))}</tbody>
        </table>

        {/* ── Totaux ── */}
        <div className="fac-p-totaux">
          <div className="fac-p-total-row"><span>Total HT</span><span>{fmtE(fac.total_ht)}</span></div>
          {Object.entries(tvaMap).filter(([,v])=>v>0).map(([r,v])=>(
            <div key={r} className="fac-p-total-row"><span>TVA {r}%</span><span>{fmtE(v)}</span></div>
          ))}
          <div className="fac-p-total-row fac-p-total-ttc"><span>TOTAL TTC</span><span>{fmtE(fac.total_ttc)}</span></div>
        </div>

        {fac.notes && <div className="fac-p-notes">{fac.notes.split('\n').map((l,i)=><div key={i}>{l}</div>)}</div>}

        {/* ── Pied de page collé en bas ── */}
        <div className="fac-p-footer">{fac.emetteur_nom}{fac.emetteur_siret ? ` · SIRET ${fac.emetteur_siret}` : ''}</div>
        </div>
      </div>
    </div>
  )
}

// ── Modal création/édition ────────────────────────────────────
function FactureModal({ facture, societe, onSave, onClose }) {
  const isNew = !facture?.id
  const today = new Date().toISOString().slice(0,10)
  const [emNom,     setEmNom]     = useState(facture?.emetteur_nom    || societe?.name || '')
  const [emSiret,   setEmSiret]   = useState(facture?.emetteur_siret  || '')
  const [emEmail,   setEmEmail]   = useState(facture?.emetteur_email  || '')
  const [clNom,     setClNom]     = useState(facture?.client_nom      || '')
  const [clAdresse, setClAdresse] = useState(facture?.client_adresse  || '')
  const [clSiret,   setClSiret]   = useState(facture?.client_siret    || '')
  const [numFac,    setNumFac]    = useState(facture?.num_facture      || `FAC-${new Date().getFullYear()}-001`)
  const [dateFac,   setDateFac]   = useState(facture?.date_emission   || today)
  const [dateEch,   setDateEch]   = useState(facture?.date_echeance   || (() => { const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().slice(0,10) })())
  const [objet,     setObjet]     = useState(facture?.objet           || '')
  const [statut,    setStatut]    = useState(facture?.statut          || 'brouillon')
  const [notes,     setNotes]     = useState(facture?.notes           || 'Paiement par virement bancaire.\nMerci de mentionner le numéro de facture.')
  const [lines,     setLines]     = useState(() => {
    const l = typeof facture?.lignes === 'string' ? JSON.parse(facture?.lignes||'[]') : (facture?.lignes||[])
    return l.length ? l.map(x=>({...x, id:Math.random()})) : [newLine()]
  })
  const [saving, setSaving] = useState(false)

  const totals = useMemo(() => {
    let ht=0, tvaTotal=0
    for (const l of lines) { const m=parseN(l.qte)*parseN(l.pu); ht+=m; tvaTotal+=m*(l.tva/100) }
    return { ht, ttc: ht+tvaTotal }
  }, [lines])

  function updateLine(id, field, val) {
    setLines(prev => prev.map(l => l.id===id ? {...l,[field]:val} : l))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const lignes = lines.filter(l=>l.desc||parseN(l.pu)).map(({id,...l})=>({
      ...l, montant: Math.round(parseN(l.qte)*parseN(l.pu)*100)/100
    }))
    const payload = {
      societe_id: societe?.id, num_facture: numFac, date_emission: dateFac,
      date_echeance: dateEch, statut, client_nom: clNom, client_adresse: clAdresse,
      client_siret: clSiret, objet, emetteur_nom: emNom, emetteur_siret: emSiret,
      emetteur_email: emEmail, lignes: JSON.stringify(lignes), notes,
      total_ht: Math.round(totals.ht*100)/100,
      total_ttc: Math.round(totals.ttc*100)/100,
    }
    if (isNew) {
      const { data } = await supabase.from('factures').insert(payload).select().single()
      onSave(data)
    } else {
      await supabase.from('factures').update(payload).eq('id', facture.id)
      onSave({ ...facture, ...payload })
    }
    setSaving(false)
  }

  return (
    <div className="plan-modal-overlay" onClick={onClose}>
      <div className="fac-modal" onClick={e=>e.stopPropagation()}>
        <div className="plan-modal-header">
          <h3>{isNew ? 'Nouvelle facture' : `Modifier ${facture.num_facture}`}</h3>
          <button className="plan-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} className="fac-modal-body">
          <div className="fac-modal-cols">
            {/* Émetteur */}
            <div>
              <div className="fac-card-title">📤 Émetteur</div>
              <div className="fac-fields" style={{gridTemplateColumns:'1fr'}}>
                <div className="fac-field"><label>Nom société</label><input value={emNom} onChange={e=>setEmNom(e.target.value)} /></div>
                <div className="fac-field"><label>SIRET</label><input value={emSiret} onChange={e=>setEmSiret(e.target.value)} /></div>
                <div className="fac-field"><label>Email</label><input value={emEmail} onChange={e=>setEmEmail(e.target.value)} /></div>
              </div>
            </div>
            {/* Client */}
            <div>
              <div className="fac-card-title">📥 Client</div>
              <div className="fac-fields" style={{gridTemplateColumns:'1fr'}}>
                <div className="fac-field"><label>Nom client</label><input value={clNom} onChange={e=>setClNom(e.target.value)} required /></div>
                <div className="fac-field"><label>Adresse</label><textarea value={clAdresse} onChange={e=>setClAdresse(e.target.value)} rows={2} /></div>
                <div className="fac-field"><label>SIRET</label><input value={clSiret} onChange={e=>setClSiret(e.target.value)} /></div>
              </div>
            </div>
          </div>

          {/* En-tête */}
          <div className="fac-fields" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'.5rem', margin:'.75rem 0'}}>
            <div className="fac-field"><label>N° facture</label><input value={numFac} onChange={e=>setNumFac(e.target.value)} required /></div>
            <div className="fac-field"><label>Objet</label><input value={objet} onChange={e=>setObjet(e.target.value)} /></div>
            <div className="fac-field"><label>Date émission</label><input type="date" value={dateFac} onChange={e=>setDateFac(e.target.value)} /></div>
            <div className="fac-field"><label>Échéance</label><input type="date" value={dateEch} onChange={e=>setDateEch(e.target.value)} /></div>
          </div>
          <div className="fac-field" style={{marginBottom:'.75rem', maxWidth:160}}>
            <label>Statut</label>
            <select value={statut} onChange={e=>setStatut(e.target.value)}>
              {STATUTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Lignes */}
          <div className="fac-card-title" style={{marginBottom:'.4rem'}}>📋 Lignes</div>
          <div className="fac-lines-head">
            <span style={{flex:1}}>Description</span>
            <span style={{width:56,textAlign:'center'}}>Qté</span>
            <span style={{width:90,textAlign:'right'}}>P.U. HT</span>
            <span style={{width:60,textAlign:'center'}}>TVA</span>
            <span style={{width:90,textAlign:'right'}}>Total HT</span>
            <span style={{width:28}}></span>
          </div>
          {lines.map(l=>(
            <div key={l.id} className="fac-line-row">
              <input className="fac-line-input" style={{flex:1}} value={l.desc} onChange={e=>updateLine(l.id,'desc',e.target.value)} placeholder="Description…" />
              <input className="fac-line-input" style={{width:56,textAlign:'center'}} value={l.qte} onChange={e=>updateLine(l.id,'qte',e.target.value)} type="number" min="0" step="0.5" />
              <input className="fac-line-input" style={{width:90,textAlign:'right'}} value={l.pu} onChange={e=>updateLine(l.id,'pu',e.target.value)} placeholder="0,00" />
              <select className="fac-line-input" style={{width:60}} value={l.tva} onChange={e=>updateLine(l.id,'tva',+e.target.value)}>
                {TVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
              </select>
              <span className="fac-line-total" style={{width:90}}>{fmtE(parseN(l.qte)*parseN(l.pu))}</span>
              <button type="button" className="fac-line-del" onClick={()=>setLines(p=>p.filter(x=>x.id!==l.id))} disabled={lines.length===1}>✕</button>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'.5rem'}}>
            <button type="button" className="btn-secondary" style={{fontSize:'.8rem'}} onClick={()=>setLines(p=>[...p,newLine()])}>+ Ligne</button>
            <div style={{fontSize:'.85rem',fontWeight:700}}>HT : {fmtE(totals.ht)} · TTC : {fmtE(totals.ttc)}</div>
          </div>

          <div className="fac-field" style={{marginTop:'.75rem'}}>
            <label>Notes</label>
            <textarea className="fac-notes-input" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} />
          </div>

          <div className="plan-modal-actions" style={{marginTop:'1rem'}}>
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Enregistrement…':'💾 Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function FacturationPage() {
  const { selectedSociete } = useSociete()
  const [factures, setFactures]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [modal, setModal]             = useState(null)  // null | 'new' | facture
  const [search, setSearch]           = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage]               = useState(1)
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  const [companyData, setCompanyData] = useState(null)
  const PAGE_SIZE = 50

  function loadFactures(keepSelection = false) {
    if (!selectedSociete?.id) { setFactures([]); setLoading(false); return }
    setLoading(true)
    supabase.from('factures').select('*')
      .eq('societe_id', selectedSociete.id)
      .order('date_emission', { ascending: false })
      .then(({ data }) => {
        const rows = data || []
        setFactures(rows)
        setLoading(false)
        // Auto-sélectionne la première facture si rien n'est sélectionné
        if (!keepSelection && rows.length > 0) setSelected(rows[0])
      })
  }
  useEffect(() => { loadFactures() }, [selectedSociete?.id])

  // Load company data when selected societe changes
  useEffect(() => {
    if (!selectedSociete?.id) return
    supabase
      .from('societes')
      .select('*')
      .eq('id', selectedSociete.id)
      .single()
      .then(({ data }) => setCompanyData(data))
      .catch(err => console.error('Error loading company data:', err))
  }, [selectedSociete?.id])

  const filtered = useMemo(() => {
    let rows = factures
    if (filterStatut) rows = rows.filter(f => f.statut === filterStatut)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(f => f.num_facture?.toLowerCase().includes(q) || f.client_nom?.toLowerCase().includes(q) || f.objet?.toLowerCase().includes(q))
    }
    return rows
  }, [factures, search, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date_emission', 'desc')

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paged = sortedData.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const totauxStatuts = useMemo(() => {
    const r = {}
    for (const f of factures) r[f.statut] = (r[f.statut]||0) + (f.total_ttc||0)
    return r
  }, [factures])

  function handleSave(fac) {
    loadFactures(true)
    setSelected(fac)
    setModal(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette facture ?')) return
    await supabase.from('factures').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    loadFactures()
  }

  return (
    <div className="fac-page">

      {/* Titre de page */}
      <div className="admin-page-header" style={{marginBottom: '1rem', flexShrink: 0}}>
        <div>
          <h1>Ventes</h1>
          <p>{factures.length} facture{factures.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Nouvelle facture</button>
      </div>

      {/* KPIs — pleine largeur */}
      <div className="fac-kpi-bar" style={{flexShrink: 0}}>
        {STATUTS.map(s => (
          <div key={s.id} className="fac-kpi-chip" style={{borderColor: s.color}}>
            <span className="fac-kpi-label" style={{color: s.color}}>{s.label}</span>
            <span className="fac-kpi-val">{fmtE(totauxStatuts[s.id]||0)}</span>
          </div>
        ))}
      </div>

    <div className="fac-main-layout">

      {/* ── COLONNE GAUCHE : toolbar + tableau ── */}
      <div className="fac-left-col">

        {/* Toolbar */}
        <div className="table-toolbar">
          <input className="table-search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Rechercher…" />
          <select className="table-pagesize" value={filterStatut} onChange={e=>{setFilterStatut(e.target.value);setPage(1)}}>
            <option value="">Tous statuts</option>
            {STATUTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div className="users-table-wrapper" style={{overflowX:'auto'}}>
          <table className="users-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <SortableHeader label="N°" field="num_facture" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Client" field="client_nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Objet" field="objet" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Date" field="date_emission" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader label="Échéance" field="date_echeance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th>Statut</th>
                <SortableHeader label="Total TTC" field="total_ttc" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{textAlign:'right'}} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><Spinner /></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>Aucune facture</td></tr>
              ) : paged.map(f => {
                const sm = statutMeta(f.statut)
                const isSelected = selected?.id === f.id
                return (
                  <tr key={f.id} className={`users-table-row ${isSelected?'fac-row--selected':''}`}
                    onClick={() => setSelected(f)} style={{cursor:'pointer'}}>
                    <td style={{fontWeight:600}}>{f.num_facture}</td>
                    <td style={{fontWeight:500}}>{f.client_nom}</td>
                    <td style={{color:'var(--text-muted)'}}>{f.objet}</td>
                    <td style={{color:'var(--text-muted)'}}>{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td style={{color:'var(--text-muted)'}}>{new Date(f.date_echeance).toLocaleDateString('fr-FR')}</td>
                    <td><span className="fac-statut-badge" style={{color:sm.color,background:sm.bg}}>{sm.label}</span></td>
                    <td style={{textAlign:'right',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmtE(f.total_ttc)}</td>
                    <td>
                      <button className="btn-icon" title="Modifier" onClick={e=>{e.stopPropagation();setModal(f)}}>✏️</button>
                      <button className="btn-icon" title="Supprimer" onClick={e=>{e.stopPropagation();handleDelete(f.id)}}>🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page===1} onClick={()=>setPage(1)}>«</button>
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            <button disabled={page===totalPages} onClick={()=>setPage(totalPages)}>»</button>
          </div>
        )}
      </div>

      {/* ── COLONNE DROITE : prévisualisation ── */}
      <div className="fac-right-col">
        <div className="fac-preview-header">
          <span className="fac-preview-label">Prévisualisation</span>
          <div style={{display:'flex',gap:'.4rem'}}>
            {selected && <button className="btn-secondary" style={{fontSize:'.78rem'}} onClick={()=>setModal(selected)}>✏️ Modifier</button>}
            {selected && <button className="btn-primary" style={{fontSize:'.78rem'}} onClick={()=>{ const doc = generateInvoicePDF(selected); doc.save(`${selected.num_facture || 'facture'}.pdf`) }}>📄 PDF</button>}
            {selected && <button className="btn-secondary" style={{fontSize:'.78rem'}} onClick={()=>setShowDistributionModal(true)}>📧 Envoyer</button>}
          </div>
        </div>
        <div className="fac-right-scroll">
          <InvoicePreview fac={selected} />
        </div>
      </div>

    </div>

      {/* Modal Édition Facture */}
      {modal && (
        <FactureModal
          facture={modal === 'new' ? null : modal}
          societe={selectedSociete}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal Distribution */}
      {showDistributionModal && selected && companyData && (
        <InvoiceDistributionModal
          invoice={selected}
          company={companyData}
          client={selected}
          onClose={() => setShowDistributionModal(false)}
        />
      )}
    </div>
  )
}
