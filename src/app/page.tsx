import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import { rollupTasks, fmtDate, type TaskLike } from '@/lib/utils'
import { getDueSoon } from '@/lib/settings'
import ServiceStatusBadge from '@/components/ServiceStatusBadge'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import NewTicketButton from '@/components/NewTicketButton'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Equipment   = Database['public']['Tables']['equipment']['Row']
type Ticket      = Database['public']['Tables']['tickets']['Row']
type Part        = Database['public']['Tables']['parts']['Row']
type Inspection  = Database['public']['Tables']['inspections']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { activeId } = await getVesselContext()
  const vid = activeId ?? '00000000-0000-0000-0000-000000000000'

  const { data: equipmentRaw } = await supabase.from('equipment').select('*').eq('vessel_id', vid).order('name')
  const { data: ticketsRaw }   = await supabase.from('tickets').select('*, vessels(name)').eq('vessel_id', vid).order('created_at', { ascending: false })
  const { data: partsRaw }     = await supabase.from('parts').select('*').eq('vessel_id', vid)
  const { data: tasksRaw }     = await (supabase as any).from('service_tasks').select('*').eq('vessel_id', vid)
  const { data: inspectionsRaw } = await supabase.from('inspections').select('*').eq('vessel_id', vid).order('created_at', { ascending: false }).limit(3)

  const equipment   = (equipmentRaw   ?? []) as Equipment[]
  const tickets     = (ticketsRaw     ?? []) as (Ticket & { vessels: { name: string } | null })[]
  const parts       = (partsRaw       ?? []) as Part[]
  const tasks       = (tasksRaw       ?? []) as (TaskLike & { equipment_id: string })[]
  const inspections = (inspectionsRaw ?? []) as Inspection[]

  const ds = await getDueSoon()
  const tasksByEq: Record<string, TaskLike[]> = {}
  for (const t of tasks) (tasksByEq[t.equipment_id] ??= []).push(t)
  const eqRoll = (e: Equipment) => rollupTasks(tasksByEq[e.id] ?? [], e.current_hours, { leadDays: ds.days, leadHours: ds.hours })

  const tk = tickets
  const pt = parts

  const overdueCount  = equipment.filter(e => eqRoll(e).status === 'overdue').length
  const openTickets   = tk.filter(t => t.status !== 'closed' && t.status !== 'resolved')
  const lowParts      = pt.filter(p => p.qty_on_hand <= p.reorder_at)
  const urgentEq      = equipment.filter(e => eqRoll(e).status !== 'ok').slice(0, 5)

  const metrics = [
    { label: 'Equipment',    value: equipment.length,    color: 'text-[var(--color-text-primary)]' },
    { label: 'Overdue',      value: overdueCount,        color: overdueCount > 0 ? 'text-[#A32D2D]' : 'text-[var(--color-text-primary)]' },
    { label: 'Open tickets', value: openTickets.length,  color: openTickets.length > 0 ? 'text-[#854F0B]' : 'text-[var(--color-text-primary)]' },
    { label: 'Parts low',    value: lowParts.length,     color: lowParts.length > 0 ? 'text-[#854F0B]' : 'text-[#3B6D11]' },
  ]

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[17px] font-medium text-[var(--color-text-primary)]">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <NewTicketButton vesselId={activeId} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-[var(--color-background-secondary)] rounded-[var(--border-radius-md)] p-3">
            <div className="text-[11px] text-[var(--color-text-secondary)] mb-1">{m.label}</div>
            <div className={`text-[20px] font-medium ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
        {/* Overdue & due soon */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
          <h3 className="text-[13px] font-medium mb-3.5 text-[var(--color-text-primary)]">Overdue & due soon</h3>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[45%]">Equipment</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[30%]">Due</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[25%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {urgentEq.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[var(--color-text-secondary)] py-3">All up to date</td></tr>
              ) : urgentEq.map(e => {
                const svc = eqRoll(e)
                return (
                <tr key={e.id} className="hover:bg-[var(--color-background-secondary)]">
                  <td className="py-2 pr-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">{e.name}</td>
                  <td className="py-2 pr-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{svc.label}</td>
                  <td className="py-2 border-b border-[var(--color-border-tertiary)]"><ServiceStatusBadge status={svc.status} /></td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Open tickets */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
          <h3 className="text-[13px] font-medium mb-3.5 text-[var(--color-text-primary)]">Open tickets</h3>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[50%]">Ticket</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[25%]">Priority</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pb-[7px] border-b border-[var(--color-border-tertiary)] w-[25%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {openTickets.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[var(--color-text-secondary)] py-3">No open tickets</td></tr>
              ) : openTickets.slice(0, 5).map(t => (
                <tr key={t.id} className="hover:bg-[var(--color-background-secondary)]">
                  <td className="py-2 pr-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <Link href={`/tickets`} className="text-[#185FA5] hover:underline">{t.title}</Link>
                  </td>
                  <td className="py-2 pr-2 border-b border-[var(--color-border-tertiary)]"><PriorityBadge priority={t.priority} /></td>
                  <td className="py-2 border-b border-[var(--color-border-tertiary)]"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Recent inspections */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
          <h3 className="text-[13px] font-medium mb-3.5 text-[var(--color-text-primary)]">Recent inspections</h3>
          {!inspections?.length ? (
            <p className="text-[12px] text-[var(--color-text-secondary)]">No inspections recorded yet.</p>
          ) : inspections.map(insp => {
            // sections is { [sectionId]: { items: { [itemName]: { ok?: boolean } } } }
            const sections = (insp.sections ?? {}) as Record<string, { items?: Record<string, { ok?: boolean }> }>
            const flags = Object.values(sections).reduce((n, sec) => {
              const items = sec?.items ?? {}
              return n + Object.values(items).filter(it => it && it.ok === false).length
            }, 0)
            return (
              <div key={insp.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border-tertiary)] last:border-0">
                <div>
                  <div className="text-[12px] font-medium text-[var(--color-text-primary)]">{insp.month} {insp.year}</div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">{insp.vessel_name} · {insp.tech}</div>
                </div>
                {flags > 0
                  ? <span className="inline-flex items-center px-[7px] py-[2px] rounded-[var(--border-radius-md)] text-[11px] font-medium bg-[#FAEEDA] text-[#854F0B]">{flags} flag{flags !== 1 ? 's' : ''}</span>
                  : <span className="inline-flex items-center px-[7px] py-[2px] rounded-[var(--border-radius-md)] text-[11px] font-medium bg-[#EAF3DE] text-[#3B6D11]">All clear</span>
                }
              </div>
            )
          })}
        </div>

        {/* Parts low stock */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
          <h3 className="text-[13px] font-medium mb-3.5 text-[var(--color-text-primary)]">Parts low stock</h3>
          {lowParts.length === 0 ? (
            <p className="text-[12px] text-[var(--color-text-secondary)]">All parts stocked.</p>
          ) : lowParts.slice(0, 4).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border-tertiary)] last:border-0">
              <div>
                <div className="text-[12px] font-medium text-[var(--color-text-primary)]">{p.name}</div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">{p.equipment_name}</div>
              </div>
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[var(--border-radius-md)] text-[11px] font-medium bg-[#FAEEDA] text-[#854F0B]">{p.qty_on_hand} left</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
