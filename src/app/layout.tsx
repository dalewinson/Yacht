import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { CategoriesProvider } from '@/components/CategoriesProvider'
import { SettingsProvider } from '@/components/SettingsProvider'
import { getVesselContext } from '@/lib/vessel'
import { getDueSoon } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fairwinds — Yacht Maintenance',
  description: 'Yacht maintenance tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { vessels, activeId } = await getVesselContext()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catsRaw } = await (supabase as any).from('categories').select('kind, name').order('sort_order')
  const cats = (catsRaw ?? []) as { kind: 'equipment' | 'contact'; name: string }[]
  const categories = {
    equipment: cats.filter(c => c.kind === 'equipment').map(c => c.name),
    contact: cats.filter(c => c.kind === 'contact').map(c => c.name),
  }
  const dueSoon = await getDueSoon()

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className={`${geist.className} h-screen overflow-hidden`} suppressHydrationWarning>
        <div className="h-full bg-[var(--color-background-tertiary)]">
          <CategoriesProvider value={categories}>
            <SettingsProvider value={dueSoon}>
              <AppShell vessels={vessels} activeId={activeId}>
                {children}
              </AppShell>
            </SettingsProvider>
          </CategoriesProvider>
        </div>
      </body>
    </html>
  )
}
