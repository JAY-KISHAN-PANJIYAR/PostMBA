import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase.js'

function fmt(d) {
  if (!d) return null
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
}

const STATUS = {
  coming_up:      { label: 'Coming up',     bg: '#FAEEDA', color: '#633806', border: '#EF9F27' },
  ongoing:        { label: 'Ongoing',       bg: '#E6F1FB', color: '#0C447C', border: '#378ADD' },
  offer_received: { label: 'Offer received',bg: '#EAF3DE', color: '#27500A', border: '#639922' },
  rejected:       { label: 'Rejected',      bg: '#FCEBEB', color: '#A32D2D', border: '#E24B4A' },
}

function buildStatus(interview, rounds) {
  if (interview.status === 'rejected' || interview.status === 'offer_received') return interview.status
  const done = rounds.filter(r => r.completed).length
  if (done === 0) return 'coming_up'
  return 'ongoing'
}

// ── Round row inside modal ──────────────────────────────────
function RoundRow({ round, idx, onChange }) {
  return (
    <div style={{
      background: round.completed ? 'var(--surface2)' : round._isNext ? '#E6F1FB' : 'var(--surface2)',
      border: round._isNext ? '0.5px solid #378ADD' : '0.5px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '12px',
      marginBottom: 8,
      opacity: (!round.completed && !round._isNext && idx > 0) ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600,
          background: round.completed ? '#EAF3DE' : round._isNext ? '#E6F1FB' : 'var(--bg)',
          color: round.completed ? '#27500A' : round._isNext ? '#0C447C' : 'var(--text3)',
        }}>
          {round.completed ? <i className="ti ti-check" style={{ fontSize: 10 }} /> : idx + 1}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: round._isNext ? '#0C447C' : 'var(--text)', flex: 1 }}>
          Round {idx + 1}{round._isNext ? ' — Next up' : ''}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!round.completed} onChange={e => onChange(idx, 'completed', e.target.checked)} />
          Completed
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Round name / type</label>
            <input
              value={round.round_name || ''}
              onChange={e => onChange(idx, 'round_name', e.target.value)}
              placeholder="e.g. Phone screening, Case interview, In-house dinner"
            />
          </div>
        </div>
        <div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={round.interview_date || ''} onChange={e => onChange(idx, 'interview_date', e.target.value)} />
          </div>
        </div>
        <div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Interviewer name(s)</label>
            <input value={round.interviewer || ''} onChange={e => onChange(idx, 'interviewer', e.target.value)} placeholder="e.g. Sarah Chen" />
          </div>
        </div>
        <div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Duration</label>
            <input value={round.duration || ''} onChange={e => onChange(idx, 'duration', e.target.value)} placeholder="e.g. 45 min" />
          </div>
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Remarks for this round</label>
        <textarea
          value={round.remarks || ''}
          onChange={e => onChange(idx, 'remarks', e.target.value)}
          rows={2}
          placeholder="Prep notes, feedback received, what went well..."
        />
      </div>
    </div>
  )
}

