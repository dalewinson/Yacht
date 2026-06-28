import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import InspectionsClient from '@/components/InspectionsClient'
import { INSPECTION_SECTIONS, type SectionDef } from '@/lib/inspection-template'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { active, activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: inspectionsRaw }, { data: equipRaw }, { data: linksRaw }, { data: tmplRow }] = await Promise.all([
    (supabase as any).from('inspections').select('*').eq('vessel_id', vid).order('date', { ascending: false }),
    supabase.from('equipment').select('id, name, category').eq('vessel_id', vid).order('name'),
    (supabase as any).from('inspection_links').select('section_id, item_key, equipment_id').eq('vessel_id', vid),
    (supabase as any).from('inspection_templates').select('sections').eq('vessel_id', vid).maybeSingle(),
  ])
  const vessels = active ? [active] : []
  // The vessel's template, or the built-in default if none has been saved yet.
  const stored = (tmplRow?.sections ?? []) as SectionDef[]
  const template = stored.length ? stored : INSPECTION_SECTIONS

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
        equipment={(equipRaw ?? []) as { id: string; name: string; category: string }[]}
        links={(linksRaw ?? []) as { section_id: string; item_key: string; equipment_id: string | null }[]}
        template={template}
      />
    </div>
  )
}
