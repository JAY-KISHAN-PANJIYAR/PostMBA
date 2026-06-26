import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getUrgency, URGENCY_CONFIG, initials, avatarColor, daysSince } from '../lib/utils.js'
import { supabase } from '../lib/supabase.js'

function fmt(dateStr) {
  if (!dateStr) return '\u2014'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function NoteBlock({ label, content, color }) {
  if (!content) return null
  return (
    <div style={{ background: color || 'var(--surface2)', borderRadius: 6, padding: '8px 10px', marginTop: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  )
}

function TodoPanel({ contactId }) {
  const [todos, setTodos] = useState([])
  const [newText, setNewText] = useState('')

  useEffect(() => { loadTodos() }, [contactId])

  async function loadTodos() {
    const { data } = await supabase
      .from('contact_todos')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
    setTodos(data || [])
  }

  async function addTodo() {
    const text = newText.trim()
    if (!text) return
    await supabase.from('contact_todos').insert({ contact_id: contactId, text })
    setNewText('')
    loadTodos()
  }

  async function toggleTodo(todo) {
    await supabase.from('contact_todos').update({
      completed: !todo.completed,
      completed_at: !todo.completed ? new Date().toISOString() : null,
    }).eq('id', todo.id)
    loadTodos()
  }

  async function deleteTodo(id) {
    await supabase.from('contact_todos').delete().eq('id', id)
    loadTodos()
  }

  const pending = todos.filter(t => !t.completed)
  const done = todos.filter(t => t.completed)

  return (
    <div style={{ marginTop: 8, borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
      {pending.map(todo => (
        <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
          <button
            onClick={() => toggleTodo(todo)}
            style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--border-strong)', background: 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 2, padding: 0 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{todo.text}</span>
          <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, fontSize: 11, flexShrink: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 11 }} />
          </button>
        </div>
      ))}
      {done.map(todo => (
        <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5, opacity: 0.45 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#27500A', border: '1.5px solid #27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', flex: 1, textDecoration: 'line-through', lineHeight: 1.4 }}>{todo.text}</span>
          <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, fontSize: 11, flexShrink: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 11 }} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
        <input
          placeholder="Add to-do..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
          style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
        />
        <button
          onClick={addTodo}
          style={{ padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}
        >
          <i className="ti ti-plus" style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  )
}

export default function ContactCard({ contact, tags, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [showTodos, setShowTodos] = useState(false)
  const [todoPendingCount, setTodoPendingCount] = useState(0)
  const urgency = getUrgency(contact)
  const cfg = URGENCY_CONFIG[urgency]
  const [bg, fg] = avatarColor(contact.name || contact.company)
  const days = daysSince(contact.last_contact)

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('contact_todos')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact.id)
        .eq('completed', false)
      setTodoPendingCount(count || 0)
    }
    fetchCount()
  }, [contact.id])

  const contactTags = (contact.contact_tags || []).map(ct =>
    tags.find(t => t.id === ct.tag_id)
  ).filter(Boolean)

  return (
    <div
      className="card"
      style={{ marginBottom: 7, borderLeft: '3px solid ' + cfg.border, borderRadius: '0 12px 12px 0', opacity: !contact.is_active ? 0.6 : 1 }}
    >
      <div
        style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, padding: '11px 14px', cursor: 'pointer', alignItems: 'start' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {initials(contact.name || contact.company)}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{contact.name || '\u2014'}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap' }}>{cfg.label}</span>
            {contactTags.map(tag => (
              <span key={tag.id} className="tag" style={{ background: tag.color, color: tag.text_color }}>{tag.name}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            <i className="ti ti-building" style={{ fontSize: 11, marginRight: 3 }} />
            {contact.company}
            {contact.email && <> &nbsp;&middot;&nbsp; <i className="ti ti-mail" style={{ fontSize: 11, marginRight: 3 }} />{contact.email}</>}
            {contact.mobile && <> &nbsp;&middot;&nbsp; <i className="ti ti-phone" style={{ fontSize: 11, marginRight: 3 }} />{contact.mobile}</>}
          </div>
          {contact.action_item && (
            <div style={{ fontSize: 11, color: '#633806', marginBottom: 3 }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 11 }} /> {contact.action_item}
            </div>
          )}
          {!expanded && (contact.notes || contact.referral_notes || contact.other_notes) && (
            <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>
              {contact.referral_notes || contact.notes || contact.other_notes}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {days !== null && (
            <span style={{ fontSize: 10, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {days === 0 ? 'Today' : days + 'd ago'}
            </span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); setShowTodos(s => !s); setExpanded(false) }}
              style={{ background: showTodos ? '#FEF9C3' : 'transparent', border: showTodos ? '0.5px solid #EAB308' : 'none', color: showTodos ? '#854D0E' : 'var(--text3)' }}
              title="To-dos"
            >
              <i className="ti ti-checkbox" style={{ fontSize: 13 }} />
              {todoPendingCount > 0 && (
                <span style={{ marginLeft: 3, fontSize: 10, fontWeight: 600, color: '#854D0E' }}>{todoPendingCount}</span>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(contact) }}>
              <i className="ti ti-edit" style={{ fontSize: 13 }} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onDelete(contact) }}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} />
            </button>
            <button className="btn btn-ghost btn-sm">
              <i className={'ti ti-chevron-' + (expanded ? 'up' : 'down')} style={{ fontSize: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {showTodos && (
        <div style={{ padding: '0 14px 14px 64px' }}>
          <TodoPanel contactId={contact.id} />
        </div>
      )}

      {expanded && (
        <div style={{ padding: '0 14px 14px 64px' }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Referral status', contact.referral_status],
              ['Last contact', fmt(contact.last_contact)],
              ['Next meeting', contact.next_meeting],
              ['Referred by', contact.referred_by],
              ['Mobile', contact.mobile],
              ['Active', contact.is_active ? 'Yes' : 'No \u2014 inactive'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: val ? 'var(--text)' : 'var(--text3)' }}>{val || '\u2014'}</div>
              </div>
            ))}
          </div>
          <NoteBlock label="Notes" content={contact.notes} />
          <NoteBlock label="Referral notes" content={contact.referral_notes} color="#EAF3DE" />
          <NoteBlock label="Other notes" content={contact.other_notes} color="#E6F1FB" />
        </div>
      )}
    </div>
  )
}
