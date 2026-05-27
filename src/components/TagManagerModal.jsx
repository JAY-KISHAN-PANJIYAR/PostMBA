import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const PRESETS = [
  { color: '#E6F1FB', text_color: '#0C447C' },
  { color: '#EEEDFE', text_color: '#3C3489' },
  { color: '#EAF3DE', text_color: '#27500A' },
  { color: '#FAEEDA', text_color: '#633806' },
  { color: '#FAECE7', text_color: '#712B13' },
  { color: '#FBEAF0', text_color: '#72243E' },
  { color: '#F1EFE8', text_color: '#444441' },
  { color: '#E1F5EE', text_color: '#085041' },
]

export default function TagManagerModal({ tags, onClose, onSaved }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESETS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function addTag() {
    if (!newName.trim()) { setError('Tag name required'); return }
    setSaving(true)
    const { error: e } = await supabase.from('tags').insert({
      name: newName.trim(),
      color: newColor.color,
      text_color: newColor.text_color,
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    setNewName('')
    setError(null)
    onSaved()
  }

  async function deleteTag(id) {
    await supabase.from('tags').delete().eq('id', id)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-title">Manage tags</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tag" style={{ background: tag.color, color: tag.text_color }}>{tag.name}</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 'auto', color: 'var(--text3)' }}
                onClick={() => deleteTag(tag.id)}
              >
                <i className="ti ti-trash" style={{ fontSize: 13 }} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Add new tag</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Cold outreach" onKeyDown={e => e.key === 'Enter' && addTag()} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map((p, i) => (
                <div
                  key={i}
                  onClick={() => setNewColor(p)}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: p.color,
                    border: newColor === p ? `2px solid ${p.text_color}` : '1.5px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tag" style={{ background: newColor.color, color: newColor.text_color }}>
              {newName || 'Preview'}
            </span>
            <button className="btn btn-primary btn-sm" onClick={addTag} disabled={saving} style={{ marginLeft: 'auto' }}>
              {saving ? 'Adding…' : 'Add tag'}
            </button>
          </div>
          {error && <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
