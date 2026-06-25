'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type EquipmentLite = { id: string; name: string }
export type ContactLite = { id: string; name: string; phone: string | null }

// Lightweight client-side fetch of the active vessel's equipment (id + name),
// for pickers in modals that don't already receive the list as props.
export function useVesselEquipment(vesselId: string | null) {
  const [equipment, setEquipment] = useState<EquipmentLite[]>([])
  useEffect(() => {
    if (!vesselId) return
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from('equipment')
        .select('id,name')
        .eq('vessel_id', vesselId)
        .order('name')
      setEquipment((data ?? []) as EquipmentLite[])
    })()
  }, [vesselId])
  return equipment
}

// Same, for the active vessel's contacts (crew) — used by the ticket reporter picker.
export function useVesselContacts(vesselId: string | null) {
  const [contacts, setContacts] = useState<ContactLite[]>([])
  useEffect(() => {
    if (!vesselId) return
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from('crew')
        .select('id,name,phone')
        .eq('vessel_id', vesselId)
        .order('name')
      setContacts((data ?? []) as ContactLite[])
    })()
  }, [vesselId])
  return contacts
}
