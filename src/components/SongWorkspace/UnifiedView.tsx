'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { clsx } from 'clsx'
import { cn } from '@/lib/utils'
import { Play, Pause, Save, RotateCcw, SkipBack, SkipForward, Search, Music, Bookmark } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

// Util to parse LRC
function parseLrc(lrc: string) {
    const lines = lrc.split('\n')
    const result: { time: number, text: string }[] = []

    for (const line of lines) {
        // Matches [mm:ss.xx], [m:ss.xxx], [mm:ss], etc.
        const match = line.match(/^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/)
        if (match) {
            const min = parseInt(match[1])
            const sec = parseInt(match[2])
            const msStr = match[3] || '0'
            // ms could be 2 digits (centiseconds) or 3 (milliseconds)
            // standard LRC uses centiseconds (xx), so .50 = 500ms
            // but we treat it simply: .xx -> 0.xx, .xxx -> 0.xxx
            const ms = parseFloat('0.' + msStr)

            const text = match[4].trim()
            if (text) { // Only add if there is text? OR maybe we allow empty lines for spacing
                result.push({
                    time: min * 60 + sec + ms,
                    text
                })
            }
        }
    }
    return result
}

interface UnifiedViewProps {
    hanzi: string[]
    pinyin: string[]
    english: string[]
    lrcJson?: string | null
    audioUrl?: string | null
    onAudioUrlSave?: (url: string) => void
    isGenerating?: boolean
    externalTime?: number
    isExternalPlaying?: boolean
    onSpotifyControl?: (action: 'play' | 'pause' | 'seek' | 'next' | 'previous', value?: any) => void
    externalDuration?: number
    onSearchSpotify?: (query: string) => Promise<any[]>
    onPlayTrack?: (uri: string) => Promise<{ success: boolean; error?: string }>
    onSave?: () => void
    isTemp?: boolean
}

