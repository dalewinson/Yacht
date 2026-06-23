'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rollupTasks, computeTask, fmtDate, type IntervalType } from '@/lib/utils'
import ServiceStatusBadge from './ServiceStatusBadge'
import { useEquipmentCategories } from './CategoriesProvider'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']
type Task = Database['public']['Tables']['service_tasks']['Row']

const STARTER_TASKS: { name: string; interval_type: IntervalType; interval_value: number }[] = [
  { name: 'Oil & filter',                 interval_type: 'hours',  interval_value: 150 },
  { name: 'Fuel filter / water separator', interval_type: 'hours',  interval_value: 500 },
  { name: 'Air filter',                    interval_type: 'months', interval_value: 12 },
  { name: 'Raw-water impeller',            interval_type: 'months', interval_value: 12 },
  { name: 'Coolant',                       interval_type: 'months', interval_value: 24 },
  { name: 'Zincs / anodes',                interval_type: 'months', interval_value: 3 },
]

export default function EquipmentTable({ equipment: initial, tasks: initialTasks, vesselId }: { equipment: Equipment[]; tasks: Task[]; vesselId: string | null }) {
  const [equipment, setEquipment] = useState(initial)
  const [tasksByEq, setTasksByEq] = useState<Record<string, Task[]>>(() => {
    const m: Record<string, Task[]> = {}
    for (const t of initialTasks) (m[t.equipment_id] ??= []).push(t)
    return m
  })
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [adding, setAdding]     = useState(false)
  const CATEGORIES = useEquipmentCategories()

  function handleAdded(created: Equipment, tasks: Task[]) {
    setEquipment(prev => [...prev, created])
    setTasksByEq(prev => ({ ...prev, [created.id]: tasks }))
    setAdding(false)
    setSelected(created) // open edit so they can add more service tasks
  }

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase()
    return (
      (!q || e.name.toLowerCase().includes(q) || (e.model ?? '').toLowerCase().includes(q)) &&
      (!category || e.category === category)
    )
  })

  function handleSaved(updated: Equipment, tasks: Task[]) {
    setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e))
    setTasksByEq(prev => ({ ...prev, [updated.id]: tasks }))
    setSelected(null)
  }

  function handleDeleted(id: string) {
    setEquipment(prev => prev.filter(e => e.id !== id))
    setTasksByEq(prev => { const n = { ...prev }; delete n[id]; return n })
    setSelected(null)
  }

  return (
    <>
      <div className="flex gap-2 mb-3.5">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setAdding(true)} disabled={!vesselId}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50 whitespace-nowrap">
          <i className="ti ti-plus text-[13px]" /> Add equipment
        </button>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[760px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[24%]">Equipment</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Category</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[18%]">Make / model</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[28%]">Next service</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[8%]">Status</th>
              <th className="w-[8%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-4">No equipment found</td></tr>
            ) : filtered.map(e => {
              const roll = rollupTasks(tasksByEq[e.id] ?? [], e.current_hours)
              return (
                <tr key={e.id} className="hover:bg-[var(--color-background-secondary)]">
                  <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <button onClick={() => setSelected(e)} className="text-[#185FA5] hover:underline text-left">{e.name}</button>
                  </td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.category}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{e.model ?? '—'}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{roll.label}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]"><ServiceStatusBadge status={roll.status} /></td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                    <button onClick={() => setSelected(e)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">
                      <i className="ti ti-edit text-[12px]" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <EquipmentEditModal
          equipment={selected}
          tasks={tasksByEq[selected.id] ?? []}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {adding && vesselId && (
        <AddEquipmentModal vesselId={vesselId} onClose={() => setAdding(false)} onAdded={handleAdded} />
      )}
    </>
  )
}

