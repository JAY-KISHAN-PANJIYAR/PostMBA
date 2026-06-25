import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function BannerReminder() {
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('app_banner').select('message').eq('id', 1).single()
      .then(({ data }) => { if (data) setMessage(data.message || '') })
  }, [])

  function startEdit() {
    setDraft(message)
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    await supabase.from('app_banner').upsert({ id: 1, message: draft, updated_at: new Date().toISOString() })
    setMessage(draft)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setDraft('')
  }

  const bannerStyle = {
    background: '#FEF08A',
    borderLeft: '4px solid #EAB308',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    display: 'flex',
    alignItems: editing ? 'flex-start' : 'center',
    gap: 10,
    minHeight: 42,
  }

  const iconStyle = {
    fontSize: 16,
    color: '#854D0E',
    marginTop: editing ? 6 : 0,
    flexShrink: 0,
  }

  const textStyle = {
    flex: 1,
    fontSize: 13,
    color: '#713F12',
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  }

  const pencilBtnStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 4,
    color: '#A16207',
    flexShrink: 0,
  }

  const textareaStyle = {
    flex: 1,
    fontSize: 13,
    color: '#713F12',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid #EAB308',
    borderRadius: 5,
    padding: '6px 8px',
    resize: 'vertical',
    minHeight: 60,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    outline: 'none',
  }

  const saveBtnStyle = {
    background: '#EAB308',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.7 : 1,
  }

  const cancelBtnStyle = {
    background: 'transparent',
    color: '#A16207',
    border: '1px solid #EAB308',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  }

  return (
    <div style={bannerStyle}>
      <i className="ti ti-highlight" style={iconStyle} />
      {editing ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            style={textareaStyle}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type your reminder here..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={saveBtnStyle} onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button style={cancelBtnStyle} onClick={cancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <span style={textStyle}>
            {message || 'Click the pencil to add a reminder...'}
          </span>
          <button style={pencilBtnStyle} onClick={startEdit} title="Edit reminder">
            <i className="ti ti-pencil" style={{ fontSize: 15 }} />
          </button>
        </>
      )}
    </div>
  )
}