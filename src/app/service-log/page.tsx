import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import ServiceLogClient from '@/components/ServiceLogClient'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']

export default async function ServiceLogPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: logRaw }, { data: equipRaw }, { data: tasksRaw }] = await Promise.all([
    (supabase as any).from('service_log').select('*').eq('vessel_id', vid).order('date', { ascending: false }),
    supabase.from('equipment').select('*').eq('vessel_id', vid).order('name'),
    (supabase as any).from('service_tasks').select('*').eq('vessel_id', vid),
  ])

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Service Log</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          Record completed work. Logging a service can reset the equipment&apos;s maintenance countdown.
        </p>
      </div>
      <ServiceLogClient
        entries={(logRaw ?? []) as any[]}
        equipment={(equipRaw ?? []) as Equipment[]}
        tasks={(tasksRaw ?? []) as any[]}
        vesselId={activeId}
      />
    </div>
  )
}
