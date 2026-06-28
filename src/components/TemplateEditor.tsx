'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TEMPLATE_PRESETS, type SectionDef, type SectionType } from '@/lib/inspection-template'

const TYPE_OPTIONS: { value: SectionType; label: string; cols: number }[] = [
  { value: 'ok_only', label: 'Simple check (OK / not OK)', cols: 0 },
  { value: 'engine', label: 'Engine (level, hrs & date changed)', cols: 0 },
  { value: 'battery', label: 'Battery (volts)', cols: 0 },
  { value: 'fire_ext', label: 'Fire extinguisher (charge level)', cols: 0 },
  { value: 'dual_check', label: 'Two-column check', cols: 2 },
  { value: 'triple_check', label: 'Three-column check', cols: 3 },
]
const colsFor = (t: SectionType) => TYPE_OPTIONS.find(o => o.value === t)?.cols ?? 0

const newId = () => 's_' + Math.random().toString(36).slice(2, 9)

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export default function TemplateEditor({
  vesselId, vesselName, initial, onClose,
}: {
  vesselId: string
  vesselName: string
  initial: SectionDef[]
  onClose: () => void
}) {
  const router = useRouter()
  const [sections, setSections] = useState<SectionDef[]>(() => JSON.parse(JSON.stringify(initial)))
  const [saving, setSaving] = useState(false)

  const patchSec = (i: number, patch: Partial<SectionDef>) =>
    setSections(prev => prev.map((s, k) => k === i ? { ...s, ...patch } : s))

  function addSection() {
    setSections(prev => [...prev, { id: newId(), label: 'New section', type: 'ok_only', items: [] }])
  }
  function addItem(i: number) {
    setSections(prev => prev.map((s, k) => k === i ? { ...s, items: [...s.items, ''] } : s))
  }
  function setItem(i: number, j: number, val: string) {
    setSections(prev => prev.map((s, k) => k === i ? { ...s, items: s.items.map((it, n) => n === j ? val : it) } : s))
  }
  function delItem(i: number, j: number) {
    setSections(prev => prev.map((s, k) => k === i ? { ...s, items: s.items.filter((_, n) => n !== j) } : s))
  }

  async function save() {
    // Clean up: trim items, drop empties, drop sections with no label.
    const cleaned = sections
      .map(s => ({ ...s, label: s.label.trim(), items: s.items.map(it => it.trim()).filter(Boolean) }))
      .filter(s => s.label)
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('inspection_templates')
      .upsert({ vessel_id: vesselId, sections: cleaned, updated_at: new Date().toISOString() }, { onConflict: 'vessel_id' })
    setSaving(false)
    router.refresh()
    onClose()
  }

  function applyPreset(key: string) {
    const preset = TEMPLATE_PRESETS.find(p => p.key === key)
    if (!preset) return
    if (!confirm(`Replace the current template with the "${preset.label}" preset? Your unsaved edits will be lost (existing inspections are unaffected).`)) return
    setSections(JSON.parse(JSON.stringify(preset.sections)))
  }

  // Which preset (if any) the current draft matches, so the user can see what
  // it's based on; becomes "Custom" once they diverge.
  const norm = (secs: SectionDef[]) => JSON.stringify(secs)
  const matched = TEMPLATE_PRESETS.find(p => norm(p.sections) === norm(sections))
  const currentLabel = sections.length === 0 ? 'Empty' : matched ? matched.label : 'Custom'

  const cls = "px-[7px] py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50">
      <div className="flex flex-col bg-[var(--color-background-primary)] w-full max-w-[760px] mx-auto my-4 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Customize inspection template</h2>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{vesselName} · changes apply to future inspections only</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--color-border-tertiary)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={addSection} className="inline-flex items-center gap-1 px-2.5 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">
              <i className="ti ti-plus text-[12px]" /> Add section
            </button>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              Current: <span className="font-medium text-[var(--color-text-primary)]">{currentLabel}</span>
            </span>
          </div>
          <label className="text-[11px] text-[var(--color-text-secondary)] inline-flex items-center gap-1.5">
            Start from preset:
            <select defaultValue="" onChange={e => { if (e.target.value) { applyPreset(e.target.value); e.target.value = '' } }} className={cls}>
              <option value="">Choose…</option>
              {TEMPLATE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.length === 0 && <p className="text-[12px] text-[var(--color-text-secondary)]">No sections yet. Click “Add section” or pick a preset.</p>}
          {sections.map((s, i) => (
            <div key={s.id} className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <input value={s.label} onChange={e => patchSec(i, { label: e.target.value })} placeholder="Section name" className={`${cls} flex-1 font-medium`} />
                <select value={s.type} onChange={e => patchSec(i, { type: e.target.value as SectionType })} className={cls}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setSections(prev => move(prev, i, -1))} disabled={i === 0} className="w-[26px] h-[26px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30" title="Move up"><i className="ti ti-chevron-up" /></button>
                  <button onClick={() => setSections(prev => move(prev, i, 1))} disabled={i === sections.length - 1} className="w-[26px] h-[26px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30" title="Move down"><i className="ti ti-chevron-down" /></button>
                  <button onClick={() => { if (confirm(`Remove the "${s.label || 'section'}" section?`)) setSections(prev => prev.filter((_, k) => k !== i)) }} className="w-[26px] h-[26px] text-[var(--color-text-tertiary)] hover:text-[#A32D2D]" title="Delete section"><i className="ti ti-trash" /></button>
                </div>
              </div>

              {colsFor(s.type) > 0 && (
                <div className="flex gap-2 mb-2">
                  {[1, 2, 3].slice(0, colsFor(s.type)).map(n => (
                    <input key={n} value={(s as unknown as Record<string, string>)[`col${n}`] ?? ''}
                      onChange={e => patchSec(i, { [`col${n}`]: e.target.value } as Partial<SectionDef>)}
                      placeholder={`Column ${n} label`} className={`${cls} flex-1`} />
                  ))}
                </div>
              )}

              <div className="space-y-1">
                {s.items.map((it, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    <input value={it} onChange={e => setItem(i, j, e.target.value)} placeholder="Item name" className={`${cls} flex-1`} />
                    <button onClick={() => setSections(prev => prev.map((sec, k) => k === i ? { ...sec, items: move(sec.items, j, -1) } : sec))} disabled={j === 0} className="w-[24px] h-[24px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30" title="Move up"><i className="ti ti-chevron-up text-[12px]" /></button>
                    <button onClick={() => setSections(prev => prev.map((sec, k) => k === i ? { ...sec, items: move(sec.items, j, 1) } : sec))} disabled={j === s.items.length - 1} className="w-[24px] h-[24px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30" title="Move down"><i className="ti ti-chevron-down text-[12px]" /></button>
                    <button onClick={() => delItem(i, j)} className="w-[24px] h-[24px] text-[var(--color-text-tertiary)] hover:text-[#A32D2D]" title="Delete item"><i className="ti ti-x text-[12px]" /></button>
                  </div>
                ))}
                <button onClick={() => addItem(i)} className="text-[11px] text-[#185FA5] hover:underline inline-flex items-center gap-1 mt-1"><i className="ti ti-plus text-[11px]" /> Add item</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          <button onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
            <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}
