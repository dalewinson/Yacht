import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import { fmtDate } from '@/lib/utils'
import PrintButton from '@/components/PrintButton'

type ServiceRow = {
  id: string; equipment_id: string | null; equipment_name: string; date: string
  work_performed: string; tech: string | null; cost: number | null; parts_used: string | null; notes: string | null
}

export default async function ServiceHistoryReport({
  searchParams,
}: {
  searchParams: Promise<{ eq?: string; from?: string; to?: string }>
}) {
  const { eq, from, to } = await searchParams
  const supabase = await createClient()
  const { activeId, active } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any).from('service_log').select('*').eq('vessel_id', vid)
  if (eq) q = q.eq('equipment_id', eq)
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data } = await q.order('date', { ascending: false })
  const rows = (data ?? []) as ServiceRow[]

  const eqName = eq ? rows[0]?.equipment_name ?? 'Selected equipment' : 'All equipment'
  const totalCost = rows.reduce((s, r) => s + (r.cost ?? 0), 0)
  const range = from || to ? `${from ? fmtDate(from) : 'start'} – ${to ? fmtDate(to) : 'today'}` : 'All dates'

  return (
    <div className="bg-[var(--color-background-tertiary)] min-h-full">
      <div className="no-print flex items-center justify-between max-w-[800px] mx-auto px-4 pt-4">
        <Link href="/reports" className="text-[12px] text-[#185FA5] hover:underline inline-flex items-center gap-1">
          <i className="ti ti-arrow-left text-[13px]" /> Back
        </Link>
        <PrintButton />
      </div>

      <div id="print-root" className="max-w-[800px] mx-auto bg-white p-8 my-4 text-[12px] text-[#1c1917] leading-relaxed">
        <div className="flex items-start justify-between border-b-2 border-[#185FA5] pb-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#185FA5] font-semibold">Fairwinds</div>
            <h1 className="text-[18px] font-bold mt-0.5">Service History</h1>
            <div className="text-[13px] font-medium mt-0.5">{active?.name ?? ''}</div>
          </div>
          <div className="text-right text-[11px] text-[#57534e]">
            <div><span className="font-semibold">{eqName}</span></div>
            <div>{range}</div>
            <div>{rows.length} record{rows.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-[12px] text-[#57534e]">No service records match this selection.</div>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[#57534e] border-b border-[#d6d3d1]">
                <th className="py-1.5 pr-2 w-[12%]">Date</th>
                <th className="py-1.5 pr-2 w-[18%]">Equipment</th>
                <th className="py-1.5 pr-2 w-[40%]">Work performed</th>
                <th className="py-1.5 pr-2 w-[14%]">Tech</th>
                <th className="py-1.5 pr-2 w-[16%] text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-[#ededec] align-top">
                  <td className="py-1.5 pr-2">{fmtDate(r.date)}</td>
                  <td className="py-1.5 pr-2 font-medium">{r.equipment_name}</td>
                  <td className="py-1.5 pr-2">
                    {r.work_performed}
                    {r.parts_used && <div className="text-[10px] text-[#78716c]">Parts: {r.parts_used}</div>}
                    {r.notes && <div className="text-[10px] text-[#78716c]">{r.notes}</div>}
                  </td>
                  <td className="py-1.5 pr-2">{r.tech ?? '—'}</td>
                  <td className="py-1.5 pr-2 text-right">{r.cost == null ? '—' : `$${r.cost.toLocaleString('en-US')}`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#185FA5] font-semibold">
                <td className="py-1.5 pr-2" colSpan={4}>Total</td>
                <td className="py-1.5 pr-2 text-right">${totalCost.toLocaleString('en-US')}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <div className="text-[10px] text-[#a8a29e] mt-6 pt-3 border-t border-[#ededec]">
          Generated {fmtDate(new Date().toISOString().slice(0, 10))} · Fairwinds maintenance tracker
        </div>
      </div>
    </div>
  )
}
