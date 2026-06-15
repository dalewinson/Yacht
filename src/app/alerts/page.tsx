import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import { computeService } from '@/lib/utils'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']
type Part = Database['public']['Tables']['parts']['Row']
type Ticket = Database['public']['Tables']['tickets']['Row']

type Alert = { severity: 'high' | 'med'; title: string; detail: string; href: string; icon: string }

export default async function AlertsPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const [{ data: eqRaw }, { data: partsRaw }, { data: tkRaw }] = await Promise.all([
    supabase.from('equipment').select('*').eq('vessel_id', vid),
    supabase.from('parts').select('*').eq('vessel_id', vid),
    supabase.from('tickets').select('*').eq('vessel_id', vid),
  ])
  const equipment = (eqRaw ?? []) as Equipment[]
  const parts = (partsRaw ?? []) as Part[]
  const tickets = (tkRaw ?? []) as Ticket[]

  const alerts: Alert[] = []

  for (const e of equipment) {
    const svc = computeService(e)
    if (svc.status === 'overdue') alerts.push({ severity: 'high', title: `${e.name} — service overdue`, detail: svc.label, href: '/equipment', icon: 'ti-tools' })
    else if (svc.status === 'due') alerts.push({ severity: 'med', title: `${e.name} — service due soon`, detail: svc.label, href: '/equipment', icon: 'ti-tools' })
  }

  for (const t of tickets) {
    const openish = t.status !== 'resolved' && t.status !== 'closed'
    if (openish && (t.priority === 'urgent' || t.priority === 'high')) {
      alerts.push({ severity: t.priority === 'urgent' ? 'high' : 'med', title: t.title, detail: `${t.priority} priority ticket`, href: '/tickets', icon: 'ti-ticket' })
    }
  }

  for (const p of parts) {
    if (p.qty_on_hand <= p.reorder_at) {
      alerts.push({ severity: 'med', title: `${p.name} — low stock`, detail: `${p.qty_on_hand} on hand (reorder at ${p.reorder_at})`, href: '/parts', icon: 'ti-package' })
    }
  }

  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
  const high = alerts.filter(a => a.severity === 'high').length
  const med = alerts.filter(a => a.severity === 'med').length

  return (
    <div className="p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Alerts</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          Everything needing attention on this boat — overdue service, low parts, and open priority tickets.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-14 border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] bg-[var(--color-background-primary)]">
          <i className="ti ti-circle-check text-[32px] text-[#3B6D11]" />
          <p className="text-[14px] font-medium text-[var(--color-text-primary)] mt-2">All clear</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">No overdue service, low parts, or priority tickets.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--border-radius-md)] text-[12px] font-medium bg-[#FBE6E6] text-[#A32D2D]">
              <i className="ti ti-alert-circle text-[13px]" /> {high} urgent
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--border-radius-md)] text-[12px] font-medium bg-[#FAEEDA] text-[#854F0B]">
              <i className="ti ti-alert-triangle text-[13px]" /> {med} to watch
            </span>
          </div>

          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
            {alerts.map((a, i) => (
              <Link key={i} href={a.href}
                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-tertiary)] last:border-0 hover:bg-[var(--color-background-secondary)]">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${a.severity === 'high' ? 'bg-[#FBE6E6] text-[#A32D2D]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}>
                  <i className={`ti ${a.icon} text-[14px]`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">{a.title}</span>
                  <span className="block text-[11px] text-[var(--color-text-secondary)]">{a.detail}</span>
                </span>
                <i className="ti ti-chevron-right text-[14px] text-[var(--color-text-tertiary)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
