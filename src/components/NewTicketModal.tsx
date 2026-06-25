'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadTicketMedia, type TicketAttachment } from '@/lib/ticket-media'
import { useEquipmentCategories } from './CategoriesProvider'
import { useVesselEquipment, useVesselContacts } from '@/lib/use-equipment'
import type { TicketPriority } from '@/types/database'


interface Props {
  vesselId: string
  onClose: () => void
  onCreated?: (ticket: Record<string, unknown>) => void
}

export default function NewTicketModal({ vesselId, onClose, onCreated }: Props) {
  const CATEGORIES = useEquipmentCategories()
  const equipment = useVesselEquipment(vesselId)
  const contacts = useVesselContacts(vesselId)
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]     = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [reportedById, setReportedById] = useState('')
  const [priority, setPriority]     = useState<TicketPriority>('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [files, setFiles]           = useState<File[]>([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any).from('tickets').insert({
      vessel_id:   vesselId,
      title:       title.trim(),
      description: description.trim() || null,
      category:    category || null,
      equipment_id: equipmentId || null,
      reported_by_id: reportedById || null,
      reported_by: reportedById ? (contacts.find(c => c.id === reportedById)?.name ?? null) : null,
      priority,
      assigned_to: assignedTo.trim() || null,
      source:      'manual',
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    // Upload any attached photos/videos and link them to the new ticket.
    const attachments: TicketAttachment[] = []
    for (const file of files) {
      const a = await uploadTicketMedia(data.id, file)
      if (a) attachments.push(a)
    }
    onCreated?.({ ...(data as Record<string, unknown>), ticket_attachments: attachments })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[520px] max-h-[82vh] overflow-y-auto p-5">
        <h2 className="text-[15px] font-medium text-[var(--color-text-primary)] mb-4">New ticket</h2>

        <form onSubmit={handleSubmit} className="space-y-[10px]">
          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Description *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Port engine coolant leak"
              className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
          </div>

          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Assigned to</label>
              <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                placeholder="Name"
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Reported by</label>
              <select value={reportedById} onChange={e => setReportedById(e.target.value)}
                className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
                <option value="">— Select contact —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Equipment</label>
            <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)}
              className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
              <option value="">— None —</option>
              {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Details</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Describe the issue..."
              className="w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y min-h-[70px]" />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">Photos / video</label>
            <input type="file" accept="image/*,video/*" multiple
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-[11px] text-[var(--color-text-secondary)] file:mr-2 file:px-2 file:py-1 file:text-[11px] file:border file:border-[var(--color-border-secondary)] file:rounded-[var(--border-radius-md)] file:bg-[var(--color-background-secondary)] file:text-[var(--color-text-primary)]" />
            {files.length > 0 && <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">{files.length} file{files.length > 1 ? 's' : ''} selected</p>}
          </div>

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-3 py-[5px] text-[12px] bg-[#185FA5] text-white border border-[#185FA5] rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              {saving ? (files.length ? 'Uploading…' : 'Saving…') : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
