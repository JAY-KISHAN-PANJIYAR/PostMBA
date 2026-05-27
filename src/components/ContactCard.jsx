import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { getUrgency, URGENCY_CONFIG, initials, avatarColor, daysSince } from '../lib/utils.js'

function fmt(dateStr) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

export default function ContactCard({ contact, tags, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const urgency = getUrgency(contact)
  const cfg = URGENCY_CONFIG[urgency]
  const [bg, fg] = avatarColor(contact.name || contact.company)
  const days = daysSince(contact.last_contact)

  const contactTags = (contact.contact_tags || []).map(ct =>
    tags.find(t => t.id === ct.tag_id)
  ).filter(Boolean)

  const borderColor = cfg.border
  const isInactive = !contact.is_active

  return (
    <div
      className="card"
      style={{
        marginBottom: 7,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: `0 ${12}px ${12}px 0`,
        opacity: isInactive ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Main row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, padding: '11px 14px', cursor: 'pointer', alignItems: 'start' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: bg, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {initials(contact.name || contact.company)}
        </div>

        {/* Content */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{contact.name || '—'}</span>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 10,
              background: cfg.bg, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap'
            }}>{cfg.label}</span>
            {contactTags.map(tag => (
              <span key={tag.id} className="tag" style={{ background: tag.color, color: tag.text_color }}>{tag.name}</span>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            <i className="ti ti-building" style={{ fontSize: 11, marginRight: 3 }} />
            {contact.company}
            {contact.email && <> &nbsp;·&nbsp; <i className="ti ti-mail" style={{ fontSize: 11, marginRight: 3 }} />{contact.email}</>}
            {contact.mobile && <> &nbsp;·&nbsp; <i className="ti ti-phone" style={{ fontSize: 11, marginRight: 3 }} />{contact.mobile}</>}
          </div>

          {contact.action_item && (
            <div style={{ fontSize: 11, color: '#633806', marginBottom: 3 }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 11 }} /> {contact.action_item}
            </div>
          )}

          {contact.notes && !expanded && (
            <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>
              {contact.notes}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {days !== null && (
            <span style={{ fontSize: 10, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {days === 0 ? 'Today' : `${days}d ago`}
            </span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(contact) }}>
              <i className="ti ti-edit" style={{ fontSize: 13 }} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onDelete(contact) }}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} />
            </button>
            <button className="btn btn-ghost btn-sm">
              <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 14px 14px 64px' }}>
          <div style={{
            background: 'var(--surface2)', borderRadius: 8,
            padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10
          }}>
            {[
              ['Referral status', contact.referral_status],
              ['Last contact', fmt(contact.last_contact)],
              ['Next meeting', contact.next_meeting],
              ['Referred by', contact.referred_by],
              ['Mobile', contact.mobile],
              ['Active', contact.is_active ? 'Yes' : 'No — inactive'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: val ? 'var(--text)' : 'var(--text3)' }}>{val || '—'}</div>
              </div>
            ))}
            {contact.notes && (
              <div style={{ gridColumn: '1 / -1', borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{contact.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
