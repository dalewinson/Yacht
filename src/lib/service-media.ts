import { createClient } from '@/lib/supabase/client'

export type ServiceAttachment = { id: string; storage_path: string; content_type: string | null; filename: string | null }

// Upload one file (invoice/photo/PDF) to a service-log entry.
export async function uploadServiceMedia(serviceLogId: string, file: File): Promise<ServiceAttachment | null> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'bin').toLowerCase()
  const path = `service/${serviceLogId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const { error } = await supabase.storage.from('ticket-media').upload(path, file, { contentType: file.type || undefined, upsert: true })
  if (error) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('service_log_attachments')
    .insert({ service_log_id: serviceLogId, storage_path: path, content_type: file.type || null, filename: file.name })
    .select().single()
  return data ? (data as ServiceAttachment) : null
}

export async function deleteServiceMedia(att: ServiceAttachment) {
  const supabase = createClient()
  await supabase.storage.from('ticket-media').remove([att.storage_path])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('service_log_attachments').delete().eq('id', att.id)
}

export function serviceMediaUrl(path: string) {
  return createClient().storage.from('ticket-media').getPublicUrl(path).data.publicUrl
}
