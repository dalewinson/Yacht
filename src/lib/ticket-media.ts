import { createClient } from '@/lib/supabase/client'

export type TicketAttachment = { id: string; storage_path: string; content_type: string | null }

// Upload one file to the ticket-media bucket and link it to the ticket.
export async function uploadTicketMedia(ticketId: string, file: File): Promise<TicketAttachment | null> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'bin').toLowerCase()
  const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const { error: upErr } = await supabase.storage.from('ticket-media').upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  })
  if (upErr) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('ticket_attachments')
    .insert({ ticket_id: ticketId, storage_path: path, content_type: file.type || null })
    .select().single()
  return data ? (data as TicketAttachment) : null
}

export async function deleteTicketMedia(att: TicketAttachment) {
  const supabase = createClient()
  await supabase.storage.from('ticket-media').remove([att.storage_path])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('ticket_attachments').delete().eq('id', att.id)
}

export function ticketMediaUrl(path: string) {
  return createClient().storage.from('ticket-media').getPublicUrl(path).data.publicUrl
}
