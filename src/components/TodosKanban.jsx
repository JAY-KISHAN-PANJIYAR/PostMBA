import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { initials, avatarColor } from '../lib/utils.js'

export default function TodosKanban({ contacts, tags }) {
  const [todos, setTodos] = useState([])
  const [newTexts, setNewTexts] = useState({})

  useEffect(() => { loadTodos() }, [contacts])

  async function loadTodos() {
    if (!contacts.length) return
    const ids = contacts.map(c => c.id)
    const { data } = await supabase
      .from('contact_todos')
      .select('*')
      .in('contact_id', ids)
      .order('created_at', { ascending: true })
    setTodos(data || [])
  }

  async function addTodo(contactId) {
    const text = (newTexts[contactId] || '').trim()
    if (!text) return
    await supabase.from('contact_todos').insert({ contact_id: contactId, text })
    setNewTexts(prev => Object.assign({}, prev, { [contactId]: '' }))
    loadTodos()
  }

  async function toggleTodo(todo) {
    await supabase.from('contact_todos').update({
      completed: !todo.completed,
      completed_at: !todo.completed ? new Date().toISOString() : null
    }).eq('id', todo.id)
    loadTodos()
  }

  async function deleteTodo(id) {
    await supabase.from('contact_todos').delete().eq('id', id)
    loadTodos()
  }

  const pendingTodos = todos.filter(t => !t.completed)
  const totalPending = pendingTodos.length

  const tagsWithContacts = tags.map(tag => {
    const tagContacts = contacts.filter(c =>
      (c.contact_tags || []).some(ct => ct.tag_id === tag.id)
    )
    const contactsWithTodos = tagContacts.filter(c =>
      pendingTodos.some(t => t.contact_id === c.id)
    )
    return { tag, contacts: contactsWithTodos }
  }).filter(col => col.contacts.length > 0)

  const untaggedContacts = contacts.filter(c =>
    !(c.contact_tags || []).length &&
    pendingTodos.some(t => t.contact_id === c.id)
  )

  const columns = [
    ...tagsWithContacts,
    ...(untaggedContacts.length ? [{ tag: { id: 'none', name: 'No tag', color: '#D3D1C7', text_color: '#444441' }, contacts: untaggedContacts }] : [])
  ]

  const colColors = ['#7F77DD', '#1D9E75', '#D85A30', '#185FA5', '#BA7517', '#D4537E', '#639922', '#888780']

  if (!totalPending && !todos.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 13 }}>
        <i className="ti ti-checkbox" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
        No pending to-dos yet. Add one from any contact.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        {totalPending} pending to-do{totalPending !== 1 ? 's' : ''} across {columns.length} tag{columns.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {columns.map((col, idx) => {
          const accentColor = col.tag.color && col.tag.color !== '#D3D1C7' ? col.tag.color : colColors[idx % colColors.length]
          const colPendingCount = col.contacts.reduce((sum, c) =>
            sum + pendingTodos.filter(t => t.contact_id === c.id).length, 0)
          return (
            <div key={col.tag.id} style={{ minWidth: 240, maxWidth: 260, background: 'var(--surface2)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid ' + accentColor }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{col.tag.name}</span>
                <span style={{ fontSize: 11, background: 'var(--surface)', border: '0.5px solid var(--border-strong)', color: 'var(--text3)', borderRadius: 10, padding: '1px 8px' }}>{colPendingCount}</span>
              </div>
              {col.contacts.map(contact => {
                const contactTodos = todos.filter(t => t.contact_id === contact.id)
                const contactPending = contactTodos.filter(t => !t.completed)
                const [bg, fg] = avatarColor(contact.name || contact.company)
                return (
                  <div key={contact.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                        {initials(contact.name || contact.company)}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{contact.name || contact.company}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{contact.company}</div>
                      </div>
                    </div>
                    {contactPending.map(todo => (
                      <div key={todo.id} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 9px', marginBottom: 5, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <button
                          onClick={() => toggleTodo(todo)}
                          style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--border-strong)', background: 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, fontSize: 11, flexShrink: 0 }}>
                          <i className="ti ti-x" style={{ fontSize: 11 }} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <input
                        placeholder="Add to-do..."
                        value={newTexts[contact.id] || ''}
                        onChange={e => setNewTexts(prev => Object.assign({}, prev, { [contact.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addTodo(contact.id) }}
                        style={{ flex: 1, fontSize: 11, padding: '4px 7px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                      />
                      <button onClick={() => addTodo(contact.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text3)', cursor: 'pointer' }}>
                        <i className="ti ti-plus" style={{ fontSize: 11 }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}