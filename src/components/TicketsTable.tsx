'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import { uploadTicketMedia, deleteTicketMedia, ticketMediaUrl, type TicketAttachment } from '@/lib/ticket-media'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import NewTicketButton from './NewTicketButton'
import { useEquipmentCategories } from './CategoriesProvider'
import { useVesselEquipment } from '@/lib/use-equipment'
import type { Database, TicketStatus, TicketPriority } from '@/types/database'

type Attachment = TicketAttachment
type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  vessels: { name: string } | null
  ticket_attachments?: Attachment[]
}


type SortKey = 'title' | 'category' | 'priority' | 'created_at' | 'status'
const PRIORITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 }
const STATUS_ORDER: Record<string, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 }

export default function TicketsTable({ tickets: initial, vesselId }: { tickets: Ticket[]; vesselId: string | null }) {
  const [tickets, setTickets] = useState(initial)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'created_at', dir: -1 })

  // Stable ticket numbers by creation order (so sorting doesn't renumber).
  const numberById = new Map(
    [...tickets].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map((t, i) => [t.id, i + 1001]),
  )

  const filtered = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter)
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number
    switch (sort.key) {
      case 'priority': av = PRIORITY_ORDER[a.priority]; bv = PRIORITY_ORDER[b.priority]; break
      case 'status':   av = STATUS_ORDER[a.status];     bv = STATUS_ORDER[b.status];     break
      case 'created_at': av = a.created_at; bv = b.created_at; break
      case 'category': av = (a.category ?? '').toLowerCase(); bv = (b.category ?? '').toLowerCase(); break
      default:         av = (a.title ?? '').toLowerCase();    bv = (b.title ?? '').toLowerCase()
    }
    if (av < bv) return -1 * sort.dir
    if (av > bv) return 1 * sort.dir
    return 0
  })

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === 'created_at' ? -1 : 1 })
  }

  async function updateTicket(id: string, patch: Partial<Ticket>) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tickets').update(patch).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    setSelected(prev => prev && prev.id === id ? { ...prev, ...patch } : prev)
  }

  async function deleteTicket(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tickets').delete().eq('id', id)
    setTickets(prev => prev.filter(t => t.id !== id))
    setSelected(null)
  }

  function updateAttachments(id: string, attachments: Attachment[]) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ticket_attachments: attachments } : t))
    setSelected(prev => prev && prev.id === id ? { ...prev, ticket_attachments: attachments } : prev)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex gap-1">
          {(['all','open','in_progress','resolved','closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-[var(--border-radius-md)] text-[12px] font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-[#185FA5] text-white' : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <NewTicketButton vesselId={vesselId} onCreated={t => setTickets(prev => [t as Ticket, ...prev])} />
      </div>

      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-x-auto">
        <table className="w-full min-w-[680px] text-[12px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] pl-4 pr-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[7%]">#</th>
              <SortHeader label="Description" col="title"      sort={sort} onSort={toggleSort} className="w-[33%]" />
              <SortHeader label="Category"    col="category"   sort={sort} onSort={toggleSort} className="w-[13%]" />
              <SortHeader label="Priority"    col="priority"   sort={sort} onSort={toggleSort} className="w-[11%]" />
              <SortHeader label="Reported"    col="created_at" sort={sort} onSort={toggleSort} className="w-[15%]" />
              <SortHeader label="Status"      col="status"     sort={sort} onSort={toggleSort} className="w-[21%]" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-4">No tickets found</td></tr>
            ) : sorted.map((t) => (
              <tr key={t.id} className="hover:bg-[var(--color-background-secondary)]">
                <td className="pl-4 pr-2 py-2 text-[var(--color-text-secondary)] text-[11px] border-b border-[var(--color-border-tertiary)]">#{numberById.get(t.id)}</td>
                <td className="px-2 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                  <button onClick={() => setSelected(t)} className="text-[#185FA5] hover:underline text-left truncate w-full">
                    {t.source === 'sms' && <i className="ti ti-message-2 text-[11px] mr-1" title="From text" />}
                    {t.title}
                    {t.ticket_attachments && t.ticket_attachments.length > 0 && <i className="ti ti-paperclip text-[11px] ml-1 text-[var(--color-text-tertiary)]" />}
                  </button>
                </td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{t.category ?? '—'}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]"><PriorityBadge priority={t.priority} /></td>
                <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{fmtDate(t.created_at)}</td>
                <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)]"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <TicketDetail
          ticket={selected}
          numberLabel={numberById.get(selected.id)}
          onClose={() => setSelected(null)}
          onSave={updateTicket}
          onDelete={deleteTicket}
          onAttachmentsChange={updateAttachments}
        />
      )}
    </>
  )
}

