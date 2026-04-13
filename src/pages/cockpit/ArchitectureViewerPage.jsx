import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { useSociete } from '../../contexts/SocieteContext'
import { supabase } from '../../lib/supabase'

// ── Constants ──
const STATUS_COLORS = { active: '#16a34a', running: '#16a34a', error: '#dc2626', inactive: '#94a3b8', planned: '#6366f1', deprecated: '#d97706', stopped: '#94a3b8', decommissioned: '#64748b' }
const HEALTH_COLORS = { healthy: '#16a34a', warning: '#d97706', critical: '#dc2626', unknown: '#94a3b8' }
const CATEGORY_ICONS = { crm: '🎯', erp: '🏭', hr: '👥', finance: '💰', communication: '💬', security: '🛡', devops: '🔧', collaboration: '📝', analytics: '📊', other: '📦' }
const INFRA_ICONS = { server: '🖥', vm: '💿', container: '📦', cloud_service: '☁', network: '🌐', storage: '💾', firewall: '🛡', load_balancer: '⚖', database: '🗄', other: '📡' }
const APP_TYPES = ['saas', 'on_premise', 'mobile', 'api', 'internal', 'other']
const APP_CATEGORIES = ['crm', 'erp', 'hr', 'finance', 'communication', 'security', 'devops', 'collaboration', 'analytics', 'other']
const INFRA_TYPES = ['server', 'vm', 'container', 'cloud_service', 'network', 'storage', 'firewall', 'load_balancer', 'database', 'other']
const CRITICALITIES = ['critical', 'high', 'medium', 'low']
const PROTOCOLS = ['api_rest', 'api_graphql', 'sftp', 'database', 'webhook', 'manual', 'etl', 'message_queue', 'other']
const FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'on_demand']

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

// ── Force Layout ──
function computeForceLayout(nodes, edges, width, height) {
  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2
    const r = Math.min(width, height) * 0.35
    return { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) }
  })
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[j].x - positions[i].x, dy = positions[j].y - positions[i].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const f = 2500 / (dist * dist)
        positions[j].x += (dx / dist) * f; positions[j].y += (dy / dist) * f
        positions[i].x -= (dx / dist) * f; positions[i].y -= (dy / dist) * f
      }
    }
    edges.forEach(e => {
      const si = nodes.findIndex(n => n.id === e.source_id), di = nodes.findIndex(n => n.id === e.destination_id)
      if (si < 0 || di < 0) return
      const dx = positions[di].x - positions[si].x, dy = positions[di].y - positions[si].y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const f = (dist - 140) * 0.01
      positions[si].x += (dx / dist) * f; positions[si].y += (dy / dist) * f
      positions[di].x -= (dx / dist) * f; positions[di].y -= (dy / dist) * f
    })
    positions.forEach(p => { p.x += (width / 2 - p.x) * 0.01; p.y += (height / 2 - p.y) * 0.01 })
  }
  positions.forEach(p => { p.x = Math.max(60, Math.min(width - 60, p.x)); p.y = Math.max(40, Math.min(height - 40, p.y)) })
  return positions
}

// ── Inline Modal ──
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: '.6rem' }}>
      <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '.2rem' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '.4rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--surface, #fff)' }
