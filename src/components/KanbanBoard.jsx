import { format, parseISO } from 'date-fns'
{/* Your comment here */}
import { getUrgency, URGENCY_CONFIG, initials, avatarColor, daysSince } from '../lib/utils.js'

const COLUMNS = [
  { id: 'in-touch',    label: 'In touch',        statuses: ['in touch', 'warm intro', 'need to connect', 'meeting scheduled'] },
  { id: 'asked',       label: 'Asked referral',   statuses: ['asked referral', 'sent job ids', 'under consideration', 'referral promised', 'nda pending', 'no referral unless interview'] },
  { id: 'secured',     label: 'Referral secured', statuses: ['got referral'] },
  { id: 'advocate',    label: 'Strong advocate',  statuses: ['strong advocate'] },
  { id: 'other',       label: 'Other',            statuses: [] },
]

function getColumn(contact) {
  const s = (contact.referral_status || '').toLowerCase()
  for (const col of COLUMNS.slice(0, -1)) {
    if (col.statuses.some(st => s.includes(st))) return col.id
  }
  return 'other'
}

const COL_COLORS = {
  'in-touch': { border: '#378ADD', bg: '#E6F1FB', text: '#0C447C' },
  'asked':    { border: '#EF9F27', bg: '#FAEEDA', text: '#633806' },
  'secured':  { border: '#639922', bg: '#EAF3DE', text: '#27500A' },
  'advocate': { border: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
  'other':    { border: '#B4B2A9', bg: '#F1EFE8', text: '#5F5E5A' },
}

function KanbanCard({ contact, tags, onEdit }) {
  const urgency = getUrgency(contact)
  const cfg = URGENCY_CONFIG[urgency]
  const [bg, fg] = avatarColor(contact.name || contact.company)
  const days = daysSince(contact.last_contact)
  const contactTags = (contact.contact_tags || []).map(ct => tags.find(t => t.id === ct.tag_id)).filter(Boolean)

  return (
    <div
      onClick={() => onEdit(contact)}
      style={{
        background: 'var(--surface)',
        border: `0.5px solid var(--border)`,
        borderLeft: `3px solid ${cfg.border}`,
        borderRadius: `0 8px 8px 0`,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: bg, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, flexShrink: 0,
        }}>
          {initials(contact.name || contact.company)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {contact.name || '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{contact.company}</div>
        </div>
      </div>

      {contactTags.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 5 }}>
          {contactTags.map(tag => (
            <span key={tag.id} style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 8,
              background: tag.color, color: tag.text_color, fontWeight: 500,
            }}>{tag.name}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {contact.action_item && (
          <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
            {contact.action_item}
          </div>
        )}
        {days !== null && (
          <span style={{ fontSize: 9, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {days}d
          </span>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ contacts, tags, onEdit }) {
  const columns = COLUMNS.map(col => ({
    ...col,
    contacts: contacts.filter(c => getColumn(c) === col.id),
  })).filter(col => col.contacts.length > 0 || col.id !== 'other')

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 8,
    }}>
      {columns.map(col => {
        const cc = COL_COLORS[col.id]
        return (
          <div key={col.id} style={{ minWidth: 200 }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              background: cc.bg,
              borderRadius: '8px 8px 0 0',
              marginBottom: 8,
              borderBottom: `2px solid ${cc.border}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cc.text }}>{col.label}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: cc.border, color: '#fff', fontWeight: 600,
              }}>{col.contacts.length}</span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {col.contacts.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 8px', textAlign: 'center' }}>Empty</div>
              ) : (
                col.contacts.map(c => (
                  <KanbanCard key={c.id} contact={c} tags={tags} onEdit={onEdit} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
