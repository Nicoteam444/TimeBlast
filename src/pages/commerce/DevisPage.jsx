/*
-- SQL Migration: table devis
-- Execute this in Supabase SQL Editor before using this page:

CREATE TABLE IF NOT EXISTS devis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  numero text,
  client_id uuid REFERENCES clients(id),
  client_nom text,
  date_emission date DEFAULT CURRENT_DATE,
  date_validite date DEFAULT (CURRENT_DATE + 30),
  lignes jsonb DEFAULT '[]',
  total_ht numeric(15,2) DEFAULT 0,
  tva numeric(15,2) DEFAULT 0,
  total_ttc numeric(15,2) DEFAULT 0,
  statut text DEFAULT 'brouillon',
  notes text,
  transaction_id uuid REFERENCES transactions(id),
  converted_facture_id uuid
);

-- Enable RLS
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage devis for their societe"
  ON devis FOR ALL
  USING (true)
  WITH CHECK (true);
*/

import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
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
  { id: 'brouillon', label: 'Brouillon', color: '#94a3b8', bg: '#f1f5f9' },
  { id: 'envoye',    label: 'Envoyé',   color: '#3b82f6', bg: '#eff6ff' },
  { id: 'accepte',   label: 'Accepté',  color: '#22c55e', bg: '#f0fdf4' },
  { id: 'refuse',    label: 'Refusé',   color: '#ef4444', bg: '#fef2f2' },
  { id: 'facture',   label: 'Facturé',  color: '#a855f7', bg: '#faf5ff' },
]
function statutMeta(s) { return STATUTS.find(x => x.id === s) || STATUTS[0] }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR')
}

