import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'

const PRIORITY = {
  high:   { label: 'High',   bg: '#FCEBEB', color: '#A32D2D' },
  medium: { label: 'Medium', bg: '#FAEEDA', color: '#633806' },
  low:    { label: 'Low',    bg: '#F1EFE8', color: '#5F5E5A' },
}

function AddCompanyModal({ existingCompanies, onClose, onSaved }) {
  const [mode, setMode] = useState('existing')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [customName, setCustomName] = useState('')
  const [priority, setPriority] = useState('high')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const name = mode === 'existing' ? selectedCompany : customName.trim()
    if (!name) return
    setSaving(true)
    await supabase.from('target_companies').insert({ name, priority, notes: notes || null })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
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
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Stripe" />
            </div>
          )}

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
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Why this company, target role, etc." />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add company'}</button>
        </div>
      </div>
    </div>
  )
}

export default function TargetCompaniesPage() {
  const [targets, setTargets] = useState([])
  const [contacts, setContacts] = useState([])
  const [existingCompanies, setExistingCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: c }, { data: cos }] = await Promise.all([
      supabase.from('target_companies').select('*').order('priority').order('name'),
      supabase.from('contacts').select('id, name, company, referral_status, is_active'),
      supabase.from('companies').select('name').order('name'),
    ])
    setTargets(t || [])
    setContacts(c || [])
    setExistingCompanies((cos || []).map(c => c.name))
    setLoading(false)
  }

  async function deleteTarget(t) {
    await supabase.from('target_companies').delete().eq('id', t.id)
    setDeleteConfirm(null)
    load()
  }

  async function updatePriority(id, priority) {
    await supabase.from('target_companies').update({ priority }).eq('id', id)
    load()
  }

  // For each target company, get referral contacts from contacts table
  const enriched = useMemo(() => {
    return targets.map(t => {
      const coContacts = contacts.filter(c =>
        c.company?.toLowerCase().trim() === t.name?.toLowerCase().trim()
      )
      const active = coContacts.filter(c => c.is_active)
      const inactive = coContacts.filter(c => !c.is_active)
      const secured = coContacts.filter(c => (c.referral_status || '').toLowerCase().includes('got referral'))
      const advocates = coContacts.filter(c => (c.referral_status || '').toLowerCase().includes('strong advocate'))
      return { ...t, coContacts, active, inactive, secured, advocates }
    })
  }, [targets, contacts])

  const stats = useMemo(() => ({
    total: targets.length,
    totalContacts: contacts.filter(c => enriched.some(e => e.name?.toLowerCase() === c.company?.toLowerCase())).length,
    withContacts: enriched.filter(e => e.coContacts.length > 0).length,
    noCoverage: enriched.filter(e => e.coContacts.length === 0).length,
  }), [enriched, targets, contacts])

  const filtered = useMemo(() => {
    let list = [...enriched]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(q))
    }
    if (filter === 'has') list = list.filter(e => e.coContacts.length > 0)
    if (filter === 'none') list = list.filter(e => e.coContacts.length === 0)
    if (filter === 'high') list = list.filter(e => e.priority === 'high')
    return list
  }, [enriched, search, filter])

  if (loading) return <div className="loading">Loading target companies…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-target" style={{ marginRight: 8, fontSize: 20 }} />
          Target companies
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="ti ti-plus" /> Add company
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Target companies</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">With referral contacts</div><div className="stat-value success">{stats.withContacts}</div></div>
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
        <input className="search-input" placeholder="Search company…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="pill-group">
          {[
            { v: 'all', l: 'All' },
            { v: 'has', l: 'Has contacts' },
            { v: 'none', l: 'No coverage' },
            { v: 'high', l: 'High priority' },
          ].map(p => (
            <button key={p.v} className={`pill${filter === p.v ? ' active' : ''}`} onClick={() => setFilter(p.v)}>{p.l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(e => {
          const pr = PRIORITY[e.priority] || PRIORITY.medium
          const hasContacts = e.coContacts.length > 0
          const total = e.coContacts.length
          const securedPct = total > 0 ? Math.round((e.secured.length / total) * 100) : 0

          return (
            <div key={e.id} className="card" style={{
              padding: '13px 16px',
              border: !hasContacts ? '0.5px solid #F09595' : '0.5px solid var(--border)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{e.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Priority selector */}
                    {Object.entries(PRIORITY).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => updatePriority(e.id, k)}
                        style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 10,
                          background: e.priority === k ? v.bg : 'var(--surface2)',
                          color: e.priority === k ? v.color : 'var(--text3)',
                          border: `0.5px solid ${e.priority === k ? v.color : 'var(--border)'}`,
                          cursor: 'pointer',
                        }}
                      >{v.label}</button>
                    ))}
                    {e.notes && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{e.notes}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Counts */}
                  <div style={{ display: 'flex', gap: 12, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{total}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Total</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: '#27500A' }}>{e.active.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Active</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text3)' }}>{e.inactive.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Inactive</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: '#639922' }}>{e.secured.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Referrals</div>
                    </div>
                  </div>

                  <button className="btn btn-ghost btn-sm" style={{ color: '#A32D2D' }} onClick={() => setDeleteConfirm(e)}>
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, marginBottom: 10, overflow: 'hidden', display: 'flex', gap: 2 }}>
                  {e.secured.length > 0 && <div style={{ width: `${(e.secured.length/total)*100}%`, background: '#639922', borderRadius: 2 }} />}
                  {e.advocates.length > 0 && <div style={{ width: `${(e.advocates.length/total)*100}%`, background: '#1D9E75', borderRadius: 2 }} />}
                  {(e.active.length - e.secured.length - e.advocates.length) > 0 && (
                    <div style={{ width: `${((e.active.length - e.secured.length - e.advocates.length)/total)*100}%`, background: '#378ADD', borderRadius: 2 }} />
                  )}
                  {e.inactive.length > 0 && <div style={{ width: `${(e.inactive.length/total)*100}%`, background: 'var(--border)', borderRadius: 2 }} />}
                </div>
              )}

              {/* Contact chips */}
              {hasContacts ? (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {e.coContacts.map(c => {
                    const isSecured = (c.referral_status || '').toLowerCase().includes('got referral')
                    const isAdvocate = (c.referral_status || '').toLowerCase().includes('strong advocate')
                    return (
                      <span key={c.id} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 12,
                        background: isSecured ? '#EAF3DE' : isAdvocate ? '#E1F5EE' : !c.is_active ? 'var(--surface2)' : '#E6F1FB',
                        color: isSecured ? '#27500A' : isAdvocate ? '#085041' : !c.is_active ? 'var(--text3)' : '#0C447C',
                        opacity: c.is_active ? 1 : 0.6,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {isSecured && <i className="ti ti-check" style={{ fontSize: 10 }} />}
                        {c.name || c.company}
                        {!c.is_active && <span style={{ fontSize: 9 }}>(inactive)</span>}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#A32D2D', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} />
                  No referral contacts yet — add someone from this company to Referral details
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <div className="empty">No target companies match your filters.</div>}
      </div>

      {showModal && (
        <AddCompanyModal
          existingCompanies={existingCompanies}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Remove target company?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              Remove <strong>{deleteConfirm.name}</strong> from your target list. This won't delete any contacts.
            </p>
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
