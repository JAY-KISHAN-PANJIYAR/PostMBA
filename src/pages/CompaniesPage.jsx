import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase.js'
import AppDayModal from '../components/AppDayModal.jsx'

function fmt(dateStr) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function generateInsight(appDays, applications, contacts, companies) {
  if (!appDays.length) return 'No application days logged yet. Click "Log application day" to start.'
  const totalApps = applications.reduce((s, a) => s + (a.apps_sent || 1), 0)
  const withRef = applications.filter(a => a.has_referral).reduce((s, a) => s + (a.apps_sent || 1), 0)
  const pct = totalApps > 0 ? Math.round((withRef / totalApps) * 100) : 0

  // Find company with most apps but no referral
  const coStats = {}
  applications.forEach(app => {
    const co = companies.find(c => c.id === app.company_id)
    if (!co) return
    if (!coStats[co.name]) coStats[co.name] = { apps: 0, hasRef: false }
    coStats[co.name].apps += app.apps_sent || 1
    if (app.has_referral) coStats[co.name].hasRef = true
  })
  const noRef = Object.entries(coStats).filter(([, v]) => !v.hasRef && v.apps > 3).sort((a, b) => b[1].apps - a[1].apps)[0]
  if (noRef) return `${pct}% of your applications have a referral. ${noRef[0]} has ${noRef[1].apps} applications but no referral contact yet — consider reaching out.`
  return `${pct}% of your applications have a referral across ${totalApps} total applications. Strong coverage.`
}

