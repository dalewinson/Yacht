'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEquipmentCategories } from './CategoriesProvider'
import type { Database } from '@/types/database'

type Part = Database['public']['Tables']['parts']['Row']

const isLow = (p: Part) => p.qty_on_hand <= p.reorder_at

export default function PartsClient({
  parts: initial,
  vesselId,
}: {
  parts: Part[]
  vesselId: string | null
}) {
  const CATEGORIES = useEquipmentCategories()
  const [parts, setParts]       = useState<Part[]>(initial)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [lowOnly, setLowOnly]   = useState(false)
  const [editing, setEditing]   = useState<Part | null>(null)
  const [adding, setAdding]     = useState(false)

  const filtered = parts.filter(p => {
    const q = search.toLowerCase()
    return (
      (!q || p.name.toLowerCase().includes(q) || (p.part_number ?? '').toLowerCase().includes(q) || (p.equipment_name ?? '').toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q)) &&
      (!category || p.category === category) &&
      (!lowOnly || isLow(p))
    )
  })

  const lowCount = parts.filter(isLow).length

  async function adjustQty(p: Part, delta: number) {
    const qty = Math.max(0, p.qty_on_hand + delta)
    setParts(prev => prev.map(x => x.id === p.id ? { ...x, qty_on_hand: qty } : x))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('parts').update({ qty_on_hand: qty }).eq('id', p.id)
  }

  function onSaved(p: Part) {
    setParts(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p])
    setEditing(null); setAdding(false)
  }
  function onDeleted(id: string) {
    setParts(prev => prev.filter(p => p.id !== id))
    setEditing(null)
  }

  const fmtCost = (c: number | null) => (c == null ? '—' : `$${c.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3.5 items-center">
        <input
          type="text" placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
        />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setLowOnly(v => !v)}
          className={`px-3 py-[6px] text-[12px] rounded-[var(--border-radius-md)] border ${lowOnly ? 'bg-[#FAEEDA] border-[#E4C38A] text-[#854F0B]' : 'bg-[var(--color-background-primary)] border-[var(--color-border-secondary)] text-[var(--color-text-secondary)]'}`}>
          <i className="ti ti-alert-triangle text-[12px] mr-1" />Low only{lowCount > 0 && ` (${lowCount})`}
        </button>
        <button onClick={() => setAdding(true)} disabled={!vesselId}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
          <i className="ti ti-plus text-[13px]" /> Add part
        </button>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[820px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[22%]">Part</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Equipment</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[16%]">Location</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[12%]">Part #</th>
              <th className="text-center font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[16%]">On hand</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[12%]">Supplier</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[8%]">Cost</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-[var(--color-text-secondary)] py-8">No parts {parts.length ? 'match your filter' : 'yet — click "Add part"'}.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={isLow(p) ? 'bg-[#FBF3E5]' : 'hover:bg-[var(--color-background-secondary)]'}>
                <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                  <button onClick={() => setEditing(p)} className="text-[#185FA5] hover:underline text-left">{p.name}</button>
                  <span className="block text-[10px] text-[var(--color-text-tertiary)]">{p.category}</span>
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{p.equipment_name ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{p.location ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{p.part_number ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => adjustQty(p, -1)} className="w-5 h-5 rounded border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)] leading-none">−</button>
                    <span className={`min-w-[40px] text-center font-medium ${isLow(p) ? 'text-[#854F0B]' : 'text-[var(--color-text-primary)]'}`}>
                      {p.qty_on_hand}
                      {isLow(p) && <i className="ti ti-alert-triangle text-[11px] ml-1" title={`Reorder at ${p.reorder_at}`} />}
                    </span>
                    <button onClick={() => adjustQty(p, +1)} className="w-5 h-5 rounded border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)] leading-none">+</button>
                  </div>
                  <div className="text-[9px] text-[var(--color-text-tertiary)] text-center mt-0.5">reorder at {p.reorder_at}</div>
                </td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{p.supplier ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]">{fmtCost(p.unit_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(adding || editing) && vesselId && (
        <PartModal
          vesselId={vesselId}
          part={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}

function PartModal({
  vesselId, part, onClose, onSaved, onDeleted,
}: {
  vesselId: string
  part: Part | null
  onClose: () => void
  onSaved: (p: Part) => void
  onDeleted: (id: string) => void
}) {
  const [name, setName]           = useState(part?.name ?? '')
  const CATEGORIES = useEquipmentCategories()
  const [category, setCategory]   = useState(part?.category ?? CATEGORIES[0] ?? 'Propulsion')
  const [equipmentName, setEquip] = useState(part?.equipment_name ?? '')
  const [partNumber, setPartNum]  = useState(part?.part_number ?? '')
  const [location, setLocation]   = useState(part?.location ?? '')
  const [qty, setQty]             = useState(part?.qty_on_hand?.toString() ?? '0')
  const [reorderAt, setReorder]   = useState(part?.reorder_at?.toString() ?? '0')
  const [supplier, setSupplier]   = useState(part?.supplier ?? '')
  const [unitCost, setUnitCost]   = useState(part?.unit_cost?.toString() ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Part name is required.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const payload = {
      name: name.trim(), category,
      equipment_name: equipmentName.trim() || null,
      part_number: partNumber.trim() || null,
      location: location.trim() || null,
      qty_on_hand: parseInt(qty) || 0,
      reorder_at: parseInt(reorderAt) || 0,
      supplier: supplier.trim() || null,
      unit_cost: unitCost ? Number(unitCost) : null,
    }
    let data, err
    if (part) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('parts').update(payload).eq('id', part.id).select().single())
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('parts').insert({ vessel_id: vesselId, ...payload }).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as Part)
  }

  async function remove() {
    if (!part || !confirm(`Delete ${part.name}?`)) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('parts').delete().eq('id', part.id)
    onDeleted(part.id)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[460px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{part ? 'Edit part' : 'Add part'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name *', <input type="text" value={name} onChange={e => setName(e.target.value)} className={cls} />)}
            {field('Category',
              <select value={category} onChange={e => setCategory(e.target.value)} className={cls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {field('For equipment', <input type="text" value={equipmentName} onChange={e => setEquip(e.target.value)} placeholder="e.g. Port engine" className={cls} />)}
            {field('Location', <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Engine room, port locker" className={cls} />)}
            {field('Part #', <input type="text" value={partNumber} onChange={e => setPartNum(e.target.value)} className={cls} />)}
            {field('Qty on hand', <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className={cls} />)}
            {field('Reorder at', <input type="number" min="0" value={reorderAt} onChange={e => setReorder(e.target.value)} className={cls} />)}
            {field('Supplier', <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className={cls} />)}
            {field('Unit cost ($)', <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className={cls} />)}
          </div>

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {part
              ? <button type="button" onClick={remove} className="text-[12px] text-[#A32D2D] hover:underline inline-flex items-center gap-1"><i className="ti ti-trash text-[13px]" /> Delete</button>
              : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
                <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
