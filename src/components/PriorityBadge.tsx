import type { TicketPriority } from '@/types/database'

const styles: Record<TicketPriority, string> = {
  low:    'bg-gray-50 text-gray-500',
  medium: 'bg-blue-50 text-blue-600',
  high:   'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-700 font-semibold',
}

export default function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${styles[priority]}`}>
      {priority}
    </span>
  )
}
