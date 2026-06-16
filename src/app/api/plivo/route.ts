import { NextRequest, NextResponse } from 'next/server'
import plivo from 'plivo'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Plivo posts application/x-www-form-urlencoded for inbound messages.
// Params: From, To, Text, Type ('sms'|'mms'), MessageUUID, and Media0..MediaN for MMS.
export async function POST(req: NextRequest) {
  const authId = process.env.PLIVO_AUTH_ID
  const authToken = process.env.PLIVO_AUTH_TOKEN

  const form = await req.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = typeof v === 'string' ? v : ''

  // Verify the request came from Plivo (V3 signature).
  if (authToken) {
    const sig = req.headers.get('x-plivo-signature-v3') ?? ''
    const nonce = req.headers.get('x-plivo-signature-v3-nonce') ?? ''
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
    const url = `${proto}://${host}/api/plivo`
    let valid = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      valid = (plivo as any).validateV3Signature('POST', url, nonce, authToken, sig, params)
    } catch {
      valid = false
    }
    if (!valid) return new NextResponse('Invalid signature', { status: 403 })
  }

  const from = params.From ?? ''
  const body = (params.Text ?? '').trim()

  const supabase = await createServiceClient()

  const { data: vesselsRaw } = await supabase.from('vessels').select('id, name, owner_phone').order('created_at')
  const vessels = (vesselsRaw ?? []) as { id: string; name: string; owner_phone: string | null }[]
  if (!vessels.length) return plivoReply(params, 'No boats are set up yet.')

  const digits = (s: string) => (s || '').replace(/\D/g, '').slice(-10)
  const fromDigits = digits(from)
  const matched = vessels.find((v) => digits(v.owner_phone ?? '') === fromDigits) ?? vessels[0]

  const title = body ? body.split('\n')[0].slice(0, 70) : `Photo report from ${from || 'unknown'}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket, error: tErr } = await (supabase as any).from('tickets').insert({
    vessel_id: matched.id,
    title,
    description: body || null,
    source: 'sms',
    priority: 'medium',
    reported_by: from || null,
  }).select().single()

  if (tErr || !ticket) return plivoReply(params, 'Sorry — could not log your report. Please try again.')

  // Capture MMS media (Media0, Media1, ... up to 10).
  let saved = 0
  for (let i = 0; i < 10; i++) {
    const mediaUrl = params[`Media${i}`]
    if (!mediaUrl) continue
    try {
      const headers: Record<string, string> = {}
      if (authId && authToken) headers.Authorization = 'Basic ' + Buffer.from(`${authId}:${authToken}`).toString('base64')
      let res = await fetch(mediaUrl, { headers })
      if (!res.ok) res = await fetch(mediaUrl) // some media URLs are public
      if (!res.ok) continue
      const ctype = res.headers.get('content-type') || 'application/octet-stream'
      const bytes = new Uint8Array(await res.arrayBuffer())
      const ext = ctype.split('/')[1]?.split(';')[0] || 'bin'
      const path = `${ticket.id}/${i}.${ext}`
      const { error: upErr } = await supabase.storage.from('ticket-media').upload(path, bytes, { contentType: ctype, upsert: true })
      if (upErr) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('ticket_attachments').insert({ ticket_id: ticket.id, storage_path: path, content_type: ctype })
      saved++
    } catch {
      // skip a failed attachment, keep the ticket
    }
  }

  const mediaNote = saved > 0 ? ` (${saved} photo${saved > 1 ? 's' : ''} attached)` : ''
  return plivoReply(params, `Got it — logged a ticket for ${matched.name}${mediaNote}. Thank you!`)
}

// Plivo Messaging XML reply: src = our Plivo number (inbound To), dst = sender (From).
function plivoReply(params: Record<string, string>, message: string) {
  const src = params.To ?? ''
  const dst = params.From ?? ''
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message src="${escapeXml(src)}" dst="${escapeXml(dst)}">${escapeXml(message)}</Message></Response>`
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'text/xml' } })
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}
