import { useState, useEffect, useMemo } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'

function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €'
}
function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }

const BANKS = [
  { id: 'qonto',      name: 'Qonto',           color: '#2A2A2A', icon: '🏦' },
  { id: 'bnp',        name: 'BNP Paribas',     color: '#009A44', icon: '🏦' },
  { id: 'sg',         name: 'Société Générale', color: '#E60028', icon: '🏦' },
  { id: 'ca',         name: 'Crédit Agricole',  color: '#00843D', icon: '🏦' },
  { id: 'boursorama', name: 'Boursorama',       color: '#FF6600', icon: '🏦' },
  { id: 'lcl',        name: 'LCL',              color: '#003DA5', icon: '🏦' },
  { id: 'revolut',    name: 'Revolut',          color: '#0075EB', icon: '🏦' },
  { id: 'stripe',     name: 'Stripe',           color: '#635BFF', icon: '💳' },
  { id: 'paypal',     name: 'PayPal',           color: '#003087', icon: '💳' },
  { id: 'gocardless', name: 'GoCardless',       color: '#1A1A2E', icon: '💳' },
]

// Demo transactions
function generateDemoTransactions() {
  const types = ['encaissement', 'decaissement']
  const categories = {
    encaissement: ['Virement client', 'Paiement facture', 'Remboursement', 'Prélèvement reçu', 'Vente CB'],
    decaissement: ['Loyer bureau', 'Salaires', 'Fournisseur', 'Abonnement SaaS', 'Frais bancaires', 'Impôts', 'Achat matériel'],
  }
  const clients = ['Acme Corp', 'TechVision', 'DataFlow', 'MegaStore', 'CloudNine', 'StartupLab']
  const fournisseurs = ['OVH', 'Office Depot', 'EDF', 'Orange Pro', 'Sage', 'Adobe', 'Amazon Business']

  const txs = []
  for (let i = 0; i < 60; i++) {
    const type = types[Math.random() > 0.45 ? 0 : 1]
    const cats = categories[type]
    const cat = cats[Math.floor(Math.random() * cats.length)]
    const montant = type === 'encaissement'
      ? Math.round((500 + Math.random() * 15000) * 100) / 100
      : Math.round((50 + Math.random() * 8000) * 100) / 100
    const daysAgo = Math.floor(Math.random() * 90)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const tiers = type === 'encaissement'
      ? clients[Math.floor(Math.random() * clients.length)]
      : fournisseurs[Math.floor(Math.random() * fournisseurs.length)]

    txs.push({
      id: `tx-${i}`,
      date: date.toISOString().split('T')[0],
      type,
      categorie: cat,
      tiers,
      montant,
      banque: BANKS[Math.floor(Math.random() * 3)].name,
      reference: `REF-${String(1000 + i).padStart(5, '0')}`,
      rapproche: Math.random() > 0.3,
    })
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date))
}

