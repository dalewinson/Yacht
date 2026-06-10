'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getServiceStatus, fmtDate } from '@/lib/utils'
import ServiceStatusBadge from './ServiceStatusBadge'
import type { Database, ServiceInterval } from '@/types/database'

type Equipment = Database['public']['Tables']['equipment']['Row']

const CATEGORIES = ['Propulsion','Electrical','Safety','Navigation','HVAC','Plumbing','Systems','Deck']
const INTERVALS: ServiceInterval[] = ['monthly','quarterly','biannual','annual']

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
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[26%]">Equipment</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[15%]">Category</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[20%]">Make / model</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Next due</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[11%]">Status</th>
              <th className="w-[14%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-4">No equipment found</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="hover:bg-[var(--color-background-secondary)]">
                <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                  <button onClick={() => setSelected(e)} className="text-[#185FA5] hover:underline text-left">{e.name}</button>
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.category}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{e.model ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{e.next_due ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]"><ServiceStatusBadge status={getServiceStatus(e.next_due)} /></td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setSelected(e)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">
                    <i className="ti ti-edit text-[12px]" /> Edit
                  </button>
                </td>
              </tr>
            ))}
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

function EquipmentEditModal({ equipment: e, onClose, onSaved }: {
  equipment: Equipment
  onClose: () => void
  onSaved: (updated: Equipment) => void
}) {
  const [name,         setName]         = useState(e.name)
  const [category,     setCategory]     = useState(e.category)
  const [model,        setModel]        = useState(e.model ?? '')
  const [serial,       setSerial]       = useState(e.serial ?? '')
  const [lastService,  setLastService]  = useState(e.last_service ?? '')
  const [nextDue,      setNextDue]      = useState(e.next_due ?? '')
  const [interval,     setInterval]     = useState<ServiceInterval>(e.interval)
  const [assignedTech, setAssignedTech] = useState(e.assigned_tech ?? '')
  const [notes,        setNotes]        = useState(e.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from('equipment')
      .update({ name, category, model: model||null, serial: serial||null, last_service: lastService||null, next_due: nextDue||null, interval, assigned_tech: assignedTech||null, notes: notes||null })
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

  const textInput = (val: string, onChange: (v: string) => void, placeholder = '') => (
    <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
  )

  const dateInput = (val: string, onChange: (v: string) => void) => (
    <input type="date" value={val} onChange={e => onChange(e.target.value)}
      className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[82vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Edit equipment</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name', textInput(name, setName))}
            {field('Category',
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('Make / model', textInput(model, setModel))}
            {field('Serial #', textInput(serial, setSerial))}
            {field('Last service', dateInput(lastService, setLastService))}
            {field('Next due', dateInput(nextDue, setNextDue))}
            {field('Interval',
              <select value={interval} onChange={e => setInterval(e.target.value as ServiceInterval)}
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                {INTERVALS.map(i => <option key={i} value={i}>{i === 'biannual' ? '6 months' : i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            )}
            {field('Assigned tech', textInput(assignedTech, setAssignedTech))}
          </div>

          {field('Notes',
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y" />
          )}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            <ServiceStatusBadge status={getServiceStatus(nextDue || null)} />
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
