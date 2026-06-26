import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import { fmtDate } from '@/lib/utils'
import PrintButton from '@/components/PrintButton'
import type { TicketPriority, TicketStatus } from '@/types/database'

type IssueRow = {
  id: string; title: string; description: string | null; category: string | null
  priority: TicketPriority; status: TicketStatus; reported_by: string | null; created_at: string
}

const PRIORITY_ORDER: TicketPriority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_LABEL: Record<TicketPriority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_COLOR: Record<TicketPriority, string> = { urgent: '#A32D2D', high: '#B45309', medium: '#185FA5', low: '#57534e' }

export default async function OpenIssuesReport() {
  const supabase = await createClient()
  const { activeId, active } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tickets').select('id,title,description,category,priority,status,reported_by,created_at')
    .eq('vessel_id', vid).in('status', ['open', 'in_progress']).order('created_at', { ascending: false })
  const rows = (data ?? []) as IssueRow[]

  const byPriority = PRIORITY_ORDER
    .map(p => ({ priority: p, items: rows.filter(r => r.priority === p) }))
    .filter(g => g.items.length > 0)

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
            <h1 className="text-[18px] font-bold mt-0.5">Open Issues</h1>
            <div className="text-[13px] font-medium mt-0.5">{active?.name ?? ''}</div>
          </div>
          <div className="text-right text-[11px] text-[#57534e]">
            <div><span className="font-semibold">{rows.length} open</span></div>
            <div>As of {fmtDate(new Date().toISOString().slice(0, 10))}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-[12px] text-[#3B6D11]">No open issues — all tickets are resolved or closed. 🎉</div>
        ) : (
          byPriority.map(g => (
            <div key={g.priority} className="mb-5">
              <div className="text-[12px] font-semibold mb-1.5" style={{ color: PRIORITY_COLOR[g.priority] }}>
                {PRIORITY_LABEL[g.priority]} ({g.items.length})
              </div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {g.items.map(r => (
                    <tr key={r.id} className="border-b border-[#ededec] align-top">
                      <td className="py-1.5 pr-2 w-[28%] font-medium">{r.title}</td>
                      <td className="py-1.5 pr-2 w-[14%] text-[#57534e]">{r.category ?? '—'}</td>
                      <td className="py-1.5 pr-2 text-[#57534e]">
                        {r.description || '—'}
                        <span className="block text-[10px] text-[#a8a29e]">
                          {r.status === 'in_progress' ? 'In progress' : 'Open'} · reported {fmtDate(r.created_at)}{r.reported_by ? ` · ${r.reported_by}` : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        <div className="text-[10px] text-[#a8a29e] mt-6 pt-3 border-t border-[#ededec]">
          Generated {fmtDate(new Date().toISOString().slice(0, 10))} · Fairwinds maintenance tracker
        </div>
      </div>
    </div>
  )
}
