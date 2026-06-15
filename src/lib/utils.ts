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

export type IntervalType = 'hours' | 'months'

export function addMonths(iso: string, n: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

export interface ServiceInfo {
  status: ServiceStatus
  label: string   // e.g. "Mar 3, 2026", "In 45 hrs", "Overdue 12 hrs", "Not set"
}

// Unified "is service due?" for both months-based and hours-based intervals.
export function computeService(
  eq: {
    interval_type?: IntervalType | null
    interval_value?: number | null
    current_hours?: number | null
    last_service_hours?: number | null
    last_service?: string | null
    next_due?: string | null
  },
  opts?: { leadDays?: number; leadHours?: number },
): ServiceInfo {
  if (eq.interval_type === 'hours') {
    const v = eq.interval_value
    const cur = eq.current_hours
    const ls = eq.last_service_hours
    if (v == null || cur == null || ls == null) return { status: 'ok', label: 'Not set' }
    const remaining = v - (cur - ls)
    const lead = opts?.leadHours ?? Math.max(10, Math.round(v * 0.1))
    const status: ServiceStatus = remaining <= 0 ? 'overdue' : remaining <= lead ? 'due' : 'ok'
    return { status, label: remaining <= 0 ? `Overdue ${Math.abs(remaining)} hrs` : `In ${remaining} hrs` }
  }

  // months-based (or legacy date-only)
  let next = eq.next_due ?? null
  if (!next && eq.last_service && eq.interval_value) next = addMonths(eq.last_service, eq.interval_value)
  if (!next) return { status: 'ok', label: 'Not set' }
  return { status: getServiceStatus(next, opts?.leadDays), label: fmtDate(next) }
}

export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateShort(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
