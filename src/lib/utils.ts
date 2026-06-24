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

// ─── Service tasks ───────────────────────────────────────────────────────────
export interface TaskLike {
  name: string
  interval_type: IntervalType
  interval_value: number
  last_done_date: string | null
  last_done_hours: number | null
}

const STATUS_RANK: Record<ServiceStatus, number> = { overdue: 2, due: 1, ok: 0 }

// Status of a single task. Hours-based tasks measure against the parent
// equipment's live current_hours.
export function computeTask(
  task: TaskLike,
  currentHours: number | null,
  opts?: { leadDays?: number; leadHours?: number },
): ServiceInfo {
  if (task.interval_type === 'hours') {
    if (currentHours == null) return { status: 'ok', label: 'Set current hours' }
    if (task.last_done_hours == null) return { status: 'ok', label: 'Set baseline hrs' }
    const remaining = task.interval_value - (currentHours - task.last_done_hours)
    const lead = opts?.leadHours ?? 15
    const status: ServiceStatus = remaining <= 0 ? 'overdue' : remaining <= lead ? 'due' : 'ok'
    return { status, label: remaining <= 0 ? `Overdue ${Math.abs(remaining)} hrs` : `In ${remaining} hrs` }
  }
  if (!task.last_done_date) return { status: 'ok', label: 'Not set' }
  const next = addMonths(task.last_done_date, task.interval_value)
  return { status: getServiceStatus(next, opts?.leadDays), label: fmtDate(next) }
}

// Roll a set of tasks up to a single equipment status (worst task wins).
export function rollupTasks(tasks: TaskLike[], currentHours: number | null, opts?: { leadDays?: number; leadHours?: number }): ServiceInfo & { taskCount: number } {
  if (!tasks.length) return { status: 'ok', label: 'No tasks', taskCount: 0 }
  let worst: ServiceInfo = { status: 'ok', label: '' }
  let worstName = ''
  let chosen = false
  for (const t of tasks) {
    const info = computeTask(t, currentHours, opts)
    if (!chosen || STATUS_RANK[info.status] > STATUS_RANK[worst.status]) {
      worst = info; worstName = t.name; chosen = true
    }
  }
  const label = worst.status === 'ok' ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''} · all OK` : `${worstName}: ${worst.label}`
  return { status: worst.status, label, taskCount: tasks.length }
}

// Parse a date string for display. A plain 'YYYY-MM-DD' is treated as a LOCAL
// calendar date (not UTC midnight), avoiding the off-by-one in negative-offset
// time zones. Full timestamps fall through to normal parsing.
function parseForDisplay(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso)
}

export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return parseForDisplay(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateShort(iso: string | null) {
  if (!iso) return '—'
  return parseForDisplay(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
