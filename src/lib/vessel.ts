import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_VESSEL_COOKIE, type VesselLite } from '@/lib/vessel-shared'

export { ACTIVE_VESSEL_COOKIE }
export type { VesselLite }

// Resolves the currently-selected boat from the cookie, falling back to the
// first vessel. Every page uses this to scope its data to one boat.
export async function getVesselContext(): Promise<{
  vessels: VesselLite[]
  activeId: string | null
  active: VesselLite | null
}> {
  const supabase = await createClient()
  const { data } = await supabase.from('vessels').select('id, name').order('name')
  const vessels = (data ?? []) as VesselLite[]

  const cookieStore = await cookies()
  const cookieId = cookieStore.get(ACTIVE_VESSEL_COOKIE)?.value
  const active = vessels.find((v) => v.id === cookieId) ?? vessels[0] ?? null

  return { vessels, activeId: active?.id ?? null, active }
}
