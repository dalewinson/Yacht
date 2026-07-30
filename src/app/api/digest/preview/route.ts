import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVesselContext } from '@/lib/vessel'
import { buildDigests, renderDigestHtml } from '@/lib/digest'

// Admin-only HTML preview of the weekly digest (all boats combined).
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const { vessels } = await getVesselContext()
  const digests = await buildDigests(vessels.map((v) => v.id))
  const html = renderDigestHtml('Weekly Maintenance Summary (preview)', digests)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
