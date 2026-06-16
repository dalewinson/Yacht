'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import {
  INSPECTION_SECTIONS,
  emptyInspection,
  type SectionDef,
  type InspectionSections,
  type SectionData,
} from '@/lib/inspection-template'
import type { TicketPriority } from '@/types/database'

type Vessel = { id: string; name: string }
type Equipment = { id: string; name: string; category: string }
type LinkRow = { section_id: string; item_key: string; equipment_id: string | null }
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

const linkKey = (secId: string, itemKey = '') => `${secId}|${itemKey}`

function isFlagged(secType: string, d: Record<string, unknown>): boolean {
  if (secType === 'triple_check') return d.col1 === false || d.col2 === false || d.col3 === false
  return d.ok === false
}

export default function InspectionsClient({
  vessels,
  inspections: initial,
  equipment,
  links,
}: {
  vessels: Vessel[]
  inspections: Inspection[]
  equipment: Equipment[]
  links: LinkRow[]
}) {
  const [inspections, setInspections] = useState<Inspection[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Inspection | null>(null)

  function handleCreated(insp: Inspection) {
    setInspections(prev => [insp, ...prev])
    setShowNew(false)
  }
  function handleUpdated(insp: Inspection) {
    setInspections(prev => prev.map(i => i.id === insp.id ? insp : i))
    setViewing(null)
  }

  return (
    <>
      <div className="flex justify-end mb-3.5">
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]">
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
              <tr><td colSpan={7} className="text-center text-[var(--color-text-secondary)] py-8">No inspections yet. Click &quot;New inspection&quot; to start.</td></tr>
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
        <InspectionForm vessels={vessels} equipment={equipment} links={links} onClose={() => setShowNew(false)} onSaved={handleCreated} />
      )}
      {viewing && (
        <InspectionForm vessels={vessels} equipment={equipment} links={links} existing={viewing} onClose={() => setViewing(null)} onSaved={handleUpdated} />
      )}
    </>
  )
}

const inputCls = "px-[7px] py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"

type Candidate = {
  key: string
  itemName: string
  sectionLabel: string
  equipmentId: string | null
  category: string | null
  comment: string
  ref: string
  alreadyOpen: boolean
  selected: boolean
  title: string
  priority: TicketPriority
}

