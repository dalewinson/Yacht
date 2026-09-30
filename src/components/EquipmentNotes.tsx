'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Note = { id: string; note: string; author: string | null; created_at: string }

function fmtWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Running notes log for a single piece of equipment: dated entries that are
// appended (not overwritten). Self-contained — fetches, adds, and deletes its
// own rows. Reused on the Equipment edit modal and inside the inspection form.
export default function EquipmentNotes({ equipmentId, vesselId, author = 'Dale' }: {
  equipmentId: string
  vesselId: string | null
  author?: string
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('equipment_notes')
        .select('id, note, author, created_at').eq('equipment_id', equipmentId).order('created_at', { ascending: false })
      if (active) { setNotes((data ?? []) as Note[]); setLoading(false) }
    })()
    return () => { active = false }
  }, [equipmentId])

  async function add() {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('equipment_notes')
      .insert({ equipment_id: equipmentId, vessel_id: vesselId, note: body, author: author || null })
      .select('id, note, author, created_at').single()
    setBusy(false)
    if (error) return
    setNotes(prev => [data as Note, ...prev])
    setText('')
  }

  async function remove(id: string) {
    const prev = notes
    setNotes(notes.filter(n => n.id !== id)) // optimistic
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('equipment_notes').delete().eq('id', id)
    if (error) setNotes(prev) // roll back on failure
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add() }}
          rows={2}
          placeholder="Add a note… (e.g. slight oil weep at rear seal)"
          className="flex-1 px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y"
        />
        <button type="button" onClick={add} disabled={busy || !text.trim()}
          className="px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50 shrink-0">
          {busy ? 'Adding…' : 'Add note'}
        </button>
      </div>

      {loading ? (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">No notes yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map(n => (
            <li key={n.id} className="group flex items-start gap-2 border-l-2 border-[var(--color-border-secondary)] pl-2 py-0.5">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[var(--color-text-primary)] whitespace-pre-wrap break-words">{n.note}</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)]">{fmtWhen(n.created_at)}{n.author ? ` · ${n.author}` : ''}</div>
              </div>
              <button type="button" onClick={() => remove(n.id)} title="Delete note"
                className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D] opacity-0 group-hover:opacity-100 shrink-0">
                <i className="ti ti-trash text-[12px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
