import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KTV Buddy',
  description: 'Local Chinese Lyrics Manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className={`${inter.className} antialiased h-full text-zinc-100`}>
        <Sidebar />
        <main className="md:pl-64 h-full min-h-screen pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  )
}