function SortHeader({ label, col, sort, onSort, className = '' }: {
  label: string
  col: SortKey
  sort: { key: SortKey; dir: 1 | -1 }
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sort.key === col
  return (
    <th className={`text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] ${className}`}>
      <button onClick={() => onSort(col)} className={`inline-flex items-center gap-0.5 hover:text-[var(--color-text-primary)] ${active ? 'text-[var(--color-text-primary)]' : ''}`}>
        {label}
        <i className={`ti ${active ? (sort.dir === 1 ? 'ti-caret-up-filled' : 'ti-caret-down-filled') : 'ti-arrows-sort'} text-[11px] opacity-70`} />
      </button>
    </th>
  )
}

function TicketDetail({ ticket: t, numberLabel, onClose, onSave, onDelete, onAttachmentsChange }: {
  ticket: Ticket
  numberLabel?: number
  onClose: () => void
  onSave: (id: string, patch: Partial<Ticket>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAttachmentsChange: (id: string, attachments: Attachment[]) => void
}) {
  const CATEGORIES = useEquipmentCategories()
  const equipment = useVesselEquipment(t.vessel_id)
  const [title, setTitle]           = useState(t.title)
  const [category, setCategory]     = useState(t.category ?? '')
  const [equipmentId, setEquipmentId] = useState(t.equipment_id ?? '')
  const [priority, setPriority]     = useState<TicketPriority>(t.priority)
  const [assignedTo, setAssignedTo] = useState(t.assigned_to ?? '')
  const [description, setDescription] = useState(t.description ?? '')
  const [resolution, setResolution] = useState(t.resolution ?? '')
  const [status, setStatus]         = useState<TicketStatus>(t.status)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>(t.ticket_attachments ?? [])
  const [uploading, setUploading] = useState(false)

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setUploading(true)
    const added: Attachment[] = []
    for (const file of Array.from(fileList)) {
      const a = await uploadTicketMedia(t.id, file)
      if (a) added.push(a)
    }
    const next = [...attachments, ...added]
    setAttachments(next)
    onAttachmentsChange(t.id, next)
    setUploading(false)
  }

  async function removeAttachment(a: Attachment) {
    if (!confirm('Remove this photo?')) return
    await deleteTicketMedia(a)
    const next = attachments.filter(x => x.id !== a.id)
    setAttachments(next)
    onAttachmentsChange(t.id, next)
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    await onSave(t.id, {
      title: title.trim(),
      category: category || null,
      equipment_id: equipmentId || null,
      priority,
      assigned_to: assignedTo.trim() || null,
      description: description.trim() || null,
      resolution: resolution.trim() || null,
      status,
    })
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    await onDelete(t.id)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const lbl = "block text-[11px] text-[var(--color-text-secondary)] mb-[3px]"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Ticket {numberLabel ? `#${numberLabel}` : ''}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">
          {t.source === 'sms' ? `From text${t.reported_by ? ` · ${t.reported_by}` : ''}` : `Source: ${t.source}`} · Reported {fmtDate(t.created_at)}
        </div>

        <div className="space-y-[10px]">
          <div>
            <label className={lbl}>Description *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={cls} />
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className={lbl}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={cls}>
                <option value="">— None —</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className={cls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Assigned to</label>
              <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TicketStatus)} className={cls}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Equipment</label>
            <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} className={cls}>
              <option value="">— None —</option>
              {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Details</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${cls} resize-y`} />
          </div>
          <div>
            <label className={lbl}>Resolution (what we did)</label>
            <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3} placeholder="How the issue was fixed…" className={`${cls} resize-y`} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 mb-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Photos / video</div>
          <label className="text-[11px] text-[#185FA5] hover:underline cursor-pointer inline-flex items-center gap-1">
            <i className="ti ti-camera-plus text-[13px]" /> {uploading ? 'Uploading…' : 'Add'}
            <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={uploading}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
        </div>
        {attachments.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-tertiary)]">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {attachments.map(a => {
              const url = ticketMediaUrl(a.storage_path)
              const isVideo = (a.content_type ?? '').startsWith('video')
              return (
                <div key={a.id} className="relative group aspect-square overflow-hidden rounded-[var(--border-radius-md)] border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                    {isVideo
                      ? <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]"><i className="ti ti-video text-[22px]" /></div>
                      : <img src={url} alt="attachment" className="w-full h-full object-cover" />}
                  </a>
                  <button onClick={() => removeAttachment(a)} title="Remove"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center text-[12px] leading-none hover:bg-[#A32D2D]">×</button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-4">
          <button
            onClick={remove}
            disabled={deleting}
            className="text-[12px] text-[#A32D2D] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
          >
            <i className="ti ti-trash text-[13px]" /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
            >
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
