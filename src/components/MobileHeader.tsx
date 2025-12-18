'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

import { SpotifyControl } from '@/components/SpotifyControl'
import { useSpotify } from '@/hooks/useSpotify'

export function MobileHeader() {
    const { t } = useLanguage()
    const { spotifyState, login, logout, isSpotifyMode, setSpotifyMode } = useSpotify()
    const pathname = usePathname()

    // Hide on song pages - the SongWorkspace has its own header
    if (pathname?.includes('/song/')) {
        return null
    }

    return (
        <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
            <Link href="/" className="flex items-center gap-2">
                <Music className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-lg tracking-tight text-white">{t('app.title')}</span>
            </Link>

            <SpotifyControl
                spotifyState={spotifyState}
                onLogin={login}
                onLogout={logout}
                isSpotifyMode={isSpotifyMode}
                onToggleMode={setSpotifyMode}
            />
        </div>
    )
}
