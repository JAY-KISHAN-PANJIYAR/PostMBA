import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function LightboxModal({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
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

function ScreenshotGrid({ images, onDelete, noteId, onRefresh }) {
  const [lightbox, setLightbox] = useState(null)

  async function deleteImg(imgId) {
    await supabase.from('company_note_screenshots').delete().eq('id', imgId)
    onRefresh()
  }

  if (!images.length) return null

  const thumbStyle = { height: 90, borderRadius: 6, border: '0.5px solid var(--border)', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--surface2)', flexShrink: 0 }

  return (
    <>
      {lightbox !== null && <LightboxModal images={images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{ marginBottom: 8 }}>
        {images.length === 1 && (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <img src={images[0].data} alt="screenshot" onClick={() => setLightbox(0)}
              style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 7, border: '0.5px solid var(--border)', cursor: 'pointer', display: 'block' }} />
            <button onClick={() => deleteImg(images[0].id)}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-x" style={{ fontSize: 10 }} />
            </button>
          </div>
        )}
        {images.length >= 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '1fr 1fr', gap: 5 }}>
            {images.length === 2 && images.map((img, i) => (
              <div key={img.id} style={{ ...thumbStyle, position: 'relative' }}>
                <img src={img.data} alt="" onClick={() => setLightbox(i)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => deleteImg(img.id)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-x" style={{ fontSize: 9 }} />
                </button>
              </div>
            ))}
            {images.length >= 3 && (
              <>
                <div style={{ ...thumbStyle, gridColumn: '1 / -1', height: 100, position: 'relative' }}>
                  <img src={images[0].data} alt="" onClick={() => setLightbox(0)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => deleteImg(images[0].id)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-x" style={{ fontSize: 10 }} />
                  </button>
                </div>
                <div style={{ ...thumbStyle, position: 'relative' }}>
                  <img src={images[1].data} alt="" onClick={() => setLightbox(1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => deleteImg(images[1].id)}
                    style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-x" style={{ fontSize: 9 }} />
                  </button>
                </div>
                <div style={{ ...thumbStyle, position: 'relative' }} onClick={() => setLightbox(2)}>
                  <img src={images[2].data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {images.length > 3 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 500, borderRadius: 6 }}>
                      +{images.length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function NoteCard({ note, screenshots, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.note_text || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function saveNote() {
    setSaving(true)
    await supabase.from('company_notes').update({ note_text: text, updated_at: new Date().toISOString() }).eq('id', note.id)
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  async function uploadScreenshot(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target.result
      await supabase.from('company_note_screenshots').insert({ note_id: note.id, data: dataUrl, filename: file.name })
      setUploading(false)
      onRefresh()
    }
    reader.readAsDataURL(file)
  }

  const myScreenshots = screenshots.filter(s => s.note_id === note.id)
  const updatedDate = note.updated_at ? new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  return (
    <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 11px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{note.company_name}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <label title="Add screenshot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, cursor: 'pointer', color: 'var(--text3)', fontSize: 13, borderRadius: 4 }}>
            <i className="ti ti-paperclip" />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadScreenshot} />
          </label>
          <button onClick={() => { setEditing(e => !e); setText(note.note_text || '') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, fontSize: 13, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-edit" />
          </button>
        </div>
      </div>

      <ScreenshotGrid images={myScreenshots} noteId={note.id} onRefresh={onRefresh} />

      {editing ? (
        <div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
            style={{ width: '100%', fontSize: 12, color: 'var(--text)', lineHeight: 1.5, padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'var(--surface)', resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            <button onClick={saveNote} disabled={saving}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: note.note_text ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontStyle: note.note_text ? 'normal' : 'italic', cursor: 'text' }}
          onClick={() => setEditing(true)}>
          {note.note_text || 'Click to add notes...'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)', cursor: 'pointer', padding: '2px 6px', border: '0.5px dashed var(--border-strong)', borderRadius: 5 }}>
          <i className="ti ti-plus" style={{ fontSize: 10 }} />
          {uploading ? 'Uploading...' : 'Add screenshot'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadScreenshot} disabled={uploading} />
        </label>
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

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
      {verticals.map((v, idx) => {
        const colTargets = targets.filter(t => t.vertical_id === v.id)
        const colNotes = notes.filter(n => colTargets.some(t => t.name === n.company_name))
        const accentColor = colColors[idx % colColors.length]
        return (
          <div key={v.id} style={{ minWidth: 260, maxWidth: 260, background: 'var(--surface2)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid ' + accentColor }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v.name}</span>
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
      })}
      {(() => {
        const unassigned = targets.filter(t => !t.vertical_id)
        if (!unassigned.length) return null
        return (
          <div style={{ minWidth: 260, maxWidth: 260, background: 'var(--surface2)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid #888780' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Unassigned</span>
              <span style={{ fontSize: 11, background: 'var(--surface)', border: '0.5px solid var(--border-strong)', color: 'var(--text3)', borderRadius: 10, padding: '1px 8px' }}>{unassigned.length}</span>
            </div>
            {unassigned.map(t => {
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
      })()}
    </div>
  )
}
