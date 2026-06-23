'use client'

import { createContext, useContext } from 'react'

export type DueSoon = { days: number; hours: number }

const SettingsContext = createContext<DueSoon>({ days: 14, hours: 15 })

export function SettingsProvider({ value, children }: { value: DueSoon; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useDueSoon() {
  return useContext(SettingsContext)
}