// ── Add/Edit modal ──────────────────────────────────────────
function InterviewModal({ interview, onClose, onSaved }) {
  const isEdit = !!interview
  const [company, setCompany] = useState(interview?.company || '')
  const [role, setRole] = useState(interview?.role || '')
  const [appliedDate, setAppliedDate] = useState(interview?.applied_date || '')
  const [h1bAsked, setH1bAsked] = useState(interview?.h1b_asked ?? null)
  const [h1bRemarks, setH1bRemarks] = useState(interview?.h1b_remarks || '')
  const [totalRounds, setTotalRounds] = useState(interview?.total_rounds || 3)
  const [rounds, setRounds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (interview?.rounds) {
      setRounds(interview.rounds.map(r => ({ ...r })))
    } else {
      setRounds(Array.from({ length: totalRounds }, (_, i) => ({
        round_number: i + 1, round_name: '', interview_date: '',
        interviewer: '', duration: '', remarks: '', completed: false,
      })))
    }
  }, [])

  useEffect(() => {
    // Only sync rounds count AFTER initial load (not on mount)
    if (rounds.length === 0) return
    const current = rounds.length
    if (totalRounds > current) {
      setRounds(prev => [...prev, ...Array.from({ length: totalRounds - current }, (_, i) => ({
        round_number: current + i + 1, round_name: '', interview_date: '',
        interviewer: '', duration: '', remarks: '', completed: false,
      }))])
    } else if (totalRounds < current) {
      setRounds(prev => prev.slice(0, totalRounds))
    }
  }, [totalRounds])

  function updateRound(idx, field, value) {
    setRounds(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const enrichedRounds = rounds.map((r, i) => {
    const prevDone = i === 0 || rounds[i - 1].completed
    const isNext = !r.completed && prevDone
    return { ...r, _isNext: isNext }
  })

  async function save() {
    if (!company.trim()) { setError('Company is required'); return }
    setSaving(true)
    setError(null)

    const doneCount = rounds.filter(r => r.completed).length
    let status = interview?.status || 'coming_up'
    if (status !== 'rejected' && status !== 'offer_received') {
      status = doneCount === 0 ? 'coming_up' : 'ongoing'
    }

    const payload = {
      company: company.trim(),
      role: role || null,
      applied_date: appliedDate || null,
      h1b_asked: h1bAsked,
      h1b_remarks: h1bRemarks || null,
      total_rounds: parseInt(totalRounds),
      status,
      updated_at: new Date().toISOString(),
    }

    let iid = interview?.id
    if (isEdit) {
      const { error: e } = await supabase.from('interviews').update(payload).eq('id', interview.id)
      if (e) { setError(e.message); setSaving(false); return }
      await supabase.from('interview_rounds').delete().eq('interview_id', interview.id)
    } else {
      const { data, error: e } = await supabase.from('interviews').insert(payload).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      iid = data.id
    }

    if (rounds.length > 0) {
      await supabase.from('interview_rounds').insert(
        rounds.map((r, i) => ({
          interview_id: iid,
          round_number: i + 1,
          round_name: r.round_name || null,
          interview_date: r.interview_date || null,
          interviewer: r.interviewer || null,
          duration: r.duration || null,
          remarks: r.remarks || null,
          completed: !!r.completed,
        }))
      )
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-title">{isEdit ? 'Edit interview' : 'Add interview'}</div>
        <div className="form-grid">
          <div className="form-group full">
            <label>Company *</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Google" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Strategy Associate" />
          </div>
          <div className="form-group">
            <label>Application date</label>
            <input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Number of rounds</label>
            <select value={totalRounds} onChange={e => setTotalRounds(parseInt(e.target.value))}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* H1B Sponsorship */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 14, marginTop: 4, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>H1B Sponsorship</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[
              { val: true,  label: 'Company does sponsor',     bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
              { val: false, label: 'Company does not sponsor', bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
            ].map(opt => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => setH1bAsked(opt.val)}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  background: h1bAsked === opt.val ? opt.bg : 'var(--surface2)',
                  color: h1bAsked === opt.val ? opt.color : 'var(--text3)',
                  border: h1bAsked === opt.val ? '1.5px solid ' + opt.border : '0.5px solid var(--border)',
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Sponsors H1Bhip remarks</label>
            <input value={h1bRemarks} onChange={e => setH1bRemarks(e.target.value)} placeholder="e.g. HR said they sponsor but need to confirm with legal" />
          </div>
        </div>

        {/* H1B Sponsorship — visible without scrolling */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>
            Interview rounds — fill in as you go
          </div>
          {enrichedRounds.map((r, i) => (
            <RoundRow key={i} round={r} idx={i} onChange={updateRound} />
          ))}
        </div>

        {error && <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 8 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Add interview')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reject modal ────────────────────────────────────────────
function RejectModal({ interview, onClose, onSaved }) {
  const [afterRound, setAfterRound] = useState(
    interview.rejected_after_round || (interview.rounds?.length || 1)
  )
  const [note, setNote] = useState(interview.rejection_note || '')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    await supabase.from('interviews').update({
      status: 'rejected',
      rejected_after_round: afterRound,
      rejection_note: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', interview.id)
    setSaving(false)
    onSaved()
  }

  const rounds = interview.rounds || []
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-title">Mark as rejected — {interview.company}</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          This will move the card to the Rejected column.
        </p>
        <div className="form-group">
          <label>Rejected after which round?</label>
          <select value={afterRound} onChange={e => setAfterRound(parseInt(e.target.value))}>
            {rounds.map((r, i) => (
              <option key={i} value={i + 1}>
                Round {i + 1}{r.round_name ? ' — ' + r.round_name : ''}
              </option>
            ))}
            <option value={0}>Before any interview (ghosted)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Rejection note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. No feedback given. Felt underprepared on market sizing."
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
            onClick={confirm}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Confirm rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offer modal ─────────────────────────────────────────────
function OfferModal({ interview, onClose, onSaved }) {
  const [offerDate, setOfferDate] = useState(interview.offer_date || new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(interview.offer_note || '')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    await supabase.from('interviews').update({
      status: 'offer_received',
      offer_date: offerDate || null,
      offer_note: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', interview.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-title">Mark offer received — {interview.company}</div>
        <div className="form-group">
          <label>Offer date</label>
          <input type="date" value={offerDate} onChange={e => setOfferDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Offer details / notes</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. $145k base + signing. Deadline to respond: Mar 1."
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ background: '#EAF3DE', color: '#27500A', borderColor: '#97C459' }}
            onClick={confirm}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Confirm offer'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Interview to-do modal ──────────────────────────────────
function TodoModal({ interview, onClose, onSaved }) {
  const [todos, setTodos] = useState((interview.todos || []).map(t => ({ ...t })))
  const [newTask, setNewTask] = useState('')
  const done = todos.filter(t => t.completed).length
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0

  async function addTask() {
    const title = newTask.trim()
    if (!title) return
    const position = todos.length + 1
    setNewTask('')
    const { data } = await supabase.from('interview_todos').insert({
      interview_id: interview.id,
      task: title,
      completed: false,
      position,
    }).select().single()
    if (data) setTodos(prev => [...prev, data])
  }

  async function toggleTask(idx) {
    const t = todos[idx]
    const next = !t.completed
    setTodos(prev => prev.map((x, i) => i === idx ? { ...x, completed: next } : x))
    if (t.id) await supabase.from('interview_todos').update({ completed: next }).eq('id', t.id)
  }

  async function updateTask(idx, task) {
    setTodos(prev => prev.map((t, i) => i === idx ? { ...t, task } : t))
  }

  async function saveTaskText(idx) {
    const t = todos[idx]
    if (t.id) await supabase.from('interview_todos').update({ task: (t.task || '').trim() }).eq('id', t.id)
  }

  async function removeTask(idx) {
    const t = todos[idx]
    setTodos(prev => prev.filter((_, i) => i !== idx))
    if (t.id) await supabase.from('interview_todos').delete().eq('id', t.id)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-title">To-do — {interview.company}</div>
        {interview.role && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: -12, marginBottom: 14 }}>{interview.role}</div>}

        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--text2)' }}>Progress</span>
            <strong>{done} of {todos.length} done</strong>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: '#7C3AED' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todos.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 14 }}>No tasks yet. Add prep, follow-up, or email tasks below.</div>}
          {todos.map((todo, idx) => (
            <div key={todo.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <input type="checkbox" checked={!!todo.completed} onChange={() => toggleTask(idx)} />
              <input
                value={todo.task || ''}
                onChange={e => updateTask(idx, e.target.value)}
                onBlur={() => saveTaskText(idx)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', textDecoration: todo.completed ? 'line-through' : 'none', opacity: todo.completed ? 0.65 : 1 }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => removeTask(idx)}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input
            className="search-input"
            style={{ maxWidth: 'none', flex: 1 }}
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task: prepare cases, send thank-you email..."
          />
          <button className="btn" onClick={addTask}><i className="ti ti-plus" /> Add</button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Interview card ──────────────────────────────────────────
function InterviewCard({ interview, onEdit, onReject, onOffer, onDelete, onReactivate, onTodo }) {
  const [expanded, setExpanded] = useState(true)
  const rounds = interview.rounds || []
  const status = interview.status || 'coming_up'
  const sc = STATUS[status] || STATUS.coming_up
  const doneCount = rounds.filter(r => r.completed).length
  const nextRoundIdx = rounds.findIndex((r, i) => !r.completed && (i === 0 || rounds[i-1].completed))
  const isTerminal = status === 'rejected' || status === 'offer_received'

  return (
    <div className="card" style={{
      marginBottom: 8,
      borderLeft: '3px solid ' + sc.border,
      borderRadius: '0 12px 12px 0',
      opacity: isTerminal ? 0.85 : 1,
    }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{interview.company}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 500 }}>
              {sc.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>
            {interview.applied_date && <><i className='ti ti-calendar' style={{ fontSize: 10, marginRight: 3 }} />Applied {fmt(interview.applied_date)} &nbsp;·&nbsp;</>}
          {interview.h1b_asked === true && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#EAF3DE', color: '#27500A', fontWeight: 500, marginRight: 4 }}>
              <i className="ti ti-check" style={{ fontSize: 9 }} /> Sponsors H1B
            </span>
          )}
          {interview.h1b_asked === false && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontWeight: 500, marginRight: 4 }}>
              <i className="ti ti-x" style={{ fontSize: 9 }} /> No H1B sponsorship
            </span>
          )}
          {interview.role && <>{interview.role} &nbsp;·&nbsp;</>}
            {doneCount} of {interview.total_rounds} round{interview.total_rounds !== 1 ? 's' : ''} complete
            {nextRoundIdx >= 0 && rounds[nextRoundIdx].round_name && (
              <> &nbsp;·&nbsp; Next: {rounds[nextRoundIdx].round_name}{rounds[nextRoundIdx].interview_date ? ' — ' + fmt(rounds[nextRoundIdx].interview_date) : ''}</>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn btn-sm"
            style={{ background: (interview.todos || []).some(t => !t.completed) ? '#7C3AED' : 'transparent', color: (interview.todos || []).some(t => !t.completed) ? '#fff' : 'var(--text)', borderColor: (interview.todos || []).some(t => !t.completed) ? '#7C3AED' : 'var(--border-strong)', fontSize: 11 }}
            onClick={e => { e.stopPropagation(); onTodo(interview) }}
          >
            <i className="ti ti-checklist" style={{ fontSize: 12 }} /> To-do{(interview.todos || []).filter(t => !t.completed).length ? ` (${(interview.todos || []).filter(t => !t.completed).length})` : ''}
          </button>
          {!isTerminal && (
            <>
              <button
                className="btn btn-sm"
                style={{ background: '#EAF3DE', color: '#27500A', borderColor: '#97C459', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); onOffer(interview) }}
              >
                <i className="ti ti-trophy" style={{ fontSize: 12 }} /> Offer
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); onReject(interview) }}
              >
                <i className="ti ti-x" style={{ fontSize: 12 }} /> Reject
              </button>
            </>
          )}
          {isTerminal && (
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onReactivate(interview) }}
            >
              Reactivate
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(interview) }}>
            <i className="ti ti-edit" style={{ fontSize: 13 }} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onDelete(interview) }}>
            <i className="ti ti-trash" style={{ fontSize: 13 }} />
          </button>
          <i className={'ti ti-chevron-' + (expanded ? 'up' : 'down')} style={{ fontSize: 13, color: 'var(--text3)' }} />
        </div>
      </div>

      {/* Rounds */}
      {expanded && rounds.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          {rounds.map((r, i) => {
            const isRejectedHere = status === 'rejected' && interview.rejected_after_round === i + 1
            const isNext = i === nextRoundIdx
            const isPending = !r.completed && !isNext

            return (
              <div key={r.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 10px',
                marginBottom: 5,
                borderRadius: 'var(--radius)',
                border: isRejectedHere ? '0.5px solid #F09595' : isNext ? '0.5px solid #378ADD' : '0.5px solid var(--border)',
                background: isRejectedHere ? '#FCEBEB' : isNext ? '#E6F1FB' : 'var(--surface2)',
                opacity: isPending ? 0.55 : 1,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                  background: isRejectedHere ? '#FCEBEB' : r.completed ? '#EAF3DE' : isNext ? '#E6F1FB' : 'var(--bg)',
                  color: isRejectedHere ? '#A32D2D' : r.completed ? '#27500A' : isNext ? '#0C447C' : 'var(--text3)',
                }}>
                  {isRejectedHere ? <i className="ti ti-x" style={{ fontSize: 10 }} /> :
                   r.completed ? <i className="ti ti-check" style={{ fontSize: 10 }} /> : i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: isRejectedHere ? '#A32D2D' : isNext ? '#0C447C' : 'var(--text)' }}>
                      {r.round_name || 'Round ' + (i + 1)}
                    </span>
                    {r.interviewer && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{r.interviewer}</span>}
                    {r.interview_date && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(r.interview_date)}</span>}
                    {r.duration && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.duration}</span>}
                    {isRejectedHere && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontWeight: 500 }}>Rejected here</span>}
                    {isNext && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#E6F1FB', color: '#0C447C', fontWeight: 500 }}>Next up</span>}
                    {r.completed && !isRejectedHere && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#EAF3DE', color: '#27500A', fontWeight: 500 }}>Done</span>}
                  </div>
                  {r.remarks && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, fontStyle: 'italic' }}>{r.remarks}</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Rejection / Offer banner */}
          {interview.h1b_remarks && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 6 }}>
              <i className="ti ti-id-badge" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }} />
              H1B: {interview.h1b_remarks}
            </div>
          )}
          {status === 'rejected' && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#FCEBEB', borderRadius: 'var(--radius)', fontSize: 11, color: '#A32D2D', display: 'flex', gap: 6 }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
              <span>
                Rejected after Round {interview.rejected_after_round}
                {rounds[interview.rejected_after_round - 1]?.round_name ? ' — ' + rounds[interview.rejected_after_round - 1].round_name : ''}
                {interview.rejection_note ? ' · ' + interview.rejection_note : ''}
              </span>
            </div>
          )}
          {status === 'offer_received' && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 'var(--radius)', fontSize: 11, color: '#27500A', display: 'flex', gap: 6 }}>
              <i className="ti ti-trophy" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
              <span>
                Offer received{interview.offer_date ? ' — ' + fmt(interview.offer_date) : ''}
                {interview.offer_note ? ' · ' + interview.offer_note : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Kanban card ─────────────────────────────────────────────
function KanbanCard({ interview, onEdit, onTodo }) {
  const rounds = interview.rounds || []
  const doneCount = rounds.filter(r => r.completed).length
  const pct = interview.total_rounds > 0 ? Math.round((doneCount / interview.total_rounds) * 100) : 0
  const nextRound = rounds.find((r, i) => !r.completed && (i === 0 || rounds[i-1].completed))
  const status = interview.status
  const todos = interview.todos || []
  const pendingTodos = todos.filter(t => !t.completed).length

  return (
    <div
      onClick={() => onEdit(interview)}
      style={{
        background: 'var(--surface2)', borderRadius: 'var(--radius)',
        padding: '10px 12px', marginBottom: 7, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{interview.company}</div>
        <button
          onClick={e => { e.stopPropagation(); onTodo(interview) }}
          style={{
            flexShrink: 0, fontSize: 10, padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500,
            border: '0.5px solid ' + (pendingTodos ? '#7C3AED' : 'var(--border-strong)'),
            background: pendingTodos ? '#7C3AED' : 'var(--surface)',
            color: pendingTodos ? '#fff' : 'var(--text2)',
          }}
        >
          <i className="ti ti-checklist" style={{ fontSize: 11 }} /> To-do{pendingTodos ? ' (' + pendingTodos + ')' : ''}
        </button>
      </div>
      {interview.role && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>{interview.role} · {interview.total_rounds} rounds</div>}
      {status === 'coming_up' && nextRound?.interview_date && (
        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#FAEEDA', color: '#633806', display: 'inline-block', marginBottom: 4 }}>
          Starts {fmt(nextRound.interview_date)}
        </div>
      )}
      {status === 'ongoing' && nextRound && (
        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#E6F1FB', color: '#0C447C', display: 'inline-block', marginBottom: 4 }}>
          Next: {nextRound.round_name || 'Round ' + (rounds.indexOf(nextRound) + 1)}{nextRound.interview_date ? ' — ' + fmt(nextRound.interview_date) : ''}
        </div>
      )}
      {status === 'offer_received' && (
        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#EAF3DE', color: '#27500A', display: 'inline-block', marginBottom: 4 }}>
          {interview.offer_date ? 'Offer — ' + fmt(interview.offer_date) : 'Offer received'}
        </div>
      )}
      {status === 'rejected' && (
        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', display: 'inline-block', marginBottom: 4 }}>
          After Round {interview.rejected_after_round}{rounds[interview.rejected_after_round - 1]?.round_name ? ' — ' + rounds[interview.rejected_after_round - 1].round_name : ''}
        </div>
      )}
      {status !== 'rejected' && (
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: pct + '%',
            background: status === 'offer_received' ? '#639922' : status === 'coming_up' ? '#EF9F27' : '#378ADD',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────
export default function InterviewPage() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [offerTarget, setOfferTarget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [todoTarget, setTodoTarget] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: ivs } = await supabase.from('interviews').select('*').order('created_at', { ascending: false })
    const { data: rounds } = await supabase.from('interview_rounds').select('*').order('round_number')
    const { data: todos } = await supabase.from('interview_todos').select('*').order('position')
    const enriched = (ivs || []).map(iv => ({
      ...iv,
      rounds: (rounds || []).filter(r => r.interview_id === iv.id).sort((a, b) => a.round_number - b.round_number),
      todos: (todos || []).filter(t => t.interview_id === iv.id).sort((a, b) => a.position - b.position),
    }))
    setInterviews(enriched)
    setLoading(false)
  }

  async function deleteInterview(iv) {
    await supabase.from('interviews').delete().eq('id', iv.id)
    setDeleteConfirm(null)
    load()
  }

  async function reactivate(iv) {
    const doneCount = (iv.rounds || []).filter(r => r.completed).length
    const status = doneCount === 0 ? 'coming_up' : 'ongoing'
    await supabase.from('interviews').update({
      status,
      rejected_after_round: null,
      rejection_note: null,
      offer_date: null,
      offer_note: null,
    }).eq('id', iv.id)
    load()
  }

  function openEdit(iv) { setEditing(iv); setShowModal(true) }

  const stats = useMemo(() => ({
    total: interviews.length,
    coming_up: interviews.filter(i => i.status === 'coming_up').length,
    ongoing: interviews.filter(i => i.status === 'ongoing').length,
    offer_received: interviews.filter(i => i.status === 'offer_received').length,
    rejected: interviews.filter(i => i.status === 'rejected').length,
  }), [interviews])

  const filtered = useMemo(() => {
    let list = [...interviews]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => i.company.toLowerCase().includes(q) || (i.role || '').toLowerCase().includes(q))
    }
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus)
    return list
  }, [interviews, search, filterStatus])

  const kanbanCols = [
    { key: 'coming_up', label: 'Coming up', color: '#EF9F27', bg: '#FAEEDA', textColor: '#633806' },
    { key: 'ongoing', label: 'Ongoing', color: '#378ADD', bg: '#E6F1FB', textColor: '#0C447C' },
    { key: 'offer_received', label: 'Offer received', color: '#639922', bg: '#EAF3DE', textColor: '#27500A' },
    { key: 'rejected', label: 'Rejected', color: '#E24B4A', bg: '#FCEBEB', textColor: '#A32D2D' },
  ]

  if (loading) return <div className="loading">Loading interviews...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-briefcase" style={{ marginRight: 8, fontSize: 20 }} />
          Interviews
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
            {[
              { id: 'list', icon: 'ti-list', label: 'List' },
              { id: 'kanban', icon: 'ti-layout-columns', label: 'Kanban' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: view === v.id ? 'var(--surface)' : 'transparent',
                  color: view === v.id ? 'var(--text)' : 'var(--text3)',
                  fontWeight: view === v.id ? 500 : 400,
                  fontSize: 12,
                  boxShadow: view === v.id ? '0 0 0 0.5px var(--border-strong)' : 'none',
                }}
              >
                <i className={'ti ' + v.icon} style={{ fontSize: 14 }} />
                {v.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <i className="ti ti-plus" /> Add interview
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Coming up</div><div className="stat-value warning">{stats.coming_up}</div></div>
        <div className="stat-card"><div className="stat-label">Ongoing</div><div className="stat-value info">{stats.ongoing}</div></div>
        <div className="stat-card"><div className="stat-label">Offer received</div><div className="stat-value success">{stats.offer_received}</div></div>
        <div className="stat-card"><div className="stat-label">Rejected</div><div className="stat-value danger">{stats.rejected}</div></div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input className="search-input" placeholder="Search company or role..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="pill-group">
          {[
            { v: 'all', l: 'All' },
            { v: 'coming_up', l: 'Coming up' },
            { v: 'ongoing', l: 'Ongoing' },
            { v: 'offer_received', l: 'Offer' },
            { v: 'rejected', l: 'Rejected' },
          ].map(p => (
            <button key={p.v} className={'pill' + (filterStatus === p.v ? ' active' : '')} onClick={() => setFilterStatus(p.v)}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {filtered.length === 0 && <div className="empty">No interviews match your filters.</div>}
          {filtered.map(iv => (
            <InterviewCard
              key={iv.id}
              interview={iv}
              onEdit={openEdit}
              onReject={setRejectTarget}
              onOffer={setOfferTarget}
              onDelete={setDeleteConfirm}
              onReactivate={reactivate}
              onTodo={setTodoTarget}
            />
          ))}
        </>
      )}

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {kanbanCols.map(col => {
            const cards = interviews.filter(i => i.status === col.key)
            return (
              <div key={col.key} style={{
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderBottom: '2px solid ' + col.color,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{col.label}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                    background: col.bg, color: col.textColor,
                  }}>{cards.length}</span>
                </div>
                <div style={{ padding: 8 }}>
                  {cards.length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 8px', textAlign: 'center' }}>Empty</div>}
                  {cards.map(iv => <KanbanCard key={iv.id} interview={iv} onEdit={openEdit} onTodo={setTodoTarget} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <InterviewModal
          interview={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
      {rejectTarget && (
        <RejectModal
          interview={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSaved={() => { setRejectTarget(null); load() }}
        />
      )}
      {offerTarget && (
        <OfferModal
          interview={offerTarget}
          onClose={() => setOfferTarget(null)}
          onSaved={() => { setOfferTarget(null); load() }}
        />
      )}
      {todoTarget && (
        <TodoModal
          interview={todoTarget}
          onClose={() => setTodoTarget(null)}
          onSaved={() => { setTodoTarget(null); load() }}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Delete interview?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              Permanently delete <strong>{deleteConfirm.company}</strong> and all its rounds. Cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
                onClick={() => deleteInterview(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
