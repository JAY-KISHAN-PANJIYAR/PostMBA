import { format, parseISO } from 'date-fns'
import { getUrgency, URGENCY_CONFIG, initials, avatarColor, daysSince } from '../lib/utils.js'

function fmt(dateStr) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

export default function GridCard({ contact, tags, onEdit, onDelete }) {
  const urgency = getUrgency(contact)
  const cfg = URGENCY_CONFIG[urgency]
  const [bg, fg] = avatarColor(contact.name || contact.company)
  const days = daysSince(contact.last_contact)

  const contactTags = (contact.contact_tags || []).map(ct =>
    tags.find(t => t.id === ct.tag_id)
  ).filter(Boolean)

  return (
    <div style={{
      background: 'var(--surface)',
      border: `0.5px solid var(--border)`,
      borderTop: `3px solid ${cfg.border}`,
      borderRadius: `0 0 ${12}px ${12}px`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      opacity: contact.is_active ? 1 : 0.55,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: bg, color: fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>
            {initials(contact.name || contact.company)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{contact.name || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{contact.company}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onEdit(contact)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
          >
            <i className="ti ti-edit" style={{ fontSize: 13 }} />
          </button>
          <button
            onClick={() => onDelete(contact)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
          >
            <i className="ti ti-trash" style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 10,
          background: cfg.bg, color: cfg.color, fontWeight: 500,
        }}>{cfg.label}</span>
      </div>

      {/* Tags */}
      {contactTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {contactTags.map(tag => (
            <span key={tag.id} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 10,
              background: tag.color, color: tag.text_color, fontWeight: 500,
            }}>{tag.name}</span>
          ))}
        </div>
      )}

      {/* Key info */}
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

      {/* Action item */}
      {contact.action_item && (
        <div style={{
          fontSize: 11, color: '#633806',
          background: '#FAEEDA', borderRadius: 6,
          padding: '6px 8px', lineHeight: 1.4,
        }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 10 }} /> {contact.action_item}
        </div>
      )}
    </div>
  )
}
