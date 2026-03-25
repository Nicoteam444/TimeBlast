import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSociete } from '../contexts/SocieteContext'
import { supabase } from '../lib/supabase'

const B = '#2B4C7E'

// Toutes les pages navigables
const PAGES = [
  { label: 'Dashboard', path: '/', icon: '🏠', cat: 'nav' },
  { label: 'Calendrier', path: '/activite/saisie', icon: '📆', cat: 'nav' },
  { label: 'Contacts CRM', path: '/crm/contacts', icon: '👤', cat: 'nav' },
  { label: 'Entreprises', path: '/crm/entreprises', icon: '🏢', cat: 'nav' },
  { label: 'Leads', path: '/crm/leads', icon: '🚀', cat: 'nav' },
  { label: 'Clients', path: '/commerce/clients', icon: '👥', cat: 'nav' },
  { label: 'Opportunites', path: '/commerce/transactions', icon: '💼', cat: 'nav' },
  { label: 'Devis', path: '/commerce/devis', icon: '📝', cat: 'nav' },
  { label: 'Produits', path: '/commerce/produits', icon: '🏷️', cat: 'nav' },
  { label: 'Abonnements', path: '/commerce/abonnements', icon: '🔄', cat: 'nav' },
  { label: 'Gestion de projet', path: '/activite/projets', icon: '📁', cat: 'nav' },
  { label: 'Planification', path: '/activite/planification', icon: '📅', cat: 'nav' },
  { label: 'Reporting temps', path: '/activite/reporting', icon: '📊', cat: 'nav' },
  { label: 'Rentabilite', path: '/activite/rentabilite', icon: '💹', cat: 'nav' },
  { label: 'Collaborateurs', path: '/activite/equipe', icon: '📋', cat: 'nav' },
  { label: 'Absences', path: '/activite/absences', icon: '🏖️', cat: 'nav' },
  { label: 'Validations', path: '/activite/validation', icon: '✅', cat: 'nav' },
  { label: 'Notes de frais', path: '/equipe/notes-de-frais', icon: '🧾', cat: 'nav' },
  { label: 'Trombinoscope', path: '/equipe/trombinoscope', icon: '🪪', cat: 'nav' },
  { label: 'Competences', path: '/equipe/competences', icon: '🎯', cat: 'nav' },
  { label: 'Facturation (Ventes)', path: '/finance/facturation', icon: '📤', cat: 'nav' },
  { label: 'Achats', path: '/gestion/achats', icon: '📥', cat: 'nav' },
  { label: 'Stock', path: '/commerce/stock', icon: '📦', cat: 'nav' },
  { label: 'Transactions bancaires', path: '/gestion/transactions', icon: '🏦', cat: 'nav' },
  { label: 'Tableau de bord Gestion', path: '/gestion/tableau-de-bord', icon: '📊', cat: 'nav' },
  { label: 'Business Intelligence', path: '/finance/business-intelligence', icon: '📊', cat: 'nav' },
  { label: 'Previsionnel', path: '/finance/previsionnel', icon: '📈', cat: 'nav' },
  { label: 'Immobilisations', path: '/finance/immobilisations', icon: '🏢', cat: 'nav' },
  { label: 'Rapprochement', path: '/finance/rapprochement', icon: '🔗', cat: 'nav' },
  { label: 'Campagnes Marketing', path: '/marketing/campagnes', icon: '📣', cat: 'nav' },
  { label: 'Archives Documents', path: '/documents/archives', icon: '🗄️', cat: 'nav' },
  { label: 'Workflows', path: '/automatisation/workflows', icon: '⚡', cat: 'nav' },
  { label: 'Parametres', path: '/parametres', icon: '⚙️', cat: 'nav' },
  { label: 'Administration', path: '/admin', icon: '🛠', cat: 'nav' },
  { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: '👥', cat: 'nav' },
]

const ACTIONS = [
  { label: 'Creer un contact', icon: '➕ 👤', action: 'quickadd', key: 'contact' },
  { label: 'Creer une opportunite', icon: '➕ 💼', action: 'quickadd', key: 'opportunite' },
  { label: 'Creer un projet', icon: '➕ 📁', action: 'quickadd', key: 'projet' },
  { label: 'Saisir du temps', icon: '➕ ⏱️', action: 'quickadd', key: 'temps' },
  { label: 'Creer un devis', icon: '➕ 📝', action: 'navigate', path: '/commerce/devis' },
  { label: 'Nouvelle facture', icon: '➕ 🧾', action: 'navigate', path: '/finance/facturation' },
]

