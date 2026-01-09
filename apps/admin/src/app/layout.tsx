import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import { Navigation } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Playables Admin',
  description: 'Internal platform for Interactive Ads analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 32px' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
