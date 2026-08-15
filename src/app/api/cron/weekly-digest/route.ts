import { NextRequest, NextResponse } from 'next/server'
import { getDigestConfig } from '@/lib/settings'
import { sendWeeklyDigests } from '@/lib/digest'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

const TZ = 'America/Los_Angeles'
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function pacificNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: parseInt(get('hour')) || 0, weekday: WD[get('weekday')] ?? 0 }
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET
  const provided = (req.headers.get('authorization') || '').replace('Bearer ', '') || (req.nextUrl.searchParams.get('key') ?? '')
  if (!secret || provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const cfg = await getDigestConfig()
  if (!cfg.enabled) return NextResponse.json({ sent: 0, skipped: 'disabled' })

  const { date, weekday } = pacificNow()
  // Send on the chosen weekday (once). The daily job fires ~morning Pacific;
  // the exact hour isn't gated so DST can't silently block it.
  if (weekday !== cfg.day) return NextResponse.json({ sent: 0, skipped: 'not-scheduled-day' })
  if (cfg.lastSent === date) return NextResponse.json({ sent: 0, skipped: 'already-sent' })

  const result = await sendWeeklyDigests(cfg.adminEmail)

  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ digest_last_sent: date }).eq('id', 1)

  return NextResponse.json({ ...result, date })
}
