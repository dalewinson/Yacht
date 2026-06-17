import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Twilio posts application/x-www-form-urlencoded. We create a ticket on the boat
// whose owner_phone matches the sender, capture any MMS photos, and text back a
// confirmation.
export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const accountSid = process.env.TWILIO_ACCOUNT_SID

  const form = await req.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = typeof v === 'string' ? v : ''

  // Verify the request really came from Twilio.
  if (authToken) {
    const sig = req.headers.get('x-twilio-signature') ?? ''
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
    const url = `${proto}://${host}/api/sms`
    const valid = twilio.validateRequest(authToken, sig, url, params)
    if (!valid) return new NextResponse('Invalid signature', { status: 403 })
  }

  const from = params.From ?? ''
  const body = (params.Body ?? '').trim()
  const numMedia = parseInt(params.NumMedia ?? '0', 10) || 0

  const supabase = await createServiceClient()

  // Route to the boat whose owner_phone matches the sender; fall back to first vessel.
  const { data: vesselsRaw } = await supabase.from('vessels').select('id, name, owner_phone').order('created_at')
  const vessels = (vesselsRaw ?? []) as { id: string; name: string; owner_phone: string | null }[]
  if (!vessels.length) return twiml('No boats are set up yet.')

  const digits = (s: string) => (s || '').replace(/\D/g, '').slice(-10)
  const fromDigits = digits(from)
  const matched = vessels.find((v) => digits(v.owner_phone ?? '') === fromDigits) ?? vessels[0]

  const title = (body ? body.split('\n')[0].slice(0, 70) : `Photo report from ${from || 'unknown'}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket, error: tErr } = await (supabase as any).from('tickets').insert({
    vessel_id: matched.id,
    title,
    description: body || null,
    source: 'sms',
    priority: 'medium',
    reported_by: from || null,
  }).select().single()

  if (tErr || !ticket) return twiml('Sorry — could not log your report. Please try again.')

  // Capture MMS media.
  let saved = 0
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`]
    const ctype = params[`MediaContentType${i}`] || 'application/octet-stream'
    if (!mediaUrl) continue
    try {
      const headers: Record<string, string> = {}
      if (accountSid && authToken) {
        headers.Authorization = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
      const res = await fetch(mediaUrl, { headers })
      if (!res.ok) continue
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
  return twiml(`Got it — logged a ticket for ${matched.name}${mediaNote}. Thank you!`)
}

function twiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'text/xml' } })
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}