export default function CompaniesPage() {
  const [appDays, setAppDays] = useState([])
  const [applications, setApplications] = useState([])
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDay, setEditingDay] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: days }, { data: apps }, { data: cos }, { data: cons }] = await Promise.all([
      supabase.from('app_days').select('*').order('date', { ascending: false }),
      supabase.from('applications').select('*'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('contacts').select('id, name, company, referral_status'),
    ])
    setAppDays(days || [])
    setApplications(apps || [])
    setCompanies(cos || [])
    setContacts(cons || [])
    setLoading(false)
  }

  async function deleteDay(day) {
    await supabase.from('app_days').delete().eq('id', day.id)
    setDeleteConfirm(null)
    load()
  }

  const stats = useMemo(() => {
    const totalApps = applications.reduce((s, a) => s + (a.apps_sent || 1), 0)
    const withRef = applications.filter(a => a.has_referral).reduce((s, a) => s + (a.apps_sent || 1), 0)
    return {
      days: appDays.length,
      totalApps,
      withRef,
      withoutRef: totalApps - withRef,
    }
  }, [appDays, applications])

  const filteredDays = useMemo(() => {
    let list = appDays.map(day => {
      const dayApps = applications.filter(a => a.app_day_id === day.id)
      return { ...day, apps: dayApps }
    })

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.label.toLowerCase().includes(q) ||
        d.apps.some(a => {
          const co = companies.find(c => c.id === a.company_id)
          return co?.name.toLowerCase().includes(q)
        })
      )
    }

    if (filter === 'ref') list = list.filter(d => d.apps.some(a => a.has_referral))
    if (filter === 'noref') list = list.filter(d => d.apps.every(a => !a.has_referral))

    return list
  }, [appDays, applications, companies, search, filter])

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-calendar" style={{ marginRight: 8, fontSize: 20 }} />
          Companies + referrals
        </h1>
        <button className="btn btn-primary" onClick={() => { setEditingDay(null); setShowModal(true) }}>
          <i className="ti ti-plus" /> Log application day
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Application days</div><div className="stat-value">{stats.days}</div></div>
        <div className="stat-card"><div className="stat-label">Total apps sent</div><div className="stat-value">{stats.totalApps}</div></div>
        <div className="stat-card"><div className="stat-label">With referral</div><div className="stat-value success">{stats.withRef}</div></div>
        <div className="stat-card"><div className="stat-label">Without referral</div><div className="stat-value" style={{ color: 'var(--text3)' }}>{stats.withoutRef}</div></div>
      </div>

      {appDays.length > 0 && (
        <div className="insight">
          <i className="ti ti-bulb" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
          {generateInsight(appDays, applications, contacts, companies)}
        </div>
      )}

      <div className="filter-bar">
        <input className="search-input" placeholder="Search company or day label…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="pill-group">
          {[
            { value: 'all', label: 'All days' },
            { value: 'ref', label: 'Has referral' },
            { value: 'noref', label: 'No referral' },
          ].map(p => (
            <button key={p.value} className={`pill${filter === p.value ? ' active' : ''}`} onClick={() => setFilter(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filteredDays.length === 0 && (
        <div className="empty">
          {appDays.length === 0
            ? 'No application days yet. Log your first one!'
            : 'No days match your filters.'}
        </div>
      )}

      {filteredDays.map(day => {
        const totalApps = day.apps.reduce((s, a) => s + (a.apps_sent || 1), 0)
        const refApps = day.apps.filter(a => a.has_referral).reduce((s, a) => s + (a.apps_sent || 1), 0)
        const refPct = totalApps > 0 ? Math.round((refApps / totalApps) * 100) : 0
        const hasAnyRef = day.apps.some(a => a.has_referral)

        return (
          <div key={day.id} className="card" style={{ marginBottom: 12 }}>
            {/* Day header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '0.5px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ti ti-briefcase" style={{ fontSize: 15, color: 'var(--text3)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{day.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(day.date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#E6F1FB', color: '#0C447C', fontWeight: 500 }}>
                  {totalApps} app{totalApps !== 1 ? 's' : ''}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                  background: hasAnyRef ? '#EAF3DE' : '#FAEEDA',
                  color: hasAnyRef ? '#27500A' : '#633806',
                }}>
                  {hasAnyRef ? `${refApps} with referral` : 'No referral'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingDay(day); setShowModal(true) }}>
                  <i className="ti ti-edit" style={{ fontSize: 13 }} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(day)}>
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>

            {/* Company rows */}
            <div style={{ padding: '0 16px' }}>
              {day.apps.map((app, i) => {
                const co = companies.find(c => c.id === app.company_id)
                const refContacts = (app.referral_contact_ids || [])
                  .map(id => contacts.find(c => c.id === id))
                  .filter(Boolean)
                return (
                  <div key={app.id || i} style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: i < day.apps.length - 1 ? '0.5px solid var(--border)' : 'none',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 3 }}>
                        {co?.name || '—'}
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                          {app.apps_sent} app{app.apps_sent !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {app.role_names && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{app.role_names}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                      {refContacts.length > 0 ? refContacts.map(rc => (
                        <span key={rc.id} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: '#EAF3DE', color: '#27500A', fontWeight: 500,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          <i className="ti ti-check" style={{ fontSize: 9 }} />
                          {rc.name || rc.company}
                        </span>
                      )) : (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'var(--surface2)', color: 'var(--text3)',
                          border: '0.5px dashed var(--border-strong)',
                        }}>No referral</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Day footer */}
            <div style={{
              background: 'var(--surface2)', padding: '8px 16px',
              display: 'flex', gap: 20, fontSize: 12, color: 'var(--text2)',
              borderTop: '0.5px solid var(--border)',
            }}>
              <span>Apps sent: <strong style={{ color: 'var(--text)' }}>{totalApps}</strong></span>
              <span>With referral: <strong style={{ color: '#27500A' }}>{refApps}</strong></span>
              <span>Referral rate: <strong style={{ color: refPct >= 50 ? '#27500A' : refPct > 0 ? '#633806' : 'var(--text3)' }}>{refPct}%</strong></span>
            </div>
          </div>
        )
      })}

      {showModal && (
        <AppDayModal
          appDay={editingDay}
          companies={companies}
          contacts={contacts}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Delete application day?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              This will delete <strong>{deleteConfirm.label}</strong> and all its applications. Cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }} onClick={() => deleteDay(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
