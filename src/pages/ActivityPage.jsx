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
    const [{ data: l }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('cold_leads').select('lead_added_date, reached_out_date, name, company').order('lead_added_date'),
      supabase.from('contacts').select('name, company, last_contact').order('last_contact'),
      supabase.from('daily_activity').select('*'),
    ])
    setLeads(l || [])
    setContacts(c || [])
    setManualActivity(m || [])
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
        <div style={{ display: 'flex', gap: 0, marginBottom: 4, marginLeft: 28 }}>
          {weeks.map((_, i) => (
            <div key={i} style={{ width: 16, fontSize: 9, color: 'var(--text3)', textAlign: 'left', flexShrink: 0 }}>
              {monthLabels[i] || ''}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 0 }}>
            {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
              <div key={i} style={{ height: 13, fontSize: 9, color: 'var(--text3)', display: 'flex', alignItems: 'center', width: 24, flexShrink: 0 }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map((day, di) => {
                  const k = toKey(day)
                  const v = dayTotal(k)
                  const level = intensity(v)
                  const isSel = selectedDay === k
                  const isFuture = day > today
                  return (
                    <div
                      key={di}
                      onClick={() => !isFuture && selectDay(k)}
                      title={isFuture ? '' : `${format(day, 'MMM d, yyyy')}: ${v} activities`}
                      style={{
                        width: 13, height: 13, borderRadius: 2, flexShrink: 0,
                        background: isFuture ? 'transparent' : CELL_COLORS[level],
                        border: isSel ? '2px solid #0C447C' : '0.5px solid ' + CELL_BORDER[level],
                        cursor: isFuture ? 'default' : 'pointer',
                        opacity: isFuture ? 0 : 1,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
            <span>Less</span>
            {CELL_COLORS.map((c, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c, border: i === 0 ? '0.5px solid var(--border)' : 'none' }} />
            ))}
            <span>More</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#639922', display: 'inline-block' }} /> Leads</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#7F77DD', display: 'inline-block' }} /> Referrals</span>
          </div>
        </div>
      </div>

      {/* Day detail */}
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