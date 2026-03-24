/*
-- SQL Migration: table campagnes_email
-- Execute this in Supabase SQL Editor before using this page:

CREATE TABLE IF NOT EXISTS campagnes_email (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  objet text,
  contenu text,
  destinataires_ids jsonb DEFAULT '[]',
  nb_destinataires int DEFAULT 0,
  date_envoi timestamptz,
  statut text DEFAULT 'brouillon',
  taux_ouverture numeric(5,2) DEFAULT 0,
  taux_clic numeric(5,2) DEFAULT 0,
  nb_envoyes int DEFAULT 0,
  nb_ouverts int DEFAULT 0,
  nb_clics int DEFAULT 0
);

ALTER TABLE campagnes_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage campagnes_email for their societe"
  ON campagnes_email FOR ALL
  USING (true)
  WITH CHECK (true);
*/

import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useSociete } from '../../contexts/SocieteContext'

// ── Status config ──────────────────────────────────────────
const STATUTS = [
  { id: 'brouillon',  label: 'Brouillon',   color: '#94a3b8', bg: '#f1f5f9' },
  { id: 'programmee', label: 'Programmée',   color: '#3b82f6', bg: '#eff6ff' },
  { id: 'envoyee',    label: 'Envoyée',     color: '#f59e0b', bg: '#fffbeb' },
  { id: 'terminee',   label: 'Terminée',    color: '#22c55e', bg: '#f0fdf4' },
]
function statutMeta(s) { return STATUTS.find(x => x.id === s) || STATUTS[0] }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPct(n) {
  return (n || 0).toFixed(1) + ' %'
}

