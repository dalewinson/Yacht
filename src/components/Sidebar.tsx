'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { section: 'Operations' },
  { label: 'Dashboard',      href: '/',            icon: 'ti-layout-dashboard' },
  { label: 'Equipment',      href: '/equipment',   icon: 'ti-list-details' },
  { label: 'Tickets',        href: '/tickets',     icon: 'ti-ticket' },
  { label: 'Alerts',         href: '/alerts',      icon: 'ti-bell' },
  { section: 'Maintenance' },
  { label: 'Inspections',    href: '/inspections', icon: 'ti-clipboard-check' },
  { label: 'Service log',    href: '/service-log', icon: 'ti-tool' },
  { label: 'Parts',          href: '/parts',       icon: 'ti-package' },
  { section: 'Resources' },
  { label: 'Crew & contacts',href: '/crew',        icon: 'ti-users' },
  { label: 'Manuals',        href: '/manuals',     icon: 'ti-book' },
  { label: 'Ask the AI',     href: '/ask',         icon: 'ti-message-circle' },
]

const BOTTOM = [
  { label: 'Reports',  href: '/reports',  icon: 'ti-file-export' },
  { label: 'Settings', href: '/settings', icon: 'ti-settings' },
]

export default function Sidebar() {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/') return path === '/'
    return path.startsWith(href)
  }

  return (
    <aside className="w-[195px] flex-shrink-0 flex flex-col border-r border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)]">
      <div className="px-4 py-4 border-b border-[var(--color-border-tertiary)]">
        <p className="text-[11px] text-[var(--color-text-secondary)]">73 ft · M/Y PATRON</p>
        <h2 className="text-[15px] font-medium text-[var(--color-text-primary)] flex items-center gap-1.5 mt-0.5">
          <i className="ti ti-ship" /> Fairwinds
        </h2>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map((item, i) =>
          'section' in item ? (
            <div key={i} className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-tertiary)]">
              {item.section}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-[7px] text-[13px] border-l-2 transition-colors ${
                isActive(item.href)
                  ? 'text-[#185FA5] border-l-[#185FA5] bg-[#E6F1FB] font-medium'
                  : 'text-[var(--color-text-secondary)] border-l-transparent hover:bg-[var(--color-background-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <i className={`ti ${item.icon} text-[15px] flex-shrink-0`} />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-[var(--color-border-tertiary)] pt-1 pb-2">
        {BOTTOM.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-[7px] text-[13px] border-l-2 transition-colors ${
              isActive(item.href)
                ? 'text-[#185FA5] border-l-[#185FA5] bg-[#E6F1FB] font-medium'
                : 'text-[var(--color-text-secondary)] border-l-transparent hover:bg-[var(--color-background-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <i className={`ti ${item.icon} text-[15px] flex-shrink-0`} />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
