import { createClient } from '@/lib/supabase/server'
import ManualsClient from '@/components/ManualsClient'

export default async function ManualsPage() {
  const supabase = await createClient()

  const [{ data: manualsRaw }, { data: equipmentRaw }, { data: vessels }] = await Promise.all([
    (supabase as any).from('manuals').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('equipment').select('id, name, category').order('name'),
    supabase.from('vessels').select('id, name').order('name'),
  ])

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Manuals</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          Upload equipment manuals, then ask the AI questions answered straight from them.
        </p>
      </div>
      <ManualsClient
        manuals={(manualsRaw ?? []) as any[]}
        equipment={(equipmentRaw ?? []) as { id: string; name: string; category: string }[]}
        vesselId={((vessels ?? [])[0] as { id: string } | undefined)?.id ?? null}
      />
    </div>
  )
}
