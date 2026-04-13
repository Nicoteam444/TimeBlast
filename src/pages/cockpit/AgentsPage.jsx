import { useState, useEffect } from 'react'
import { useSociete } from '../../contexts/SocieteContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const AGENT_TYPES = [
  { id: 'monitor', icon: '👁', label: 'Moniteur', desc: 'Surveille un flux ou une application et alerte en cas d\'anomalie' },
  { id: 'transformer', icon: '🔄', label: 'Transformateur', desc: 'Transforme et enrichit les donnees entre deux systemes' },
  { id: 'validator', icon: '✅', label: 'Validateur', desc: 'Verifie la coherence et la qualite des donnees avant import' },
  { id: 'alerter', icon: '🔔', label: 'Alerteur', desc: 'Envoie des notifications sur des evenements critiques' },
  { id: 'optimizer', icon: '⚡', label: 'Optimiseur', desc: 'Analyse et optimise les performances ou les couts' },
  { id: 'connector', icon: '🔗', label: 'Connecteur', desc: 'Synchronise les donnees entre deux applications' },
  { id: 'security', icon: '🛡', label: 'Securite', desc: 'Surveille les acces, les vulnerabilites et la conformite' },
  { id: 'custom', icon: '🛠', label: 'Personnalise', desc: 'Agent configure avec des regles metier specifiques' },
]

const AUTONOMY_LEVELS = [
  { id: 'supervised', label: 'Supervise', desc: 'Propose des actions, attend la validation humaine', color: '#16a34a', icon: '👤' },
  { id: 'semi_auto', label: 'Semi-autonome', desc: 'Execute les actions non-critiques, demande validation pour le reste', color: '#d97706', icon: '🤝' },
  { id: 'autonomous', label: 'Autonome', desc: 'Execute toutes les actions sans validation (avec audit)', color: '#dc2626', icon: '🤖' },
]

const TRIGGERS = [
  { id: 'realtime', label: 'Temps reel', desc: 'Se declenche a chaque evenement' },
  { id: 'scheduled', label: 'Planifie', desc: 'S\'execute selon un cron (horaire, quotidien...)' },
  { id: 'on_event', label: 'Sur evenement', desc: 'Se declenche sur un type d\'evenement specifique' },
  { id: 'on_demand', label: 'A la demande', desc: 'Execute manuellement ou via le chat DSI' },
  { id: 'threshold', label: 'Sur seuil', desc: 'Se declenche quand un indicateur depasse un seuil' },
]

const STATUSES = ['active', 'inactive', 'error', 'paused', 'pending_approval']
const STATUS_COLORS = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626', paused: '#d97706', pending_approval: '#6366f1' }
const STATUS_LABELS = { active: 'Actif', inactive: 'Inactif', error: 'Erreur', paused: 'En pause', pending_approval: 'En attente' }

const cardStyle = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '1.25rem' }

function relativeTime(date) {
  if (!date) return '-'
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'il y a quelques secondes'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `il y a ${Math.floor(diff / 86400)}j`
  return d.toLocaleDateString('fr-FR')
}

