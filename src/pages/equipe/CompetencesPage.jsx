import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import useSortableTable from '../../hooks/useSortableTable'
import SortableHeader from '../../components/SortableHeader'
import Spinner from '../../components/Spinner'

const LEVELS = [
  { value: 0, label: 'Non évalué', color: '#e2e8f0', emoji: '—' },
  { value: 1, label: 'Débutant',   color: '#fca5a5', emoji: '🔴' },
  { value: 2, label: 'Initié',     color: '#fdba74', emoji: '🟠' },
  { value: 3, label: 'Confirmé',   color: '#fde047', emoji: '🟡' },
  { value: 4, label: 'Avancé',     color: '#86efac', emoji: '🟢' },
  { value: 5, label: 'Expert',     color: '#67e8f9', emoji: '💎' },
]

const CATEGORIES = ['Technique', 'Métier', 'Management', 'Outils', 'Langues', 'Autre']

function LevelBar({ level, onClick }) {
  return (
    <div className="comp-level-bar" onClick={onClick} title={LEVELS[level]?.label || '—'}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`comp-level-dot ${i <= level ? 'comp-level-dot--filled' : ''}`}
          style={{ background: i <= level ? LEVELS[level]?.color : undefined }}
        />
      ))}
    </div>
  )
}

function LevelPicker({ value, onChange }) {
  return (
    <div className="comp-level-picker">
      {LEVELS.map(l => (
        <button
          key={l.value}
          className={`comp-level-option ${value === l.value ? 'comp-level-option--active' : ''}`}
          style={value === l.value ? { borderColor: l.color, background: l.color + '22' } : {}}
          onClick={() => onChange(l.value)}
          type="button"
        >
          <span>{l.emoji}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function CompetencesPage() {
  const [competences, setCompetences] = useState([])  // { id, nom, categorie }
  const [evaluations, setEvaluations] = useState([])   // { id, competence_id, equipe_id, niveau }
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [view, setView] = useState('matrix')  // matrix | list

  const [showCompModal, setShowCompModal] = useState(false)
  const [editingComp, setEditingComp] = useState(null)
  const [compForm, setCompForm] = useState({ nom: '', categorie: 'Technique' })
  const [saving, setSaving] = useState(false)

  const [showEvalModal, setShowEvalModal] = useState(false)
  const [evalTarget, setEvalTarget] = useState(null) // { competence_id, equipe_id }
  const [evalLevel, setEvalLevel] = useState(0)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setMigrationNeeded(false)

    const [compRes, evalRes, eqRes] = await Promise.all([
      supabase.from('competences').select('*').order('categorie').order('nom'),
      supabase.from('competence_evaluations').select('*'),
      sid
        ? supabase.from('equipe').select('id, nom, prenom, poste').eq('societe_id', sid).order('nom').limit(50)
        : supabase.from('equipe').select('id, nom, prenom, poste').order('nom').limit(50),
    ])

    if (compRes.error?.code === '42P01' || compRes.error?.message?.includes('competences')) {
      setMigrationNeeded(true)
      setLoading(false)
      return
    }

    setCompetences(compRes.data || [])
    setEvaluations(evalRes.data || [])
    setEquipe(eqRes.data || [])
    setLoading(false)
  }

  function getLevel(compId, eqId) {
    return evaluations.find(e => e.competence_id === compId && e.equipe_id === eqId)?.niveau || 0
  }

  function avgLevel(compId) {
    const evals = evaluations.filter(e => e.competence_id === compId && e.niveau > 0)
    if (evals.length === 0) return 0
    return Math.round(evals.reduce((s, e) => s + e.niveau, 0) / evals.length * 10) / 10
  }

  function memberAvg(eqId) {
    const evals = evaluations.filter(e => e.equipe_id === eqId && e.niveau > 0)
    if (evals.length === 0) return 0
    return Math.round(evals.reduce((s, e) => s + e.niveau, 0) / evals.length * 10) / 10
  }

  // Filters
  const filteredComps = useMemo(() => {
    const q = search.toLowerCase()
    return competences.filter(c => {
      if (q && !c.nom.toLowerCase().includes(q)) return false
      if (filterCat && c.categorie !== filterCat) return false
      return true
    })
  }, [competences, search, filterCat])

  const { sortedData: sortedComps, sortKey, sortDir, requestSort } = useSortableTable(filteredComps)

  // CRUD compétence
  async function handleSaveComp(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { nom: compForm.nom.trim(), categorie: compForm.categorie }
    if (editingComp) {
      await supabase.from('competences').update(payload).eq('id', editingComp.id)
    } else {
      await supabase.from('competences').insert(payload)
    }
    setSaving(false)
    setShowCompModal(false)
    setEditingComp(null)
    setCompForm({ nom: '', categorie: 'Technique' })
    fetchAll()
  }

  async function handleDeleteComp(id) {
    await supabase.from('competences').delete().eq('id', id)
    fetchAll()
  }

  // Save évaluation
  async function handleSaveEval() {
    if (!evalTarget) return
    const existing = evaluations.find(
      e => e.competence_id === evalTarget.competence_id && e.equipe_id === evalTarget.equipe_id
    )
    if (existing) {
      if (evalLevel === 0) {
        await supabase.from('competence_evaluations').delete().eq('id', existing.id)
      } else {
        await supabase.from('competence_evaluations').update({ niveau: evalLevel }).eq('id', existing.id)
      }
    } else if (evalLevel > 0) {
      await supabase.from('competence_evaluations').insert({
        competence_id: evalTarget.competence_id,
        equipe_id: evalTarget.equipe_id,
        niveau: evalLevel})
    }
    setShowEvalModal(false)
    setEvalTarget(null)
    fetchAll()
  }

  function openEval(compId, eqId) {
    setEvalTarget({ competence_id: compId, equipe_id: eqId })
    setEvalLevel(getLevel(compId, eqId))
    setShowEvalModal(true)
  }

  // KPIs
  const kpiComps = competences.length
  const kpiEvals = evaluations.filter(e => e.niveau > 0).length
  const kpiAvg = evaluations.length > 0
    ? Math.round(evaluations.filter(e => e.niveau > 0).reduce((s, e) => s + e.niveau, 0) / evaluations.filter(e => e.niveau > 0).length * 10) / 10
    : 0

  const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS competences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nom text NOT NULL,
  categorie text DEFAULT 'Technique'
);
CREATE TABLE IF NOT EXISTS competence_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  competence_id uuid REFERENCES competences(id) ON DELETE CASCADE,
  equipe_id uuid REFERENCES equipe(id) ON DELETE CASCADE,
  niveau integer DEFAULT 0 CHECK (niveau >= 0 AND niveau <= 5),
  UNIQUE(competence_id, equipe_id)
);
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE competence_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_all" ON competences FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "eval_all" ON competence_evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));`

  return (
    <div className="admin-page" style={{ maxWidth: 'none' }}>
      <div className="admin-page-header">
        <div>
          <h1>Compétences</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            Matrice de compétences de l'équipe
            {selectedSociete && (
              <span style={{ marginLeft: '.5rem', padding: '.1rem .5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 4, fontSize: '.8rem', fontWeight: 500 }}>
                {selectedSociete.name}
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingComp(null); setCompForm({ nom: '', categorie: 'Technique' }); setShowCompModal(true) }}>
          + Nouvelle compétence
        </button>
      </div>

      {migrationNeeded && (
        <div style={{ margin: '0 0 1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '.5rem' }}>
            Tables <code>competences</code> introuvables — lancez cette migration SQL dans Supabase :
          </p>
          <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '1rem', fontSize: '.8rem', overflowX: 'auto', lineHeight: 1.6 }}>{SQL_MIGRATION}</pre>
          <button className="btn-secondary" style={{ marginTop: '.75rem' }}
            onClick={() => navigator.clipboard.writeText(SQL_MIGRATION)}>Copier le SQL</button>
        </div>
      )}

      {!migrationNeeded && (
        <>
          {/* KPIs */}
          <div className="produit-kpi-bar">
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{kpiComps}</span>
              <span className="produit-kpi-label">Compétences</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: 'var(--primary)' }}>{kpiEvals}</span>
              <span className="produit-kpi-label">Évaluations</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value" style={{ color: '#16a34a' }}>{kpiAvg}/5</span>
              <span className="produit-kpi-label">Niveau moyen</span>
            </div>
            <div className="produit-kpi-chip">
              <span className="produit-kpi-value">{equipe.length}</span>
              <span className="produit-kpi-label">Collaborateurs</span>
            </div>
          </div>

          {/* Filtres */}
          <div className="table-toolbar">
            <input className="table-search" type="text" placeholder="Rechercher une compétence..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="table-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Matrice */}
          {loading ? <Spinner /> : (
            <div style={{ overflowX: 'auto', marginTop: '.5rem' }}>
              <table className="users-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <SortableHeader label="Compétence" field="nom" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 2, minWidth: 180 }} />
                    <SortableHeader label="Cat." field="categorie" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} style={{ minWidth: 80 }} />
                    <th style={{ minWidth: 60, textAlign: 'center' }}>Moy.</th>
                    {equipe.slice(0, 15).map(e => (
                      <th key={e.id} style={{ textAlign: 'center', minWidth: 70, fontSize: '.72rem', whiteSpace: 'nowrap' }}>
                        {e.prenom?.[0]}{e.nom?.[0]}
                        <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>{e.prenom}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedComps.map(comp => (
                    <tr key={comp.id}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, fontWeight: 500 }}>
                        {comp.nom}
                        <button style={{ marginLeft: '.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', color: 'var(--text-muted)' }}
                          onClick={() => { setEditingComp(comp); setCompForm({ nom: comp.nom, categorie: comp.categorie }); setShowCompModal(true) }}>✏</button>
                      </td>
                      <td>
                        <span style={{ fontSize: '.75rem', padding: '.1rem .4rem', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                          {comp.categorie}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: avgLevel(comp.id) >= 4 ? '#16a34a' : avgLevel(comp.id) >= 2 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {avgLevel(comp.id) > 0 ? avgLevel(comp.id) : '—'}
                      </td>
                      {equipe.slice(0, 15).map(e => {
                        const level = getLevel(comp.id, e.id)
                        return (
                          <td key={e.id} style={{ textAlign: 'center', cursor: 'pointer', padding: '.3rem' }}
                            onClick={() => openEval(comp.id, e.id)}>
                            <LevelBar level={level} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {sortedComps.length === 0 && (
                    <tr>
                      <td colSpan={3 + Math.min(equipe.length, 15)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucune compétence définie.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Légende */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '.78rem' }}>
                {LEVELS.slice(1).map(l => (
                  <div key={l.value} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                    <span>{l.value} — {l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal compétence */}
      {showCompModal && (
        <div className="modal-overlay" onClick={() => setShowCompModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingComp ? 'Modifier la compétence' : 'Nouvelle compétence'}</h2>
              <button className="modal-close" onClick={() => setShowCompModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveComp}>
              <div className="field">
                <label>Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={compForm.nom} required autoFocus
                  onChange={e => setCompForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : React, Gestion de projet, Anglais..." />
              </div>
              <div className="field">
                <label>Catégorie</label>
                <select value={compForm.categorie} onChange={e => setCompForm(f => ({ ...f, categorie: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCompModal(false)}>Annuler</button>
                {editingComp && (
                  <button type="button" style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, padding: '.4rem .8rem', cursor: 'pointer', fontSize: '.85rem' }}
                    onClick={() => { handleDeleteComp(editingComp.id); setShowCompModal(false) }}>Supprimer</button>
                )}
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '...' : (editingComp ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal évaluation */}
      {showEvalModal && evalTarget && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Évaluer</h2>
              <button className="modal-close" onClick={() => setShowEvalModal(false)}>✕</button>
            </div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '.2rem' }}>
                {competences.find(c => c.id === evalTarget.competence_id)?.nom}
              </p>
              <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {(() => { const e = equipe.find(e => e.id === evalTarget.equipe_id); return e ? `${e.prenom} ${e.nom}` : '—' })()}
              </p>
              <LevelPicker value={evalLevel} onChange={setEvalLevel} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowEvalModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSaveEval}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
