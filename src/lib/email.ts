// Email sending. No provider is wired yet — this is a stub so the digest
// pipeline can be built and previewed now. When a provider is chosen (e.g.
// Resend), implement sendEmail() here and set emailConfigured() to check the key.

export type EmailMessage = { to: string; subject: string; html: string }

export function emailConfigured(): boolean {
  // Becomes: return !!process.env.RESEND_API_KEY (or chosen provider) later.
  return false
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    console.log(`[digest] (no provider yet) would email ${msg.to} — "${msg.subject}"`)
    return { ok: false, error: 'no-provider' }
  }
  // TODO: real send when a provider is wired.
  return { ok: true }
}
