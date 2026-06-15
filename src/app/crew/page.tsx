import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import ContactsClient from '@/components/ContactsClient'
import type { Database } from '@/types/database'

type Crew = Database['public']['Tables']['crew']['Row']

export default async function CrewPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const { data } = await supabase.from('crew').select('*').eq('vessel_id', vid).order('name')

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Contacts</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          Crew, owner, technicians, vendors, marinas, and emergency numbers for this boat.
        </p>
      </div>
      <ContactsClient contacts={(data ?? []) as Crew[]} vesselId={activeId} />
    </div>
  )
}
