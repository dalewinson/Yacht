'use client'

import { useState } from 'react'
import NewTicketModal from './NewTicketModal'

interface Props {
  vesselId: string | null
  onCreated?: (ticket: Record<string, unknown>) => void
}

export default function NewTicketButton({ vesselId, onCreated }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!vesselId}
        className="inline-flex items-center gap-1 px-3 py-[6px] text-[12px] bg-[#185FA5] text-[#E6F1FB] border border-[#185FA5] rounded-[var(--border-radius-md)] hover:bg-[#0C447C] transition-colors disabled:opacity-50"
      >
        <i className="ti ti-plus text-[13px]" /> New ticket
      </button>
      {open && vesselId && (
        <NewTicketModal
          vesselId={vesselId}
          onClose={() => setOpen(false)}
          onCreated={ticket => { setOpen(false); onCreated?.(ticket) }}
        />
      )}
    </>
  )
}
