import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { useSociete } from '../../contexts/SocieteContext'
import { supabase } from '../../lib/supabase'

// ── Constants ──
const STATUS_COLORS = { active: '#16a34a', running: '#16a34a', error: '#dc2626', inactive: '#94a3b8', planned: '#6366f1', deprecated: '#d97706', stopped: '#94a3b8', decommissioned: '#64748b' }
const HEALTH_COLORS = { healthy: '#16a34a', warning: '#d97706', critical: '#dc2626', unknown: '#94a3b8' }
const CATEGORY_ICONS = {
  crm: '🎯', erp: '🏭', hr: '👥', finance: '💰', communication: '💬',
  security: '🛡', devops: '🔧', collaboration: '📝', analytics: '📊', other: '📦',
}
const INFRA_ICONS = {
  server: '🖥', vm: '💿', container: '📦', cloud_service: '☁', network: '🌐',
  storage: '💾', firewall: '🛡', load_balancer: '⚖', database: '🗄', other: '📡',
}

const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: '1.25rem',
}

// ── Simple Force Layout (computed once) ──
function computeForceLayout(nodes, edges, width, height) {
  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    const r = Math.min(width, height) * 0.35
    return { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) }
  })

  // Simple spring iterations
  for (let iter = 0; iter < 60; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[j].x - positions[i].x
        const dy = positions[j].y - positions[i].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = 2000 / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        positions[j].x += fx
        positions[j].y += fy
        positions[i].x -= fx
        positions[i].y -= fy
      }
    }

    // Attraction along edges
    edges.forEach(e => {
      const si = nodes.findIndex(n => n.id === e.source_id)
      const di = nodes.findIndex(n => n.id === e.destination_id)
      if (si < 0 || di < 0) return
      const dx = positions[di].x - positions[si].x
      const dy = positions[di].y - positions[si].y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = (dist - 120) * 0.01
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      positions[si].x += fx
      positions[si].y += fy
      positions[di].x -= fx
      positions[di].y -= fy
    })

    // Center gravity
    positions.forEach(p => {
      p.x += (width / 2 - p.x) * 0.01
      p.y += (height / 2 - p.y) * 0.01
    })
  }

  // Clamp to bounds
  positions.forEach(p => {
    p.x = Math.max(60, Math.min(width - 60, p.x))
    p.y = Math.max(40, Math.min(height - 40, p.y))
  })

  return positions
}

// ── Graph View ──
function GraphView({ apps, infra, flows, onSelectNode }) {
  const svgRef = useRef(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 500 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)

  const nodes = useMemo(() => [
    ...apps.map(a => ({ ...a, nodeType: 'app' })),
    ...infra.map(i => ({ ...i, nodeType: 'infra' })),
  ], [apps, infra])

  const [positions, setPositions] = useState([])

  useEffect(() => {
    const pos = computeForceLayout(nodes, flows, 800, 500)
    setPositions(pos)
  }, [nodes, flows])

  const edges = useMemo(() => {
    return flows.map(f => {
      const si = nodes.findIndex(n => n.id === f.source_id)
      const di = nodes.findIndex(n => n.id === f.destination_id)
      if (si < 0 || di < 0 || !positions[si] || !positions[di]) return null
      return { ...f, x1: positions[si].x, y1: positions[si].y, x2: positions[di].x, y2: positions[di].y }
    }).filter(Boolean)
  }, [flows, nodes, positions])

  const handleMouseDown = useCallback((e, idx) => {
    e.stopPropagation()
    setDragIdx(idx)
  }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (dragIdx !== null) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, vb: { ...viewBox } }
  }, [dragIdx, viewBox])

  const handleMouseMove = useCallback((e) => {
    if (dragIdx !== null && positions[dragIdx]) {
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
      setPositions(prev => {
        const next = [...prev]
        next[dragIdx] = { x: svgPt.x, y: svgPt.y }
        return next
      })
    } else if (isPanning && panStart.current) {
      const dx = (e.clientX - panStart.current.x) * (viewBox.w / 800)
      const dy = (e.clientY - panStart.current.y) * (viewBox.h / 500)
      setViewBox({
        ...panStart.current.vb,
        x: panStart.current.vb.x - dx,
        y: panStart.current.vb.y - dy,
      })
    }
  }, [dragIdx, isPanning, positions, viewBox])

  const handleMouseUp = useCallback(() => {
    setDragIdx(null)
    setIsPanning(false)
    panStart.current = null
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    setViewBox(vb => {
      const newW = Math.max(200, Math.min(2000, vb.w * factor))
      const newH = Math.max(125, Math.min(1250, vb.h * factor))
      return {
        x: vb.x + (vb.w - newW) / 2,
        y: vb.y + (vb.h - newH) / 2,
        w: newW, h: newH,
      }
    })
  }, [])

  if (positions.length === 0) return null

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      style={{ width: '100%', height: '100%', cursor: dragIdx !== null ? 'grabbing' : isPanning ? 'move' : 'default' }}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#16a34a" />
        </marker>
        <marker id="arrow-error" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" />
        </marker>
        <marker id="arrow-default" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const color = e.status === 'error' ? '#dc2626' : e.status === 'active' ? '#16a34a' : '#94a3b8'
        const marker = e.status === 'error' ? 'url(#arrow-error)' : e.status === 'active' ? 'url(#arrow-active)' : 'url(#arrow-default)'
        return (
          <g key={`edge-${i}`}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={color} strokeWidth={2} opacity={0.5}
              strokeDasharray={e.status === 'active' ? '8 4' : e.status === 'error' ? '4 2' : '6 3'}
              markerEnd={marker}
            >
              {e.status === 'active' && (
                <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1.2s" repeatCount="indefinite" />
              )}
            </line>
            {/* Flow label */}
            <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 6}
              textAnchor="middle" style={{ fontSize: 7, fill: 'var(--text-muted)', fontStyle: 'italic' }}>
              {e.name?.length > 20 ? e.name.slice(0, 18) + '..' : e.name}
            </text>
          </g>
        )
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        if (!positions[i]) return null
        const { x, y } = positions[i]
        const isApp = node.nodeType === 'app'
        const color = isApp ? (STATUS_COLORS[node.status] || '#94a3b8') : (HEALTH_COLORS[node.health_status] || '#94a3b8')
        const icon = isApp ? (CATEGORY_ICONS[node.category] || '📦') : (INFRA_ICONS[node.type] || '📡')

        return (
          <g key={node.id}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => handleMouseDown(e, i)}
            onClick={() => onSelectNode(node)}
          >
            {/* Background shape */}
            {isApp ? (
              <circle cx={x} cy={y} r={22} fill={color} opacity={0.12} stroke={color} strokeWidth={2.5} />
            ) : (
              <rect x={x - 20} y={y - 20} width={40} height={40} rx={6} fill={color} opacity={0.12} stroke={color} strokeWidth={2.5} />
            )}
            {/* Icon */}
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, pointerEvents: 'none' }}>
              {icon}
            </text>
            {/* Label */}
            <text x={x} y={y + 34} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text)', fontWeight: 600, pointerEvents: 'none' }}>
              {node.name.length > 16 ? node.name.slice(0, 14) + '..' : node.name}
            </text>
            {/* Status dot */}
            <circle cx={x + (isApp ? 16 : 14)} cy={y - (isApp ? 16 : 14)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
          </g>
        )
      })}
    </svg>
  )
}

