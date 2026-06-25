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
  const msg = body.toUpperCase()
  const numMedia = parseInt(params.NumMedia ?? '0', 10) || 0

  const supabase = await createServiceClient()

  const digitsOf = (s: string) => (s || '').replace(/\D/g, '').slice(-10)
  const fromDigits = digitsOf(from)

  // Carrier opt-out/help keywords are handled by Twilio automatically — if one
  // reaches us, don't create a ticket.
  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'HELP', 'INFO'].includes(msg)) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response/>', { status: 200, headers: { 'Content-Type': 'text/xml' } })
  }

  // ─── Double opt-in gate ───
  const OPTIN_WORDS = ['YES', 'START', 'JOIN', 'UNSTOP', 'SUBSCRIBE']
  const OPTIN_PROMPT = 'Fairwinds maintenance line: reply YES to receive maintenance ticket confirmations for your vessel. About a few msgs/month. Msg & data rates may apply. Reply HELP for help, STOP to opt out.'
  const OPTIN_CONFIRM = "You're subscribed to Fairwinds maintenance texts. Text a maintenance issue (add a photo if helpful) to log a ticket and we'll reply to confirm. Msg & data rates may apply. Reply STOP to opt out, HELP for help."

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: optin } = await (supabase as any).from('sms_optins').select('opted_in').eq('phone', fromDigits).maybeSingle()
  const optedIn = !!optin?.opted_in

  if (!optedIn) {
    if (OPTIN_WORDS.includes(msg)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('sms_optins').upsert({ phone: fromDigits, full_from: from, opted_in: true, opted_in_at: new Date().toISOString() })
      return twiml(OPTIN_CONFIRM)
    }
    // first contact (or not yet confirmed) → prompt to opt in, don't log a ticket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('sms_optins').upsert({ phone: fromDigits, full_from: from, opted_in: false })
    return twiml(OPTIN_PROMPT)
  }

  if (OPTIN_WORDS.includes(msg)) {
    return twiml("You're already subscribed to Fairwinds maintenance texts. Text a maintenance issue to log a ticket.")
  }

  // Route to the boat whose owner_phone matches the sender; fall back to first vessel.
  const { data: vesselsRaw } = await supabase.from('vessels').select('id, name, owner_phone').order('created_at')
  const vessels = (vesselsRaw ?? []) as { id: string; name: string; owner_phone: string | null }[]
  if (!vessels.length) return twiml('No boats are set up yet.')

  const matched = vessels.find((v) => digitsOf(v.owner_phone ?? '') === fromDigits) ?? vessels[0]

  // Try to attribute the ticket to a known contact on this boat by phone number;
  // otherwise fall back to showing the raw sender number.
  const { data: crewRaw } = await supabase.from('crew').select('id, name, phone').eq('vessel_id', matched.id)
  const contact = ((crewRaw ?? []) as { id: string; name: string; phone: string | null }[])
    .find((c) => digitsOf(c.phone ?? '') === fromDigits) ?? null

  const title = (body ? body.split('\n')[0].slice(0, 70) : `Photo report from ${contact?.name ?? from ?? 'unknown'}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket, error: tErr } = await (supabase as any).from('tickets').insert({
    vessel_id: matched.id,
    title,
    description: body || null,
    source: 'sms',
    priority: 'medium',
    reported_by: contact?.name ?? from ?? null,
    reported_by_id: contact?.id ?? null,
  }).select().single()

  if (tErr || !ticket) return twiml('Sorry — could not log your report. Please try again.')

  // Capture MMS media.
  let saved = 0
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`]
    const ctype = params[`MediaContentType${i}`] || 'application/octet-stream'
    if (!mediaUrl) continue
    try {
      const auth = accountSid && authToken
        ? 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        : ''
      // Twilio's media URL 30x-redirects to a presigned S3 URL. Follow it
      // manually so the Basic-auth header isn't forwarded to S3 (which would
      // reject it). Hit Twilio with auth; fetch the S3 location without auth.
      let res = await fetch(mediaUrl, { headers: auth ? { Authorization: auth } : {}, redirect: 'manual' })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (loc) res = await fetch(loc)
      }
      if (!res.ok) { console.error(`[sms] media ${i} download failed: ${res.status}`); continue }
      const bytes = new Uint8Array(await res.arrayBuffer())
      const ext = ctype.split('/')[1]?.split(';')[0] || 'bin'
      const path = `${ticket.id}/${i}.${ext}`
      const { error: upErr } = await supabase.storage.from('ticket-media').upload(path, bytes, { contentType: ctype, upsert: true })
      if (upErr) { console.error(`[sms] media ${i} upload failed: ${upErr.message}`); continue }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('ticket_attachments').insert({ ticket_id: ticket.id, storage_path: path, content_type: ctype })
      saved++
    } catch (e) {
      console.error(`[sms] media ${i} error:`, e)
    }
  }
  if (numMedia > 0 && !accountSid) console.error('[sms] TWILIO_ACCOUNT_SID missing — cannot fetch MMS media')

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