export default function TransactionsBancairesPage() {
  const { selectedSociete } = useSociete()
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterRapproche, setFilterRapproche] = useState('')
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectedBanks, setConnectedBanks] = useState(['Qonto', 'BNP Paribas'])
  const [connectingBank, setConnectingBank] = useState(null)

  useEffect(() => {
    setTransactions(generateDemoTransactions())
  }, [selectedSociete?.id])

  const filtered = useMemo(() => {
    let rows = transactions
    if (filterType) rows = rows.filter(t => t.type === filterType)
    if (filterRapproche === 'oui') rows = rows.filter(t => t.rapproche)
    if (filterRapproche === 'non') rows = rows.filter(t => !t.rapproche)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(t =>
        t.tiers?.toLowerCase().includes(q) ||
        t.categorie?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [transactions, search, filterType, filterRapproche])

  const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(filtered, 'date', 'desc')

  const totaux = useMemo(() => {
    const enc = transactions.filter(t => t.type === 'encaissement').reduce((s, t) => s + t.montant, 0)
    const dec = transactions.filter(t => t.type === 'decaissement').reduce((s, t) => s + t.montant, 0)
    return { encaissements: enc, decaissements: dec, solde: enc - dec }
  }, [transactions])

  function handleConnectBank(bank) {
    setConnectingBank(bank.id)
    setTimeout(() => {
      setConnectedBanks(prev => [...prev, bank.name])
      setConnectingBank(null)
    }, 2000)
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>🏦 Transactions</h1>
          <p>{transactions.length} opérations · {connectedBanks.length} banque{connectedBanks.length > 1 ? 's' : ''} connectée{connectedBanks.length > 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn-secondary" onClick={() => setShowConnectModal(true)}>🔗 Connecter une banque</button>
          <button className="btn-primary">📥 Importer un relevé</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>📈 Encaissements (90j)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }}>+ {fmtE(totaux.encaissements)}</div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>📉 Décaissements (90j)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>- {fmtE(totaux.decaissements)}</div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>💰 Solde net</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: totaux.solde >= 0 ? 'var(--accent)' : '#ef4444' }}>
            {totaux.solde >= 0 ? '+ ' : ''}{fmtE(totaux.solde)}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>🏦 Banques connectées</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
            {connectedBanks.map(b => (
              <span key={b} style={{ background: '#e8f4fd', color: 'var(--accent)', padding: '2px 10px', borderRadius: 6, fontSize: '.78rem', fontWeight: 600 }}>
                ✓ {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher un tiers, catégorie, référence..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '.6rem 1rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.9rem' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '.6rem 1rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.9rem' }}>
          <option value="">Tous les types</option>
          <option value="encaissement">📈 Encaissements</option>
          <option value="decaissement">📉 Décaissements</option>
        </select>
        <select value={filterRapproche} onChange={e => setFilterRapproche(e.target.value)}
          style={{ padding: '.6rem 1rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.9rem' }}>
          <option value="">Rapprochement</option>
          <option value="oui">✅ Rapprochés</option>
          <option value="non">⏳ Non rapprochés</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <SortableHeader label="Date" field="date" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <SortableHeader label="Type" field="type" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <SortableHeader label="Tiers" field="tiers" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <SortableHeader label="Catégorie" field="categorie" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <SortableHeader label="Banque" field="banque" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <SortableHeader label="Montant" field="montant" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ padding: '.75rem 1rem', textAlign: 'right', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }} />
              <th style={{ padding: '.75rem 1rem', textAlign: 'center', fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rapp.</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.slice(0, 50).map(tx => (
              <tr key={tx.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '.65rem 1rem', fontSize: '.88rem' }}>{fmtDate(tx.date)}</td>
                <td style={{ padding: '.65rem 1rem' }}>
                  <span style={{
                    background: tx.type === 'encaissement' ? '#f0fdf4' : '#fef2f2',
                    color: tx.type === 'encaissement' ? '#16a34a' : '#ef4444',
                    padding: '2px 10px', borderRadius: 6, fontSize: '.78rem', fontWeight: 600
                  }}>
                    {tx.type === 'encaissement' ? '📈 Encaissement' : '📉 Décaissement'}
                  </span>
                </td>
                <td style={{ padding: '.65rem 1rem', fontWeight: 600, fontSize: '.88rem' }}>{tx.tiers}</td>
                <td style={{ padding: '.65rem 1rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>{tx.categorie}</td>
                <td style={{ padding: '.65rem 1rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>{tx.banque}</td>
                <td style={{
                  padding: '.65rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '.9rem',
                  color: tx.type === 'encaissement' ? '#16a34a' : '#ef4444'
                }}>
                  {tx.type === 'encaissement' ? '+' : '-'} {fmtE(tx.montant)}
                </td>
                <td style={{ padding: '.65rem 1rem', textAlign: 'center', fontSize: '1rem' }}>
                  {tx.rapproche ? '✅' : '⏳'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Connexion Banque */}
      {showConnectModal && (
        <div className="landing-modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="landing-login-card" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <button className="landing-login-close" onClick={() => setShowConnectModal(false)}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem' }}>🏦</span>
              <h2 style={{ margin: '.5rem 0 0' }}>Connecter une banque</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', margin: '.5rem 0 0' }}>
                Synchronisez vos comptes pour un suivi en temps réel
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              {BANKS.map(bank => {
                const isConnected = connectedBanks.includes(bank.name)
                const isConnecting = connectingBank === bank.id
                return (
                  <button
                    key={bank.id}
                    onClick={() => !isConnected && handleConnectBank(bank)}
                    disabled={isConnected || isConnecting}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${isConnected ? '#16a34a' : 'var(--border)'}`,
                      borderRadius: 10,
                      background: isConnected ? '#f0fdf4' : 'var(--surface)',
                      cursor: isConnected ? 'default' : 'pointer',
                      textAlign: 'center',
                      transition: 'all .2s',
                      opacity: isConnecting ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '.25rem' }}>{bank.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: bank.color }}>{bank.name}</div>
                    <div style={{ fontSize: '.75rem', color: isConnected ? '#16a34a' : 'var(--text-muted)', marginTop: '.25rem' }}>
                      {isConnecting ? '⏳ Connexion...' : isConnected ? '✅ Connectée' : 'Cliquer pour connecter'}
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
              Connexion sécurisée via protocole bancaire DSP2/PSD2
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
