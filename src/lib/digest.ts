import { createClient } from '@/lib/supabase/server'
import { computeTask, fmtDate, type TaskLike } from '@/lib/utils'
import { getDueSoon } from '@/lib/settings'
import { sendEmail } from '@/lib/email'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']
type Part = Database['public']['Tables']['parts']['Row']
type Ticket = Database['public']['Tables']['tickets']['Row']
type Task = Database['public']['Tables']['service_tasks']['Row']

type Alert = { severity: 'high' | 'med'; title: string; detail: string }
type OpenTicket = { title: string; priority: string; status: string }
export type VesselDigest = { vesselId: string; vesselName: string; alerts: Alert[]; openTickets: OpenTicket[] }

const APP_URL = 'https://yacht.fairwindsnewport.com'

// Build alerts + open-ticket lists for each of the given vessels.
export async function buildDigests(vesselIds: string[]): Promise<VesselDigest[]> {
  if (!vesselIds.length) return []
  const supabase = await createClient()
  const ds = await getDueSoon()

  const [{ data: vRaw }, { data: eqRaw }, { data: partsRaw }, { data: tkRaw }, { data: tasksRaw }] = await Promise.all([
    supabase.from('vessels').select('id, name').in('id', vesselIds),
    supabase.from('equipment').select('*').in('vessel_id', vesselIds),
    supabase.from('parts').select('*').in('vessel_id', vesselIds),
    supabase.from('tickets').select('*').in('vessel_id', vesselIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('service_tasks').select('*').in('vessel_id', vesselIds),
  ])
  const vessels = (vRaw ?? []) as { id: string; name: string }[]
  const equipment = (eqRaw ?? []) as Equipment[]
  const parts = (partsRaw ?? []) as Part[]
  const tickets = (tkRaw ?? []) as Ticket[]
  const tasks = (tasksRaw ?? []) as Task[]

  const eqById = new Map(equipment.map(e => [e.id, e]))
  const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }

  // Preserve the requested order.
  return vesselIds.map(vid => {
    const v = vessels.find(x => x.id === vid)
    const alerts: Alert[] = []

    for (const t of tasks.filter(t => t.vessel_id === vid)) {
      const eq = eqById.get(t.equipment_id)
      if (!eq) continue
      const svc = computeTask(t as TaskLike, eq.current_hours, { leadDays: ds.days, leadHours: ds.hours })
      if (svc.status === 'overdue') alerts.push({ severity: 'high', title: `${eq.name} — ${t.name} overdue`, detail: svc.label })
      else if (svc.status === 'due') alerts.push({ severity: 'med', title: `${eq.name} — ${t.name} due soon`, detail: svc.label })
    }
    for (const p of parts.filter(p => p.vessel_id === vid)) {
      if (p.qty_on_hand <= p.reorder_at) alerts.push({ severity: 'med', title: `${p.name} — low stock`, detail: `${p.qty_on_hand} on hand (reorder at ${p.reorder_at})` })
    }
    const vTickets = tickets.filter(t => t.vessel_id === vid && t.status !== 'resolved' && t.status !== 'closed')
    for (const t of vTickets) {
      if (t.priority === 'urgent' || t.priority === 'high') {
        alerts.push({ severity: t.priority === 'urgent' ? 'high' : 'med', title: t.title, detail: `${t.priority} priority ticket` })
      }
    }
    alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))

    const openTickets: OpenTicket[] = [...vTickets]
      .sort((a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0))
      .map(t => ({ title: t.title, priority: t.priority, status: t.status === 'in_progress' ? 'In progress' : 'Open' }))

    return { vesselId: vid, vesselName: v?.name ?? 'Vessel', alerts, openTickets }
  })
}

const esc = (s: string) => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

