'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setError('Incorrect password or passcode.'); setLoading(false); return }
      const next = new URLSearchParams(window.location.search).get('next') || '/'
      window.location.href = next.startsWith('/') ? next : '/'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-background-tertiary)] p-4">
      <div className="w-full max-w-[380px]">
        {/* Brand + context — establishes this as a legitimate private app, not a
            generic credential page (avoids phishing false-positives). */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-[#185FA5] mb-1">
            <i className="ti ti-anchor text-[22px]" />
            <span className="text-[20px] font-semibold">Fairwinds</span>
          </div>
          <div className="text-[12px] text-[var(--color-text-secondary)]">Yacht Maintenance · Newport</div>
        </div>

        <form onSubmit={submit} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-6">
          <h1 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1">Crew sign in</h1>
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-4 leading-relaxed">
            Private maintenance system for the owners and crew of vessels managed by
            Fairwinds, Newport. Enter your access password or personal passcode to continue.
          </p>

          <label htmlFor="passcode" className="block text-[11px] text-[var(--color-text-secondary)] mb-1">Password or passcode</label>
          <input
            id="passcode"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-[10px] py-[8px] text-[13px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
          />
          {error && <p className="text-[12px] text-[#A32D2D] mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-3 px-3 py-[9px] text-[13px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[11px] text-[var(--color-text-tertiary)] mt-4 leading-relaxed">
          Authorized access only. This is a private tool operated by Fairwinds, Newport —
          it never asks for financial or payment information.<br />
          Questions? Visit{' '}
          <a href="https://fairwindsnewport.com" className="text-[#185FA5] hover:underline">fairwindsnewport.com</a>.
        </p>
      </div>
    </div>
  )
}
