export type ServiceStatus = 'overdue' | 'due' | 'ok'

export function getServiceStatus(nextDue: string | null, leadDays = 14): ServiceStatus {
  if (!nextDue) return 'ok'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(nextDue)
  const diff = (due.getTime() - today.getTime()) / 86400000
  if (diff < 0) return 'overdue'
  if (diff <= leadDays) return 'due'
  return 'ok'
}

export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateShort(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
