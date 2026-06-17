'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Trip = Database['public']['Tables']['trips']['Row']
type EquipLite = { id: string; name: string; current_hours: number | null }
type TimelineItem = { time: string; label: string }

const PURPOSES = ['Owner event', 'Charter', 'Sea trial', 'Delivery', 'Maintenance', 'Other']
const WIND_DIRS = ['', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

const lc = (s: string) => s.toLowerCase()
const findPortEngine = (eq: EquipLite[]) => eq.find(e => lc(e.name).includes('port') && lc(e.name).includes('engine')) ?? null
const findStbdEngine = (eq: EquipLite[]) => eq.find(e => (lc(e.name).includes('stbd') || lc(e.name).includes('starboard')) && lc(e.name).includes('engine')) ?? null
const generators = (eq: EquipLite[]) => eq.filter(e => lc(e.name).includes('gen'))

export default function LogbookClient({
  trips: initial, equipment, crew, vesselId,
}: {
  trips: Trip[]
  equipment: EquipLite[]
  crew: { name: string; role: string }[]
  vesselId: string | null
}) {
  const [trips, setTrips] = useState<Trip[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)

  function onSaved(t: Trip) {
    setTrips(prev => prev.some(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev])
    setShowNew(false); setEditing(null)
  }
  function onDeleted(id: string) {
    setTrips(prev => prev.filter(t => t.id !== id))
    setEditing(null)
  }

  return (
    <>
      <div className="flex justify-end mb-3.5">
        <button onClick={() => setShowNew(true)} disabled={!vesselId}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
          <i className="ti ti-plus text-[13px]" /> New log entry
        </button>
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-4 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Date</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[16%]">Purpose</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[16%]">Captain</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[26%]">Cruise area</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[20%]">Eng hrs (P/S)</th>
              <th className="w-[8%] border-b border-[var(--color-border-tertiary)]"></th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-8">No log entries yet. Click &quot;New log entry&quot; after an outing.</td></tr>
            ) : trips.map(t => (
              <tr key={t.id} className="hover:bg-[var(--color-background-secondary)]">
                <td className="px-4 py-2 font-medium border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setEditing(t)} className="text-[#185FA5] hover:underline">{fmtDate(t.date)}</button>
                </td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{t.purpose ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{t.captain ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">{t.cruise_area ?? '—'}</td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{t.port_engine_end ?? '—'} / {t.stbd_engine_end ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                  <button onClick={() => setEditing(t)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">
                    <i className="ti ti-edit text-[12px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showNew || editing) && vesselId && (
        <TripModal
          vesselId={vesselId}
          equipment={equipment}
          crew={crew}
          trip={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}

function TripModal({
  vesselId, equipment, crew, trip, onClose, onSaved, onDeleted,
}: {
  vesselId: string
  equipment: EquipLite[]
  crew: { name: string; role: string }[]
  trip: Trip | null
  onClose: () => void
  onSaved: (t: Trip) => void
  onDeleted: (id: string) => void
}) {
  const portEng = findPortEngine(equipment)
  const stbdEng = findStbdEngine(equipment)
  const gens = generators(equipment)
  const s = (n: number | null | undefined) => (n == null ? '' : String(n))

  const [date, setDate]           = useState(trip?.date ?? new Date().toISOString().slice(0, 10))
  const [captain, setCaptain]     = useState(trip?.captain ?? '')
  const [purpose, setPurpose]     = useState(trip?.purpose ?? 'Owner event')
  const [cruiseArea, setCruiseArea] = useState(trip?.cruise_area ?? '')
  const [sky, setSky]             = useState(trip?.sky ?? '')
  const [windSpeed, setWindSpeed] = useState(s(trip?.wind_speed))
  const [windDir, setWindDir]     = useState(trip?.wind_dir ?? '')
  const [pStart, setPStart]       = useState(trip ? s(trip.port_engine_start) : s(portEng?.current_hours))
  const [pEnd, setPEnd]           = useState(s(trip?.port_engine_end))
  const [sStart, setSStart]       = useState(trip ? s(trip.stbd_engine_start) : s(stbdEng?.current_hours))
  const [sEnd, setSEnd]           = useState(s(trip?.stbd_engine_end))
  const [genId, setGenId]         = useState(trip?.gen_equipment_id ?? '')
  const [genStart, setGenStart]   = useState(s(trip?.gen_start))
  const [genEnd, setGenEnd]       = useState(s(trip?.gen_end))
  const [fuelStart, setFuelStart] = useState(s(trip?.fuel_start))
  const [fuelEnd, setFuelEnd]     = useState(s(trip?.fuel_end))
  const [timeline, setTimeline]   = useState<TimelineItem[]>(trip?.timeline ?? [])
  const [notes, setNotes]         = useState(trip?.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  function pickGen(id: string) {
    setGenId(id)
    if (!trip) {
      const g = gens.find(x => x.id === id)
      setGenStart(s(g?.current_hours))
    }
  }
  function addRow() { setTimeline(prev => [...prev, { time: '', label: '' }]) }
  function patchRow(i: number, p: Partial<TimelineItem>) { setTimeline(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r)) }
  function removeRow(i: number) { setTimeline(prev => prev.filter((_, idx) => idx !== i)) }

  const int = (v: string) => (v.trim() === '' ? null : parseInt(v))
  const numv = (v: string) => (v.trim() === '' ? null : Number(v))

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()

    const payload = {
      vessel_id: vesselId,
      date,
      captain: captain.trim() || null,
      purpose,
      cruise_area: cruiseArea.trim() || null,
      sky: sky.trim() || null,
      wind_speed: int(windSpeed),
      wind_dir: windDir || null,
      port_engine_start: int(pStart), port_engine_end: int(pEnd),
      stbd_engine_start: int(sStart), stbd_engine_end: int(sEnd),
      gen_equipment_id: genId || null,
      gen_start: int(genStart), gen_end: int(genEnd),
      fuel_start: numv(fuelStart), fuel_end: numv(fuelEnd),
      timeline: timeline.filter(r => r.time || r.label.trim()),
      notes: notes.trim() || null,
    }

    let data, err
    if (trip) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('trips').update(payload).eq('id', trip.id).select().single())
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('trips').insert(payload).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }

    // Two-way hours sync: push ending hours to each equipment's current hours.
    const syncs: { id: string; hrs: number }[] = []
    if (portEng && int(pEnd) != null) syncs.push({ id: portEng.id, hrs: int(pEnd)! })
    if (stbdEng && int(sEnd) != null) syncs.push({ id: stbdEng.id, hrs: int(sEnd)! })
    if (genId && int(genEnd) != null) syncs.push({ id: genId, hrs: int(genEnd)! })
    for (const sync of syncs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('equipment').update({ current_hours: sync.hrs }).eq('id', sync.id)
    }

    onSaved(data as Trip)
  }

  async function remove() {
    if (!trip || !confirm('Delete this log entry?')) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('trips').delete().eq('id', trip.id)
    onDeleted(trip.id)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )
  const hoursRow = (label: string, start: string, setStart: (v: string) => void, end: string, setEnd: (v: string) => void) => (
    <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
      <span className="text-[11px] text-[var(--color-text-primary)] pb-1.5">{label}</span>
      <div><label className="block text-[10px] text-[var(--color-text-tertiary)]">Begin</label><input type="number" value={start} onChange={e => setStart(e.target.value)} className={`${cls} w-[90px]`} /></div>
      <div><label className="block text-[10px] text-[var(--color-text-tertiary)]">End</label><input type="number" value={end} onChange={e => setEnd(e.target.value)} className={`${cls} w-[90px]`} /></div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[620px] max-h-[88vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{trip ? 'Log entry' : 'New log entry'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Date', <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cls} />)}
            {field('Captain',
              <>
                <input list="captain-list" value={captain} onChange={e => setCaptain(e.target.value)} placeholder="Name" className={cls} />
                <datalist id="captain-list">{crew.map(c => <option key={c.name} value={c.name} />)}</datalist>
              </>
            )}
            {field('Purpose', <select value={purpose} onChange={e => setPurpose(e.target.value)} className={cls}>{PURPOSES.map(p => <option key={p}>{p}</option>)}</select>)}
            {field('Cruise area', <input type="text" value={cruiseArea} onChange={e => setCruiseArea(e.target.value)} placeholder="e.g. Newport to Block Island" className={cls} />)}
          </div>

          {/* Weather */}
          <div className="grid grid-cols-3 gap-[10px]">
            {field('Sky', <input type="text" value={sky} onChange={e => setSky(e.target.value)} placeholder="e.g. Clear" className={cls} />)}
            {field('Wind (kts)', <input type="number" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} className={cls} />)}
            {field('Wind dir', <select value={windDir} onChange={e => setWindDir(e.target.value)} className={cls}>{WIND_DIRS.map(d => <option key={d} value={d}>{d || '—'}</option>)}</select>)}
          </div>

          {/* Hours */}
          <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)] space-y-2">
            <div className="text-[11px] font-medium text-[var(--color-text-primary)]">Engine &amp; generator hours</div>
            {hoursRow('Port engine', pStart, setPStart, pEnd, setPEnd)}
            {hoursRow('Stbd engine', sStart, setSStart, sEnd, setSEnd)}
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
              <div>
                <label className="block text-[10px] text-[var(--color-text-tertiary)]">Gen set used</label>
                <select value={genId} onChange={e => pickGen(e.target.value)} className={cls}>
                  <option value="">— None —</option>
                  {gens.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div><label className="block text-[10px] text-[var(--color-text-tertiary)]">Begin</label><input type="number" value={genStart} onChange={e => setGenStart(e.target.value)} className={`${cls} w-[90px]`} /></div>
              <div><label className="block text-[10px] text-[var(--color-text-tertiary)]">End</label><input type="number" value={genEnd} onChange={e => setGenEnd(e.target.value)} className={`${cls} w-[90px]`} /></div>
            </div>
            <p className="text-[10px] text-[var(--color-text-tertiary)]">Ending hours update each unit&apos;s current hours (advancing service tasks).</p>
          </div>

          {/* Fuel */}
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Fuel begin (gal)', <input type="number" step="0.1" value={fuelStart} onChange={e => setFuelStart(e.target.value)} className={cls} />)}
            {field('Fuel end (gal)', <input type="number" step="0.1" value={fuelEnd} onChange={e => setFuelEnd(e.target.value)} className={cls} />)}
          </div>

          {/* Timeline */}
          <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-3 bg-[var(--color-background-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[var(--color-text-primary)]">Timeline</span>
              <button type="button" onClick={addRow} className="text-[11px] text-[#185FA5] hover:underline">+ Add entry</button>
            </div>
            {timeline.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">Add events like “Crew arrived”, “Left dock”, “Arrived at destination”.</p>
            ) : (
              <div className="space-y-1.5">
                {timeline.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input type="time" value={r.time} onChange={e => patchRow(i, { time: e.target.value })}
                      className="px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                    <input type="text" value={r.label} onChange={e => patchRow(i, { label: e.target.value })} placeholder="e.g. Left dock"
                      className="flex-1 px-1.5 py-1 text-[11px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
                    <button type="button" onClick={() => removeRow(i)} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D] px-1"><i className="ti ti-x text-[13px]" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {field('Notes', <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${cls} resize-y`} />)}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {trip
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
