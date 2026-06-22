import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase.js'

function fmt(d) {
  if (!d) return null
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return null }
}

const STATUS_OPTIONS = [
  { v: 'pending',   label: 'Not contacted',    bg: 'var(--surface2)', color: 'var(--text3)' },
  { v: 'in_touch',  label: 'In touch',         bg: '#E6F1FB', color: '#0C447C' },
  { v: 'asked',     label: 'Asked referral',   bg: '#FAEEDA', color: '#633806' },
  { v: 'secured',   label: 'Referral secured', bg: '#EAF3DE', color: '#27500A' },
]

function statusCfg(v) {
  return STATUS_OPTIONS.find(s => s.v === v) || STATUS_OPTIONS[0]
}

// ── Add/Edit card modal ───────────────────────────────────────
function CardModal({ card, column, alumContacts, onClose, onSaved }) {
  const isAlums = column.name === 'Alums'
  const isEdit = !!card

  const [mode, setMode] = useState(card ? 'manual' : (isAlums ? 'dropdown' : 'manual'))
  const [selectedContactId, setSelectedContactId] = useState(card?.contact_id || '')
  const [name, setName] = useState(card?.name || '')
  const [company, setCompany] = useState(card?.company || '')
  const [notes, setNotes] = useState(card?.notes || '')
  const [lastReached, setLastReached] = useState(card?.last_reached_date || '')
  const [status, setStatus] = useState(card?.status || 'pending')
  const [saving, setSaving] = useState(false)

  // When picking from dropdown, auto-fill name/company
  function pickContact(id) {
    setSelectedContactId(id)
    const c = alumContacts.find(a => a.id === id)
    if (c) { setName(c.name || ''); setCompany(c.company || '') }
  }

  async function save() {
    setSaving(true)
    let contactId = selectedContactId || null

    // If manual entry for Alums — add to contacts table first
    if (isAlums && mode === 'manual' && name.trim() && !contactId) {
      const { data: nc } = await supabase.from('contacts').insert({
        name: name.trim(), company: company.trim() || null,
        referral_status: status === 'secured' ? 'Got referral' : status === 'asked' ? 'Asked referral' : 'In touch',
        is_active: true,
      }).select().single()
      if (nc) contactId = nc.id
    }

    const payload = {
      column_id: column.id,
      contact_id: contactId || null,
      name: name.trim(),
      company: company.trim() || null,
      notes: notes.trim() || null,
      last_reached_date: lastReached || null,
      status,
      updated_at: new Date().toISOString(),
    }

    if (isEdit) {
      await supabase.from('strategy_cards').update(payload).eq('id', card.id)
    } else {
      await supabase.from('strategy_cards').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title">{isEdit ? 'Edit' : 'Add'} — {column.name}</div>

        {isAlums && !isEdit && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[{ v: 'dropdown', l: 'Pick from Babson Alums' }, { v: 'manual', l: 'Add manually' }].map(o => (
              <button key={o.v} className={'pill' + (mode === o.v ? ' active' : '')} onClick={() => setMode(o.v)}>{o.l}</button>
            ))}
          </div>
        )}

        <div className="form-grid">
          {isAlums && mode === 'dropdown' && (
            <div className="form-group full">
              <label>Select alum</label>
              <select value={selectedContactId} onChange={e => pickContact(e.target.value)}>
                <option value="">— choose —</option>
                {alumContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? '· ' + c.company : ''}</option>
                ))}
              </select>
            </div>
          )}

          {(mode === 'manual' || !isAlums) && (
            <>
              <div className="form-group">
                <label>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Where they work" />
              </div>
            </>
          )}

          <div className="form-group full">
            <label>Status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.v}
                  type="button"
                  className="pill"
                  style={status === s.v ? { background: s.bg, color: s.color, borderColor: s.color } : {}}
                  onClick={() => setStatus(s.v)}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Last reached out</label>
            <input type="date" value={lastReached} onChange={e => setLastReached(e.target.value)} />
          </div>

          <div className="form-group full">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Context, what to discuss, follow-up actions..." />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || (!name.trim() && !selectedContactId)}>
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add column modal ──────────────────────────────────────────
function AddColumnModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#378ADD')
  const [saving, setSaving] = useState(false)
  const COLORS = ['#378ADD','#1D9E75','#EF9F27','#D4537E','#7F77DD','#E24B4A','#639922','#633806']

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('strategy_columns').insert({ name: name.trim(), color, position: 99 })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-title">Add column</div>
        <div className="form-group">
          <label>Column name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Hiring Managers, VCs, Board Fellows"
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>
        <div className="form-group">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} type="button" style={{
                width: 22, height: 22, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                outline: color === c ? '2px solid var(--text)' : 'none', outlineOffset: 2,
              }} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create column'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Banner editor modal ───────────────────────────────────────
