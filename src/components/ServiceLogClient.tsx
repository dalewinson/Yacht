'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, addMonths } from '@/lib/utils'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']
type ServiceLog = Database['public']['Tables']['service_log']['Row']

export default function ServiceLogClient({
  entries: initial,
  equipment: initialEquip,
  vesselId,
}: {
  entries: ServiceLog[]
  equipment: Equipment[]
  vesselId: string | null
}) {
  const [entries, setEntries] = useState<ServiceLog[]>(initial)
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquip)
  const [showNew, setShowNew] = useState(false)

  function handleCreated(entry: ServiceLog, updatedEquip: Equipment | null) {
    setEntries(prev => [entry, ...prev])
    if (updatedEquip) setEquipment(prev => prev.map(e => e.id === updatedEquip.id ? updatedEquip : e))
    setShowNew(false)
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
      <div className="flex justify-end mb-3.5">
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
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-8">No service records yet. Click &quot;Log service&quot; to add the first.</td></tr>
            ) : entries.map(e => (
              <tr key={e.id} className="hover:bg-[var(--color-background-secondary)] align-top">
                <td className="px-4 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{fmtDate(e.date)}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] font-medium overflow-hidden text-ellipsis">{e.equipment_name}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-primary)]">
                  {e.work_performed}
                  {e.parts_used && <span className="block text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Parts: {e.parts_used}</span>}
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.tech ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{fmtCost(e.cost)}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-right">
                  <button onClick={() => remove(e)} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D]" title="Delete">
                    <i className="ti ti-trash text-[14px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && vesselId && (
        <LogServiceModal
          vesselId={vesselId}
          equipment={equipment}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}

function LogServiceModal({
  vesselId, equipment, onClose, onCreated,
}: {
  vesselId: string
  equipment: Equipment[]
  onClose: () => void
  onCreated: (entry: ServiceLog, updatedEquip: Equipment | null) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [equipmentId, setEquipmentId] = useState('')
  const [otherName, setOtherName]     = useState('')
  const [date, setDate]               = useState(today)
  const [work, setWork]               = useState('')
  const [tech, setTech]               = useState('')
  const [cost, setCost]               = useState('')
  const [parts, setParts]             = useState('')
  const [notes, setNotes]             = useState('')
  const [resetCountdown, setReset]    = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const selected = equipment.find(e => e.id === equipmentId) ?? null
  const isHours = selected?.interval_type === 'hours'
  const hasInterval = !!(selected?.interval_type && selected?.interval_value)
  const [hoursAtService, setHoursAtService] = useState('')

  // default the hours field to the equipment's current reading when picked
  function pickEquipment(id: string) {
    setEquipmentId(id)
    const eq = equipment.find(e => e.id === id)
    setHoursAtService(eq?.current_hours?.toString() ?? '')
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!work.trim()) { setError('Describe the work performed.'); return }
    const equipmentName = selected ? selected.name : otherName.trim()
    if (!equipmentName) { setError('Pick equipment or enter a name.'); return }

    setSaving(true); setError('')
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry, error: e1 } = await (supabase as any).from('service_log').insert({
      vessel_id: vesselId,
      equipment_id: selected?.id ?? null,
      equipment_name: equipmentName,
      date,
      work_performed: work.trim(),
      tech: tech.trim() || null,
      cost: cost ? Number(cost) : null,
      parts_used: parts.trim() || null,
      notes: notes.trim() || null,
    }).select().single()

    if (e1) { setError(e1.message); setSaving(false); return }

    // Optionally reset the equipment's maintenance countdown.
    let updatedEquip: Equipment | null = null
    if (selected && hasInterval && resetCountdown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: any = { last_service: date }
      if (isHours) {
        const h = hoursAtService ? parseInt(hoursAtService) : selected.current_hours
        patch.last_service_hours = h
        patch.current_hours = h
      } else if (selected.interval_value) {
        patch.next_due = addMonths(date, selected.interval_value)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: eqData } = await (supabase as any).from('equipment').update(patch).eq('id', selected.id).select().single()
      updatedEquip = (eqData as Equipment) ?? null
    }

    onCreated(entry as ServiceLog, updatedEquip)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Log service</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

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

          {hasInterval && (
            <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)] space-y-2">
              <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer">
                <input type="checkbox" checked={resetCountdown} onChange={e => setReset(e.target.checked)} />
                Reset {selected!.name}&apos;s service countdown to this date
              </label>
              {isHours && resetCountdown && field('Engine hours at this service',
                <input type="number" min="0" value={hoursAtService} onChange={e => setHoursAtService(e.target.value)} placeholder="e.g. 2404" className={cls} />
              )}
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
      </div>
    </div>
  )
}
