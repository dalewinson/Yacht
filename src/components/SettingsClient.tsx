'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ACTIVE_VESSEL_COOKIE } from '@/lib/vessel-shared'
import type { Database } from '@/types/database'

type Vessel = Database['public']['Tables']['vessels']['Row']

export default function SettingsClient({ vessel, vesselCount }: { vessel: Vessel | null; vesselCount: number }) {
  const router = useRouter()
  const [name, setName]           = useState(vessel?.name ?? '')
  const [ownerName, setOwnerName] = useState(vessel?.owner_name ?? '')
  const [ownerPhone, setPhone]    = useState(vessel?.owner_phone ?? '')
  const [notes, setNotes]         = useState(vessel?.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [savedMsg, setSavedMsg]   = useState('')
  const [error, setError]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmText, setConfirmText]     = useState('')
  const [deleting, setDeleting]   = useState(false)

  if (!vessel) {
    return (
      <div className="text-center text-[13px] text-[var(--color-text-secondary)] py-10 border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] bg-[var(--color-background-primary)]">
        No boat selected. Add one from the boat switcher in the sidebar.
      </div>
    )
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Boat name is required.'); return }
    setSaving(true); setError(''); setSavedMsg('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('vessels').update({
      name: name.trim(),
      owner_name: ownerName.trim() || '—',
      owner_phone: ownerPhone.trim() || '—',
      notes: notes.trim() || null,
    }).eq('id', vessel!.id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false); setSavedMsg('Saved.')
    router.refresh()
  }

  async function doDelete() {
    setDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('vessels').delete().eq('id', vessel!.id)
    if (err) { setError(err.message); setDeleting(false); return }
    // forget the active-boat cookie so we fall back to another vessel
    document.cookie = `${ACTIVE_VESSEL_COOKIE}=; path=/; max-age=0; samesite=lax`
    router.push('/')
    router.refresh()
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode, hint?: string) => (
    <div>
      <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>
      {input}
      {hint && <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Boat details */}
      <form onSubmit={save} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5 space-y-[10px]">
        <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">Boat details</h2>
        {field('Boat name *', <input type="text" value={name} onChange={e => setName(e.target.value)} className={cls} />)}
        <div className="grid grid-cols-2 gap-[10px]">
          {field('Owner name', <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className={cls} />)}
          {field('Owner phone', <input type="tel" value={ownerPhone} onChange={e => setPhone(e.target.value)} placeholder="+1…" className={cls} />,
            'Used to route incoming text-message tickets to this boat.')}
        </div>
        {field('Notes', <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${cls} resize-y`} />)}

        {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-1">
          {savedMsg && <span className="text-[12px] text-[#3B6D11]">{savedMsg}</span>}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
            <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="border border-[#E6C4C4] rounded-[var(--border-radius-lg)] p-5 bg-[#FCF6F6]">
        <h2 className="text-[13px] font-semibold text-[#A32D2D] mb-1">Delete this boat</h2>
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
          Permanently removes <strong>{vessel.name}</strong> and all of its equipment, tickets, inspections, manuals, parts, and contacts. This cannot be undone.
        </p>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] border border-[#A32D2D] text-[#A32D2D] rounded-[var(--border-radius-md)] hover:bg-[#FBE6E6]">
            <i className="ti ti-trash text-[13px]" /> Delete boat
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-[var(--color-text-primary)]">Type <strong>{vessel.name}</strong> to confirm:</p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} className={`${cls} max-w-[280px]`} placeholder={vessel.name} />
            <div className="flex gap-2">
              <button onClick={() => { setConfirmDelete(false); setConfirmText('') }}
                className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
              <button onClick={doDelete} disabled={confirmText !== vessel.name || deleting}
                className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#A32D2D] text-white rounded-[var(--border-radius-md)] hover:bg-[#8A2424] disabled:opacity-40">
                <i className="ti ti-trash text-[13px]" /> {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
            {vesselCount <= 1 && <p className="text-[11px] text-[#854F0B]">This is your only boat — you can add a new one afterward from the sidebar.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
