'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import type { VesselLite } from '@/lib/vessel-shared'

export default function AppShell({
  vessels,
  activeId,
  children,
}: {
  vessels: VesselLite[]
  activeId: string | null
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar vessels={vessels} activeId={activeId} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar vessels={vessels} activeId={activeId} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-2.5 px-4 h-12 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] flex-shrink-0">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-[var(--color-text-primary)]">
            <i className="ti ti-menu-2 text-[20px]" />
          </button>
          <span className="text-[14px] font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <i className="ti ti-anchor text-[15px] text-[#185FA5]" /> Fairwinds
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
