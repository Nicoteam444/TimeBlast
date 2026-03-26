export default function Spinner({ size = 36, color = '#2B4C7E', label = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '.75rem' }}>
      <div style={{
        width: size, height: size,
        border: `4px solid #e2e8f0`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'tbSpin .8s linear infinite'}} />
      {label && <span style={{ color: '#94a3b8', fontSize: '.85rem' }}>{label}</span>}
      <style>{`@keyframes tbSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
