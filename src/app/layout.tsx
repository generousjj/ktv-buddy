import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KTV Buddy',
  description: 'Local Chinese Lyrics Manager',
}

import { LanguageProvider } from '@/lib/i18n'
import { SpotifyProvider } from '@/hooks/useSpotify'

// ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-zinc-950" suppressHydrationWarning>
      <body className={`${inter.className} antialiased h-full text-zinc-100`} suppressHydrationWarning>
        <LanguageProvider>
          <SpotifyProvider>
            {children}
          </SpotifyProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
