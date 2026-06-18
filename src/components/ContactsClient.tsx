'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useContactRoles } from './CategoriesProvider'
import type { Database } from '@/types/database'

type Contact = Database['public']['Tables']['crew']['Row']

// Known role colors; any custom role falls back to a deterministic palette pick.
const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  Owner:      { bg: '#E6F1FB', color: '#185FA5' },
  Captain:    { bg: '#E6F1FB', color: '#0C447C' },
  Engineer:   { bg: '#EAF3DE', color: '#3B6D11' },
  Deckhand:   { bg: '#EAF3DE', color: '#4A7C1A' },
  Technician: { bg: '#FAEEDA', color: '#854F0B' },
  Vendor:     { bg: '#F3EAF7', color: '#6B2E8A' },
  Marina:     { bg: '#E4F1F1', color: '#0E6E6E' },
  Emergency:  { bg: '#FBE6E6', color: '#A32D2D' },
}
const FALLBACK_PALETTE = [
  { bg: '#E6F1FB', color: '#185FA5' }, { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FAEEDA', color: '#854F0B' }, { bg: '#F3EAF7', color: '#6B2E8A' },
  { bg: '#E4F1F1', color: '#0E6E6E' }, { bg: '#FBE6E6', color: '#A32D2D' },
]
function roleStyle(role: string) {
  if (ROLE_STYLE[role]) return ROLE_STYLE[role]
  let h = 0
  for (let i = 0; i < role.length; i++) h = (h * 31 + role.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length]
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function ContactsClient({
  contacts: initial,
  vesselId,
}: {
  contacts: Contact[]
  vesselId: string | null
}) {
  const ROLES = useContactRoles()
  const [contacts, setContacts] = useState<Contact[]>(initial)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRole]   = useState<string>('all')
  const [editing, setEditing]   = useState<Contact | null>(null)
  const [adding, setAdding]     = useState(false)

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return (
      (roleFilter === 'all' || c.role === roleFilter) &&
      (!q || c.name.toLowerCase().includes(q) || (c.specialty ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
    )
  })

  function onSaved(c: Contact) {
    setContacts(prev => prev.some(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])
    setEditing(null); setAdding(false)
  }
  function onDeleted(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id))
    setEditing(null)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3.5 items-center">
        <input
          type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
        />
        <select value={roleFilter} onChange={e => setRole(e.target.value)}
          className="px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => setAdding(true)} disabled={!vesselId}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
          <i className="ti ti-plus text-[13px]" /> Add contact
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-[var(--color-text-secondary)] py-10 text-[13px] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] bg-[var(--color-background-primary)]">
          No contacts {contacts.length ? 'match your filter' : 'yet — click "Add contact"'}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const style = roleStyle(c.role)
            return (
              <div key={c.id} className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                    style={{ background: style.bg, color: style.color }}>
                    {initials(c.name) || '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{c.name}</span>
                      <button onClick={() => setEditing(c)} className="text-[var(--color-text-tertiary)] hover:text-[#185FA5] flex-shrink-0" title="Edit">
                        <i className="ti ti-edit text-[13px]" />
                      </button>
                    </div>
                    <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: style.bg, color: style.color }}>{c.role}</span>
                    {c.specialty && <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">{c.specialty}</div>}
                  </div>
                </div>
                <div className="mt-2.5 space-y-1">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-[12px] text-[#185FA5] hover:underline">
                      <i className="ti ti-phone text-[12px]" /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[12px] text-[#185FA5] hover:underline truncate">
                      <i className="ti ti-mail text-[12px]" /> <span className="truncate">{c.email}</span>
                    </a>
                  )}
                  {c.notes && <div className="text-[11px] text-[var(--color-text-secondary)] pt-1">{c.notes}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && vesselId && (
        <ContactModal
          vesselId={vesselId}
          contact={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}

function ContactModal({
  vesselId, contact, onClose, onSaved, onDeleted,
}: {
  vesselId: string
  contact: Contact | null
  onClose: () => void
  onSaved: (c: Contact) => void
  onDeleted: (id: string) => void
}) {
  const ROLES = useContactRoles()
  const [name, setName]           = useState(contact?.name ?? '')
  const [role, setRole]           = useState<string>(contact?.role ?? ROLES[0] ?? 'Vendor')
  const [phone, setPhone]         = useState(contact?.phone ?? '')
  const [email, setEmail]         = useState(contact?.email ?? '')
  const [specialty, setSpecialty] = useState(contact?.specialty ?? '')
  const [notes, setNotes]         = useState(contact?.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const style = roleStyle(role)
    const payload = {
      name: name.trim(), role,
      phone: phone.trim() || null, email: email.trim() || null,
      specialty: specialty.trim() || null, notes: notes.trim() || null,
      avatar_color: style.color, avatar_bg: style.bg,
    }

    let data, err
    if (contact) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('crew').update(payload).eq('id', contact.id).select().single())
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data, error: err } = await (supabase as any).from('crew').insert({ vessel_id: vesselId, ...payload }).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as Contact)
  }

  async function remove() {
    if (!contact || !confirm(`Delete ${contact.name}?`)) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('crew').delete().eq('id', contact.id)
    onDeleted(contact.id)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const field = (label: string, input: React.ReactNode) => (
    <div><label className="block text-[11px] text-[var(--color-text-secondary)] mb-[3px]">{label}</label>{input}</div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[440px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{contact ? 'Edit contact' : 'Add contact'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="space-y-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            {field('Name *', <input type="text" value={name} onChange={e => setName(e.target.value)} className={cls} />)}
            {field('Role',
              <select value={role} onChange={e => setRole(e.target.value)} className={cls}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {field('Phone', <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1…" className={cls} />)}
            {field('Email', <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={cls} />)}
          </div>
          {field('Specialty / company', <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Volvo Penta dealer" className={cls} />)}
          {field('Notes', <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${cls} resize-y`} />)}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {contact
              ? <button type="button" onClick={remove} className="text-[12px] text-[#A32D2D] hover:underline inline-flex items-center gap-1"><i className="ti ti-trash text-[13px]" /> Delete</button>
              : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
                <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