function AddEquipmentModal({ vesselId, onClose, onAdded }: {
  vesselId: string
  onClose: () => void
  onAdded: (created: Equipment, tasks: Task[]) => void
}) {
  const CATEGORIES = useEquipmentCategories()
  const [name, setName]         = useState('')
  const [category, setCategory] = useState(CATEGORIES[0] ?? 'Propulsion')
  const [model, setModel]       = useState('')
  const [serial, setSerial]     = useState('')
  const [notes, setNotes]       = useState('')
  // optional first service task
  const [tName, setTName]       = useState('')
  const [tType, setTType]       = useState<IntervalType>('hours')
  const [tValue, setTValue]     = useState('')
  const [tCurHours, setTCurHours] = useState('')
  const [tLastHours, setTLastHours] = useState('')
  const [tLastDate, setTLastDate]   = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const hasTask = !!(tValue && parseInt(tValue) > 0)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    // current_hours only applies when an hours-based task is being set up
    const currentHours = (hasTask && tType === 'hours' && tCurHours) ? parseInt(tCurHours) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any).from('equipment').insert({
      vessel_id: vesselId,
      name: name.trim(), category,
      model: model.trim() || null, serial: serial.trim() || null,
      current_hours: currentHours, notes: notes.trim() || null,
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    const created = data as Equipment

    const tasks: Task[] = []
    if (hasTask) {
      const payload = {
        equipment_id: created.id, vessel_id: vesselId,
        name: tName.trim() || 'Service',
        interval_type: tType,
        interval_value: parseInt(tValue),
        last_done_hours: tType === 'hours' ? (tLastHours ? parseInt(tLastHours) : currentHours) : null,
        last_done_date: tType === 'months' ? (tLastDate || null) : null,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tData } = await (supabase as any).from('service_tasks').insert(payload).select().single()
      if (tData) tasks.push(tData as Task)
    }

    onAdded(created, tasks)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Add equipment</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name *', <input type="text" value={name} onChange={e => setName(e.target.value)} className={cls} />)}
            {field('Category',
              <select value={category} onChange={e => setCategory(e.target.value)} className={cls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            )}
            {field('Make / model', <input type="text" value={model} onChange={e => setModel(e.target.value)} className={cls} />)}
            {field('Serial #', <input type="text" value={serial} onChange={e => setSerial(e.target.value)} className={cls} />)}
          </div>

          {/* Optional first service task */}
          <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)] space-y-2">
            <div className="text-[11px] font-medium text-[var(--color-text-primary)]">First service task <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span></div>
            <div className="flex items-center gap-1.5">
              <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="e.g. Oil & filter, Teak oiling"
                className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
              <span className="text-[10px] text-[var(--color-text-tertiary)]">every</span>
              <input type="number" min="1" value={tValue} onChange={e => setTValue(e.target.value)} placeholder="150"
                className="w-[56px] px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
              <select value={tType} onChange={e => setTType(e.target.value as IntervalType)}
                className="px-1 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                <option value="hours">hrs</option>
                <option value="months">months</option>
              </select>
            </div>
            {hasTask && (tType === 'hours' ? (
              <div className="grid grid-cols-2 gap-2">
                {field('Current hours', <input type="number" min="0" value={tCurHours} onChange={e => setTCurHours(e.target.value)} className={cls} />)}
                {field('Hours at last service', <input type="number" min="0" value={tLastHours} onChange={e => setTLastHours(e.target.value)} placeholder="defaults to current" className={cls} />)}
              </div>
            ) : (
              field('Last done (date)', <input type="date" value={tLastDate} onChange={e => setTLastDate(e.target.value)} className={cls} />)
            ))}
            <p className="text-[10px] text-[var(--color-text-tertiary)]">Choose hrs for metered gear (engines), months for date-based items (teak, liferaft). Add more tasks after saving.</p>
          </div>

          {field('Notes', <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${cls} resize-y`} />)}
          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type TaskRow = {
  id?: string
  name: string
  interval_type: IntervalType
  interval_value: string
  last_done_date: string
  last_done_hours: string
}

function EquipmentEditModal({ equipment: e, tasks: initialTasks, onClose, onSaved, onDeleted }: {
  equipment: Equipment
  tasks: Task[]
  onClose: () => void
  onSaved: (updated: Equipment, tasks: Task[]) => void
  onDeleted: (id: string) => void
}) {
  const CATEGORIES = useEquipmentCategories()
  const [name, setName]               = useState(e.name)
  const [category, setCategory]       = useState(e.category)
  const [model, setModel]             = useState(e.model ?? '')
  const [serial, setSerial]           = useState(e.serial ?? '')
  const [assignedTech, setAssignedTech] = useState(e.assigned_tech ?? '')
  const [currentHours, setCurrentHours] = useState(e.current_hours?.toString() ?? '')
  const [notes, setNotes]             = useState(e.notes ?? '')
  const [tasks, setTasks]             = useState<TaskRow[]>(initialTasks.map(t => ({
    id: t.id, name: t.name, interval_type: t.interval_type, interval_value: t.interval_value.toString(),
    last_done_date: t.last_done_date ?? '', last_done_hours: t.last_done_hours?.toString() ?? '',
  })))
  const [deletedIds, setDeletedIds]   = useState<string[]>([])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const curHrs = currentHours ? parseInt(currentHours) : null
  const hasHoursTask = tasks.some(t => t.interval_type === 'hours')

  function patchTask(i: number, p: Partial<TaskRow>) {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...p } : t))
  }
  function addTask() {
    setTasks(prev => [...prev, { name: '', interval_type: 'hours', interval_value: '', last_done_date: '', last_done_hours: '' }])
  }
  function removeTask(i: number) {
    setTasks(prev => {
      const t = prev[i]
      if (t.id) setDeletedIds(d => [...d, t.id!])
      return prev.filter((_, idx) => idx !== i)
    })
  }
  function addStarterTasks() {
    setTasks(prev => [...prev, ...STARTER_TASKS.map(s => ({
      name: s.name, interval_type: s.interval_type, interval_value: s.interval_value.toString(),
      last_done_date: '', last_done_hours: '',
    }))])
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()

    // 1) equipment fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eqData, error: eqErr } = await (supabase as any).from('equipment').update({
      name, category, model: model || null, serial: serial || null,
      current_hours: currentHours ? parseInt(currentHours) : null,
      assigned_tech: assignedTech || null, notes: notes || null,
    }).eq('id', e.id).select().single()
    if (eqErr) { setError(eqErr.message); setSaving(false); return }

    // 2) deletions
    if (deletedIds.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('service_tasks').delete().in('id', deletedIds)
    }

    // 3) upsert tasks (skip blank rows)
    const finalTasks: Task[] = []
    for (const t of tasks) {
      if (!t.name.trim() || !t.interval_value) continue
      const payload = {
        name: t.name.trim(),
        interval_type: t.interval_type,
        interval_value: parseInt(t.interval_value),
        last_done_date: t.last_done_date || null,
        last_done_hours: t.last_done_hours ? parseInt(t.last_done_hours) : null,
      }
      if (t.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).from('service_tasks').update(payload).eq('id', t.id).select().single()
        if (data) finalTasks.push(data as Task)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).from('service_tasks').insert({ equipment_id: e.id, vessel_id: e.vessel_id, ...payload }).select().single()
        if (data) finalTasks.push(data as Task)
      }
    }

    onSaved(eqData as Equipment, finalTasks)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${e.name}" and all its service tasks? This cannot be undone.`)) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('equipment').delete().eq('id', e.id)
    if (err) { setError(err.message); return }
    onDeleted(e.id)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )
  const isEngineish = category === 'Propulsion' || category === 'Electrical'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[640px] max-h-[88vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Edit equipment</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name', <input type="text" value={name} onChange={ev => setName(ev.target.value)} className={cls} />)}
            {field('Category',
              <select value={category} onChange={ev => setCategory(ev.target.value)} className={cls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            )}
            {field('Make / model', <input type="text" value={model} onChange={ev => setModel(ev.target.value)} className={cls} />)}
            {field('Serial #', <input type="text" value={serial} onChange={ev => setSerial(ev.target.value)} className={cls} />)}
            {hasHoursTask && field('Current hours', <input type="number" min="0" value={currentHours} onChange={ev => setCurrentHours(ev.target.value)} placeholder="e.g. 2480" className={cls} />)}
            {field('Last inspected', <input type="text" readOnly value={e.last_inspected ? fmtDate(e.last_inspected) : 'Not yet'} className={`${cls} text-[var(--color-text-secondary)]`} />)}
            {field('Assigned tech', <input type="text" value={assignedTech} onChange={ev => setAssignedTech(ev.target.value)} className={cls} />)}
          </div>

          {/* Service tasks */}
          <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[var(--color-text-primary)]">Service tasks</span>
              <div className="flex gap-2">
                {isEngineish && <button type="button" onClick={addStarterTasks} className="text-[11px] text-[#185FA5] hover:underline">+ Common engine tasks</button>}
                <button type="button" onClick={addTask} className="text-[11px] text-[#185FA5] hover:underline">+ Add task</button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">No tasks yet. Add one, or use “Common engine tasks”.</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t, i) => {
                  const preview = t.name && t.interval_value ? computeTask({
                    name: t.name, interval_type: t.interval_type, interval_value: parseInt(t.interval_value) || 0,
                    last_done_date: t.last_done_date || null, last_done_hours: t.last_done_hours ? parseInt(t.last_done_hours) : null,
                  }, curHrs) : null
                  return (
                    <div key={i} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded p-2">
                      <div className="flex items-center gap-1.5">
                        <input type="text" value={t.name} onChange={ev => patchTask(i, { name: ev.target.value })} placeholder="Task name"
                          className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">every</span>
                        <input type="number" min="1" value={t.interval_value} onChange={ev => patchTask(i, { interval_value: ev.target.value })}
                          className="w-[56px] px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                        <select value={t.interval_type} onChange={ev => patchTask(i, { interval_type: ev.target.value as IntervalType })}
                          className="px-1 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                          <option value="hours">hrs</option>
                          <option value="months">mo</option>
                        </select>
                        <button type="button" onClick={() => removeTask(i)} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D] px-1" title="Remove">
                          <i className="ti ti-x text-[13px]" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">Last done:</span>
                        {t.interval_type === 'hours' ? (
                          <input type="number" min="0" value={t.last_done_hours} onChange={ev => patchTask(i, { last_done_hours: ev.target.value })} placeholder="hrs at last service"
                            className="w-[120px] px-1.5 py-0.5 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                        ) : (
                          <input type="date" value={t.last_done_date} onChange={ev => patchTask(i, { last_done_date: ev.target.value })}
                            className="px-1.5 py-0.5 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                        )}
                        {preview && (
                          <span className="ml-auto"><ServiceStatusBadge status={preview.status} /> <span className="text-[10px] text-[var(--color-text-secondary)]">{preview.label}</span></span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {field('Notes', <textarea value={notes} onChange={ev => setNotes(ev.target.value)} rows={2} className={`${cls} resize-y`} />)}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            <button type="button" onClick={handleDelete} className="text-[12px] text-[#A32D2D] hover:underline inline-flex items-center gap-1">
              <i className="ti ti-trash text-[13px]" /> Delete
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white border border-[#185FA5] rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
                <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
