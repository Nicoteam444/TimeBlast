import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function MiniCalendar({ value, onChange, placeholder = 'Sélectionner une date' }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const today = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null
  const [viewYear, setViewYear] = useState(selected?.getFullYear() || today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())
  const triggerRef = useRef(null)
  const dropRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (triggerRef.current?.contains(e.target)) return
      if (dropRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Position the dropdown relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < 340 ? rect.top - 340 : rect.bottom + 4
    const left = Math.min(rect.left, window.innerWidth - 290)
    setDropPos({ top, left })
  }, [])

  function handleOpen() {
    updatePosition()
    setOpen(o => !o)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day) {
    const d = new Date(viewYear, viewMonth, day)
    const iso = d.toISOString().slice(0, 10)
    onChange(iso)
    setOpen(false)
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    selectDay(today.getDate())
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  let startWeekday = firstDay.getDay()
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = today.toISOString().slice(0, 10)
  const selectedStr = value || ''

  const displayValue = selected
    ? selected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <>
      <div ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '.5rem',
          padding: '.45rem .7rem', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)',
          background: '#fff', cursor: 'pointer', fontSize: '.82rem', color: displayValue ? '#1e293b' : '#94a3b8',
          minHeight: 34}}
      >
        <span>📅</span>
        <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        {value && (
          <span onClick={clear} style={{ color: '#94a3b8', fontSize: '.7rem', cursor: 'pointer', padding: '0 2px' }} title="Effacer">✕</span>
        )}
      </div>

      {open && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.15)', padding: '.75rem', width: 280}}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
            <button type="button" onClick={prevMonth} style={navBtn}>◀</button>
            <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#1e293b' }}>
              {MOIS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={navBtn}>▶</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {JOURS.map(j => (
              <div key={j} style={{ textAlign: 'center', fontSize: '.7rem', fontWeight: 700, color: '#94a3b8', padding: '2px 0' }}>{j}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const dateStr = new Date(viewYear, viewMonth, day).toISOString().slice(0, 10)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedStr
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: 'none',
                    cursor: 'pointer', fontSize: '.8rem', fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected ? 'var(--primary, #1D9BF0)' : isToday ? '#f0f9ff' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'var(--primary, #1D9BF0)' : '#334155',
                    outline: isToday && !isSelected ? '2px solid var(--primary, #1D9BF0)' : 'none',
                    transition: 'all .1s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                  onMouseEnter={e => { if (!isSelected) e.target.style.background = '#f1f5f9' }}
                  onMouseLeave={e => { if (!isSelected) e.target.style.background = isToday ? '#f0f9ff' : 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div style={{ marginTop: '.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '.4rem', textAlign: 'center' }}>
            <button type="button" onClick={goToday}
              style={{ background: 'none', border: 'none', color: 'var(--primary, #1D9BF0)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Aujourd'hui
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

const navBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '.75rem', color: '#64748b', padding: '.25rem .5rem',
  borderRadius: 6}
