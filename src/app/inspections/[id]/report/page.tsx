import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PrintButton from '@/components/PrintButton'
import { INSPECTION_SECTIONS, type SectionDef } from '@/lib/inspection-template'
import { fmtDate } from '@/lib/utils'

type ItemData = Record<string, unknown>
type SectionData = { hours?: string; model?: string; notes?: string; items?: Record<string, ItemData> }

function isFlagged(type: string, d: ItemData): boolean {
  if (type === 'triple_check') return d.col1 === false || d.col2 === false || d.col3 === false
  return d.ok === false
}

// Middle columns (between Item and Comments) per section type, read-only.
function midColumns(sec: SectionDef): { label: string; render: (d: ItemData) => React.ReactNode }[] {
  const bool = (v: unknown) => v === false
    ? <span className="text-[#A32D2D] font-semibold">✗</span>
    : <span className="text-[#3B6D11] font-semibold">✓</span>
  const txt = (v: unknown, fallback = '—') => (v == null || v === '' ? fallback : String(v))

  switch (sec.type) {
    case 'engine': return [
      { label: 'Level', render: d => txt(d.level) },
      { label: 'OK', render: d => bool(d.ok) },
      { label: 'Hrs changed', render: d => txt(d.hrs_changed) },
      { label: 'Date changed', render: d => txt(d.date_changed) },
    ]
    case 'battery': return [
      { label: 'Volts', render: d => txt(d.volts) },
      { label: 'OK', render: d => bool(d.ok) },
    ]
    case 'dual_check': return [
      { label: sec.col1 ?? '1', render: d => bool(d.col1) },
      { label: sec.col2 ?? '2', render: d => bool(d.col2) },
      { label: 'OK', render: d => bool(d.ok) },
    ]
    case 'triple_check': return [
      { label: sec.col1 ?? '1', render: d => bool(d.col1) },
      { label: sec.col2 ?? '2', render: d => bool(d.col2) },
      { label: sec.col3 ?? '3', render: d => bool(d.col3) },
    ]
    case 'fire_ext': return [
      { label: 'Level', render: d => txt(d.level, 'Full') },
      { label: 'OK', render: d => bool(d.ok) },
    ]
    default: return [ { label: 'OK', render: d => bool(d.ok) } ]
  }
}

export default async function InspectionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('inspections').select('*').eq('id', id).single()

  if (!data) {
    return <div className="p-8 text-[13px] text-[var(--color-text-secondary)]">Inspection not found. <Link href="/inspections" className="text-[#185FA5] hover:underline">Back to Inspections</Link></div>
  }

  const sections = (data.sections ?? {}) as Record<string, SectionData>
  // Render against the inspection's own frozen template; fall back to the
  // built-in default for older inspections saved before templates existed.
  const template: SectionDef[] = (data.template && data.template.length ? data.template : INSPECTION_SECTIONS)

  // Flagged items summary
  const flagged: { section: string; item: string; note: string }[] = []
  for (const sec of template) {
    const items = sections[sec.id]?.items ?? {}
    for (const name of sec.items) {
      const d = (items[name] ?? {}) as ItemData
      if (isFlagged(sec.type, d)) flagged.push({ section: sec.label, item: name, note: String(d.comments ?? '') })
    }
  }

  return (
    <div className="bg-[var(--color-background-tertiary)] min-h-full">
      {/* top bar — not printed */}
      <div className="no-print flex items-center justify-between max-w-[800px] mx-auto px-4 pt-4">
        <Link href="/inspections" className="text-[12px] text-[#185FA5] hover:underline inline-flex items-center gap-1">
          <i className="ti ti-arrow-left text-[13px]" /> Back
        </Link>
        <PrintButton />
      </div>

      <div id="print-root" className="max-w-[800px] mx-auto bg-white p-8 my-4 text-[12px] text-[#1c1917] leading-relaxed">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#185FA5] pb-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#185FA5] font-semibold">Fairwinds</div>
            <h1 className="text-[18px] font-bold mt-0.5">Monthly Maintenance Inspection</h1>
            <div className="text-[13px] font-medium mt-0.5">{data.vessel_name}</div>
          </div>
          <div className="text-right text-[11px] text-[#57534e]">
            <div><span className="font-semibold">{data.month} {data.year}</span></div>
            <div>Date: {fmtDate(data.date)}</div>
            <div>Tech: {data.tech ?? '—'}</div>
          </div>
        </div>

        {/* Engine/gen hours quick line */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[#44403c] mb-4">
          {data.port_engine_hrs != null && <span>Port engine: <b>{data.port_engine_hrs} hrs</b></span>}
          {data.stbd_engine_hrs != null && <span>Stbd engine: <b>{data.stbd_engine_hrs} hrs</b></span>}
          {data.port_gen_hrs != null && <span>Gen: <b>{data.port_gen_hrs} hrs</b></span>}
        </div>

        {/* Flagged summary */}
        <div className="mb-5 border border-[#E4C38A] rounded-[6px] overflow-hidden">
          <div className="bg-[#FAEEDA] px-3 py-1.5 text-[12px] font-semibold text-[#854F0B]">
            Items needing attention {flagged.length > 0 && `(${flagged.length})`}
          </div>
          <div className="px-3 py-2">
            {flagged.length === 0 ? (
              <div className="text-[12px] text-[#3B6D11]">All items checked OK.</div>
            ) : (
              <ul className="space-y-1">
                {flagged.map((f, i) => (
                  <li key={i} className="text-[12px]">
                    <span className="font-medium">{f.section} — {f.item}</span>
                    {f.note && <span className="text-[#57534e]">: {f.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sections */}
        {template.map(sec => {
          const secData = sections[sec.id] ?? {}
          const items = secData.items ?? {}
          const cols = midColumns(sec)
          return (
            <div key={sec.id} className="mb-4 break-inside-avoid">
              <div className="flex items-baseline gap-3 border-b border-[#d6d3d1] pb-1 mb-1.5">
                <h2 className="text-[13px] font-bold">{sec.label}</h2>
                {sec.type === 'engine' && (
                  <span className="text-[11px] text-[#57534e]">
                    {secData.hours ? `${secData.hours} hrs` : ''}{secData.model ? ` · ${secData.model}` : ''}
                  </span>
                )}
              </div>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="text-left text-[#78716c]">
                    <th className="py-1 pr-2 font-medium w-[26%]">Item</th>
                    {cols.map(c => <th key={c.label} className="py-1 px-2 font-medium text-center">{c.label}</th>)}
                    <th className="py-1 pl-2 font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map(name => {
                    const d = (items[name] ?? {}) as ItemData
                    return (
                      <tr key={name} className="border-t border-[#f0eeec]">
                        <td className="py-1 pr-2 font-medium">{name}</td>
                        {cols.map(c => <td key={c.label} className="py-1 px-2 text-center">{c.render(d)}</td>)}
                        <td className="py-1 pl-2 text-[#44403c]">{String(d.comments ?? '')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {secData.notes && <div className="text-[11px] text-[#57534e] mt-1"><span className="font-medium">Notes:</span> {secData.notes}</div>}
            </div>
          )
        })}

        <div className="text-[10px] text-[#a8a29e] mt-6 pt-2 border-t border-[#e7e5e4]">
          Generated by Fairwinds · {data.vessel_name} · {data.month} {data.year}
        </div>
      </div>
    </div>
  )
}
