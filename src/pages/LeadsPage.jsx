import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { initials, avatarColor } from '../lib/utils.js'
import { format, parseISO } from 'date-fns'

function fmt(d) {
  if (!d) return '—'
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

function BouncedModal({ lead, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const QUICK = [
    'Email does not exist',
    'Inbox full / over quota',
    'Domain not found',
    'Email address changed',
    'No response after multiple attempts',
  ]
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-title">Mark as bounced</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          <strong>{lead.name || lead.company}</strong> will be marked as bounced. Add a note about why.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {QUICK.map(q => (
            <button
              key={q}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, background: note === q ? '#FCEBEB' : 'none', color: note === q ? '#A32D2D' : 'var(--text2)', borderColor: note === q ? '#F09595' : 'var(--border)' }}
              onClick={() => setNote(q)}
            >{q}</button>
          ))}
        </div>
        <div className="form-group">
          <label>Bounce note</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Email does not exist"
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
            onClick={() => onConfirm(note)}
          >
            <i className="ti ti-mail-off" style={{ fontSize: 12 }} /> Mark bounced
          </button>
        </div>
      </div>
    </div>
  )
}

function LeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState(lead ? { ...lead } : {
    company: '', name: '', email: '', reached_out_date: '', last_contact: '', lead_status: 'cold', notes: ''
  })
  const [saving, setSaving] = useState(false)
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.company.trim()) return
    setSaving(true)
    const payload = {
      company: form.company.trim(),
      name: form.name || null,
      email: form.email || null,
      reached_out_date: form.reached_out_date || null,
      last_contact: form.last_contact || null,
      lead_status: form.lead_status || 'cold',
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }
    if (lead) {
      await supabase.from('cold_leads').update(payload).eq('id', lead.id)
    } else {
      await supabase.from('cold_leads').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{lead ? 'Edit lead' : 'Add lead'}</div>
        <div className="form-grid">
          <div className="form-group"><label>Company *</label><input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Google" /></div>
          <div className="form-group"><label>Name</label><input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jane@google.com" /></div>
          <div className="form-group"><label>Status</label>
            <select value={form.lead_status || 'cold'} onChange={e => set('lead_status', e.target.value)}>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
          <div className="form-group"><label>Reached out</label><input type="date" value={form.reached_out_date || ''} onChange={e => set('reached_out_date', e.target.value)} /></div>
          <div className="form-group"><label>Last contact</label><input type="date" value={form.last_contact || ''} onChange={e => set('last_contact', e.target.value)} /></div>
          <div className="form-group full"><label>Notes</label><textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Context, email sent, response…" /></div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : (lead ? 'Save changes' : 'Add lead')}</button>
        </div>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [promoting, setPromoting] = useState(null)
  const [bouncing, setBouncing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('cold_leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function deleteLead(lead) {
    await supabase.from('cold_leads').delete().eq('id', lead.id)
    setDeleteConfirm(null)
    load()
  }

  async function confirmBounced(lead, note) {
    await supabase.from('cold_leads').update({
      lead_status: 'bounced',
      notes: note ? (lead.notes ? lead.notes + '\n' + note : note) : lead.notes,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id)
    setBouncing(null)
    load()
  }

  async function confirmWarm(lead) {
    // Add to referral details
    await supabase.from('contacts').insert({
      company: lead.company,
      name: lead.name,
      email: lead.email,
      referral_status: 'In touch',
      notes: lead.notes || null,
      is_active: true,
      last_contact: lead.last_contact || lead.reached_out_date || null,
    })
    // Mark as warm in leads
    await supabase.from('cold_leads').update({ lead_status: 'warm', updated_at: new Date().toISOString() }).eq('id', lead.id)
    setPromoting(null)
    load()
  }

  const companies = useMemo(() => {
    const set = new Set(leads.map(l => l.company).filter(Boolean))
    return Array.from(set).sort()
  }, [leads])

  const stats = useMemo(() => ({
    companies: new Set(leads.map(l => l.company).filter(Boolean)).size,
    total: leads.length,
    cold: leads.filter(l => l.lead_status === 'cold').length,
    warm: leads.filter(l => l.lead_status === 'warm').length,
    bounced: leads.filter(l => l.lead_status === 'bounced').length,
  }), [leads])

  const filtered = useMemo(() => {
    let list = [...leads]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') list = list.filter(l => l.lead_status === filterStatus)
    if (filterCompany !== 'all') list = list.filter(l => l.company === filterCompany)
    return list
  }, [leads, search, filterStatus, filterCompany])

  if (loading) return <div className="loading">Loading leads…</div>

  const STATUS = {
    cold:    { bg: '#E6F1FB', color: '#0C447C', border: '#378ADD', label: 'Cold' },
    warm:    { bg: '#FAEEDA', color: '#633806', border: '#EF9F27', label: 'Warm' },
    bounced: { bg: '#FCEBEB', color: '#A32D2D', border: '#E24B4A', label: 'Bounced' },
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-users" style={{ marginRight: 8, fontSize: 20 }} />
          Leads
        </h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
          <i className="ti ti-plus" /> Add lead
        </button>
      </div>

      {/* Stats — 4 cards */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Companies</div><div className="stat-value">{stats.companies}</div></div>
        <div className="stat-card"><div className="stat-label">Total leads</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Cold</div><div className="stat-value info">{stats.cold}</div></div>
        <div className="stat-card"><div className="stat-label">Warm</div><div className="stat-value warning">{stats.warm}</div></div>
        <div className="stat-card"><div className="stat-label">Bounced</div><div className="stat-value danger">{stats.bounced}</div></div>
      </div>

      <div className="insight">
        <i className="ti ti-bulb" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
        {stats.cold} cold leads across {stats.companies} companies. Click "Warm" when someone responds, or "Bounced" if the email was undeliverable.
        {stats.bounced > 0 && <span style={{ color: '#A32D2D', marginLeft: 6 }}>{stats.bounced} bounced.</span>}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input className="search-input" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="all">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="pill-group">
          {[{ v: 'all', l: 'All' }, { v: 'cold', l: 'Cold' }, { v: 'warm', l: 'Warm' }, { v: 'bounced', l: 'Bounced' }].map(p => (
            <button key={p.v} className={`pill${filterStatus === p.v ? ' active' : ''}`} onClick={() => setFilterStatus(p.v)}>{p.l}</button>
          ))}
        </div>
      </div>

      {/* Lead cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filtered.map(lead => {
          const sc = STATUS[lead.lead_status] || STATUS.cold
          const [bg, fg] = avatarColor(lead.name || lead.company)
          const isExpanded = expandedId === lead.id

          return (
            <div key={lead.id} className="card" style={{ borderLeft: `3px solid ${sc.border}`, borderRadius: '0 12px 12px 0' }}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, padding: '11px 14px', cursor: 'pointer', alignItems: 'center' }}
                onClick={() => setExpandedId(isExpanded ? null : lead.id)}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {initials(lead.name || lead.company)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.name || '—'}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 500 }}>{sc.label}</span>
                    {lead.lead_status === 'warm' && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>· in Referral details</span>
                    )}
                    {lead.lead_status === 'bounced' && (
                      <span style={{ fontSize: 10, color: '#A32D2D', fontStyle: 'italic' }}>· email undeliverable</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    <i className="ti ti-building" style={{ fontSize: 10, marginRight: 3 }} />{lead.company}
                    {lead.email && <> &nbsp;·&nbsp; <i className="ti ti-mail" style={{ fontSize: 10, marginRight: 3 }} />{lead.email}</>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {lead.lead_status === 'cold' && (
                    <>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#FAEEDA', color: '#633806', borderColor: '#EF9F27', fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); setPromoting(lead) }}
                      >
                        <i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} /> Warm
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595', fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); setBouncing(lead) }}
                      >
                        <i className="ti ti-mail-off" style={{ fontSize: 12 }} /> Bounced
                      </button>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditing(lead); setShowModal(true) }}>
                    <i className="ti ti-edit" style={{ fontSize: 13 }} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setDeleteConfirm(lead) }}>
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
                  <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 13, color: 'var(--text3)' }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 14px 14px 62px' }}>
                  <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Reached out</div><div>{fmt(lead.reached_out_date)}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Last contact</div><div>{fmt(lead.last_contact)}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Email</div><div style={{ color: '#0C447C' }}>{lead.email || '—'}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Status</div><div>{sc.label}{lead.lead_status === 'warm' ? ' — synced to Referral details' : ''}</div></div>
                    {lead.notes && (
                      <div style={{ gridColumn: '1/-1', borderTop: '0.5px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Notes</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{lead.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <div className="empty">No leads match your filters.</div>}
      </div>

      {/* Modals */}
      {showModal && <LeadModal lead={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}

      {promoting && (
        <div className="modal-overlay" onClick={() => setPromoting(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">Mark as warm lead?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              <strong>{promoting.name || promoting.company}</strong> will be added to Referral details with status "In touch" and marked as Warm here. They'll stay in Leads so you keep the full history.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setPromoting(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => confirmWarm(promoting)}>
                <i className="ti ti-arrow-up-right" /> Mark warm + add to referrals
              </button>
            </div>
          </div>
        </div>
      )}

      {bouncing && (
        <BouncedModal
          lead={bouncing}
          onClose={() => setBouncing(null)}
          onConfirm={(note) => confirmBounced(bouncing, note)}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Delete lead?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Permanently delete <strong>{deleteConfirm.name || deleteConfirm.company}</strong>. Cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }} onClick={() => deleteLead(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
