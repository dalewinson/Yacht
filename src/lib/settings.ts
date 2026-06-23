import { createClient } from '@/lib/supabase/server'

export type DueSoon = { days: number; hours: number }

// Global "due soon" lead times (server-side read).
export async function getDueSoon(): Promise<DueSoon> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('app_settings').select('due_soon_days, due_soon_hours').eq('id', 1).single()
  return { days: data?.due_soon_days ?? 14, hours: data?.due_soon_hours ?? 15 }
}
