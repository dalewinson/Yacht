'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']
type ServiceLog = Database['public']['Tables']['service_log']['Row']
type Task = Database['public']['Tables']['service_tasks']['Row']

export default function ServiceLogClient({
  entries: initial,
  equipment,
  tasks,
  vesselId,
}: {
  entries: ServiceLog[]
  equipment: Equipment[]
  tasks: Task[]
  vesselId: string | null
}) {
  const [entries, setEntries] = useState<ServiceLog[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<ServiceLog | null>(null)
  const [eqFilter, setEqFilter] = useState('')

  const eqNames = Array.from(new Set(entries.map(e => e.equipment_name))).sort((a, b) => a.localeCompare(b))
  const shown = eqFilter ? entries.filter(e => e.equipment_name === eqFilter) : entries

  const tasksByEq: Record<string, Task[]> = {}
  for (const t of tasks) (tasksByEq[t.equipment_id] ??= []).push(t)

  function onSaved(entry: ServiceLog) {
    setEntries(prev => prev.some(x => x.id === entry.id) ? prev.map(x => x.id === entry.id ? entry : x) : [entry, ...prev])
    setShowNew(false); setEditing(null)
  }

  async function remove(entry: ServiceLog) {
    if (!confirm('Delete this service record?')) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('service_log').delete().eq('id', entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  const fmtCost = (c: number | null) => (c == null ? '—' : `$${c.toLocaleString('en-US')}`)

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <select
            value={eqFilter}
            onChange={e => setEqFilter(e.target.value)}
            className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] max-w-[220px]"
          >
            <option value="">All equipment</option>
            {eqNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {eqFilter && (
            <button onClick={() => setEqFilter('')} className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1">
              <i className="ti ti-x text-[12px]" /> Clear
            </button>
          )}
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!vesselId}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
        >
          <i className="ti ti-plus text-[13px]" /> Log service
        </button>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[680px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[13%]">Date</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[20%]">Equipment</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[34%]">Work performed</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[13%]">Tech</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[12%]">Cost</th>
              <th className="w-[8%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-8">{eqFilter ? `No service records for ${eqFilter}.` : 'No service records yet. Click “Log service” to add the first.'}</td></tr>
            ) : shown.map(e => (
              <tr key={e.id} className="hover:bg-[var(--color-background-secondary)] align-top">
                <td className="px-4 py-2 border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setEditing(e)} className="text-[#185FA5] hover:underline">{fmtDate(e.date)}</button>
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] font-medium overflow-hidden text-ellipsis">{e.equipment_name}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-primary)]">
                  {e.work_performed}
                  {e.parts_used && <span className="block text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Parts: {e.parts_used}</span>}
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.tech ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{fmtCost(e.cost)}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-right whitespace-nowrap">
                  <button onClick={() => setEditing(e)} className="text-[var(--color-text-tertiary)] hover:text-[#185FA5] mr-2" title="Edit">
                    <i className="ti ti-edit text-[14px]" />
                  </button>
                  <button onClick={() => remove(e)} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D]" title="Delete">
                    <i className="ti ti-trash text-[14px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showNew || editing) && vesselId && (
        <LogServiceModal
          vesselId={vesselId}
          equipment={equipment}
          tasksByEq={tasksByEq}
          entry={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onSaved={onSaved}
        />
      )}
    </>
  )
}

function LogServiceModal({
  vesselId, equipment, tasksByEq, entry, onClose, onSaved,
}: {
  vesselId: string
  equipment: Equipment[]
  tasksByEq: Record<string, Task[]>
  entry: ServiceLog | null
  onClose: () => void
  onSaved: (entry: ServiceLog) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [equipmentId, setEquipmentId] = useState(entry?.equipment_id ?? '')
  const [otherName, setOtherName]     = useState(entry && !entry.equipment_id ? entry.equipment_name : '')
  const [date, setDate]               = useState(entry?.date ?? today)
  const [work, setWork]               = useState(entry?.work_performed ?? '')
  const [tech, setTech]               = useState(entry?.tech ?? '')
  const [cost, setCost]               = useState(entry?.cost?.toString() ?? '')
  const [parts, setParts]             = useState(entry?.parts_used ?? '')
  const [notes, setNotes]             = useState(entry?.notes ?? '')
  const [completed, setCompleted]     = useState<Set<string>>(new Set())
  const [currentHours, setCurrentHours] = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  // After saving, optionally resolve open tickets for the same equipment.
  const [resolveStep, setResolveStep] = useState<{ saved: ServiceLog; tickets: { id: string; title: string }[]; checked: Set<string>; text: string } | null>(null)

  const selected = equipment.find(e => e.id === equipmentId) ?? null
  const eqTasks = selected ? (tasksByEq[selected.id] ?? []) : []

  function pickEquipment(id: string) {
    setEquipmentId(id)
    const eq = equipment.find(e => e.id === id)
    setCurrentHours(eq?.current_hours?.toString() ?? '')
    setCompleted(new Set())
  }
  function toggleTask(id: string) {
    setCompleted(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!work.trim()) { setError('Describe the work performed.'); return }
    const equipmentName = selected ? selected.name : otherName.trim()
    if (!equipmentName) { setError('Pick equipment or enter a name.'); return }

    setSaving(true); setError('')
    const supabase = createClient()

    const payload = {
      equipment_id: selected?.id ?? null,
      equipment_name: equipmentName,
      date,
      work_performed: work.trim(),
      tech: tech.trim() || null,
      cost: cost ? Number(cost) : null,
      parts_used: parts.trim() || null,
      notes: notes.trim() || null,
    }

    let saved, e1
    if (entry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data: saved, error: e1 } = await (supabase as any).from('service_log').update(payload).eq('id', entry.id).select().single())
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data: saved, error: e1 } = await (supabase as any).from('service_log').insert({ vessel_id: vesselId, ...payload }).select().single())
    }

    if (e1) { setError(e1.message); setSaving(false); return }

    const hrs = currentHours ? parseInt(currentHours) : selected?.current_hours ?? null

    // Update the equipment's current hours if provided.
    if (selected && currentHours) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('equipment').update({ current_hours: parseInt(currentHours) }).eq('id', selected.id)
    }

    // Reset the clock on each task this service completed.
    for (const t of eqTasks) {
      if (!completed.has(t.id)) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: any = { last_done_date: date }
      if (t.interval_type === 'hours' && hrs != null) patch.last_done_hours = hrs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('service_tasks').update(patch).eq('id', t.id)
    }

    // If this equipment has open tickets, offer to resolve them (new entries only).
    if (!entry && selected) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: openT } = await (supabase as any)
        .from('tickets').select('id,title')
        .eq('vessel_id', vesselId).eq('equipment_id', selected.id)
        .in('status', ['open', 'in_progress'])
      const list = (openT ?? []) as { id: string; title: string }[]
      if (list.length) {
        setSaving(false)
        setResolveStep({ saved: saved as ServiceLog, tickets: list, checked: new Set(list.map(t => t.id)), text: work.trim() })
        return
      }
    }

    onSaved(saved as ServiceLog)
  }

  async function confirmResolve(resolve: boolean) {
    if (!resolveStep) return
    if (resolve) {
      setSaving(true)
      const supabase = createClient()
      for (const t of resolveStep.tickets) {
        if (!resolveStep.checked.has(t.id)) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('tickets').update({ status: 'resolved', resolution: resolveStep.text.trim() || null }).eq('id', t.id)
      }
    }
    onSaved(resolveStep.saved)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{resolveStep ? 'Resolve open tickets?' : entry ? 'Edit service record' : 'Log service'}</h2>
          <button onClick={() => resolveStep ? confirmResolve(false) : onClose()} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        {resolveStep ? (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {selected?.name} has {resolveStep.tickets.length} open ticket{resolveStep.tickets.length > 1 ? 's' : ''}. Mark any resolved with this service?
            </p>
            <div className="space-y-1.5">
              {resolveStep.tickets.map(t => (
                <label key={t.id} className="flex items-start gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer">
                  <input type="checkbox" className="mt-[3px]" checked={resolveStep.checked.has(t.id)}
                    onChange={() => setResolveStep(prev => {
                      if (!prev) return prev
                      const checked = new Set(prev.checked)
                      checked.has(t.id) ? checked.delete(t.id) : checked.add(t.id)
                      return { ...prev, checked }
                    })} />
                  <span>{t.title}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Resolution (saved on the resolved tickets)</label>
              <textarea value={resolveStep.text} rows={2} onChange={e => setResolveStep(prev => prev ? { ...prev, text: e.target.value } : prev)} className={`${cls} resize-y`} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => confirmResolve(false)} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Skip</button>
              <button type="button" onClick={() => confirmResolve(true)} disabled={saving || resolveStep.checked.size === 0}
                className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
                <i className="ti ti-check text-[13px]" /> {saving ? 'Resolving…' : `Resolve ${resolveStep.checked.size}`}
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={save} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Equipment',
              <select value={equipmentId} onChange={e => pickEquipment(e.target.value)} className={cls}>
                <option value="">— Other / general —</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            {field('Date', <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cls} />)}
          </div>

          {!selected && field('Equipment / area name',
            <input type="text" value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="e.g. Hull, General" className={cls} />
          )}

          {field('Work performed *',
            <textarea value={work} onChange={e => setWork(e.target.value)} rows={2} placeholder="e.g. Changed engine oil & filter" className={`${cls} resize-y`} />
          )}

          <div className="grid grid-cols-2 gap-[10px]">
            {field('Tech', <input type="text" value={tech} onChange={e => setTech(e.target.value)} className={cls} />)}
            {field('Cost ($)', <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={cls} />)}
          </div>

          {field('Parts used', <input type="text" value={parts} onChange={e => setParts(e.target.value)} placeholder="e.g. 2x oil filter, 8qt oil" className={cls} />)}
          {field('Notes', <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${cls} resize-y`} />)}

          {selected && eqTasks.length > 0 && (
            <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)] space-y-2">
              <div className="text-[11px] font-medium text-[var(--color-text-primary)]">This service completed:</div>
              <div className="space-y-1">
                {eqTasks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer">
                    <input type="checkbox" checked={completed.has(t.id)} onChange={() => toggleTask(t.id)} />
                    {t.name} <span className="text-[10px] text-[var(--color-text-tertiary)]">(every {t.interval_value} {t.interval_type === 'hours' ? 'hrs' : 'mo'})</span>
                  </label>
                ))}
              </div>
              {[...completed].some(id => eqTasks.find(t => t.id === id)?.interval_type === 'hours') && field('Current hours (resets hours-based tasks)',
                <input type="number" min="0" value={currentHours} onChange={e => setCurrentHours(e.target.value)} placeholder="e.g. 2480" className={cls} />
              )}
              <p className="text-[10px] text-[var(--color-text-tertiary)]">Checking a task resets its countdown to this date{currentHours ? '/hours' : ''}.</p>
            </div>
          )}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
