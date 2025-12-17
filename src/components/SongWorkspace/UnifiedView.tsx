'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { clsx } from 'clsx'
import { cn } from '@/lib/utils'
import { Play, Pause, Save, RotateCcw } from 'lucide-react'
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
}

export function UnifiedView({ hanzi, pinyin, english, lrcJson, audioUrl, onAudioUrlSave }: UnifiedViewProps) {
    const { t } = useLanguage()
    const [activeIndex, setActiveIndex] = useState(0)

    // Debug
    useEffect(() => {
        console.log('[UnifiedView] AudioURL changed:', audioUrl)
    }, [audioUrl])

    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    // Player State
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [playerMounted, setPlayerMounted] = useState(false)
    const playerRef = useRef<any>(null)

    console.log('[UnifiedView] Render. Mounted:', playerMounted, 'AudioURL:', audioUrl)

    // Parse Sync Info
    const syncedLines = lrcJson ? parseLrc(lrcJson) : []
    const hasSync = syncedLines.length > 0

    // Local state for editing URL if not present
    const [newAudioUrl, setNewAudioUrl] = useState('')
    const [isEditingUrl, setIsEditingUrl] = useState(false)

    useEffect(() => {
        setPlayerMounted(true)
    }, [])

    // Auto-Scroll Active Item
    useEffect(() => {
        if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            })
        }
    }, [activeIndex])

    // Keyboard Navigation (Manual Mode)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
            if (e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault()
                setActiveIndex(prev => Math.min(prev + 1, hanzi.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex(prev => Math.max(prev - 1, 0))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [hanzi.length])

    // Sync Logic: Update Active Index based on Time
    useEffect(() => {
        if (hasSync && playing) {
            const index = syncedLines.findIndex((line, i) => {
                const nextLine = syncedLines[i + 1]
                if (!nextLine) return currentTime >= line.time
                return currentTime >= line.time && currentTime < nextLine.time
            })
            if (index !== -1 && index !== activeIndex) {
                setActiveIndex(index)
            }
        }
    }, [currentTime, hasSync, playing, syncedLines, activeIndex])

    // Player Helpers
    const handleSeek = (index: number) => {
        // Allow manual click to set active index always
        setActiveIndex(index)

        // If synced, also seek audio
        if (hasSync && syncedLines[index]) {
            const time = syncedLines[index].time
            setCurrentTime(time)

            if (playerRef.current?.seekTo) {
                playerRef.current.seekTo(time)
            }

            setPlaying(true)
        }
    }

    // Timer for manual playback (no audio source)
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (playing /* && !audioUrl */) {
            // Anchor the timer from the current moment relative to currentTime
            const start = Date.now() - currentTime * 1000
            interval = setInterval(() => {
                const now = Date.now()
                setCurrentTime((now - start) / 1000)
            }, 100)
        }
        return () => clearInterval(interval)
    }, [playing, audioUrl, currentTime])

    // ...

    return (
        <div className="h-full flex flex-col relative bg-zinc-950 isolate">
            {/* List Container */}
            <div className="flex-1 overflow-y-auto px-4 py-20 pb-48 scroll-smooth select-none">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Introduction Indicator */}
                    {hasSync && playing && syncedLines[0] && currentTime < syncedLines[0].time && (
                        <div className="text-center animate-pulse text-emerald-400 font-mono text-sm mb-4 tracking-widest uppercase">
                            {t('unified.intro')}
                        </div>
                    )}
                    {hanzi.map((line, i) => {
                        const isActive = i === activeIndex
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
                                    {/* Pinyin */}
                                    <p className={cn(
                                        "font-mono text-emerald-400 transition-all",
                                        isActive ? "text-base md:text-lg opacity-100" : "text-xs md:text-sm opacity-70"
                                    )}>
                                        {pinyin[i] || '\u00A0'}
                                    </p>

                                    {/* Hanzi */}
                                    <h3 className={cn(
                                        "font-bold text-white transition-all leading-relaxed",
                                        isActive ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"
                                    )}>
                                        {line || '\u00A0'}
                                    </h3>

                                    {/* English */}
                                    <p className={cn(
                                        "text-zinc-400 transition-all font-light",
                                        isActive ? "text-lg md:text-xl" : "text-sm md:text-base"
                                    )}>
                                        {english[i] || '\u00A0'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Floating Action / Player Bar */}
            {hasSync && (
                <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4 pb-safe z-50 transition-all">
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        <button
                            onClick={() => setPlaying(!playing)}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                        >
                            {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                        </button>

                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs text-zinc-400 font-mono">
                                <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                                <div className="flex items-center gap-2">
                                    {/* TEMPORARILY DISABLED
                                    <button
                                        onClick={() => setIsEditingUrl(!isEditingUrl)}
                                        className={cn(
                                            "hover:text-white transition-colors flex items-center gap-1 cursor-pointer",
                                            !audioUrl && "text-amber-500 animate-pulse"
                                        )}
                                    >
                                        {audioUrl ? t('unified.linked') : t('unified.noAudio')}
                                    </button>
                                     */}
                                    <span>{new Date((duration || currentTime) * 1000).toISOString().substr(14, 5)}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div
                                className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group hover:h-2 transition-all"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const percent = (e.clientX - rect.left) / rect.width
                                    const newTime = percent * (duration || 240) // Default to 4m if no duration
                                    setCurrentTime(newTime)
                                    if (playerRef.current?.seekTo) {
                                        playerRef.current.seekTo(newTime)
                                    }
                                }}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
                                    style={{ width: `${(currentTime / (duration || 240)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Audio URL Input (Expandable) TEMPORARILY DISABLED
                    {isEditingUrl && (
                        <div className="max-w-2xl mx-auto mt-4 pt-4 border-t border-zinc-800 animate-in slide-in-from-bottom-2">
                            <div className="flex gap-2">
                                <input
                                    value={newAudioUrl || audioUrl || ''}
                                    onChange={e => setNewAudioUrl(e.target.value)}
                                    placeholder={t('unified.pasteUrl')}
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={() => {
                                        onAudioUrlSave?.(newAudioUrl)
                                        setIsEditingUrl(false)
                                    }}
                                    className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 cursor-pointer"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                * {t('unified.timerMode')}
                            </p>
                        </div>
                    )}
                    */}

                    {/* Floating Video Player TEMPORARILY DISABLED
                    {playerMounted && audioUrl && (
                        <div className="fixed bottom-32 right-6 z-40 w-80 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
                           
                            <div className="absolute top-0 left-0 right-0 bg-black/50 text-[10px] text-white p-1 truncate z-10 pointer-events-none">
                                {audioUrl}
                            </div>

                            <ReactPlayer
                                key={audioUrl}
                                ref={playerRef}
                                url={audioUrl}
                                playing={playing}
                                controls={true}
                                width="100%"
                                height="100%"
                                config={{
                                    youtube: {
                                        playerVars: { origin: typeof window !== 'undefined' ? window.location.origin : undefined }
                                    }
                                }}
                                onReady={() => {
                                    console.log('Player Ready', audioUrl)
                                    if (playerRef.current?.getDuration) {
                                        setDuration(playerRef.current.getDuration())
                                    }
                                }}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onError={(e) => console.error('ReactPlayer Error:', e)}
                                onProgress={(state: any) => {
                                    // Only accept updates if we are actually playing audio
                                    if (playing) {
                                        setCurrentTime(state.playedSeconds)
                                        // Fallback to capture duration if onReady missed it
                                        if (duration === 0 && playerRef.current?.getDuration) {
                                            setDuration(playerRef.current.getDuration())
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}
                    */}
                </div>
            )}
        </div>
    )
}
