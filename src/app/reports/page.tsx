import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import { fmtDate } from '@/lib/utils'
import ReportsServiceForm from '@/components/ReportsServiceForm'

type InspectionLite = { id: string; month: string; year: number; date: string; tech: string | null }
type EquipmentLite = { id: string; name: string }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { activeId, active } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: inspRaw }, { data: equipRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('inspections').select('id,month,year,date,tech').eq('vessel_id', vid).order('date', { ascending: false }),
    supabase.from('equipment').select('id,name').eq('vessel_id', vid).order('name'),
  ])
  const inspections = (inspRaw ?? []) as InspectionLite[]
  const equipment = (equipRaw ?? []) as EquipmentLite[]

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Reports</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          Printable reports for {active?.name ?? 'this vessel'}. Each opens in a new tab — use your browser&apos;s Print → Save as PDF.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Inspection reports */}
        <Card title="Inspection reports" icon="ti-clipboard-list">
          {inspections.length === 0 ? (
            <p className="text-[12px] text-[var(--color-text-tertiary)]">No inspections yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-tertiary)]">
              {inspections.map(i => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <span className="text-[12px] text-[var(--color-text-primary)]">
                    <span className="font-medium">{i.month} {i.year}</span>
                    <span className="text-[var(--color-text-tertiary)]"> · {fmtDate(i.date)}{i.tech ? ` · ${i.tech}` : ''}</span>
                  </span>
                  <a href={`/inspections/${i.id}/report`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">
                    <i className="ti ti-printer text-[12px]" /> Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Service history */}
        <Card title="Service history" icon="ti-tools">
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
            A printable maintenance record — all equipment or one item, over any date range.
          </p>
          <ReportsServiceForm equipment={equipment} />
        </Card>

        {/* Open issues */}
        <Card title="Open issues" icon="ti-alert-triangle">
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
            A summary of all open and in-progress tickets, grouped by priority.
          </p>
          <a href="/reports/issues" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]">
            <i className="ti ti-printer text-[13px]" /> Open report
          </a>
        </Card>
      </div>

      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-4">
        <Link href="/inspections" className="text-[#185FA5] hover:underline">Inspections</Link> ·{' '}
        <Link href="/service-log" className="text-[#185FA5] hover:underline">Service Log</Link> ·{' '}
        <Link href="/tickets" className="text-[#185FA5] hover:underline">Tickets</Link>
      </p>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2.5 flex items-center gap-1.5">
        <i className={`ti ${icon} text-[15px] text-[#185FA5]`} /> {title}
      </h2>
      {children}
    </div>
  )
}
