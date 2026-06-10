import type { ServiceStatus } from '@/lib/utils'

const styles: Record<ServiceStatus, string> = {
  overdue: 'bg-[#FCEBEB] text-[#A32D2D]',
  due:     'bg-[#FAEEDA] text-[#854F0B]',
  ok:      'bg-[#EAF3DE] text-[#3B6D11]',
}
const labels: Record<ServiceStatus, string> = {
  overdue: 'Overdue',
  due:     'Due soon',
  ok:      'Up to date',
}

export default function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[var(--border-radius-md)] text-[11px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
