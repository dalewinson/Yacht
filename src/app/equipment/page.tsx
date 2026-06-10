import { createClient } from '@/lib/supabase/server'
import EquipmentTable from '@/components/EquipmentTable'

export default async function EquipmentPage() {
  const supabase = await createClient()
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .order('name')

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[17px] font-medium text-[var(--color-text-primary)]">Equipment</h1>
      </div>
      <EquipmentTable equipment={equipment ?? []} />
    </div>
  )
}
