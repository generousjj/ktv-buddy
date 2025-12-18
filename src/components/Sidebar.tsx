'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Library, PlusCircle, Settings, Music, Search, Loader2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/lib/i18n'
import { useSpotify } from '@/hooks/useSpotify'
import { SpotifyControl } from './SpotifyControl'
import { SongStore } from '@/lib/store'
import { findBestMatch } from '@/lib/matching'

export function Sidebar() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const router = useRouter()
    const { spotifyState, isSpotifyMode, login, logout, setSpotifyMode, searchSpotify, playTrack } = useSpotify()

    // Spotify search state
    const [spotifyQuery, setSpotifyQuery] = useState('')
    const [spotifyResults, setSpotifyResults] = useState<any[]>([])
    const [spotifySearching, setSpotifySearching] = useState(false)
    const [spotifyError, setSpotifyError] = useState<string | null>(null)

    const navItems = [
        { href: '/app', label: t('nav.library'), icon: Library },
        { href: '/app/new', label: t('nav.newSong'), icon: PlusCircle },
    ]

    const isActive = (href: string) => {
        if (href === '/app') return pathname === '/app'
        return pathname.startsWith(href)
    }

    const handleSpotifySearch = async () => {
        if (!spotifyQuery.trim()) return
        setSpotifySearching(true)
        setSpotifyError(null)
        try {
            const results = await searchSpotify(spotifyQuery)
            setSpotifyResults(results)
        } catch (e) {
            setSpotifyError('Search failed')
        }
        setSpotifySearching(false)
    }

    const handlePlayTrack = async (track: any) => {
        setSpotifyError(null)
        const result = await playTrack(track.uri)
        if (!result.success) {
            setSpotifyError(result.error || 'Failed to play')
        } else {
            setSpotifyResults([])
            setSpotifyQuery('')
            // Auto-enable Spotify mode when playing
            if (!isSpotifyMode) setSpotifyMode(true)
        }
    }

    // Global Spotify Sync for Redirects
    // Track when user intentionally leaves a song page
    const lastPathnameRef = useRef(pathname)
    const justLeftSongPageRef = useRef(false)

    useEffect(() => {
        // Detect if user just left a song page to go to library/new song page
        if (lastPathnameRef.current.startsWith('/app/song/') && !pathname.startsWith('/app/song/')) {
            justLeftSongPageRef.current = true
            // Turn off Spotify mode when leaving song pages to library/new
            setSpotifyMode(false)
            // Reset after 2 seconds
            setTimeout(() => { justLeftSongPageRef.current = false }, 2000)
        }
        lastPathnameRef.current = pathname
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]) // setSpotifyMode is stable from context

    useEffect(() => {
        if (!isSpotifyMode || !spotifyState.isConnected || !spotifyState.track || !spotifyState.isPlaying) return

        // Don't redirect back if user just intentionally left a song page
        if (justLeftSongPageRef.current) {
            console.log('[Spotify Global] User just left song page, skipping redirect')
            return
        }

        const spotifyTitle = spotifyState.track.name.trim()
        const spotifyArtist = spotifyState.track.artist
        const allSongs = SongStore.getAll()

        console.log(`[Spotify Global] Detecting: "${spotifyTitle}" by "${spotifyArtist}"`)

        // PRIORITY CHECK: If we are already on a song page, check if IT matches first
        // This prevents redirecting to a duplicate song entry, UNLESS the current one is empty and a better one exists
        if (pathname.startsWith('/app/song/')) {
            const currentId = pathname.split('/').pop()?.split('?')[0]
            if (currentId) {
                const currentSong = allSongs.find(s => s.id === currentId)
                if (currentSong) {
                    const directMatch = findBestMatch(spotifyTitle, [{ id: currentSong.id, title: currentSong.title }])
                    if (directMatch) {
                        // Only stay if current song has lyrics OR if we haven't found a better one yet (we haven't searched yet)
                        // Actually, let's search first then compare.
                        // But to simple fix: if current song has synced lyrics, DEFINITELY stay.
                        if (currentSong.lrcJson) {
                            return
                        }
                        return
                    }
                }
            }
        }

        console.log('[Spotify Global] No match found. Auto-creating new song:', spotifyTitle)
        const newSongId = crypto.randomUUID()
        const newSong = {
            id: newSongId,
            title: spotifyTitle,
            artist: spotifyArtist,
            hanzi: [], pinyin: [], english: [],
            createdAt: new Date().toISOString(),
            versionId: '1',
            lrcJson: null,
            audioUrl: null
        }
        SongStore.save(newSong)
        router.push(`/app/song/${newSongId}?autoGenerate=true`)
    }, [spotifyState, isSpotifyMode, pathname, router])

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-100 flex-col h-screen fixed left-0 top-0 z-50">
                <Link href="/" className="p-6 flex items-center gap-2 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <Music className="w-6 h-6 text-emerald-400" />
                    <h1 className="font-bold text-lg tracking-tight">{t('app.title')}</h1>
                </Link>
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-zinc-800 text-emerald-400'
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Spotify Search Section */}
                {spotifyState.isConnected && (
                    <div className="px-4 py-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Play on Spotify</p>
                        <div className="flex gap-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                <input
                                    type="text"
                                    value={spotifyQuery}
                                    onChange={(e) => setSpotifyQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                                    placeholder="Search..."
                                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <button
                                onClick={handleSpotifySearch}
                                disabled={spotifySearching}
                                className="px-2 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                            >
                                {spotifySearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
                            </button>
                        </div>

                        {/* Error Message */}
                        {spotifyError && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{spotifyError}</span>
                            </div>
                        )}

                        {/* Results */}
                        {spotifyResults.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                {spotifyResults.map((track: any) => (
                                    <button
                                        key={track.id}
                                        onClick={() => handlePlayTrack(track)}
                                        className="w-full flex items-center gap-2 p-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700 transition-colors cursor-pointer text-left"
                                    >
                                        {track.album?.images?.[2]?.url && (
                                            <img src={track.album.images[2].url} alt="" className="w-8 h-8 rounded" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white font-medium truncate">{track.name}</p>
                                            <p className="text-[10px] text-zinc-500 truncate">{track.artists?.[0]?.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-auto px-4 py-2 border-t border-zinc-800">
                    <SpotifyControl
                        spotifyState={spotifyState}
                        onLogin={login}
                        onLogout={logout}
                        isSpotifyMode={isSpotifyMode}
                        onToggleMode={setSpotifyMode}
                    />
                </div>
                <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
                    {t('app.title')} v0.1
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 z-50 flex items-center justify-around px-2 pb-safe">
                {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'flex flex-col items-center justify-center p-2 rounded-md transition-colors w-full',
                                active
                                    ? 'text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}
