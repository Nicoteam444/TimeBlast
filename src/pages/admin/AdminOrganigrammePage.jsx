import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

const CANVAS_ID = 'admin_global'
const ROLES = ['admin', 'manager', 'collaborateur', 'comptable']
const ROLE_COLORS = { admin: '#ef4444', manager: '#f59e0b', collaborateur: '#3b82f6', comptable: '#8b5cf6' }

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function initials(str = '') {
  return str.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const DEFAULT_SIZES = {
  groupe: { w: 320, h: 220 },
  mini_groupe: { w: 240, h: 160 },
  societe: { w: 160, h: 70 },
  poste: { w: 150, h: 44 },
  personne: { w: 160, h: 72 },
}

const SQL_HINT = `CREATE TABLE IF NOT EXISTS org_nodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id text DEFAULT 'admin_global',
  type text NOT NULL,
  label text NOT NULL,
  color text DEFAULT '#1a5c82',
  x float DEFAULT 100, y float DEFAULT 100,
  width float DEFAULT 160, height float DEFAULT 80,
  societe_id uuid REFERENCES societes(id) ON DELETE SET NULL,
  visibility_roles text[] DEFAULT '{}',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_nodes_admin" ON org_nodes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS org_edges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id text DEFAULT 'admin_global',
  source_id uuid REFERENCES org_nodes(id) ON DELETE CASCADE,
  target_id uuid REFERENCES org_nodes(id) ON DELETE CASCADE,
  label text
);
ALTER TABLE org_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_edges_admin" ON org_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));`

// ─── Node renderers ───────────────────────────────────────────────────────────

function GroupeNode({ node, selected, onHeaderMouseDown, onDelete, onEdit }) {
  return (
    <div
      className={`org-node org-node-groupe${selected ? ' org-node--selected' : ''}`}
      style={{
        left: node.x, top: node.y,
        width: node.width, height: node.height,
        borderColor: node.color,
        backgroundColor: hexToRgba(node.color, 0.07),
      }}
    >
      <div
        className="org-node-groupe-header"
        style={{ backgroundColor: node.color }}
        onMouseDown={onHeaderMouseDown}
      >
        <span style={{ fontSize: '1rem', marginRight: 2 }}>⠿</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.label}
        </span>
        <button
          className="org-node-icon-btn"
          title="Modifier"
          onMouseDown={e => { e.stopPropagation(); onEdit(node) }}
        >✏️</button>
        <button
          className="org-node-icon-btn"
          title="Supprimer"
          onMouseDown={e => { e.stopPropagation(); onDelete(node.id) }}
        >✕</button>
      </div>
      <div className="org-node-groupe-body">
        <div className="org-node-groupe-dropzone">Zone de dépôt</div>
      </div>
    </div>
  )
}

function MiniGroupeNode({ node, selected, onHeaderMouseDown, onDelete, onEdit }) {
  const hasVisibility = node.visibility_roles && node.visibility_roles.length > 0
  return (
    <div
      className={`org-node org-node-mini${selected ? ' org-node--selected' : ''}`}
      style={{
        left: node.x, top: node.y,
        width: node.width, height: node.height,
        borderColor: node.color,
        backgroundColor: hexToRgba(node.color, 0.06),
      }}
    >
      <div
        className="org-node-mini-header"
        style={{ backgroundColor: hexToRgba(node.color, 0.18), color: node.color }}
        onMouseDown={onHeaderMouseDown}
      >
        <span style={{ fontSize: '.85rem', marginRight: 2 }}>⠿</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
          {node.label}
        </span>
        {hasVisibility && <span title="Visibilité restreinte">🔒</span>}
        <button
          className="org-node-icon-btn"
          title="Modifier"
          onMouseDown={e => { e.stopPropagation(); onEdit(node) }}
        >✏️</button>
        <button
          className="org-node-icon-btn"
          title="Supprimer"
          onMouseDown={e => { e.stopPropagation(); onDelete(node.id) }}
        >✕</button>
      </div>
      {hasVisibility && (
        <div className="org-node-mini-roles">
          {node.visibility_roles.map(r => (
            <span key={r} className="org-role-pill" style={{ backgroundColor: ROLE_COLORS[r] || '#888' }}>
              {r}
            </span>
          ))}
        </div>
      )}
      <div className="org-node-mini-body" />
    </div>
  )
}

