import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getUrgency, URGENCY_CONFIG, initials, avatarColor, daysSince } from '../lib/utils.js'
import { supabase } from '../lib/supabase.js'

function fmt(dateStr) {
  if (!dateStr) return '\u2014'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
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
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
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

export default function GridCard({ contact, tags, onEdit, onDelete }) {
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
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderTop: '3px solid ' + cfg.border, borderRadius: '0 0 12px 12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: contact.is_active ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {initials(contact.name || contact.company)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{contact.name || '\u2014'}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{contact.company}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => setShowTodos(s => !s)}
            title="To-dos"
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 6, border: showTodos ? '0.5px solid #EAB308' : '0.5px solid var(--border-strong)', background: showTodos ? '#FEF9C3' : 'transparent', color: showTodos ? '#854D0E' : 'var(--text3)', cursor: 'pointer', fontSize: 11 }}
          >
            <i className="ti ti-checkbox" style={{ fontSize: 12 }} />
            {todoPendingCount > 0 && <span style={{ fontWeight: 600 }}>{todoPendingCount}</span>}
          </button>
          <button onClick={() => onEdit(contact)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
            <i className="ti ti-edit" style={{ fontSize: 13 }} />
          </button>
          <button onClick={() => onDelete(contact)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
            <i className="ti ti-trash" style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>

      <div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
      </div>

      {contactTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {contactTags.map(tag => (
            <span key={tag.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: tag.color, color: tag.text_color, fontWeight: 500 }}>{tag.name}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
        {contact.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
            <i className="ti ti-mail" style={{ fontSize: 11, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</span>
          </div>
        )}
        {contact.last_contact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-clock" style={{ fontSize: 11, flexShrink: 0 }} />
            <span>{fmt(contact.last_contact)}</span>
            {days !== null && <span style={{ color: cfg.color, fontWeight: 500 }}>({days}d ago)</span>}
          </div>
        )}
      </div>

      {contact.action_item && (
        <div style={{ fontSize: 11, color: '#633806', background: '#FAEEDA', borderRadius: 6, padding: '6px 8px', lineHeight: 1.4 }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 10 }} /> {contact.action_item}
        </div>
      )}

      {showTodos && <TodoPanel contactId={contact.id} />}
    </div>
  )
}
