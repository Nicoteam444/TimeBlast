import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

const TYPE_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'facture', label: 'Facture' },
  { value: 'avoir', label: 'Avoir' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'devis', label: 'Devis' },
  { value: 'bon_commande', label: 'Bon de commande' },
  { value: 'courrier', label: 'Courrier' },
  { value: 'releve', label: 'Relevé bancaire' },
  { value: 'autre', label: 'Autre' },
]

const FRAIS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'achat', label: 'Achat' },
  { value: 'vente', label: 'Vente' },
  { value: 'frais_generaux', label: 'Frais généraux' },
  { value: 'immobilisation', label: 'Immobilisation' },
]

const SQL_HINT = `CREATE TABLE IF NOT EXISTS documents_archive (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  type_document text DEFAULT 'autre',
  type_frais text,
  fournisseur text,
  reference text,
  numero_commande text,
  date_document date,
  date_echeance date,
  montant_ht numeric(15,2),
  montant_tva numeric(15,2),
  montant_ttc numeric(15,2),
  date_debut_prestation date,
  date_fin_prestation date,
  nb_pages integer DEFAULT 1,
  fichier_url text,
  fichier_nom text,
  fichier_taille bigint DEFAULT 0,
  ocr_contenu text,
  ocr_status text DEFAULT 'en_attente',
  tags text[],
  uploaded_by uuid REFERENCES profiles(id)
);`

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtEUR(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)
}