// Render one digest email (covering one or more vessels) as inline-styled HTML.
export function renderDigestHtml(title: string, digests: VesselDigest[]): string {
  const today = fmtDate(new Date().toISOString().slice(0, 10))
  const sections = digests.map(d => {
    const alertRows = d.alerts.length
      ? d.alerts.map(a => `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #ededec;font-size:13px;color:${a.severity === 'high' ? '#A32D2D' : '#854F0B'};white-space:nowrap;vertical-align:top">${a.severity === 'high' ? '● urgent' : '○ watch'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #ededec;font-size:13px;color:#1c1917">${esc(a.title)}<div style="font-size:11px;color:#78716c">${esc(a.detail)}</div></td>
        </tr>`).join('')
      : `<tr><td colspan="2" style="padding:8px;font-size:13px;color:#3B6D11">No alerts — all clear. 🎉</td></tr>`

    const ticketRows = d.openTickets.length
      ? d.openTickets.map(t => `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #ededec;font-size:13px;color:#1c1917">${esc(t.title)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #ededec;font-size:12px;color:#57534e;white-space:nowrap;text-transform:capitalize">${esc(t.priority)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #ededec;font-size:12px;color:#57534e;white-space:nowrap">${esc(t.status)}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="padding:8px;font-size:13px;color:#57534e">No open tickets.</td></tr>`

    return `
      <div style="margin-top:22px">
        <div style="font-size:15px;font-weight:600;color:#185FA5;border-bottom:2px solid #185FA5;padding-bottom:4px">${esc(d.vesselName)}</div>
        <div style="font-size:12px;font-weight:600;color:#44403c;margin:12px 0 4px">Needs attention (${d.alerts.length})</div>
        <table style="width:100%;border-collapse:collapse">${alertRows}</table>
        <div style="font-size:12px;font-weight:600;color:#44403c;margin:14px 0 4px">Open tickets (${d.openTickets.length})</div>
        <table style="width:100%;border-collapse:collapse">${ticketRows}</table>
      </div>`
  }).join('')

  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:10px;padding:24px">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#185FA5;font-weight:600">Fairwinds</div>
      <h1 style="font-size:19px;margin:2px 0 2px;color:#1c1917">${esc(title)}</h1>
      <div style="font-size:12px;color:#78716c">Week of ${today}</div>
      ${sections || '<p style="font-size:13px;color:#57534e;margin-top:18px">No boats to report.</p>'}
      <div style="margin-top:24px;padding-top:14px;border-top:1px solid #ededec;font-size:12px">
        <a href="${APP_URL}" style="color:#185FA5;text-decoration:none">Open the app →</a>
      </div>
      <div style="margin-top:10px;font-size:10px;color:#a8a29e">Fairwinds yacht maintenance · weekly summary</div>
    </div>
  </body></html>`
}

export type Recipient = { email: string; label: string; vesselIds: string[] | 'all' }

// Who gets the weekly email: the admin address (all boats) + every active
// owner/crew user that has an email (their assigned boats).
export async function resolveRecipients(adminEmail: string | null): Promise<Recipient[]> {
  const supabase = await createClient()
  const recips: Recipient[] = []
  if (adminEmail && adminEmail.trim()) recips.push({ email: adminEmail.trim(), label: 'Admin', vesselIds: 'all' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: usersRaw }, { data: uvRaw }] = await Promise.all([
    (supabase as any).from('app_users').select('id, name, role, email, active').eq('active', true),
    (supabase as any).from('user_vessels').select('user_id, vessel_id'),
  ])
  const byUser: Record<string, string[]> = {}
  for (const r of (uvRaw ?? []) as { user_id: string; vessel_id: string }[]) (byUser[r.user_id] ??= []).push(r.vessel_id)

  for (const u of (usersRaw ?? []) as { id: string; name: string; role: string; email: string | null }[]) {
    if (!u.email) continue
    if (u.role === 'admin') { recips.push({ email: u.email, label: u.name, vesselIds: 'all' }); continue }
    const ids = byUser[u.id] ?? []
    if (ids.length) recips.push({ email: u.email, label: u.name, vesselIds: ids })
  }
  return recips
}

// Build + send each recipient's digest. (Sending is a stub until a provider is wired.)
export async function sendWeeklyDigests(adminEmail: string | null) {
  const supabase = await createClient()
  const { data: allV } = await supabase.from('vessels').select('id')
  const allIds = ((allV ?? []) as { id: string }[]).map(v => v.id)

  const recipients = await resolveRecipients(adminEmail)
  const results: { to: string; ok: boolean; error?: string }[] = []
  let sent = 0
  for (const r of recipients) {
    const ids = r.vesselIds === 'all' ? allIds : r.vesselIds
    const digests = await buildDigests(ids)
    const html = renderDigestHtml('Weekly Maintenance Summary', digests)
    const res = await sendEmail({ to: r.email, subject: 'Fairwinds — Weekly Maintenance Summary', html })
    if (res.ok) sent++
    results.push({ to: r.email, ok: res.ok, error: res.error })
  }
  return { sent, attempted: recipients.length, results }
}