const btnPrimary = { padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#195C82', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }
const btnSecondary = { padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', color: 'var(--text)' }
const btnDanger = { padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }

// ── Graph Editor (the main interactive canvas) ──
function GraphEditor({ apps, infra, flows, positions, setPositions, selectedId, setSelectedId, selectedEdgeId, setSelectedEdgeId, onStartDrawFlow, drawingFlow, drawMouse, onNodeMouseUp, nodes }) {
  const svgRef = useRef(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [viewBox, setViewBox] = useState({ x: -50, y: -50, w: 900, h: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)

  const edges = useMemo(() => {
    return flows.map(f => {
      const si = nodes.findIndex(n => n.id === f.source_id)
      const di = nodes.findIndex(n => n.id === f.destination_id)
      if (si < 0 || di < 0 || !positions[si] || !positions[di]) return null
      return { ...f, x1: positions[si].x, y1: positions[si].y, x2: positions[di].x, y2: positions[di].y }
    }).filter(Boolean)
  }, [flows, nodes, positions])

  const handleNodeMouseDown = useCallback((e, idx) => {
    e.stopPropagation()
    setDragIdx(idx)
  }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (dragIdx !== null) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, vb: { ...viewBox } }
    // Deselect if clicking on empty canvas
    setSelectedId(null)
    setSelectedEdgeId(null)
  }, [dragIdx, viewBox])

  const handleMouseMove = useCallback((e) => {
    if (dragIdx !== null && positions[dragIdx]) {
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
      setPositions(prev => { const next = [...prev]; next[dragIdx] = { x: svgPt.x, y: svgPt.y }; return next })
    } else if (isPanning && panStart.current) {
      const dx = (e.clientX - panStart.current.x) * (viewBox.w / 900)
      const dy = (e.clientY - panStart.current.y) * (viewBox.h / 600)
      setViewBox({ ...panStart.current.vb, x: panStart.current.vb.x - dx, y: panStart.current.vb.y - dy })
    }
  }, [dragIdx, isPanning, positions, viewBox])

  const handleMouseUp = useCallback((e) => {
    if (dragIdx !== null && positions[dragIdx]) {
      // Persist position to metadata
      const node = nodes[dragIdx]
      if (node) {
        const table = node.nodeType === 'app' ? 'si_applications' : 'si_infrastructure'
        const newMeta = { ...(node.metadata || {}), x: positions[dragIdx].x, y: positions[dragIdx].y }
        supabase.from(table).update({ metadata: newMeta }).eq('id', node.id).then(() => {})
      }
    }
    setDragIdx(null)
    setIsPanning(false)
    panStart.current = null
  }, [dragIdx, positions, nodes])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    setViewBox(vb => {
      const newW = Math.max(200, Math.min(2400, vb.w * factor))
      const newH = Math.max(133, Math.min(1600, vb.h * factor))
      return { x: vb.x + (vb.w - newW) / 2, y: vb.y + (vb.h - newH) / 2, w: newW, h: newH }
    })
  }, [])

  // Convert client coords to SVG coords
  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }, [])

  if (positions.length === 0 && nodes.length > 0) return null

  return (
    <svg ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      style={{ width: '100%', height: '100%', cursor: dragIdx !== null ? 'grabbing' : drawingFlow ? 'crosshair' : isPanning ? 'move' : 'default' }}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <marker id="arr-green" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#16a34a" /></marker>
        <marker id="arr-red" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" /></marker>
        <marker id="arr-gray" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker>
        <marker id="arr-draw" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" /></marker>
        {/* Grid pattern */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border, #e2e8f0)" strokeWidth="0.3" opacity="0.5" />
        </pattern>
      </defs>

      {/* Background grid */}
      <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="url(#grid)" />

      {/* Edges */}
      {edges.map((e, i) => {
        const color = e.status === 'error' ? '#dc2626' : e.status === 'active' ? '#16a34a' : '#94a3b8'
        const marker = e.status === 'error' ? 'url(#arr-red)' : e.status === 'active' ? 'url(#arr-green)' : 'url(#arr-gray)'
        const isSelected = selectedEdgeId === e.id
        return (
          <g key={`edge-${e.id || i}`} onClick={(ev) => { ev.stopPropagation(); setSelectedEdgeId(e.id); setSelectedId(null) }} style={{ cursor: 'pointer' }}>
            {/* Hit area (invisible thick line for easier clicking) */}
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="transparent" strokeWidth={12} />
            {/* Visible edge */}
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={isSelected ? '#60a5fa' : color} strokeWidth={isSelected ? 3 : 2} opacity={isSelected ? 1 : 0.6}
              strokeDasharray={e.status === 'active' ? '8 4' : '6 3'} markerEnd={isSelected ? '' : marker}
            >
              {e.status === 'active' && <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1.2s" repeatCount="indefinite" />}
            </line>
            {/* Label */}
            <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 8} textAnchor="middle"
              style={{ fontSize: 8, fill: isSelected ? '#60a5fa' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
              {e.name?.length > 25 ? e.name.slice(0, 23) + '..' : e.name}
            </text>
          </g>
        )
      })}

      {/* Drawing flow line (while creating a new flow) */}
      {drawingFlow && drawMouse && (
        <line x1={drawingFlow.x} y1={drawingFlow.y} x2={drawMouse.x} y2={drawMouse.y}
          stroke="#60a5fa" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.8} markerEnd="url(#arr-draw)" />
      )}

      {/* Nodes */}
      {nodes.map((node, i) => {
        if (!positions[i]) return null
        const { x, y } = positions[i]
        const isApp = node.nodeType === 'app'
        const color = isApp ? (STATUS_COLORS[node.status] || '#94a3b8') : (HEALTH_COLORS[node.health_status] || '#94a3b8')
        const icon = isApp ? (CATEGORY_ICONS[node.category] || '📦') : (INFRA_ICONS[node.type] || '📡')
        const isSelected = selectedId === node.id
        const R = 26 // node radius

        return (
          <g key={node.id}
            style={{ cursor: dragIdx === i ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => { e.stopPropagation(); handleNodeMouseDown(e, i); setSelectedId(node.id); setSelectedEdgeId(null) }}
            onMouseUp={() => { if (drawingFlow && drawingFlow.nodeId !== node.id) onNodeMouseUp(node) }}
          >
            {/* Selection ring */}
            {isSelected && (isApp
              ? <circle cx={x} cy={y} r={R + 4} fill="none" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 3" />
              : <rect x={x - R - 2} y={y - R - 2} width={(R + 2) * 2} height={(R + 2) * 2} rx={8} fill="none" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 3" />
            )}
            {/* Background shape */}
            {isApp ? (
              <circle cx={x} cy={y} r={R} fill={color} opacity={0.12} stroke={color} strokeWidth={2.5} />
            ) : (
              <rect x={x - R + 2} y={y - R + 2} width={(R - 2) * 2} height={(R - 2) * 2} rx={6} fill={color} opacity={0.12} stroke={color} strokeWidth={2.5} />
            )}
            {/* Icon */}
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 16, pointerEvents: 'none' }}>{icon}</text>
            {/* Label */}
            <text x={x} y={y + R + 14} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text)', fontWeight: 600, pointerEvents: 'none' }}>
              {node.name.length > 18 ? node.name.slice(0, 16) + '..' : node.name}
            </text>
            {/* Status dot */}
            <circle cx={x + (R - 6)} cy={y - (R - 6)} r={4} fill={color} stroke="var(--card-bg, #fff)" strokeWidth={1.5} />
            {/* Connection port (right side) — for creating flows */}
            <circle cx={x + R + 2} cy={y} r={5} fill="#60a5fa" opacity={0.6} stroke="#60a5fa" strokeWidth={1}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => { e.stopPropagation(); onStartDrawFlow(node, positions[i]) }}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ── Layer View (kept from original) ──
const LAYERS = [
  { id: 'users', label: 'Utilisateurs', icon: '👥', color: '#6366f1', bg: '#eef2ff' },
  { id: 'apps', label: 'Applications', icon: '💻', color: '#195C82', bg: '#e0f2fe' },
  { id: 'middleware', label: 'Middleware & APIs', icon: '🔗', color: '#F8B35A', bg: '#fef3c7' },
  { id: 'infra', label: 'Infrastructure', icon: '🖥', color: '#98BA9C', bg: '#dcfce7' },
]

function LayerView({ apps, infra }) {
  const [expandedLayer, setExpandedLayer] = useState(null)
  const middlewareApps = apps.filter(a => ['api', 'other'].includes(a.type) || a.category === 'devops')
  const userApps = apps.filter(a => a.type === 'saas' || a.type === 'mobile')
  const otherApps = apps.filter(a => !middlewareApps.includes(a) && !userApps.includes(a))
  const layerData = {
    users: userApps.map(a => ({ ...a, displayName: a.name, sub: `${a.user_count || 0} utilisateurs` })),
    apps: otherApps.map(a => ({ ...a, displayName: a.name, sub: a.vendor || a.category })),
    middleware: middlewareApps.map(a => ({ ...a, displayName: a.name, sub: a.type })),
    infra: infra.map(i => ({ ...i, displayName: i.name, sub: i.provider || i.type })),
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', height: '100%' }}>
      {LAYERS.map(layer => {
        const items = layerData[layer.id] || []
        const isExp = expandedLayer === layer.id
        return (
          <div key={layer.id} onClick={() => setExpandedLayer(isExp ? null : layer.id)} style={{
            flex: isExp ? 3 : 1, border: `2px solid ${layer.color}20`, borderRadius: 12,
            background: layer.bg, padding: '.75rem', transition: 'flex .3s', cursor: 'pointer', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExp ? '.75rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{layer.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '.85rem', color: layer.color }}>{layer.label}</span>
                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>({items.length})</span>
              </div>
              <span style={{ fontSize: '.75rem', color: layer.color, fontWeight: 600 }}>{isExp ? '▲' : '▼'}</span>
            </div>
            {isExp && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                {items.map(item => (
                  <div key={item.id} style={{ padding: '.5rem .75rem', borderRadius: 8, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', minWidth: 120 }}>
                    <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>{item.displayName}</span>
                    <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                ))}
                {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Aucun element</div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Detail Panel (enhanced with edit/delete) ──
function DetailPanel({ node, edge, flows, allNodes, onClose, onEdit, onDelete, onEditEdge, onDeleteEdge }) {
  if (!node && !edge) return null

  // Edge detail
  if (edge) {
    const srcNode = allNodes.find(n => n.id === edge.source_id)
    const dstNode = allNodes.find(n => n.id === edge.destination_id)
    return (
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, background: 'var(--card-bg, #fff)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 20px rgba(0,0,0,.08)', padding: '1.25rem', overflowY: 'auto', zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700 }}>🔗 {edge.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ fontSize: '.8rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1rem' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Source :</span> <strong>{srcNode?.name || '?'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Destination :</span> <strong>{dstNode?.name || '?'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Protocole :</span> <strong>{edge.protocol}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Frequence :</span> <strong>{edge.frequency}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Chiffre :</span> <strong>{edge.is_encrypted ? '🔒 Oui' : '⚠ Non'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Statut :</span> <strong style={{ color: STATUS_COLORS[edge.status] }}>{edge.status}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={() => onDeleteEdge(edge)} style={btnDanger}>🗑 Supprimer</button>
        </div>
      </div>
    )
  }

  // Node detail
  const isApp = node.nodeType === 'app'
  const color = isApp ? (STATUS_COLORS[node.status] || '#94a3b8') : (HEALTH_COLORS[node.health_status] || '#94a3b8')
  const connectedFlows = flows.filter(f => f.source_id === node.id || f.destination_id === node.id)

  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, background: 'var(--card-bg, #fff)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 20px rgba(0,0,0,.08)', padding: '1.25rem', overflowY: 'auto', zIndex: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700 }}>{node.name}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: '.8rem', fontWeight: 600, color }}>{node.status || node.health_status}</span>
        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>| {isApp ? node.category : node.type}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', marginBottom: '.75rem', fontSize: '.75rem' }}>
        {isApp ? (
          <>
            <div><span style={{ color: 'var(--text-muted)' }}>Editeur :</span><br /><strong>{node.vendor || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Cout/mois :</span><br /><strong>{node.monthly_cost ? `${node.monthly_cost} EUR` : '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Criticite :</span><br /><strong>{node.criticality || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Utilisateurs :</span><br /><strong>{node.user_count || '-'}</strong></div>
          </>
        ) : (
          <>
            <div><span style={{ color: 'var(--text-muted)' }}>Fournisseur :</span><br /><strong>{node.provider || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Cout/mois :</span><br /><strong>{node.monthly_cost ? `${node.monthly_cost} EUR` : '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Region :</span><br /><strong>{node.region || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>OS :</span><br /><strong>{node.os || '-'}</strong></div>
          </>
        )}
      </div>
      {connectedFlows.length > 0 && (
        <div style={{ marginBottom: '.75rem' }}>
          <h4 style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: '.4rem' }}>Flux ({connectedFlows.length})</h4>
          {connectedFlows.map(f => (
            <div key={f.id} style={{ padding: '.4rem', borderRadius: 6, border: '1px solid var(--border)', marginBottom: '.25rem', fontSize: '.7rem' }}>
              <strong>{f.name}</strong>
              <div style={{ color: 'var(--text-muted)' }}>{f.protocol} | {f.frequency} | <span style={{ color: STATUS_COLORS[f.status] }}>{f.status}</span></div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button onClick={() => onEdit(node)} style={btnPrimary}>✏ Modifier</button>
        <button onClick={() => onDelete(node)} style={btnDanger}>🗑 Supprimer</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ══ MAIN PAGE ══
// ══════════════════════════════════════════════════════
export default function ArchitectureViewerPage() {
  const { societeId } = useSociete()
  const [view, setView] = useState('graph')
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState([])
  const [infra, setInfra] = useState([])
  const [flows, setFlows] = useState([])
  const [positions, setPositions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)

  // Modals
  const [showAddApp, setShowAddApp] = useState(false)
  const [showAddInfra, setShowAddInfra] = useState(false)
  const [showAddFlow, setShowAddFlow] = useState(false)
  const [editingNode, setEditingNode] = useState(null) // node being edited
  const [showConfirmDelete, setShowConfirmDelete] = useState(null) // node or edge to delete

  // Drawing flow state
  const [drawingFlow, setDrawingFlow] = useState(null) // { nodeId, x, y }
  const [drawMouse, setDrawMouse] = useState(null)
  const [flowSource, setFlowSource] = useState(null)
  const [flowDest, setFlowDest] = useState(null)

  // Form states
  const [appForm, setAppForm] = useState({ name: '', type: 'saas', category: 'other', vendor: '', criticality: 'medium', monthly_cost: 0 })
  const [infraForm, setInfraForm] = useState({ name: '', type: 'server', provider: '', criticality: 'medium', monthly_cost: 0 })
  const [flowForm, setFlowForm] = useState({ name: '', protocol: 'api_rest', frequency: 'daily', data_type: '', is_encrypted: false })

  const nodes = useMemo(() => [
    ...apps.map(a => ({ ...a, nodeType: 'app' })),
    ...infra.map(i => ({ ...i, nodeType: 'infra' })),
  ], [apps, infra])

  const selectedNode = nodes.find(n => n.id === selectedId) || null
  const selectedEdge = flows.find(f => f.id === selectedEdgeId) || null

  useEffect(() => { if (!societeId) { setLoading(false); return }; loadData() }, [societeId])

  // Recompute positions when nodes change (only for nodes without saved positions)
  useEffect(() => {
    if (nodes.length === 0) { setPositions([]); return }
    const computed = computeForceLayout(nodes, flows, 800, 500)
    // Use saved positions from metadata if available
    const finalPos = nodes.map((n, i) => {
      if (n.metadata?.x != null && n.metadata?.y != null) return { x: n.metadata.x, y: n.metadata.y }
      return computed[i]
    })
    setPositions(finalPos)
  }, [nodes.length]) // Only recompute when count changes

  // Track mouse for drawing flow
  useEffect(() => {
    if (!drawingFlow) return
    function onMove(e) {
      const svg = document.querySelector('svg')
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
      setDrawMouse({ x: svgPt.x, y: svgPt.y })
    }
    function onUp() { setDrawingFlow(null); setDrawMouse(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drawingFlow])

  // Keyboard shortcut: Delete key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        if (selectedNode) setShowConfirmDelete(selectedNode)
        else if (selectedEdge) setShowConfirmDelete(selectedEdge)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedNode, selectedEdge])

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

  // ── CRUD handlers ──

  async function handleAddApp() {
    if (!appForm.name.trim()) return
    const { error } = await supabase.from('si_applications').insert({ ...appForm, societe_id: societeId, status: 'active' })
    if (error) { alert('Erreur : ' + error.message); return }
    setShowAddApp(false); setAppForm({ name: '', type: 'saas', category: 'other', vendor: '', criticality: 'medium', monthly_cost: 0 })
    loadData()
  }

  async function handleAddInfra() {
    if (!infraForm.name.trim()) return
    const { error } = await supabase.from('si_infrastructure').insert({ ...infraForm, societe_id: societeId, status: 'running', health_status: 'unknown' })
    if (error) { alert('Erreur : ' + error.message); return }
    setShowAddInfra(false); setInfraForm({ name: '', type: 'server', provider: '', criticality: 'medium', monthly_cost: 0 })
    loadData()
  }

  async function handleAddFlow() {
    if (!flowForm.name.trim() || !flowSource || !flowDest) return
    const { error } = await supabase.from('si_data_flows').insert({
      ...flowForm, societe_id: societeId, status: 'active',
      source_type: flowSource.nodeType === 'app' ? 'application' : 'infrastructure', source_id: flowSource.id,
      destination_type: flowDest.nodeType === 'app' ? 'application' : 'infrastructure', destination_id: flowDest.id,
    })
    if (error) { alert('Erreur : ' + error.message); return }
    setShowAddFlow(false); setFlowForm({ name: '', protocol: 'api_rest', frequency: 'daily', data_type: '', is_encrypted: false })
    setFlowSource(null); setFlowDest(null)
    loadData()
  }

  async function handleEditNode(node) {
    const table = node.nodeType === 'app' ? 'si_applications' : 'si_infrastructure'
    const payload = node.nodeType === 'app' ? appForm : infraForm
    const { error } = await supabase.from(table).update(payload).eq('id', node.id)
    if (error) { alert('Erreur : ' + error.message); return }
    setEditingNode(null); loadData()
  }

  async function handleDelete(item) {
    if (item.source_id) {
      // It's a flow
      await supabase.from('si_data_flows').delete().eq('id', item.id)
    } else {
      // It's a node — delete associated flows first
      const table = item.nodeType === 'app' ? 'si_applications' : 'si_infrastructure'
      await supabase.from('si_data_flows').delete().or(`source_id.eq.${item.id},destination_id.eq.${item.id}`)
      await supabase.from(table).delete().eq('id', item.id)
    }
    setShowConfirmDelete(null); setSelectedId(null); setSelectedEdgeId(null)
    loadData()
  }

  function handleStartDrawFlow(node, pos) {
    setDrawingFlow({ nodeId: node.id, x: pos.x + 28, y: pos.y })
    setFlowSource(node)
  }

  function handleNodeMouseUp(destNode) {
    if (!drawingFlow || drawingFlow.nodeId === destNode.id) return
    setFlowDest(destNode)
    setDrawingFlow(null); setDrawMouse(null)
    setFlowForm({ name: `${flowSource?.name || '?'} → ${destNode.name}`, protocol: 'api_rest', frequency: 'daily', data_type: '', is_encrypted: false })
    setShowAddFlow(true)
  }

  function handleReorganize() {
    const computed = computeForceLayout(nodes, flows, 800, 500)
    setPositions(computed)
    // Save all positions
    nodes.forEach((n, i) => {
      const table = n.nodeType === 'app' ? 'si_applications' : 'si_infrastructure'
      supabase.from(table).update({ metadata: { ...(n.metadata || {}), x: computed[i].x, y: computed[i].y } }).eq('id', n.id).then(() => {})
    })
  }

  function openEditNode(node) {
    if (node.nodeType === 'app') {
      setAppForm({ name: node.name, type: node.type, category: node.category, vendor: node.vendor || '', criticality: node.criticality, monthly_cost: node.monthly_cost || 0 })
    } else {
      setInfraForm({ name: node.name, type: node.type, provider: node.provider || '', criticality: node.criticality, monthly_cost: node.monthly_cost || 0 })
    }
    setEditingNode(node)
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  }

  return (
    <div style={{ padding: '1rem 1.5rem', maxWidth: 1500, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexShrink: 0, flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            🗺 Architecture SI
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', margin: '.2rem 0 0' }}>
            {apps.length} apps, {infra.length} infra, {flows.length} flux — Cliquez sur les ports bleus pour creer des flux
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.25rem', background: 'var(--surface, #f1f5f9)', borderRadius: 8, padding: 3 }}>
          {[{ id: 'graph', label: 'Editeur', icon: '✏' }, { id: 'layers', label: 'Couches', icon: '📊' }].map(v => (
            <button key={v.id} onClick={() => { setView(v.id); setSelectedId(null); setSelectedEdgeId(null) }} style={{
              padding: '.35rem .7rem', borderRadius: 6, border: 'none',
              background: view === v.id ? '#195C82' : 'transparent', color: view === v.id ? '#fff' : 'var(--text-muted)',
              fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.3rem',
            }}>
              <span>{v.icon}</span> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar (graph mode only) */}
      {view === 'graph' && (
        <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowAddApp(true); setAppForm({ name: '', type: 'saas', category: 'other', vendor: '', criticality: 'medium', monthly_cost: 0 }) }}
            style={{ ...btnPrimary, fontSize: '.78rem', padding: '.35rem .7rem' }}>💻 + Application</button>
          <button onClick={() => { setShowAddInfra(true); setInfraForm({ name: '', type: 'server', provider: '', criticality: 'medium', monthly_cost: 0 }) }}
            style={{ ...btnPrimary, fontSize: '.78rem', padding: '.35rem .7rem', background: '#1D9BF0' }}>🖥 + Infrastructure</button>
          <button onClick={handleReorganize}
            style={{ ...btnSecondary, fontSize: '.78rem', padding: '.35rem .7rem' }}>🔄 Reorganiser</button>
          {(selectedNode || selectedEdge) && (
            <button onClick={() => setShowConfirmDelete(selectedNode || selectedEdge)}
              style={{ ...btnDanger, fontSize: '.78rem', padding: '.35rem .7rem' }}>🗑 Supprimer</button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
            Glissez les ports bleus pour creer des flux
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {view === 'graph' ? (
          <GraphEditor
            apps={apps} infra={infra} flows={flows}
            positions={positions} setPositions={setPositions}
            selectedId={selectedId} setSelectedId={setSelectedId}
            selectedEdgeId={selectedEdgeId} setSelectedEdgeId={setSelectedEdgeId}
            onStartDrawFlow={handleStartDrawFlow}
            drawingFlow={drawingFlow} drawMouse={drawMouse}
            onNodeMouseUp={handleNodeMouseUp}
            nodes={nodes}
          />
        ) : (
          <div style={{ padding: '1rem', height: '100%' }}>
            <LayerView apps={apps} infra={infra} />
          </div>
        )}

        <DetailPanel
          node={selectedNode} edge={selectedEdge} flows={flows} allNodes={nodes}
          onClose={() => { setSelectedId(null); setSelectedEdgeId(null) }}
          onEdit={openEditNode} onDelete={(n) => setShowConfirmDelete(n)}
          onEditEdge={() => {}} onDeleteEdge={(e) => setShowConfirmDelete(e)}
        />
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Add Application */}
      {showAddApp && (
        <Modal title="💻 Ajouter une application" onClose={() => setShowAddApp(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <div style={{ gridColumn: '1/-1' }}><FormField label="Nom *"><input value={appForm.name} onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Salesforce CRM" /></FormField></div>
            <FormField label="Type"><select value={appForm.type} onChange={e => setAppForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>{APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FormField>
            <FormField label="Categorie"><select value={appForm.category} onChange={e => setAppForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>{APP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Editeur"><input value={appForm.vendor} onChange={e => setAppForm(f => ({ ...f, vendor: e.target.value }))} style={inputStyle} /></FormField>
            <FormField label="Criticite"><select value={appForm.criticality} onChange={e => setAppForm(f => ({ ...f, criticality: e.target.value }))} style={inputStyle}>{CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Cout mensuel (EUR)"><input type="number" value={appForm.monthly_cost} onChange={e => setAppForm(f => ({ ...f, monthly_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></FormField>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setShowAddApp(false)} style={btnSecondary}>Annuler</button>
            <button onClick={handleAddApp} disabled={!appForm.name.trim()} style={{ ...btnPrimary, opacity: appForm.name.trim() ? 1 : 0.5 }}>Ajouter</button>
          </div>
        </Modal>
      )}

      {/* Add Infrastructure */}
      {showAddInfra && (
        <Modal title="🖥 Ajouter une infrastructure" onClose={() => setShowAddInfra(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <div style={{ gridColumn: '1/-1' }}><FormField label="Nom *"><input value={infraForm.name} onChange={e => setInfraForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Serveur OVH Production" /></FormField></div>
            <FormField label="Type"><select value={infraForm.type} onChange={e => setInfraForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>{INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FormField>
            <FormField label="Fournisseur"><input value={infraForm.provider} onChange={e => setInfraForm(f => ({ ...f, provider: e.target.value }))} style={inputStyle} /></FormField>
            <FormField label="Criticite"><select value={infraForm.criticality} onChange={e => setInfraForm(f => ({ ...f, criticality: e.target.value }))} style={inputStyle}>{CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Cout mensuel (EUR)"><input type="number" value={infraForm.monthly_cost} onChange={e => setInfraForm(f => ({ ...f, monthly_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></FormField>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setShowAddInfra(false)} style={btnSecondary}>Annuler</button>
            <button onClick={handleAddInfra} disabled={!infraForm.name.trim()} style={{ ...btnPrimary, opacity: infraForm.name.trim() ? 1 : 0.5 }}>Ajouter</button>
          </div>
        </Modal>
      )}

      {/* Add Flow (after drag from port) */}
      {showAddFlow && (
        <Modal title="🔗 Creer un flux" onClose={() => { setShowAddFlow(false); setFlowSource(null); setFlowDest(null) }}>
          <div style={{ background: 'var(--surface)', padding: '.6rem', borderRadius: 8, marginBottom: '.75rem', fontSize: '.8rem' }}>
            <strong>{flowSource?.name}</strong> <span style={{ color: 'var(--text-muted)' }}>→</span> <strong>{flowDest?.name}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <div style={{ gridColumn: '1/-1' }}><FormField label="Nom du flux"><input value={flowForm.name} onChange={e => setFlowForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></FormField></div>
            <FormField label="Protocole"><select value={flowForm.protocol} onChange={e => setFlowForm(f => ({ ...f, protocol: e.target.value }))} style={inputStyle}>{PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}</select></FormField>
            <FormField label="Frequence"><select value={flowForm.frequency} onChange={e => setFlowForm(f => ({ ...f, frequency: e.target.value }))} style={inputStyle}>{FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}</select></FormField>
            <FormField label="Type de donnees"><input value={flowForm.data_type} onChange={e => setFlowForm(f => ({ ...f, data_type: e.target.value }))} style={inputStyle} placeholder="Ex: Contacts" /></FormField>
            <FormField label="Chiffrement">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                <input type="checkbox" checked={flowForm.is_encrypted} onChange={e => setFlowForm(f => ({ ...f, is_encrypted: e.target.checked }))} />
                Flux chiffre (TLS/SSL)
              </label>
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => { setShowAddFlow(false); setFlowSource(null); setFlowDest(null) }} style={btnSecondary}>Annuler</button>
            <button onClick={handleAddFlow} disabled={!flowForm.name.trim()} style={{ ...btnPrimary, opacity: flowForm.name.trim() ? 1 : 0.5 }}>Creer le flux</button>
          </div>
        </Modal>
      )}

      {/* Edit Node */}
      {editingNode && (
        <Modal title={`✏ Modifier ${editingNode.name}`} onClose={() => setEditingNode(null)}>
          {editingNode.nodeType === 'app' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <div style={{ gridColumn: '1/-1' }}><FormField label="Nom"><input value={appForm.name} onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></FormField></div>
              <FormField label="Type"><select value={appForm.type} onChange={e => setAppForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>{APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FormField>
              <FormField label="Categorie"><select value={appForm.category} onChange={e => setAppForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>{APP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
              <FormField label="Editeur"><input value={appForm.vendor} onChange={e => setAppForm(f => ({ ...f, vendor: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Criticite"><select value={appForm.criticality} onChange={e => setAppForm(f => ({ ...f, criticality: e.target.value }))} style={inputStyle}>{CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
              <FormField label="Cout mensuel"><input type="number" value={appForm.monthly_cost} onChange={e => setAppForm(f => ({ ...f, monthly_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></FormField>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <div style={{ gridColumn: '1/-1' }}><FormField label="Nom"><input value={infraForm.name} onChange={e => setInfraForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></FormField></div>
              <FormField label="Type"><select value={infraForm.type} onChange={e => setInfraForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>{INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FormField>
              <FormField label="Fournisseur"><input value={infraForm.provider} onChange={e => setInfraForm(f => ({ ...f, provider: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Criticite"><select value={infraForm.criticality} onChange={e => setInfraForm(f => ({ ...f, criticality: e.target.value }))} style={inputStyle}>{CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
              <FormField label="Cout mensuel"><input type="number" value={infraForm.monthly_cost} onChange={e => setInfraForm(f => ({ ...f, monthly_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></FormField>
            </div>
          )}
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setEditingNode(null)} style={btnSecondary}>Annuler</button>
            <button onClick={() => handleEditNode(editingNode)} style={btnPrimary}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {showConfirmDelete && (
        <Modal title="Confirmer la suppression" onClose={() => setShowConfirmDelete(null)}>
          <p style={{ fontSize: '.9rem', marginBottom: '1rem' }}>
            Supprimer <strong>{showConfirmDelete.name}</strong> ?
            {!showConfirmDelete.source_id && <><br /><span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Les flux associes seront egalement supprimes.</span></>}
          </p>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowConfirmDelete(null)} style={btnSecondary}>Annuler</button>
            <button onClick={() => handleDelete(showConfirmDelete)} style={btnDanger}>Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