export default function AgentsPage() {
  const { societeId, societe } = useSociete()
  const { profile } = useAuth()
  const [agents, setAgents] = useState([])
  const [dataFlows, setDataFlows] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', type: 'monitor', description: '', data_flow_id: '',
    autonomy: 'supervised', trigger: 'on_demand', scope: 'flow',
    config: '{}', status: 'pending_approval', notes: '',
  })
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { if (!societeId) { setLoading(false); return }; loadAll() }, [societeId])

  async function loadAll() {
    setLoading(true)
    const safe = async (q) => { try { const { data, error } = await q; if (error) console.warn('[Agents]', error.message); return data || [] } catch (e) { console.warn('[Agents]', e.message); return [] } }
    const [agentsData, flowsData, appsData] = await Promise.all([
      safe(supabase.from('si_agents').select('*').eq('societe_id', societeId).order('created_at', { ascending: false })),
      safe(supabase.from('si_data_flows').select('id, name, status').eq('societe_id', societeId).order('name')),
      safe(supabase.from('si_applications').select('id, name, category').eq('societe_id', societeId).eq('status', 'active').order('name')),
    ])
    setAgents(agentsData)
    setDataFlows(flowsData)
    setApps(appsData)
    setLoading(false)
  }

  function openWizard() {
    setEditing(null)
    setForm({ name: '', type: 'monitor', description: '', data_flow_id: '', autonomy: 'supervised', trigger: 'on_demand', scope: 'flow', config: '{}', status: 'pending_approval', notes: '' })
    setWizardStep(0)
    setShowWizard(true)
  }

  function openEdit(agent) {
    setEditing(agent)
    const cfg = typeof agent.config === 'object' ? agent.config : {}
    setForm({
      name: agent.name, type: agent.type, description: agent.description || '',
      data_flow_id: agent.data_flow_id || '', autonomy: cfg.autonomy || 'supervised',
      trigger: cfg.trigger || 'on_demand', scope: cfg.scope || 'flow',
      config: JSON.stringify(agent.config || {}, null, 2), status: agent.status,
      notes: agent.notes || '',
    })
    setWizardStep(3) // go straight to config
    setShowWizard(true)
  }

  async function handleSave() {
    const configParsed = {
      autonomy: form.autonomy, trigger: form.trigger, scope: form.scope,
      ...((() => { try { return JSON.parse(form.config || '{}') } catch { return {} } })()),
    }
    const payload = {
      name: form.name, type: form.type, description: form.description || null,
      data_flow_id: form.data_flow_id || null, config: configParsed,
      status: form.status, notes: form.notes || null, societe_id: societeId,
      created_by: profile?.id || null,
    }
    if (editing) {
      await supabase.from('si_agents').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('si_agents').insert(payload)
    }
    // Audit log
    await supabase.from('si_audit_log').insert({
      societe_id: societeId,
      user_name: profile?.full_name || profile?.email || 'Utilisateur',
      action: editing ? 'Agent modifie' : 'Agent cree',
      entity_type: 'agent', entity_name: form.name,
      details: { type: form.type, autonomy: form.autonomy, trigger: form.trigger },
    })
    setShowWizard(false)
    loadAll()
  }

  async function toggleAgentStatus(agent) {
    const newStatus = agent.status === 'active' ? 'paused' : 'active'
    await supabase.from('si_agents').update({ status: newStatus }).eq('id', agent.id)
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a))
  }

  async function handleDelete(id) {
    await supabase.from('si_agents').delete().eq('id', id)
    setDeleting(null)
    loadAll()
  }

  function flowName(id) {
    if (!id) return null
    return dataFlows.find(df => df.id === id)?.name || null
  }

  const filtered = agents
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || (a.description || '').toLowerCase().includes(filter.toLowerCase()))

  const activeCount = agents.filter(a => a.status === 'active').length
  const errorCount = agents.filter(a => a.status === 'error').length
  const totalExec = agents.reduce((s, a) => s + (a.execution_count || 0), 0)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#195C82', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            🤖 Agents IA autonomes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>
            Deployez des agents intelligents dans vos flux de donnees
          </p>
        </div>
        <button onClick={openWizard} style={{
          padding: '.6rem 1.25rem', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #195C82, #1D9BF0)', color: '#fff',
          fontWeight: 700, cursor: 'pointer', fontSize: '.85rem',
          boxShadow: '0 2px 8px rgba(25,92,130,.3)',
        }}>
          + Creer un agent
        </button>
      </div>

      {/* Cloisonnement & KPI banner */}
      <div style={{ ...cardStyle, padding: '.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.3rem .6rem', borderRadius: 6, background: '#16a34a15', border: '1px solid #16a34a30' }}>
            <span>🔒</span>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#16a34a' }}>Donnees cloisonnees</span>
          </div>
          <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
            Les agents n'accedent qu'aux donnees de <strong>{societe?.name || societe?.nom || 'votre societe'}</strong> — isolation stricte par perimetre
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{activeCount}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>Actifs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: errorCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>{errorCount}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>Erreurs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>{totalExec}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>Executions</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher un agent..." style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', minWidth: 200 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '.45rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem' }}>
          <option value="all">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
      </div>

      {/* Agent cards */}
      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🤖</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.5rem' }}>Aucun agent deploye</h3>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Creez votre premier agent IA pour automatiser la surveillance, la validation ou l'optimisation de vos flux SI.
          </p>
          <button onClick={openWizard} style={{
            padding: '.5rem 1.25rem', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer',
          }}>
            Creer un agent →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filtered.map(agent => {
            const typeInfo = AGENT_TYPES.find(t => t.id === agent.type) || AGENT_TYPES[7]
            const cfg = typeof agent.config === 'object' ? agent.config : {}
            const autonomyInfo = AUTONOMY_LEVELS.find(a => a.id === cfg.autonomy)
            const flow = flowName(agent.data_flow_id)
            return (
              <div key={agent.id} className="cockpit-card" style={{ ...cardStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{typeInfo.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{agent.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{typeInfo.label}</div>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: '.7rem', fontWeight: 700,
                    color: '#fff', background: STATUS_COLORS[agent.status] || '#94a3b8',
                  }}>
                    {STATUS_LABELS[agent.status] || agent.status}
                  </span>
                </div>

                {agent.description && (
                  <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: '0 0 .75rem', lineHeight: 1.4 }}>
                    {agent.description.length > 100 ? agent.description.slice(0, 100) + '...' : agent.description}
                  </p>
                )}

                {/* Meta info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.75rem' }}>
                  {flow && (
                    <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                      🔗 {flow}
                    </span>
                  )}
                  {autonomyInfo && (
                    <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 6, background: `${autonomyInfo.color}12`, color: autonomyInfo.color, fontWeight: 600 }}>
                      {autonomyInfo.icon} {autonomyInfo.label}
                    </span>
                  )}
                  {cfg.trigger && (
                    <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 6, background: '#f3e8ff', color: '#7c3aed', fontWeight: 600 }}>
                      ⏱ {TRIGGERS.find(t => t.id === cfg.trigger)?.label || cfg.trigger}
                    </span>
                  )}
                  <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
                    🔒 Cloisonne
                  </span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                  <span>{agent.execution_count || 0} exec.</span>
                  <span style={{ color: (agent.error_count || 0) > 0 ? '#dc2626' : 'inherit' }}>
                    {agent.error_count || 0} erreur{(agent.error_count || 0) > 1 ? 's' : ''}
                  </span>
                  <span>Dernier : {relativeTime(agent.last_execution)}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.4rem', borderTop: '1px solid var(--border)', paddingTop: '.6rem' }}>
                  <button onClick={() => toggleAgentStatus(agent)} style={{
                    flex: 1, padding: '.35rem', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600,
                    color: agent.status === 'active' ? '#d97706' : '#16a34a',
                  }}>
                    {agent.status === 'active' ? '⏸ Pause' : '▶ Activer'}
                  </button>
                  <button onClick={() => openEdit(agent)} style={{
                    flex: 1, padding: '.35rem', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600,
                    color: 'var(--accent)',
                  }}>
                    ✏️ Configurer
                  </button>
                  <button onClick={() => setDeleting(agent)} style={{
                    padding: '.35rem .5rem', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontSize: '.75rem', color: '#dc2626',
                  }}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowWizard(false)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '95%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {/* Wizard header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {editing ? '✏️ Configurer l\'agent' : '🤖 Creer un agent autonome'}
              </h2>
              <div style={{ display: 'flex', gap: '.25rem' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: wizardStep >= i ? 40 : 24, height: 4, borderRadius: 2,
                    background: wizardStep >= i ? 'var(--accent)' : 'var(--border)',
                    transition: 'all .2s',
                  }} />
                ))}
              </div>
            </div>

            {/* Cloisonnement notice */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem .75rem',
              borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1rem',
              fontSize: '.75rem',
            }}>
              <span>🔒</span>
              <span>Cet agent sera <strong>strictement cloisonne</strong> au perimetre de <strong>{societe?.name || societe?.nom || 'votre societe'}</strong>. Il n'aura acces a aucune donnee d'une autre entite.</span>
            </div>

            {/* Step 0: Type */}
            {wizardStep === 0 && (
              <div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Quel type d'agent souhaitez-vous creer ?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.5rem' }}>
                  {AGENT_TYPES.map(t => (
                    <div key={t.id}
                      onClick={() => setForm({ ...form, type: t.id })}
                      style={{
                        padding: '.75rem', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${form.type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: form.type === t.id ? 'var(--accent-light, #e8f4fd)' : 'transparent',
                        transition: 'all .15s',
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', marginBottom: '.25rem' }}>{t.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '.82rem' }}>{t.label}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.15rem', lineHeight: 1.3 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Autonomy & Trigger */}
            {wizardStep === 1 && (
              <div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Niveau d'autonomie</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.25rem' }}>
                  {AUTONOMY_LEVELS.map(a => (
                    <div key={a.id}
                      onClick={() => setForm({ ...form, autonomy: a.id })}
                      style={{
                        padding: '.75rem', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${form.autonomy === a.id ? a.color : 'var(--border)'}`,
                        background: form.autonomy === a.id ? `${a.color}08` : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '.75rem',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{a.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.85rem', color: form.autonomy === a.id ? a.color : 'var(--text)' }}>{a.label}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Declenchement</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.5rem' }}>
                  {TRIGGERS.map(t => (
                    <div key={t.id}
                      onClick={() => setForm({ ...form, trigger: t.id })}
                      style={{
                        padding: '.6rem', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${form.trigger === t.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: form.trigger === t.id ? 'var(--accent-light, #e8f4fd)' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '.8rem' }}>{t.label}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Scope & Flow */}
            {wizardStep === 2 && (
              <div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Perimetre et flux associe</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nom de l'agent *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Moniteur flux comptable"
                    style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.25rem' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description / Mission</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Decrivez la mission de cet agent : que doit-il surveiller, valider, transformer ?"
                    rows={3}
                    style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.25rem', resize: 'vertical' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Flux de donnees associe</label>
                  <select value={form.data_flow_id || ''} onChange={e => setForm({ ...form, data_flow_id: e.target.value || null })}
                    style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.25rem' }}>
                    <option value="">-- Aucun (agent global) --</option>
                    {dataFlows.map(df => <option key={df.id} value={df.id}>{df.name}</option>)}
                  </select>
                </div>

                <div style={{
                  padding: '.75rem', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe',
                  fontSize: '.75rem', color: '#1e40af', lineHeight: 1.4,
                }}>
                  <strong>Perimetre de securite :</strong> Cet agent ne pourra lire et modifier que les donnees appartenant a votre societe (ID: {societeId?.slice(0, 8)}...). Toutes les actions seront tracees dans le journal d'audit.
                </div>
              </div>
            )}

            {/* Step 3: Config & Review */}
            {wizardStep === 3 && (
              <div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Configuration avancee</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Statut initial</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                      <option value="pending_approval">En attente d'approbation</option>
                      <option value="active">Actif immediatement</option>
                      <option value="inactive">Inactif (brouillon)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem' }}>
                      {AGENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Regles metier (JSON)</label>
                  <textarea value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} rows={4}
                    style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical', fontFamily: 'monospace' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    style={{ width: '100%', padding: '.45rem .6rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', marginTop: '.2rem', resize: 'vertical' }} />
                </div>

                {/* Summary */}
                <div style={{ padding: '.75rem', borderRadius: 8, background: 'var(--surface, #f8fafc)', border: '1px solid var(--border)', fontSize: '.78rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '.5rem' }}>Resume de l'agent</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.3rem' }}>
                    <span><strong>Nom :</strong> {form.name || '-'}</span>
                    <span><strong>Type :</strong> {AGENT_TYPES.find(t => t.id === form.type)?.label}</span>
                    <span><strong>Autonomie :</strong> {AUTONOMY_LEVELS.find(a => a.id === form.autonomy)?.label}</span>
                    <span><strong>Declencheur :</strong> {TRIGGERS.find(t => t.id === form.trigger)?.label}</span>
                    <span><strong>Flux :</strong> {flowName(form.data_flow_id) || 'Global'}</span>
                    <span><strong>Cloisonnement :</strong> <span style={{ color: '#16a34a' }}>🔒 Actif</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
              <button
                onClick={() => wizardStep > 0 ? setWizardStep(wizardStep - 1) : setShowWizard(false)}
                style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}
              >
                {wizardStep === 0 ? 'Annuler' : '← Retour'}
              </button>
              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  style={{ padding: '.45rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}
                >
                  Suivant →
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!form.name}
                  style={{ padding: '.45rem 1.25rem', borderRadius: 8, border: 'none', background: form.name ? 'linear-gradient(135deg, #195C82, #1D9BF0)' : 'var(--border)', color: '#fff', cursor: form.name ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '.85rem' }}
                >
                  {editing ? 'Enregistrer' : '🤖 Deployer l\'agent'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleting(null)}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Supprimer l'agent "{deleting.name}" ?</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cet agent sera definitivement supprime ainsi que son historique d'executions.</p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={() => handleDelete(deleting.id)} style={{ padding: '.45rem 1rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
