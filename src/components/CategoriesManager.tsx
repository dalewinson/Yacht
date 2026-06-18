'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']
type Kind = 'equipment' | 'contact'

export default function CategoriesManager({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <CategoryList
        kind="equipment"
        title="Equipment categories"
        hint="Used for equipment, parts, manuals & tickets."
        items={categories.filter(c => c.kind === 'equipment')}
      />
      <CategoryList
        kind="contact"
        title="Contact roles"
        hint="Used for the Contacts list."
        items={categories.filter(c => c.kind === 'contact')}
      />
    </div>
  )
}

function CategoryList({ kind, title, hint, items }: { kind: Kind; title: string; hint: string; items: Category[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(items)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function add() {
    const name = newName.trim()
    if (!name) return
    if (rows.some(r => r.name.toLowerCase() === name.toLowerCase())) { setError('That already exists.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    const sort = rows.length ? Math.max(...rows.map(r => r.sort_order)) + 1 : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any).from('categories').insert({ kind, name, sort_order: sort }).select().single()
    setBusy(false)
    if (err) { setError(err.message); return }
    setRows(prev => [...prev, data as Category])
    setNewName('')
    router.refresh()
  }

  async function rename(row: Category, next: string) {
    const name = next.trim()
    if (!name || name === row.name) return
    setBusy(true); setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('categories').update({ name }).eq('id', row.id)
    if (err) { setBusy(false); setError(err.message); return }
    // Propagate the rename to existing records so nothing is orphaned.
    if (kind === 'equipment') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('equipment').update({ category: name }).eq('category', row.name)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('crew').update({ role: name }).eq('role', row.name)
    }
    setBusy(false)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, name } : r))
    router.refresh()
  }

  async function remove(row: Category) {
    if (!confirm(`Delete "${row.name}"? Existing records keep this label until you change them.`)) return
    setBusy(true); setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any).from('categories').delete().eq('id', row.id)
    setBusy(false)
    if (err) { setError(err.message); return }
    setRows(prev => prev.filter(r => r.id !== row.id))
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-4">
      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="text-[11px] text-[var(--color-text-secondary)] mb-3">{hint}</p>

      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-1.5">
            <input
              defaultValue={row.name}
              onBlur={e => rename(row, e.target.value)}
              disabled={busy}
              className="flex-1 px-2 py-1 text-[12px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
            />
            <button onClick={() => remove(row)} disabled={busy} className="text-[var(--color-text-tertiary)] hover:text-[#A32D2D] px-1" title="Delete">
              <i className="ti ti-trash text-[13px]" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[11px] text-[var(--color-text-tertiary)]">None yet.</p>}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add new…"
          className="flex-1 px-2 py-1 text-[12px] border border-[var(--color-border-secondary)] rounded bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        />
        <button onClick={add} disabled={busy || !newName.trim()} className="px-2.5 py-1 text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
          Add
        </button>
      </div>
      {error && <p className="text-[11px] text-[#A32D2D] mt-2">{error}</p>}
    </div>
  )
}
