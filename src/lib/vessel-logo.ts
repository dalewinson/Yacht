import { createClient } from '@/lib/supabase/client'

// Upload a vessel logo to the public ticket-media bucket (under logos/) and
// return its public URL, or null on failure.
export async function uploadVesselLogo(vesselId: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'png').toLowerCase()
  const path = `logos/${vesselId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('ticket-media').upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  })
  if (error) return null
  return supabase.storage.from('ticket-media').getPublicUrl(path).data.publicUrl
}
