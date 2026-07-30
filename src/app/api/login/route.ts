import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, USER_COOKIE, sha256Hex } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

export async function POST(req: NextRequest) {
  let password = ''
  try { password = (await req.json()).password ?? '' } catch { /* ignore */ }
  password = String(password).trim()

  const appPassword = process.env.APP_PASSWORD

  // 1) Admin via the shared app password.
  if (appPassword && password === appPassword) {
    const res = NextResponse.json({ ok: true, role: 'admin' })
    res.cookies.set(AUTH_COOKIE, await sha256Hex(appPassword), COOKIE_OPTS)
    res.cookies.set(USER_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
    return res
  }

  // 2) Per-person passcode.
  if (password) {
    const hash = await sha256Hex(password)
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user } = await (supabase as any).from('app_users')
      .select('id, passcode_hash, active').eq('passcode_hash', hash).eq('active', true).maybeSingle()
    if (user) {
      const token = await sha256Hex(user.id + '.' + user.passcode_hash)
      const res = NextResponse.json({ ok: true, role: 'user' })
      res.cookies.set(USER_COOKIE, `${user.id}.${token}`, COOKIE_OPTS)
      res.cookies.set(AUTH_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
      return res
    }
  }

  return NextResponse.json({ error: 'Incorrect password or passcode.' }, { status: 401 })
}
