import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase.js'

const PRIORITY = {
  high:   { label: 'High',   bg: '#FCEBEB', color: '#A32D2D' },
  medium: { label: 'Medium', bg: '#FAEEDA', color: '#633806' },
  low:    { label: 'Low',    bg: '#F1EFE8', color: '#5F5E5A' },
}

const DECISION = {
  apply: { label: 'Apply', bg: '#EAF3DE', color: '#27500A', icon: 'ti-check' },
  dont_apply_now: { label: "Don't apply now", bg: '#F1EFE8', color: '#5F5E5A', icon: 'ti-clock-pause' },
}

function norm(v) { return (v || '').toLowerCase().trim() }
function fmt(d) {
  if (!d) return 'Not applied yet'
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

function AddCompanyModal({ existingCompanies, verticals, onClose, onSaved }) {
  const [mode, setMode] = useState('existing')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [customName, setCustomName] = useState('')
  const [priority, setPriority] = useState('high')
  const [verticalId, setVerticalId] = useState(verticals[0]?.id || '')
  const [newVertical, setNewVertical] = useState('')
  const [decision, setDecision] = useState('apply')
  const [lastAppliedDate, setLastAppliedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    const name = mode === 'existing' ? selectedCompany : customName.trim()
    if (!name) { setError('Company name is required'); return }
    setSaving(true)
    setError(null)

    let finalVerticalId = verticalId || null
    if (newVertical.trim()) {
      const { data: v, error: ve } = await supabase
        .from('company_verticals')
        .upsert({ name: newVertical.trim() }, { onConflict: 'name' })
        .select()
        .single()
      if (ve) { setError(ve.message); setSaving(false); return }
      finalVerticalId = v.id
    }

    const { error: e } = await supabase.from('target_companies').insert({
      name,
      priority,
      vertical_id: finalVerticalId,
      application_decision: decision,
      last_applied_date: lastAppliedDate || null,
      notes: notes || null,
    })
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-title">Add target company</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[{ v: 'existing', l: 'Pick from existing' }, { v: 'new', l: 'Add new' }].map(o => (
            <button key={o.v} className={`pill${mode === o.v ? ' active' : ''}`} onClick={() => setMode(o.v)}>{o.l}</button>
          ))}
        </div>

        <div className="form-grid">
          {mode === 'existing' ? (
            <div className="form-group full">
              <label>Company</label>
              <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                <option value="">— select —</option>
                {existingCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group full">
              <label>Company name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Capital One" />
            </div>
          )}

          <div className="form-group">
            <label>Vertical</label>
            <select value={verticalId} onChange={e => setVerticalId(e.target.value)} disabled={!!newVertical.trim()}>
              <option value="">Unassigned</option>
              {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Create new vertical</label>
            <input value={newVertical} onChange={e => setNewVertical(e.target.value)} placeholder="e.g. Tech" />
          </div>

          <div className="form-group full">
            <label>Priority</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {Object.entries(PRIORITY).map(([k, v]) => (
                <button
                  key={k}
                  className="pill"
                  style={priority === k ? { background: v.bg, color: v.color, borderColor: v.color } : {}}
                  onClick={() => setPriority(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group full">
            <label>Application decision</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {Object.entries(DECISION).map(([k, v]) => (
                <button
                  key={k}
                  className="pill"
                  style={decision === k ? { background: v.bg, color: v.color, borderColor: v.color } : {}}
                  onClick={() => setDecision(k)}
                >
                  <i className={'ti ' + v.icon} style={{ fontSize: 12 }} /> {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group full">
            <label>Last applied date — manual</label>
            <input type="date" value={lastAppliedDate} onChange={e => setLastAppliedDate(e.target.value)} />
          </div>

          <div className="form-group full">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Why this company, target role, application notes..." />
          </div>
        </div>

        {error && <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 10 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add company'}</button>
        </div>
      </div>
    </div>
  )
}

const PRIORITY_CYCLE = ['high', 'medium', 'low']
const PRIORITY_DOT = { high: '#E24B4A', medium: '#EF9F27', low: '#639922' }

function TargetCompanyCard({ company, verticals, onUpdate, onDelete, compact }) {
  const hasContacts = company.coContacts.length > 0
  const total = company.coContacts.length
  const securedPct = total > 0 ? Math.round((company.secured.length / total) * 100) : 0
  const decision = company.application_decision || 'apply'
  const isApply = decision === 'apply'
  const isDont = decision === 'dont_apply_now'
  const priority = company.priority || 'medium'

  async function update(fields) {
    await supabase.from('target_companies').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', company.id)
    onUpdate()
  }

  function cyclePriority() {
    const idx = PRIORITY_CYCLE.indexOf(priority)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    update({ priority: next })
  }

  const cardBg = isApply ? '#EAF3DE' : 'var(--surface)'
  const cardBorder = isApply ? '0.5px solid #97C459' : !hasContacts ? '0.5px solid #F09595' : '0.5px solid var(--border)'

  if (compact) {
    return (
      <div
        onClick={() => onDelete && null}
        style={{ padding: '8px 10px', border: cardBorder, background: cardBg, borderRadius: 'var(--radius)', marginBottom: 7, opacity: isDont ? 0.62 : 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <button
            onClick={cyclePriority}
            title={'Priority: ' + priority}
            aria-label={'Priority ' + priority}
            style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0, background: PRIORITY_DOT[priority] }}
          />
          <span style={{ fontWeight: 600, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
          {company.activeInterview && (
            <i className="ti ti-briefcase" style={{ fontSize: 11, color: '#0C447C', flexShrink: 0 }} title="Active interview" />
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>
            {company.coContacts.length} · {company.secured.length} ref
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => update({ application_decision: 'apply' })}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, border: '0.5px solid ' + (isApply ? '#639922' : '#97C459'), background: isApply ? '#639922' : 'var(--surface)', color: isApply ? '#fff' : '#27500A' }}
          >
            <i className="ti ti-check" style={{ fontSize: 10 }} /> Apply
          </button>
          <button
            onClick={() => update({ application_decision: 'dont_apply_now' })}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, border: '0.5px solid ' + (isDont ? '#888780' : 'var(--border)'), background: isDont ? '#888780' : 'var(--surface)', color: isDont ? '#fff' : 'var(--text2)' }}
          >
            Don't
          </button>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 5px' }} onClick={() => onDelete(company)}>
            <i className="ti ti-trash" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '10px 12px', border: cardBorder, background: cardBg, marginBottom: 8, opacity: isDont ? 0.62 : 1 }}>
      {/* Row 1: priority dot + name + vertical + interview + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <button
          onClick={cyclePriority}
          title={'Priority: ' + priority + ' (click to change)'}
          aria-label={'Priority ' + priority}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '2px 8px 2px 6px', borderRadius: 10, cursor: 'pointer',
            border: '0.5px solid ' + PRIORITY_DOT[priority],
            background: 'transparent',
            fontSize: 10, fontWeight: 600, color: PRIORITY_DOT[priority], textTransform: 'capitalize',
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRIORITY_DOT[priority] }} />
          {priority}
        </button>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
        {company.vertical && (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9, background: '#EEEDFE', color: '#3C3489', fontWeight: 500, flexShrink: 0 }}>{company.vertical.name}</span>
        )}
        {company.activeInterview ? (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9, background: '#E6F1FB', color: '#0C447C', fontWeight: 500, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-briefcase" style={{ fontSize: 10 }} /> Active interview
          </span>
        ) : (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9, background: 'var(--surface2)', color: 'var(--text3)', flexShrink: 0 }}>No interview</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}><b style={{ color: 'var(--text)', fontWeight: 600 }}>{total}</b> contact{total !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}><b style={{ color: company.secured.length > 0 ? '#27500A' : 'var(--text)', fontWeight: 600 }}>{company.secured.length}</b> ref</span>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 5px' }} onClick={() => onDelete(company)}><i className="ti ti-trash" style={{ fontSize: 13 }} /></button>
        </div>
      </div>

      {/* Row 2: shrunk inline controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <select
          value={company.vertical_id || ''}
          onChange={e => update({ vertical_id: e.target.value || null })}
          style={{ fontSize: 11, padding: '3px 6px', height: 'auto', width: 'auto', maxWidth: 130 }}
        >
          <option value="">Unassigned</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>

        {/* Apply / Don't apply toggle */}
        <button
          onClick={() => update({ application_decision: 'apply' })}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 500,
            border: '0.5px solid ' + (isApply ? '#639922' : '#97C459'),
            background: isApply ? '#639922' : 'var(--surface)',
            color: isApply ? '#fff' : '#27500A',
          }}
        >
          <i className="ti ti-check" style={{ fontSize: 11 }} /> Apply
        </button>
        <button
          onClick={() => update({ application_decision: 'dont_apply_now' })}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 500,
            border: '0.5px solid ' + (isDont ? '#888780' : 'var(--border)'),
            background: isDont ? '#888780' : 'var(--surface)',
            color: isDont ? '#fff' : 'var(--text2)',
          }}
        >
          <i className="ti ti-x" style={{ fontSize: 11 }} /> Don't apply
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>
          <i className="ti ti-calendar" style={{ fontSize: 11 }} />
          <input
            type="date"
            value={company.last_applied_date || ''}
            onChange={e => update({ last_applied_date: e.target.value || null })}
            style={{ fontSize: 11, padding: '3px 5px', height: 'auto', width: 'auto' }}
          />
        </div>
      </div>

      {company.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 7, fontStyle: 'italic' }}>{company.notes}</div>}

      {/* Contact chips / coverage */}
      {total > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden', marginBottom: 7 }}>
            <div style={{ width: securedPct + '%', height: '100%', background: securedPct > 0 ? '#639922' : 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {company.coContacts.slice(0, 3).map(c => (
              <span key={c.id} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: isApply ? 'rgba(255,255,255,0.6)' : 'var(--surface2)', color: 'var(--text2)' }}>
                {c.name || 'Unnamed'}{c.referral_status ? ' · ' + c.referral_status : ''}
              </span>
            ))}
            {company.coContacts.length > 3 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>+{company.coContacts.length - 3} more</span>}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#A32D2D', display: 'flex', gap: 5, alignItems: 'center', marginTop: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} /> No referral coverage yet
        </div>
      )}
    </div>
  )
}

export default function TargetCompaniesPage() {
  const [targets, setTargets] = useState([])
  const [contacts, setContacts] = useState([])
  const [interviews, setInterviews] = useState([])
  const [verticals, setVerticals] = useState([])
  const [existingCompanies, setExistingCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('kanban')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [newVertical, setNewVertical] = useState('')
  const [creatingVertical, setCreatingVertical] = useState(false)
  const [showVerticalModal, setShowVerticalModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: c }, { data: cos }, { data: ivs }, { data: vs }] = await Promise.all([
      supabase.from('target_companies').select('*').order('priority').order('name'),
      supabase.from('contacts').select('id, name, company, referral_status, is_active'),
      supabase.from('companies').select('name').order('name'),
      supabase.from('interviews').select('id, company, role, status').in('status', ['coming_up', 'ongoing']),
      supabase.from('company_verticals').select('*').order('name'),
    ])
    setTargets(t || [])
    setContacts(c || [])
    setExistingCompanies((cos || []).map(c => c.name))
    setInterviews(ivs || [])
    setVerticals(vs || [])
    setLoading(false)
  }

  async function createVertical() {
    const name = newVertical.trim()
    if (!name) return
    setCreatingVertical(true)
    await supabase.from('company_verticals').upsert({ name }, { onConflict: 'name' })
    setNewVertical('')
    setCreatingVertical(false)
    setShowVerticalModal(false)
    load()
  }

  async function deleteTarget(t) {
    await supabase.from('target_companies').delete().eq('id', t.id)
    setDeleteConfirm(null)
    load()
  }

  const enriched = useMemo(() => {
    return targets.map(t => {
      const coContacts = contacts.filter(c => norm(c.company) === norm(t.name))
      const active = coContacts.filter(c => c.is_active)
      const inactive = coContacts.filter(c => !c.is_active)
      const secured = coContacts.filter(c => norm(c.referral_status).includes('got referral'))
      const advocates = coContacts.filter(c => norm(c.referral_status).includes('strong advocate'))
      const activeInterview = interviews.find(i => norm(i.company) === norm(t.name)) || null
      const vertical = verticals.find(v => v.id === t.vertical_id) || null
      return { ...t, coContacts, active, inactive, secured, advocates, activeInterview, vertical }
    })
  }, [targets, contacts, interviews, verticals])

  const stats = useMemo(() => ({
    total: targets.length,
    totalContacts: contacts.filter(c => enriched.some(e => norm(e.name) === norm(c.company))).length,
    withContacts: enriched.filter(e => e.coContacts.length > 0).length,
    noCoverage: enriched.filter(e => e.coContacts.length === 0).length,
    activeInterviews: enriched.filter(e => e.activeInterview).length,
    applyNow: enriched.filter(e => (e.application_decision || 'apply') === 'apply').length,
  }), [enriched, targets, contacts])

  const filtered = useMemo(() => {
    let list = [...enriched]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(q) || (e.vertical?.name || '').toLowerCase().includes(q))
    }
    if (filter === 'has') list = list.filter(e => e.coContacts.length > 0)
    if (filter === 'none') list = list.filter(e => e.coContacts.length === 0)
    if (filter === 'high') list = list.filter(e => e.priority === 'high')
    if (filter === 'interview') list = list.filter(e => e.activeInterview)
    if (filter === 'apply') list = list.filter(e => (e.application_decision || 'apply') === 'apply')
    if (filter === 'dont') list = list.filter(e => e.application_decision === 'dont_apply_now')
    return list
  }, [enriched, search, filter])

  const kanbanColumns = useMemo(() => {
    const columns = verticals.map(v => ({ id: v.id, name: v.name, cards: filtered.filter(e => e.vertical_id === v.id) }))
    const unassigned = filtered.filter(e => !e.vertical_id)
    if (unassigned.length) columns.push({ id: 'unassigned', name: 'Unassigned', cards: unassigned })
    return columns
  }, [verticals, filtered])

  if (loading) return <div className="loading">Loading target companies…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title"><i className="ti ti-target" style={{ marginRight: 8, fontSize: 20 }} />Target companies</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
            {[{ id: 'kanban', icon: 'ti-layout-kanban', label: 'By vertical' }, { id: 'list', icon: 'ti-list', label: 'List' }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v.id ? 'var(--surface)' : 'transparent', color: view === v.id ? 'var(--text)' : 'var(--text3)', fontWeight: view === v.id ? 500 : 400, fontSize: 12, boxShadow: view === v.id ? '0 0 0 0.5px var(--border-strong)' : 'none' }}>
                <i className={'ti ' + v.icon} style={{ fontSize: 14 }} /> {v.label}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => setShowVerticalModal(true)}><i className="ti ti-plus" /> Add vertical</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="ti ti-plus" /> Add company</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Target companies</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Apply now</div><div className="stat-value success">{stats.applyNow}</div></div>
        <div className="stat-card"><div className="stat-label">Active interviews</div><div className="stat-value info">{stats.activeInterviews}</div></div>
        <div className="stat-card"><div className="stat-label">No coverage</div><div className="stat-value danger">{stats.noCoverage}</div></div>
        <div className="stat-card"><div className="stat-label">Total contacts</div><div className="stat-value">{stats.totalContacts}</div></div>
      </div>

      {stats.noCoverage > 0 && (
        <div className="insight" style={{ background: '#FCEBEB', color: '#A32D2D' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
          {stats.noCoverage} target {stats.noCoverage === 1 ? 'company has' : 'companies have'} no referral contacts yet — prioritize building connections there.
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <input className="search-input" placeholder="Search company or vertical…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="pill-group">
          {[
            { v: 'all', l: 'All' }, { v: 'apply', l: 'Apply' }, { v: 'dont', l: "Don't apply now" },
            { v: 'interview', l: 'Active interview' }, { v: 'has', l: 'Has contacts' }, { v: 'none', l: 'No coverage' }, { v: 'high', l: 'High priority' },
          ].map(p => <button key={p.v} className={`pill${filter === p.v ? ' active' : ''}`} onClick={() => setFilter(p.v)}>{p.l}</button>)}
        </div>
      </div>

      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 10 }}>
          {kanbanColumns.map(col => (
            <div key={col.id} style={{ minWidth: 240, width: 240, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '2px solid #378ADD' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{col.name}</span>
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: '#E6F1FB', color: '#0C447C', fontWeight: 600 }}>{col.cards.length}</span>
              </div>
              <div style={{ padding: 8, minHeight: 120 }}>
                {col.cards.length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 8px', textAlign: 'center' }}>No companies here yet</div>}
                {col.cards.map(e => <TargetCompanyCard key={e.id} company={e} verticals={verticals} onUpdate={load} onDelete={setDeleteConfirm} compact />)}
              </div>
            </div>
          ))}

        </div>
      )}

      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.length === 0 && <div className="empty">No target companies match your filters.</div>}
          {filtered.map(e => <TargetCompanyCard key={e.id} company={e} verticals={verticals} onUpdate={load} onDelete={setDeleteConfirm} />)}
        </div>
      )}

      {showModal && <AddCompanyModal existingCompanies={existingCompanies} verticals={verticals} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}
      {showVerticalModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVerticalModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">Add vertical</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Create a new category column like Tech, Healthcare, or Retail.</p>
            <div className="form-group">
              <label>Vertical name</label>
              <input autoFocus value={newVertical} onChange={e => setNewVertical(e.target.value)} placeholder="e.g. Tech" onKeyDown={e => e.key === 'Enter' && createVertical()} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowVerticalModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createVertical} disabled={creatingVertical}>{creatingVertical ? 'Adding…' : 'Create vertical'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Remove target company?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Remove <strong>{deleteConfirm.name}</strong> from target companies. Contacts and interviews stay untouched.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }} onClick={() => deleteTarget(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
