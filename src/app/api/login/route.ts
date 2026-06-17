import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, sha256Hex } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let password = ''
  try { password = (await req.json()).password ?? '' } catch { /* ignore */ }

  const expected = process.env.APP_PASSWORD
  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, await sha256Hex(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
