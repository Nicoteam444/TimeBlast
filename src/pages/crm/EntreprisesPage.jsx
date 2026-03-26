import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

function fmtK(n) {
  if (!n) return '0 €'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + ' M€'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' K€'
  return Math.round(n) + ' €'
}

export default function EntreprisesPage() {
  const navigate = useNavigate()
  const [entreprises, setEntreprises] = useState([])
  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [sireneQuery, setSireneQuery] = useState('')
  const [sireneResults, setSireneResults] = useState([])
  const [sireneSearching, setSireneSearching] = useState(false)
  const [enrichResult, setEnrichResult] = useState(null)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 20

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [e, c, l] = await Promise.all([
      sid ? supabase.from('clients').select('*').eq('societe_id', sid) : supabase.from('clients').select('*'),
      sid ? supabase.from('contacts').select('*').eq('societe_id', sid) : supabase.from('contacts').select('*'),
      sid ? supabase.from('leads').select('*').eq('societe_id', sid) : supabase.from('leads').select('*'),
    ])
    setEntreprises(e.data || [])
    setContacts(c.data || [])
    setLeads(l.data || [])
    setLoading(false)
  }

  const enriched = useMemo(() => {
    return entreprises.map(e => ({
      ...e,
      nbContacts: contacts.filter(c => c.entreprise_id === e.id).length,
      nbLeads: leads.filter(l => l.entreprise_id === e.id).length,
      caPotentiel: leads.filter(l => l.entreprise_id === e.id && !['perdu'].includes(l.phase)).reduce((s, l) => s + (l.montant_estime || 0), 0)}))
  }, [entreprises, contacts, leads])

  const filtered = useMemo(() => {
    if (!search) return enriched
    const q = search.toLowerCase()
    return enriched.filter(e => e.name?.toLowerCase().includes(q) || e.ville?.toLowerCase().includes(q) || e.siret?.includes(q))
  }, [enriched, search])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'name', 'asc')

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paged = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kpis = useMemo(() => ({
    total: entreprises.length,
    avecContacts: new Set(contacts.map(c => c.entreprise_id).filter(Boolean)).size,
    avecLeads: new Set(leads.map(l => l.entreprise_id).filter(Boolean)).size,
    caPipeline: leads.filter(l => !['perdu', 'gagne'].includes(l.phase)).reduce((s, l) => s + (l.montant_estime || 0), 0)}), [entreprises, contacts, leads])

  // SIRENE search
  async function searchSirene(q) {
    if (!q.trim() || q.trim().length < 3) { setSireneResults([]); return }
    setSireneSearching(true)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=6`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSireneResults(data.results || [])
    } catch { setSireneResults([]) }
    setSireneSearching(false)
  }

  function handleSireneInput(e) {
    setSireneQuery(e.target.value); setEnrichResult(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchSirene(e.target.value), 400)
  }

  async function addFromSirene(ent) {
    const nom = (ent.nom_complet || ent.nom_raison_sociale || '').toUpperCase()
    const siege = ent.siege || {}
    const { data: existing } = await supabase.from('clients').select('id, name').ilike('name', `%${nom}%`).limit(1)
    if (existing?.length > 0) {
      setEnrichResult({ type: 'exists', nom })
    } else {
      const { error } = await supabase.from('clients').insert({
        name: nom, ville: siege.libelle_commune || ''})
      if (error) { setEnrichResult({ type: 'error', message: error.message }) }
      else { setEnrichResult({ type: 'created', nom }); loadData() }
    }
  }

  // CRUD
  async function handleSave(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    const payload = {
      name: form.get('name'),
      ville: form.get('ville') || null}
    if (modal?.id) {
      await supabase.from('clients').update(payload).eq('id', modal.id)
    } else {
      await supabase.from('clients').insert(payload)
    }
    setModal(null); loadData()
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette entreprise ?')) return
    await supabase.from('clients').delete().eq('id', id)
    loadData()
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>🏢 Entreprises</h1>
          <p>{entreprises.length} entreprise{entreprises.length !== 1 ? 's' : ''}{selectedSociete ? ` · ${selectedSociete.name}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn-primary" onClick={() => setModal({})}>+ Nouvelle entreprise</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="produit-kpi-bar" style={{ marginBottom: '1rem' }}>
        <div className="produit-kpi-chip" style={{ borderColor: '#1a5c82' }}>
          <span className="produit-kpi-label" style={{ color: '#1a5c82' }}>Total entreprises</span>
          <span className="produit-kpi-val">{kpis.total}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#22c55e' }}>
          <span className="produit-kpi-label" style={{ color: '#22c55e' }}>Avec contacts</span>
          <span className="produit-kpi-val">{kpis.avecContacts}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#8b5cf6' }}>
          <span className="produit-kpi-label" style={{ color: '#8b5cf6' }}>Avec leads</span>
          <span className="produit-kpi-val">{kpis.avecLeads}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#f59e0b' }}>
          <span className="produit-kpi-label" style={{ color: '#f59e0b' }}>Pipeline CA</span>
          <span className="produit-kpi-val">{fmtK(kpis.caPipeline)}</span>
        </div>
      </div>

      {/* Recherche SIRENE */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.5rem' }}>
          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>🏛 Recherche SIRENE</span>
          <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Enrichir depuis l'API publique</span>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input type="text" value={sireneQuery} onChange={handleSireneInput}
            placeholder="Rechercher par nom, SIREN…" style={{ flex: 1, padding: '.5rem .75rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.85rem', background: 'var(--bg)', color: 'var(--text)' }} />
          <button className="btn-primary" style={{ fontSize: '.8rem' }} onClick={() => searchSirene(sireneQuery)} disabled={sireneSearching || sireneQuery.length < 3}>
            {sireneSearching ? '...' : '🔍'}
          </button>
        </div>
        {enrichResult && (
          <div style={{ marginTop: '.5rem', padding: '.5rem .75rem', borderRadius: 8, fontSize: '.85rem',
            background: enrichResult.type === 'created' ? '#f0fdf4' : enrichResult.type === 'exists' ? '#fffbeb' : '#fef2f2',
            color: enrichResult.type === 'created' ? '#166534' : enrichResult.type === 'exists' ? '#92400e' : '#dc2626'}}>
            {enrichResult.type === 'created' && `✅ ${enrichResult.nom} ajoutée !`}
            {enrichResult.type === 'exists' && `⚠ ${enrichResult.nom} existe déjà.`}
            {enrichResult.type === 'error' && `❌ ${enrichResult.message}`}
          </div>
        )}
        {sireneResults.length > 0 && (
          <div style={{ marginTop: '.5rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="users-table" style={{ margin: 0 }}>
              <tbody>
                {sireneResults.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: '.85rem' }}>{r.nom_complet || r.nom_raison_sociale}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.siren}</td>
                    <td style={{ fontSize: '.8rem' }}>{r.siege?.libelle_commune} {r.siege?.code_postal ? `(${r.siege.code_postal})` : ''}</td>
                    <td><button className="btn-primary" style={{ padding: '.2rem .5rem', fontSize: '.75rem' }} onClick={() => addFromSirene(r)}>+ Ajouter</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <input className="table-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher…" />
      </div>

      {/* Table */}
      <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="users-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="Entreprise" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Ville" field="ville" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="SIRET" field="siret" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Contacts" field="nbContacts" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'center' }} />
              <SortableHeader label="Leads" field="nbLeads" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'center' }} />
              <SortableHeader label="CA Potentiel" field="caPotentiel" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><Spinner /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune entreprise</td></tr>
            ) : paged.map(e => (
              <tr key={e.id} className="users-table-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/clients/${e.id}`)}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{e.ville || '—'}</td>
                <td style={{ fontSize: '.82rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{e.siret || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {e.nbContacts > 0 ? <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 10, padding: '2px 8px', fontSize: '.78rem', fontWeight: 600 }}>{e.nbContacts}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {e.nbLeads > 0 ? <span style={{ background: '#faf5ff', color: '#8b5cf6', borderRadius: 10, padding: '2px 8px', fontSize: '.78rem', fontWeight: 600 }}>{e.nbLeads}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtK(e.caPotentiel)}</td>
                <td onClick={e2 => e2.stopPropagation()}>
                  <button className="btn-icon" title="Modifier" onClick={() => setModal(e)}>✏️</button>
                  <button className="btn-icon" title="Supprimer" onClick={() => handleDelete(e.id)}>🗑</button>
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

      {/* Modal */}
      {modal && (
        <div className="plan-modal-overlay" onClick={() => setModal(null)}>
          <div className="plan-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="plan-modal-header">
              <h3>{modal.id ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}</h3>
              <button className="plan-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.25rem' }}>
              <div className="fac-field" style={{ marginBottom: '.75rem' }}>
                <label>Nom *</label>
                <input name="name" defaultValue={modal.name || ''} required style={{ width: '100%', padding: '.5rem .75rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.9rem' }} />
              </div>
              <div className="fac-field" style={{ marginBottom: '.75rem' }}>
                <label>Ville</label>
                <input name="ville" defaultValue={modal.ville || ''} style={{ width: '100%', padding: '.5rem .75rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.9rem' }} />
              </div>
              <div className="plan-modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary">💾 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
