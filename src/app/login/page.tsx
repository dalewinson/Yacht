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
      if (!res.ok) { setError('Incorrect password.'); setLoading(false); return }
      const next = new URLSearchParams(window.location.search).get('next') || '/'
      window.location.href = next.startsWith('/') ? next : '/'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-background-tertiary)] p-4">
      <form onSubmit={submit} className="w-full max-w-[340px] bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-6">
        <div className="flex items-center gap-1.5 mb-1">
          <i className="ti ti-anchor text-[18px] text-[#185FA5]" />
          <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">Fairwinds</span>
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">Enter the access password to continue.</p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-[10px] py-[8px] text-[13px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        />
        {error && <p className="text-[12px] text-[#A32D2D] mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-3 px-3 py-[9px] text-[13px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
