import type { TicketStatus } from '@/types/database'

const styles: Record<TicketStatus, string> = {
  open:        'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved:    'bg-green-50 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
}

const labels: Record<TicketStatus, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  closed:      'Closed',
}

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
