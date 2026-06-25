import BannerReminder from '../components/BannerReminder.jsx'
import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays, eachDayOfInterval, startOfWeek, isValid, startOfMonth, endOfMonth, getDay, getDaysInMonth, addMonths } from 'date-fns'
import { supabase } from '../lib/supabase.js'

function fmt(d) {
  if (!d) return '—'
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

function toKey(date) {
  return format(date, 'yyyy-MM-dd')
}

// ── Calendar grid component ───────────────────────────────────
function CalendarGrid({ title, icon, months, today, getCellInfo, selectedDay, onSelectDay, legend, footer }) {
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <div className="card" style={{ padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}>
          <i className={'ti ' + icon} style={{ fontSize: 15 }} />
          {title}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {legend.map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {months.map(({ label, weeks }) => (
          <div key={label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, textAlign: 'center' }}>{label}</div>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 32px)', gap: 2, marginBottom: 3 }}>
              {DAYS.map(d => (
                <div key={d} style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', fontWeight: 500 }}>{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 32px)', gap: 2, marginBottom: 2 }}>
                {week.map((day, di) => {
                  if (!day) return <div key={di} />
                  const k = toKey(day)
                  const isFuture = day > today
                  const { bg, label: cellLabel } = getCellInfo(k)
                  const isSel = selectedDay === k
                  return (
                    <div
                      key={di}
                      onClick={() => !isFuture && bg && onSelectDay(k)}
                      title={!isFuture && bg ? cellLabel || '' : ''}
                      style={{
                        height: 32, borderRadius: 6, flexShrink: 0,
                        background: bg || 'var(--color-background-secondary)',
                        border: isSel ? '2px solid #0C447C' : '1px solid ' + (bg ? 'rgba(0,0,0,0.08)' : 'var(--color-border-tertiary)'),
                        cursor: !isFuture && bg ? 'pointer' : 'default',
                        opacity: isFuture ? 0.3 : 1,
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                        padding: '3px 4px',
                      }}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 500, lineHeight: 1,
                        color: bg ? 'rgba(255,255,255,0.9)' : 'var(--color-text-tertiary)',
                      }}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}

export default function ActivityPage() {
  const [leads, setLeads] = useState([])
  const [interviews, setInterviews] = useState([])
  const [interviewRounds, setInterviewRounds] = useState([])
  const [contacts, setContacts] = useState([])
  const [manualActivity, setManualActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(90)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedIvDay, setSelectedIvDay] = useState(null)
  const [editingReferrals, setEditingReferrals] = useState(false)
  const [referralInput, setReferralInput] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: l }, { data: c }, { data: m }, { data: ivs }, { data: ivr }] = await Promise.all([
      supabase.from('cold_leads').select('lead_added_date, reached_out_date, name, company').order('lead_added_date'),
      supabase.from('contacts').select('name, company, last_contact').order('last_contact'),
      supabase.from('daily_activity').select('*'),
      supabase.from('interviews').select('id, company, role, applied_date, status, total_rounds'),
      supabase.from('interview_rounds').select('id, interview_id, round_name, round_number, interview_date, completed'),
    ])
    setLeads(l || [])
    setContacts(c || [])
    setManualActivity(m || [])
    setInterviews(ivs || [])
    setInterviewRounds(ivr || [])
    setLoading(false)
  }

  const dayMap = useMemo(() => {
    const map = {}

    for (const l of leads) {
      if (l.lead_added_date) {
        const k = l.lead_added_date
        if (!map[k]) map[k] = { leadsAdded: [], reachedOut: [], referralAuto: [], referralManual: 0 }
        map[k].leadsAdded.push(l)
      }
      if (l.reached_out_date) {
        const k = l.reached_out_date
        if (!map[k]) map[k] = { leadsAdded: [], reachedOut: [], referralAuto: [], referralManual: 0 }
        map[k].reachedOut.push(l)
      }
    }

    for (const c of contacts) {
      if (c.last_contact) {
        const k = c.last_contact.slice(0, 10)
        if (!map[k]) map[k] = { leadsAdded: [], reachedOut: [], referralAuto: [], referralManual: 0 }
        map[k].referralAuto.push(c)
      }
    }

    for (const m of manualActivity) {
      const k = m.activity_date
      if (!map[k]) map[k] = { leadsAdded: [], reachedOut: [], referralAuto: [], referralManual: 0 }
      map[k].referralManual = m.referral_followups_manual || 0
      map[k].manualId = m.id
      map[k].notes = m.notes
    }

    return map
  }, [leads, contacts, manualActivity])

  // Build lookup: interview id -> interview
  const interviewById = useMemo(() => {
    const m = {}
    for (const iv of interviews) m[iv.id] = iv
    return m
  }, [interviews])

  // Interview heatmap — applied dates + round dates
  const interviewDayMap = useMemo(() => {
    const map = {}
    for (const iv of interviews) {
      if (iv.applied_date) {
        const k = iv.applied_date
        if (!map[k]) map[k] = { applied: [], scheduled: [], done: [] }
        map[k].applied.push(iv)
      }
    }
    for (const r of interviewRounds) {
      if (r.interview_date) {
        const k = r.interview_date.slice(0, 10)
        if (!map[k]) map[k] = { applied: [], scheduled: [], done: [] }
        const enriched = { ...r, interview: interviewById[r.interview_id] }
        if (r.completed) map[k].done.push(enriched)
        else map[k].scheduled.push(enriched)
      }
    }
    return map
  }, [interviews, interviewRounds, interviewById])

  function ivDayTotal(k) {
    const d = interviewDayMap[k]
    if (!d) return 0
    return d.applied.length + d.scheduled.length + d.done.length
  }

  function dayTotal(k) {
    const d = dayMap[k]
    if (!d) return 0
    return d.leadsAdded.length + d.reachedOut.length + Math.max(d.referralAuto.length, d.referralManual)
  }

  function intensity(v) {
    if (v === 0) return 0
    if (v <= 2) return 1
    if (v <= 5) return 2
    if (v <= 9) return 3
    return 4
  }

  const CELL_COLORS = ['var(--color-background-secondary)', '#C0DD97', '#97C459', '#639922', '#27500A']
  const CELL_BORDER = ['var(--color-border-tertiary)', 'transparent', 'transparent', 'transparent', 'transparent']

  const startDate = subDays(today, range)
  const gridStart = startOfWeek(startDate, { weekStartsOn: 1 })

  const allDays = eachDayOfInterval({ start: gridStart, end: today })
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const rangeKeys = eachDayOfInterval({ start: startDate, end: today }).map(toKey)
  const stats = useMemo(() => {
    let leadsAdded = 0, reachedOut = 0, referrals = 0, activeDays = 0
    for (const k of rangeKeys) {
      const d = dayMap[k]
      if (!d) continue
      leadsAdded += d.leadsAdded.length
      reachedOut += d.reachedOut.length
      referrals += Math.max(d.referralAuto.length, d.referralManual)
      if (dayTotal(k) > 0) activeDays++
    }
    return { leadsAdded, reachedOut, referrals, activeDays }
  }, [dayMap, rangeKeys])

  async function saveReferralManual() {
    if (!selectedDay) return
    const val = parseInt(referralInput) || 0
    setSaving(true)
    const existing = dayMap[selectedDay]?.manualId
    if (existing) {
      await supabase.from('daily_activity').update({ referral_followups_manual: val, updated_at: new Date().toISOString() }).eq('id', existing)
    } else {
      await supabase.from('daily_activity').upsert({ activity_date: selectedDay, referral_followups_manual: val }, { onConflict: 'activity_date' })
    }
    setSaving(false)
    setEditingReferrals(false)
    load()
  }

  function selectDay(k) {
    setSelectedDay(k)
    setEditingReferrals(false)
    setReferralInput(String(dayMap[k]?.referralManual || 0))
  }

  const sd = selectedDay ? dayMap[selectedDay] : null

  const monthLabels = useMemo(() => {
    const labels = {}
    for (let i = 0; i < weeks.length; i++) {
      const first = weeks[i][0]
      const m = format(first, 'MMM')
      if (!Object.values(labels).includes(m)) labels[i] = m
    }
    return labels
  }, [weeks])

  // Build proper calendar months for the grid view
  const calendarMonths = useMemo(() => {
    const numMonths = range <= 30 ? 1 : range <= 90 ? 3 : 6
    const result = []
    for (let m = numMonths - 1; m >= 0; m--) {
      const monthDate = addMonths(today, -m)
      const firstDay = startOfMonth(monthDate)
      const lastDay = endOfMonth(monthDate)
      const label = format(firstDay, 'MMMM yyyy')
      // Sunday=0 offset
      const startDow = getDay(firstDay)
      const daysInMonth = getDaysInMonth(monthDate)
      const cells = []
      for (let i = 0; i < startDow; i++) cells.push(null) // empty prefix cells
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d))
      }
      // Pad to full weeks
      while (cells.length % 7 !== 0) cells.push(null)
      const weeks = []
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
      result.push({ label, weeks })
    }
    return result
  }, [today, range])

  if (loading) return <div className="loading">Loading activity...</div>

  return (
    <div>
      <BannerReminder />
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-activity" style={{ marginRight: 8, fontSize: 20 }} />
          Activity
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[30, 90, 180].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={'btn btn-sm' + (range === r ? ' btn-primary' : ' btn-ghost')}
            >{r === 30 ? '1 month' : r === 90 ? '3 months' : '6 months'}</button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card"><div className="stat-label">Leads added</div><div className="stat-value success">{stats.leadsAdded}</div></div>
        <div className="stat-card"><div className="stat-label">Reached out</div><div className="stat-value info">{stats.reachedOut}</div></div>
        <div className="stat-card"><div className="stat-label">Referral touches</div><div className="stat-value" style={{ color: '#3C3489' }}>{stats.referrals}</div></div>
        <div className="stat-card"><div className="stat-label">Active days</div><div className="stat-value">{stats.activeDays}</div></div>
      </div>

      {/* ── LEADS ACTIVITY CALENDAR ── */}
      <CalendarGrid
        title="Leads & referral activity"
        icon="ti-user-search"
        months={calendarMonths}
        today={today}
        getCellInfo={(k) => {
          const d = dayMap[k]
          if (!d) return { bg: null, label: null }
          const v = dayTotal(k)
          if (v === 0) return { bg: null, label: null }
          const leadsN = d.leadsAdded.length + d.reachedOut.length
          const refsN = Math.max(d.referralAuto.length, d.referralManual)
          const primary = leadsN >= refsN ? 'leads' : 'refs'
          const total = leadsN + refsN
          const bg = primary === 'leads'
            ? (total >= 10 ? '#27500A' : total >= 5 ? '#639922' : total >= 2 ? '#97C459' : '#C0DD97')
            : (total >= 5 ? '#3C3489' : total >= 2 ? '#7F77DD' : '#CECBF6')
          return { bg, label: v + ' activities' }
        }}
        selectedDay={selectedDay}
        onSelectDay={selectDay}
        legend={[
          { color: '#C0DD97', label: 'Few leads' },
          { color: '#639922', label: 'Active leads day' },
          { color: '#27500A', label: 'High volume' },
          { color: '#7F77DD', label: 'Referral touch' },
        ]}
      />

      {/* ── INTERVIEW ACTIVITY CALENDAR ── */}
      <CalendarGrid
        title="Interview activity"
        icon="ti-briefcase"
        months={calendarMonths}
        today={today}
        getCellInfo={(k) => {
          const d = interviewDayMap[k]
          if (!d) return { bg: null, label: null }
          if (d.done.length > 0) return { bg: d.done.length >= 2 ? '#27500A' : '#639922', label: 'Round completed' }
          if (d.scheduled.length > 0) return { bg: '#EF9F27', label: 'Round scheduled' }
          if (d.applied.length > 0) return { bg: '#378ADD', label: 'Applied' }
          return { bg: null, label: null }
        }}
        selectedDay={selectedIvDay}
        onSelectDay={(k) => setSelectedIvDay(selectedIvDay === k ? null : k)}
        legend={[
          { color: '#378ADD', label: 'Applied' },
          { color: '#EF9F27', label: 'Round scheduled' },
          { color: '#639922', label: 'Round completed' },
        ]}
        footer={
          <div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 10 }}>
              {interviews.map(iv => (
                <div key={iv.id} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: iv.status === 'ongoing' ? '#378ADD' : iv.status === 'coming_up' ? '#EF9F27' : iv.status === 'offer_received' ? '#639922' : '#E24B4A',
                  }} />
                  <strong style={{ color: 'var(--text)' }}>{iv.company}</strong>
                  {iv.applied_date && <span style={{ color: 'var(--color-text-tertiary)' }}>· applied {fmt(iv.applied_date)}</span>}
                </div>
              ))}
              {interviews.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>No interviews logged yet.</span>}
            </div>
            {selectedIvDay && (() => {
              const d = interviewDayMap[selectedIvDay]
              if (!d) return null
              return (
                <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span><i className="ti ti-calendar-event" style={{ marginRight: 6, fontSize: 13 }} />{fmt(selectedIvDay)}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIvDay(null)}><i className="ti ti-x" style={{ fontSize: 12 }} /></button>
                  </div>
                  {d.applied.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#0C447C', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: '#378ADD', display: 'inline-block' }} /> Applied
                      </div>
                      {d.applied.map(iv => (
                        <div key={iv.id} style={{ fontSize: 12, padding: '5px 8px', background: 'var(--color-background-primary)', borderRadius: 6, marginBottom: 4 }}>
                          <strong>{iv.company}</strong>{iv.role && <span style={{ color: 'var(--color-text-secondary)' }}> · {iv.role}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {d.scheduled.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#633806', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: '#EF9F27', display: 'inline-block' }} /> Scheduled rounds
                      </div>
                      {d.scheduled.map(r => (
                        <div key={r.id} style={{ fontSize: 12, padding: '5px 8px', background: 'var(--color-background-primary)', borderRadius: 6, marginBottom: 4 }}>
                          <strong>{r.interview?.company || 'Unknown'}</strong>
                          <span style={{ color: 'var(--color-text-secondary)' }}> · Round {r.round_number}{r.round_name ? ' — ' + r.round_name : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.done.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#27500A', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: '#639922', display: 'inline-block' }} /> Completed rounds
                      </div>
                      {d.done.map(r => (
                        <div key={r.id} style={{ fontSize: 12, padding: '5px 8px', background: 'var(--color-background-primary)', borderRadius: 6, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ti ti-check" style={{ fontSize: 11, color: '#639922' }} />
                          <strong>{r.interview?.company || 'Unknown'}</strong>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Round {r.round_number}{r.round_name ? ' — ' + r.round_name : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        }
      />
      {selectedDay ? (
        <div className="card" style={{ padding: '14px 16px', marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 15 }} />
            {fmt(selectedDay)}
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{dayTotal(selectedDay)} total activities</span>
          </div>

          {/* Leads added */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: '#EAF3DE', color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className="ti ti-user-plus" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Leads added</div>
                {sd?.leadsAdded.length > 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                    {sd.leadsAdded.slice(0, 4).map(l => l.name || l.company).join(', ')}
                    {sd.leadsAdded.length > 4 && ` +${sd.leadsAdded.length - 4} more`}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>No leads added</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#27500A' }}>{sd?.leadsAdded.length || 0}</div>
          </div>

          {/* Reached out */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className="ti ti-send" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Reached out</div>
                {sd?.reachedOut.length > 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                    {sd.reachedOut.slice(0, 4).map(l => l.name || l.company).join(', ')}
                    {sd.reachedOut.length > 4 && ` +${sd.reachedOut.length - 4} more`}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>No outreach recorded</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#0C447C' }}>{sd?.reachedOut.length || 0}</div>
          </div>

          {/* Referral follow-ups */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className="ti ti-users" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Referral follow-ups</div>
                {sd?.referralAuto.length > 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                    <span style={{ color: '#3C3489' }}>Auto: </span>
                    {sd.referralAuto.slice(0, 3).map(c => c.name || c.company).join(', ')}
                    {sd.referralAuto.length > 3 && ` +${sd.referralAuto.length - 3} more`}
                  </div>
                ) : null}
                {sd?.referralManual > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    <span style={{ color: '#3C3489' }}>Manual: </span>{sd.referralManual} logged
                  </div>
                )}
                {!sd?.referralAuto.length && !sd?.referralManual && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>None logged</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#3C3489' }}>
                {Math.max(sd?.referralAuto.length || 0, sd?.referralManual || 0)}
              </div>
              {editingReferrals ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    value={referralInput}
                    onChange={e => setReferralInput(e.target.value)}
                    min="0"
                    style={{ width: 56, padding: '3px 6px', fontSize: 12, textAlign: 'center' }}
                    autoFocus
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={saveReferralManual}
                    disabled={saving}
                  >{saving ? '...' : 'Save'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingReferrals(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => { setEditingReferrals(true); setReferralInput(String(sd?.referralManual || 0)) }}
                >
                  <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 10 }}>Click any day on the heatmap to see the breakdown.</div>
      )}
    </div>
  )
}
