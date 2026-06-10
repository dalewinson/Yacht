'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, TicketStatus, TicketPriority } from '@/types/database'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'

type Vessel = { id: string; name: string }
type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  vessels: { name: string } | null
}

const STATUS_OPTIONS: { label: string; value: TicketStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

export default function TicketList({ vessels }: { vessels: Vessel[] }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [vesselFilter, setVesselFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)
      let query = supabase
        .from('tickets')
        .select('*, vessels(name)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (vesselFilter !== 'all') query = query.eq('vessel_id', vesselFilter)

      const { data } = await query
      setTickets((data as Ticket[]) ?? [])
      setLoading(false)
    }

    load()
  }, [statusFilter, vesselFilter])

  function handleStatus(value: TicketStatus | 'all') {
    startTransition(() => setStatusFilter(value))
  }

  function handleVessel(value: string) {
    startTransition(() => setVesselFilter(value))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatus(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={vesselFilter}
          onChange={e => handleVessel(e.target.value)}
          className="ml-auto text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 bg-white"
        >
          <option value="all">All Vessels</option>
          {vessels.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No tickets found.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {tickets.map(ticket => (
            <div key={ticket.id} className="px-4 py-3 flex gap-4 items-start hover:bg-gray-50 transition-colors">
              <div className="pt-0.5 w-20 shrink-0">
                <StatusBadge status={ticket.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ticket.vessels?.name ?? '—'} · {new Date(ticket.created_at).toLocaleDateString()}
                  {ticket.source === 'sms' && (
                    <span className="ml-2 text-indigo-500 font-medium">SMS</span>
                  )}
                </p>
              </div>
              <div className="pt-0.5 shrink-0">
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
