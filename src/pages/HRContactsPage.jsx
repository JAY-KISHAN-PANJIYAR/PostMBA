import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase.js'
import { initials, avatarColor } from '../lib/utils.js'
import BannerReminder from '../components/BannerReminder.jsx'

function fmt(d) {
  if (!d) return null
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

const STATUS_CONFIG = {
  cold:      { label: 'Cold',      bg: '#E6F1FB', color: '#0C447C', border: '#185FA5' },
  warm:      { label: 'Warm',      bg: '#FAEEDA', color: '#633806', border: '#BA7517' },
  replied:   { label: 'Replied',   bg: '#EAF3DE', color: '#27500A', border: '#1D9E75' },
  connected: { label: 'Connected', bg: '#EEEDFE', color: '#3C3489', border: '#7F77DD' },
}

const ROLE_OPTIONS = ['Hiring manager', 'TA specialist', 'Recruiter', 'HR business partner', 'Other']

function HRModal({ contact, onClose, onSaved }) {
  const empty = { name: '', company: '', role_type: 'Hiring manager', email: '', phone: '', linkedin_url: '', status: 'cold', added_date: '', reached_out_date: '', last_contact: '', notes: '' }
  const [form, setForm] = useState(contact ? { ...empty, ...contact } : empty)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => Object.assign({}, f, { [k]: v })) }

  async function save() {
    setSaving(true)
    const payload = {
      name: form.name,
      company: form.company,
      role_type: form.role_type,
      email: form.email,
      phone: form.phone,
      linkedin_url: form.linkedin_url,
      status: form.status,
      added_date: form.added_date || null,
      reached_out_date: form.reached_out_date || null,
      last_contact: form.last_contact || null,
      notes: form.notes,
    }
    if (contact) {
      await supabase.from('hr_contacts').update(payload).eq('id', contact.id)
    } else {
      await supabase.from('hr_contacts').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{contact ? 'Edit contact' : 'Add HR contact'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Reynolds" /></div>
          <div className="form-group"><label>Company</label><input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Capital One" /></div>
          <div className="form-group"><label>Role type</label>
            <select value={form.role_type} onChange={e => set('role_type', e.target.value)}>
              {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Email</label><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@capitalone.com" /></div>
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 703-555-0182" /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>LinkedIn URL</label><input value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
          <div className="form-group"><label>Date added</label><input type="date" value={form.added_date || ''} onChange={e => set('added_date', e.target.value)} /></div>
          <div className="form-group"><label>Reached out</label><input type="date" value={form.reached_out_date || ''} onChange={e => set('reached_out_date', e.target.value)} /></div>
          <div className="form-group"><label>Last contact</label><input type="date" value={form.last_contact || ''} onChange={e => set('last_contact', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Action items, context..." /></div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function HRCard({ contact, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[contact.status] || STATUS_CONFIG.cold
  const [bg, fg] = avatarColor(contact.name || contact.company)

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderLeft: '3px solid ' + cfg.border, borderRadius: '0 12px 12px 0', marginBottom: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, padding: '11px 14px', alignItems: 'start' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {initials(contact.name || contact.company)}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{contact.name || '\u2014'}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
            {contact.role_type && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--bg-accent)', color: 'var(--text-accent)', fontWeight: 500 }}>{contact.role_type}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {contact.company && <><i className="ti ti-building" style={{ fontSize: 11 }} /> {contact.company}</>}
            {contact.email && <><span style={{ color: 'var(--text3)' }}>·</span><i className="ti ti-mail" style={{ fontSize: 11 }} /> {contact.email}</>}
            {contact.phone && <><span style={{ color: 'var(--text3)' }}>·</span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {contact.phone}</>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {contact.added_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>
                <i className="ti ti-user-plus" style={{ fontSize: 10 }} /> Added {fmt(contact.added_date)}
              </span>
            )}
            {contact.reached_out_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>
                <i className="ti ti-send" style={{ fontSize: 10 }} /> Reached out {fmt(contact.reached_out_date)}
              </span>
            )}
            {contact.last_contact && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text2)', border: '0.5px solid var(--border)' }}>
                <i className="ti ti-clock" style={{ fontSize: 10 }} /> Last contact {fmt(contact.last_contact)}
              </span>
            )}
          </div>
          {!expanded && contact.notes && (
            <div style={{ fontSize: 11, color: '#633806', background: '#FAEEDA', borderRadius: 6, padding: '5px 8px', marginTop: 6, lineHeight: 1.4 }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 10 }} /> {contact.notes}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 6, border: '0.5px solid #185FA5', background: '#E6F1FB', color: '#0C447C', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}
            >
              <i className="ti ti-brand-linkedin" style={{ fontSize: 13 }} /> LinkedIn
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(contact)}><i className="ti ti-edit" style={{ fontSize: 13 }} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(contact)}><i className="ti ti-trash" style={{ fontSize: 13 }} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            <i className={'ti ti-chevron-' + (expanded ? 'up' : 'down')} style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 14px 14px 64px' }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: contact.notes ? 10 : 0 }}>
            {[
              ['Company', contact.company],
              ['Role type', contact.role_type],
              ['Email', contact.email],
              ['Phone', contact.phone],
              ['Date added', fmt(contact.added_date)],
              ['Reached out', fmt(contact.reached_out_date)],
              ['Last contact', fmt(contact.last_contact)],
              ['Status', STATUS_CONFIG[contact.status]?.label],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: val ? 'var(--text)' : 'var(--text3)' }}>{val || '\u2014'}</div>
              </div>
            ))}
          </div>
          {contact.notes && (
            <div style={{ background: '#FAEEDA', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#633806', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
              <div style={{ fontSize: 12, color: '#633806', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{contact.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HRContactsPage() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('hr_contacts').select('*').order('created_at', { ascending: false })
    setContacts(data || [])
    setLoading(false)
  }

  async function deleteContact(c) {
    await supabase.from('hr_contacts').delete().eq('id', c.id)
    setDeleteConfirm(null)
    load()
  }

  const companies = useMemo(() => [...new Set(contacts.map(c => c.company).filter(Boolean))].sort(), [contacts])

  const filtered = useMemo(() => {
    let list = [...contacts]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.role_type || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus)
    if (filterRole !== 'all') list = list.filter(c => c.role_type === filterRole)
    if (filterCompany !== 'all') list = list.filter(c => c.company === filterCompany)
    return list
  }, [contacts, search, filterStatus, filterRole, filterCompany])

  const stats = useMemo(() => ({
    total: contacts.length,
    cold: contacts.filter(c => c.status === 'cold').length,
    warm: contacts.filter(c => c.status === 'warm').length,
    replied: contacts.filter(c => c.status === 'replied').length,
    connected: contacts.filter(c => c.status === 'connected').length,
  }), [contacts])

  if (loading) return <div className="loading">Loading HR contacts...</div>

  return (
    <div>
      <BannerReminder />
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-address-book" style={{ marginRight: 8, fontSize: 20 }} />
          HR contacts
        </h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
          <i className="ti ti-plus" /> Add contact
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Cold</div><div className="stat-value" style={{ color: '#185FA5' }}>{stats.cold}</div></div>
        <div className="stat-card"><div className="stat-label">Warm</div><div className="stat-value" style={{ color: '#BA7517' }}>{stats.warm}</div></div>
        <div className="stat-card"><div className="stat-label">Replied</div><div className="stat-value success">{stats.replied}</div></div>
        <div className="stat-card"><div className="stat-label">Connected</div><div className="stat-value" style={{ color: '#7F77DD' }}>{stats.connected}</div></div>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search name, company, role..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="all">All companies</option>
          {companies.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="filter-bar" style={{ marginBottom: 8 }}>
        <div className="pill-group">
          {[
            { value: 'all', label: 'All' },
            { value: 'cold', label: 'Cold' },
            { value: 'warm', label: 'Warm' },
            { value: 'replied', label: 'Replied' },
            { value: 'connected', label: 'Connected' },
          ].map(p => (
            <button key={p.value} className={'pill' + (filterStatus === p.value ? ' active' : '')} onClick={() => setFilterStatus(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="pill-group">
          <button className={'pill' + (filterRole === 'all' ? ' active' : '')} onClick={() => setFilterRole('all')}>All roles</button>
          {ROLE_OPTIONS.map(r => (
            <button key={r} className={'pill' + (filterRole === r ? ' active' : '')} onClick={() => setFilterRole(filterRole === r ? 'all' : r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">No HR contacts match your filters.</div>
      )}

      {filtered.map(c => (
        <HRCard key={c.id} contact={c} onEdit={x => { setEditing(x); setShowModal(true) }} onDelete={setDeleteConfirm} />
      ))}

      {showModal && (
        <HRModal
          contact={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete contact?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              This will permanently delete <strong>{deleteConfirm.name || deleteConfirm.company}</strong>. Cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }} onClick={() => deleteContact(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
