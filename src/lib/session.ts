import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AUTH_COOKIE, USER_COOKIE, sha256Hex } from '@/lib/auth'

export type Role = 'admin' | 'owner' | 'crew'
export type Session = { userId: string | null; name: string; role: Role }

// Resolves who is signed in, server-side. Admin = shared app password;
// owner/crew = a per-person passcode (see /api/login). Returns null when the
// gate is on and nobody valid is signed in.
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const password = process.env.APP_PASSWORD

  // Gate disabled (local/dev with no password) → treat as admin.
  if (!password) return { userId: null, name: 'Admin', role: 'admin' }

  // Admin via the shared password.
  if (store.get(AUTH_COOKIE)?.value === (await sha256Hex(password))) {
    return { userId: null, name: 'Admin', role: 'admin' }
  }

  // Per-person session cookie "<userId>.<token>".
  const raw = store.get(USER_COOKIE)?.value
  if (raw) {
    const dot = raw.indexOf('.')
    const userId = dot > 0 ? raw.slice(0, dot) : ''
    const token = dot > 0 ? raw.slice(dot + 1) : ''
    if (userId && token) {
      const supabase = await createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('app_users')
        .select('id, name, role, passcode_hash, active').eq('id', userId).maybeSingle()
      if (data && data.active) {
        const expected = await sha256Hex(userId + '.' + data.passcode_hash)
        if (expected === token) return { userId: data.id, name: data.name, role: data.role as Role }
      }
    }
  }

  return null
}
