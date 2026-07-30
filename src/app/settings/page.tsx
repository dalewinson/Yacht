import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVesselContext } from '@/lib/vessel'
import SettingsClient from '@/components/SettingsClient'
import CategoriesManager from '@/components/CategoriesManager'
import DueSoonSettings from '@/components/DueSoonSettings'
import UsersManager, { type ManagedUser } from '@/components/UsersManager'
import { getDueSoon } from '@/lib/settings'
import type { Database } from '@/types/database'

type Vessel = Database['public']['Tables']['vessels']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export default async function SettingsPage() {
  const supabase = await createClient()
  const { activeId, vessels, role } = await getVesselContext()

  // Settings is admin-only; owners/crew are sent to the dashboard.
  if (role !== 'admin') redirect('/')

  let vessel: Vessel | null = null
  if (activeId) {
    const { data } = await supabase.from('vessels').select('*').eq('id', activeId).single()
    vessel = (data ?? null) as Vessel | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catsRaw } = await (supabase as any).from('categories').select('*').order('sort_order')
  const categories = (catsRaw ?? []) as Category[]
  const dueSoon = await getDueSoon()

  // Admin-only: load users + their vessel assignments for the access manager.
  let users: ManagedUser[] = []
  if (role === 'admin') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: usersRaw }, { data: uvRaw }] = await Promise.all([
      (supabase as any).from('app_users').select('id, name, role, active, created_at').order('created_at'),
      (supabase as any).from('user_vessels').select('user_id, vessel_id'),
    ])
    const byUser: Record<string, string[]> = {}
    for (const r of (uvRaw ?? []) as { user_id: string; vessel_id: string }[]) (byUser[r.user_id] ??= []).push(r.vessel_id)
    users = ((usersRaw ?? []) as Omit<ManagedUser, 'vesselIds'>[]).map(u => ({ ...u, vesselIds: byUser[u.id] ?? [] }))
  }

  return (
    <div className="p-6 max-w-[640px] mx-auto space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Manage the current boat&apos;s details and lists.</p>
      </div>
      <SettingsClient vessel={vessel} vesselCount={vessels.length} />
      <DueSoonSettings days={dueSoon.days} hours={dueSoon.hours} />
      <CategoriesManager categories={categories} />
      {role === 'admin' && <UsersManager users={users} vessels={vessels.map(v => ({ id: v.id, name: v.name }))} />}
    </div>
  )
}
