'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import {
  INSPECTION_SECTIONS,
  emptyInspection,
  type InspectionSections,
  type SectionData,
  type ItemData,
} from '@/lib/inspection-template'

type Vessel = { id: string; name: string }
type Inspection = {
  id: string
  vessel_id: string
  vessel_name: string
  tech: string | null
  date: string
  month: string
  year: number
  port_engine_hrs: number | null
  stbd_engine_hrs: number | null
  port_gen_hrs: number | null
  sections: InspectionSections
  created_at: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function InspectionsClient({
  vessels,
  inspections: initial,
}: {
  vessels: Vessel[]
  inspections: Inspection[]
}) {
  const [inspections, setInspections] = useState<Inspection[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Inspection | null>(null)

  function handleCreated(insp: Inspection) {
    setInspections(prev => [insp, ...prev])
    setShowNew(false)
    setViewing(insp)
  }

  function handleUpdated(insp: Inspection) {
    setInspections(prev => prev.map(i => i.id === insp.id ? insp : i))
    setViewing(insp)
  }

  return (
    <>
      <div className="flex justify-end mb-3.5">
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]"
        >
          <i className="ti ti-plus text-[13px]" /> New inspection
        </button>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[680px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[22%]">Period</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[18%]">Vessel</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Tech</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Port Eng Hrs</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Stbd Eng Hrs</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[10%]">Date</th>
              <th className="w-[8%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {inspections.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-[var(--color-text-secondary)] py-8">No inspections yet. Click "New inspection" to start.</td></tr>
            ) : inspections.map(insp => (
              <tr key={insp.id} className="hover:bg-[var(--color-background-secondary)]">
                <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setViewing(insp)} className="text-[#185FA5] hover:underline">{insp.month} {insp.year}</button>
                </td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{insp.vessel_name}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{insp.tech ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{insp.port_engine_hrs ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{insp.stbd_engine_hrs ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{fmtDate(insp.date)}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setViewing(insp)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">
                    <i className="ti ti-edit text-[12px]" /> Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <InspectionForm
          vessels={vessels}
          onClose={() => setShowNew(false)}
          onSaved={handleCreated}
        />
      )}

      {viewing && (
        <InspectionForm
          vessels={vessels}
          existing={viewing}
          onClose={() => setViewing(null)}
          onSaved={handleUpdated}
        />
      )}
    </>
  )
}

function InspectionForm({
  vessels,
  existing,
  onClose,
  onSaved,
}: {
  vessels: Vessel[]
  existing?: Inspection
  onClose: () => void
  onSaved: (insp: Inspection) => void
}) {
  const today = new Date()
  const [vesselId, setVesselId] = useState(existing?.vessel_id ?? vessels[0]?.id ?? '')
  const [tech, setTech] = useState(existing?.tech ?? 'Dale')
  const [month, setMonth] = useState(existing?.month ?? MONTHS[today.getMonth()])
  const [year, setYear] = useState(existing?.year ?? today.getFullYear())
  const [date, setDate] = useState(existing?.date ?? today.toISOString().slice(0, 10))
  const [sections, setSections] = useState<InspectionSections>(existing?.sections ?? emptyInspection())
  const [activeSec, setActiveSec] = useState(INSPECTION_SECTIONS[0].id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateItem(secId: string, itemName: string, field: string, value: unknown) {
    setSections(prev => ({
      ...prev,
      [secId]: {
        ...prev[secId],
        items: {
          ...prev[secId]?.items,
          [itemName]: {
            ...prev[secId]?.items?.[itemName],
            [field]: value,
          },
        },
      },
    }))
  }

  function updateSection(secId: string, field: string, value: string) {
    setSections(prev => ({
      ...prev,
      [secId]: { ...prev[secId], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const vessel = vessels.find(v => v.id === vesselId)
    const portSec = sections['port_engine'] as SectionData
    const stbdSec = sections['stbd_engine'] as SectionData
    const portGenSec = sections['port_gen'] as SectionData

    const payload = {
      vessel_id: vesselId,
      vessel_name: vessel?.name ?? '',
      tech: tech || null,
      date,
      month,
      year,
      port_engine_hrs: portSec?.hours ? parseInt(portSec.hours) : null,
      stbd_engine_hrs: stbdSec?.hours ? parseInt(stbdSec.hours) : null,
      port_gen_hrs: portGenSec?.hours ? parseInt(portGenSec.hours) : null,
      sections,
    }

    const supabase = createClient()
    let data: any, err: any

    if (existing) {
      ;({ data, error: err } = await (supabase as any).from('inspections').update(payload).eq('id', existing.id).select().single())
    } else {
      ;({ data, error: err } = await (supabase as any).from('inspections').insert(payload).select().single())
    }

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as Inspection)
    setSaving(false)
  }

  const secDef = INSPECTION_SECTIONS.find(s => s.id === activeSec)!
  const secData: SectionData = sections[activeSec] ?? { items: {} }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50">
      <div className="flex flex-col bg-[var(--color-background-primary)] w-full max-w-[900px] mx-auto my-4 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {existing ? `${existing.month} ${existing.year} Inspection` : 'New Monthly Inspection'}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-[var(--color-border-tertiary)] flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[var(--color-text-secondary)]">Vessel</label>
            <select value={vesselId} onChange={e => setVesselId(e.target.value)} className={inputCls}>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[var(--color-text-secondary)]">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[var(--color-text-secondary)]">Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-[80px]`} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[var(--color-text-secondary)]">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[var(--color-text-secondary)]">Tech</label>
            <input type="text" value={tech} onChange={e => setTech(e.target.value)} className={`${inputCls} w-[120px]`} />
          </div>
        </div>

        {/* Body: section nav + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Section sidebar */}
          <div className="w-[160px] flex-shrink-0 border-r border-[var(--color-border-tertiary)] overflow-y-auto bg-[var(--color-background-secondary)]">
            {INSPECTION_SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSec(sec.id)}
                className={`w-full text-left px-3 py-2 text-[11px] border-b border-[var(--color-border-tertiary)] transition-colors ${
                  activeSec === sec.id
                    ? 'bg-[#185FA5] text-white font-medium'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4">
            <SectionEditor
              secDef={secDef}
              secData={secData}
              onUpdateItem={(item, field, val) => updateItem(activeSec, item, field, val)}
              onUpdateSection={(field, val) => updateSection(activeSec, field, val)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          {error ? <p className="text-[12px] text-[#A32D2D]">{error}</p> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = "px-[7px] py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

function SectionEditor({
  secDef,
  secData,
  onUpdateItem,
  onUpdateSection,
}: {
  secDef: ReturnType<typeof INSPECTION_SECTIONS[0]['type'] extends string ? () => typeof INSPECTION_SECTIONS[0] : never> | typeof INSPECTION_SECTIONS[0]
  secData: SectionData
  onUpdateItem: (item: string, field: string, val: unknown) => void
  onUpdateSection: (field: string, val: string) => void
}) {
  const items = secData.items ?? {}

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{secDef.label}</h3>
        {(secDef.type === 'engine') && (
          <div className="flex gap-2 items-center">
            <label className="text-[11px] text-[var(--color-text-secondary)]">Hours</label>
            <input
              type="number"
              value={secData.hours ?? ''}
              onChange={e => onUpdateSection('hours', e.target.value)}
              className={`${inputCls} w-[90px]`}
              placeholder="0"
            />
            <label className="text-[11px] text-[var(--color-text-secondary)]">Model</label>
            <input
              type="text"
              value={secData.model ?? ''}
              onChange={e => onUpdateSection('model', e.target.value)}
              className={`${inputCls} w-[140px]`}
              placeholder="e.g. VP IPS 1350"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[var(--color-background-secondary)]">
              <th className="text-left font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[28%]">Item</th>
              {secDef.type === 'engine' && (
                <>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[9%] text-center">Level</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[11%] text-center">Hrs Changed</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[12%] text-center">Date Changed</th>
                </>
              )}
              {secDef.type === 'battery' && (
                <>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[10%] text-center">Volts</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
                </>
              )}
              {secDef.type === 'dual_check' && (
                <>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col1}</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col2}</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
                </>
              )}
              {secDef.type === 'triple_check' && (
                <>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col1}</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col2}</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col3}</th>
                </>
              )}
              {(secDef.type === 'ok_only') && (
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
              )}
              {secDef.type === 'fire_ext' && (
                <>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[10%] text-center">Level</th>
                  <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
                </>
              )}
              <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)]">Comments</th>
            </tr>
          </thead>
          <tbody>
            {secDef.items.map(itemName => {
              const item = items[itemName] ?? {}
              const d = item as any
              return (
                <tr key={itemName} className={`${d.ok === false ? 'bg-red-50' : 'hover:bg-[var(--color-background-secondary)]'}`}>
                  <td className="px-2 py-1 border border-[var(--color-border-tertiary)] font-medium text-[var(--color-text-primary)]">{itemName}</td>

                  {secDef.type === 'engine' && (
                    <>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="text" value={d.level ?? ''} onChange={e => onUpdateItem(itemName, 'level', e.target.value)}
                          className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="text" value={d.hrs_changed ?? ''} onChange={e => onUpdateItem(itemName, 'hrs_changed', e.target.value)}
                          className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="date" value={d.date_changed ?? ''} onChange={e => onUpdateItem(itemName, 'date_changed', e.target.value)}
                          className="w-full text-center text-[11px] border-0 outline-none bg-transparent" />
                      </td>
                    </>
                  )}

                  {secDef.type === 'battery' && (
                    <>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="text" value={d.volts ?? ''} onChange={e => onUpdateItem(itemName, 'volts', e.target.value)}
                          className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} />
                      </td>
                    </>
                  )}

                  {secDef.type === 'dual_check' && (
                    <>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.col1 !== false} onChange={e => onUpdateItem(itemName, 'col1', e.target.checked)} />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.col2 !== false} onChange={e => onUpdateItem(itemName, 'col2', e.target.checked)} />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} />
                      </td>
                    </>
                  )}

                  {secDef.type === 'triple_check' && (
                    <>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.col1 !== false} onChange={e => onUpdateItem(itemName, 'col1', e.target.checked)} />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.col2 !== false} onChange={e => onUpdateItem(itemName, 'col2', e.target.checked)} />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.col3 !== false} onChange={e => onUpdateItem(itemName, 'col3', e.target.checked)} />
                      </td>
                    </>
                  )}

                  {secDef.type === 'ok_only' && (
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                      <input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} />
                    </td>
                  )}

                  {secDef.type === 'fire_ext' && (
                    <>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="text" value={d.level ?? 'Full'} onChange={e => onUpdateItem(itemName, 'level', e.target.value)}
                          className="w-full text-center text-[11px] border-0 outline-none bg-transparent" />
                      </td>
                      <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                        <input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} />
                      </td>
                    </>
                  )}

                  <td className="px-1 py-1 border border-[var(--color-border-tertiary)]">
                    <input type="text" value={d.comments ?? ''} onChange={e => onUpdateItem(itemName, 'comments', e.target.value)}
                      className="w-full text-[11px] border-0 outline-none bg-transparent" placeholder="Add note…" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">Section notes</label>
        <textarea
          value={secData.notes ?? ''}
          onChange={e => onUpdateSection('notes', e.target.value)}
          rows={2}
          placeholder="Any additional notes for this section…"
          className="w-full px-2 py-1.5 text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y"
        />
      </div>
    </div>
  )
}
