'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeTask, fmtDate, isScheduled } from '@/lib/utils'
import ServiceStatusBadge from './ServiceStatusBadge'
import { FlaggedReview, type Candidate } from './InspectionsClient'
import { useDueSoon } from './SettingsProvider'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export type EqLite = { id: string; name: string; category: string; area: string | null; current_hours: number | null; last_inspected: string | null }
export type ItemLite = { id: string; name: string; interval_type: 'hours' | 'months' | null; interval_value: number | null; field_type: 'ok' | 'text' | 'number'; last_done_date: string | null; last_done_hours: number | null }
// Each item is inspected in three states: 'unset' (blank, not yet inspected),
// 'ok' (checked / passed), or 'issue' (flagged → ticket candidate on save).
type ItemStatus = 'unset' | 'ok' | 'issue'
type Answer = { status: ItemStatus; value: string; notes: string; done: boolean }
type EqAnswers = { hours: string; items: Record<string, Answer> }

// Normalize a stored/draft answer, mapping the legacy boolean `ok` shape
// (checked = ok, unchecked = issue) onto the three-state model.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normAnswer(a: any): Answer {
  const status: ItemStatus = typeof a?.status === 'string' ? a.status
    : a?.ok === false ? 'issue' : a?.ok === true ? 'ok' : 'unset'
  return { status, value: a?.value ?? '', notes: a?.notes ?? '', done: !!a?.done }
}
const BLANK: Answer = { status: 'unset', value: '', notes: '', done: false }

// An unsaved in-progress inspection, persisted to localStorage so a mobile
// browser discarding the backgrounded tab doesn't lose entered data.
type Draft = { answers: Record<string, EqAnswers>; groups: SnapArea[]; tech: string; month: string; year: number; date: string; ts: number }

