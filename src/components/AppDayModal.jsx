import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AppDayModal({ appDay, companies, contacts, onClose, onSaved }) {
  const [label, setLabel] = useState(appDay?.label || '')
  const [date, setDate] = useState(appDay?.date || new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (appDay) {
      loadEntries()
    } else {
      setEntries([newEntry()])
    }
  }, [appDay])

  async function loadEntries() {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('app_day_id', appDay.id)
    setEntries(data?.length ? data : [newEntry()])
  }

  function newEntry() {
    return { company_id: '', role_names: '', apps_sent: 1, has_referral: false, referral_contact_ids: [], _key: Math.random() }
  }

  function updateEntry(idx, field, value) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  function toggleRefContact(idx, contactId) {
    setEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e
      const ids = e.referral_contact_ids || []
      const next = ids.includes(contactId) ? ids.filter(id => id !== contactId) : [...ids, contactId]
      return { ...e, referral_contact_ids: next, has_referral: next.length > 0 }
    }))
  }

  async function save() {
    if (!label.trim()) { setError('Label is required'); return }
    if (!date) { setError('Date is required'); return }
    setSaving(true)
    setError(null)

    let dayId = appDay?.id
    if (appDay) {
      await supabase.from('app_days').update({ label: label.trim(), date }).eq('id', appDay.id)
    } else {
      const { data, error: e } = await supabase.from('app_days').insert({ label: label.trim(), date }).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      dayId = data.id
    }

    // Delete existing applications and re-insert
    await supabase.from('applications').delete().eq('app_day_id', dayId)
    const validEntries = entries.filter(e => e.company_id)
    if (validEntries.length > 0) {
      const { error: e2 } = await supabase.from('applications').insert(
        validEntries.map(e => ({
          app_day_id: dayId,
          company_id: e.company_id || null,
          role_names: e.role_names || null,
          apps_sent: parseInt(e.apps_sent) || 1,
          has_referral: e.has_referral,
          referral_contact_ids: e.referral_contact_ids || [],
        }))
      )
      if (e2) { setError(e2.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">{appDay ? 'Edit application day' : 'Log application day'}</div>

        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label>Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Amazon day" />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Companies applied to</div>

        {entries.map((entry, idx) => (
          <div key={entry._key || entry.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label>Company</label>
                <select value={entry.company_id} onChange={e => updateEntry(idx, 'company_id', e.target.value)}>
                  <option value="">— select —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Apps sent</label>
                <input type="number" min="1" value={entry.apps_sent} onChange={e => updateEntry(idx, 'apps_sent', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Role names (optional)</label>
                <input value={entry.role_names || ''} onChange={e => updateEntry(idx, 'role_names', e.target.value)} placeholder="MBA Pathways Ops Manager, Area Manager 2026…" />
              </div>
            </div>

            {/* Referral contacts for this company */}
            {entry.company_id && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Referral contacts at this company</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {contacts
                    .filter(c => {
                      const co = companies.find(co => co.id === entry.company_id)
                      return co && c.company.toLowerCase() === co.name.toLowerCase()
                    })
                    .map(c => {
                      const selected = (entry.referral_contact_ids || []).includes(c.id)
                      return (
                        <span
                          key={c.id}
                          className="tag editable"
                          style={{
                            background: selected ? '#EAF3DE' : 'var(--surface)',
                            color: selected ? '#27500A' : 'var(--text2)',
                            border: `0.5px solid ${selected ? '#639922' : 'var(--border)'}`,
                          }}
                          onClick={() => toggleRefContact(idx, c.id)}
                        >
                          {selected && <i className="ti ti-check" style={{ fontSize: 10 }} />}
                          {c.name || c.company}
                        </span>
                      )
                    })}
                  {contacts.filter(c => {
                    const co = companies.find(co => co.id === entry.company_id)
                    return co && c.company.toLowerCase() === co.name.toLowerCase()
                  }).length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>No contacts at this company yet</span>
                  )}
                </div>
              </div>
            )}

            {entries.length > 1 && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--text3)' }} onClick={() => setEntries(prev => prev.filter((_, i) => i !== idx))}>
                <i className="ti ti-trash" style={{ fontSize: 12 }} /> Remove
              </button>
            )}
          </div>
        ))}

        <button className="btn btn-sm" onClick={() => setEntries(prev => [...prev, newEntry()])}>
          <i className="ti ti-plus" /> Add another company
        </button>

        {error && <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 10 }}>{error}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : (appDay ? 'Save changes' : 'Log day')}
          </button>
        </div>
      </div>
    </div>
  )
}
