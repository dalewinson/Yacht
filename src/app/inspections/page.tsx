import { createClient } from '@/lib/supabase/server'
import InspectionsClient from '@/components/InspectionsClient'

export default async function InspectionsPage() {
  const supabase = await createClient()

  const [{ data: vessels }, { data: inspectionsRaw }] = await Promise.all([
    supabase.from('vessels').select('id, name').order('name'),
    (supabase as any).from('inspections').select('*').order('date', { ascending: false }),
  ])

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
