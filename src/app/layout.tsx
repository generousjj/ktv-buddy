import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://ktvbuddy.com'),
  title: 'KTV Buddy - Master Chinese Songs with Pinyin & Translations',
  description: 'Transform any Chinese song into an interactive karaoke experience. Get instant Pinyin romanization, English translations, and Spotify sync. Perfect for learning Mandarin through music.',
  keywords: ['KTV', 'Chinese karaoke', 'Pinyin', 'Chinese lyrics', 'learn Mandarin', 'Chinese songs', 'Spotify sync', 'karaoke practice', 'Chinese music', 'language learning'],
  authors: [{ name: 'KTV Buddy' }],
  creator: 'KTV Buddy',
  publisher: 'KTV Buddy',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ktvbuddy.com',
    siteName: 'KTV Buddy',
    title: 'KTV Buddy - Master Chinese Songs with Pinyin & Translations',
    description: 'Transform any Chinese song into an interactive karaoke experience. Get instant Pinyin romanization, English translations, and Spotify sync.',
    images: [
      {
        url: '/ktv-buddy.png',
        width: 512,
        height: 512,
        alt: 'KTV Buddy - Your Chinese Karaoke Companion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KTV Buddy - Master Chinese Songs with Pinyin & Translations',
    description: 'Transform any Chinese song into an interactive karaoke experience. Get instant Pinyin romanization, English translations, and Spotify sync.',
    images: ['/ktv-buddy.png'],
    creator: '@ktvbuddy',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://ktvbuddy.com',
  },
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
