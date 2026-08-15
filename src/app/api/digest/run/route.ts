import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDigestConfig } from '@/lib/settings'
import { sendWeeklyDigests } from '@/lib/digest'
import { emailConfigured } from '@/lib/email'

export const maxDuration = 60

// Admin-only: send this week's digest to ALL recipients right now (ignores the
// schedule). Useful as a manual fallback and to verify the full send.
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  if (!emailConfigured()) return NextResponse.json({ ok: false, error: 'Email isn’t connected (RESEND_API_KEY / DIGEST_FROM).' })

  const { adminEmail } = await getDigestConfig()
  const result = await sendWeeklyDigests(adminEmail)
  return NextResponse.json({ ok: result.sent > 0, ...result })
}
