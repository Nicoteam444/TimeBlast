import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useDemo } from './DemoContext'
import { useSociete } from './SocieteContext'
import { supabase } from '../lib/supabase'

const NotificationsContext = createContext(null)

const STORAGE_KEY = 'notif_read_ids'

function loadReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {}
}

function getMockNotifications() {
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(now); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const oneHourAgo = new Date(now); oneHourAgo.setHours(oneHourAgo.getHours() - 1)
  const threeHoursAgo = new Date(now); threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)

  return [
    {
      id: 'demo-n1',
      type: 'finance',
      severity: 'danger',
      title: 'Facture en retard',
      message: 'Facture FAC-2024-047 (Groupe Altea) - echue depuis 12 jours',
      date: oneHourAgo.toISOString(),
      read: false,
      link: '/finance/facturation',
    },
    {
      id: 'demo-n2',
      type: 'finance',
      severity: 'danger',
      title: 'Facture en retard',
      message: 'Facture FAC-2024-051 (Meridian Finance) - echue depuis 5 jours',
      date: threeHoursAgo.toISOString(),
      read: false,
      link: '/finance/facturation',
    },
    {
      id: 'demo-n3',
      type: 'rh',
      severity: 'warning',
      title: 'Conge a valider',
      message: 'Alice Martin a demande 5 jours de conges (24-28 mars)',
      date: yesterday.toISOString(),
      read: false,
      link: '/activite/absences',
    },
    {
      id: 'demo-n4',
      type: 'rh',
      severity: 'warning',
      title: 'Conge a valider',
      message: 'Thomas Durand a demande 2 jours de RTT (1-2 avril)',
      date: yesterday.toISOString(),
      read: false,
      link: '/activite/absences',
    },
    {
      id: 'demo-n5',
      type: 'commercial',
      severity: 'warning',
      title: 'Transaction proche de fermeture',
      message: 'Audit SI Altea 2024 - fermeture prevue dans 4 jours (240 000 EUR)',
      date: twoDaysAgo.toISOString(),
      read: false,
      link: '/commerce/transactions',
    },
    {
      id: 'demo-n6',
      type: 'finance',
      severity: 'warning',
      title: 'Projet depasse le budget',
      message: 'Migration ERP Meridian - 112% du budget consomme (268 800 EUR / 240 000 EUR)',
      date: twoDaysAgo.toISOString(),
      read: false,
      link: '/activite/projets',
    },
    {
      id: 'demo-n7',
      type: 'rh',
      severity: 'info',
      title: 'Note de frais a approuver',
      message: '3 notes de frais en attente de validation (total: 542 EUR)',
      date: threeDaysAgo.toISOString(),
      read: false,
      link: '/equipe/notes-de-frais',
    },
    {
      id: 'demo-n8',
      type: 'rh',
      severity: 'info',
      title: 'Validation des temps',
      message: 'Alice Martin a soumis sa semaine pour validation',
      date: threeDaysAgo.toISOString(),
      read: false,
      link: '/activite/validation',
    },
    {
      id: 'demo-n9',
      type: 'commercial',
      severity: 'info',
      title: 'Transaction proche de fermeture',
      message: 'Conseil RH Cabinet Marceau - fermeture prevue dans 6 jours',
      date: fiveDaysAgo.toISOString(),
      read: false,
      link: '/commerce/transactions',
    },
    {
      id: 'demo-n10',
      type: 'finance',
      severity: 'danger',
      title: 'Facture en retard',
      message: 'Facture FAC-2024-039 (TechForge SAS) - echue depuis 22 jours',
      date: fiveDaysAgo.toISOString(),
      read: false,
      link: '/finance/facturation',
    },
  ]
}

