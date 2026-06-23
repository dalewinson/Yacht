'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import { uploadTicketMedia, deleteTicketMedia, ticketMediaUrl, type TicketAttachment } from '@/lib/ticket-media'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import NewTicketButton from './NewTicketButton'
import type { Database, TicketStatus } from '@/types/database'

type Attachment = TicketAttachment
type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  vessels: { name: string } | null
  ticket_attachments?: Attachment[]
}


export default function TicketsTable({ tickets: initial, vesselId }: { tickets: Ticket[]; vesselId: string | null }) {
  const [tickets, setTickets] = useState(initial)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')

  const filtered = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter)

  async function updateStatus(id: string, status: TicketStatus) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
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
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[35%]">Description</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[13%]">Category</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[11%]">Priority</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[15%]">Reported</th>
              <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[19%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)] py-4">No tickets found</td></tr>
            ) : filtered.map((t, i) => (
              <tr key={t.id} className="hover:bg-[var(--color-background-secondary)]">
                <td className="pl-4 pr-2 py-2 text-[var(--color-text-secondary)] text-[11px] border-b border-[var(--color-border-tertiary)]">#{i + 1001}</td>
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
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
          onDelete={deleteTicket}
          onAttachmentsChange={updateAttachments}
        />
      )}
    </>
  )
}

function TicketDetail({ ticket: t, onClose, onUpdateStatus, onDelete, onAttachmentsChange }: {
  ticket: Ticket
  onClose: () => void
  onUpdateStatus: (id: string, status: TicketStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAttachmentsChange: (id: string, attachments: Attachment[]) => void
}) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<TicketStatus>(t.status)
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
    setSaving(true)
    await onUpdateStatus(t.id, status)
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    await onDelete(t.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[82vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">Ticket</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        {[
          ['Description', t.title],
          ['Category',    t.category ?? '—'],
          ['Assigned to', t.assigned_to ?? '—'],
          ['Source',      t.source === 'sms' ? `Text${t.reported_by ? ` · ${t.reported_by}` : ''}` : t.source],
          ['Reported',    fmtDate(t.created_at)],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between py-[5px] border-b border-[var(--color-border-tertiary)] text-[12px]">
            <span className="text-[var(--color-text-secondary)]">{l}</span>
            <span className="font-medium text-[var(--color-text-primary)] text-right max-w-[65%]">{v}</span>
          </div>
        ))}
        <div className="flex justify-between py-[5px] border-b border-[var(--color-border-tertiary)] text-[12px]">
          <span className="text-[var(--color-text-secondary)]">Priority</span>
          <PriorityBadge priority={t.priority} />
        </div>

        {t.description && (
          <>
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mt-3 mb-2">Details</div>
            <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{t.description}</p>
          </>
        )}

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
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TicketStatus)}
              className="text-[12px] px-2 py-[5px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
            >
              <i className="ti ti-check text-[13px]" /> {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
