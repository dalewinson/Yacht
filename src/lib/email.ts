// Email sending via Resend (https://resend.com). Configured through env vars:
//   RESEND_API_KEY  — the Resend API key
//   DIGEST_FROM     — verified sender, e.g. "Fairwinds <maintenance@fairwindsnewport.com>"

export type EmailMessage = { to: string; subject: string; html: string }

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.DIGEST_FROM
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.DIGEST_FROM
  if (!key || !from) {
    console.log(`[digest] (Resend not configured) would email ${msg.to} — "${msg.subject}"`)
    return { ok: false, error: 'not-configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
