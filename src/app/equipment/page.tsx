import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import EquipmentTable from '@/components/EquipmentTable'

export default async function EquipmentPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: equipment }, { data: tasks }] = await Promise.all([
    supabase.from('equipment').select('*').eq('vessel_id', vid).order('name'),
    (supabase as any).from('service_tasks').select('*').eq('vessel_id', vid),
  ])

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[17px] font-medium text-[var(--color-text-primary)]">Equipment</h1>
      </div>
      <EquipmentTable equipment={equipment ?? []} tasks={(tasks ?? []) as any[]} vesselId={activeId} />
    </div>
  )
}
