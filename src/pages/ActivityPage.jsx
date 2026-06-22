import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays, eachDayOfInterval, startOfWeek, isValid } from 'date-fns'
import { supabase } from '../lib/supabase.js'

function fmt(d) {
  if (!d) return '—'
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

function toKey(date) {
  return format(date, 'yyyy-MM-dd')
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
      supabase.from('interviews').select('company, role, applied_date, status'),
      supabase.from('interview_rounds').select('interview_id, round_name, interview_date, completed'),
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
        if (r.completed) map[k].done.push(r)
        else map[k].scheduled.push(r)
      }
    }
    return map
  }, [interviews, interviewRounds])

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

  if (loading) return <div className="loading">Loading activity...</div>

  return (
    <div>
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

      {/* Heatmap */}
      <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>

        {/* Month labels */}
        <div style={{ display: 'flex', marginLeft: 34, marginBottom: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ width: 18, fontSize: 9, color: 'var(--text3)', flexShrink: 0 }}>
              {monthLabels[wi] || ''}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {/* Day-of-week labels — all 7 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
              <div key={i} style={{ height: 15, width: 30, fontSize: 9, color: 'var(--text3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{d}</div>
            ))}
          </div>

          {/* Grid — every cell rendered */}
          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {week.map((day, di) => {
                  const k = toKey(day)
                  const v = dayTotal(k)
                  const isSel = selectedDay === k
                  const isFuture = day > today
                  const isBeforeRange = day < startDate

                  // Per-day-of-week color ramps: 0=empty, 1-4=intensity
                  const DOW = [
                    ['#E6F1FB','#B5D4F4','#378ADD','#0C447C'], // Mon blue
                    ['#EEEDFE','#CECBF6','#7F77DD','#3C3489'], // Tue purple
                    ['#EAF3DE','#C0DD97','#639922','#27500A'], // Wed green
                    ['#FAEEDA','#FAC775','#EF9F27','#633806'], // Thu amber
                    ['#FCEBEB','#F7C1C1','#E24B4A','#A32D2D'], // Fri red
                    ['#E1F5EE','#9FE1CB','#1D9E75','#085041'], // Sat teal
                    ['#FBEAF0','#F4C0D1','#D4537E','#72243E'], // Sun pink
                  ]
                  const ramp = DOW[di] || DOW[0]
                  const lvl = v === 0 ? -1 : v <= 2 ? 0 : v <= 5 ? 1 : v <= 9 ? 2 : 3

                  const bg = isFuture
                    ? 'var(--color-background-secondary)'
                    : lvl === -1
                    ? 'var(--color-background-secondary)'
                    : ramp[lvl]

                  return (
                    <div
                      key={di}
                      onClick={() => !isFuture && !isBeforeRange && selectDay(k)}
                      title={isFuture ? '' : format(day, 'EEE MMM d') + ': ' + v + ' activities'}
                      style={{
                        width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                        background: bg,
                        border: isSel ? '2px solid #0C447C' : '0.5px solid var(--color-border-tertiary)',
                        cursor: (isFuture || isBeforeRange) ? 'default' : 'pointer',
                        opacity: isFuture ? 0.2 : isBeforeRange ? 0.35 : 1,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              ['Mon','#378ADD'],['Tue','#7F77DD'],['Wed','#639922'],
              ['Thu','#EF9F27'],['Fri','#E24B4A'],['Sat','#1D9E75'],['Sun','#D4537E'],
            ].map(([d, c]) => (
              <span key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{d}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
            <span>Less</span>
            {['var(--color-background-secondary)','#C0DD97','#97C459','#639922','#27500A'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: i === 0 ? '0.5px solid var(--color-border-tertiary)' : 'none' }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Interviews heatmap */}
      <div className="card" style={{ padding: '16px', overflowX: 'auto', marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-briefcase" style={{ fontSize: 14 }} /> Interview activity
          <div style={{ display: 'flex', gap: 12, marginLeft: 8, fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#378ADD', display: 'inline-block' }} /> Applied</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#EF9F27', display: 'inline-block' }} /> Scheduled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#639922', display: 'inline-block' }} /> Completed round</span>
          </div>
        </div>

        {/* Month labels */}
        <div style={{ display: 'flex', marginLeft: 34, marginBottom: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ width: 18, fontSize: 9, color: 'var(--text3)', flexShrink: 0 }}>
              {monthLabels[wi] || ''}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
              <div key={i} style={{ height: 15, width: 30, fontSize: 9, color: 'var(--text3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {week.map((day, di) => {
                  const k = toKey(day)
                  const d = interviewDayMap[k]
                  const isFuture = day > today
                  const isBeforeRange = day < startDate

                  // Color priority: completed round (green) > scheduled (amber) > applied (blue) > empty
                  const bg = isFuture || !d
                    ? 'var(--color-background-secondary)'
                    : d.done.length > 0
                    ? (d.done.length >= 3 ? '#27500A' : d.done.length === 2 ? '#639922' : '#97C459')
                    : d.scheduled.length > 0
                    ? '#EF9F27'
                    : d.applied.length > 0
                    ? '#378ADD'
                    : 'var(--color-background-secondary)'

                  const total = ivDayTotal(k)
                  return (
                    <div
                      key={di}
                      title={isFuture ? '' : format(day, 'EEE MMM d') + ': ' + total + ' interview activities'}
                      style={{
                        width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                        background: bg,
                        border: '0.5px solid var(--color-border-tertiary)',
                        opacity: isFuture ? 0.2 : isBeforeRange ? 0.35 : 1,
                        cursor: total > 0 && !isFuture && !isBeforeRange ? 'pointer' : 'default',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Summary below heatmap */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {interviews.map(iv => (
            <div key={iv.company + iv.role} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: iv.status === 'ongoing' ? '#378ADD' : iv.status === 'coming_up' ? '#EF9F27' : iv.status === 'offer_received' ? '#639922' : '#E24B4A',
              }} />
              <strong style={{ color: 'var(--text)' }}>{iv.company}</strong>
              {iv.role && <span>· {iv.role.length > 30 ? iv.role.slice(0, 30) + '…' : iv.role}</span>}
            </div>
          ))}
          {interviews.length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>No interviews logged yet.</span>}
        </div>
      </div>
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