const RECENTS_KEY = 'tb_cmd_recents'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]') } catch { return [] }
  })
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedSociete } = useSociete()

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setSearchResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search Supabase when query changes
  useEffect(() => {
    if (!query || query.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const q = query.toLowerCase()
      const socId = selectedSociete?.id
      const results = []

      try {
        // Search contacts
        let cq = supabase.from('contacts').select('id, nom, prenom').or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`).limit(3)
        if (socId) cq = cq.eq('societe_id', socId)
        const { data: contacts } = await cq
        if (contacts) contacts.forEach(c => results.push({
          label: `${c.prenom || ''} ${c.nom || ''}`.trim(), icon: '👤', path: `/crm/contacts/${c.id}`, cat: 'Contact'
        }))

        // Search clients
        let clq = supabase.from('clients').select('id, name').ilike('name', `%${q}%`).limit(3)
        if (socId) clq = clq.eq('societe_id', socId)
        const { data: clients } = await clq
        if (clients) clients.forEach(c => results.push({
          label: c.name, icon: '👥', path: `/clients/${c.id}`, cat: 'Client'
        }))

        // Search projets
        let pq = supabase.from('projets').select('id, name').ilike('name', `%${q}%`).limit(3)
        if (socId) pq = pq.eq('societe_id', socId)
        const { data: projets } = await pq
        if (projets) projets.forEach(p => results.push({
          label: p.name, icon: '📁', path: `/activite/projets/${p.id}`, cat: 'Projet'
        }))

        // Search factures
        let fq = supabase.from('factures').select('id, numero, client_nom').or(`numero.ilike.%${q}%,client_nom.ilike.%${q}%`).limit(3)
        if (socId) fq = fq.eq('societe_id', socId)
        const { data: factures } = await fq
        if (factures) factures.forEach(f => results.push({
          label: `${f.numero || ''} — ${f.client_nom || ''}`.trim(), icon: '🧾', path: `/finance/facturation`, cat: 'Facture'
        }))

        // Search transactions
        let tq = supabase.from('transactions').select('id, name').ilike('name', `%${q}%`).limit(3)
        if (socId) tq = tq.eq('societe_id', socId)
        const { data: transactions } = await tq
        if (transactions) transactions.forEach(t => results.push({
          label: t.name, icon: '💼', path: `/commerce/transactions/${t.id}`, cat: 'Opportunite'
        }))
      } catch {}

      setSearchResults(results)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selectedSociete?.id])

  // Filter pages & actions by query
  const filteredPages = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return PAGES.filter(p => p.label.toLowerCase().includes(q)).slice(0, 6)
  }, [query])

  const filteredActions = useMemo(() => {
    if (!query) return ACTIONS.slice(0, 4)
    const q = query.toLowerCase()
    return ACTIONS.filter(a => a.label.toLowerCase().includes(q))
  }, [query])

  // All visible items
  const allItems = useMemo(() => {
    const items = []
    if (!query) {
      if (recents.length > 0) items.push({ type: 'header', label: '📌 Recents' }, ...recents.slice(0, 4).map(r => ({ ...r, type: 'item' })))
      items.push({ type: 'header', label: '⚡ Actions rapides' }, ...filteredActions.map(a => ({ ...a, type: 'item' })))
    } else {
      if (searchResults.length > 0) items.push({ type: 'header', label: '🔍 Resultats' }, ...searchResults.map(r => ({ ...r, type: 'item' })))
      if (filteredPages.length > 0) items.push({ type: 'header', label: '🧭 Pages' }, ...filteredPages.map(p => ({ ...p, type: 'item' })))
      if (filteredActions.length > 0) items.push({ type: 'header', label: '⚡ Actions' }, ...filteredActions.map(a => ({ ...a, type: 'item' })))
    }
    return items
  }, [query, recents, searchResults, filteredPages, filteredActions])

  const selectableItems = allItems.filter(i => i.type === 'item')

  function executeItem(item) {
    // Save to recents
    const recent = { label: item.label, icon: item.icon, path: item.path, cat: item.cat || '' }
    if (item.path) {
      const updated = [recent, ...recents.filter(r => r.path !== item.path)].slice(0, 8)
      setRecents(updated)
      localStorage.setItem(RECENTS_KEY, JSON.stringify(updated))
    }

    if (item.path) {
      navigate(item.path)
    } else if (item.action === 'navigate') {
      navigate(item.path)
    }
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, selectableItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && selectableItems[selected]) { executeItem(selectableItems[selected]) }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh',
    }} onClick={() => setOpen(false)}>
      <div style={{
        width: '100%', maxWidth: 580, background: '#fff', borderRadius: 16,
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'cmdSlideIn .15s ease',
      }} onClick={e => e.stopPropagation()}>
        <style>{`
          @keyframes cmdSlideIn { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', gap: 12 }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Rechercher, naviguer, agir..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '1rem', color: '#1a2332',
              background: 'transparent', fontWeight: 500,
            }}
          />
          <kbd style={{
            padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #e2e8f0',
            fontSize: '.7rem', color: '#94a3b8', fontFamily: 'monospace',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
          {searching && (
            <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '.85rem' }}>
              Recherche...
            </div>
          )}

          {allItems.length === 0 && query && !searching && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <p style={{ margin: 0, fontSize: '.9rem' }}>Aucun resultat pour "{query}"</p>
            </div>
          )}

          {allItems.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <div key={`h-${idx}`} style={{
                  padding: '8px 20px 4px', fontSize: '.7rem', fontWeight: 700, color: '#94a3b8',
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>{item.label}</div>
              )
            }

            const selIdx = selectableItems.indexOf(item)
            const isSelected = selIdx === selected

            return (
              <div
                key={`i-${idx}`}
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelected(selIdx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', cursor: 'pointer',
                  background: isSelected ? `${B}10` : 'transparent',
                  borderLeft: isSelected ? `3px solid ${B}` : '3px solid transparent',
                  transition: 'all .1s',
                }}
              >
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.9rem', fontWeight: 600, color: '#1a2332' }}>{item.label}</div>
                  {item.cat && <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{item.cat}</div>}
                </div>
                {isSelected && <span style={{ fontSize: '.7rem', color: '#94a3b8' }}>↵</span>}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #f1f5f9', background: '#fafbfc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: 12, fontSize: '.72rem', color: '#94a3b8' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#e2e8f0', fontSize: '.65rem' }}>↑↓</kbd> naviguer</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#e2e8f0', fontSize: '.65rem' }}>↵</kbd> ouvrir</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#e2e8f0', fontSize: '.65rem' }}>esc</kbd> fermer</span>
          </div>
          <span style={{ fontSize: '.72rem', color: B, fontWeight: 600 }}>⌘K TimeBlast.ai</span>
        </div>
      </div>
    </div>
  )
}
