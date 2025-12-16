'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSong } from '@/app/actions'
import { normalizeChineseLyrics } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { SongStore } from '@/lib/store'

export function NewSongForm() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'paste' | 'search'>('paste')

    // Paste State
    const [lyrics, setLyrics] = useState('')
    const [title, setTitle] = useState('')
    const [artist, setArtist] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState('')

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

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

    const handleSelectSong = async (track: any) => {
        setLoading(true)
        setError('')
        try {
            let lyricsText = track.plainLyrics
            if (!lyricsText) {
                throw new Error("No plain lyrics found in result")
            }

            const hanziLines = normalizeChineseLyrics(lyricsText)
            if (hanziLines.length === 0) throw new Error('No valid lyrics found.')

            // Start simulated progress
            setProgress(0)
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev
                    return prev + 5
                })
            }, 800)

            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ hanziLines, options: { toneNumbers: false } }),
                headers: { 'Content-Type': 'application/json' }
            })

            clearInterval(interval)
            setProgress(100)

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to generate')
            }

            const { pinyin, english } = await res.json()

            const result = SongStore.save({
                title: track.name,
                artist: track.artistName,
                hanzi: hanziLines,
                pinyin: pinyin,
                english: english,
                lrcJson: track.syncedLyrics || null
            })

            router.push(`/song/${result.id}`)

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

            // Start simulated progress
            setProgress(0)
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev
                    return prev + 5
                })
            }, 800)

            // Generate
            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ hanziLines, options: { toneNumbers: false } }),
                headers: { 'Content-Type': 'application/json' }
            })

            clearInterval(interval)
            setProgress(100)

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to generate')
            }

            const { pinyin, english } = await res.json()

            // Save
            const result = SongStore.save({
                title: title || 'Untitled Song',
                artist: artist || 'Unknown Artist',
                hanzi: hanziLines,
                pinyin,
                english,
                lrcJson: null
            })

            router.push(`/song/${result.id}`)

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
                    onClick={() => setActiveTab('paste')}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'paste' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    Paste Lyrics
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'search' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    Search Song
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'paste' && (
                    <form onSubmit={handlePasteSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Title (Optional)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Song Title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Artist (Optional)</label>
                                <input
                                    type="text"
                                    value={artist}
                                    onChange={e => setArtist(e.target.value)}
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Artist Name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Lyrics (Chinese)</label>
                            <textarea
                                value={lyrics}
                                onChange={e => setLyrics(e.target.value)}
                                className="w-full h-64 bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Paste Chinese lyrics here..."
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
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? `Processing... ${progress}%` : 'Generate & Save'}
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
                                placeholder="Search Title or Artist..."
                                className="flex-1 bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="submit"
                                disabled={searching || !searchQuery}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium"
                            >
                                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {searchResults.map((track) => (
                                <div key={track.id} className="bg-zinc-800/50 p-4 rounded-lg flex items-center justify-between hover:bg-zinc-800 transition-colors">
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-white truncate">{track.name}</h3>
                                        <p className="text-sm text-zinc-400 truncate">{track.artistName} • {track.albumName}</p>
                                    </div>
                                    <button
                                        onClick={() => handleSelectSong(track)}
                                        disabled={loading}
                                        className="ml-4 bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-md"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}
                            {searchResults.length === 0 && !searching && searchQuery && (
                                <div className="text-center text-zinc-500 text-sm">No results found.</div>
                            )}
                        </div>

                        {loading && (
                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing selection... {progress}%
                            </div>
                        )}
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
