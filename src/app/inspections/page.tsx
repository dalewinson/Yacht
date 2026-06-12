import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import InspectionsClient from '@/components/InspectionsClient'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { active, activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const { data: inspectionsRaw } = await (supabase as any)
    .from('inspections').select('*').eq('vessel_id', vid).order('date', { ascending: false })
  const vessels = active ? [active] : []

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Inspections</h1>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Monthly maintenance inspection reports</p>
        </div>
      </div>
      <InspectionsClient
        vessels={(vessels ?? []) as { id: string; name: string }[]}
        inspections={(inspectionsRaw ?? []) as any[]}
      />
    </div>
  )
}
