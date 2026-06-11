import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extractPages } from '@/lib/manuals'

export const maxDuration = 60

// Extract per-page text for a manual and store it on the row.
export async function POST(req: NextRequest) {
  let body: { manualId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }) }
  if (!body.manualId) return NextResponse.json({ error: 'manualId is required.' }, { status: 400 })

  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: m, error } = await (supabase as any)
    .from('manuals').select('id, name, storage_path, indexed_at').eq('id', body.manualId).single()
  if (error || !m) return NextResponse.json({ error: 'Manual not found.' }, { status: 404 })
  if (m.indexed_at) return NextResponse.json({ ok: true, alreadyIndexed: true })

  const { data: blob, error: dErr } = await supabase.storage.from('manuals').download(m.storage_path)
  if (dErr || !blob) return NextResponse.json({ error: 'Could not read the file from storage.' }, { status: 500 })

  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const pages = await extractPages(bytes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('manuals').update({
      pages, page_count: pages.length, indexed_at: new Date().toISOString(),
    }).eq('id', m.id)
    return NextResponse.json({ ok: true, pageCount: pages.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to read the PDF text.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
