import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Ticket = Database['public']['Tables']['tickets']['Row']

export default async function StatsBar() {
  const supabase = await createClient()
  const { data } = await supabase.from('tickets').select('status, priority')
  const tickets = (data ?? []) as Pick<Ticket, 'status' | 'priority'>[]

  const total      = tickets.length
  const open       = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const urgent     = tickets.filter(t => t.priority === 'urgent').length

  const stats = [
    { label: 'Total Tickets', value: total,      color: 'text-gray-900' },
    { label: 'Open',          value: open,       color: 'text-blue-600' },
    { label: 'In Progress',   value: inProgress, color: 'text-yellow-600' },
    { label: 'Urgent',        value: urgent,     color: 'text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
