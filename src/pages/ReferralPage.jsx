import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { getUrgency, daysSince } from '../lib/utils.js'
import ContactCard from '../components/ContactCard.jsx'
import ContactModal from '../components/ContactModal.jsx'
import TagManagerModal from '../components/TagManagerModal.jsx'

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Sort: Urgency' },
  { value: 'company', label: 'Sort: Company A–Z' },
  { value: 'last_contact', label: 'Sort: Last contact' },
  { value: 'name', label: 'Sort: Name A–Z' },
]

const URGENCY_ORDER = { overdue: 0, soon: 1, 'no-date': 2, ok: 3, secured: 4, inactive: 5 }

function generateInsight(contacts) {
  const overdue = contacts.filter(c => getUrgency(c) === 'overdue')
  if (overdue.length > 0) {
    const top = overdue.sort((a, b) => (daysSince(b.last_contact) || 0) - (daysSince(a.last_contact) || 0))[0]
    const days = daysSince(top.last_contact)
    return `${top.name || top.company} at ${top.company} is ${days} days overdue — longest gap in your active contacts.`
  }
  const secured = contacts.filter(c => getUrgency(c) === 'secured')
  if (secured.length > 0) return `You have ${secured.length} referral${secured.length > 1 ? 's' : ''} secured. Keep nurturing those relationships.`
  return 'All contacts are up to date.'
}

export default function ReferralPage() {
  const [contacts, setContacts] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTagId, setFilterTagId] = useState('all')
  const [sortBy, setSortBy] = useState('urgency')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('contacts').select('*, contact_tags(tag_id)').order('sn', { ascending: true, nullsFirst: false }),
      supabase.from('tags').select('*').order('name'),
    ])
    setContacts(c || [])
    setTags(t || [])
    setLoading(false)
  }

  async function deleteContact(contact) {
    await supabase.from('contacts').delete().eq('id', contact.id)
    setDeleteConfirm(null)
    load()
  }

  const stats = useMemo(() => ({
    total: contacts.length,
    active: contacts.filter(c => c.is_active).length,
    inactive: contacts.filter(c => !c.is_active).length,
    secured: contacts.filter(c => getUrgency(c) === 'secured').length,
    overdue: contacts.filter(c => getUrgency(c) === 'overdue').length,
    soon: contacts.filter(c => getUrgency(c) === 'soon').length,
  }), [contacts])

  const filtered = useMemo(() => {
    let list = [...contacts]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      list = list.filter(c => {
        const u = getUrgency(c)
        if (filterStatus === 'active') return c.is_active && u !== 'inactive'
        if (filterStatus === 'inactive') return !c.is_active
        return u === filterStatus
      })
    }

    if (filterTagId !== 'all') {
      list = list.filter(c => (c.contact_tags || []).some(ct => ct.tag_id === filterTagId))
    }

    list.sort((a, b) => {
      if (sortBy === 'urgency') return (URGENCY_ORDER[getUrgency(a)] ?? 9) - (URGENCY_ORDER[getUrgency(b)] ?? 9)
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '')
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'last_contact') {
        const da = daysSince(a.last_contact) ?? 9999
        const db = daysSince(b.last_contact) ?? 9999
        return da - db
      }
      return 0
    })

    return list
  }, [contacts, search, filterStatus, filterTagId, sortBy])

  const activeContacts = filtered.filter(c => c.is_active)
  const inactiveContacts = filtered.filter(c => !c.is_active)

  if (loading) return <div className="loading"><i className="ti ti-loader" /> Loading contacts…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-users" style={{ marginRight: 8, fontSize: 20 }} />
          Referral details
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setShowTagManager(true)}>
            <i className="ti ti-tag" /> Manage tags
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingContact(null); setShowModal(true) }}>
            <i className="ti ti-plus" /> Add contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value success">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label">Inactive</div><div className="stat-value" style={{ color: 'var(--text3)' }}>{stats.inactive}</div></div>
        <div className="stat-card"><div className="stat-label">Referrals secured</div><div className="stat-value success">{stats.secured}</div></div>
        <div className="stat-card"><div className="stat-label">Overdue</div><div className="stat-value danger">{stats.overdue}</div></div>
        <div className="stat-card"><div className="stat-label">Follow up soon</div><div className="stat-value warning">{stats.soon}</div></div>
      </div>

      {/* Insight */}
      {contacts.length > 0 && (
        <div className="insight">
          <i className="ti ti-bulb" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
          {generateInsight(contacts)}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search name, company, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="filter-bar" style={{ marginBottom: 8 }}>
        <div className="pill-group">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'soon', label: 'Follow up soon' },
            { value: 'secured', label: 'Secured' },
          ].map(p => (
            <button key={p.value} className={`pill${filterStatus === p.value ? ' active' : ''}`} onClick={() => setFilterStatus(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter row */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>Tags:</span>
        <div className="pill-group">
          <button className={`pill${filterTagId === 'all' ? ' active' : ''}`} onClick={() => setFilterTagId('all')}>All</button>
          {tags.map(tag => (
            <button
              key={tag.id}
              className="pill"
              style={filterTagId === tag.id ? { background: tag.color, color: tag.text_color, borderColor: tag.color } : {}}
              onClick={() => setFilterTagId(filterTagId === tag.id ? 'all' : tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active contacts */}
      {activeContacts.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-dot" style={{ background: '#27500A' }} />
            Active contacts ({activeContacts.length})
          </div>
          {activeContacts.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              tags={tags}
              onEdit={c => { setEditingContact(c); setShowModal(true) }}
              onDelete={c => setDeleteConfirm(c)}
            />
          ))}
        </>
      )}

      {/* Inactive contacts */}
      {inactiveContacts.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 20 }}>
            <span className="section-dot" style={{ background: 'var(--text3)' }} />
            Inactive contacts ({inactiveContacts.length}) — no current action needed
          </div>
          {inactiveContacts.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              tags={tags}
              onEdit={c => { setEditingContact(c); setShowModal(true) }}
              onDelete={c => setDeleteConfirm(c)}
            />
          ))}
        </>
      )}

      {filtered.length === 0 && !loading && (
        <div className="empty">No contacts match your filters.</div>
      )}

      {/* Modals */}
      {showModal && (
        <ContactModal
          contact={editingContact}
          tags={tags}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {showTagManager && (
        <TagManagerModal
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onSaved={load}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Delete contact?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              This will permanently delete <strong>{deleteConfirm.name || deleteConfirm.company}</strong>. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }} onClick={() => deleteContact(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