// ── Modal création/édition ────────────────────────────────────
function DevisModal({ devis, societe, clients, transactions, onSave, onClose }) {
  const isNew = !devis?.id
  const today = new Date().toISOString().slice(0, 10)
  const defaultValidite = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()

  const [clientId, setClientId] = useState(devis?.client_id || '')
  const [clientNom, setClientNom] = useState(devis?.client_nom || '')
  const [numero, setNumero] = useState(devis?.numero || `DEV-${new Date().getFullYear()}-001`)
  const [dateEmission, setDateEmission] = useState(devis?.date_emission || today)
  const [dateValidite, setDateValidite] = useState(devis?.date_validite || defaultValidite)
  const [statut, setStatut] = useState(devis?.statut || 'brouillon')
  const [notes, setNotes] = useState(devis?.notes || 'Devis valable 30 jours.\nConditions de paiement : 30 jours net.')
  const [transactionId, setTransactionId] = useState(devis?.transaction_id || '')
  const [lines, setLines] = useState(() => {
    const l = typeof devis?.lignes === 'string' ? JSON.parse(devis?.lignes || '[]') : (devis?.lignes || [])
    return l.length ? l.map(x => ({ ...x, id: Math.random() })) : [newLine()]
  })
  const [saving, setSaving] = useState(false)

  // When client is selected from dropdown, update name
  function handleClientChange(e) {
    const id = e.target.value
    setClientId(id)
    if (id) {
      const c = clients.find(c => c.id === id)
      if (c) setClientNom(c.name || c.nom || '')
    } else {
      setClientNom('')
    }
  }

  const totals = useMemo(() => {
    let ht = 0, tvaTotal = 0
    for (const l of lines) {
      const m = parseN(l.qte) * parseN(l.pu)
      ht += m
      tvaTotal += m * (l.tva / 100)
    }
    return { ht, tva: tvaTotal, ttc: ht + tvaTotal }
  }, [lines])

  function updateLine(id, field, val) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const lignes = lines.filter(l => l.desc || parseN(l.pu)).map(({ id, ...l }) => ({
      ...l, montant: Math.round(parseN(l.qte) * parseN(l.pu) * 100) / 100
    }))
    const payload = {
      societe_id: societe?.id,
      numero,
      client_id: clientId || null,
      client_nom: clientNom,
      date_emission: dateEmission,
      date_validite: dateValidite,
      statut,
      lignes: JSON.stringify(lignes),
      notes,
      transaction_id: transactionId || null,
      total_ht: Math.round(totals.ht * 100) / 100,
      tva: Math.round(totals.tva * 100) / 100,
      total_ttc: Math.round(totals.ttc * 100) / 100}
    try {
      if (isNew) {
        const { data } = await supabase.from('devis').insert(payload).select().single()
        onSave(data)
      } else {
        await supabase.from('devis').update(payload).eq('id', devis.id)
        onSave({ ...devis, ...payload })
      }
    } catch (err) {
      console.error('Erreur sauvegarde devis:', err)
    }
    setSaving(false)
  }

  const isEditable = !devis || devis.statut === 'brouillon'

  return (
    <div className="plan-modal-overlay" onClick={onClose}>
      <div className="fac-modal" onClick={e => e.stopPropagation()}>
        <div className="plan-modal-header">
          <h3>{isNew ? 'Nouveau devis' : `Modifier ${devis.numero}`}</h3>
          <button className="plan-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} className="fac-modal-body">
          {/* Client & Info */}
          <div className="fac-modal-cols">
            <div>
              <div className="fac-card-title">👤 Client</div>
              <div className="fac-fields" style={{ gridTemplateColumns: '1fr' }}>
                <div className="fac-field">
                  <label>Sélectionner un client</label>
                  <select value={clientId} onChange={handleClientChange}>
                    <option value="">-- Choisir un client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="fac-field">
                  <label>Nom client (ou saisie libre)</label>
                  <input value={clientNom} onChange={e => setClientNom(e.target.value)} required />
                </div>
              </div>
            </div>
            <div>
              <div className="fac-card-title">📄 Informations</div>
              <div className="fac-fields" style={{ gridTemplateColumns: '1fr' }}>
                <div className="fac-field">
                  <label>N° devis</label>
                  <input value={numero} onChange={e => setNumero(e.target.value)} required />
                </div>
                <div className="fac-field">
                  <label>Transaction liée (optionnel)</label>
                  <select value={transactionId} onChange={e => setTransactionId(e.target.value)}>
                    <option value="">-- Aucune --</option>
                    {transactions.map(t => (
                      <option key={t.id} value={t.id}>{t.reference || t.nom || t.id}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Statut */}
          <div className="fac-fields" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', margin: '.75rem 0' }}>
            <div className="fac-field">
              <label>Date d'émission</label>
              <input type="date" value={dateEmission} onChange={e => setDateEmission(e.target.value)} />
            </div>
            <div className="fac-field">
              <label>Date de validité</label>
              <input type="date" value={dateValidite} onChange={e => setDateValidite(e.target.value)} />
            </div>
            <div className="fac-field">
              <label>Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)}>
                {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Lignes */}
          <div className="fac-card-title" style={{ marginBottom: '.4rem' }}>📋 Lignes du devis</div>
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
              <input className="fac-line-input" style={{ flex: 1 }} value={l.desc} onChange={e => updateLine(l.id, 'desc', e.target.value)} placeholder="Description…" />
              <input className="fac-line-input" style={{ width: 56, textAlign: 'center' }} value={l.qte} onChange={e => updateLine(l.id, 'qte', e.target.value)} type="number" min="0" step="0.5" />
              <input className="fac-line-input" style={{ width: 90, textAlign: 'right' }} value={l.pu} onChange={e => updateLine(l.id, 'pu', e.target.value)} placeholder="0,00" />
              <select className="fac-line-input" style={{ width: 60 }} value={l.tva} onChange={e => updateLine(l.id, 'tva', +e.target.value)}>
                {TVA_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
              <span className="fac-line-total" style={{ width: 90 }}>{fmtE(parseN(l.qte) * parseN(l.pu))}</span>
              <button type="button" className="fac-line-del" onClick={() => setLines(p => p.filter(x => x.id !== l.id))} disabled={lines.length === 1}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.5rem' }}>
            <button type="button" className="btn-secondary" style={{ fontSize: '.8rem' }} onClick={() => setLines(p => [...p, newLine()])}>+ Ligne</button>
            <div style={{ fontSize: '.85rem', fontWeight: 700 }}>
              HT : {fmtE(totals.ht)} &middot; TVA : {fmtE(totals.tva)} &middot; TTC : {fmtE(totals.ttc)}
            </div>
          </div>

          <div className="fac-field" style={{ marginTop: '.75rem' }}>
            <label>Notes / Conditions</label>
            <textarea className="fac-notes-input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="plan-modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : '💾 Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function DevisPage() {
  const [devisList, setDevisList] = useState([])
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [modal, setModal] = useState(null)   // null | 'new' | devis object
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  // Load devis
  const loadDevis = useCallback(() => {
    setLoading(true)
    supabase.from('devis').select('*').order('date_emission', { ascending: false }).then(({ data, error }) => {
        if (error && (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
          setTableExists(false)
          setLoading(false)
          return
        }
        setDevisList(data || [])
        setLoading(false)
      })
  }, [])

  // Load clients
  const loadClients = useCallback(() => {
    supabase.from('clients').select('id, name, nom').order('name', { ascending: true }).then(({ data }) => setClients(data || []))
  }, [])

  // Load transactions
  const loadTransactions = useCallback(() => {
    supabase.from('transactions').select('id, reference, nom').order('created_at', { ascending: false }).then(({ data }) => setTransactions(data || []))
  }, [])

  useEffect(() => {
    loadDevis()
    loadClients()
    loadTransactions()
  }, [loadDevis, loadClients, loadTransactions])

  // Filter
  const filtered = useMemo(() => {
    let rows = devisList
    if (filterStatut) rows = rows.filter(d => d.statut === filterStatut)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(d =>
        d.numero?.toLowerCase().includes(q) ||
        d.client_nom?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [devisList, search, filterStatut])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date_emission', 'desc')

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paged = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPI calculations
  const kpis = useMemo(() => {
    const total = devisList.length
    const montantTotal = devisList.reduce((s, d) => s + (d.total_ht || 0), 0)
    const acceptes = devisList.filter(d => d.statut === 'accepte' || d.statut === 'facture').length
    const nonBrouillon = devisList.filter(d => d.statut !== 'brouillon').length
    const tauxAcceptation = nonBrouillon > 0 ? Math.round((acceptes / nonBrouillon) * 100) : 0
    const enAttente = devisList
      .filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.total_ht || 0), 0)
    return { total, montantTotal, tauxAcceptation, enAttente }
  }, [devisList])

  // Save handler
  function handleSave(devis) {
    loadDevis()
    setModal(null)
  }

  // Delete
  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce devis ?')) return
    await supabase.from('devis').delete().eq('id', id)
    loadDevis()
  }

  // Duplicate
  async function handleDuplicate(devis) {
    const lignes = typeof devis.lignes === 'string' ? devis.lignes : JSON.stringify(devis.lignes || [])
    const today = new Date().toISOString().slice(0, 10)
    const validite = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()
    const payload = {
      numero: devis.numero + '-COPIE',
      client_id: devis.client_id,
      client_nom: devis.client_nom,
      date_emission: today,
      date_validite: validite,
      lignes,
      total_ht: devis.total_ht,
      tva: devis.tva,
      total_ttc: devis.total_ttc,
      statut: 'brouillon',
      notes: devis.notes,
      transaction_id: devis.transaction_id}
    await supabase.from('devis').insert(payload)
    loadDevis()
  }

  // Convert to invoice
  async function handleConvertToFacture(devis) {
    if (!window.confirm('Convertir ce devis en facture ? Une nouvelle facture sera créée.')) return
    const lignes = typeof devis.lignes === 'string' ? devis.lignes : JSON.stringify(devis.lignes || [])
    const today = new Date().toISOString().slice(0, 10)
    const echeance = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()
    const facturePayload = {
      num_facture: devis.numero?.replace('DEV', 'FAC') || `FAC-${new Date().getFullYear()}-001`,
      date_emission: today,
      date_echeance: echeance,
      statut: 'brouillon',
      client_nom: devis.client_nom,
      lignes,
      notes: devis.notes,
      total_ht: devis.total_ht,
      total_ttc: devis.total_ttc}
    const { data: facture, error } = await supabase.from('factures').insert(facturePayload).select().single()
    if (error) {
      alert('Erreur lors de la création de la facture : ' + error.message)
      return
    }
    // Update devis status and link
    await supabase.from('devis').update({
      statut: 'facture',
      converted_facture_id: facture?.id
    }).eq('id', devis.id)
    loadDevis()
    alert('Facture créée avec succès : ' + facturePayload.num_facture)
  }

  // Migration check
  if (!tableExists) {
    return (
      <div className="devis-page" style={{ padding: '2rem 2.5rem' }}>
        <div className="admin-page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h1>Devis</h1>
            <p>Module de gestion des devis</p>
          </div>
        </div>
        <div style={{
          background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 12,
          padding: '2rem', maxWidth: 700
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '.75rem' }}>Table "devis" introuvable</h3>
          <p style={{ color: '#78350f', marginBottom: '1rem', lineHeight: 1.6 }}>
            La table <code>devis</code> n'existe pas encore dans votre base de données Supabase.
            Veuillez exécuter la migration SQL ci-dessous dans le SQL Editor de Supabase :
          </p>
          <pre style={{
            background: '#1a1a2e', color: '#e2e8f0', padding: '1rem', borderRadius: 8,
            fontSize: '.8rem', overflowX: 'auto', lineHeight: 1.5
          }}>{`CREATE TABLE IF NOT EXISTS devis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  numero text,
  client_id uuid REFERENCES clients(id),
  client_nom text,
  date_emission date DEFAULT CURRENT_DATE,
  date_validite date DEFAULT (CURRENT_DATE + 30),
  lignes jsonb DEFAULT '[]',
  total_ht numeric(15,2) DEFAULT 0,
  tva numeric(15,2) DEFAULT 0,
  total_ttc numeric(15,2) DEFAULT 0,
  statut text DEFAULT 'brouillon',
  notes text,
  transaction_id uuid REFERENCES transactions(id),
  converted_facture_id uuid
);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage devis"
  ON devis FOR ALL USING (true) WITH CHECK (true);`}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="devis-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1>Devis</h1>
          <p>{devisList.length} devis{devisList.length !== 1 ? '' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Nouveau devis</button>
      </div>

      {/* KPIs */}
      <div className="devis-kpi-bar" style={{ flexShrink: 0 }}>
        <div className="devis-kpi-chip" style={{ borderColor: '#3b82f6' }}>
          <span className="devis-kpi-label" style={{ color: '#3b82f6' }}>Nombre de devis</span>
          <span className="devis-kpi-val">{kpis.total}</span>
        </div>
        <div className="devis-kpi-chip" style={{ borderColor: '#22c55e' }}>
          <span className="devis-kpi-label" style={{ color: '#22c55e' }}>Montant total HT</span>
          <span className="devis-kpi-val">{fmtE(kpis.montantTotal)}</span>
        </div>
        <div className="devis-kpi-chip" style={{ borderColor: '#a855f7' }}>
          <span className="devis-kpi-label" style={{ color: '#a855f7' }}>Taux d'acceptation</span>
          <span className="devis-kpi-val">{kpis.tauxAcceptation}%</span>
        </div>
        <div className="devis-kpi-chip" style={{ borderColor: '#f59e0b' }}>
          <span className="devis-kpi-label" style={{ color: '#f59e0b' }}>Montant en attente</span>
          <span className="devis-kpi-val">{fmtE(kpis.enAttente)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar" style={{ marginTop: '.75rem' }}>
        <input
          className="table-search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher par numéro ou client…"
        />
        <select
          className="table-pagesize"
          value={filterStatut}
          onChange={e => { setFilterStatut(e.target.value); setPage(1) }}
        >
          <option value="">Tous statuts</option>
          {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="users-table-wrapper" style={{ overflowX: 'auto', flex: 1, minHeight: 0 }}>
        <table className="users-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="Numéro" field="numero" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Client" field="client_nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Date" field="date_emission" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Montant HT" field="total_ht" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
              <SortableHeader label="Montant TTC" field="total_ttc" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ textAlign: 'right' }} />
              <SortableHeader label="Statut" field="statut" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><Spinner /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucun devis</td></tr>
            ) : paged.map(d => {
              const sm = statutMeta(d.statut)
              return (
                <tr key={d.id} className="users-table-row">
                  <td style={{ fontWeight: 600 }}>{d.numero}</td>
                  <td style={{ fontWeight: 500 }}>{d.client_nom}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(d.date_emission)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtE(d.total_ht)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtE(d.total_ttc)}</td>
                  <td>
                    <span className="fac-statut-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
                      {d.statut === 'brouillon' && (
                        <button className="btn-icon" title="Modifier" onClick={() => setModal(d)}>\u270f\ufe0f</button>
                      )}
                      <button className="btn-icon" title="Dupliquer" onClick={() => handleDuplicate(d)}>📋</button>
                      {(d.statut === 'accepte') && (
                        <button
                          className="btn-icon"
                          title="Convertir en facture"
                          onClick={() => handleConvertToFacture(d)}
                          style={{ fontSize: '.75rem' }}
                        >\ud83e\uddfe</button>
                      )}
                      {d.statut === 'brouillon' && (
                        <button className="btn-icon" title="Supprimer" onClick={() => handleDelete(d.id)}>\ud83d\uddd1</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(1)}>\u00ab</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>\u2039</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>\u203a</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>\u00bb</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DevisModal
          devis={modal === 'new' ? null : modal}
          societe={null}
          clients={clients}
          transactions={transactions}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
