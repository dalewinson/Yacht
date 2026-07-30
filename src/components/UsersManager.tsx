'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sha256Hex } from '@/lib/auth'

type Role = 'admin' | 'owner' | 'crew'
export type ManagedUser = { id: string; name: string; role: Role; active: boolean; created_at: string; vesselIds: string[] }
type VesselLite = { id: string; name: string }

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', owner: 'Owner', crew: 'Crew' }

export default function UsersManager({ users: initial, vessels }: { users: ManagedUser[]; vessels: VesselLite[] }) {
  const [users, setUsers] = useState<ManagedUser[]>(initial)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [adding, setAdding] = useState(false)
  const router = useRouter()
  const vesselName = (id: string) => vessels.find(v => v.id === id)?.name ?? '—'

  function onSaved(u: ManagedUser) {
    setUsers(prev => prev.some(x => x.id === u.id) ? prev.map(x => x.id === u.id ? u : x) : [...prev, u])
    setEditing(null); setAdding(false)
    router.refresh()
  }
  async function remove(u: ManagedUser) {
    if (!confirm(`Remove ${u.name}'s access? They will no longer be able to log in.`)) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('app_users').delete().eq('id', u.id)
    setUsers(prev => prev.filter(x => x.id !== u.id))
    router.refresh()
  }

  return (
    <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Owner &amp; crew access</h2>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-2.5 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C]">
          <i className="ti ti-plus text-[12px]" /> Add person
        </button>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] mb-3">
        Each person logs in with their passcode and sees only the boat(s) you assign. Admins see everything.
      </p>

      {users.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-tertiary)]">No people added yet. You still have your admin password.</p>
      ) : (
        <div className="divide-y divide-[var(--color-border-tertiary)]">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                  {u.name}
                  <span className="text-[10px] font-normal px-1.5 py-[1px] rounded-[var(--border-radius-md)] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]">{ROLE_LABEL[u.role]}</span>
                  {!u.active && <span className="text-[10px] font-normal px-1.5 py-[1px] rounded-[var(--border-radius-md)] bg-[#FBE6E6] text-[#A32D2D]">Disabled</span>}
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                  {u.role === 'admin' ? 'All boats' : (u.vesselIds.length ? u.vesselIds.map(vesselName).join(', ') : 'No boats assigned')}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setEditing(u)} className="text-[12px] text-[#185FA5] hover:underline">Edit</button>
                <button onClick={() => remove(u)} className="text-[12px] text-[#A32D2D] hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <UserModal user={editing} vessels={vessels} existingUsers={users} onClose={() => { setAdding(false); setEditing(null) }} onSaved={onSaved} />
      )}
    </div>
  )
}

function UserModal({ user, vessels, existingUsers, onClose, onSaved }: {
  user: ManagedUser | null
  vessels: VesselLite[]
  existingUsers: ManagedUser[]
  onClose: () => void
  onSaved: (u: ManagedUser) => void
}) {
  const [name, setName]       = useState(user?.name ?? '')
  const [role, setRole]       = useState<Role>(user?.role ?? 'owner')
  const [passcode, setPass]   = useState('')
  const [active, setActive]   = useState(user?.active ?? true)
  const [vesselIds, setVesselIds] = useState<string[]>(user?.vesselIds ?? [])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function toggleVessel(id: string) {
    setVesselIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!user && !passcode.trim()) { setError('Set a passcode for this person.'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    // Hash the passcode if one was entered (blank on edit = keep existing).
    let passcodeHash: string | null = null
    if (passcode.trim()) {
      passcodeHash = await sha256Hex(passcode.trim())
      // Passcodes must be unique so login can identify the person.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clash } = await (supabase as any).from('app_users').select('id').eq('passcode_hash', passcodeHash)
      const conflict = ((clash ?? []) as { id: string }[]).some(c => c.id !== user?.id)
      if (conflict) { setError('That passcode is already in use — pick another.'); setSaving(false); return }
    }

    let saved: ManagedUser
    if (user) {
      const patch: Record<string, unknown> = { name: name.trim(), role, active }
      if (passcodeHash) patch.passcode_hash = passcodeHash
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e1 } = await (supabase as any).from('app_users').update(patch).eq('id', user.id)
      if (e1) { setError(e1.message); setSaving(false); return }
      saved = { ...user, name: name.trim(), role, active }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e1 } = await (supabase as any).from('app_users')
        .insert({ name: name.trim(), role, active, passcode_hash: passcodeHash }).select().single()
      if (e1 || !data) { setError(e1?.message ?? 'Could not save.'); setSaving(false); return }
      saved = { id: data.id, name: data.name, role: data.role, active: data.active, created_at: data.created_at, vesselIds: [] }
    }

    // Replace this user's vessel assignments (admins are all-access, so none stored).
    const ids = role === 'admin' ? [] : vesselIds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('user_vessels').delete().eq('user_id', saved.id)
    if (ids.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('user_vessels').insert(ids.map(vid => ({ user_id: saved.id, vessel_id: vid })))
    }
    saved.vesselIds = ids
    setSaving(false)
    onSaved(saved)
  }

  const cls = "w-full px-[9px] py-[6px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
  const lbl = "block text-[11px] text-[var(--color-text-secondary)] mb-[3px]"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 p-4">
      <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] w-full max-w-[420px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{user ? 'Edit person' : 'Add person'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-[10px]">
          <div><label className={lbl}>Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={cls} /></div>
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className={lbl}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)} className={cls}>
                <option value="owner">Owner</option>
                <option value="crew">Crew</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Passcode {user && <span className="text-[var(--color-text-tertiary)]">(blank = keep)</span>}</label>
              <input type="text" value={passcode} onChange={e => setPass(e.target.value)} placeholder={user ? '••••••' : 'e.g. patron123'} className={cls} />
            </div>
          </div>

          {role !== 'admin' && (
            <div>
              <label className={lbl}>Boats they can access</label>
              <div className="border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-md)] p-2 max-h-[160px] overflow-y-auto space-y-1">
                {vessels.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">No boats yet.</p>
                ) : vessels.map(v => (
                  <label key={v.id} className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer">
                    <input type="checkbox" checked={vesselIds.includes(v.id)} onChange={() => toggleVessel(v.id)} />
                    {v.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {user && (
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)] cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active (can log in)
            </label>
          )}

          {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-[5px] text-[12px] border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-background-secondary)]">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] bg-[#185FA5] text-white rounded-[var(--border-radius-md)] hover:bg-[#0C447C] disabled:opacity-50">
              <i className="ti ti-device-floppy text-[13px]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
