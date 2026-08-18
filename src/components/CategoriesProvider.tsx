'use client'

import { createContext, useContext } from 'react'

type Cats = { equipment: string[]; contact: string[]; area: string[] }

const CategoriesContext = createContext<Cats>({ equipment: [], contact: [], area: [] })

export function CategoriesProvider({ value, children }: { value: Cats; children: React.ReactNode }) {
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useEquipmentCategories() {
  return useContext(CategoriesContext).equipment
}
export function useContactRoles() {
  return useContext(CategoriesContext).contact
}
export function useAreas() {
  return useContext(CategoriesContext).area
}
