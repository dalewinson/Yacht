import { createClient } from '@/lib/supabase/server'
import TicketsTable from '@/components/TicketsTable'

export default async function TicketsPage() {
  const supabase = await createClient()

  const [{ data: tickets }, { data: vessels }] = await Promise.all([
    supabase.from('tickets').select('*, vessels(name)').order('created_at', { ascending: false }),
    supabase.from('vessels').select('id, name').order('name'),
  ])

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[17px] font-medium text-[var(--color-text-primary)]">Trouble Tickets</h1>
      </div>
      <TicketsTable tickets={tickets ?? []} vessels={vessels ?? []} />
    </div>
  )
}
