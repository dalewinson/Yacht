'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ACTIVE_VESSEL_COOKIE, type VesselLite } from '@/lib/vessel-shared'

function setActiveVessel(id: string) {
  document.cookie = `${ACTIVE_VESSEL_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
}

export default function VesselSwitcher({
  vessels,
  activeId,
}: {
  vessels: VesselLite[]
  activeId: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const active = vessels.find((v) => v.id === activeId) ?? null

  function choose(id: string) {
    setActiveVessel(id)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center justify-between gap-2 group"
      >
        <span className="min-w-0">
          <span className="block text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider">Boat</span>
          <span className="block text-[14px] font-medium text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
            <i className="ti ti-ship text-[15px]" /> {active?.name ?? 'No boat'}
          </span>
        </span>
        <i className={`ti ti-chevron-down text-[14px] text-[var(--color-text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[var(--color-background-primary)] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] shadow-lg overflow-hidden">
            {vessels.map((v) => (
              <button
                key={v.id}
                onClick={() => choose(v.id)}
                className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[var(--color-background-secondary)] ${
                  v.id === activeId ? 'text-[#185FA5] font-medium' : 'text-[var(--color-text-primary)]'
                }`}
              >
                <i className={`ti ${v.id === activeId ? 'ti-check' : 'ti-ship'} text-[13px]`} />
                <span className="truncate">{v.name}</span>
              </button>
            ))}
            <button
              onClick={() => { setOpen(false); setAdding(true) }}
              className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 border-t border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
            >
              <i className="ti ti-plus text-[13px]" /> Add a boat
            </button>
          </div>
        </>
      )}

      {adding && (
        <AddBoatModal
          onClose={() => setAdding(false)}
          onCreated={(id) => { setAdding(false); choose(id) }}
        />
      )}
    </div>
  )
}

function AddBoatModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Boat name is required.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any).from('vessels').insert({
      name: name.trim(),
      owner_name: ownerName.trim() || '—',
      owner_phone: ownerPhone.trim() || '—',
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    onCreated((data as { id: string }).id)
  }

  const input = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[400px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Add a boat</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="space-y-[10px]">
          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Boat name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. M/Y Serenity" className={input} />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Owner name</label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Owner phone</label>
            <input type="text" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+1…" className={input} />
          </div>
          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">{saving ? 'Adding…' : 'Add boat'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
