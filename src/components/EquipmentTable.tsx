'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeService, addMonths, type IntervalType } from '@/lib/utils'
import ServiceStatusBadge from './ServiceStatusBadge'
import type { Database } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']

const CATEGORIES = ['Vessel','Propulsion','Electrical','Safety','Navigation','HVAC','Plumbing','Systems','Deck']

export default function EquipmentTable({ equipment: initial }: { equipment: Equipment[] }) {
  const [equipment, setEquipment] = useState(initial)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('')
  const [selected, setSelected]   = useState<Equipment | null>(null)

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase()
    return (
      (!q || e.name.toLowerCase().includes(q) || (e.model ?? '').toLowerCase().includes(q)) &&
      (!category || e.category === category)
    )
  })

  function handleSaved(updated: Equipment) {
    setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelected(null)
  }

  return (
    <>
      <div className="flex gap-2 mb-3.5">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
        <table className="w-full text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[24%]">Equipment</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Category</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[19%]">Make / model</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[13%]">Interval</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Service due</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[8%]">Status</th>
              <th className="w-[8%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-[var(--color-text-secondary)] py-4">No equipment found</td></tr>
            ) : filtered.map(e => {
              const svc = computeService(e)
              return (
                <tr key={e.id} className="hover:bg-[var(--color-background-secondary)]">
                  <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <button onClick={() => setSelected(e)} className="text-[#185FA5] hover:underline text-left">{e.name}</button>
                  </td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.category}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{e.model ?? '—'}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{intervalLabel(e)}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{svc.label}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]"><ServiceStatusBadge status={svc.status} /></td>
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
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

function intervalLabel(e: Equipment): string {
  if (!e.interval_type || !e.interval_value) return '—'
  return e.interval_type === 'hours' ? `${e.interval_value} hrs` : `${e.interval_value} mo`
}

function EquipmentEditModal({ equipment: e, onClose, onSaved }: {
  equipment: Equipment
  onClose: () => void
  onSaved: (updated: Equipment) => void
}) {
  const [name,            setName]            = useState(e.name)
  const [category,        setCategory]        = useState(e.category)
  const [model,           setModel]           = useState(e.model ?? '')
  const [serial,          setSerial]          = useState(e.serial ?? '')
  const [assignedTech,    setAssignedTech]    = useState(e.assigned_tech ?? '')
  const [lastService,     setLastService]     = useState(e.last_service ?? '')
  const [intervalType,    setIntervalType]    = useState<IntervalType>(e.interval_type ?? 'months')
  const [intervalValue,   setIntervalValue]   = useState(e.interval_value?.toString() ?? '')
  const [currentHours,    setCurrentHours]    = useState(e.current_hours?.toString() ?? '')
  const [lastSvcHours,    setLastSvcHours]    = useState(e.last_service_hours?.toString() ?? '')
  const [notes,           setNotes]           = useState(e.notes ?? '')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  const isHours = intervalType === 'hours'
  const iv = intervalValue ? parseInt(intervalValue) : null
  const computedNextDue = (!isHours && lastService && iv) ? addMonths(lastService, iv) : null

  const preview = computeService({
    interval_type: intervalType,
    interval_value: iv,
    current_hours: currentHours ? parseInt(currentHours) : null,
    last_service_hours: lastSvcHours ? parseInt(lastSvcHours) : null,
    last_service: lastService || null,
    next_due: computedNextDue,
  })

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from('equipment')
      .update({
        name, category, model: model || null, serial: serial || null,
        last_service: lastService || null,
        next_due: computedNextDue,
        interval_type: intervalType,
        interval_value: iv,
        current_hours: isHours && currentHours ? parseInt(currentHours) : null,
        last_service_hours: isHours && lastSvcHours ? parseInt(lastSvcHours) : null,
        assigned_tech: assignedTech || null,
        notes: notes || null,
      })
      .eq('id', e.id)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as Equipment)
  }

  const field = (label: string, input: React.ReactNode) => (
    <div>
      <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>
      {input}
    </div>
  )
  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const textInput = (val: string, onChange: (v: string) => void, placeholder = '') => (
    <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
  )
  const numInput = (val: string, onChange: (v: string) => void, placeholder = '') => (
    <input type="number" min="0" value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Edit equipment</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name', textInput(name, setName))}
            {field('Category',
              <select value={category} onChange={e => setCategory(e.target.value)} className={cls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Make / model', textInput(model, setModel))}
            {field('Serial #', textInput(serial, setSerial))}
            {field('Assigned tech', textInput(assignedTech, setAssignedTech))}
            {field('Last serviced (date)',
              <input type="date" value={lastService} onChange={e => setLastService(e.target.value)} className={cls} />
            )}
          </div>

          {/* Service interval */}
          <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)]">
            <div className="text-[11px] font-medium text-[var(--color-text-primary)] mb-2">Service interval</div>
            <div className="grid grid-cols-2 gap-[10px]">
              {field('Service every',
                <div className="flex gap-1.5">
                  <input type="number" min="1" value={intervalValue} onChange={e => setIntervalValue(e.target.value)} placeholder="e.g. 150"
                    className={`${cls} flex-1`} />
                  <select value={intervalType} onChange={e => setIntervalType(e.target.value as IntervalType)}
                    className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                    <option value="months">months</option>
                    <option value="hours">engine hours</option>
                  </select>
                </div>
              )}
              {!isHours && field('Next due (auto)',
                <input type="text" readOnly value={computedNextDue ? preview.label : 'set last serviced + interval'} className={`${cls} text-[var(--color-text-secondary)]`} />
              )}
            </div>

            {isHours && (
              <div className="grid grid-cols-2 gap-[10px] mt-[10px]">
                {field('Current hours', numInput(currentHours, setCurrentHours, 'e.g. 2404'))}
                {field('Hours at last service', numInput(lastSvcHours, setLastSvcHours, 'e.g. 2300'))}
              </div>
            )}
          </div>

          {field('Notes',
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${cls} resize-y`} />
          )}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            <div className="flex items-center gap-2">
              <ServiceStatusBadge status={preview.status} />
              <span className="text-[11px] text-[var(--color-text-secondary)]">{preview.label}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white border border-[#185FA5] rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
                <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
