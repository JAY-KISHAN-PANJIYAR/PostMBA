import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { getUrgency, daysSince } from '../lib/utils.js'
import ContactCard from '../components/ContactCard.jsx'
import GridCard from '../components/GridCard.jsx'
import KanbanBoard from '../components/KanbanBoard.jsx'
import ContactModal from '../components/ContactModal.jsx'
import TagManagerModal from '../components/TagManagerModal.jsx'
import TodosKanban from '../components/TodosKanban.jsx'
import BannerReminder from '../components/BannerReminder.jsx'

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Sort: Urgency' },
  { value: 'company', label: 'Sort: Company A-Z' },
  { value: 'last_contact', label: 'Sort: Last contact' },
  { value: 'name', label: 'Sort: Name A-Z' },
]

const URGENCY_ORDER = { overdue: 0, soon: 1, 'no-date': 2, ok: 3, secured: 4, inactive: 5 }

function generateInsight(contacts) {
  const overdue = contacts.filter(c => getUrgency(c) === 'overdue')
  if (overdue.length > 0) {
    const top = overdue.sort((a, b) => (daysSince(b.last_contact) || 0) - (daysSince(a.last_contact) || 0))[0]
    const days = daysSince(top.last_contact)
    return (top.name || top.company) + ' at ' + top.company + ' is ' + days + ' days overdue — longest gap in your active contacts.'
  }
  const secured = contacts.filter(c => getUrgency(c) === 'secured')
  if (secured.length > 0) return 'You have ' + secured.length + ' referral' + (secured.length > 1 ? 's' : '') + ' secured. Keep nurturing those relationships.'
  return 'All contacts are up to date.'
}

function ViewToggle({ view, onChange, todoPendingCount }) {
  const views = [
    { id: 'list',   icon: 'ti-list',        label: 'List' },
    { id: 'grid',   icon: 'ti-layout-grid', label: 'Grid' },
    { id: 'kanban', icon: 'ti-layout-columns', label: 'Kanban' },
  ]
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          title={v.label}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: view === v.id ? 'var(--surface)' : 'transparent',
            color: view === v.id ? 'var(--text)' : 'var(--text3)',
            fontWeight: view === v.id ? 500 : 400,
            fontSize: 12,
            boxShadow: view === v.id ? '0 0 0 0.5px var(--border-strong)' : 'none',
            transition: 'all 0.1s',
          }}
        >
          <i className={'ti ' + v.icon} style={{ fontSize: 14 }} />
          {v.label}
        </button>
      ))}
      <button
        onClick={() => onChange('todos')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6,
          border: view === 'todos' ? '0.5px solid #EAB308' : 'none',
          cursor: 'pointer',
          background: view === 'todos' ? '#FEF08A' : 'transparent',
          color: view === 'todos' ? '#713F12' : 'var(--text3)',
          fontWeight: view === 'todos' ? 500 : 400,
          fontSize: 12,
          transition: 'all 0.1s',
        }}
      >
        <i className="ti ti-checkbox" style={{ fontSize: 14 }} />
        To-dos
        {todoPendingCount > 0 && (
          <span style={{ background: '#EAB308', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 600, marginLeft: 2 }}>
            {todoPendingCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default function ReferralPage() {
  const [contacts, setContacts] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTagId, setFilterTagId] = useState('all')
  const [sortBy, setSortBy] = useState('urgency')
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [todoPendingCount, setTodoPendingCount] = useState(0)

  useEffect(() => { load() }, [])

  useEffect(() => {
    async function countTodos() {
      const { count } = await supabase
        .from('contact_todos')
        .select('*', { count: 'exact', head: true })
        .eq('completed', false)
      setTodoPendingCount(count || 0)
    }
    countTodos()
  }, [])

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

  function openEdit(contact) {
    setEditingContact(contact)
    setShowModal(true)
  }

  if (loading) return <div className="loading"><i className="ti ti-loader" /> Loading contacts...</div>

  return (
    <div>
      <BannerReminder />
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-users" style={{ marginRight: 8, fontSize: 20 }} />
          Referral details
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ViewToggle view={view} onChange={setView} todoPendingCount={todoPendingCount} />
          <button className="btn btn-sm" onClick={() => setShowTagManager(true)}>
            <i className="ti ti-tag" /> Tags
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

      {/* Filters - hidden in kanban and todos views */}
      {view !== 'kanban' && view !== 'todos' && (
        <>
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Search name, company, email..."
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
                <button key={p.value} className={'pill' + (filterStatus === p.value ? ' active' : '')} onClick={() => setFilterStatus(p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>Tags:</span>
            <div className="pill-group">
              <button className={'pill' + (filterTagId === 'all' ? ' active' : '')} onClick={() => setFilterTagId('all')}>All</button>
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
        </>
      )}

      {/* Kanban search bar */}
      {view === 'kanban' && (
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <input
            className="search-input"
            placeholder="Search name, company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {activeContacts.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-dot" style={{ background: '#27500A' }} />
                Active contacts ({activeContacts.length})
              </div>
              {activeContacts.map(c => (
                <ContactCard key={c.id} contact={c} tags={tags}
                  onEdit={openEdit} onDelete={c => setDeleteConfirm(c)} />
              ))}
            </>
          )}
          {inactiveContacts.length > 0 && (
            <>
              <div className="section-header" style={{ marginTop: 20 }}>
                <span className="section-dot" style={{ background: 'var(--text3)' }} />
                Inactive ({inactiveContacts.length})
              </div>
              {inactiveContacts.map(c => (
                <ContactCard key={c.id} contact={c} tags={tags}
                  onEdit={openEdit} onDelete={c => setDeleteConfirm(c)} />
              ))}
            </>
          )}
          {filtered.length === 0 && <div className="empty">No contacts match your filters.</div>}
        </>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <>
          {activeContacts.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-dot" style={{ background: '#27500A' }} />
                Active contacts ({activeContacts.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12, marginBottom: 24,
              }}>
                {activeContacts.map(c => (
                  <GridCard key={c.id} contact={c} tags={tags}
                    onEdit={openEdit} onDelete={c => setDeleteConfirm(c)} />
                ))}
              </div>
            </>
          )}
          {inactiveContacts.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-dot" style={{ background: 'var(--text3)' }} />
                Inactive ({inactiveContacts.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}>
                {inactiveContacts.map(c => (
                  <GridCard key={c.id} contact={c} tags={tags}
                    onEdit={openEdit} onDelete={c => setDeleteConfirm(c)} />
                ))}
              </div>
            </>
          )}
          {filtered.length === 0 && <div className="empty">No contacts match your filters.</div>}
        </>
      )}

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <KanbanBoard contacts={filtered} tags={tags} onEdit={openEdit} />
      )}

      {/* TODOS VIEW */}
      {view === 'todos' && (
        <TodosKanban contacts={contacts} tags={tags} onTodoChange={() => {
          async function recount() {
            const { count } = await supabase
              .from('contact_todos')
              .select('*', { count: 'exact', head: true })
              .eq('completed', false)
            setTodoPendingCount(count || 0)
          }
          recount()
        }} />
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
              This will permanently delete <strong>{deleteConfirm.name || deleteConfirm.company}</strong>. Cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
                onClick={() => deleteContact(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
