import { createClient } from '@/lib/supabase/server'

export type DueSoon = { days: number; hours: number }

// Global "due soon" lead times (server-side read).
export async function getDueSoon(): Promise<DueSoon> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('app_settings').select('due_soon_days, due_soon_hours').eq('id', 1).single()
  return { days: data?.due_soon_days ?? 14, hours: data?.due_soon_hours ?? 15 }
}

export type DigestConfig = {
  enabled: boolean
  day: number       // 0=Sun … 6=Sat
  hour: number      // local hour 0-23
  adminEmail: string | null
  lastSent: string | null
}

// Weekly-digest schedule + recipient settings (server-side read).
export async function getDigestConfig(): Promise<DigestConfig> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('app_settings')
    .select('digest_enabled, digest_day, digest_hour, digest_admin_email, digest_last_sent').eq('id', 1).single()
  return {
    enabled: !!data?.digest_enabled,
    day: data?.digest_day ?? 1,
    hour: data?.digest_hour ?? 7,
    adminEmail: data?.digest_admin_email ?? null,
    lastSent: data?.digest_last_sent ?? null,
  }
}
