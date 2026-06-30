import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function LightboxModal({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}>
        <img src={images[idx].data} alt="screenshot" style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain' }} />
        {images.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
              style={{ position: 'absolute', left: -44, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-chevron-left" />
            </button>
            <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
              style={{ position: 'absolute', right: -44, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-chevron-right" />
            </button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {images.map((img, i) => (
          <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
            style={{ width: 48, height: 36, borderRadius: 4, border: i === idx ? '2px solid #fff' : '2px solid transparent', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
            <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ti ti-x" />
      </button>
    </div>
  )
}

function NoteExpandModal({ note, screenshots, onClose, onRefresh }) {
  const [text, setText] = useState(note.note_text || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const myScreenshots = screenshots.filter(s => s.note_id === note.id)

  async function save() {
    setSaving(true)
    await supabase.from('company_notes').update({ note_text: text, updated_at: new Date().toISOString() }).eq('id', note.id)
    setSaving(false)
    onRefresh()
    onClose()
  }

  async function deleteNote() {
    await supabase.from('company_notes').delete().eq('id', note.id)
    onRefresh()
    onClose()
  }

  async function deleteImg(imgId) {
    await supabase.from('company_note_screenshots').delete().eq('id', imgId)
    onRefresh()
  }

  async function uploadScreenshot(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      await supabase.from('company_note_screenshots').insert({ note_id: note.id, data: ev.target.result, filename: file.name })
      setUploading(false)
      onRefresh()
    }
    reader.readAsDataURL(file)
  }

  const updatedDate = note.updated_at ? new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {lightbox !== null && <LightboxModal images={myScreenshots} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '0.5px solid var(--border-strong)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{note.company_name}</div>
            {updatedDate && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Updated {updatedDate}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 18px', flex: 1 }}>
          {myScreenshots.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Screenshots ({myScreenshots.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
                {myScreenshots.map((img, i) => (
                  <div key={img.id} style={{ position: 'relative', height: 110, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)', cursor: 'pointer' }}>
                    <img src={img.data} alt={img.filename || 'screenshot'} onClick={() => setLightbox(i)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => deleteImg(img.id)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-x" style={{ fontSize: 10 }} />
                    </button>
                    {img.filename && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '3px 6px', fontSize: 9, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {img.filename}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', padding: '9px 0', border: '0.5px dashed var(--border-strong)', borderRadius: 8, background: 'transparent', marginBottom: 16, width: '100%' }}>
            <i className="ti ti-paperclip" style={{ fontSize: 13 }} />
            {uploading ? 'Uploading...' : 'Add screenshot'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadScreenshot} disabled={uploading} />
          </label>

          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
            placeholder="Type your notes here..."
            style={{ width: '100%', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--border-strong)', background: 'var(--surface2)', resize: 'vertical', minHeight: 140, fontFamily: 'inherit', outline: 'none' }}
          />

          {confirmDelete && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 12px', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#A32D2D' }}>Delete this note and all screenshots?</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #F09595', background: 'transparent', color: '#A32D2D', cursor: 'pointer' }}>Cancel</button>
                <button onClick={deleteNote} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#A32D2D', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete note
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: 'none', background: '#1a1a1a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoteCard({ note, screenshots, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const myScreenshots = screenshots.filter(s => s.note_id === note.id)
  const updatedDate = note.updated_at ? new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  async function deleteNote() {
    await supabase.from('company_notes').delete().eq('id', note.id)
    setConfirmDelete(false)
    onRefresh()
  }

  return (
    <>
      {expanded && <NoteExpandModal note={note} screenshots={screenshots} onClose={() => setExpanded(false)} onRefresh={onRefresh} />}
      <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 11px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{note.company_name}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setExpanded(true)} title="Expand"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, fontSize: 13, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-arrows-maximize" />
            </button>
            <button onClick={() => setConfirmDelete(true)} title="Delete"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', padding: 2, fontSize: 13, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '7px 9px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#A32D2D' }}>Delete note and screenshots?</span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '0.5px solid #F09595', background: 'transparent', color: '#A32D2D', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteNote} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        )}

        <div onClick={() => setExpanded(true)} style={{ fontSize: 12, color: note.note_text ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontStyle: note.note_text ? 'normal' : 'italic', cursor: 'pointer', maxHeight: 80, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {note.note_text || 'Click to add notes...'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <button onClick={() => setExpanded(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)', cursor: 'pointer', padding: '2px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 5, background: 'transparent' }}>
            <i className="ti ti-pencil" style={{ fontSize: 10 }} /> Edit
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {myScreenshots.length > 0 && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#E6F1FB', color: '#0C447C', fontWeight: 500 }}>
                {myScreenshots.length} screenshot{myScreenshots.length !== 1 ? 's' : ''}
              </span>
            )}
            {updatedDate && <span style={{ fontSize: 10, color: 'var(--text3)' }}>Updated {updatedDate}</span>}
          </div>
        </div>
      </div>
    </>
  )
}

export default function NotesKanban({ verticals, targets }) {
  const [notes, setNotes] = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [targets])

  async function loadAll() {
    if (!targets.length) { setLoading(false); return }
    const names = targets.map(t => t.name)
    const [{ data: n }, { data: s }] = await Promise.all([
      supabase.from('company_notes').select('*').in('company_name', names).order('updated_at', { ascending: false }),
      supabase.from('company_note_screenshots').select('*').order('created_at', { ascending: true }),
    ])
    setNotes(n || [])
    setScreenshots(s || [])
    setLoading(false)
  }

  async function ensureNote(companyName) {
    const existing = notes.find(n => n.company_name === companyName)
    if (existing) return
    await supabase.from('company_notes').insert({ company_name: companyName, note_text: '' })
    loadAll()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading notes...</div>

  const colColors = ['#185FA5', '#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#D4537E', '#639922']

  function renderColumn(colId, colName, colTargets, accentColor) {
    const colNotes = notes.filter(n => colTargets.some(t => t.name === n.company_name))
    return (
      <div key={colId} style={{ minWidth: 260, maxWidth: 260, background: 'var(--surface2)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid ' + accentColor }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{colName}</span>
          <span style={{ fontSize: 11, background: 'var(--surface)', border: '0.5px solid var(--border-strong)', color: 'var(--text3)', borderRadius: 10, padding: '1px 8px' }}>{colNotes.length}</span>
        </div>
        {colTargets.map(t => {
          const note = notes.find(n => n.company_name === t.name)
          if (!note) {
            return (
              <button key={t.name} onClick={() => ensureNote(t.name)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', fontSize: 11, color: 'var(--text3)', padding: '8px 0', border: '0.5px dashed var(--border-strong)', borderRadius: 8, background: 'transparent', cursor: 'pointer', marginBottom: 6 }}>
                <i className="ti ti-plus" style={{ fontSize: 11 }} /> {t.name}
              </button>
            )
          }
          return <NoteCard key={note.id} note={note} screenshots={screenshots} onRefresh={loadAll} />
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
      {verticals.map((v, idx) => {
        const colTargets = targets.filter(t => t.vertical_id === v.id)
        return renderColumn(v.id, v.name, colTargets, colColors[idx % colColors.length])
      })}
      {(() => {
        const unassigned = targets.filter(t => !t.vertical_id)
        if (!unassigned.length) return null
        return renderColumn('unassigned', 'Unassigned', unassigned, '#888780')
      })()}
    </div>
  )
}
