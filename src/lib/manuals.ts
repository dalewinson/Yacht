import { extractText, getDocumentProxy } from 'unpdf'

// Extract per-page plain text from a PDF.
export async function extractPages(data: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data)
  const { text } = await extractText(pdf, { mergePages: false })
  // unpdf returns string[] when mergePages is false
  return (Array.isArray(text) ? text : [text]).map((t) => (t ?? '').replace(/\s+\n/g, '\n').trim())
}

const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','is','are','was','were','be','been','it','its',
  'this','that','these','those','with','as','at','by','from','how','what','when','where','which','who',
  'why','do','does','can','should','i','you','my','our','your','it’s','if','not','will','would',
])

function terms(q: string): string[] {
  return [...new Set(
    q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )]
}

export interface RankedPage {
  manualName: string
  page: number       // 1-indexed
  text: string
  score: number
}

// Score every page of the selected manuals against the question and return the
// most relevant ones, capped by a character budget (~4 chars/token).
export function selectRelevantPages(
  manuals: { name: string; pages: string[] }[],
  question: string,
  charBudget = 240_000,
): RankedPage[] {
  const qTerms = terms(question)
  const all: RankedPage[] = []

  for (const m of manuals) {
    m.pages.forEach((text, idx) => {
      if (!text) return
      const lower = text.toLowerCase()
      let score = 0
      for (const t of qTerms) {
        let from = 0
        while (true) {
          const at = lower.indexOf(t, from)
          if (at === -1) break
          score += 1
          from = at + t.length
        }
      }
      all.push({ manualName: m.name, page: idx + 1, text, score })
    })
  }

  const matched = all.filter((p) => p.score > 0).sort((a, b) => b.score - a.score)
  // If nothing matched (e.g. diagram-only manual), fall back to a sensible spread.
  const pool = matched.length ? matched : all.slice(0, 40)

  const out: RankedPage[] = []
  let used = 0
  for (const p of pool) {
    const cost = p.text.length + 60
    if (used + cost > charBudget && out.length > 0) continue
    out.push(p)
    used += cost
  }
  // Present in reading order within the budget for coherence.
  return out.sort((a, b) => (a.manualName === b.manualName ? a.page - b.page : a.manualName.localeCompare(b.manualName)))
}
