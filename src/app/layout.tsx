import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import { getVesselContext } from '@/lib/vessel'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fairwinds — Yacht Maintenance',
  description: 'Yacht maintenance tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { vessels, activeId } = await getVesselContext()

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className={`${geist.className} h-screen overflow-hidden`} suppressHydrationWarning>
        <div className="h-full bg-[var(--color-background-tertiary)]">
          <AppShell vessels={vessels} activeId={activeId}>
            {children}
          </AppShell>
        </div>
      </body>
    </html>
  )
}
