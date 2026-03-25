import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationsContext'
import Spinner from '../components/Spinner'

const SEVERITY_META = {
  danger:  { label: 'Urgent',      color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  warning: { label: 'Attention',   color: '#f59e0b', bg: '#fffbeb', icon: '🟠' },
  info:    { label: 'Information', color: '#3b82f6', bg: '#eff6ff', icon: '🔵' },
}

const TYPE_META = {
  finance:    { label: 'Finance',    icon: '💰' },
  rh:         { label: 'RH',         icon: '👥' },
  commercial: { label: 'Commercial', icon: '🤝' },
}

const TABS = [
  { id: 'toutes',   label: 'Toutes' },
  { id: 'urgentes', label: 'Urgentes' },
  { id: 'finance',  label: 'Finance' },
  { id: 'rh',       label: 'RH' },
  { id: 'commercial', label: 'Commercial' },
]

function fmtNotifDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return "A l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'Hier'
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jours`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markUnread, markAllRead, refreshNotifications } = useNotifications()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('toutes')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filtered = useMemo(() => {
    let list = [...notifications]

    if (activeTab === 'urgentes') {
      list = list.filter(n => n.severity === 'danger' || n.severity === 'warning')
    } else if (activeTab === 'finance') {
      list = list.filter(n => n.type === 'finance')
    } else if (activeTab === 'rh') {
      list = list.filter(n => n.type === 'rh')
    } else if (activeTab === 'commercial') {
      list = list.filter(n => n.type === 'commercial')
    }

    if (showUnreadOnly) {
      list = list.filter(n => !n.read)
    }

    return list
  }, [notifications, activeTab, showUnreadOnly])

  const tabCounts = useMemo(() => {
    const counts = { toutes: 0, urgentes: 0, finance: 0, rh: 0, commercial: 0 }
    notifications.forEach(n => {
      if (!n.read) {
        counts.toutes++
        if (n.severity === 'danger' || n.severity === 'warning') counts.urgentes++
        if (n.type === 'finance') counts.finance++
        if (n.type === 'rh') counts.rh++
        if (n.type === 'commercial') counts.commercial++
      }
    })
    return counts
  }, [notifications])

  function handleClick(notif) {
    markRead(notif.id)
    if (notif.link) navigate(notif.link)
  }

  function handleToggleRead(e, notif) {
    e.stopPropagation()
    if (notif.read) {
      markUnread(notif.id)
    } else {
      markRead(notif.id)
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Centre de notifications</h1>
          <p>
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Aucune notification non lue'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={refreshNotifications}
            title="Rafraichir"
            style={{ fontSize: '1rem', padding: '.4rem .7rem', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}
          >
            🔄 Rafraichir
          </button>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllRead}>
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="nc-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nc-tab ${activeTab === tab.id ? 'nc-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className="nc-tab-badge">{tabCounts[tab.id]}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <label className="nc-toggle-label">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={e => setShowUnreadOnly(e.target.checked)}
          />
          <span>Non lues uniquement</span>
        </label>
      </div>

      {/* Notification list */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="nc-empty">
          <div className="nc-empty-icon">🔔</div>
          <p className="nc-empty-title">Aucune notification</p>
          <p className="nc-empty-desc">
            {showUnreadOnly
              ? 'Toutes les notifications ont ete lues.'
              : 'Aucune notification pour ce filtre.'
            }
          </p>
        </div>
      ) : (
        <div className="nc-list">
          {filtered.map(notif => {
            const sev = SEVERITY_META[notif.severity] || SEVERITY_META.info
            const typeMeta = TYPE_META[notif.type] || { label: notif.type, icon: '📌' }
            return (
              <div
                key={notif.id}
                className={`nc-card ${!notif.read ? 'nc-card--unread' : ''}`}
                onClick={() => handleClick(notif)}
              >
                {/* Severity indicator bar */}
                <div className="nc-card-bar" style={{ background: sev.color }} />

                {/* Icon */}
                <div className="nc-card-icon" style={{ background: sev.bg, color: sev.color }}>
                  {typeMeta.icon}
                </div>

                {/* Content */}
                <div className="nc-card-content">
                  <div className="nc-card-top">
                    <span className="nc-card-title">{notif.title}</span>
                    <div className="nc-card-meta">
                      <span className="nc-card-severity" style={{ background: sev.bg, color: sev.color }}>
                        {sev.icon} {sev.label}
                      </span>
                      <span className="nc-card-type">{typeMeta.label}</span>
                    </div>
                  </div>
                  <p className="nc-card-msg">{notif.message}</p>
                  <div className="nc-card-bottom">
                    <span className="nc-card-date">{fmtNotifDate(notif.date)}</span>
                    <div className="nc-card-actions">
                      <button
                        className="nc-card-btn"
                        onClick={(e) => handleToggleRead(e, notif)}
                        title={notif.read ? 'Marquer non lu' : 'Marquer lu'}
                      >
                        {notif.read ? '📩' : '📧'} {notif.read ? 'Non lu' : 'Lu'}
                      </button>
                      {notif.link && (
                        <button
                          className="nc-card-btn nc-card-btn--primary"
                          onClick={(e) => { e.stopPropagation(); markRead(notif.id); navigate(notif.link) }}
                        >
                          Voir →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unread dot */}
                {!notif.read && <div className="nc-card-dot" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
