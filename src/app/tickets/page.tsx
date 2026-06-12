import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import TicketsTable from '@/components/TicketsTable'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const { data: tickets } = await supabase
    .from('tickets').select('*, vessels(name)').eq('vessel_id', vid)
    .order('created_at', { ascending: false })

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[17px] font-medium text-[var(--color-text-primary)]">Trouble Tickets</h1>
      </div>
      <TicketsTable tickets={tickets ?? []} vesselId={activeId} />
    </div>
  )
}