// ── Layer View ──
const LAYERS = [
  { id: 'users', label: 'Utilisateurs', icon: '👥', color: '#6366f1', bg: '#eef2ff' },
  { id: 'apps', label: 'Applications', icon: '💻', color: '#195C82', bg: '#e0f2fe' },
  { id: 'middleware', label: 'Middleware & APIs', icon: '🔗', color: '#F8B35A', bg: '#fef3c7' },
  { id: 'infra', label: 'Infrastructure', icon: '🖥', color: '#98BA9C', bg: '#dcfce7' },
]

function LayerView({ apps, infra, flows }) {
  const [expandedLayer, setExpandedLayer] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  // Classify apps into layers
  const middlewareApps = apps.filter(a => ['api', 'other'].includes(a.type) || a.category === 'devops')
  const userApps = apps.filter(a => a.type === 'saas' || a.type === 'mobile')
  const otherApps = apps.filter(a => !middlewareApps.includes(a) && !userApps.includes(a))

  const layerData = {
    users: userApps.map(a => ({ ...a, displayName: a.name, sub: `${a.user_count || 0} utilisateurs` })),
    apps: otherApps.map(a => ({ ...a, displayName: a.name, sub: a.vendor || a.category })),
    middleware: middlewareApps.map(a => ({ ...a, displayName: a.name, sub: a.protocol || a.type })),
    infra: infra.map(i => ({ ...i, displayName: i.name, sub: i.provider || i.type })),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', height: '100%' }}>
      {LAYERS.map(layer => {
        const items = layerData[layer.id] || []
        const isExpanded = expandedLayer === layer.id
        return (
          <div key={layer.id}
            style={{
              flex: isExpanded ? 3 : 1,
              border: `2px solid ${layer.color}20`,
              borderRadius: 12,
              background: layer.bg,
              padding: '.75rem',
              transition: 'flex .3s ease',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
            onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? '.75rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{layer.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '.85rem', color: layer.color }}>{layer.label}</span>
                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>({items.length})</span>
              </div>
              <span style={{ fontSize: '.75rem', color: layer.color, fontWeight: 600 }}>
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>
            {isExpanded && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', overflow: 'auto' }}>
                {items.map(item => {
                  const color = item.nodeType === 'infra' || item.type?.includes('server')
                    ? (HEALTH_COLORS[item.health_status] || STATUS_COLORS[item.status] || '#94a3b8')
                    : (STATUS_COLORS[item.status] || '#94a3b8')
                  return (
                    <div key={item.id}
                      onClick={e => { e.stopPropagation(); setSelectedItem(selectedItem?.id === item.id ? null : item) }}
                      style={{
                        padding: '.5rem .75rem', borderRadius: 8,
                        background: '#fff', border: `1px solid ${selectedItem?.id === item.id ? layer.color : '#e2e8f0'}`,
                        boxShadow: selectedItem?.id === item.id ? `0 0 0 2px ${layer.color}30` : 'none',
                        cursor: 'pointer', minWidth: 120, transition: 'all .15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>{item.displayName}</span>
                      </div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>{item.sub}</div>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '.8rem', padding: '.5rem' }}>Aucun element</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Detail Panel ──
function DetailPanel({ node, flows, onClose }) {
  if (!node) return null
  const isApp = node.nodeType === 'app' || node.category
  const color = isApp ? (STATUS_COLORS[node.status] || '#94a3b8') : (HEALTH_COLORS[node.health_status] || '#94a3b8')
  const connectedFlows = flows.filter(f => f.source_id === node.id || f.destination_id === node.id)

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 340,
      background: 'var(--card-bg, #fff)', borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 20px rgba(0,0,0,.08)', padding: '1.25rem',
      overflowY: 'auto', zIndex: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{node.name}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: '.8rem', fontWeight: 600, textTransform: 'capitalize', color }}>{node.status || node.health_status}</span>
        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>|</span>
        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{isApp ? node.category : node.type}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '1rem' }}>
        {isApp && (
          <>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Editeur :</span><br /><strong>{node.vendor || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Version :</span><br /><strong>{node.version || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Cout/mois :</span><br /><strong>{node.monthly_cost ? `${node.monthly_cost} EUR` : '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Utilisateurs :</span><br /><strong>{node.user_count || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Criticite :</span><br /><strong style={{ textTransform: 'capitalize' }}>{node.criticality || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Responsable :</span><br /><strong>{node.owner || '-'}</strong></div>
          </>
        )}
        {!isApp && (
          <>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Fournisseur :</span><br /><strong>{node.provider || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Region :</span><br /><strong>{node.region || '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>Cout/mois :</span><br /><strong>{node.monthly_cost ? `${node.monthly_cost} EUR` : '-'}</strong></div>
            <div style={{ fontSize: '.75rem' }}><span style={{ color: 'var(--text-muted)' }}>OS :</span><br /><strong>{node.os || '-'}</strong></div>
          </>
        )}
      </div>

      {connectedFlows.length > 0 && (
        <>
          <h4 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>Flux connectes ({connectedFlows.length})</h4>
          {connectedFlows.map(f => (
            <div key={f.id} style={{
              padding: '.5rem', borderRadius: 6, border: '1px solid var(--border)',
              marginBottom: '.35rem', fontSize: '.75rem',
            }}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', gap: '.5rem', marginTop: '.15rem' }}>
                <span>{f.protocol}</span>
                <span>|</span>
                <span>{f.frequency}</span>
                <span>|</span>
                <span style={{ color: STATUS_COLORS[f.status] || '#94a3b8', fontWeight: 600 }}>{f.status}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Main Page ──
export default function ArchitectureViewerPage() {
  const { societeId } = useSociete()
  const envNavigate = useEnvNavigate()
  const [view, setView] = useState('graph')
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState([])
  const [infra, setInfra] = useState([])
  const [flows, setFlows] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    if (!societeId) { setLoading(false); return }
    loadData()
  }, [societeId])

  async function loadData() {
    setLoading(true)
    const safe = async (q) => { try { const { data, error } = await q; if (error) console.warn('[Archi]', error.message); return data || [] } catch (e) { console.warn('[Archi]', e.message); return [] } }
    const [a, i, f] = await Promise.all([
      safe(supabase.from('si_applications').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_infrastructure').select('*').eq('societe_id', societeId)),
      safe(supabase.from('si_data_flows').select('*').eq('societe_id', societeId)),
    ])
    setApps(a.filter(x => x.status !== 'decommissioned'))
    setInfra(i.filter(x => x.status !== 'decommissioned'))
    setFlows(f)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span>🗺</span> Architecture SI
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', margin: '.25rem 0 0' }}>
            {apps.length} applications, {infra.length} elements d'infrastructure, {flows.length} flux
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.25rem', background: 'var(--surface, #f1f5f9)', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'graph', label: 'Graphe', icon: '🔀' },
            { id: 'layers', label: 'Couches', icon: '📊' },
          ].map(v => (
            <button key={v.id}
              onClick={() => { setView(v.id); setSelectedNode(null) }}
              style={{
                padding: '.4rem .8rem', borderRadius: 6, border: 'none',
                background: view === v.id ? 'var(--accent, #1D9BF0)' : 'transparent',
                color: view === v.id ? '#fff' : 'var(--text-muted)',
                fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '.3rem',
              }}
            >
              <span>{v.icon}</span> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, position: 'relative', ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {view === 'graph' ? (
          <GraphView
            apps={apps}
            infra={infra}
            flows={flows}
            onSelectNode={setSelectedNode}
          />
        ) : (
          <div style={{ padding: '1rem', height: '100%' }}>
            <LayerView apps={apps} infra={infra} flows={flows} />
          </div>
        )}

        {/* Detail Panel */}
        <DetailPanel
          node={selectedNode}
          flows={flows}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  )
}