function readDraft(key: string): Draft | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch { return null }
}

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
  const draftKey = `insp-draft:v2:${vesselId}:${existing?.id ?? 'new'}`
  // A previously auto-saved draft found on mount — offered for restore rather
  // than applied silently (so editing a real inspection isn't clobbered).
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(() => readDraft(draftKey))
  // Existing inspections render from their frozen snapshot so historical reports
  // stay stable; "Refresh items from equipment" (below) re-syncs on demand.
  const [groups, setGroups] = useState<SnapArea[]>(() => existing?.snapshot ?? buildSnapshot(equipment, tasksByEq))
  const [justRefreshed, setJustRefreshed] = useState(false)
  const eqCurHours: Record<string, number | null> = Object.fromEntries(equipment.map(e => [e.id, e.current_hours]))

  const [tech, setTech]   = useState(existing?.tech ?? 'Dale')
  const [month, setMonth] = useState(existing?.month ?? MONTHS[new Date().getMonth()])
  const [year, setYear]   = useState(existing?.year ?? new Date().getFullYear())
  const [date, setDate]   = useState(existing?.date ?? today)
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [blankWarn, setBlankWarn] = useState(0)
  const [review, setReview] = useState<{ candidates: Candidate[] } | null>(null)

  // answers[eqId] = { hours, items: { itemId: answer } }
  const [answers, setAnswers] = useState<Record<string, EqAnswers>>(() => {
    const out: Record<string, EqAnswers> = {}
    for (const area of groups) for (const eq of area.equipment) {
      const prior = existing?.equipment_answers?.[eq.id]
      const items: Record<string, Answer> = {}
      for (const it of eq.items) {
        const pa = prior?.items?.[it.id]
        items[it.id] = pa ? normAnswer(pa) : { ...BLANK }
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
  // Re-sync this inspection with the current equipment/items: pulls in newly
  // added items (and equipment) while keeping every answer already entered.
  function refreshFromEquipment() {
    const fresh = buildSnapshot(equipment, tasksByEq)
    setAnswers(prev => {
      const out: Record<string, EqAnswers> = {}
      for (const area of fresh) for (const eq of area.equipment) {
        const priorEq = prev[eq.id]
        const items: Record<string, Answer> = {}
        for (const it of eq.items) items[it.id] = priorEq?.items?.[it.id] ?? { ...BLANK }
        out[eq.id] = { hours: priorEq?.hours ?? (eqCurHours[eq.id]?.toString() ?? ''), items }
      }
      return out
    })
    setGroups(fresh)
    setJustRefreshed(true)
  }
  function toggleArea(a: string) {
    setOpenAreas(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }

  // Continuously persist the in-progress inspection so a discarded tab / reload
  // doesn't lose data. Skipped while a draft is pending restore (would clobber it).
  useEffect(() => {
    if (pendingDraft) return
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ answers, groups, tech, month, year, date, ts: Date.now() } satisfies Draft))
      } catch { /* storage unavailable (private mode, quota) — nothing to do */ }
    }, 400)
    return () => clearTimeout(id)
  }, [answers, groups, tech, month, year, date, pendingDraft, draftKey])

  function clearDraft() {
    try { window.localStorage.removeItem(draftKey) } catch { /* ignore */ }
  }
  function restoreDraft() {
    if (!pendingDraft) return
    const norm: Record<string, EqAnswers> = {}
    for (const [eqId, ea] of Object.entries(pendingDraft.answers)) {
      const items: Record<string, Answer> = {}
      for (const [itId, a] of Object.entries(ea.items ?? {})) items[itId] = normAnswer(a)
      norm[eqId] = { hours: ea.hours ?? '', items }
    }
    setAnswers(norm)
    setGroups(pendingDraft.groups)
    setTech(pendingDraft.tech); setMonth(pendingDraft.month); setYear(pendingDraft.year); setDate(pendingDraft.date)
    setPendingDraft(null)
  }
  function discardDraft() {
    clearDraft()
    setPendingDraft(null)
  }
  function areaFlags(area: SnapArea) {
    let n = 0
    for (const eq of area.equipment) for (const it of eq.items) if (answers[eq.id]?.items[it.id]?.status === 'issue') n++
    return n
  }
  function countUnset() {
    let n = 0
    for (const area of groups) for (const eq of area.equipment) for (const it of eq.items) {
      if ((answers[eq.id]?.items[it.id]?.status ?? 'unset') === 'unset') n++
    }
    return n
  }

  async function save(force = false) {
    // Warn (once) if any items are still blank / not inspected.
    if (!force) {
      const blanks = countUnset()
      if (blanks > 0) { setBlankWarn(blanks); return }
    }
    setBlankWarn(0)
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
    clearDraft() // saved to DB — the local draft is no longer needed

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
            if (ans.status === 'issue') {
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
          {existing && (
            <button type="button" onClick={refreshFromEquipment} title="Pull in items added on the Equipment page since this inspection was created — your entered answers are kept."
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-[6px] text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]">
              <i className="ti ti-refresh text-[12px]" /> Refresh items from equipment
            </button>
          )}
        </div>
        {justRefreshed && (
          <div className="px-5 py-1.5 border-b border-[var(--color-border-tertiary)] bg-[#EAF3E9] text-[11px] text-[#2F6A2E] flex-shrink-0">
            <i className="ti ti-check text-[12px]" /> Synced with current equipment — any newly added items now appear below. Your entered answers were kept. Save to keep the update.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pendingDraft && (
            <div className="border border-[#E4C77B] bg-[#FAF3E0] rounded-[var(--border-radius-md)] p-3 flex flex-wrap items-center gap-2">
              <i className="ti ti-history text-[15px] text-[#854F0B]" />
              <span className="text-[12px] text-[#5A4212] flex-1 min-w-[180px]">
                Unsaved inspection found from {new Date(pendingDraft.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Restore your entries?
              </span>
              <button type="button" onClick={restoreDraft} className="px-2.5 py-[5px] text-[11px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]">Restore</button>
              <button type="button" onClick={discardDraft} className="px-2.5 py-[5px] text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Discard</button>
            </div>
          )}
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
                              const ans = answers[eq.id]?.items[it.id] ?? BLANK
                              const due = it.scheduled ? computeTask({ name: it.name, interval_type: it.interval_type, interval_value: it.interval_value, last_done_date: it.last_done_date, last_done_hours: it.last_done_hours }, answers[eq.id]?.hours ? parseInt(answers[eq.id].hours) : eqCurHours[eq.id], { leadDays: ds.days, leadHours: ds.hours }) : null
                              return (
                                <div key={it.id} className={`rounded p-1.5 ${ans.status === 'issue' ? 'bg-red-50' : ''}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="inline-flex items-center gap-2 min-w-[150px]">
                                      <div className="inline-flex rounded-[var(--border-radius-md)] border border-[var(--color-border-secondary)] overflow-hidden shrink-0">
                                        <button type="button" title="OK" aria-pressed={ans.status === 'ok'}
                                          onClick={() => setItem(eq.id, it.id, { status: ans.status === 'ok' ? 'unset' : 'ok' })}
                                          className={`px-2 py-[3px] ${ans.status === 'ok' ? 'bg-[#2F6A2E] text-white' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]'}`}>
                                          <i className="ti ti-check text-[13px] block" />
                                        </button>
                                        <button type="button" title="Flag issue" aria-pressed={ans.status === 'issue'}
                                          onClick={() => setItem(eq.id, it.id, { status: ans.status === 'issue' ? 'unset' : 'issue' })}
                                          className={`px-2 py-[3px] border-l border-[var(--color-border-secondary)] ${ans.status === 'issue' ? 'bg-[#A32D2D] text-white' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]'}`}>
                                          <i className="ti ti-flag text-[13px] block" />
                                        </button>
                                      </div>
                                      <span className="text-[12px] text-[var(--color-text-primary)]">{it.name}</span>
                                    </div>
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

        {blankWarn > 0 && (
          <div className="px-5 py-2 border-t border-[#E4C77B] bg-[#FAF3E0] text-[11px] text-[#5A4212] flex flex-wrap items-center gap-2 flex-shrink-0">
            <i className="ti ti-alert-triangle text-[13px] text-[#854F0B]" />
            <span className="flex-1 min-w-[160px]">{blankWarn} item{blankWarn !== 1 ? 's' : ''} not yet inspected (still blank). Mark each OK or flag an issue, or save anyway.</span>
            <button type="button" onClick={() => setBlankWarn(0)} className="px-2.5 py-[5px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Keep inspecting</button>
            <button type="button" onClick={() => save(true)} disabled={saving} className="px-2.5 py-[5px] bg-[#854F0B] text-white rounded-[var(--border-radius-md)] hover:bg-[#6A3E08] disabled:opacity-50">Save anyway</button>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          {error ? <p className="text-[12px] text-[#A32D2D]">{error}</p> : <span className="text-[11px] text-[var(--color-text-tertiary)]">Tap ✓ if OK, ⚑ to flag an issue. Blank = not yet inspected.</span>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
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
