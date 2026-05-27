import { differenceInDays, parseISO } from 'date-fns'

export function daysSince(dateStr) {
  if (!dateStr) return null
  try {
    return differenceInDays(new Date(), parseISO(dateStr))
  } catch {
    return null
  }
}

export function getUrgency(contact) {
  const status = (contact.referral_status || '').toLowerCase()
  const days = daysSince(contact.last_contact)

  if (status.includes('got referral') || status.includes('strong advocate')) return 'secured'
  if (!contact.is_active) return 'inactive'
  if (days === null) return 'no-date'
  if (days > 60) return 'overdue'
  if (days > 30) return 'soon'
  return 'ok'
}

export const URGENCY_CONFIG = {
  overdue:  { label: 'Overdue',        bg: '#FCEBEB', color: '#A32D2D', border: '#E24B4A' },
  soon:     { label: 'Follow up soon', bg: '#FAEEDA', color: '#633806', border: '#EF9F27' },
  secured:  { label: 'Referral secured', bg: '#EAF3DE', color: '#27500A', border: '#639922' },
  ok:       { label: 'Recent',         bg: '#E6F1FB', color: '#0C447C', border: '#378ADD' },
  'no-date':{ label: 'No date set',    bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' },
  inactive: { label: 'Inactive',       bg: '#F1EFE8', color: '#888780', border: '#B4B2A9' },
}

export function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  ['#B5D4F4','#0C447C'], ['#9FE1CB','#085041'], ['#FAC775','#633806'],
  ['#F4C0D1','#72243E'], ['#C0DD97','#27500A'], ['#F5C4B3','#712B13'],
  ['#CECBF6','#3C3489'], ['#F0997B','#993C1D'],
]

export function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