export function UnifiedView({ hanzi, pinyin, english, lrcJson, audioUrl, onAudioUrlSave, isGenerating, externalTime, isExternalPlaying, onSpotifyControl, externalDuration, onSearchSpotify, onPlayTrack, onSave, isTemp }: UnifiedViewProps) {
    const { t } = useLanguage()
    const [activeIndex, setActiveIndex] = useState(0)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [playerMounted, setPlayerMounted] = useState(false)
    const startTimeRef = useRef<number>(0)
    const manualSeekLockRef = useRef<number>(0) // Timestamp of last manual seek

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [showSearch, setShowSearch] = useState(false)

    // Sync external time
    useEffect(() => {
        if (typeof externalTime === 'number') {
            setCurrentTime(externalTime)
        }
    }, [externalTime])

    // Sync external playing state
    useEffect(() => {
        if (typeof isExternalPlaying === 'boolean') {
            setPlaying(isExternalPlaying)
        }
    }, [isExternalPlaying])

    // Parse Sync Info - memoize to prevent recalculation on every render

    const syncedLines = useMemo(() => {
        if (!lrcJson) return []
        const parsed = parseLrc(lrcJson)
        return parsed
    }, [lrcJson])
    const hasSync = syncedLines.length > 0

    // Calculate effective duration
    const effectiveDuration = externalDuration || duration || (hasSync && syncedLines.length > 0 ? syncedLines[syncedLines.length - 1].time + 10 : 0) || 0

    useEffect(() => {
        setPlayerMounted(true)
    }, [])

    // Jump to correct lyric position when lyrics first become available
    // This handles the case where Spotify is already playing mid-song when lyrics finish generating
    useEffect(() => {
        if (hanzi.length > 0 && hasSync && currentTime > 0) {
            const SYNC_OFFSET = 1.0
            const checkTime = currentTime + SYNC_OFFSET

            const index = syncedLines.findIndex((line, i) => {
                const nextLine = syncedLines[i + 1]
                if (!nextLine) return checkTime >= line.time
                return checkTime >= line.time && checkTime < nextLine.time
            })

            if (index !== -1 && index !== activeIndex) {
                setActiveIndex(index)
            }
        }
    }, [hanzi.length, hasSync]) // Only run when lyrics become available

    // Auto-Scroll Active Item (within container to preserve header)
    useEffect(() => {
        if (activeIndex >= 0 && itemRefs.current[activeIndex] && scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const item = itemRefs.current[activeIndex]
            if (item) {
                const containerRect = container.getBoundingClientRect()
                const itemRect = item.getBoundingClientRect()

                // Calculate scroll position to center the item in the container
                const itemCenter = itemRect.top + itemRect.height / 2
                const containerCenter = containerRect.top + containerRect.height / 2
                const scrollOffset = itemCenter - containerCenter

                container.scrollBy({
                    top: scrollOffset,
                    behavior: 'smooth'
                })
            }
        }
    }, [activeIndex])

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
            if (e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault()
                // Spotify Control via Spacebar? Maybe later.
                setActiveIndex(prev => Math.min(prev + 1, hanzi.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex(prev => Math.max(prev - 1, 0))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [hanzi.length])

    // Sync Logic
    useEffect(() => {
        if (hasSync && playing) {
            // Skip sync if user manually seeked within last 1.5 seconds
            const timeSinceManualSeek = Date.now() - manualSeekLockRef.current
            if (timeSinceManualSeek < 1500) return

            const SYNC_OFFSET = 1.0 // Adjusted for Spotify delay
            const checkTime = currentTime + SYNC_OFFSET

            const index = syncedLines.findIndex((line, i) => {
                const nextLine = syncedLines[i + 1]
                if (!nextLine) return checkTime >= line.time
                return checkTime >= line.time && checkTime < nextLine.time
            })

            if (index !== -1 && index !== activeIndex) {
                // Prevent flickering: only go backwards if time significantly changed (>2 seconds)
                if (index < activeIndex) {
                    const timeDiff = syncedLines[activeIndex]?.time - checkTime
                    if (timeDiff > 2) {
                        setActiveIndex(index)
                    }
                } else {
                    setActiveIndex(index)
                }
            }
        }
    }, [currentTime, hasSync, playing, syncedLines, activeIndex])

    // Handle Seek
    const handleSeek = (index: number) => {
        // Lock sync for 1.5 seconds to prevent jumping back
        manualSeekLockRef.current = Date.now()

        setActiveIndex(index)
        if (hasSync && syncedLines[index]) {
            const time = syncedLines[index].time
            setCurrentTime(time)
            startTimeRef.current = Date.now() - time * 1000

            if (onSpotifyControl) {
                onSpotifyControl('seek', Math.floor(time * 1000)) // Spotify uses ms
            } else if (playerRef.current?.seekTo) {
                playerRef.current.seekTo(time)
            }

            if (!playing) {
                if (onSpotifyControl) onSpotifyControl('play')
                setPlaying(true)
            }
        }
    }

    // Handle Previous - Spotify-like behavior
    // If > 3 seconds into song, restart current song
    // If < 3 seconds, go to previous track
    const handlePrevious = () => {
        if (!onSpotifyControl) return

        if (currentTime > 3) {
            // Restart current song
            onSpotifyControl('seek', 0)
            setCurrentTime(0)
            setActiveIndex(0)
            startTimeRef.current = Date.now()
        } else {
            // Go to previous track
            onSpotifyControl('previous')
        }
    }

    // Timer for manual playback
    useEffect(() => {
        let interval: NodeJS.Timeout
        // Only run timer if NOT using external time (Spotify)
        if (playing && externalTime === undefined) {
            startTimeRef.current = Date.now() - currentTime * 1000
            interval = setInterval(() => {
                const now = Date.now()
                let elapsed = (now - startTimeRef.current) / 1000
                if (effectiveDuration > 0 && elapsed >= effectiveDuration) {
                    elapsed = effectiveDuration
                    setPlaying(false)
                }
                setCurrentTime(elapsed)
            }, 30)
        }
        return () => clearInterval(interval)
    }, [playing, effectiveDuration, externalTime])

    // Loading State - but in Spotify mode, still show player
    const waitingForPinyin = isGenerating && (!pinyin[0] || pinyin[0] === '')
    if (waitingForPinyin) {
        // In Spotify mode, show loading + player
        if (onSpotifyControl) {
            return (
                <div className="h-full flex flex-col relative bg-zinc-950 isolate">
                    {/* Centered Loading */}
                    <div className="flex-1 flex flex-col items-center justify-center text-emerald-500 gap-4">
                        <div className="relative w-16 h-16">
                            <span className="absolute inset-0 border-4 border-zinc-800 rounded-full"></span>
                            <span className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                        </div>
                        <p className="font-mono text-sm animate-pulse">Generating Pinyin...</p>
                    </div>

                    {/* Player Bar - still functional */}
                    <div className="fixed bottom-16 md:bottom-0 right-0 left-0 md:left-64 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4 md:pb-safe z-[100] transition-all">
                        <div className="max-w-2xl mx-auto flex items-center gap-3">
                            <button onClick={handlePrevious} className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer">
                                <SkipBack className="w-4 h-4 fill-current" />
                            </button>
                            <button
                                onClick={() => { playing ? onSpotifyControl('pause') : onSpotifyControl('play'); setPlaying(!playing) }}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                            >
                                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>
                            <button onClick={() => onSpotifyControl('next')} className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer">
                                <SkipForward className="w-4 h-4 fill-current" />
                            </button>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                                    <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                                    <span className="text-emerald-500 animate-pulse text-[10px] uppercase tracking-widest">Loading...</span>
                                    <span>{new Date((effectiveDuration || currentTime) * 1000).toISOString().substr(14, 5)}</span>
                                </div>
                                <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-100 ease-linear rounded-full" style={{ width: `${Math.min(100, (currentTime / (effectiveDuration || 240)) * 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // Non-Spotify: original loading
        return (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-emerald-500 gap-4">
                <div className="relative w-16 h-16">
                    <span className="absolute inset-0 border-4 border-zinc-800 rounded-full"></span>
                    <span className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                </div>
                <p className="font-mono text-sm animate-pulse">Generating Pinyin...</p>
            </div>
        )
    }

    // Empty State - but in Spotify mode, still show player
    if (hanzi.length === 0 && !isGenerating) {
        // In Spotify mode, show message + player
        if (onSpotifyControl) {
            return (
                <div className="h-full flex flex-col relative bg-zinc-950 isolate">
                    {/* Centered Message */}
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-6 p-8 text-center">
                        <div className="space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-full bg-zinc-900 flex items-center justify-center">
                                <Music className="w-8 h-8 text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Lyrics Aren't Available</h3>
                            <p className="text-sm max-w-md text-zinc-500">
                                We couldn't find lyrics for this song. You can still enjoy the music!
                            </p>
                        </div>
                        <button
                            onClick={() => onAudioUrlSave?.('_RETRY_')}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>

                    {/* Player Bar - still functional */}
                    <div className="fixed bottom-16 md:bottom-0 right-0 left-0 md:left-64 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4 md:pb-safe z-[100] transition-all">
                        <div className="max-w-2xl mx-auto flex items-center gap-3">
                            {/* Previous */}
                            <button
                                onClick={handlePrevious}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                <SkipBack className="w-4 h-4 fill-current" />
                            </button>

                            {/* Play/Pause */}
                            <button
                                onClick={() => {
                                    if (playing) onSpotifyControl('pause')
                                    else onSpotifyControl('play')
                                    setPlaying(!playing)
                                }}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                            >
                                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>

                            {/* Next */}
                            <button
                                onClick={() => onSpotifyControl('next')}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                <SkipForward className="w-4 h-4 fill-current" />
                            </button>

                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                                    <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                                    <span className="text-zinc-600">No Lyrics</span>
                                    <span>{new Date((effectiveDuration || currentTime) * 1000).toISOString().substr(14, 5)}</span>
                                </div>
                                <div
                                    className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group hover:h-2 transition-all"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const percent = (e.clientX - rect.left) / rect.width
                                        const newTime = percent * (effectiveDuration || 240)
                                        setCurrentTime(newTime)
                                        onSpotifyControl('seek', Math.floor(newTime * 1000))
                                    }}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
                                        style={{ width: `${Math.min(100, (currentTime / (effectiveDuration || 240)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // Non-Spotify mode: original behavior
        return (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-6 p-8 text-center">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">No Lyrics Found</h3>
                    <p className="text-sm max-w-md">
                        We tried to auto-generate lyrics for this song but couldn't find them yet.
                    </p>
                </div>
                <button
                    onClick={() => onAudioUrlSave?.('_RETRY_')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                    <RotateCcw className="w-5 h-5" />
                    Retry Auto-Generation
                </button>
            </div>
        )
    }

    // Show Player Condition
    const showPlayer = hasSync || !!onSpotifyControl
    // Allow manual seek even if no sync, if we have spotify control?
    // If no sync, handleSeek(index) won't work well because index doesn't map to time.
    // But the BOTTOM PROGRESS BAR is based on time.

    return (
        <div className="h-full flex flex-col relative bg-zinc-950 isolate">
            {/* List Container */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-20 pb-48 scroll-smooth select-none">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Introduction Indicator */}
                    {/* Lyric Source Indicator */}
                    {hanzi.length > 0 && (
                        <div className="text-center mb-6 flex items-center justify-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                                {hasSync ? '● Synced Lyrics' : '○ Lyrics'} from LRCLIB
                            </span>
                        </div>
                    )}

                    {hasSync && playing && syncedLines[0] && currentTime < syncedLines[0].time && (
                        <div className="text-center mb-4">
                            <span className="inline-block font-mono text-sm tracking-widest uppercase px-4 py-2 rounded-full bg-gradient-to-r from-emerald-900/50 via-emerald-700/50 to-emerald-900/50 text-emerald-300 animate-shimmer bg-[length:200%_100%]" style={{ animation: 'shimmer 2s ease-in-out infinite' }}>
                                ✨ {t('unified.intro')}
                            </span>
                            <style jsx>{`
                                @keyframes shimmer {
                                    0% { background-position: 200% 0; }
                                    100% { background-position: -200% 0; }
                                }
                            `}</style>
                        </div>
                    )}
                    {hanzi.map((line, i) => {
                        const isActive = i === activeIndex
                        const isEnglishLoading = isGenerating && (!english[i] || english[i] === '')

                        return (
                            <div
                                key={i}
                                ref={el => { itemRefs.current[i] = el }}
                                onClick={() => handleSeek(i)}
                                className={cn(
                                    "cursor-pointer transition-all duration-300 rounded-xl p-6 border-2",
                                    isActive
                                        ? "bg-zinc-900 border-emerald-500/50 scale-105 shadow-2xl shadow-black ring-1 ring-emerald-500/20"
                                        : "bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-zinc-900/30"
                                )}
                            >
                                <div className="space-y-2 text-center">
                                    {(() => {
                                        const pinyinText = pinyin[i] || ''
                                        const isFallbackPinyin = pinyinText.endsWith('*')
                                        const displayPinyin = isFallbackPinyin ? pinyinText.slice(0, -1) : pinyinText
                                        return (
                                            <p className={cn(
                                                "font-mono text-emerald-400 transition-all",
                                                isActive ? "text-base md:text-lg opacity-100" : "text-xs md:text-sm opacity-70",
                                                isGenerating && "animate-pulse-soft",
                                                isFallbackPinyin && "italic opacity-80"
                                            )}>
                                                {displayPinyin || '\u00A0'}
                                            </p>
                                        )
                                    })()}
                                    <h3 className={cn(
                                        "font-bold text-white transition-all leading-relaxed",
                                        isActive ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"
                                    )}>
                                        {line || '\u00A0'}
                                    </h3>
                                    {(() => {
                                        const englishText = english[i] || ''
                                        const isFallbackEnglish = englishText.endsWith('*')
                                        const displayEnglish = isFallbackEnglish ? englishText.slice(0, -1) : englishText
                                        return (
                                            <p className={cn(
                                                "text-zinc-400 transition-all font-light",
                                                isActive ? "text-lg md:text-xl" : "text-sm md:text-base",
                                                isEnglishLoading && "text-emerald-500/50 text-sm animate-pulse-soft",
                                                isGenerating && !isEnglishLoading && "animate-pulse-soft",
                                                isFallbackEnglish && "italic opacity-80"
                                            )}>
                                                {isEnglishLoading ? 'Translating...' : (displayEnglish || '\u00A0')}
                                            </p>
                                        )
                                    })()}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Floating Action / Player Bar */}
            {
                showPlayer && (
                    <div className="fixed bottom-16 md:bottom-0 right-0 left-0 md:left-64 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4 md:pb-safe z-[100] transition-all">
                        <div className="max-w-2xl mx-auto flex items-center gap-3">
                            {/* Previous Button (Spotify Only) */}
                            {onSpotifyControl && (
                                <button
                                    onClick={handlePrevious}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                                >
                                    <SkipBack className="w-4 h-4 fill-current" />
                                </button>
                            )}

                            {/* Play/Pause */}
                            <button
                                onClick={() => {
                                    if (onSpotifyControl) {
                                        if (playing) onSpotifyControl('pause')
                                        else onSpotifyControl('play')
                                        setPlaying(!playing) // Optimistic
                                    } else {
                                        setPlaying(!playing)
                                    }
                                }}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                            >
                                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>

                            {/* Next Button (Spotify Only) */}
                            {onSpotifyControl && (
                                <button
                                    onClick={() => onSpotifyControl('next')}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                                >
                                    <SkipForward className="w-4 h-4 fill-current" />
                                </button>
                            )}

                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                                    <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>

                                    {onSpotifyControl && !hasSync && (
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                                            No Sync Available
                                        </span>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <span>
                                            {new Date((effectiveDuration || currentTime) * 1000).toISOString().substr(14, 5)}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div
                                    className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group hover:h-2 transition-all"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const percent = (e.clientX - rect.left) / rect.width
                                        const newTime = percent * (effectiveDuration || 240)

                                        setCurrentTime(newTime)
                                        startTimeRef.current = Date.now() - newTime * 1000

                                        if (onSpotifyControl) {
                                            onSpotifyControl('seek', Math.floor(newTime * 1000))
                                        } else if (playerRef.current?.seekTo) {
                                            playerRef.current.seekTo(newTime)
                                        }
                                    }}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
                                        style={{ width: `${Math.min(100, (currentTime / (effectiveDuration || 240)) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Bookmark / Save to Library */}
                            {onSave && (
                                <button
                                    onClick={isTemp ? onSave : undefined}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                        isTemp
                                            ? "text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 cursor-pointer"
                                            : "text-emerald-400 cursor-default"
                                    )}
                                    title={isTemp ? "Save to My Songs" : "Saved to My Songs"}
                                >
                                    <Bookmark className={cn("w-4 h-4", !isTemp && "fill-current")} />
                                </button>
                            )}

                            {/* Search Toggle (Spotify Only) */}
                            {onSearchSpotify && (
                                <button
                                    onClick={() => setShowSearch(!showSearch)}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer",
                                        showSearch ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    )}
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Search Dropdown */}
                        {showSearch && onSearchSpotify && (
                            <div className="max-w-2xl mx-auto mt-3 pt-3 border-t border-zinc-800">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter' && searchQuery.trim()) {
                                                const results = await onSearchSpotify(searchQuery)
                                                setSearchResults(results)
                                            }
                                        }}
                                        placeholder="Search Spotify..."
                                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (searchQuery.trim()) {
                                                const results = await onSearchSpotify(searchQuery)
                                                setSearchResults(results)
                                            }
                                        }}
                                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 cursor-pointer"
                                    >
                                        Search
                                    </button>
                                </div>

                                {/* Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                        {searchResults.map((track: any) => (
                                            <button
                                                key={track.id}
                                                onClick={async () => {
                                                    if (onPlayTrack) {
                                                        await onPlayTrack(track.uri)
                                                        setShowSearch(false)
                                                        setSearchQuery('')
                                                        setSearchResults([])
                                                    }
                                                }}
                                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                                            >
                                                {track.album?.images?.[2]?.url && (
                                                    <img src={track.album.images[2].url} alt="" className="w-10 h-10 rounded" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{track.name}</p>
                                                    <p className="text-zinc-500 text-xs truncate">{track.artists?.[0]?.name}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    )
}
