import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSession, type Role } from '@/lib/session'
import { ACTIVE_VESSEL_COOKIE, type VesselLite } from '@/lib/vessel-shared'

export { ACTIVE_VESSEL_COOKIE }
export type { VesselLite }

// Resolves the currently-selected boat from the cookie, scoped to the signed-in
// user's allowed vessels (admins see all). Every page uses this.
export async function getVesselContext(): Promise<{
  vessels: VesselLite[]
  activeId: string | null
  active: VesselLite | null
  role: Role
}> {
  const supabase = await createClient()
  const session = await getSession()
  const role: Role = session?.role ?? 'admin'

  // Order by creation so the default (first) boat is the original one (Patron),
  // not whatever sorts first alphabetically.
  const { data } = await supabase.from('vessels').select('id, name, logo_url').order('created_at', { ascending: true })
  let vessels = (data ?? []) as VesselLite[]

  // Owner/crew only see the boats they're assigned to.
  if (session && session.role !== 'admin' && session.userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: uv } = await (supabase as any).from('user_vessels').select('vessel_id').eq('user_id', session.userId)
    const allowed = new Set(((uv ?? []) as { vessel_id: string }[]).map((r) => r.vessel_id))
    vessels = vessels.filter((v) => allowed.has(v.id))
  }

  const cookieStore = await cookies()
  const cookieId = cookieStore.get(ACTIVE_VESSEL_COOKIE)?.value
  const active = vessels.find((v) => v.id === cookieId) ?? vessels[0] ?? null

  return { vessels, activeId: active?.id ?? null, active, role }
}
