import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useDemo } from './DemoContext'

const NotificationsContext = createContext(null)

const STORAGE_KEY = 'notif_read_ids'

function getMockNotifications() {
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(now); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  return [
    {
      id: 'demo-n1',
      type: 'validation',
      message: 'Alice a soumis sa semaine pour validation',
      date: yesterday.toISOString(),
      read: false,
      link: '/activite/validation',
    },
    {
      id: 'demo-n2',
      type: 'budget',
      message: 'Projet Migration ERP Meridian à 80% du budget',
      date: twoDaysAgo.toISOString(),
      read: false,
      link: '/activite/projets',
    },
    {
      id: 'demo-n3',
      type: 'pending',
      message: '2 validations en attente de traitement',
      date: twoDaysAgo.toISOString(),
      read: false,
      link: '/activite/validation',
    },
  ]
}

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

export function NotificationsProvider({ children }) {
  const { isDemoMode } = useDemo()
  const [notifications, setNotifications] = useState([])

  const refreshNotifications = useCallback(() => {
    const readIds = loadReadIds()
    if (isDemoMode) {
      const mocks = getMockNotifications().map(n => ({
        ...n,
        read: readIds.has(n.id),
      }))
      setNotifications(mocks)
    } else {
      // In real mode: no notifications for now (placeholder)
      setNotifications([])
    }
  }, [isDemoMode])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  function markRead(id) {
    const readIds = loadReadIds()
    readIds.add(id)
    saveReadIds(readIds)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    const readIds = loadReadIds()
    notifications.forEach(n => readIds.add(n.id))
    saveReadIds(readIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
