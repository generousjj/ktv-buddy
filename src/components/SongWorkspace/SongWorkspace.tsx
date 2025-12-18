'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { pinyin as pinyinPro } from 'pinyin-pro'
import { KaraokeView } from './KaraokeView'
import { EditorView } from './EditorView'
import { UnifiedView } from './UnifiedView'
import { SongStore } from '@/lib/store'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'
import { useSpotify } from '@/hooks/useSpotify'
import { SpotifyControl } from '@/components/SpotifyControl'
import { useRouter } from 'next/navigation'

export type SongData = {
    id: string
    title: string | null
    artist: string | null
    createdAt: string
    versionId: string
    hanzi: string[]
    pinyin: string[]
    english: string[]
    lrcJson: string | null
    audioUrl?: string | null
    isTemp?: boolean
    spotifyTrackId?: string
}

const cleanData = (h: string[], p: string[], e: string[]) => {
    const validIndices = h.map((line, i) => line?.trim() ? i : -1).filter(i => i !== -1)
    if (validIndices.length === h.length) return { hanzi: h, pinyin: p, english: e, cleaned: false }
    return {
        hanzi: validIndices.map(i => h[i]),
        pinyin: validIndices.map(i => p[i] || ''),
        english: validIndices.map(i => e[i] || ''),
        cleaned: true
    }
}

