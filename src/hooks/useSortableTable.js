import { useState, useMemo } from 'react'

/**
 * Hook pour rendre n'importe quel tableau triable.
 *
 * Usage:
 *   const { sortedData, sortKey, sortDir, requestSort } = useSortableTable(data, 'name', 'asc')
 *
 *   <th onClick={() => requestSort('name')}>
 *     Nom <SortIcon field="name" sortKey={sortKey} sortDir={sortDir} />
 *   </th>
 */
export default function useSortableTable(data, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir) // 'asc' | 'desc'

  function requestSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !data) return data || []
    return [...data].sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]

      // Handle nested objects (e.g., clients.name)
      if (sortKey.includes('.')) {
        const keys = sortKey.split('.')
        valA = keys.reduce((obj, k) => obj?.[k], a)
        valB = keys.reduce((obj, k) => obj?.[k], b)
      }

      // Handle null/undefined
      if (valA == null && valB == null) return 0
      if (valA == null) return sortDir === 'asc' ? 1 : -1
      if (valB == null) return sortDir === 'asc' ? -1 : 1

      // Numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA
      }

      // Dates (string format YYYY-MM-DD)
      if (typeof valA === 'string' && typeof valB === 'string' && /^\d{4}-\d{2}/.test(valA) && /^\d{4}-\d{2}/.test(valB)) {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }

      // Strings
      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return sortDir === 'asc' ? strA.localeCompare(strB, 'fr') : strB.localeCompare(strA, 'fr')
    })
  }, [data, sortKey, sortDir])

  return { sortedData, sortKey, sortDir, requestSort }
}