function BannerModal({ steps, onClose, onSaved }) {
  const [items, setItems] = useState(steps.map(s => ({ ...s })))
  const [saving, setSaving] = useState(false)

  function update(id, text) {
    setItems(prev => prev.map(s => s.id === id ? { ...s, text } : s))
  }

  async function save() {
    setSaving(true)
    for (const s of items) {
      await supabase.from('strategy_banner').update({ text: s.text, updated_at: new Date().toISOString() }).eq('id', s.id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-title">Edit strategy steps</div>
        {items.map((s, i) => (
          <div key={s.id} className="form-group">
            <label>Step {i + 1}</label>
            <input value={s.text} onChange={e => update(s.id, e.target.value)} />
          </div>
        ))}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save steps'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Card To-do modal ─────────────────────────────────────────
function CardTodoModal({ card, onClose }) {
  const [todos, setTodos] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('strategy_card_todos').select('*').eq('card_id', card.id).order('created_at').then(({ data }) => {
      setTodos(data || [])
      setLoading(false)
    })
  }, [card.id])

  async function addTask() {
    const task = newTask.trim()
    if (!task) return
    const { data } = await supabase.from('strategy_card_todos').insert({ card_id: card.id, task, completed: false }).select().single()
    if (data) setTodos(prev => [...prev, data])
    setNewTask('')
  }

  async function toggle(todo) {
    await supabase.from('strategy_card_todos').update({ completed: !todo.completed }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t))
  }

  async function remove(todo) {
    await supabase.from('strategy_card_todos').delete().eq('id', todo.id)
    setTodos(prev => prev.filter(t => t.id !== todo.id))
  }

  const done = todos.filter(t => t.completed).length
  const pct = todos.length ? Math.round(done / todos.length * 100) : 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title">To-do — {card.name}</div>
        {card.company && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: -12, marginBottom: 14 }}>{card.company}</div>}

        {todos.length > 0 && (
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: 'var(--text2)' }}>Progress</span>
              <strong>{done} of {todos.length} done</strong>
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: '#7C3AED' }} />
            </div>
          </div>
        )}

        {loading ? <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>Loading...</div> : (
          <>
            {todos.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 14 }}>No tasks yet. Add one below.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {todos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px' }}>
                  <input type="checkbox" checked={!!t.completed} onChange={() => toggle(t)} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.6 : 1 }}>{t.task}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(t)} style={{ padding: '2px 4px' }}><i className="ti ti-x" style={{ fontSize: 12 }} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="search-input"
            style={{ flex: 1, maxWidth: 'none' }}
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
          />
          <button className="btn" onClick={addTask}><i className="ti ti-plus" style={{ fontSize: 13 }} /> Add</button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Strategy card ─────────────────────────────────────────────
