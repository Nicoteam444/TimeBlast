import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import useEnvNavigate from '../../hooks/useEnvNavigate'
import { useAuth } from '../../contexts/AuthContext'
import { useSociete } from '../../contexts/SocieteContext'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ── Formatters ──
function fmtE(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)
}
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "a l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `il y a ${diffD}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── CSS Animations ──
const COCKPIT_STYLE_ID = 'cockpit-animations'
if (typeof document !== 'undefined' && !document.getElementById(COCKPIT_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = COCKPIT_STYLE_ID
  style.textContent = `
    @keyframes cockpitFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .cockpit-card { animation: cockpitFadeIn .45s ease both; transition: transform .2s, box-shadow .2s; }
    .cockpit-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,.08) !important; }
  `
  document.head.appendChild(style)
}

const cardStyle = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  padding: '1.25rem',
}

// ── Donut SVG ──
function DonutChart({ size = 64, stroke = 6, pct = 0, color = '#16a34a', trackColor = '#e5e7eb', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fontWeight: 700, fill: color }}>
        {label ?? `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}

// ── Priority badge ──
const PRIORITY_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' }
const PRIORITY_LABELS = { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse' }
function PriorityBadge({ priority }) {
  const bg = PRIORITY_COLORS[priority] || '#94a3b8'
  return (
    <span style={{
      display: 'inline-block', fontSize: '.65rem', fontWeight: 700, color: '#fff',
      background: bg, borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase',
    }}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}

// ── Category icons ──
const CATEGORY_ICONS = {
  security: '🛡', optimization: '⚡', cost: '💰', integration: '🔗',
  compliance: '📋', upgrade: '🔄', automation: '🤖', other: '💡',
}

// ── Status colors for health ──
const HEALTH_COLORS = { healthy: '#16a34a', warning: '#d97706', critical: '#dc2626', unknown: '#94a3b8' }
const STATUS_COLORS = { active: '#16a34a', running: '#16a34a', error: '#dc2626', inactive: '#94a3b8', planned: '#6366f1', deprecated: '#d97706', stopped: '#94a3b8' }

// ── Mini Architecture Map (SVG) ──
function MiniArchitectureMap({ apps, infra, flows, onNavigate }) {
  const nodes = useMemo(() => {
    const result = []
    const all = [
      ...apps.map(a => ({ ...a, nodeType: 'app' })),
      ...infra.map(i => ({ ...i, nodeType: 'infra' })),
    ]
    // Simple circular layout
    const cx = 200, cy = 150, radius = 110
    all.forEach((item, i) => {
      const angle = (2 * Math.PI * i) / all.length - Math.PI / 2
      result.push({
        ...item,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      })
    })
    return result
  }, [apps, infra])

  const edges = useMemo(() => {
    return flows.map(f => {
      const src = nodes.find(n => n.id === f.source_id)
      const dst = nodes.find(n => n.id === f.destination_id)
      if (!src || !dst) return null
      return { ...f, x1: src.x, y1: src.y, x2: dst.x, y2: dst.y }
    }).filter(Boolean)
  }, [flows, nodes])

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onNavigate}>
      <svg viewBox="0 0 400 300" style={{ width: '100%', height: 'auto', minHeight: 200 }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted, #94a3b8)" />
          </marker>
        </defs>
        {/* Edges */}
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.status === 'error' ? '#dc2626' : 'var(--border, #cbd5e1)'}
            strokeWidth={e.status === 'error' ? 2 : 1.5}
            strokeDasharray={e.status === 'active' ? '6 3' : '3 3'}
            markerEnd="url(#arrowhead)"
            opacity={0.6}
          >
            {e.status === 'active' && (
              <animate attributeName="stroke-dashoffset" from="9" to="0" dur="1s" repeatCount="indefinite" />
            )}
          </line>
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => {
          const color = n.nodeType === 'app'
            ? (STATUS_COLORS[n.status] || '#94a3b8')
            : (HEALTH_COLORS[n.health_status] || '#94a3b8')
          return (
            <g key={n.id}>
              {n.nodeType === 'app' ? (
                <circle cx={n.x} cy={n.y} r={14} fill={color} opacity={0.15} stroke={color} strokeWidth={2} />
              ) : (
                <rect x={n.x - 12} y={n.y - 12} width={24} height={24} rx={4} fill={color} opacity={0.15} stroke={color} strokeWidth={2} />
              )}
              <text x={n.x} y={n.y + 26} textAnchor="middle" style={{ fontSize: 7, fill: 'var(--text, #1e293b)', fontWeight: 500 }}>
                {n.name.length > 14 ? n.name.slice(0, 12) + '..' : n.name}
              </text>
            </g>
          )
        })}
        {/* Center label */}
        <text x={200} y={150} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 10, fill: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
          Architecture SI
        </text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: '.5rem', fontSize: '.75rem', color: 'var(--accent, #1D9BF0)', fontWeight: 600 }}>
        Voir la cartographie complete →
      </div>
    </div>
  )
}

// ── Main Dashboard ──
export default function CockpitDashboardPage() {
  const { profile } = useAuth()
  const { societeId, societe } = useSociete()
  const envNavigate = useEnvNavigate()
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState([])
  const [infra, setInfra] = useState([])
  const [flows, setFlows] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [agents, setAgents] = useState([])
  const [securityScore, setSecurityScore] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  useEffect(() => {
    if (!societeId) { setLoading(false); return }
    loadData()
  }, [societeId])

  async function loadData() {
    setLoading(true)
    const safeQuery = async (query) => {
      try {
        const { data, error } = await query
        if (error) { console.warn('[Cockpit]', error.message); return [] }
        return data || []
      } catch (e) { console.warn('[Cockpit] catch:', e.message); return [] }
    }
    try {
      const [appsData, infraData, flowsData, recosData, agentsData, secData, auditData] = await Promise.all([
        safeQuery(supabase.from('si_applications').select('*').eq('societe_id', societeId)),
        safeQuery(supabase.from('si_infrastructure').select('*').eq('societe_id', societeId)),
        safeQuery(supabase.from('si_data_flows').select('*').eq('societe_id', societeId)),
        safeQuery(supabase.from('si_recommendations').select('*').eq('societe_id', societeId).order('priority', { ascending: true }).limit(10)),
        safeQuery(supabase.from('si_agents').select('*').eq('societe_id', societeId)),
        safeQuery(supabase.from('si_security_scores').select('*').eq('societe_id', societeId).order('scan_date', { ascending: false }).limit(1)),
        safeQuery(supabase.from('si_audit_log').select('*').eq('societe_id', societeId).order('created_at', { ascending: false }).limit(10)),
      ])
      setApps(appsData)
      setInfra(infraData)
      setFlows(flowsData)
      setRecommendations(recosData)
      setAgents(agentsData)
      setSecurityScore(secData[0] || null)
      setAuditLog(auditData)
    } catch (err) {
      console.error('Cockpit load error:', err)
    }
    setLoading(false)
  }

  // ── Computed KPIs ──
  const activeApps = apps.filter(a => a.status === 'active').length
  const runningInfra = infra.filter(i => i.status === 'running').length
  const activeFlows = flows.filter(f => f.status === 'active').length
  const activeAgents = agents.filter(a => a.status === 'active').length
  const totalMonthlyCost = [...apps, ...infra].reduce((sum, item) => sum + (parseFloat(item.monthly_cost) || 0), 0)
  const secScore = securityScore?.overall_score || 0
  const secColor = secScore >= 80 ? '#16a34a' : secScore >= 60 ? '#d97706' : '#dc2626'
  const pendingRecos = recommendations.filter(r => r.status === 'pending')

  // ── Cost by category chart ──
  const costByCategory = useMemo(() => {
    const map = {}
    apps.filter(a => a.status === 'active').forEach(a => {
      const cat = a.category || 'other'
      map[cat] = (map[cat] || 0) + (parseFloat(a.monthly_cost) || 0)
    })
    return Object.entries(map).map(([cat, cost]) => ({ name: cat, value: cost })).sort((a, b) => b.value - a.value)
  }, [apps])

  const PIE_COLORS = ['#195C82', '#1D9BF0', '#F8B35A', '#98BA9C', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

  // ── Handle recommendation action ──
  async function handleRecoAction(id, action) {
    const status = action === 'approve' ? 'approved' : 'dismissed'
    await supabase.from('si_recommendations').update({
      status,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
    }).eq('id', id)
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    // Log
    const reco = recommendations.find(r => r.id === id)
    await supabase.from('si_audit_log').insert({
      societe_id: societeId,
      user_name: profile?.full_name || profile?.email || 'Utilisateur',
      action: action === 'approve' ? 'Recommandation approuvee' : 'Recommandation ignoree',
      entity_type: 'recommendation',
      entity_id: id,
      entity_name: reco?.title,
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>Chargement du cockpit SI...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text, #1e293b)', margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🎛</span> Cockpit de pilotage SI
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '.85rem', marginTop: '.25rem' }}>
          Vue d'ensemble de votre systeme d'information
        </p>
      </div>

      {/* Cloisonnement banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem 1rem',
        borderRadius: 10, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
        border: '1px solid #bbf7d0', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
          <span>🔒</span>
          <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#16a34a' }}>IA interne cloisonnee</span>
        </div>
        <span style={{ fontSize: '.73rem', color: '#4b5563' }}>
          Toutes les donnees et agents sont strictement isoles au perimetre de <strong style={{ color: '#195C82' }}>{societe?.name || societe?.nom || 'votre societe'}</strong>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 6, background: '#16a34a18', color: '#16a34a', fontWeight: 600 }}>
            🤖 {activeAgents} agent{activeAgents > 1 ? 's' : ''} actif{activeAgents > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '💻', label: 'Applications', value: activeApps, sub: `${apps.length} total`, color: '#195C82' },
          { icon: '🖥', label: 'Infrastructure', value: runningInfra, sub: `${infra.length} elements`, color: '#1D9BF0' },
          { icon: '🔗', label: 'Flux actifs', value: activeFlows, sub: `${flows.filter(f => f.status === 'error').length} en erreur`, color: flows.some(f => f.status === 'error') ? '#dc2626' : '#16a34a' },
          { icon: 'donut', label: 'Score securite', value: secScore, color: secColor },
          { icon: '💰', label: 'Cout mensuel SI', value: fmtE(totalMonthlyCost), sub: `${fmtE(totalMonthlyCost * 12)}/an`, color: '#F8B35A' },
          { icon: '🤖', label: 'Agents IA', value: activeAgents, sub: `${agents.length} configures`, color: '#6366f1' },
        ].map((kpi, i) => (
          <div key={i} className="cockpit-card" style={{ ...cardStyle, animationDelay: `${i * 0.05}s`, textAlign: 'center' }}>
            {kpi.icon === 'donut' ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.5rem' }}>
                <DonutChart size={56} stroke={5} pct={kpi.value} color={kpi.color} />
              </div>
            ) : (
              <div style={{ fontSize: '1.8rem', marginBottom: '.25rem' }}>{kpi.icon}</div>
            )}
            <div style={{ fontSize: kpi.icon === 'donut' ? '.85rem' : '1.5rem', fontWeight: 700, color: kpi.color }}>
              {kpi.icon === 'donut' ? '' : kpi.value}
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '.15rem' }}>{kpi.label}</div>
            {kpi.sub && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.15rem', opacity: 0.7 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Main Grid: Architecture + Recommendations ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Architecture Mini Map */}
        <div className="cockpit-card" style={{ ...cardStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <span>🗺</span> Cartographie SI
            </h2>
            <button
              onClick={() => envNavigate('/cockpit/architecture')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Ouvrir →
            </button>
          </div>
          <MiniArchitectureMap
            apps={apps.filter(a => a.status !== 'decommissioned')}
            infra={infra.filter(i => i.status !== 'decommissioned')}
            flows={flows}
            onNavigate={() => envNavigate('/cockpit/architecture')}
          />
        </div>

        {/* Recommendations Panel */}
        <div className="cockpit-card" style={{ ...cardStyle, maxHeight: 450, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <span>💡</span> Recommandations IA
              {pendingRecos.length > 0 && (
                <span style={{ fontSize: '.7rem', background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
                  {pendingRecos.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => envNavigate('/cockpit/recommandations')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Voir tout →
            </button>
          </div>
          {pendingRecos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>✅</div>
              <p style={{ fontSize: '.85rem' }}>Aucune recommandation en attente</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {pendingRecos.slice(0, 5).map(reco => (
                <div key={reco.id} style={{
                  padding: '.75rem', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface, #f8fafc)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                    <span>{CATEGORY_ICONS[reco.category] || '💡'}</span>
                    <PriorityBadge priority={reco.priority} />
                  </div>
                  <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.25rem' }}>
                    {reco.title}
                  </div>
                  <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', margin: 0, marginBottom: '.5rem', lineHeight: 1.4 }}>
                    {reco.description?.length > 120 ? reco.description.slice(0, 120) + '...' : reco.description}
                  </p>
                  {reco.estimated_savings > 0 && (
                    <div style={{ fontSize: '.7rem', color: '#16a34a', fontWeight: 600, marginBottom: '.5rem' }}>
                      Economie estimee : {fmtE(reco.estimated_savings)}/mois
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button
                      onClick={() => handleRecoAction(reco.id, 'approve')}
                      style={{
                        flex: 1, padding: '.35rem', borderRadius: 6, border: 'none',
                        background: '#16a34a', color: '#fff', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleRecoAction(reco.id, 'dismiss')}
                      style={{
                        flex: 1, padding: '.35rem', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text-muted)', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Activity + Quick Actions + Cost Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

        {/* Activity Feed */}
        <div className="cockpit-card" style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span>📋</span> Activite recente
          </h2>
          {auditLog.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
              Aucune activite recente
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {auditLog.map((log, i) => (
                <div key={log.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '.5rem',
                  padding: '.5rem', borderRadius: 6,
                  background: i % 2 === 0 ? 'var(--surface, #f8fafc)' : 'transparent',
                }}>
                  <div style={{ fontSize: '.7rem', minWidth: 0, flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{log.user_name}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 .25rem' }}>—</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.action}</span>
                    {log.entity_name && (
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}> {log.entity_name}</span>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '.65rem', marginTop: '.15rem', opacity: 0.7 }}>
                      {relativeTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="cockpit-card" style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span>⚡</span> Actions rapides
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              { icon: '💻', label: 'Ajouter une application', to: '/cockpit/applications' },
              { icon: '🗺', label: 'Voir l\'architecture', to: '/cockpit/architecture' },
              { icon: '🤖', label: 'Deployer un agent', to: '/cockpit/agents' },
              { icon: '🔗', label: 'Gerer les flux', to: '/cockpit/flux' },
              { icon: '🖥', label: 'Infrastructure', to: '/cockpit/infrastructure' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => envNavigate(action.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  padding: '.65rem .75rem', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface, #f8fafc)',
                  cursor: 'pointer', fontSize: '.82rem', fontWeight: 500,
                  color: 'var(--text)', textAlign: 'left',
                  transition: 'background .15s, border-color .15s',
                }}
                onMouseEnter={e => { e.target.style.background = 'var(--accent)'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'var(--surface, #f8fafc)'; e.target.style.color = 'var(--text)' }}
              >
                <span style={{ fontSize: '1.1rem' }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cost by Category */}
        <div className="cockpit-card" style={{ ...cardStyle }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span>💰</span> Couts par categorie
          </h2>
          {costByCategory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem 0' }}>
              Aucune donnee de cout
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={costByCategory}
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {costByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtE(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {costByCategory.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.5rem' }}>
              {costByCategory.map((cat, i) => (
                <span key={cat.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.25rem',
                  fontSize: '.65rem', color: 'var(--text-muted)',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
