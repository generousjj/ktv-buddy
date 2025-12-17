'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { normalizeChineseLyrics } from '@/lib/utils'
import { SongStore } from '@/lib/store'
import { useLanguage } from '@/lib/i18n'

export function NewSongForm() {
    const { t } = useLanguage()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'paste' | 'search'>('search')

    // Paste State
    const [lyrics, setLyrics] = useState('')
    const [title, setTitle] = useState('')
    const [artist, setArtist] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState('')

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searching, setSearching] = useState(false) // Added searching state
    const [searchResults, setSearchResults] = useState<any[]>([]) // Added searchResults state
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery) return
        setSearching(true)
        setSearchResults([])
        try {
            const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSearching(false)
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault()
        setSelectedTrackId(null)
        setLoading(false)
        setProgress(0)
    }

    const handleSelectSong = async (track: any) => {
        setLoading(true)
        setSelectedTrackId(track.id)
        setError('')

        try {
            let lyricsText = track.plainLyrics
            if (!lyricsText) {
                throw new Error("No plain lyrics found in result")
            }

            const hanziLines = normalizeChineseLyrics(lyricsText)
            if (hanziLines.length === 0) throw new Error('No valid lyrics found.')

            // Start progress
            setProgress(0)
            const totalLines = hanziLines.length

            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ hanziLines, options: { toneNumbers: false } }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.body) throw new Error('No stream body')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            let finalPinyin: string[] = []
            let finalEnglish: string[] = []
            let processedCount = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const msg = JSON.parse(line)
                        if (msg.type === 'pinyin') {
                            finalPinyin = msg.data
                        } else if (msg.type === 'english') {
                            const { chunkIndex, data } = msg
                            const start = chunkIndex * 10
                            for (let i = 0; i < data.length; i++) {
                                finalEnglish[start + i] = data[i]
                            }
                            processedCount += data.length
                            setProgress(Math.min(99, Math.round((processedCount / totalLines) * 100)))
                        } else if (msg.type === 'error') {
                            throw new Error(msg.message)
                        }
                    } catch (e) {
                        console.warn('JSON Parse Error', e)
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    const msg = JSON.parse(buffer)
                    if (msg.type === 'pinyin') finalPinyin = msg.data
                    else if (msg.type === 'english') {
                        const { chunkIndex, data } = msg
                        const start = chunkIndex * 10
                        for (let i = 0; i < data.length; i++) {
                            finalEnglish[start + i] = data[i]
                        }
                    }
                } catch (e) { }
            }

            setProgress(100)

            // Normalize arrays
            for (let i = 0; i < totalLines; i++) {
                if (finalEnglish[i] === undefined) finalEnglish[i] = ''
                if (finalPinyin[i] === undefined) finalPinyin[i] = ''
            }

            const result = SongStore.save({
                title: track.name,
                artist: track.artistName,
                hanzi: hanziLines,
                pinyin: finalPinyin,
                english: finalEnglish,
                lrcJson: track.syncedLyrics || null
            })

            router.push(`/app/song/${result.id}`)

        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handlePasteSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lyrics) return

        setLoading(true)
        setError('')

        try {
            const hanziLines = normalizeChineseLyrics(lyrics)
            if (hanziLines.length === 0) throw new Error('No valid lyrics found after normalization.')

            // Start progress
            setProgress(0)
            const totalLines = hanziLines.length

            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ hanziLines, options: { toneNumbers: false } }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.body) throw new Error('No stream body')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            let finalPinyin: string[] = []
            let finalEnglish: string[] = []
            let processedCount = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const msg = JSON.parse(line)
                        if (msg.type === 'pinyin') {
                            finalPinyin = msg.data
                        } else if (msg.type === 'english') {
                            const { chunkIndex, data } = msg
                            const start = chunkIndex * 10
                            for (let i = 0; i < data.length; i++) {
                                finalEnglish[start + i] = data[i]
                            }
                            processedCount += data.length
                            setProgress(Math.min(99, Math.round((processedCount / totalLines) * 100)))
                        } else if (msg.type === 'error') {
                            throw new Error(msg.message)
                        }
                    } catch (e) {
                        console.warn('JSON Parse Error', e)
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    const msg = JSON.parse(buffer)
                    if (msg.type === 'pinyin') finalPinyin = msg.data
                    else if (msg.type === 'english') {
                        const { chunkIndex, data } = msg
                        const start = chunkIndex * 10
                        for (let i = 0; i < data.length; i++) {
                            finalEnglish[start + i] = data[i]
                        }
                    }
                } catch (e) { }
            }

            setProgress(100)

            // Normalize arrays
            for (let i = 0; i < totalLines; i++) {
                if (finalEnglish[i] === undefined) finalEnglish[i] = ''
                if (finalPinyin[i] === undefined) finalPinyin[i] = ''
            }

            // Save
            const result = SongStore.save({
                title: title || 'Untitled Song',
                artist: artist || 'Unknown Artist',
                hanzi: hanziLines,
                pinyin: finalPinyin,
                english: finalEnglish,
                lrcJson: null
            })

            router.push(`/app/song/${result.id}`)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`px-6 py-3 text-sm font-medium cursor-pointer ${activeTab === 'search' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    {t('newSong.tab.search')}
                </button>
                <button
                    onClick={() => setActiveTab('paste')}
                    className={`px-6 py-3 text-sm font-medium cursor-pointer ${activeTab === 'paste' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    {t('newSong.tab.paste')}
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'paste' && (
                    <form onSubmit={handlePasteSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">{t('newSong.title')}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder={t('newSong.placeholder.title')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">{t('newSong.artist')}</label>
                                <input
                                    type="text"
                                    value={artist}
                                    onChange={e => setArtist(e.target.value)}
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder={t('newSong.placeholder.artist')}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">{t('newSong.lyrics')}</label>
                            <textarea
                                value={lyrics}
                                onChange={e => setLyrics(e.target.value)}
                                className="w-full h-64 bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={t('newSong.placeholder.lyrics')}
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-900">
                                Error: {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !lyrics}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? `${t('newSong.processing')} ${progress}%` : t('newSong.submit')}
                        </button>
                    </form>
                )}

                {activeTab === 'search' && (
                    <div className="space-y-6">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('newSong.placeholder.search')}
                                className="flex-1 bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="submit"
                                disabled={searching || !searchQuery}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium cursor-pointer"
                            >
                                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : t('newSong.searchBtn')}
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {searchResults.map((track) => {
                                const isSelected = selectedTrackId === track.id
                                const isProcessing = loading && isSelected
                                const isOtherDisabled = loading && !isSelected

                                return (
                                    <div key={track.id} className={`bg-zinc-800/50 p-4 rounded-lg flex flex-col gap-2 hover:bg-zinc-800 transition-all ${isOtherDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-white truncate">{track.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-zinc-400 truncate">{track.artistName} • {track.albumName}</p>
                                                    {track.syncedLyrics && (
                                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                            {t('newSong.synced')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={isProcessing ? handleCancel : () => handleSelectSong(track)}
                                                disabled={isOtherDisabled}
                                                className={`ml-4 text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors ${isProcessing
                                                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                    }`}
                                            >
                                                {isProcessing ? t('common.cancel') : t('newSong.select')}
                                            </button>
                                        </div>

                                        {isProcessing && (
                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    {t('newSong.processing')} {progress}%
                                                </div>
                                                <div className="h-1 w-full bg-zinc-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {searchResults.length === 0 && !searching && searchQuery && (
                                <div className="text-center text-zinc-500 text-sm">{t('newSong.noResults')}</div>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-900">
                                Error: {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
