'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'

type Equipment = { id: string; name: string; category: string }
type Manual = {
  id: string
  vessel_id: string | null
  equipment_id: string | null
  name: string
  category: string | null
  storage_path: string
  anthropic_file_id: string | null
  size_bytes: number | null
  uploaded_at: string
}

const CATEGORIES = ['Propulsion','Electrical','Safety','Navigation','HVAC','Plumbing','Systems','Deck']

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ManualsClient({
  manuals: initial,
  equipment,
  vesselId,
}: {
  manuals: Manual[]
  equipment: Equipment[]
  vesselId: string | null
}) {
  const [manuals, setManuals] = useState<Manual[]>(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [category, setCategory] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  // chat
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState('')
  const [askErr, setAskErr] = useState('')

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadErr('')
    const supabase = createClient()
    const added: Manual[] = []

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        setUploadErr(`"${file.name}" is not a PDF — skipped.`)
        continue
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${vesselId ?? 'patron'}/${Date.now()}-${safe}`

      const { error: upErr } = await supabase.storage.from('manuals').upload(path, file, {
        contentType: 'application/pdf',
        upsert: false,
      })
      if (upErr) { setUploadErr(upErr.message); continue }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insErr } = await (supabase as any).from('manuals').insert({
        vessel_id: vesselId,
        equipment_id: equipmentId || null,
        name: file.name.replace(/\.pdf$/i, ''),
        category: category || null,
        storage_path: path,
        size_bytes: file.size,
      }).select().single()

      if (insErr) { setUploadErr(insErr.message); continue }
      added.push(data as Manual)
    }

    if (added.length) setManuals(prev => [...added, ...prev])
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function deleteManual(m: Manual) {
    if (!confirm(`Delete "${m.name}"? This removes the manual and its file.`)) return
    const supabase = createClient()
    await supabase.storage.from('manuals').remove([m.storage_path])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('manuals').delete().eq('id', m.id)
    setManuals(prev => prev.filter(x => x.id !== m.id))
    setSelected(prev => { const n = new Set(prev); n.delete(m.id); return n })
  }

  function publicUrl(path: string) {
    return createClient().storage.from('manuals').getPublicUrl(path).data.publicUrl
  }

  async function ask() {
    if (!question.trim() || selected.size === 0) return
    setAsking(true)
    setAnswer('')
    setAskErr('')
    try {
      const res = await fetch('/api/manuals/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualIds: [...selected], question: question.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setAskErr(data.error ?? 'Something went wrong.'); return }
      setAnswer(data.answer)
    } catch {
      setAskErr('Could not reach the AI service.')
    } finally {
      setAsking(false)
    }
  }

  const equipName = (id: string | null) => equipment.find(e => e.id === id)?.name ?? null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
      {/* ─── Library + upload ─── */}
      <div>
        {/* Upload bar */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4 mb-3.5">
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--color-text-secondary)]">Category (optional)</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--color-text-secondary)]">Equipment (optional)</label>
              <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} className={`${inputCls} max-w-[200px]`}>
                <option value="">— None —</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
            >
              <i className="ti ti-upload text-[13px]" /> {uploading ? 'Uploading…' : 'Upload PDF(s)'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
          {uploadErr && <p className="text-[11px] text-[#A32D2D] mt-2">{uploadErr}</p>}
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
            Tip: set Category/Equipment first, then upload. They apply to the files you upload next.
          </p>
        </div>

        {/* Library table */}
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
          <table className="w-full text-[12px] border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-[8%] border-b border-[var(--color-border-tertiary)] pb-[7px] pt-3"></th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[40%]">Manual</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[24%]">Equipment</th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] text-[11px] px-2 pb-[7px] pt-3 border-b border-[var(--color-border-tertiary)] w-[14%]">Size</th>
                <th className="w-[14%] border-b border-[var(--color-border-tertiary)]"></th>
              </tr>
            </thead>
            <tbody>
              {manuals.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[var(--color-text-secondary)] py-8">No manuals yet. Upload a PDF to get started.</td></tr>
              ) : manuals.map(m => (
                <tr key={m.id} className={selected.has(m.id) ? 'bg-[#185FA5]/5' : 'hover:bg-[var(--color-background-secondary)]'}>
                  <td className="text-center px-2 py-2 border-b border-[var(--color-border-tertiary)]">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                  </td>
                  <td className="px-2 py-2 font-medium border-b border-[var(--color-border-tertiary)] overflow-hidden">
                    <a href={publicUrl(m.storage_path)} target="_blank" rel="noopener noreferrer"
                       className="text-[#185FA5] hover:underline truncate block">
                      <i className="ti ti-file-type-pdf text-[13px] mr-1" />{m.name}
                    </a>
                    {m.category && <span className="text-[10px] text-[var(--color-text-tertiary)]">{m.category}</span>}
                  </td>
                  <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)] truncate">{equipName(m.equipment_id) ?? '—'}</td>
                  <td className="px-2 py-2 text-[var(--color-text-secondary)] border-b border-[var(--color-border-tertiary)]">{fmtSize(m.size_bytes)}</td>
                  <td className="px-2 py-2 border-b border-[var(--color-border-tertiary)] text-right">
                    <button onClick={() => deleteManual(m)} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D]" title="Delete">
                      <i className="ti ti-trash text-[14px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Ask the AI ─── */}
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4 flex flex-col">
        <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
          <i className="ti ti-sparkles text-[14px] text-[#185FA5]" /> Ask the manuals
        </h2>
        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 mb-3">
          {selected.size === 0
            ? 'Tick one or more manuals on the left, then ask a question.'
            : `${selected.size} manual${selected.size > 1 ? 's' : ''} selected.`}
        </p>

        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. What is the oil capacity of the port engine and how often should it be changed?"
          className="w-full px-2.5 py-2 text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] resize-y min-h-[72px]"
        />
        <button
          onClick={ask}
          disabled={asking || !question.trim() || selected.size === 0}
          className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-[7px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50"
        >
          <i className="ti ti-send text-[13px]" /> {asking ? 'Thinking…' : 'Ask'}
        </button>

        {askErr && <p className="text-[11px] text-[#A32D2D] mt-3">{askErr}</p>}

        {answer && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-tertiary)] flex-1 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">Answer</div>
            <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{answer}</p>
          </div>
        )}

        {asking && !answer && (
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-3">Reading the manual(s)… the first question about a manual takes a little longer.</p>
        )}
      </div>
    </div>
  )
}

const inputCls = "px-[7px] py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