function StrategyCard({ card, column, alumContacts, onEdit, onDelete, onTodo }) {
  const sc = statusCfg(card.status)
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '9px 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{card.name}</div>
          {card.company && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{card.company}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {(() => {
            const todos = card.strategy_card_todos || []
            const pending = todos.filter(t => !t.completed).length
            return (
              <button
                onClick={() => onTodo(card)}
                style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3,
                  border: '0.5px solid ' + (pending ? '#7C3AED' : 'var(--border-strong)'),
                  background: pending ? '#7C3AED' : 'var(--surface)',
                  color: pending ? '#fff' : 'var(--text2)',
                }}
              >
                <i className="ti ti-checklist" style={{ fontSize: 11 }} />
                {todos.length > 0 ? (pending > 0 ? pending + ' left' : 'Done') : 'To-do'}
              </button>
            )
          })()}
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 5px' }} onClick={() => onEdit(card)}>
            <i className="ti ti-edit" style={{ fontSize: 12 }} />
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 5px', color: '#A32D2D' }} onClick={() => onDelete(card)}>
            <i className="ti ti-trash" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>

      <span style={{
        fontSize: 10, padding: '1px 7px', borderRadius: 8, fontWeight: 500,
        background: sc.bg, color: sc.color, display: 'inline-block', marginBottom: 5,
      }}>{sc.label}</span>

      {card.last_reached_date && (
        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="ti ti-calendar" style={{ fontSize: 10 }} /> Last reached {fmt(card.last_reached_date)}
        </div>
      )}

      {card.notes && (
        <div style={{
          fontSize: 11, color: 'var(--text2)', fontStyle: 'italic',
          background: 'var(--surface2)', borderRadius: 6, padding: '5px 7px', marginTop: 4,
        }}>{card.notes}</div>
      )}

      {card.contact_id && (
        <div style={{ fontSize: 9, color: '#3C3489', marginTop: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="ti ti-link" style={{ fontSize: 9 }} /> Synced to Referral details
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function StrategyPage() {
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [banner, setBanner] = useState([])
  const [alumContacts, setAlumContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingCard, setAddingCard] = useState(null) // column
  const [editingCard, setEditingCard] = useState(null) // { card, column }
  const [deletingCard, setDeletingCard] = useState(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [todoCard, setTodoCard] = useState(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cols }, { data: cds }, { data: ban }, { data: cts }] = await Promise.all([
      supabase.from('strategy_columns').select('*').order('position').order('created_at'),
      supabase.from('strategy_cards').select('*, strategy_card_todos(id, completed)').order('position').order('created_at'),
      supabase.from('strategy_banner').select('*').order('step_number'),
      supabase.from('contacts').select('id, name, company, referral_status').eq('is_active', true),
    ])
    // Filter alum contacts by Babson Alum tag
    const { data: tagRow } = await supabase.from('tags').select('id').eq('name', 'Babson Alum').single()
    let alumIds = new Set()
    if (tagRow) {
      const { data: ct } = await supabase.from('contact_tags').select('contact_id').eq('tag_id', tagRow.id)
      alumIds = new Set((ct || []).map(r => r.contact_id))
    }
    setColumns(cols || [])
    setCards(cds || [])
    setBanner(ban || [])
    setAlumContacts((cts || []).filter(c => alumIds.has(c.id)))
    setLoading(false)
  }

  async function deleteCard(card) {
    await supabase.from('strategy_cards').delete().eq('id', card.id)
    setDeletingCard(null)
    load()
  }

  async function deleteColumn(col) {
    await supabase.from('strategy_columns').delete().eq('id', col.id)
    load()
  }

  if (loading) return <div className="loading">Loading strategy...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-chess" style={{ marginRight: 8, fontSize: 20 }} />
          Strategy
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowBanner(true)}>
            <i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit steps
          </button>
          <button className="btn" onClick={() => setShowAddColumn(true)}>
            <i className="ti ti-layout-columns" style={{ fontSize: 13 }} /> Add column
          </button>
        </div>
      </div>

      {/* Priority banner */}
      <div style={{
        background: 'var(--surface2)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Focus areas
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {banner.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
              borderRadius: 'var(--radius)', background: 'var(--surface)',
              border: '0.5px solid var(--border)', fontSize: 12,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600,
                background: s.color, color: s.text_color,
              }}>{i + 1}</div>
              {s.text}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
        {columns.map(col => {
          const colCards = cards.filter(c => c.column_id === col.id)
          return (
            <div key={col.id} style={{
              minWidth: 240, width: 240, background: 'var(--surface2)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', borderBottom: '2px solid ' + col.color,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{col.name}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                    background: col.color + '22', color: col.color,
                  }}>{colCards.length}</span>
                  {col.name === 'Alums' && (
                    <span style={{ fontSize: 9, background: '#EEEDFE', color: '#3C3489', padding: '1px 5px', borderRadius: 6, fontWeight: 500 }}>
                      synced
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 5px', color: 'var(--text3)' }}
                  onClick={() => { if (window.confirm('Delete column "' + col.name + '"?')) deleteColumn(col) }}
                >
                  <i className="ti ti-x" style={{ fontSize: 12 }} />
                </button>
              </div>

              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {colCards.map(card => (
                  <StrategyCard
                    key={card.id}
                    card={card}
                    column={col}
                    alumContacts={alumContacts}
                    onEdit={c => setEditingCard({ card: c, column: col })}
                    onDelete={setDeletingCard}
                    onTodo={setTodoCard}
                  />
                ))}
                {colCards.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '12px 8px' }}>Empty</div>
                )}
                <button
                  onClick={() => setAddingCard(col)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px', borderRadius: 'var(--radius)',
                    border: '1px dashed var(--border-strong)', fontSize: 11,
                    color: 'var(--text3)', cursor: 'pointer', background: 'none',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add {col.name.replace(/s$/, '').toLowerCase()}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {addingCard && (
        <CardModal
          card={null}
          column={addingCard}
          alumContacts={alumContacts}
          onClose={() => setAddingCard(null)}
          onSaved={() => { setAddingCard(null); load() }}
        />
      )}
      {editingCard && (
        <CardModal
          card={editingCard.card}
          column={editingCard.column}
          alumContacts={alumContacts}
          onClose={() => setEditingCard(null)}
          onSaved={() => { setEditingCard(null); load() }}
        />
      )}
      {deletingCard && (
        <div className="modal-overlay" onClick={() => setDeletingCard(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Remove card?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              Remove <strong>{deletingCard.name}</strong> from Strategy. This won't delete them from Referral details.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeletingCard(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
                onClick={() => deleteCard(deletingCard)}>Remove</button>
            </div>
          </div>
        </div>
      )}
      {showAddColumn && (
        <AddColumnModal onClose={() => setShowAddColumn(false)} onSaved={() => { setShowAddColumn(false); load() }} />
      )}
      {todoCard && (
        <CardTodoModal card={todoCard} onClose={() => setTodoCard(null)} />
      )}
      {showBanner && (
        <BannerModal steps={banner} onClose={() => setShowBanner(false)} onSaved={() => { setShowBanner(false); load() }} />
      )}
    </div>
  )
}