async function fetchSmartNotifications(societeId) {
  const notifications = []
  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)
  const sevenDaysLater = new Date(now)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const sevenDaysISO = sevenDaysLater.toISOString().slice(0, 10)

  try {
    // 1. Factures en retard
    let facQuery = supabase
      .from('factures')
      .select('id, numero, client_nom, date_echeance, total_ttc')
      .eq('statut', 'envoyee')
      .lt('date_echeance', todayISO)
    if (societeId) facQuery = facQuery.eq('societe_id', societeId)

    const { data: factures } = await facQuery
    if (factures) {
      factures.forEach(f => {
        const daysLate = Math.floor((now - new Date(f.date_echeance)) / 86400000)
        notifications.push({
          id: `fac-retard-${f.id}`,
          type: 'finance',
          severity: daysLate > 15 ? 'danger' : 'warning',
          title: 'Facture en retard',
          message: `${f.numero || 'Facture'} (${f.client_nom || 'Client'}) - echue depuis ${daysLate} jour${daysLate > 1 ? 's' : ''}`,
          date: new Date(now - daysLate * 86400000 / 2).toISOString(),
          read: false,
          link: '/finance/facturation',
        })
      })
    }

    // 2. Absences a valider (en_attente)
    let absQuery = supabase
      .from('absences')
      .select('id, user_id, type, date_debut, date_fin, created_at, profiles(full_name)')
      .eq('statut', 'en_attente')
    if (societeId) absQuery = absQuery.eq('societe_id', societeId)

    const { data: absences } = await absQuery
    if (absences && absences.length > 0) {
      absences.forEach(a => {
        const userName = a.profiles?.full_name || 'Un collaborateur'
        const debut = new Date(a.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        const fin = new Date(a.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        notifications.push({
          id: `abs-attente-${a.id}`,
          type: 'rh',
          severity: 'warning',
          title: 'Conge a valider',
          message: `${userName} - du ${debut} au ${fin}`,
          date: a.created_at || now.toISOString(),
          read: false,
          link: '/activite/absences',
        })
      })
    }

    // 3. Projets qui depassent le budget
    let projQuery = supabase
      .from('projets')
      .select('id, name, budget, client_id, clients(name)')
      .gt('budget', 0)
    if (societeId) projQuery = projQuery.eq('societe_id', societeId)

    const { data: projets } = await projQuery
    if (projets) {
      for (const p of projets) {
        const { data: saisies } = await supabase
          .from('saisies_temps')
          .select('duree, taux_journalier')
          .eq('projet_id', p.id)
        if (saisies) {
          const totalCost = saisies.reduce((sum, s) => sum + ((s.duree || 0) / 8) * (s.taux_journalier || 0), 0)
          const ratio = totalCost / p.budget
          if (ratio > 0.9) {
            notifications.push({
              id: `proj-budget-${p.id}`,
              type: 'finance',
              severity: ratio > 1 ? 'danger' : 'warning',
              title: 'Projet depasse le budget',
              message: `${p.name} - ${Math.round(ratio * 100)}% du budget consomme`,
              date: now.toISOString(),
              read: false,
              link: '/activite/projets',
            })
          }
        }
      }
    }

    // 4. Transactions proches de fermeture
    let txQuery = supabase
      .from('transactions')
      .select('id, name, montant, date_fermeture_prevue, phase')
      .gte('date_fermeture_prevue', todayISO)
      .lte('date_fermeture_prevue', sevenDaysISO)
      .not('phase', 'in', '("ferme","perdu")')
    if (societeId) txQuery = txQuery.eq('societe_id', societeId)

    const { data: transactions } = await txQuery
    if (transactions) {
      transactions.forEach(t => {
        const daysLeft = Math.ceil((new Date(t.date_fermeture_prevue) - now) / 86400000)
        const montantStr = t.montant ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(t.montant) : ''
        notifications.push({
          id: `tx-close-${t.id}`,
          type: 'commercial',
          severity: daysLeft <= 3 ? 'warning' : 'info',
          title: 'Transaction proche de fermeture',
          message: `${t.name} - fermeture dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}${montantStr ? ` (${montantStr})` : ''}`,
          date: now.toISOString(),
          read: false,
          link: `/commerce/transactions/${t.id}`,
        })
      })
    }

    // 5. Notes de frais a approuver
    let ndfQuery = supabase
      .from('notes_de_frais')
      .select('id, montant, description, created_at, user_id, profiles(full_name)')
      .eq('statut', 'soumis')
    if (societeId) ndfQuery = ndfQuery.eq('societe_id', societeId)

    const { data: notesFrais } = await ndfQuery
    if (notesFrais && notesFrais.length > 0) {
      const total = notesFrais.reduce((s, n) => s + (n.montant || 0), 0)
      const totalStr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)
      notifications.push({
        id: `ndf-soumis-batch`,
        type: 'rh',
        severity: 'info',
        title: 'Notes de frais a approuver',
        message: `${notesFrais.length} note${notesFrais.length > 1 ? 's' : ''} de frais en attente (total: ${totalStr})`,
        date: notesFrais[0]?.created_at || now.toISOString(),
        read: false,
        link: '/equipe/notes-de-frais',
      })
    }
  } catch (err) {
    console.error('Erreur chargement notifications:', err)
  }

  // Sort by date desc
  notifications.sort((a, b) => new Date(b.date) - new Date(a.date))
  return notifications
}

export function NotificationsProvider({ children }) {
  const { isDemoMode } = useDemo()
  const { selectedSociete } = useSociete() || {}
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const refreshNotifications = useCallback(async () => {
    const readIds = loadReadIds()
    setLoading(true)

    if (isDemoMode) {
      const mocks = getMockNotifications().map(n => ({
        ...n,
        read: readIds.has(n.id),
      }))
      setNotifications(mocks)
      setLoading(false)
    } else {
      const smart = await fetchSmartNotifications(selectedSociete?.id)
      const withRead = smart.map(n => ({
        ...n,
        read: readIds.has(n.id),
      }))
      setNotifications(withRead)
      setLoading(false)
    }
  }, [isDemoMode, selectedSociete?.id])

  useEffect(() => {
    refreshNotifications()
    // Refresh every 5 minutes
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  function markRead(id) {
    const readIds = loadReadIds()
    readIds.add(id)
    saveReadIds(readIds)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markUnread(id) {
    const readIds = loadReadIds()
    readIds.delete(id)
    saveReadIds(readIds)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
  }

  function markAllRead() {
    const readIds = loadReadIds()
    notifications.forEach(n => readIds.add(n.id))
    saveReadIds(readIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markRead, markUnread, markAllRead, refreshNotifications }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
