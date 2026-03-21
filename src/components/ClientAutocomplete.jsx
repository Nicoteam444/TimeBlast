import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ClientAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    setQuery(value?.name || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    onChange(null) // reset selection

    clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(10)
      setResults(data || [])
      setOpen(true)
      setLoading(false)
    }, 250)
  }

  function handleSelect(client) {
    setQuery(client.name)
    onChange(client)
    setOpen(false)
    setResults([])
  }

  function handleClear() {
    setQuery('')
    onChange(null)
    setResults([])
    setOpen(false)
  }

  return (
    <div className="autocomplete" ref={wrapperRef}>
      <div className="autocomplete-input-wrap">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query && results.length && setOpen(true)}
          placeholder="Rechercher un client..."
          autoComplete="off"
        />
        {query && (
          <button type="button" className="autocomplete-clear" onClick={handleClear}>✕</button>
        )}
        {loading && <span className="autocomplete-spinner">⏳</span>}
      </div>

      {open && results.length > 0 && (
        <ul className="autocomplete-dropdown">
          {results.map(client => (
            <li
              key={client.id}
              className={`autocomplete-option ${value?.id === client.id ? 'autocomplete-option--selected' : ''}`}
              onMouseDown={() => handleSelect(client)}
            >
              {client.name}
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query && (
        <ul className="autocomplete-dropdown">
          <li className="autocomplete-empty">Aucun client trouvé</li>
        </ul>
      )}
    </div>
  )
}
