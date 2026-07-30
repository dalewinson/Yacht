import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVesselContext } from '@/lib/vessel'
import { getDigestConfig } from '@/lib/settings'
import { buildDigests, renderDigestHtml } from '@/lib/digest'
import { sendEmail, emailConfigured } from '@/lib/email'

// Admin-only: send this week's all-boats digest to the admin email right now,
// to verify the provider is set up. Does not touch the weekly schedule.
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  if (!emailConfigured()) {
    return NextResponse.json({ ok: false, error: 'Email isn’t connected yet — set RESEND_API_KEY and DIGEST_FROM in Vercel, then redeploy.' })
  }
  const { adminEmail } = await getDigestConfig()
  if (!adminEmail) return NextResponse.json({ ok: false, error: 'Add your email in the digest settings and save first.' })

  const { vessels } = await getVesselContext()
  const digests = await buildDigests(vessels.map((v) => v.id))
  const html = renderDigestHtml('Weekly Maintenance Summary (test)', digests)
  const res = await sendEmail({ to: adminEmail, subject: 'Fairwinds — Weekly Summary (test)', html })
  return NextResponse.json(res)
}
