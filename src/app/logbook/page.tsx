import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import LogbookClient from '@/components/LogbookClient'
import type { Database } from '@/types/database'

type Trip = Database['public']['Tables']['trips']['Row']

export default async function LogbookPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: tripsRaw }, { data: equipRaw }, { data: crewRaw }] = await Promise.all([
    (supabase as any).from('trips').select('*').eq('vessel_id', vid).order('date', { ascending: false }),
    supabase.from('equipment').select('id, name, current_hours').eq('vessel_id', vid).order('name'),
    supabase.from('crew').select('name, role').eq('vessel_id', vid).order('name'),
  ])

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Logbook</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          A record of each outing. Ending engine/gen hours update the equipment&apos;s current hours automatically.
        </p>
      </div>
      <LogbookClient
        trips={(tripsRaw ?? []) as Trip[]}
        equipment={(equipRaw ?? []) as { id: string; name: string; current_hours: number | null }[]}
        crew={(crewRaw ?? []) as { name: string; role: string }[]}
        vesselId={activeId}
      />
    </div>
  )
}