function InspectionForm({
  vessels, equipment, links: initialLinks, existing, onClose, onSaved,
}: {
  vessels: Vessel[]
  equipment: Equipment[]
  links: LinkRow[]
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

  // equipment links: key `${sectionId}|${itemKey}` -> equipmentId
  const [linkMap, setLinkMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const l of initialLinks) if (l.equipment_id) m[linkKey(l.section_id, l.item_key)] = l.equipment_id
    return m
  })
  const getLink = (secId: string, itemKey = '') => linkMap[linkKey(secId, itemKey)] ?? ''
  const setLink = (secId: string, itemKey: string, equipId: string) =>
    setLinkMap(prev => {
      const next = { ...prev }
      if (equipId) next[linkKey(secId, itemKey)] = equipId
      else delete next[linkKey(secId, itemKey)]
      return next
    })

  // ticket review after save
  const [review, setReview] = useState<{ insp: Inspection; candidates: Candidate[] } | null>(null)

  function updateItem(secId: string, itemName: string, field: string, value: unknown) {
    setSections(prev => ({
      ...prev,
      [secId]: { ...prev[secId], items: { ...prev[secId]?.items, [itemName]: { ...prev[secId]?.items?.[itemName], [field]: value } } },
    }))
  }
  function updateSection(secId: string, field: string, value: string) {
    setSections(prev => ({ ...prev, [secId]: { ...prev[secId], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true); setError('')
    const vessel = vessels.find(v => v.id === vesselId)
    const supabase = createClient()

    const portSec = sections['port_engine'] as SectionData
    const stbdSec = sections['stbd_engine'] as SectionData
    const portGenSec = sections['port_gen'] as SectionData

    const payload = {
      vessel_id: vesselId,
      vessel_name: vessel?.name ?? '',
      tech: tech || null,
      date, month, year,
      port_engine_hrs: portSec?.hours ? parseInt(portSec.hours) : null,
      stbd_engine_hrs: stbdSec?.hours ? parseInt(stbdSec.hours) : null,
      port_gen_hrs: portGenSec?.hours ? parseInt(portGenSec.hours) : null,
      sections,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any, err: any
    if (existing) {
      ;({ data, error: err } = await (supabase as any).from('inspections').update(payload).eq('id', existing.id).select().single())
    } else {
      ;({ data, error: err } = await (supabase as any).from('inspections').insert(payload).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }

    // 1) persist remembered links for this vessel (replace set)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('inspection_links').delete().eq('vessel_id', vesselId)
    const desired = Object.entries(linkMap)
      .filter(([, eqId]) => eqId)
      .map(([k, eqId]) => {
        const [section_id, item_key] = k.split('|')
        return { vessel_id: vesselId, section_id, item_key: item_key ?? '', equipment_id: eqId }
      })
    if (desired.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('inspection_links').insert(desired)
    }

    // 2) sync engine/gen hours -> equipment.current_hours
    for (const sec of INSPECTION_SECTIONS.filter(s => s.type === 'engine')) {
      const eqId = getLink(sec.id, '')
      const hrs = (sections[sec.id] as SectionData)?.hours
      if (eqId && hrs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('equipment').update({ current_hours: parseInt(hrs) }).eq('id', eqId)
      }
    }

    // 3) stamp last_inspected on every linked equipment
    const linkedIds = [...new Set(Object.values(linkMap).filter(Boolean))]
    if (linkedIds.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('equipment').update({ last_inspected: date }).in('id', linkedIds)
    }

    // 4) gather flagged items -> ticket candidates
    const candidates: Candidate[] = []
    for (const sec of INSPECTION_SECTIONS) {
      const secData = sections[sec.id] as SectionData | undefined
      if (!secData?.items) continue
      for (const itemName of sec.items) {
        const d = (secData.items[itemName] ?? {}) as Record<string, unknown>
        if (!isFlagged(sec.type, d)) continue
        const eqId = sec.type === 'engine' ? getLink(sec.id, '') : getLink(sec.id, itemName)
        const eq = equipment.find(e => e.id === eqId) ?? null
        const ref = `insp:${sec.id}:${itemName}`
        candidates.push({
          key: ref,
          itemName,
          sectionLabel: sec.label,
          equipmentId: eq?.id ?? null,
          category: eq?.category ?? null,
          comment: String(d.comments ?? ''),
          ref,
          alreadyOpen: false,
          selected: true,
          title: `${eq?.name ?? sec.label} — ${itemName}`,
          priority: 'medium',
        })
      }
    }

    if (candidates.length) {
      // mark ones that already have an open ticket
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: openT } = await (supabase as any)
        .from('tickets').select('inspection_ref').eq('vessel_id', vesselId).in('status', ['open', 'in_progress'])
      const openRefs = new Set(((openT ?? []) as { inspection_ref: string | null }[]).map(t => t.inspection_ref).filter(Boolean))
      for (const c of candidates) {
        if (openRefs.has(c.ref)) { c.alreadyOpen = true; c.selected = false }
      }
      setSaving(false)
      setReview({ insp: data as Inspection, candidates })
      return
    }

    setSaving(false)
    onSaved(data as Inspection)
  }

  const secDef = INSPECTION_SECTIONS.find(s => s.id === activeSec)!
  const secData: SectionData = sections[activeSec] ?? { items: {} }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50">
      <div className="flex flex-col bg-[var(--color-background-primary)] w-full max-w-[920px] mx-auto my-4 rounded-[var(--border-radius-lg)] border border-[var(--color-border-tertiary)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {existing ? `${existing.month} ${existing.year} Inspection` : 'New Monthly Inspection'}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-[var(--color-border-tertiary)] flex-shrink-0">
          <Meta label="Vessel"><select value={vesselId} onChange={e => setVesselId(e.target.value)} className={inputCls}>{vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Meta>
          <Meta label="Month"><select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>{MONTHS.map(m => <option key={m}>{m}</option>)}</select></Meta>
          <Meta label="Year"><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-[80px]`} /></Meta>
          <Meta label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Meta>
          <Meta label="Tech"><input type="text" value={tech} onChange={e => setTech(e.target.value)} className={`${inputCls} w-[120px]`} /></Meta>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[150px] flex-shrink-0 border-r border-[var(--color-border-tertiary)] overflow-y-auto bg-[var(--color-background-secondary)]">
            {INSPECTION_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSec(sec.id)}
                className={`w-full text-left px-3 py-2 text-[11px] border-b border-[var(--color-border-tertiary)] transition-colors ${activeSec === sec.id ? 'bg-[#185FA5] text-white font-medium' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]'}`}>
                {sec.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <SectionEditor
              secDef={secDef}
              secData={secData}
              equipment={equipment}
              getLink={getLink}
              setLink={setLink}
              onUpdateItem={(item, field, val) => updateItem(activeSec, item, field, val)}
              onUpdateSection={(field, val) => updateSection(activeSec, field, val)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex-shrink-0">
          {error ? <p className="text-[12px] text-[#A32D2D]">{error}</p> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {review && (
        <FlaggedReview
          vesselId={vesselId}
          candidates={review.candidates}
          onDone={() => { const insp = review.insp; setReview(null); onSaved(insp) }}
        />
      )}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  )
}

function SectionEditor({
  secDef, secData, equipment, getLink, setLink, onUpdateItem, onUpdateSection,
}: {
  secDef: SectionDef
  secData: SectionData
  equipment: Equipment[]
  getLink: (secId: string, itemKey?: string) => string
  setLink: (secId: string, itemKey: string, equipId: string) => void
  onUpdateItem: (item: string, field: string, val: unknown) => void
  onUpdateSection: (field: string, val: string) => void
}) {
  const items = secData.items ?? {}
  const isEngine = secDef.type === 'engine'
  const linkItems = !isEngine  // non-engine sections get a per-row equipment picker

  const eqSelect = (value: string, onChange: (v: string) => void, width = 'w-full') => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${width} text-[11px] px-1 py-0.5 border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]`}>
      <option value="">—</option>
      {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
    </select>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{secDef.label}</h3>
        {isEngine && (
          <>
            <div className="flex gap-1.5 items-center">
              <label className="text-[11px] text-[var(--color-text-secondary)]">Hours</label>
              <input type="number" value={secData.hours ?? ''} onChange={e => onUpdateSection('hours', e.target.value)} className={`${inputCls} w-[90px]`} placeholder="0" />
            </div>
            <div className="flex gap-1.5 items-center">
              <label className="text-[11px] text-[var(--color-text-secondary)]">Equipment</label>
              {eqSelect(getLink(secDef.id, ''), v => setLink(secDef.id, '', v), 'w-[170px]')}
            </div>
          </>
        )}
      </div>
      {isEngine && getLink(secDef.id, '') && (
        <p className="text-[10px] text-[var(--color-text-tertiary)] -mt-2 mb-2">Hours entered here update this equipment&apos;s current hours on save.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[var(--color-background-secondary)]">
              <th className="text-left font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[24%]">Item</th>
              {secDef.type === 'engine' && (<>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[9%] text-center">Level</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[11%] text-center">Hrs Changed</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[12%] text-center">Date Changed</th>
              </>)}
              {secDef.type === 'battery' && (<>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[10%] text-center">Volts</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
              </>)}
              {secDef.type === 'dual_check' && (<>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col1}</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col2}</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
              </>)}
              {secDef.type === 'triple_check' && (<>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col1}</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col2}</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[8%] text-center">{secDef.col3}</th>
              </>)}
              {secDef.type === 'ok_only' && (
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
              )}
              {secDef.type === 'fire_ext' && (<>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[10%] text-center">Level</th>
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[6%] text-center">OK</th>
              </>)}
              {linkItems && (
                <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)] w-[18%] text-center">Equipment</th>
              )}
              <th className="font-medium text-[var(--color-text-secondary)] px-2 py-1.5 border border-[var(--color-border-tertiary)]">Comments</th>
            </tr>
          </thead>
          <tbody>
            {secDef.items.map(itemName => {
              const d = (items[itemName] ?? {}) as Record<string, unknown>
              const flagged = isFlagged(secDef.type, d)
              return (
                <tr key={itemName} className={flagged ? 'bg-red-50' : 'hover:bg-[var(--color-background-secondary)]'}>
                  <td className="px-2 py-1 border border-[var(--color-border-tertiary)] font-medium text-[var(--color-text-primary)]">{itemName}</td>

                  {secDef.type === 'engine' && (<>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="text" value={(d.level as string) ?? ''} onChange={e => onUpdateItem(itemName, 'level', e.target.value)} className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="text" value={(d.hrs_changed as string) ?? ''} onChange={e => onUpdateItem(itemName, 'hrs_changed', e.target.value)} className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="date" value={(d.date_changed as string) ?? ''} onChange={e => onUpdateItem(itemName, 'date_changed', e.target.value)} className="w-full text-center text-[11px] border-0 outline-none bg-transparent" /></td>
                  </>)}
                  {secDef.type === 'battery' && (<>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="text" value={(d.volts as string) ?? ''} onChange={e => onUpdateItem(itemName, 'volts', e.target.value)} className="w-full text-center text-[11px] border-0 outline-none bg-transparent" placeholder="—" /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} /></td>
                  </>)}
                  {secDef.type === 'dual_check' && (<>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.col1 !== false} onChange={e => onUpdateItem(itemName, 'col1', e.target.checked)} /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.col2 !== false} onChange={e => onUpdateItem(itemName, 'col2', e.target.checked)} /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} /></td>
                  </>)}
                  {secDef.type === 'triple_check' && (<>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.col1 !== false} onChange={e => onUpdateItem(itemName, 'col1', e.target.checked)} /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.col2 !== false} onChange={e => onUpdateItem(itemName, 'col2', e.target.checked)} /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.col3 !== false} onChange={e => onUpdateItem(itemName, 'col3', e.target.checked)} /></td>
                  </>)}
                  {secDef.type === 'ok_only' && (
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} /></td>
                  )}
                  {secDef.type === 'fire_ext' && (<>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="text" value={(d.level as string) ?? 'Full'} onChange={e => onUpdateItem(itemName, 'level', e.target.value)} className="w-full text-center text-[11px] border-0 outline-none bg-transparent" /></td>
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center"><input type="checkbox" checked={d.ok !== false} onChange={e => onUpdateItem(itemName, 'ok', e.target.checked)} /></td>
                  </>)}

                  {linkItems && (
                    <td className="px-1 py-1 border border-[var(--color-border-tertiary)] text-center">
                      {eqSelect(getLink(secDef.id, itemName), v => setLink(secDef.id, itemName, v))}
                    </td>
                  )}

                  <td className="px-1 py-1 border border-[var(--color-border-tertiary)]">
                    <input type="text" value={(d.comments as string) ?? ''} onChange={e => onUpdateItem(itemName, 'comments', e.target.value)} className="w-full text-[11px] border-0 outline-none bg-transparent" placeholder="Add note…" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">Section notes</label>
        <textarea value={secData.notes ?? ''} onChange={e => onUpdateSection('notes', e.target.value)} rows={2}
          placeholder="Any additional notes for this section…"
          className="w-full px-2 py-1.5 text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y" />
      </div>
    </div>
  )
}

function FlaggedReview({
  vesselId, candidates: initial, onDone,
}: {
  vesselId: string
  candidates: Candidate[]
  onDone: () => void
}) {
  const [cands, setCands] = useState<Candidate[]>(initial)
  const [saving, setSaving] = useState(false)
  const toCreate = cands.filter(c => c.selected && !c.alreadyOpen)

  function patch(key: string, p: Partial<Candidate>) {
    setCands(prev => prev.map(c => c.key === key ? { ...c, ...p } : c))
  }

  async function create() {
    setSaving(true)
    const supabase = createClient()
    if (toCreate.length) {
      const rows = toCreate.map(c => ({
        vessel_id: vesselId,
        title: c.title,
        description: c.comment || null,
        status: 'open',
        priority: c.priority,
        source: 'manual',
        category: c.category,
        inspection_ref: c.ref,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('tickets').insert(rows)
    }
    setSaving(false)
    onDone()
  }

  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center pt-10 bg-black/50 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[600px] max-h-[85vh] overflow-y-auto p-5">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1">Flagged items → tickets</h2>
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
          {cands.length} item{cands.length !== 1 ? 's' : ''} marked not-OK. Pick which to turn into tickets.
        </p>

        <div className="space-y-2">
          {cands.map(c => (
            <div key={c.key} className={`border rounded-[var(--border-radius-md)] p-2.5 ${c.alreadyOpen ? 'border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] opacity-70' : 'border-[var(--color-border-secondary)]'}`}>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={c.selected && !c.alreadyOpen} disabled={c.alreadyOpen}
                  onChange={e => patch(c.key, { selected: e.target.checked })} />
                <div className="flex-1 min-w-0">
                  <input type="text" value={c.title} disabled={c.alreadyOpen} onChange={e => patch(c.key, { title: e.target.value })}
                    className="w-full text-[12px] font-medium px-1.5 py-1 border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)] disabled:bg-transparent disabled:border-transparent" />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">{c.sectionLabel}</span>
                    {c.comment && <span className="text-[10px] text-[var(--color-text-secondary)] truncate">· {c.comment}</span>}
                    {c.alreadyOpen && <span className="text-[10px] text-[#854F0B]">· ticket already open</span>}
                  </div>
                </div>
                {!c.alreadyOpen && (
                  <select value={c.priority} onChange={e => patch(c.key, { priority: e.target.value as TicketPriority })}
                    className="text-[11px] px-1 py-1 border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <button onClick={onDone} className="text-[12px] text-[var(--color-text-secondary)] hover:underline">Skip — don&apos;t create tickets</button>
          <button onClick={create} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
            <i className="ti ti-ticket text-[13px]" /> {saving ? 'Creating…' : `Create ${toCreate.length} ticket${toCreate.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
