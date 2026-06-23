'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DueSoonSettings({ days: initDays, hours: initHours }: { days: number; hours: number }) {
  const router = useRouter()
  const [days, setDays]   = useState(String(initDays))
  const [hours, setHours] = useState(String(initHours))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState('')
  const [error, setError]   = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(''); setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('app_settings').update({
      due_soon_days: parseInt(days) || 0,
      due_soon_hours: parseInt(hours) || 0,
    }).eq('id', 1)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved('Saved.')
    router.refresh()
  }

  const cls = "w-[90px] px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

  return (
    <form onSubmit={save} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5">
      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">&quot;Due soon&quot; warnings</h2>
      <p className="text-[11px] text-[var(--color-text-secondary)] mb-3">How far ahead a service task turns amber on Equipment, Dashboard &amp; Alerts.</p>

      <div className="flex flex-wrap gap-5">
        <div>
          <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Date-based: warn within</label>
          <div className="flex items-center gap-1.5"><input type="number" min="0" value={days} onChange={e => setDays(e.target.value)} className={cls} /><span className="text-[12px] text-[var(--color-text-secondary)]">days</span></div>
        </div>
        <div>
          <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Hours-based: warn within</label>
          <div className="flex items-center gap-1.5"><input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} className={cls} /><span className="text-[12px] text-[var(--color-text-secondary)]">hours</span></div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
          <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-[12px] text-[#3B6D11]">{saved}</span>}
        {error && <span className="text-[12px] text-[#A32D2D]">{error}</span>}
      </div>
    </form>
  )
}