// ── Campaign Modal ─────────────────────────────────────────
function CampagneModal({ campagne, societe, contacts, onSave, onClose }) {
  const isNew = !campagne?.id

  const [nom, setNom] = useState(campagne?.nom || '')
  const [objet, setObjet] = useState(campagne?.objet || '')
  const [contenu, setContenu] = useState(campagne?.contenu || '')
  const [dateEnvoi, setDateEnvoi] = useState(campagne?.date_envoi ? new Date(campagne.date_envoi).toISOString().slice(0, 16) : '')
  const [statut, setStatut] = useState(campagne?.statut || 'brouillon')
  const [selectedIds, setSelectedIds] = useState(() => {
    const ids = campagne?.destinataires_ids
    if (Array.isArray(ids)) return ids
    if (typeof ids === 'string') { try { return JSON.parse(ids) } catch { return [] } }
    return []
  })
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts
    const q = contactSearch.toLowerCase()
    return contacts.filter(c =>
      (c.nom || '').toLowerCase().includes(q) ||
      (c.prenom || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [contacts, contactSearch])

  function toggleContact(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    setSelectedIds(filteredContacts.map(c => c.id))
  }

  function deselectAll() {
    setSelectedIds([])
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!nom.trim()) return
    setSaving(true)

    const payload = {
      societe_id: societe?.id,
      nom: nom.trim(),
      objet: objet.trim(),
      contenu,
      destinataires_ids: JSON.stringify(selectedIds),
      nb_destinataires: selectedIds.length,
      date_envoi: dateEnvoi ? new Date(dateEnvoi).toISOString() : null,
      statut,
    }

    try {
      if (isNew) {
        const { data } = await supabase.from('campagnes_email').insert(payload).select().single()
        onSave(data)
      } else {
        await supabase.from('campagnes_email').update(payload).eq('id', campagne.id)
        onSave({ ...campagne, ...payload })
      }
    } catch (err) {
      console.error('Erreur sauvegarde campagne:', err)
    }
    setSaving(false)
  }

  return (
    <div className="plan-modal-overlay" onClick={onClose}>
      <div className="fac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 780 }}>
        <div className="plan-modal-header">
          <h3>{isNew ? 'Nouvelle campagne email' : `Modifier : ${campagne.nom}`}</h3>
          <button className="plan-modal-close" onClick={onClose}>{'\u2715'}</button>
        </div>
        <form onSubmit={handleSave} className="fac-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Basic info */}
          <div className="fac-fields" style={{ gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
            <div className="fac-field">
              <label>Nom de la campagne *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Newsletter Mars 2026" />
            </div>
            <div className="fac-field">
              <label>Objet de l'email</label>
              <input value={objet} onChange={e => setObjet(e.target.value)} placeholder="Objet visible par les destinataires" />
            </div>
          </div>

          <div className="fac-fields" style={{ gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
            <div className="fac-field">
              <label>Date d'envoi programmé</label>
              <input type="datetime-local" value={dateEnvoi} onChange={e => setDateEnvoi(e.target.value)} />
            </div>
            <div className="fac-field">
              <label>Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value)}>
                {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Email content */}
          <div className="fac-field" style={{ marginBottom: '.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
              <label>Contenu de l'email (HTML)</label>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '.75rem', padding: '.25rem .5rem' }}
                onClick={() => setShowPreview(p => !p)}
              >
                {showPreview ? 'Modifier' : 'Aperçu'}
              </button>
            </div>
            {showPreview ? (
              <div style={{
                border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
                minHeight: 150, background: '#fff', fontSize: '.85rem', lineHeight: 1.6,
              }} dangerouslySetInnerHTML={{ __html: contenu }} />
            ) : (
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                rows={8}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '.8rem' }}
                placeholder="<h1>Bonjour {{prenom}},</h1>\n<p>Contenu de votre email...</p>"
              />
            )}
          </div>

          {/* Destinataires */}
          <div className="fac-field" style={{ marginBottom: '.75rem' }}>
            <label>Destinataires ({selectedIds.length} sélectionné{selectedIds.length !== 1 ? 's' : ''})</label>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', alignItems: 'center' }}>
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Rechercher un contact..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-secondary" style={{ fontSize: '.75rem', padding: '.25rem .5rem', whiteSpace: 'nowrap' }} onClick={selectAll}>Tout sélectionner</button>
              <button type="button" className="btn-secondary" style={{ fontSize: '.75rem', padding: '.25rem .5rem', whiteSpace: 'nowrap' }} onClick={deselectAll}>Désélectionner</button>
            </div>
            <div style={{
              maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)',
              borderRadius: 8, padding: '.5rem',
            }}>
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '.5rem' }}>
                  Aucun contact trouvé
                </p>
              ) : filteredContacts.map(c => (
                <label key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.3rem .25rem',
                  cursor: 'pointer', fontSize: '.85rem', borderRadius: 4,
                  background: selectedIds.includes(c.id) ? '#eff6ff' : 'transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                  />
                  <span style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                  {c.email && <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{c.email}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="plan-modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Campaign Detail (expandable) ───────────────────────────
function CampagneDetail({ campagne, contacts }) {
  const destinataires = useMemo(() => {
    const ids = Array.isArray(campagne.destinataires_ids)
      ? campagne.destinataires_ids
      : (() => { try { return JSON.parse(campagne.destinataires_ids || '[]') } catch { return [] } })()
    return contacts.filter(c => ids.includes(c.id))
  }, [campagne.destinataires_ids, contacts])

  const stats = [
    { label: 'Envoyés',       value: campagne.nb_envoyes || 0,  total: campagne.nb_destinataires || 0, color: '#3b82f6' },
    { label: 'Ouverts',       value: campagne.nb_ouverts || 0,  total: campagne.nb_envoyes || 0,       color: '#22c55e' },
    { label: 'Cliqués',       value: campagne.nb_clics || 0,    total: campagne.nb_envoyes || 0,       color: '#f59e0b' },
    { label: 'Désabonnés',    value: 0,                          total: campagne.nb_envoyes || 0,       color: '#ef4444' },
  ]

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Email preview */}
            <div>
              <h4 style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: '.5rem', color: 'var(--text-secondary)' }}>
                Aperçu du contenu
              </h4>
              {campagne.contenu ? (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
                  background: '#fff', fontSize: '.8rem', lineHeight: 1.6, maxHeight: 200,
                  overflowY: 'auto',
                }} dangerouslySetInnerHTML={{ __html: campagne.contenu }} />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', fontStyle: 'italic' }}>Aucun contenu</p>
              )}
              {destinataires.length > 0 && (
                <div style={{ marginTop: '.75rem' }}>
                  <h4 style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: '.35rem', color: 'var(--text-secondary)' }}>
                    Destinataires ({destinataires.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                    {destinataires.slice(0, 10).map(c => (
                      <span key={c.id} style={{
                        fontSize: '.75rem', background: '#e2e8f0', borderRadius: 12,
                        padding: '.15rem .5rem', color: '#475569',
                      }}>
                        {c.prenom} {c.nom}
                      </span>
                    ))}
                    {destinataires.length > 10 && (
                      <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                        +{destinataires.length - 10} autres
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div>
              <h4 style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: '.75rem', color: 'var(--text-secondary)' }}>
                Statistiques de la campagne
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {stats.map(s => {
                  const pct = s.total > 0 ? Math.round((s.value / s.total) * 100) : 0
                  return (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem' }}>
                        <span style={{ fontWeight: 500 }}>{s.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.value} / {s.total} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: pct + '%', background: s.color,
                          borderRadius: 4, transition: 'width .3s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function CampagnesEmailPage() {
  const { selectedSociete } = useSociete()
  const [campagnes, setCampagnes] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | campagne object
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const PAGE_SIZE = 50

  // Load campagnes
  const loadCampagnes = useCallback(() => {
    if (!selectedSociete?.id) { setCampagnes([]); setLoading(false); return }
    setLoading(true)
    supabase.from('campagnes_email').select('*')
      .eq('societe_id', selectedSociete.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error && (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
          setTableExists(false)
          setLoading(false)
          return
        }
        setCampagnes(data || [])
        setLoading(false)
      })
  }, [selectedSociete?.id])

  // Load contacts for destinataires
  const loadContacts = useCallback(() => {
    if (!selectedSociete?.id) return
    supabase.from('contacts').select('id, nom, prenom, email')
      .eq('societe_id', selectedSociete.id)
      .order('nom', { ascending: true })
      .then(({ data }) => setContacts(data || []))
  }, [selectedSociete?.id])

  useEffect(() => {
    loadCampagnes()
    loadContacts()
  }, [loadCampagnes, loadContacts])

  // Sort toggle
  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Filter & sort
  const filtered = useMemo(() => {
    let rows = campagnes
    if (filterStatut) rows = rows.filter(c => c.statut === filterStatut)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.objet?.toLowerCase().includes(q)
      )
    }
    rows = [...rows].sort((a, b) => {
      let va = a[sortCol] ?? '', vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      va = String(va); vb = String(vb)
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return rows
  }, [campagnes, search, filterStatut, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPI calculations
  const kpis = useMemo(() => {
    const total = campagnes.length
    const envoyees = campagnes.filter(c => c.statut === 'envoyee' || c.statut === 'terminee').length
    const withStats = campagnes.filter(c => c.nb_envoyes > 0)
    const avgOuverture = withStats.length > 0
      ? withStats.reduce((s, c) => s + (c.taux_ouverture || 0), 0) / withStats.length
      : 0
    const avgClic = withStats.length > 0
      ? withStats.reduce((s, c) => s + (c.taux_clic || 0), 0) / withStats.length
      : 0
    return { total, envoyees, avgOuverture, avgClic }
  }, [campagnes])

  // Save handler
  function handleSave() {
    loadCampagnes()
    setModal(null)
  }

  // Delete
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette campagne ?')) return
    await supabase.from('campagnes_email').delete().eq('id', id)
    if (expandedId === id) setExpandedId(null)
    loadCampagnes()
  }

  // Duplicate
  async function handleDuplicate(campagne) {
    const payload = {
      societe_id: selectedSociete?.id,
      nom: campagne.nom + ' (copie)',
      objet: campagne.objet,
      contenu: campagne.contenu,
      destinataires_ids: typeof campagne.destinataires_ids === 'string' ? campagne.destinataires_ids : JSON.stringify(campagne.destinataires_ids || []),
      nb_destinataires: campagne.nb_destinataires,
      date_envoi: null,
      statut: 'brouillon',
      taux_ouverture: 0,
      taux_clic: 0,
      nb_envoyes: 0,
      nb_ouverts: 0,
      nb_clics: 0,
    }
    await supabase.from('campagnes_email').insert(payload)
    loadCampagnes()
  }

  // Fake "send now"
  async function handleEnvoyerMaintenant(campagne) {
    if (!window.confirm(`Envoyer la campagne "${campagne.nom}" maintenant ?\n\n(Simulation : le statut passera en "envoyée")`)) return
    await supabase.from('campagnes_email').update({
      statut: 'envoyee',
      date_envoi: new Date().toISOString(),
    }).eq('id', campagne.id)
    loadCampagnes()
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="sort-icon">{'\u2195'}</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
  }

  // Migration check
  if (!tableExists) {
    return (
      <div className="admin-page" style={{ padding: '2rem 2.5rem' }}>
        <div className="admin-page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h1>Campagnes Email</h1>
            <p>Module de gestion des campagnes email marketing</p>
          </div>
        </div>
        <div style={{
          background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 12,
          padding: '2rem', maxWidth: 700
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '.75rem' }}>Table "campagnes_email" introuvable</h3>
          <p style={{ color: '#78350f', marginBottom: '1rem', lineHeight: 1.6 }}>
            La table <code>campagnes_email</code> n'existe pas encore dans votre base de données Supabase.
            Veuillez exécuter la migration SQL ci-dessous dans le SQL Editor de Supabase :
          </p>
          <pre style={{
            background: '#1a1a2e', color: '#e2e8f0', padding: '1rem', borderRadius: 8,
            fontSize: '.8rem', overflowX: 'auto', lineHeight: 1.5
          }}>{`CREATE TABLE IF NOT EXISTS campagnes_email (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL,
  objet text,
  contenu text,
  destinataires_ids jsonb DEFAULT '[]',
  nb_destinataires int DEFAULT 0,
  date_envoi timestamptz,
  statut text DEFAULT 'brouillon',
  taux_ouverture numeric(5,2) DEFAULT 0,
  taux_clic numeric(5,2) DEFAULT 0,
  nb_envoyes int DEFAULT 0,
  nb_ouverts int DEFAULT 0,
  nb_clics int DEFAULT 0
);

ALTER TABLE campagnes_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage campagnes_email"
  ON campagnes_email FOR ALL
  USING (true) WITH CHECK (true);`}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1>Campagnes Email</h1>
          <p>{campagnes.length} campagne{campagnes.length !== 1 ? 's' : ''}{selectedSociete ? ` \u00b7 ${selectedSociete.name}` : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Nouvelle campagne</button>
      </div>

      {/* KPIs */}
      <div className="produit-kpi-bar" style={{ flexShrink: 0 }}>
        <div className="produit-kpi-chip" style={{ borderColor: '#3b82f6' }}>
          <span className="produit-kpi-label" style={{ color: '#3b82f6' }}>Campagnes total</span>
          <span className="produit-kpi-val">{kpis.total}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#22c55e' }}>
          <span className="produit-kpi-label" style={{ color: '#22c55e' }}>Envoyées</span>
          <span className="produit-kpi-val">{kpis.envoyees}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#f59e0b' }}>
          <span className="produit-kpi-label" style={{ color: '#f59e0b' }}>Taux ouverture moyen</span>
          <span className="produit-kpi-val">{formatPct(kpis.avgOuverture)}</span>
        </div>
        <div className="produit-kpi-chip" style={{ borderColor: '#a855f7' }}>
          <span className="produit-kpi-label" style={{ color: '#a855f7' }}>Taux clic moyen</span>
          <span className="produit-kpi-val">{formatPct(kpis.avgClic)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar" style={{ marginTop: '.75rem' }}>
        <input
          className="table-search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher par nom ou objet..."
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
              <th style={{ width: 28 }}></th>
              <th className="sortable" onClick={() => toggleSort('nom')}>Nom campagne <SortIcon col="nom" /></th>
              <th className="sortable" onClick={() => toggleSort('objet')}>Objet email <SortIcon col="objet" /></th>
              <th className="sortable" style={{ textAlign: 'center' }} onClick={() => toggleSort('nb_destinataires')}>Destinataires <SortIcon col="nb_destinataires" /></th>
              <th>Statut</th>
              <th className="sortable" onClick={() => toggleSort('date_envoi')}>Date envoi <SortIcon col="date_envoi" /></th>
              <th className="sortable" style={{ textAlign: 'right' }} onClick={() => toggleSort('taux_ouverture')}>Ouverture <SortIcon col="taux_ouverture" /></th>
              <th className="sortable" style={{ textAlign: 'right' }} onClick={() => toggleSort('taux_clic')}>Clic <SortIcon col="taux_clic" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chargement...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune campagne</td></tr>
            ) : paged.map(c => {
              const sm = statutMeta(c.statut)
              const isExpanded = expandedId === c.id
              return [
                <tr key={c.id} className="users-table-row" style={{ cursor: 'pointer' }}>
                  <td onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', transition: 'transform .2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>{'\u25B6'}</span>
                  </td>
                  <td style={{ fontWeight: 600 }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{c.nom}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{c.objet || '-'}</td>
                  <td style={{ textAlign: 'center' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{c.nb_destinataires || 0}</td>
                  <td onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    <span className="fac-statut-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{formatDate(c.date_envoi)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{formatPct(c.taux_ouverture)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>{formatPct(c.taux_clic)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
                      <button className="btn-icon" title="Modifier" onClick={() => setModal(c)}>{'\u270F\uFE0F'}</button>
                      <button className="btn-icon" title="Dupliquer" onClick={() => handleDuplicate(c)}>{'\uD83D\uDCCB'}</button>
                      {(c.statut === 'brouillon' || c.statut === 'programmee') && (
                        <button
                          className="btn-icon"
                          title="Envoyer maintenant"
                          onClick={() => handleEnvoyerMaintenant(c)}
                          style={{ fontSize: '.75rem' }}
                        >{'\uD83D\uDE80'}</button>
                      )}
                      <button className="btn-icon" title="Supprimer" onClick={() => handleDelete(c.id)}>{'\uD83D\uDDD1'}</button>
                    </div>
                  </td>
                </tr>,
                isExpanded && <CampagneDetail key={c.id + '-detail'} campagne={c} contacts={contacts} />,
              ]
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(1)}>{'\u00ab'}</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>{'\u2039'}</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{'\u203a'}</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>{'\u00bb'}</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CampagneModal
          campagne={modal === 'new' ? null : modal}
          societe={selectedSociete}
          contacts={contacts}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
