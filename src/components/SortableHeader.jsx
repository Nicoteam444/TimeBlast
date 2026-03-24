/**
 * En-tête de tableau triable.
 * Affiche une flèche ▲/▼ pour indiquer le tri actif.
 *
 * Usage:
 *   <SortableHeader label="Nom" field="name" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
 */
export default function SortableHeader({ label, field, sortKey, sortDir, onSort, style = {} }) {
  const isActive = sortKey === field
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        ...style,
      }}
      title={`Trier par ${label}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
        {label}
        <span style={{ fontSize: '.65rem', color: isActive ? 'var(--primary, #1D9BF0)' : '#cbd5e1', lineHeight: 1 }}>
          {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}
