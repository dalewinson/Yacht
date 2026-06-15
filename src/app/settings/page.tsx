import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import SettingsClient from '@/components/SettingsClient'
import type { Database } from '@/types/database'

type Vessel = Database['public']['Tables']['vessels']['Row']

export default async function SettingsPage() {
  const supabase = await createClient()
  const { activeId, vessels } = await getVesselContext()

  let vessel: Vessel | null = null
  if (activeId) {
    const { data } = await supabase.from('vessels').select('*').eq('id', activeId).single()
    vessel = (data ?? null) as Vessel | null
  }

  return (
    <div className="p-6 max-w-[640px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Manage the current boat&apos;s details.</p>
      </div>
      <SettingsClient vessel={vessel} vesselCount={vessels.length} />
    </div>
  )
}