function SocieteNode({ node, selected, onMouseDown, onDelete, onEdit }) {
  return (
    <div
      className={`org-node org-node-societe${selected ? ' org-node--selected' : ''}`}
      style={{
        left: node.x, top: node.y,
        width: node.width, height: node.height,
        borderColor: node.color,
      }}
      onMouseDown={onMouseDown}
    >
      <div className="org-node-societe-bar" style={{ backgroundColor: node.color }} />
      <div className="org-node-societe-avatar" style={{ backgroundColor: node.color }}>
        {initials(node.label)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="org-node-societe-name">{node.label}</div>
        {node.meta?.siren && (
          <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>{node.meta.siren}</div>
        )}
      </div>
      <div className="org-node-actions">
        <button className="org-node-icon-btn" title="Modifier" onMouseDown={e => { e.stopPropagation(); onEdit(node) }}>✏️</button>
        <button className="org-node-icon-btn" title="Supprimer" onMouseDown={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
      </div>
    </div>
  )
}

function PosteNode({ node, selected, onMouseDown, onDelete, onEdit }) {
  return (
    <div
      className={`org-node org-node-poste${selected ? ' org-node--selected' : ''}`}
      style={{
        left: node.x, top: node.y,
        width: node.width, height: node.height,
        borderColor: node.color,
        color: node.color,
      }}
      onMouseDown={onMouseDown}
    >
      <span style={{ fontSize: '.9rem' }}>💼</span>
      <span style={{ flex: 1, fontWeight: 600, fontSize: '.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</span>
      <button className="org-node-icon-btn" title="Modifier" onMouseDown={e => { e.stopPropagation(); onEdit(node) }}>✏️</button>
      <button className="org-node-icon-btn" title="Supprimer" onMouseDown={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
    </div>
  )
}

function PersonneNode({ node, selected, onMouseDown, onDelete, onEdit }) {
  return (
    <div
      className={`org-node org-node-personne${selected ? ' org-node--selected' : ''}`}
      style={{
        left: node.x, top: node.y,
        width: node.width, height: node.height,
        borderColor: node.color,
      }}
      onMouseDown={onMouseDown}
    >
      <div className="org-node-personne-avatar" style={{ backgroundColor: node.color }}>
        {initials(node.label)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</div>
        {node.meta?.role && (
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{node.meta.role}</div>
        )}
        {node.meta?.email && (
          <div style={{ fontSize: '.67rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.meta.email}</div>
        )}
      </div>
      <div className="org-node-actions">
        <button className="org-node-icon-btn" title="Modifier" onMouseDown={e => { e.stopPropagation(); onEdit(node) }}>✏️</button>
        <button className="org-node-icon-btn" title="Supprimer" onMouseDown={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
      </div>
    </div>
  )
}

// ─── SVG Edge layer ───────────────────────────────────────────────────────────

function EdgeLayer({ nodes, edges, onDeleteEdge }) {
  function getCenter(nodeId) {
    const n = nodes.find(n => n.id === nodeId)
    if (!n) return null
    return { x: n.x + n.width / 2, y: n.y + n.height / 2 }
  }

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <marker id="arrowhead-highlight" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>
      {edges.map(edge => {
        const src = getCenter(edge.source_id)
        const tgt = getCenter(edge.target_id)
        if (!src || !tgt) return null
        const dx = tgt.x - src.x
        const cx1 = src.x + dx * 0.4
        const cy1 = src.y
        const cx2 = tgt.x - dx * 0.4
        const cy2 = tgt.y
        const d = `M ${src.x} ${src.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${tgt.x} ${tgt.y}`
        return (
          <g key={edge.id}>
            {/* Thick invisible hit area */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth="14"
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onDeleteEdge(edge.id)}
            />
            <path
              d={d}
              stroke="#94a3b8"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
              strokeDasharray="6,3"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Add Node Modal ───────────────────────────────────────────────────────────

function AddNodeModal({ onClose, onAdd, societes }) {
  const [form, setForm] = useState({
    type: 'societe',
    label: '',
    color: '#1a5c82',
    societe_id: '',
    visibility_roles: [],
    meta_role: '',
    meta_email: '',
    meta_siren: '',
  })

  const PALETTE = ['#1a5c82','#0ea5e9','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899','#64748b','#0d1b24']

  function toggle(role) {
    setForm(f => ({
      ...f,
      visibility_roles: f.visibility_roles.includes(role)
        ? f.visibility_roles.filter(r => r !== role)
        : [...f.visibility_roles, role]
    }))
  }

  function submit(e) {
    e.preventDefault()
    if (!form.label.trim()) return
    const sz = DEFAULT_SIZES[form.type] || { w: 160, h: 80 }
    const meta = {}
    if (form.meta_role) meta.role = form.meta_role
    if (form.meta_email) meta.email = form.meta_email
    if (form.meta_siren) meta.siren = form.meta_siren
    onAdd({
      id: genId(),
      type: form.type,
      label: form.label,
      color: form.color,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: sz.w,
      height: sz.h,
      societe_id: form.societe_id || null,
      visibility_roles: form.visibility_roles,
      meta,
    })
    onClose()
  }

  return (
    <div className="org-modal-overlay" onClick={onClose}>
      <div className="org-modal" onClick={e => e.stopPropagation()}>
        <div className="org-modal-header">
          <h2>Ajouter un nœud</h2>
          <button className="org-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="org-modal-form">
          <label>Type
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="groupe">Groupe</option>
              <option value="mini_groupe">Mini-groupe</option>
              <option value="societe">Société</option>
              <option value="poste">Poste</option>
              <option value="personne">Personne</option>
            </select>
          </label>

          <label>Nom / Libellé *
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Ex: Groupe Nord, DG, Jean Dupont…"
              required
              autoFocus
            />
          </label>

          <label>Couleur
            <div className="org-color-palette">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`org-color-swatch${form.color === c ? ' org-color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }}
              />
            </div>
          </label>

          {form.type === 'mini_groupe' && (
            <label>Visibilité (rôles autorisés)
              <div className="visibility-check-grid">
                {ROLES.map(r => (
                  <label key={r} className="visibility-check-item">
                    <input
                      type="checkbox"
                      checked={form.visibility_roles.includes(r)}
                      onChange={() => toggle(r)}
                    />
                    <span style={{ color: ROLE_COLORS[r] }}>{r}</span>
                  </label>
                ))}
              </div>
            </label>
          )}

          {form.type === 'societe' && societes.length > 0 && (
            <label>Société liée (optionnel)
              <select value={form.societe_id} onChange={e => setForm(f => ({ ...f, societe_id: e.target.value }))}>
                <option value="">— Aucune —</option>
                {societes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {form.type === 'personne' && (
            <>
              <label>Poste / Rôle
                <input value={form.meta_role} onChange={e => setForm(f => ({ ...f, meta_role: e.target.value }))} placeholder="ex: Directeur Général" />
              </label>
              <label>Email
                <input type="email" value={form.meta_email} onChange={e => setForm(f => ({ ...f, meta_email: e.target.value }))} placeholder="jean@example.com" />
              </label>
            </>
          )}

          {form.type === 'societe' && (
            <label>SIREN (optionnel)
              <input value={form.meta_siren} onChange={e => setForm(f => ({ ...f, meta_siren: e.target.value }))} placeholder="123 456 789" />
            </label>
          )}

          <div className="org-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary">Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Node Modal ──────────────────────────────────────────────────────────

function EditNodeModal({ node, onClose, onSave, onDelete, societes }) {
  const [form, setForm] = useState({
    label: node.label,
    color: node.color,
    visibility_roles: node.visibility_roles || [],
    societe_id: node.societe_id || '',
    meta_role: node.meta?.role || '',
    meta_email: node.meta?.email || '',
    meta_siren: node.meta?.siren || '',
  })

  const PALETTE = ['#1a5c82','#0ea5e9','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899','#64748b','#0d1b24']

  function toggle(role) {
    setForm(f => ({
      ...f,
      visibility_roles: f.visibility_roles.includes(role)
        ? f.visibility_roles.filter(r => r !== role)
        : [...f.visibility_roles, role]
    }))
  }

  function submit(e) {
    e.preventDefault()
    const meta = { ...node.meta }
    if (form.meta_role) meta.role = form.meta_role; else delete meta.role
    if (form.meta_email) meta.email = form.meta_email; else delete meta.email
    if (form.meta_siren) meta.siren = form.meta_siren; else delete meta.siren
    onSave({
      ...node,
      label: form.label,
      color: form.color,
      visibility_roles: form.visibility_roles,
      societe_id: form.societe_id || null,
      meta,
    })
    onClose()
  }

  return (
    <div className="org-modal-overlay" onClick={onClose}>
      <div className="org-modal" onClick={e => e.stopPropagation()}>
        <div className="org-modal-header">
          <h2>Modifier — {node.type}</h2>
          <button className="org-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="org-modal-form">
          <label>Nom / Libellé *
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required autoFocus />
          </label>

          <label>Couleur
            <div className="org-color-palette">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`org-color-swatch${form.color === c ? ' org-color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }}
              />
            </div>
          </label>

          {node.type === 'mini_groupe' && (
            <label>Visibilité (rôles autorisés)
              <div className="org-visibility-hint">
                Seuls les utilisateurs ayant ces rôles pourront voir ce groupe.
              </div>
              <div className="visibility-check-grid">
                {ROLES.map(r => (
                  <label key={r} className="visibility-check-item">
                    <input type="checkbox" checked={form.visibility_roles.includes(r)} onChange={() => toggle(r)} />
                    <span style={{ color: ROLE_COLORS[r] }}>{r}</span>
                  </label>
                ))}
              </div>
            </label>
          )}

          {node.type === 'societe' && societes.length > 0 && (
            <label>Société liée
              <select value={form.societe_id} onChange={e => setForm(f => ({ ...f, societe_id: e.target.value }))}>
                <option value="">— Aucune —</option>
                {societes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {node.type === 'personne' && (
            <>
              <label>Poste / Rôle
                <input value={form.meta_role} onChange={e => setForm(f => ({ ...f, meta_role: e.target.value }))} />
              </label>
              <label>Email
                <input type="email" value={form.meta_email} onChange={e => setForm(f => ({ ...f, meta_email: e.target.value }))} />
              </label>
            </>
          )}

          {node.type === 'societe' && (
            <label>SIREN
              <input value={form.meta_siren} onChange={e => setForm(f => ({ ...f, meta_siren: e.target.value }))} />
            </label>
          )}

          <div className="org-modal-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-danger"
              onClick={() => { onDelete(node.id); onClose() }}
            >
              Supprimer
            </button>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

// Note: PropertiesPanel receives key={node.id} from parent, so React remounts it
// whenever the selected node changes. useState initializers run fresh each mount.
function PropertiesPanel({ node, onUpdate, onDelete, societes }) {
  const [label, setLabel] = useState(node.label)
  const [color, setColor] = useState(node.color)
  const [visRoles, setVisRoles] = useState(node.visibility_roles || [])
  const [societeId, setSocieteId] = useState(node.societe_id || '')

  function toggleRole(r) {
    const next = visRoles.includes(r) ? visRoles.filter(x => x !== r) : [...visRoles, r]
    setVisRoles(next)
    onUpdate({ ...node, visibility_roles: next })
  }

  function applyLabel() { onUpdate({ ...node, label }) }
  function applyColor(c) { setColor(c); onUpdate({ ...node, color: c }) }
  function applySociete(v) { setSocieteId(v); onUpdate({ ...node, societe_id: v || null }) }

  const PALETTE = ['#1a5c82','#0ea5e9','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899','#64748b','#0d1b24']
  const TYPE_LABELS = { groupe: 'Groupe', mini_groupe: 'Mini-groupe', societe: 'Société', poste: 'Poste', personne: 'Personne' }

  return (
    <div className="org-builder-panel">
      <h3>Propriétés</h3>
      <div style={{ marginBottom: '.5rem' }}>
        <span className="org-type-badge" style={{ backgroundColor: hexToRgba(node.color, 0.15), color: node.color, border: `1px solid ${hexToRgba(node.color, 0.35)}` }}>
          {TYPE_LABELS[node.type] || node.type}
        </span>
      </div>

      <div className="org-panel-field">
        <label>Libellé</label>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={applyLabel}
          onKeyDown={e => e.key === 'Enter' && applyLabel()}
        />
      </div>

      <div className="org-panel-field">
        <label>Couleur</label>
        <div className="org-color-palette" style={{ flexWrap: 'wrap' }}>
          {PALETTE.map(c => (
            <button
              key={c}
              type="button"
              className={`org-color-swatch${color === c ? ' org-color-swatch--active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => applyColor(c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => applyColor(e.target.value)}
            style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }}
          />
        </div>
      </div>

      {node.type === 'mini_groupe' && (
        <div className="org-panel-field">
          <label>Visibilité par rôle</label>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.4rem' }}>
            Laissez vide = visible par tous. Cochez pour restreindre.
          </p>
          <div className="visibility-check-grid">
            {ROLES.map(r => (
              <label key={r} className="visibility-check-item">
                <input type="checkbox" checked={visRoles.includes(r)} onChange={() => toggleRole(r)} />
                <span style={{ color: ROLE_COLORS[r], fontSize: '.78rem' }}>{r}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {node.type === 'societe' && societes.length > 0 && (
        <div className="org-panel-field">
          <label>Société liée</label>
          <select value={societeId} onChange={e => applySociete(e.target.value)}>
            <option value="">— Aucune —</option>
            {societes.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="org-panel-field">
        <label>Position</label>
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
          x: {Math.round(node.x)} · y: {Math.round(node.y)} · {Math.round(node.width)}×{Math.round(node.height)}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          className="btn-danger"
          style={{ width: '100%' }}
          onClick={() => onDelete(node.id)}
        >
          Supprimer ce nœud
        </button>
      </div>
    </div>
  )
}

// ─── SQL Hint Block ───────────────────────────────────────────────────────────

function SqlHintBlock({ onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(SQL_HINT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="org-sql-hint">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <strong style={{ fontSize: '.85rem' }}>⚠️ Tables Supabase manquantes</strong>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="org-builder-tool-btn" onClick={copy}>{copied ? '✓ Copié' : 'Copier SQL'}</button>
          <button className="org-builder-tool-btn" onClick={onClose}>Masquer</button>
        </div>
      </div>
      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
        Les données sont sauvegardées en localStorage. Pour activer la synchronisation Supabase, exécutez ce SQL dans votre projet.
      </p>
      <pre>{SQL_HINT}</pre>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrganigrammePage() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selected, setSelected] = useState(null)
  const [tool, setTool] = useState('select')
  const [connecting, setConnecting] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [societes, setSocietes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [showSql, setShowSql] = useState(false)
  const [supabaseAvail, setSupabaseAvail] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Load data on mount ──

  useEffect(() => {
    async function load() {
      setLoading(true)
      let fetchedSocietes = []
      let fetchedGroupes = []

      // Load societes & groupes
      try {
        const { data: sData } = await supabase.from('societes').select('id, name, groupe_id').order('name')
        if (sData) fetchedSocietes = sData
        const { data: gData } = await supabase.from('groupes').select('id, name, color').order('name')
        if (gData) fetchedGroupes = gData
      } catch { /* ignore network errors */ }

      setSocietes(fetchedSocietes)

      // Try loading from Supabase org_nodes / org_edges
      let loaded = false
      try {
        const { data: nData, error: nErr } = await supabase
          .from('org_nodes')
          .select('*')
          .eq('canvas_id', CANVAS_ID)

        if (nErr && nErr.code === '42P01') {
          // Table doesn't exist
          setShowSql(true)
        } else if (nData && nData.length > 0) {
          const { data: eData } = await supabase
            .from('org_edges')
            .select('*')
            .eq('canvas_id', CANVAS_ID)

          const mappedNodes = nData.map(n => ({
            id: n.id,
            type: n.type,
            label: n.label,
            color: n.color || '#1a5c82',
            x: n.x || 100,
            y: n.y || 100,
            width: n.width || DEFAULT_SIZES[n.type]?.w || 160,
            height: n.height || DEFAULT_SIZES[n.type]?.h || 80,
            societe_id: n.societe_id || null,
            visibility_roles: n.visibility_roles || [],
            meta: n.meta || {},
          }))

          setNodes(mappedNodes)
          setEdges(eData || [])
          setSupabaseAvail(true)
          loaded = true
        } else if (nData) {
          // Table exists but empty — mark Supabase as available for saving
          setSupabaseAvail(true)
        }
      } catch {
        setShowSql(true)
      }

      // Fallback: localStorage
      if (!loaded) {
        const lsNodes = localStorage.getItem('org_admin_nodes')
        const lsEdges = localStorage.getItem('org_admin_edges')
        if (lsNodes) {
          try {
            setNodes(JSON.parse(lsNodes))
            setEdges(lsEdges ? JSON.parse(lsEdges) : [])
            loaded = true
          } catch { /* ignore parse errors */ }
        }
      }

      // Default: auto-create from groupes + societes if nothing saved
      if (!loaded) {
        const defaultNodes = []
        const defaultEdges = []

        // Find SRA TEST in fetched societes
        const holdingSociete = fetchedSocietes.find(s => s.name === 'SRA TEST')
        const holdingId = 'holding_sra_test'
        const canvasCenter = 860

        // 1. Holding node (SRA TEST)
        defaultNodes.push({
          id: holdingId,
          type: 'societe',
          label: holdingSociete?.name || 'SRA TEST',
          color: '#0d1b24',
          x: canvasCenter - 120,
          y: 40,
          width: 240,
          height: 75,
          societe_id: holdingSociete?.id || null,
          visibility_roles: [],
          meta: { holding: true },
        })

        // 2. Groupe nodes in a row, and société nodes inside
        const groupeSpacing = 400
        const groupeStartX = 60
        const groupeY = 200

        fetchedGroupes.forEach((g, gi) => {
          const gx = groupeStartX + gi * groupeSpacing
          const gy = groupeY
          const societesInGroupe = fetchedSocietes.filter(s => s.groupe_id === g.id && s.name !== 'SRA TEST')
          const nodeHeight = Math.max(240, 80 + societesInGroupe.length * 90)
          const groupeNodeId = 'g_' + g.id

          defaultNodes.push({
            id: groupeNodeId,
            type: 'groupe',
            label: g.name,
            color: g.color || '#1a5c82',
            x: gx,
            y: gy,
            width: 340,
            height: nodeHeight,
            societe_id: null,
            visibility_roles: [],
            meta: {},
          })

          // Edge from holding to groupe
          defaultEdges.push({
            id: 'e_' + holdingId + '_' + groupeNodeId,
            source_id: holdingId,
            target_id: groupeNodeId,
            canvas_id: 'admin_global',
            label: '',
          })

          // Société nodes inside groupe
          societesInGroupe.forEach((s, si) => {
            defaultNodes.push({
              id: 's_' + s.id,
              type: 'societe',
              label: s.name,
              color: g.color || '#1a5c82',
              x: gx + 20,
              y: gy + 60 + si * 90,
              width: 300,
              height: 70,
              societe_id: s.id,
              visibility_roles: [],
              meta: {},
            })
          })
        })

        // Societes with no groupe (except SRA TEST)
        const orphans = fetchedSocietes.filter(s => !s.groupe_id && s.name !== 'SRA TEST')
        if (orphans.length > 0) {
          const orphanGx = groupeStartX + fetchedGroupes.length * groupeSpacing
          defaultNodes.push({
            id: 'g_orphans',
            type: 'groupe',
            label: 'Sans groupe',
            color: '#64748b',
            x: orphanGx,
            y: groupeY,
            width: 340,
            height: Math.max(200, 80 + orphans.length * 90),
            societe_id: null,
            visibility_roles: [],
            meta: {},
          })
          orphans.forEach((s, si) => {
            defaultNodes.push({
              id: 's_' + s.id,
              type: 'societe',
              label: s.name,
              color: '#64748b',
              x: orphanGx + 20,
              y: groupeY + 60 + si * 90,
              width: 300,
              height: 70,
              societe_id: s.id,
              visibility_roles: [],
              meta: {},
            })
          })
        }

        setNodes(defaultNodes)
        setEdges(defaultEdges)
        // Clear old localStorage so new layout is used
        localStorage.removeItem('org_admin_nodes')
        localStorage.removeItem('org_admin_edges')
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── Save ──

  async function saveAll() {
    setSaving(true)
    // Always save to localStorage
    localStorage.setItem('org_admin_nodes', JSON.stringify(nodes))
    localStorage.setItem('org_admin_edges', JSON.stringify(edges))

    // Try Supabase if available
    if (supabaseAvail) {
      try {
        // Delete existing
        await supabase.from('org_edges').delete().eq('canvas_id', CANVAS_ID)
        await supabase.from('org_nodes').delete().eq('canvas_id', CANVAS_ID)

        // Insert nodes
        if (nodes.length > 0) {
          await supabase.from('org_nodes').insert(
            nodes.map(n => ({
              id: n.id.length === 36 ? n.id : undefined, // keep UUID if valid
              canvas_id: CANVAS_ID,
              type: n.type,
              label: n.label,
              color: n.color,
              x: n.x, y: n.y,
              width: n.width, height: n.height,
              societe_id: n.societe_id,
              visibility_roles: n.visibility_roles,
              meta: n.meta,
            }))
          )
        }
        // Insert edges
        if (edges.length > 0) {
          await supabase.from('org_edges').insert(
            edges.map(e => ({
              canvas_id: CANVAS_ID,
              source_id: e.source_id,
              target_id: e.target_id,
              label: e.label || null,
            }))
          )
        }
      } catch { /* ignore Supabase errors */ }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Clear canvas ──

  function clearCanvas() {
    if (!window.confirm('Effacer tout le canvas ? Cette action ne peut pas être annulée.')) return
    setNodes([])
    setEdges([])
    setSelected(null)
    localStorage.removeItem('org_admin_nodes')
    localStorage.removeItem('org_admin_edges')
  }

  // ── Node operations ──

  function addNode(node) {
    setNodes(ns => [...ns, node])
    setSelected(node.id)
  }

  const deleteNode = useCallback((id) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source_id !== id && e.target_id !== id))
    setSelected(prev => prev === id ? null : prev)
  }, [])

  function updateNode(updated) {
    setNodes(ns => ns.map(n => n.id === updated.id ? updated : n))
  }

  function deleteEdge(id) {
    setEdges(es => es.filter(e => e.id !== id))
  }

  // ── Mouse events for drag + connect ──

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (tool === 'connect') {
      if (!connecting) {
        setConnecting(nodeId)
      } else if (connecting !== nodeId) {
        setEdges(es => [...es, {
          id: genId(),
          canvas_id: CANVAS_ID,
          source_id: connecting,
          target_id: nodeId,
          label: '',
        }])
        setConnecting(null)
      }
      return
    }

    // Select + drag
    setSelected(nodeId)
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const wrap = wrapRef.current
    const wrapRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 }
    const scrollLeft = wrap ? wrap.scrollLeft : 0
    const scrollTop = wrap ? wrap.scrollTop : 0
    const offsetX = (e.clientX - wrapRect.left + scrollLeft) - node.x
    const offsetY = (e.clientY - wrapRect.top + scrollTop) - node.y
    setDragging({ id: nodeId, offsetX, offsetY })
  }, [tool, connecting, nodes])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const wrap = wrapRef.current
    const wrapRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 }
    const scrollLeft = wrap ? wrap.scrollLeft : 0
    const scrollTop = wrap ? wrap.scrollTop : 0
    const x = Math.max(0, (e.clientX - wrapRect.left + scrollLeft) - dragging.offsetX)
    const y = Math.max(0, (e.clientY - wrapRect.top + scrollTop) - dragging.offsetY)
    setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x, y } : n))
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  const handleCanvasClick = useCallback((e) => {
    if (e.target === canvasRef.current || e.target === wrapRef.current) {
      setSelected(null)
      if (tool === 'connect') setConnecting(null)
    }
  }, [tool])

  // ── Key shortcuts ──

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setConnecting(null)
        setSelected(null)
        setTool('select')
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !e.target.closest('input,textarea,select')) {
        deleteNode(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, deleteNode])

  // ── Render a node ──

  function renderNode(node) {
    const isSelected = selected === node.id
    const isConnecting = connecting === node.id

    const baseMouseDown = (e) => handleNodeMouseDown(e, node.id)
    const headerMouseDown = (e) => handleNodeMouseDown(e, node.id)

    const style = isConnecting ? { outline: '2.5px dashed #f59e0b', outlineOffset: 2 } : {}

    const wrap = (children) => (
      <div key={node.id} style={{ position: 'absolute', ...style }}>
        {children}
      </div>
    )

    if (node.type === 'groupe') return wrap(
      <GroupeNode
        key={node.id}
        node={node}
        selected={isSelected}
        onHeaderMouseDown={headerMouseDown}
        onDelete={deleteNode}
        onEdit={setEditModal}
      />
    )

    if (node.type === 'mini_groupe') return wrap(
      <MiniGroupeNode
        key={node.id}
        node={node}
        selected={isSelected}
        onHeaderMouseDown={headerMouseDown}
        onDelete={deleteNode}
        onEdit={setEditModal}
      />
    )

    if (node.type === 'societe') return wrap(
      <SocieteNode
        key={node.id}
        node={node}
        selected={isSelected}
        onMouseDown={baseMouseDown}
        onDelete={deleteNode}
        onEdit={setEditModal}
      />
    )

    if (node.type === 'poste') return wrap(
      <PosteNode
        key={node.id}
        node={node}
        selected={isSelected}
        onMouseDown={baseMouseDown}
        onDelete={deleteNode}
        onEdit={setEditModal}
      />
    )

    if (node.type === 'personne') return wrap(
      <PersonneNode
        key={node.id}
        node={node}
        selected={isSelected}
        onMouseDown={baseMouseDown}
        onDelete={deleteNode}
        onEdit={setEditModal}
      />
    )

    return null
  }

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null

  if (loading) return (
    <Spinner />
  )

  return (
    <div className="org-builder-layout">

      {/* ── Toolbar ── */}
      <div className="org-builder-toolbar">
        <button className="org-builder-tool-btn" onClick={() => navigate('/admin')}>
          ← Retour
        </button>
        <div className="org-builder-toolbar-sep" />
        <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)' }}>
          Organigramme Admin
        </span>
        <div className="org-builder-toolbar-sep" />

        {/* Tool selection */}
        <button
          className={`org-builder-tool-btn${tool === 'select' ? ' org-builder-tool-btn--active' : ''}`}
          onClick={() => { setTool('select'); setConnecting(null) }}
          title="Sélectionner & déplacer (S)"
        >
          ✋ Sélect.
        </button>
        <button
          className={`org-builder-tool-btn${tool === 'connect' ? ' org-builder-tool-btn--active' : ''}${connecting ? ' org-builder-tool-btn--connecting' : ''}`}
          onClick={() => { setTool(t => t === 'connect' ? 'select' : 'connect'); setConnecting(null) }}
          title="Connecter deux nœuds (C)"
        >
          {connecting ? '🔗 Cliquez la cible…' : '↔ Connecter'}
        </button>

        <div className="org-builder-toolbar-sep" />

        {/* Add node buttons */}
        <button
          className="org-builder-tool-btn"
          style={{ borderColor: '#1a5c82', color: '#1a5c82' }}
          onClick={() => setShowAddModal(true)}
          title="Ajouter un nœud"
        >
          + Nœud
        </button>
        <button className="org-builder-tool-btn" style={{ borderColor: '#10b981', color: '#10b981' }}
          onClick={() => addNode({ id: genId(), type: 'groupe', label: 'Nouveau groupe', color: '#10b981', x: 60, y: 60, width: 340, height: 240, societe_id: null, visibility_roles: [], meta: {} })}>
          + Groupe
        </button>
        <button className="org-builder-tool-btn" style={{ borderColor: '#0ea5e9', color: '#0ea5e9' }}
          onClick={() => addNode({ id: genId(), type: 'mini_groupe', label: 'Mini-groupe', color: '#0ea5e9', x: 80, y: 80, width: 240, height: 160, societe_id: null, visibility_roles: [], meta: {} })}>
          + Mini-groupe
        </button>
        <button className="org-builder-tool-btn" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
          onClick={() => addNode({ id: genId(), type: 'societe', label: 'Nouvelle société', color: '#8b5cf6', x: 100, y: 100, width: DEFAULT_SIZES.societe.w, height: DEFAULT_SIZES.societe.h, societe_id: null, visibility_roles: [], meta: {} })}>
          + Société
        </button>
        <button className="org-builder-tool-btn" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
          onClick={() => addNode({ id: genId(), type: 'poste', label: 'Nouveau poste', color: '#f59e0b', x: 120, y: 120, width: DEFAULT_SIZES.poste.w, height: DEFAULT_SIZES.poste.h, societe_id: null, visibility_roles: [], meta: {} })}>
          + Poste
        </button>
        <button className="org-builder-tool-btn" style={{ borderColor: '#ec4899', color: '#ec4899' }}
          onClick={() => addNode({ id: genId(), type: 'personne', label: 'Nouvelle personne', color: '#ec4899', x: 140, y: 140, width: DEFAULT_SIZES.personne.w, height: DEFAULT_SIZES.personne.h, societe_id: null, visibility_roles: [], meta: {} })}>
          + Personne
        </button>

        <div className="org-builder-toolbar-sep" />

        <button
          className="org-builder-tool-btn"
          style={{ color: saving ? '#888' : 'var(--success)', borderColor: saving ? '#ddd' : 'var(--success)' }}
          onClick={saveAll}
          disabled={saving}
          title="Sauvegarder (Ctrl+S)"
        >
          {saving ? '⏳ Sauvegarde…' : saved ? '✓ Sauvegardé' : '💾 Sauvegarder'}
        </button>
        <button
          className="org-builder-tool-btn"
          style={{ color: '#ef4444', borderColor: '#ef4444' }}
          onClick={clearCanvas}
          title="Effacer tout"
        >
          🗑 Effacer
        </button>

        {!supabaseAvail && (
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: '.5rem' }}>
            💾 localStorage
          </span>
        )}
        {supabaseAvail && (
          <span style={{ fontSize: '.72rem', color: 'var(--success)', marginLeft: '.5rem' }}>
            ✓ Supabase
          </span>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--text-muted)' }}>
          {nodes.length} nœud{nodes.length !== 1 ? 's' : ''} · {edges.length} connexion{edges.length !== 1 ? 's' : ''}
          {connecting && <span style={{ marginLeft: '.5rem', color: '#f59e0b', fontWeight: 700 }}>— Cliquez un nœud cible ou Échap pour annuler</span>}
        </div>
      </div>

      {/* ── SQL hint ── */}
      {showSql && <SqlHintBlock onClose={() => setShowSql(false)} />}

      {/* ── Main area: canvas + panel ── */}
      <div className="org-builder-main">

        {/* Canvas */}
        <div
          ref={wrapRef}
          className="org-builder-canvas-wrap"
          style={{ cursor: tool === 'connect' ? 'crosshair' : 'default' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div ref={canvasRef} className="org-builder-canvas">
            {/* SVG edge layer */}
            <EdgeLayer
              nodes={nodes}
              edges={edges}
              onDeleteEdge={deleteEdge}
            />
            {/* Nodes */}
            {nodes.map(node => renderNode(node))}
          </div>
        </div>

        {/* Properties panel */}
        {selectedNode ? (
          <PropertiesPanel
            key={selectedNode.id}
            node={selectedNode}
            onUpdate={updateNode}
            onDelete={deleteNode}
            societes={societes}
          />
        ) : (
          <div className="org-builder-panel">
            <h3>Propriétés</h3>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sélectionnez un nœud pour modifier ses propriétés.
            </p>
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h3>Aide rapide</h3>
              <ul style={{ fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 2, paddingLeft: '1rem' }}>
                <li>Cliquez un nœud pour le sélectionner</li>
                <li>Glissez depuis l'en-tête pour déplacer</li>
                <li>Outil ↔ : cliquez source puis cible</li>
                <li>Cliquez une connexion pour la supprimer</li>
                <li>Suppr. ou Backspace : efface le nœud sélectionné</li>
                <li>Échap : annuler connexion / désélectionner</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddNodeModal
          onClose={() => setShowAddModal(false)}
          onAdd={addNode}
          societes={societes}
        />
      )}
      {editModal && (
        <EditNodeModal
          node={editModal}
          onClose={() => setEditModal(null)}
          onSave={n => { updateNode(n); setEditModal(null) }}
          onDelete={deleteNode}
          societes={societes}
        />
      )}
    </div>
  )
}
