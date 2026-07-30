// Client-safe vessel constants/types (no server-only imports).
export type VesselLite = { id: string; name: string; logo_url?: string | null }

export const ACTIVE_VESSEL_COOKIE = 'active_vessel'
