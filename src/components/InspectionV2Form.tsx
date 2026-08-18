'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeTask, fmtDate, isScheduled } from '@/lib/utils'
import ServiceStatusBadge from './ServiceStatusBadge'
import { FlaggedReview, type Candidate } from './InspectionsClient'
import { useDueSoon } from './SettingsProvider'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export type EqLite = { id: string; name: string; category: string; area: string | null; current_hours: number | null; last_inspected: string | null }
export type ItemLite = { id: string; name: string; interval_type: 'hours' | 'months' | null; interval_value: number | null; field_type: 'ok' | 'text' | 'number'; last_done_date: string | null; last_done_hours: number | null }
type Answer = { ok: boolean; value: string; notes: string; done: boolean }
type EqAnswers = { hours: string; items: Record<string, Answer> }

// A snapshot equipment/item (frozen on the inspection so it renders forever).
type SnapItem = { id: string; name: string; field_type: 'ok' | 'text' | 'number'; scheduled: boolean; interval_type: 'hours' | 'months' | null; interval_value: number | null; last_done_date: string | null; last_done_hours: number | null }
type SnapEq = { id: string; name: string; category: string; hoursTracked: boolean; items: SnapItem[] }
type SnapArea = { area: string; equipment: SnapEq[] }

export type InspectionRow = {
  id: string; vessel_id: string; vessel_name: string; tech: string | null; date: string; month: string; year: number
  equipment_answers: Record<string, EqAnswers> | null; snapshot: SnapArea[] | null
}

function hoursTracked(items: ItemLite[], eq: EqLite) {
  return items.some(i => i.interval_type === 'hours') || eq.current_hours != null
}

// Build the frozen area→equipment→items structure from the live equipment.
function buildSnapshot(equipment: EqLite[], tasksByEq: Record<string, ItemLite[]>): SnapArea[] {
  const byArea: Record<string, SnapEq[]> = {}
  for (const eq of [...equipment].sort((a, b) => (a.area ?? '~').localeCompare(b.area ?? '~') || a.name.localeCompare(b.name))) {
    const items = tasksByEq[eq.id] ?? []
    const snapEq: SnapEq = {
      id: eq.id, name: eq.name, category: eq.category, hoursTracked: hoursTracked(items, eq),
      items: items.map(i => ({ id: i.id, name: i.name, field_type: i.field_type, scheduled: isScheduled(i), interval_type: i.interval_type, interval_value: i.interval_value, last_done_date: i.last_done_date, last_done_hours: i.last_done_hours })),
    }
    ;(byArea[eq.area ?? 'Unassigned'] ??= []).push(snapEq)
  }
  return Object.entries(byArea).map(([area, equipment]) => ({ area, equipment }))
}

