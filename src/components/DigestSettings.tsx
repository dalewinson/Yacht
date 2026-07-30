'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, h) => ({
  h,
  label: `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`,
}))

export default function DigestSettings({ enabled: e0, day: d0, hour: h0, adminEmail: a0 }: {
  enabled: boolean; day: number; hour: number; adminEmail: string | null
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(e0)
  const [day, setDay]         = useState(d0)
  const [hour, setHour]       = useState(h0)
  const [adminEmail, setEmail] = useState(a0 ?? '')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  async function persist() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (supabase as any).from('app_settings')
      .update({ digest_enabled: enabled, digest_day: day, digest_hour: hour, digest_admin_email: adminEmail.trim() || null })
      .eq('id', 1)
  }

  async function save() {
    setSaving(true); setMsg('')
    const { error } = await persist()
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setMsg('Saved.')
    router.refresh()
  }

  async function sendTest() {
    setTesting(true); setTestMsg('')
    await persist() // make sure the saved admin email matches what's on screen
    try {
      const res = await fetch('/api/digest/test', { method: 'POST' })
      const data = await res.json()
      setTestMsg(data.ok ? `Sent — check ${adminEmail || 'your inbox'}.` : (data.error || 'Could not send.'))
    } catch {
      setTestMsg('Could not send — try again.')
    }
    setTesting(false)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const lbl = "block text-[11px] text-[var(--color-text-secondary)] mb-[3px]"

  return (
    <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Weekly email digest</h2>
        <a href="/api/digest/preview" target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#185FA5] hover:underline inline-flex items-center gap-1">
          <i className="ti ti-eye text-[13px]" /> Preview
        </a>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] mb-3">
        Emails a summary of alerts + open tickets. You get all boats; owners/crew get their boat(s) (needs an email on their profile).
      </p>

      <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer mb-3">
        <input type="checkbox" checked={enabled} onChange={ev => setEnabled(ev.target.checked)} /> Send the weekly digest
      </label>

      <div className="grid grid-cols-2 gap-[10px]">
        <div>
          <label className={lbl}>Day</label>
          <select value={day} onChange={ev => setDay(Number(ev.target.value))} className={cls}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Time (Pacific)</label>
          <select value={hour} onChange={ev => setHour(Number(ev.target.value))} className={cls}>
            {HOURS.map(o => <option key={o.h} value={o.h}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-[10px]">
        <label className={lbl}>Your email (all-boats digest)</label>
        <input type="email" value={adminEmail} onChange={ev => setEmail(ev.target.value)} placeholder="you@example.com" className={cls} />
      </div>

      <div className="mt-3 rounded-[var(--border-radius-md)] bg-[var(--color-background-secondary)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
        <i className="ti ti-info-circle text-[12px] mr-1" />
        Delivery is via Resend once <strong>RESEND_API_KEY</strong> and <strong>DIGEST_FROM</strong> are set in Vercel. Use <strong>Preview</strong> to see the content and <strong>Send test</strong> to email yourself a copy. (On the current hosting plan the send time may be approximate.)
      </div>

      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3">
          <button onClick={sendTest} disabled={testing} className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)] disabled:opacity-50">
            <i className="ti ti-send text-[13px]" /> {testing ? 'Sending…' : 'Send test'}
          </button>
          {testMsg && <span className="text-[11px] text-[var(--color-text-secondary)]">{testMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-[12px] text-[#3B6D11]">{msg}</span>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
            <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
