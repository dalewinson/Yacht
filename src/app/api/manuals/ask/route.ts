import { NextRequest, NextResponse } from 'next/server'
import { toFile } from '@anthropic-ai/sdk'
import { getAnthropic, ASK_MODEL } from '@/lib/anthropic'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

const FILES_BETA = 'files-api-2025-04-14'

export async function POST(req: NextRequest) {
  let body: { manualIds?: string[]; question?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { manualIds, question } = body
  if (!question?.trim()) return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
  if (!manualIds?.length) return NextResponse.json({ error: 'Select at least one manual to ask about.' }, { status: 400 })

  let anthropic
  try {
    anthropic = getAnthropic()
  } catch {
    return NextResponse.json({ error: 'The AI service is not configured yet (missing API key).' }, { status: 500 })
  }

  const supabase = await createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manualsRaw, error: mErr } = await (supabase as any)
    .from('manuals')
    .select('id, name, storage_path, anthropic_file_id')
    .in('id', manualIds)

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
  const manuals = (manualsRaw ?? []) as {
    id: string; name: string; storage_path: string; anthropic_file_id: string | null
  }[]
  if (!manuals.length) return NextResponse.json({ error: 'No matching manuals found.' }, { status: 404 })

  // Ensure each manual is uploaded to the Anthropic Files API (lazy, cached on the row).
  for (const m of manuals) {
    if (m.anthropic_file_id) continue
    const { data: blob, error: dErr } = await supabase.storage.from('manuals').download(m.storage_path)
    if (dErr || !blob) return NextResponse.json({ error: `Could not read "${m.name}" from storage.` }, { status: 500 })

    const file = await toFile(blob, m.name, { type: 'application/pdf' })
    const uploaded = await anthropic.beta.files.upload({ file, betas: [FILES_BETA] })
    m.anthropic_file_id = uploaded.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('manuals').update({ anthropic_file_id: uploaded.id }).eq('id', m.id)
  }

  // Build the document blocks; cache_control on the last one caches the whole set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docBlocks: any[] = manuals.map((m, i) => ({
    type: 'document',
    source: { type: 'file', file_id: m.anthropic_file_id },
    title: m.name,
    citations: { enabled: true },
    ...(i === manuals.length - 1 ? { cache_control: { type: 'ephemeral' } } : {}),
  }))

  const system =
    'You are a knowledgeable marine systems assistant for the motor yacht PATRON. ' +
    'Answer the user\'s question using ONLY the attached equipment manuals. ' +
    'Be specific and practical — quote part numbers, capacities, torque values, intervals, and procedures verbatim when present. ' +
    'If the answer is not in the manuals, say so plainly rather than guessing. Cite the manual you drew from.'

  try {
    const resp = await anthropic.beta.messages.create({
      model: ASK_MODEL,
      max_tokens: 2000,
      betas: [FILES_BETA],
      system,
      messages: [
        { role: 'user', content: [...docBlocks, { type: 'text', text: question.trim() }] },
      ],
    })

    const answer = resp.content
      .filter((b) => b.type === 'text')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b) => (b as any).text)
      .join('\n')
      .trim()

    return NextResponse.json({ answer: answer || 'No answer was returned.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'The AI request failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