export default function InspectionV2Form({
  vesselId, vesselName, equipment, tasksByEq, existing, onClose, onSaved,
}: {
  vesselId: string
  vesselName: string
  equipment: EqLite[]
  tasksByEq: Record<string, ItemLite[]>
  existing?: InspectionRow
  onClose: () => void
  onSaved: () => void
}) {
  const ds = useDueSoon()
  const today = new Date().toISOString().slice(0, 10)
  const groups: SnapArea[] = existing?.snapshot ?? buildSnapshot(equipment, tasksByEq)
  const eqCurHours: Record<string, number | null> = Object.fromEntries(equipment.map(e => [e.id, e.current_hours]))

  const [tech, setTech]   = useState(existing?.tech ?? 'Dale')
  const [month, setMonth] = useState(existing?.month ?? MONTHS[new Date().getMonth()])
  const [year, setYear]   = useState(existing?.year ?? new Date().getFullYear())
  const [date, setDate]   = useState(existing?.date ?? today)
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState<{ candidates: Candidate[] } | null>(null)

  // answers[eqId] = { hours, items: { itemId: answer } }
  const [answers, setAnswers] = useState<Record<string, EqAnswers>>(() => {
    const out: Record<string, EqAnswers> = {}
    for (const area of groups) for (const eq of area.equipment) {
      const prior = existing?.equipment_answers?.[eq.id]
      const items: Record<string, Answer> = {}
      for (const it of eq.items) {
        const pa = prior?.items?.[it.id]
        items[it.id] = pa ?? { ok: true, value: '', notes: '', done: false }
      }
      out[eq.id] = { hours: prior?.hours ?? (eqCurHours[eq.id]?.toString() ?? ''), items }
    }
    return out
  })

  function setItem(eqId: string, itemId: string, p: Partial<Answer>) {
    setAnswers(prev => ({ ...prev, [eqId]: { ...prev[eqId], items: { ...prev[eqId].items, [itemId]: { ...prev[eqId].items[itemId], ...p } } } }))
  }
  function setHours(eqId: string, v: string) {
    setAnswers(prev => ({ ...prev, [eqId]: { ...prev[eqId], hours: v } }))
  }
  function toggleArea(a: string) {
    setOpenAreas(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }
  function areaFlags(area: SnapArea) {
    let n = 0
    for (const eq of area.equipment) for (const it of eq.items) if (answers[eq.id]?.items[it.id]?.ok === false) n++
    return n
  }

  async function save() {
    setSaving(true); setError('')
    const supabase = createClient()

    const payload = {
      vessel_id: vesselId, vessel_name: vesselName, tech: tech || null,
      date, month, year, format: 'v2',
      equipment_answers: answers, snapshot: groups,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any, err: any
    try {
      if (existing) {
        ;({ data, error: err } = await (supabase as any).from('inspections').update(payload).eq('id', existing.id).select().single())
      } else {
        ;({ data, error: err } = await (supabase as any).from('inspections').insert(payload).select().single())
      }
    } catch {
      setError('Couldn’t save — check your connection and tap Save again. Your entries are still here.')
      setSaving(false); return
    }
    if (err) { setError(err.message); setSaving(false); return }

    // Best-effort write-through: hours → equipment, mark-done → tasks, last_inspected, tickets.
    try {
      const candidates: Candidate[] = []
      for (const area of groups) {
        for (const eq of area.equipment) {
          const a = answers[eq.id]
          if (!a) continue
          // hours → equipment.current_hours
          const hrs = a.hours ? parseInt(a.hours) : null
          if (eq.hoursTracked && hrs != null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('equipment').update({ current_hours: hrs }).eq('id', eq.id)
          }
          // stamp last inspected
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('equipment').update({ last_inspected: date }).eq('id', eq.id)

          for (const it of eq.items) {
            const ans = a.items[it.id]
            if (!ans) continue
            // scheduled item marked done → reset its clock
            if (it.scheduled && ans.done) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const patch: any = { last_done_date: date }
              if (it.interval_type === 'hours' && hrs != null) patch.last_done_hours = hrs
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any).from('service_tasks').update(patch).eq('id', it.id)
            }
            // flagged → ticket candidate
            if (ans.ok === false) {
              const ref = `insp:${eq.id}:${it.id}`
              candidates.push({
                key: ref, itemName: it.name, sectionLabel: `${area.area} · ${eq.name}`,
                equipmentId: eq.id, category: eq.category, comment: ans.notes || '',
                ref, alreadyOpen: false, selected: true,
                title: `${eq.name} — ${it.name}`, priority: 'medium',
              })
            }
          }
        }
      }

      if (candidates.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: openT } = await (supabase as any).from('tickets')
          .select('inspection_ref').eq('vessel_id', vesselId).in('status', ['open', 'in_progress'])
        const openRefs = new Set(((openT ?? []) as { inspection_ref: string | null }[]).map(t => t.inspection_ref).filter(Boolean))
        for (const c of candidates) if (openRefs.has(c.ref)) { c.alreadyOpen = true; c.selected = false }
        setSaving(false)
        setReview({ candidates })
        return
      }
    } catch { /* best-effort */ }

    setSaving(false)
    onSaved()
  }

  const inputCls = "px-[7px] py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50">
      <div className="flex flex-col bg-[var(--color-background-primary)] w-full max-w-[820px] mx-auto my-4 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{existing ? `${existing.month} ${existing.year} Inspection` : 'New Inspection'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <div className="flex flex-wrap items-end gap-3 px-5 py-3 border-b border-[var(--color-border-tertiary)] flex-shrink-0">
          <Meta label="Month"><select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>{MONTHS.map(m => <option key={m}>{m}</option>)}</select></Meta>
          <Meta label="Year"><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-[80px]`} /></Meta>
          <Meta label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Meta>
          <Meta label="Tech"><input type="text" value={tech} onChange={e => setTech(e.target.value)} className={`${inputCls} w-[120px]`} /></Meta>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {groups.length === 0 && <p className="text-[12px] text-[var(--color-text-secondary)]">No equipment yet. Add equipment (with an area) first.</p>}
          {groups.map(area => {
            const open = openAreas.has(area.area)
            const flags = areaFlags(area)
            return (
              <div key={area.area} className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] overflow-hidden">
                <button onClick={() => toggleArea(area.area)} className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)]">
                  <span className="text-[13px] font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                    <i className={`ti ti-chevron-${open ? 'down' : 'right'} text-[13px]`} />
                    {area.area}
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">· {area.equipment.length} item{area.equipment.length !== 1 ? 's' : ''}</span>
                  </span>
                  {flags > 0 && <span className="text-[11px] px-1.5 py-[1px] rounded bg-[#FAEEDA] text-[#854F0B]">{flags} flagged</span>}
                </button>

                {open && (
                  <div className="p-3 space-y-3">
                    {area.equipment.map(eq => (
                      <div key={eq.id} className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{eq.name} <span className="text-[10px] font-normal text-[var(--color-text-tertiary)]">{eq.category}</span></span>
                          {eq.hoursTracked && (
                            <label className="text-[11px] text-[var(--color-text-secondary)] inline-flex items-center gap-1.5">
                              Hours <input type="number" value={answers[eq.id]?.hours ?? ''} onChange={e => setHours(eq.id, e.target.value)} className={`${inputCls} w-[90px]`} placeholder="0" />
                            </label>
                          )}
                        </div>

                        {eq.items.length === 0 ? (
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">No items to check. Add items on the Equipment page.</p>
                        ) : (
                          <div className="space-y-1">
                            {eq.items.map(it => {
                              const ans = answers[eq.id]?.items[it.id] ?? { ok: true, value: '', notes: '', done: false }
                              const due = it.scheduled ? computeTask({ name: it.name, interval_type: it.interval_type, interval_value: it.interval_value, last_done_date: it.last_done_date, last_done_hours: it.last_done_hours }, answers[eq.id]?.hours ? parseInt(answers[eq.id].hours) : eqCurHours[eq.id], { leadDays: ds.days, leadHours: ds.hours }) : null
                              return (
                                <div key={it.id} className={`rounded p-1.5 ${ans.ok === false ? 'bg-red-50' : ''}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <label className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-primary)] cursor-pointer min-w-[150px]">
                                      <input type="checkbox" checked={ans.ok} onChange={e => setItem(eq.id, it.id, { ok: e.target.checked })} />
                                      {it.name}
                                    </label>
                                    {it.field_type !== 'ok' && (
                                      <input type={it.field_type === 'number' ? 'number' : 'text'} value={ans.value} onChange={e => setItem(eq.id, it.id, { value: e.target.value })}
                                        placeholder={it.field_type === 'number' ? 'value' : 'reading'} className={`${inputCls} w-[90px]`} />
                                    )}
                                    {it.scheduled && due && (
                                      <span className="inline-flex items-center gap-1"><ServiceStatusBadge status={due.status} /><span className="text-[10px] text-[var(--color-text-tertiary)]">{due.label}</span></span>
                                    )}
                                    {it.scheduled && (
                                      <label className="text-[10px] text-[var(--color-text-secondary)] inline-flex items-center gap-1 ml-auto">
                                        <input type="checkbox" checked={ans.done} onChange={e => setItem(eq.id, it.id, { done: e.target.checked })} /> serviced now
                                      </label>
                                    )}
                                  </div>
                                  <input type="text" value={ans.notes} onChange={e => setItem(eq.id, it.id, { notes: e.target.value })} placeholder="notes…"
                                    className="w-full mt-1 px-1.5 py-0.5 text-[11px] border border-[var(--color-border-tertiary)] rounded bg-transparent text-[var(--color-text-secondary)]" />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          {error ? <p className="text-[12px] text-[#A32D2D]">{error}</p> : <span className="text-[11px] text-[var(--color-text-tertiary)]">Tap an area to inspect the equipment there.</span>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {review && (
        <FlaggedReview vesselId={vesselId} candidates={review.candidates} onDone={() => { setReview(null); onSaved() }} />
      )}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5"><label className="text-[10px] text-[var(--color-text-secondary)]">{label}</label>{children}</div>
}
