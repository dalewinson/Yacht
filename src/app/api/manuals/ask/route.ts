import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, ASK_MODEL } from '@/lib/anthropic'
import { createServiceClient } from '@/lib/supabase/server'
import { extractPages, selectRelevantPages } from '@/lib/manuals'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { manualIds?: string[]; question?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const { manualIds, question } = body
  if (!question?.trim()) return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
  if (!manualIds?.length) return NextResponse.json({ error: 'Select at least one manual to ask about.' }, { status: 400 })

  let anthropic
  try { anthropic = getAnthropic() }
  catch { return NextResponse.json({ error: 'The AI service is not configured yet (missing API key).' }, { status: 500 }) }

  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manualsRaw, error: mErr } = await (supabase as any)
    .from('manuals').select('id, name, storage_path, pages, indexed_at').in('id', manualIds)
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  const manuals = (manualsRaw ?? []) as {
    id: string; name: string; storage_path: string; pages: string[] | null; indexed_at: string | null
  }[]
  if (!manuals.length) return NextResponse.json({ error: 'No matching manuals found.' }, { status: 404 })

  // Index any manual we haven't extracted text from yet (first question is slower).
  for (const m of manuals) {
    if (m.pages && m.pages.length) continue
    const { data: blob, error: dErr } = await supabase.storage.from('manuals').download(m.storage_path)
    if (dErr || !blob) return NextResponse.json({ error: `Could not read "${m.name}".` }, { status: 500 })
    try {
      const pages = await extractPages(new Uint8Array(await blob.arrayBuffer()))
      m.pages = pages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('manuals').update({
        pages, page_count: pages.length, indexed_at: new Date().toISOString(),
      }).eq('id', m.id)
    } catch {
      return NextResponse.json({ error: `Could not read the text from "${m.name}".` }, { status: 500 })
    }
  }

  const ranked = selectRelevantPages(
    manuals.map((m) => ({ name: m.name, pages: m.pages ?? [] })),
    question,
  )
  if (!ranked.length) return NextResponse.json({ error: 'These manuals have no readable text to search.' }, { status: 422 })

  const context = ranked
    .map((p) => `### ${p.manualName} — page ${p.page}\n${p.text}`)
    .join('\n\n')

  const system =
    'You are a knowledgeable marine systems assistant for the motor yacht PATRON. ' +
    'Answer the question using ONLY the manual excerpts provided by the user. ' +
    'Quote part numbers, capacities, torque values, intervals, and procedures verbatim when present. ' +
    'Cite the manual name and page number you drew the answer from. ' +
    'If the answer is not in the provided excerpts, say so plainly and suggest which manual or section might cover it — do not guess.'

  try {
    const resp = await anthropic.messages.create({
      model: ASK_MODEL,
      max_tokens: 1500,
      system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Relevant manual excerpts:\n\n${context}`, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: `Question: ${question.trim()}` },
          ],
        },
      ],
    })

    const answer = resp.content
      .filter((b) => b.type === 'text')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b) => (b as any).text).join('\n').trim()

    const sources = [...new Set(ranked.map((p) => `${p.manualName} p.${p.page}`))].slice(0, 12)
    return NextResponse.json({ answer: answer || 'No answer was returned.', sources })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'The AI request failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