export default function DocumentsArchivePage() {
  const { selectedSociete } = useSociete()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [filterTab, setFilterTab] = useState('simple') // simple | expert
  const [showImport, setShowImport] = useState(false)
  const [importForm, setImportForm] = useState({ nom: '', type_document: 'autre', type_frais: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)

  // Filters
  const [fType, setFType] = useState('')
  const [fFrais, setFFrais] = useState('')
  const [fFournisseur, setFFournisseur] = useState('')
  const [fReference, setFReference] = useState('')
  const [fNumCommande, setFNumCommande] = useState('')
  const [fSociete, setFSociete] = useState('')
  const [fDateDocFrom, setFDateDocFrom] = useState('')
  const [fDateDocTo, setFDateDocTo] = useState('')
  const [fDateEchFrom, setFDateEchFrom] = useState('')
  const [fDateEchTo, setFDateEchTo] = useState('')
  const [fMontantHTFrom, setFMontantHTFrom] = useState('')
  const [fMontantHTTo, setFMontantHTTo] = useState('')
  const [fMontantTVAFrom, setFMontantTVAFrom] = useState('')
  const [fMontantTVATo, setFMontantTVATo] = useState('')
  const [fMontantTTCFrom, setFMontantTTCFrom] = useState('')
  const [fMontantTTCTo, setFMontantTTCTo] = useState('')
  const [fDatePrestFrom, setFDatePrestFrom] = useState('')
  const [fDatePrestTo, setFDatePrestTo] = useState('')
  const [fDatePrestFinFrom, setFDatePrestFinFrom] = useState('')
  const [fDatePrestFinTo, setFDatePrestFinTo] = useState('')
  const [societes, setSocietes] = useState([])

  useEffect(() => { fetchDocuments(); fetchSocietes() }, [selectedSociete?.id])

  async function fetchSocietes() {
    const { data } = await supabase.from('societes').select('id, name').order('name')
    setSocietes(data || [])
  }

  async function fetchDocuments() {
    setLoading(true)
    setTableError(false)
    let q = supabase.from('documents_archive').select('*').order('created_at', { ascending: false })
    if (selectedSociete?.id) q = q.eq('societe_id', selectedSociete.id)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01' || error.message?.includes('schema cache')) setTableError(true)
      setDocuments([])
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (fType && d.type_document !== fType) return false
      if (fFrais && d.type_frais !== fFrais) return false
      if (fFournisseur && !(d.fournisseur || '').toLowerCase().includes(fFournisseur.toLowerCase())) return false
      if (fReference && !(d.reference || '').toLowerCase().includes(fReference.toLowerCase())) return false
      if (fNumCommande && !(d.numero_commande || '').toLowerCase().includes(fNumCommande.toLowerCase())) return false
      if (fSociete && d.societe_id !== fSociete) return false
      if (fDateDocFrom && d.date_document < fDateDocFrom) return false
      if (fDateDocTo && d.date_document > fDateDocTo) return false
      if (fDateEchFrom && d.date_echeance < fDateEchFrom) return false
      if (fDateEchTo && d.date_echeance > fDateEchTo) return false
      if (fMontantHTFrom && (parseFloat(d.montant_ht) || 0) < parseFloat(fMontantHTFrom)) return false
      if (fMontantHTTo && (parseFloat(d.montant_ht) || 0) > parseFloat(fMontantHTTo)) return false
      if (fMontantTVAFrom && (parseFloat(d.montant_tva) || 0) < parseFloat(fMontantTVAFrom)) return false
      if (fMontantTVATo && (parseFloat(d.montant_tva) || 0) > parseFloat(fMontantTVATo)) return false
      if (fMontantTTCFrom && (parseFloat(d.montant_ttc) || 0) < parseFloat(fMontantTTCFrom)) return false
      if (fMontantTTCTo && (parseFloat(d.montant_ttc) || 0) > parseFloat(fMontantTTCTo)) return false
      if (fDatePrestFrom && d.date_debut_prestation < fDatePrestFrom) return false
      if (fDatePrestTo && d.date_debut_prestation > fDatePrestTo) return false
      if (fDatePrestFinFrom && d.date_fin_prestation < fDatePrestFinFrom) return false
      if (fDatePrestFinTo && d.date_fin_prestation > fDatePrestFinTo) return false
      return true
    })
  }, [documents, fType, fFrais, fFournisseur, fReference, fNumCommande, fSociete,
      fDateDocFrom, fDateDocTo, fDateEchFrom, fDateEchTo,
      fMontantHTFrom, fMontantHTTo, fMontantTVAFrom, fMontantTVATo,
      fMontantTTCFrom, fMontantTTCTo, fDatePrestFrom, fDatePrestTo,
      fDatePrestFinFrom, fDatePrestFinTo])

  const { sortedData: sortedFiltered, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date_document', 'desc')

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(d => d.id)))
  }

  function resetFilters() {
    setFType(''); setFFrais(''); setFFournisseur(''); setFReference('')
    setFNumCommande(''); setFSociete('')
    setFDateDocFrom(''); setFDateDocTo('')
    setFDateEchFrom(''); setFDateEchTo('')
    setFMontantHTFrom(''); setFMontantHTTo('')
    setFMontantTVAFrom(''); setFMontantTVATo('')
    setFMontantTTCFrom(''); setFMontantTTCTo('')
    setFDatePrestFrom(''); setFDatePrestTo('')
    setFDatePrestFinFrom(''); setFDatePrestFinTo('')
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!importForm.nom.trim()) return
    setSaving(true)
    const payload = {
      nom: importForm.nom.trim(),
      type_document: importForm.type_document,
      type_frais: importForm.type_frais || null,
      tags: importForm.tags ? importForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      societe_id: selectedSociete?.id || null,
      nb_pages: 1,
      ocr_status: 'en_attente',
    }
    await supabase.from('documents_archive').insert([payload])
    setSaving(false)
    setShowImport(false)
    setImportForm({ nom: '', type_document: 'autre', type_frais: '', tags: '' })
    fetchDocuments()
  }

  // Thumbnail placeholder colors by type
  const TYPE_COLORS = {
    facture: '#3b82f6', avoir: '#8b5cf6', contrat: '#ec4899',
    devis: '#f59e0b', bon_commande: '#22c55e', courrier: '#64748b',
    releve: '#0ea5e9', autre: '#94a3b8',
  }

  const TYPE_ICONS = {
    facture: '🧾', avoir: '📄', contrat: '📝', devis: '📋',
    bon_commande: '📦', courrier: '✉️', releve: '🏦', autre: '📄',
  }

  return (
    <div className="admin-page admin-page--full">
      {/* Table missing hint */}
      {tableError && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>Table "documents_archive" introuvable. Créez-la avec ce SQL :</p>
          <pre style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '.75rem', overflowX: 'auto', color: '#1c1917' }}>{SQL_HINT}</pre>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: previewDoc ? '240px 1fr 400px' : '240px 1fr', gap: 0, minHeight: 'calc(100vh - 140px)' }}>
        {/* ====== LEFT PANEL: FILTERS ====== */}
        <div style={{
          background: 'var(--card-bg, #fff)',
          borderRight: '1px solid var(--border, #e2e8f0)',
          padding: '1rem',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Simple / Expert tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border, #e2e8f0)', marginBottom: '1rem' }}>
            <button
              onClick={() => setFilterTab('simple')}
              style={{
                flex: 1, padding: '.5rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '.85rem',
                color: filterTab === 'simple' ? 'var(--primary, #3b82f6)' : 'var(--text-muted, #64748b)',
                borderBottom: filterTab === 'simple' ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >Simple</button>
            <button
              onClick={() => setFilterTab('expert')}
              style={{
                flex: 1, padding: '.5rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '.85rem',
                color: filterTab === 'expert' ? 'var(--primary, #3b82f6)' : 'var(--text-muted, #64748b)',
                borderBottom: filterTab === 'expert' ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >Expert</button>
          </div>

          <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: '.75rem', color: 'var(--text, #1e293b)' }}>
            Document indexing
          </div>

          {/* Informations Générales */}
          <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '.5rem', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '.25rem' }}>
            Informations Générales
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1 }}>
            <FilterField label="Type de document">
              <select value={fType} onChange={e => setFType(e.target.value)} style={selectStyle}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FilterField>

            <FilterField label="Type de frais">
              <select value={fFrais} onChange={e => setFFrais(e.target.value)} style={selectStyle}>
                {FRAIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FilterField>

            <FilterField label="Fournisseur">
              <input type="text" value={fFournisseur} onChange={e => setFFournisseur(e.target.value)} style={inputStyle} placeholder="" />
            </FilterField>

            <FilterField label="Référence du document">
              <input type="text" value={fReference} onChange={e => setFReference(e.target.value)} style={inputStyle} placeholder="" />
            </FilterField>

            <FilterField label="N° de commande">
              <input type="text" value={fNumCommande} onChange={e => setFNumCommande(e.target.value)} style={inputStyle} placeholder="" />
            </FilterField>

            <FilterField label="Société">
              <select value={fSociete} onChange={e => setFSociete(e.target.value)} style={selectStyle}>
                <option value="">Toutes</option>
                {societes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FilterField>

            <FilterRange label="Date du document" from={fDateDocFrom} to={fDateDocTo} onFrom={setFDateDocFrom} onTo={setFDateDocTo} type="date" />
            <FilterRange label="Date d'échéance" from={fDateEchFrom} to={fDateEchTo} onFrom={setFDateEchFrom} onTo={setFDateEchTo} type="date" />

            {filterTab === 'expert' && <>
              <FilterRange label="Montant HT" from={fMontantHTFrom} to={fMontantHTTo} onFrom={setFMontantHTFrom} onTo={setFMontantHTTo} type="number" />
              <FilterRange label="Montant TVA" from={fMontantTVAFrom} to={fMontantTVATo} onFrom={setFMontantTVAFrom} onTo={setFMontantTVATo} type="number" />
              <FilterRange label="Montant TTC" from={fMontantTTCFrom} to={fMontantTTCTo} onFrom={setFMontantTTCFrom} onTo={setFMontantTTCTo} type="number" />
              <FilterRange label="Date début prestation" from={fDatePrestFrom} to={fDatePrestTo} onFrom={setFDatePrestFrom} onTo={setFDatePrestTo} type="date" />
              <FilterRange label="Date fin prestation" from={fDatePrestFinFrom} to={fDatePrestFinTo} onFrom={setFDatePrestFinFrom} onTo={setFDatePrestFinTo} type="date" />
            </>}
          </div>

          {/* Bottom toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '1rem', paddingTop: '.75rem', borderTop: '1px solid var(--border, #e2e8f0)' }}>
            <button onClick={resetFilters} title="Réinitialiser" style={iconBtnStyle}>🔄</button>
            <button title="Sauvegarder la recherche" style={iconBtnStyle}>💾</button>
            <button title="Favoris" style={iconBtnStyle}>⭐</button>
            <button onClick={fetchDocuments} style={{
              marginLeft: 'auto', padding: '.45rem 1.2rem', background: 'var(--primary, #3b82f6)',
              color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '.8rem',
              display: 'flex', alignItems: 'center', gap: '.35rem',
            }}>
              🔍 Search
            </button>
          </div>
        </div>

        {/* ====== CENTER PANEL: DOCUMENT GRID ====== */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                padding: '.3rem .8rem', border: '1px solid var(--primary, #3b82f6)', borderRadius: 6,
                color: 'var(--primary, #3b82f6)', fontSize: '.85rem', fontWeight: 500,
              }}>
                {selected.size} selected document{selected.size > 1 ? 's' : ''}
              </span>
              <button className="btn-primary" onClick={() => setShowImport(true)} style={{ fontSize: '.8rem', padding: '.4rem .8rem' }}>
                + Importer
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <span style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text)' }}>
                {filtered.length} Document{filtered.length > 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '.35rem .55rem', border: 'none', cursor: 'pointer', fontSize: '.85rem',
                    background: viewMode === 'grid' ? 'var(--primary, #3b82f6)' : 'var(--card-bg, #fff)',
                    color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                  }}
                >▦</button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '.35rem .55rem', border: 'none', cursor: 'pointer', fontSize: '.85rem',
                    background: viewMode === 'list' ? 'var(--primary, #3b82f6)' : 'var(--card-bg, #fff)',
                    color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                  }}
                >☰</button>
              </div>
            </div>
          </div>

          {/* Select all */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 500 }}>
            <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
            Select all
          </label>

          {loading && <div className="loading-inline">Chargement...</div>}

          {!loading && filtered.length === 0 && !tableError && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>📁</div>
              <p style={{ fontWeight: 600 }}>Aucun document</p>
              <p style={{ fontSize: '.85rem' }}>Importez vos premiers documents pour commencer l'archivage.</p>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && !loading && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '1rem',
            }}>
              {filtered.map(doc => (
                <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    style={{
                      width: '100%', aspectRatio: '0.707', // A4 ratio
                      background: selected.has(doc.id) ? '#dbeafe' : previewDoc?.id === doc.id ? '#e0f2fe' : '#f8fafc',
                      border: selected.has(doc.id) ? '2px solid var(--primary, #3b82f6)' : previewDoc?.id === doc.id ? '2px solid #0ea5e9' : '1px solid var(--border, #e2e8f0)',
                      borderRadius: 6,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden', transition: 'all .15s',
                    }}
                  >
                      {/* Mini document réaliste */}
                    <div style={{
                      width: '100%', height: '100%', padding: '8px 10px',
                      display: 'flex', flexDirection: 'column', background: '#fff',
                      fontSize: '.48rem', color: '#334155', lineHeight: 1.4, overflow: 'hidden',
                    }}>
                      {/* En-tête mini */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: '.55rem', color: '#1e293b', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.fournisseur || 'Document'}
                        </div>
                        <div style={{
                          background: '#1e293b', color: '#fff', borderRadius: 2, padding: '1px 4px',
                          fontSize: '.38rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5,
                        }}>
                          {TYPE_OPTIONS.find(o => o.value === doc.type_document)?.label || 'DOC'}
                        </div>
                      </div>
                      {/* Ref */}
                      {doc.reference && <div style={{ fontSize: '.4rem', color: '#94a3b8', marginBottom: 2 }}>{doc.reference}</div>}
                      {/* Lignes simulées */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                        <div style={{ width: '100%', height: 1, background: '#1e293b' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '60%', height: 2, background: '#e2e8f0', borderRadius: 1 }} />
                          <div style={{ width: '25%', height: 2, background: '#e2e8f0', borderRadius: 1 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '50%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                          <div style={{ width: '20%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '70%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                          <div style={{ width: '15%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '45%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                          <div style={{ width: '22%', height: 2, background: '#f1f5f9', borderRadius: 1 }} />
                        </div>
                      </div>
                      {/* Total en bas */}
                      {doc.montant_ttc != null && (
                        <div style={{
                          marginTop: 'auto', paddingTop: 3,
                          display: 'flex', justifyContent: 'flex-end',
                        }}>
                          <div style={{
                            background: '#1e293b', color: '#fff', borderRadius: 2,
                            padding: '1px 5px', fontSize: '.45rem', fontWeight: 800,
                          }}>
                            {fmtEUR(doc.montant_ttc)}
                          </div>
                        </div>
                      )}
                      {/* Date en bas à gauche */}
                      {doc.date_document && (
                        <div style={{ fontSize: '.38rem', color: '#94a3b8', marginTop: 2 }}>
                          {fmtDate(doc.date_document)}
                        </div>
                      )}
                    </div>
                    {/* OCR indicator */}
                    {doc.ocr_status === 'termine' && (
                      <div style={{
                        position: 'absolute', bottom: 4, left: 4,
                        width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
                      }} title="OCR terminé" />
                    )}
                  </div>
                  {/* Info below thumbnail */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.35rem' }}>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {doc.nb_pages || 1} Page{(doc.nb_pages || 1) > 1 ? 's' : ''}
                    </span>
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div style={{
                    fontSize: '.7rem', color: 'var(--text)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '100%', marginTop: 2,
                  }} title={doc.nom}>
                    {doc.nom}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && !loading && (
            <div className="users-table-wrapper">
            <table className="users-table" style={{ fontSize: '.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}><input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} /></th>
                  <SortableHeader label="Nom" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Type" field="type_document" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Fournisseur" field="fournisseur" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Date" field="date_document" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Montant TTC" field="montant_ttc" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader label="Pages" field="nb_pages" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                  <th>OCR</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map(doc => (
                  <tr
                    key={doc.id}
                    style={{ background: selected.has(doc.id) ? '#eff6ff' : previewDoc?.id === doc.id ? '#e0f2fe' : undefined, cursor: 'pointer' }}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} /></td>
                    <td style={{ fontWeight: 500 }}>{doc.nom}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '.75rem', fontWeight: 500,
                        color: TYPE_COLORS[doc.type_document] || '#64748b',
                        background: '#f1f5f9',
                      }}>
                        {TYPE_ICONS[doc.type_document] || '📄'} {TYPE_OPTIONS.find(o => o.value === doc.type_document)?.label || doc.type_document}
                      </span>
                    </td>
                    <td>{doc.fournisseur || '—'}</td>
                    <td>{fmtDate(doc.date_document)}</td>
                    <td>{doc.montant_ttc ? fmtEUR(doc.montant_ttc) : '—'}</td>
                    <td>{doc.nb_pages || 1}</td>
                    <td>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                        background: doc.ocr_status === 'termine' ? '#16a34a' : doc.ocr_status === 'en_cours' ? '#3b82f6' : '#f59e0b',
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* ====== RIGHT PANEL: PREVIEW FORMAT A4 ====== */}
        {previewDoc && (
          <div style={{
            background: '#e8ecf0',
            borderLeft: '1px solid var(--border, #e2e8f0)',
            padding: '.75rem',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '.75rem',
          }}>
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>Prévisualisation</span>
              <div style={{ display: 'flex', gap: '.35rem' }}>
                <button style={{ fontSize: '.75rem', padding: '.3rem .6rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>📄 PDF</button>
                <button onClick={() => setPreviewDoc(null)} style={{ fontSize: '.75rem', padding: '.3rem .6rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {/* A4 Paper */}
            <div style={{
              background: '#fff', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,.12)',
              padding: '1.5rem 1.25rem', fontSize: '.78rem', color: '#1e293b', overflow: 'hidden',
              aspectRatio: '0.707', width: '100%', position: 'relative',
              lineHeight: 1.5, position: 'relative',
            }}>
              {/* En-tête : Fournisseur + Type badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{previewDoc.fournisseur || 'Document'}</div>
                  {previewDoc.reference && <div style={{ fontSize: '.78rem', color: '#64748b' }}>Réf : {previewDoc.reference}</div>}
                  {previewDoc.numero_commande && <div style={{ fontSize: '.78rem', color: '#64748b' }}>Commande : {previewDoc.numero_commande}</div>}
                </div>
                <div style={{
                  background: '#1e293b', color: '#fff', borderRadius: 8, padding: '.5rem .75rem',
                  textAlign: 'center', minWidth: 0, maxWidth: '55%', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: '.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: .8 }}>
                    {TYPE_OPTIONS.find(o => o.value === previewDoc.type_document)?.label || 'DOCUMENT'}
                  </div>
                  <div style={{ fontSize: '.95rem', fontWeight: 800, marginTop: 2 }}>{previewDoc.nom}</div>
                  {previewDoc.date_document && (
                    <div style={{ fontSize: '.7rem', marginTop: 4, opacity: .7 }}>
                      {fmtDate(previewDoc.date_document)}
                    </div>
                  )}
                  {previewDoc.date_echeance && (
                    <div style={{ fontSize: '.65rem', opacity: .6 }}>
                      Éch. {fmtDate(previewDoc.date_echeance)}
                    </div>
                  )}
                </div>
              </div>

              {/* Destinataire */}
              <div style={{
                borderLeft: '3px solid #1e293b', paddingLeft: '1rem', marginBottom: '1.5rem',
                background: '#f8fafc', padding: '.75rem 1rem', borderRadius: '0 8px 8px 0',
              }}>
                <div style={{ fontSize: '.65rem', fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>Document de</div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{previewDoc.fournisseur || '—'}</div>
                {previewDoc.numero_commande && <div style={{ fontSize: '.78rem', color: '#64748b' }}>N° commande : {previewDoc.numero_commande}</div>}
              </div>

              {/* Montants */}
              {(previewDoc.montant_ht || previewDoc.montant_ttc) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.75rem', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #1e293b' }}>
                        <th style={{ textAlign: 'left', padding: '.4rem .5rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e293b', width: '40%' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '.4rem .5rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', width: '20%' }}>HT</th>
                        <th style={{ textAlign: 'right', padding: '.4rem .5rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', width: '20%' }}>TVA</th>
                        <th style={{ textAlign: 'right', padding: '.4rem .5rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', width: '20%' }}>TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '.4rem .5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewDoc.nom}</td>
                        <td style={{ padding: '.4rem .5rem', textAlign: 'right' }}>{previewDoc.montant_ht ? fmtEUR(previewDoc.montant_ht) : '—'}</td>
                        <td style={{ padding: '.4rem .5rem', textAlign: 'right' }}>{previewDoc.montant_tva ? fmtEUR(previewDoc.montant_tva) : '—'}</td>
                        <td style={{ padding: '.4rem .5rem', textAlign: 'right', fontWeight: 700 }}>{previewDoc.montant_ttc ? fmtEUR(previewDoc.montant_ttc) : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {/* Totaux */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                    <div style={{ width: '60%', maxWidth: 220 }}>
                      {previewDoc.montant_ht != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.25rem .5rem', fontSize: '.75rem' }}>
                          <span>Total HT</span><span style={{ fontWeight: 600 }}>{fmtEUR(previewDoc.montant_ht)}</span>
                        </div>
                      )}
                      {previewDoc.montant_tva != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.25rem .5rem', fontSize: '.75rem' }}>
                          <span>TVA</span><span style={{ fontWeight: 600 }}>{fmtEUR(previewDoc.montant_tva)}</span>
                        </div>
                      )}
                      {previewDoc.montant_ttc != null && (
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', padding: '.4rem .5rem',
                          background: '#1e293b', color: '#fff', borderRadius: 4, fontWeight: 800, fontSize: '.8rem', marginTop: '.2rem',
                        }}>
                          <span>TOTAL TTC</span><span>{fmtEUR(previewDoc.montant_ttc)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dates prestation */}
              {(previewDoc.date_debut_prestation || previewDoc.date_fin_prestation) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '.6rem .85rem', marginBottom: '1rem', fontSize: '.78rem' }}>
                  <span style={{ fontWeight: 600 }}>Période : </span>
                  {previewDoc.date_debut_prestation && fmtDate(previewDoc.date_debut_prestation)}
                  {previewDoc.date_debut_prestation && previewDoc.date_fin_prestation && ' → '}
                  {previewDoc.date_fin_prestation && fmtDate(previewDoc.date_fin_prestation)}
                </div>
              )}

              {/* Tags */}
              {previewDoc.tags && previewDoc.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '1rem' }}>
                  {previewDoc.tags.map((tag, i) => (
                    <span key={i} style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: '.68rem', fontWeight: 500,
                      background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd',
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* OCR content */}
              {previewDoc.ocr_contenu && (
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
                  padding: '.75rem', fontSize: '.75rem', fontFamily: 'monospace',
                  color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {previewDoc.ocr_contenu}
                </div>
              )}

              {/* Footer */}
              <div style={{
                position: 'absolute', bottom: '1.5rem', left: '2rem', right: '2rem',
                borderTop: '1px solid #e2e8f0', paddingTop: '.5rem',
                textAlign: 'center', fontSize: '.65rem', color: '#94a3b8',
              }}>
                {previewDoc.fournisseur || 'Document'} · {previewDoc.reference || 'Sans référence'}
                {previewDoc.nb_pages && ` · ${previewDoc.nb_pages} page${previewDoc.nb_pages > 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '.35rem' }}>
              <button style={{ flex: 1, padding: '.45rem .5rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', background: 'var(--primary, #3b82f6)', color: '#fff', border: 'none', borderRadius: 6 }}>Télécharger</button>
              <button style={{ flex: 1, padding: '.45rem .5rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', background: '#fff', color: 'var(--text)', border: '1px solid #e2e8f0', borderRadius: 6 }}>Modifier</button>
              <button style={{ flex: 1, padding: '.45rem .5rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6 }}>Supprimer</button>
            </div>
          </div>
        )}
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '100%' }}>
            <div className="modal-header">
              <h2>Importer un document</h2>
              <button className="modal-close" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <form onSubmit={handleImport} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div className="field">
                <label>Nom du document *</label>
                <input type="text" value={importForm.nom} onChange={e => setImportForm(f => ({ ...f, nom: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div className="field">
                  <label>Type de document</label>
                  <select value={importForm.type_document} onChange={e => setImportForm(f => ({ ...f, type_document: e.target.value }))}>
                    {TYPE_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Type de frais</label>
                  <select value={importForm.type_frais} onChange={e => setImportForm(f => ({ ...f, type_frais: e.target.value }))}>
                    {FRAIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Tags (séparés par des virgules)</label>
                <input type="text" value={importForm.tags} onChange={e => setImportForm(f => ({ ...f, tags: e.target.value }))} placeholder="ex: urgent, comptabilité, 2024" />
              </div>
              <div className="field">
                <label>Fichier</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style={{ fontSize: '.85rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowImport(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Import...' : 'Importer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reusable filter components ── */

const inputStyle = {
  width: '100%', padding: '.35rem .5rem', border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 4, fontSize: '.8rem', background: 'var(--card-bg, #fff)', color: 'var(--text)',
  outline: 'none',
}

const selectStyle = {
  ...inputStyle, cursor: 'pointer',
}

const iconBtnStyle = {
  padding: '.35rem .5rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6,
  background: 'var(--card-bg, #fff)', cursor: 'pointer', fontSize: '.85rem',
}

function FilterField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  )
}

function FilterRange({ label, from, to, onFrom, onTo, type = 'text' }) {
  return (
    <div>
      <div style={{ fontSize: '.72rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.35rem' }}>
        <input type={type} value={from} onChange={e => onFrom(e.target.value)} placeholder="From" style={inputStyle} />
        <input type={type} value={to} onChange={e => onTo(e.target.value)} placeholder="To" style={inputStyle} />
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '.68rem', fontWeight: 500, color: 'var(--text-muted, #64748b)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
