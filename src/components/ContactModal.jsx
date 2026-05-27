import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = {
  sn: '', company: '', name: '', referred_by: '', email: '',
  mobile: '', next_meeting: '', referral_status: '', action_item: '',
  last_contact: '', notes: '', referral_notes: '', other_notes: '', is_active: true
}

const STATUS_OPTIONS = [
  'Got referral', 'Referral promised', 'Asked referral', 'Sent job IDs',
  'In touch', 'Warm intro', 'Strong advocate', 'Under consideration',
  'NDA pending', 'Meeting scheduled', 'Need to connect',
  'No referral unless interview', 'Inactive'
]

export default function ContactModal({ contact, tags, onClose, onSaved }) {
  const [form, setForm] = useState(contact ? { ...EMPTY, ...contact } : { ...EMPTY })
  const [selectedTags, setSelectedTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (contact?.contact_tags) {
      setSelectedTags(contact.contact_tags.map(ct => ct.tag_id))
    }
  }, [contact])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  async function save() {
    if (!form.company.trim()) { setError('Company is required'); return }
    setSaving(true)
    setError(null)

    const payload = {
      company: form.company.trim(),
      name: form.name || null,
      referred_by: form.referred_by || null,
      email: form.email || null,
      mobile: form.mobile || null,
      next_meeting: form.next_meeting || null,
      referral_status: form.referral_status || null,
      action_item: form.action_item || null,
      last_contact: form.last_contact || null,
      notes: form.notes || null,
      referral_notes: form.referral_notes || null,
      other_notes: form.other_notes || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    let contactId = contact?.id
    if (contact) {
      const { error: e } = await supabase.from('contacts').update(payload).eq('id', contact.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { data, error: e } = await supabase.from('contacts').insert(payload).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      contactId = data.id
    }

    await supabase.from('contact_tags').delete().eq('contact_id', contactId)
    if (selectedTags.length > 0) {
      await supabase.from('contact_tags').insert(
        selectedTags.map(tag_id => ({ contact_id: contactId, tag_id }))
      )
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{contact ? 'Edit contact' : 'Add contact'}</div>

        <div className="form-grid">
          <div className="form-group">
            <label>Company *</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Adobe" />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Jon Sofro" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jon@adobe.com" />
          </div>
          <div className="form-group">
            <label>Mobile</label>
            <input value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} placeholder="617 733 7460" />
          </div>
          <div className="form-group">
            <label>Referred by</label>
            <input value={form.referred_by || ''} onChange={e => set('referred_by', e.target.value)} placeholder="Kaushik" />
          </div>
          <div className="form-group">
            <label>Last contact</label>
            <input type="date" value={form.last_contact || ''} onChange={e => set('last_contact', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Next meeting</label>
            <input value={form.next_meeting || ''} onChange={e => set('next_meeting', e.target.value)} placeholder="Feb 10 at 1pm" />
          </div>
          <div className="form-group">
            <label>Referral status</label>
            <select value={form.referral_status || ''} onChange={e => set('referral_status', e.target.value)}>
              <option value="">— select —</option>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group full">
            <label>Action item</label>
            <input value={form.action_item || ''} onChange={e => set('action_item', e.target.value)} placeholder="Follow up on referral" />
          </div>

          {/* Three note fields */}
          <div className="form-group full">
            <label>Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="General notes, meeting context, links…" rows={3} />
          </div>
          <div className="form-group full">
            <label>Referral notes</label>
            <textarea value={form.referral_notes || ''} onChange={e => set('referral_notes', e.target.value)} placeholder="Referral ask details, job IDs sent, referral progress…" rows={3} />
          </div>
          <div className="form-group full">
            <label>Other notes</label>
            <textarea value={form.other_notes || ''} onChange={e => set('other_notes', e.target.value)} placeholder="Background info, personal context, anything else…" rows={3} />
          </div>

          <div className="form-group full">
            <label>Tags</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {tags.map(tag => (
                <span
                  key={tag.id}
                  className="tag editable"
                  style={{
                    background: selectedTags.includes(tag.id) ? tag.color : 'var(--surface2)',
                    color: selectedTags.includes(tag.id) ? tag.text_color : 'var(--text3)',
                    border: `0.5px solid ${selectedTags.includes(tag.id) ? tag.color : 'var(--border)'}`,
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {selectedTags.includes(tag.id) && <i className="ti ti-check" style={{ fontSize: 10 }} />}
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.is_active ? 'active' : 'inactive'} onChange={e => set('is_active', e.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 10 }}>{error}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : (contact ? 'Save changes' : 'Add contact')}
          </button>
        </div>
      </div>
    </div>
  )
}
