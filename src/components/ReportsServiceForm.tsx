'use client'

import { useState } from 'react'

type EquipmentLite = { id: string; name: string }

// Small picker that opens a printable Service History report in a new tab.
export default function ReportsServiceForm({ equipment }: { equipment: EquipmentLite[] }) {
  const [eq, setEq] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  function open() {
    const p = new URLSearchParams()
    if (eq) p.set('eq', eq)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    window.open(`/reports/service?${p.toString()}`, '_blank', 'noopener')
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const lbl = "block text-[11px] text-[var(--color-text-secondary)] mb-[3px]"

  return (
    <div className="space-y-2.5">
      <div>
        <label className={lbl}>Equipment</label>
        <select value={eq} onChange={e => setEq(e.target.value)} className={cls}>
          <option value="">All equipment</option>
          {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={cls} />
        </div>
        <div>
          <label className={lbl}>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={cls} />
        </div>
      </div>
      <button onClick={open}
        className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]">
        <i className="ti ti-printer text-[13px]" /> Open report
      </button>
    </div>
  )
}