export function SongWorkspace({ initialData }: { initialData: SongData }) {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<'editor' | 'karaoke' | 'unified' | 'export'>('unified')

    // Clean data on init to remove empty lines that break card view
    const { hanzi: initHanzi, pinyin: initPinyin, english: initEnglish, cleaned: wasCleaned } = cleanData(initialData.hanzi, initialData.pinyin, initialData.english)

    const [hanzi, setHanzi] = useState(initHanzi)
    const [pinyin, setPinyin] = useState(initPinyin)
    const [english, setEnglish] = useState(initEnglish)
    const [lrcJson, setLrcJson] = useState<string | null>(initialData.lrcJson || null)
    const [audioUrl, setAudioUrl] = useState(initialData.audioUrl || '')
    const [saving, setSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [exportOptions, setExportOptions] = useState({
        hanzi: true,
        pinyin: true,
        english: true
    })

    // Spotify Integration
    const router = useRouter()
    const { spotifyState, login, logout, isSpotifyMode, setSpotifyMode, controlPlayback, searchSpotify, playTrack } = useSpotify()
    const [spotifyCurrentTime, setSpotifyCurrentTime] = useState(0)

    // Handle Song Matching & Time Sync
    // 2. Sync Time (Smooth)
    useEffect(() => {
        let rafId: number

        const update = () => {
            if (isSpotifyMode && spotifyState.isPlaying && spotifyState.track) {
                const elapsed = (Date.now() - spotifyState.lastUpdated) / 1000
                const current = (spotifyState.progress_ms / 1000) + elapsed
                setSpotifyCurrentTime(current)
                rafId = requestAnimationFrame(update)
            }
        }

        if (isSpotifyMode && spotifyState.isPlaying) {
            update()
        } else if (isSpotifyMode && spotifyState.track) {
            // Paused: just set once
            const elapsed = (Date.now() - spotifyState.lastUpdated) / 1000
            setSpotifyCurrentTime((spotifyState.progress_ms / 1000) + elapsed)
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [isSpotifyMode, spotifyState])

    // Save cleaned data if needed
    useEffect(() => {
        if (wasCleaned) {
            console.log('Saving auto-cleaned data...')
            SongStore.save({
                ...initialData,
                hanzi: initHanzi,
                pinyin: initPinyin,
                english: initEnglish
            })
        }
    }, [])

    // Auto-generate if only Hanzi exists (e.g. newly created) or autoGenerate param is present
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const shouldAutoGenerate = searchParams?.get('autoGenerate') === 'true'

    // Track if we've already attempted auto-generation for this session/song
    const autoGenRef = useState(false)

    useEffect(() => {
        // Condition 1: Hanzi exists but Pinyin/English doesn't (Partial data)
        const partialData = hanzi.length > 0 && (pinyin.length === 0 || pinyin.length !== hanzi.length)

        // Condition 2: Explicit auto-generate flag
        const explicitTrigger = shouldAutoGenerate && !isGenerating

        // Condition 3: Empty song but valid metadata (Auto-created "zombie" song)
        // We only trigger this ONCE per session to prevent infinite loop if generation fails/returns empty.
        const zombieTrigger = hanzi.length === 0 && initialData.title && initialData.artist && !autoGenRef[0] && !isGenerating

        if (partialData || explicitTrigger || zombieTrigger) {
            console.log('[SongWorkspace] Auto-triggering generation.', { partialData, explicitTrigger, zombieTrigger })

            if (zombieTrigger) autoGenRef[1](true) // Set generated flag

            // Remove the param to avoid re-triggering on refresh? Maybe not needed for now.
            handleGenerate()
        }
    }, [shouldAutoGenerate, hanzi.length, pinyin.length])

    const handleGenerate = async () => {
        if (isGenerating) return
        setIsGenerating(true)

        try {
            // fast-lib generation for immediate feedback
            // fast-lib generation for immediate feedback
            // Ensure we have a working copy aligned with Hanzi
            let currentPinyin = [...pinyin]
            let currentEnglish = [...english]

            // If mismatch or empty, generate client-side immediately
            if (currentPinyin.length !== hanzi.length || currentPinyin.some(p => !p)) {
                console.log('[Generate] Filling missing pinyin client-side...')
                const fastPinyin = hanzi.map((line, i) => {
                    // Use existing if valid, otherwise generate
                    if (currentPinyin[i] && currentPinyin[i] !== '') return currentPinyin[i]
                    return pinyinPro(line, {
                        toneType: 'symbol',
                        nonZh: 'consecutive',
                        v: true
                    })
                })
                currentPinyin = fastPinyin
                setPinyin([...currentPinyin])
            }

            // Initialize English with placeholders if empty to align arrays
            if (currentEnglish.length !== hanzi.length) {
                const newEnglish = hanzi.map((_, i) => currentEnglish[i] || '')
                currentEnglish = newEnglish
                setEnglish([...currentEnglish])
            }

            // Trigger immediate save of this "Draft" state so UI updates
            // (Optional, but good for perceived speed)

            const res = await fetch('/api/generate', {
                method: 'POST',
                // ...
                body: JSON.stringify({
                    hanziLines: hanzi,
                    title: initialData.title,
                    artist: initialData.artist,
                    options: { toneNumbers: false }
                }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.body) throw new Error('No stream body')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = '' // Handle partial chunks

            // Sync local reference again in case state update hasn't propagated to this closure's pinyin
            // (Actually currentPinyin is local variable so it's fine, but just to be safe)

            if (currentEnglish.length !== hanzi.length) {
                // Resize if needed (fill with empty strings)
                const newArr = Array(hanzi.length).fill('')
                currentEnglish.forEach((val, i) => {
                    if (i < newArr.length) newArr[i] = val
                })
                currentEnglish = newArr
                setEnglish([...currentEnglish])
            }

            // New: If we fetch lyrics, we need to update our local reference to 'hanzi'
            let currentHanzi = [...hanzi]
            let currentLrcJson = lrcJson // Track lrcJson locally to prevent overwrites by closure stale state

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep last partial line

                let pinyinUpdated = false
                let englishUpdated = false
                let hanziUpdated = false

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const msg = JSON.parse(line)
                        if (msg.type === 'lyrics_update') {
                            // API found lyrics for us!
                            currentHanzi = msg.data
                            hanziUpdated = true

                            // IMMEDIATELY generate local pinyin so user sees something fast
                            currentPinyin = currentHanzi.map((line: string) => {
                                try {
                                    return pinyinPro(line, { toneType: 'symbol', nonZh: 'consecutive', v: true })
                                } catch {
                                    return ''
                                }
                            })
                            currentEnglish = Array(currentHanzi.length).fill('') // English will come from API

                            // Update UI immediately with local pinyin
                            setHanzi([...currentHanzi])
                            setPinyin([...currentPinyin])
                            setEnglish([...currentEnglish])

                        } else if (msg.type === 'pinyin') {
                            // Legacy whole-array update (should trigger rarely now with chunks)
                            currentPinyin = msg.data
                            pinyinUpdated = true
                        } else if (msg.type === 'english') {
                            const { chunkIndex, data } = msg
                            const start = chunkIndex * 10
                            for (let i = 0; i < data.length; i++) {
                                if (start + i < currentEnglish.length) {
                                    currentEnglish[start + i] = data[i]
                                }
                            }
                            englishUpdated = true

                        } else if (msg.type === 'pinyin_chunk') {
                            const { chunkIndex, data } = msg
                            const start = chunkIndex * 10
                            for (let i = 0; i < data.length; i++) {
                                if (start + i < currentPinyin.length) {
                                    currentPinyin[start + i] = data[i]
                                }
                            }
                            pinyinUpdated = true
                        } else if (msg.type === 'lrc_update') {
                            // NEW: API found synced lyrics (LRC)
                            const newLrc = msg.data
                            currentLrcJson = newLrc
                            setLrcJson(newLrc)

                            // Immediately persist LRC to storage (avoid closure issues)
                            SongStore.save({
                                id: initialData.id,
                                title: initialData.title || undefined,
                                artist: initialData.artist || undefined,
                                createdAt: initialData.createdAt,
                                versionId: initialData.versionId,
                                hanzi: currentHanzi,
                                pinyin: currentPinyin,
                                english: currentEnglish,
                                lrcJson: newLrc,
                                audioUrl,
                                spotifyTrackId: initialData.spotifyTrackId
                            })
                            console.log('[Generate] Saved LRC sync data')
                        } else if (msg.type === 'error') {
                            console.error('Stream error:', msg.message)
                        }
                    } catch (e) {
                        console.warn('Stream parse error:', e)
                    }
                }

                // Update state and save if changed
                if (pinyinUpdated || englishUpdated || hanziUpdated) {
                    if (!hanziUpdated) {
                        // If only pinyin/english changed, we just sync
                    }
                    setHanzi([...currentHanzi]) // Trigger re-render
                    setPinyin([...currentPinyin])
                    setEnglish([...currentEnglish])

                    // We save incrementally so if they leave, they have partial progress
                    handleBulkUpdate(currentHanzi, currentPinyin, currentEnglish, currentLrcJson)
                }
            }

            // Final save
            handleBulkUpdate(currentHanzi, currentPinyin, currentEnglish, currentLrcJson)

        } catch (e) {
            console.error("Generation error:", e)
            alert('An error occurred during generation.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSave = () => {
        setSaving(true)
        try {
            SongStore.save({
                id: initialData.id,
                title: initialData.title || undefined,
                artist: initialData.artist || undefined,
                createdAt: initialData.createdAt,
                versionId: initialData.versionId,
                hanzi,
                pinyin,
                english,
                lrcJson: lrcJson,
                audioUrl,
                spotifyTrackId: initialData.spotifyTrackId
            })
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const handleBulkUpdate = (h: string[], p: string[], e: string[], lrcJsonOverride?: string | null) => {
        // Update local state
        setHanzi(h)
        setPinyin(p)
        setEnglish(e)
        if (lrcJsonOverride !== undefined) setLrcJson(lrcJsonOverride)

        // Auto-save
        setSaving(true)
        try {
            SongStore.save({
                id: initialData.id,
                title: initialData.title || undefined,
                artist: initialData.artist || undefined,
                createdAt: initialData.createdAt,
                versionId: initialData.versionId,
                hanzi: h,
                pinyin: p,
                english: e,
                lrcJson: lrcJsonOverride !== undefined ? lrcJsonOverride : lrcJson,
                audioUrl,
                isTemp: initialData.isTemp,
                spotifyTrackId: initialData.spotifyTrackId
            })
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const plainText = [
        `Title: ${initialData.title || t('newSong.placeholder.title')}`,
        `Artist: ${initialData.artist || t('newSong.placeholder.artist')}`,
        '',
        ...hanzi.flatMap((h, i) => {
            const lines = []
            if (exportOptions.hanzi) lines.push(h)
            if (exportOptions.pinyin) lines.push(pinyin[i] || '')
            if (exportOptions.english) lines.push(english[i] || '')
            if (lines.length > 0) lines.push('') // spacing
            return lines
        })
    ].join('\n')

    const handleCopy = () => {
        navigator.clipboard.writeText(plainText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleExport = () => {
        const data = {
            title: initialData.title,
            artist: initialData.artist,
            hanzi,
            pinyin,
            english
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${initialData.title || 'song'}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-white">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-6 py-4 border-b border-zinc-900 bg-zinc-950 shrink-0 gap-4">
                <div className="flex items-center justify-between md:justify-start gap-4 flex-nowrap min-w-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link href="/app" className="text-zinc-400 hover:text-white transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>

                        {/* Album Art (Spotify Mode) */}
                        {isSpotifyMode && spotifyState.track?.albumArt && (
                            <img
                                src={spotifyState.track.albumArt}
                                alt="Album Art"
                                className="w-12 h-12 rounded-lg shadow-lg shrink-0"
                            />
                        )}

                        <div className="min-w-0">
                            <h1 className="font-bold text-lg leading-tight truncate">{initialData.title || t('newSong.placeholder.title')}</h1>
                            <p className="text-xs text-zinc-500 truncate">{initialData.artist || t('newSong.placeholder.artist')}</p>
                        </div>
                    </div>

                    {/* Mobile Save Button (Top Right) */}
                    <div className="md:hidden shrink-0 flex items-center gap-2">
                        <SpotifyControl
                            spotifyState={spotifyState}
                            onLogin={login}
                            onLogout={logout}
                            isSpotifyMode={isSpotifyMode}
                            onToggleMode={setSpotifyMode}
                        />
                        <LanguageSwitcher />
                        {activeTab === 'editor' && (
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-emerald-400 text-sm font-medium hover:text-emerald-300 bg-zinc-900 p-2 rounded-lg disabled:opacity-50 cursor-pointer">
                                <Save className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 shrink-0 overflow-x-auto">
                    <button onClick={() => setActiveTab('editor')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === 'editor' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>{t('song.editor')}</button>
                    <button onClick={() => setActiveTab('unified')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === 'unified' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>{t('song.unified')}</button>
                    <button onClick={() => setActiveTab('karaoke')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === 'karaoke' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>{t('song.karaoke')}</button>
                    <button onClick={() => setActiveTab('export')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === 'export' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>{t('song.export')}</button>
                </div>

                {/* Desktop Save Button */}
                <div className="hidden md:flex w-[200px] justify-end shrink-0 items-center gap-3">
                    <SpotifyControl
                        spotifyState={spotifyState}
                        onLogin={login}
                        onLogout={logout}
                        isSpotifyMode={isSpotifyMode}
                        onToggleMode={setSpotifyMode}
                    />
                    <LanguageSwitcher />
                    {activeTab === 'editor' && (
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-emerald-400 text-sm font-medium hover:text-emerald-300 disabled:opacity-50 cursor-pointer">
                            <Save className="w-4 h-4" />
                            {saving ? t('song.saving') : t('song.save')}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'editor' && <EditorView hanzi={hanzi} pinyin={pinyin} english={english} onChange={(h: string[], p: string[], e: string[]) => { setHanzi(h); setPinyin(p); setEnglish(e); }} onAutoSave={handleBulkUpdate} isGenerating={isGenerating} onRegenerate={handleGenerate} />}
                {activeTab === 'unified' && <UnifiedView hanzi={hanzi} pinyin={pinyin} english={english} lrcJson={lrcJson} audioUrl={audioUrl} onAudioUrlSave={(url) => {
                    if (url === '_RETRY_') {
                        handleGenerate()
                    } else {
                        setAudioUrl(url);
                        handleSave();
                    }
                }} isGenerating={isGenerating} externalTime={isSpotifyMode ? spotifyCurrentTime : undefined} isExternalPlaying={isSpotifyMode ? spotifyState.isPlaying : undefined}
                    onSpotifyControl={isSpotifyMode ? controlPlayback : undefined}
                    externalDuration={isSpotifyMode && spotifyState.track ? spotifyState.track.duration_ms / 1000 : undefined}
                    onSearchSpotify={isSpotifyMode ? searchSpotify : undefined}
                    onPlayTrack={isSpotifyMode ? playTrack : undefined}
                    onSave={handleSave}
                    isTemp={initialData.isTemp} />}
                {activeTab === 'karaoke' && <KaraokeView hanzi={hanzi} pinyin={pinyin} english={english} />}
                {activeTab === 'export' && (
                    <div className="p-8 h-full flex flex-col items-center justify-center overflow-hidden">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8 max-w-2xl w-full flex flex-col h-full max-h-[85vh]">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{t('song.export')}</h3>
                                    <p className="text-zinc-400 text-sm">Copy lyrics to clipboard.</p>
                                </div>
                                <button
                                    onClick={handleExport}
                                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <Save className="w-3 h-3" />
                                    JSON
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                                {(['hanzi', 'pinyin', 'english'] as const).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setExportOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${exportOptions[key]
                                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                            }`}
                                    >
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-hidden relative group rounded-lg border border-zinc-800 bg-zinc-950 mb-6">
                                <textarea
                                    readOnly
                                    value={plainText}
                                    className="w-full h-full bg-transparent p-4 font-mono text-sm text-zinc-300 resize-none focus:outline-none"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md shadow-lg border border-zinc-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? 'Copied!' : 'Copy Text'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
