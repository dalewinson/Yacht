import { createClient } from '@/lib/supabase/server'

export default async function StatsBar() {
  const supabase = await createClient()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('status, priority')

  const total = tickets?.length ?? 0
  const open = tickets?.filter(t => t.status === 'open').length ?? 0
  const inProgress = tickets?.filter(t => t.status === 'in_progress').length ?? 0
  const urgent = tickets?.filter(t => t.priority === 'urgent').length ?? 0

  const stats = [
    { label: 'Total Tickets', value: total, color: 'text-gray-900' },
    { label: 'Open', value: open, color: 'text-blue-600' },
    { label: 'In Progress', value: inProgress, color: 'text-yellow-600' },
    { label: 'Urgent', value: urgent, color: 'text-red-600' },
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
