'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, Music2, Loader2, Search, Trash2 } from 'lucide-react'
import { SongStore, Song } from '@/lib/store'
// @ts-ignore
import * as OpenCC from 'opencc-js'
import PinyinMatch from 'pinyin-match'

import { ConfirmationModal } from '@/components/ConfirmationModal'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

// Initialize converter outside component to avoid recreation
// Convert Traditional (HK/TW mixed) to Simplified (CN)
const converter = OpenCC.Converter({ from: 'hk', to: 'cn' })

export default function LibraryPage() {
  const { t } = useLanguage()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [songToDelete, setSongToDelete] = useState<string | null>(null)

  // ... (useEffect and filter logic same)

  useEffect(() => {
    // Load songs on mount
    setSongs(SongStore.getAll())
    setLoading(false)
  }, [])

  // Filter and Sort Songs
  const filteredAndSortedSongs = (() => {
    if (!searchQuery) return songs

    const querySimp = converter(searchQuery)
    const queryLower = searchQuery.toLowerCase() // For fallback English/Pinyin exact checks if needed

    return songs
      .map(song => {
        let score = 0

        // Prepare simplified versions
        const titleSimp = converter(song.title || '')
        const artistSimp = converter(song.artist || '')

        // 1. Title Match
        // Check Original & Simplified
        const titleMatch = PinyinMatch.match(song.title || '', searchQuery) || PinyinMatch.match(titleSimp, querySimp)

        if (titleMatch) {
          // PinyinMatch returns [start, end] or boolean true (if strictly boolean version used, but library returns array)
          // We assume array [start, end]. If boolean true, treat as start=0
          const start = Array.isArray(titleMatch) ? titleMatch[0] : 0
          // Score calculation:
          // Base 1000
          // Subtract position (earlier is better)
          // Bonus for direct exact match?
          score += 1000 - start

          // Extra bonus if it is a very exact string match (case insensitive)
          if ((song.title || '').toLowerCase().includes(queryLower)) score += 500
        }

        // 2. Artist Match
        // Lower priority than title
        const artistMatch = PinyinMatch.match(song.artist || '', searchQuery) || PinyinMatch.match(artistSimp, querySimp)

        if (artistMatch) {
          const start = Array.isArray(artistMatch) ? artistMatch[0] : 0
          score += 500 - start // Base 500 for artist
        }

        return { song, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.song)
  })()

  // ...

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 md:gap-8">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-3xl font-bold text-white mb-2 md:mb-0">{t('library.mySongs')}</h1>
          {/* Mobile Language Switcher */}
          <div className="md:hidden">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-4">
          {/* Desktop Language Switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('newSong.placeholder.search')}
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 transition-all"
            />
          </div>
          <Link
            href="/app/new"
            className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-lg shadow-emerald-500/20 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            {t('nav.newSong')}
          </Link>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="w-full max-w-[720px] mx-auto my-8 p-12 flex flex-col items-center text-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-1">
            <Music2 className="w-6 h-6 text-zinc-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-white">{t('library.empty')}</h3>
            {/* <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
              Get started by adding your first song. You can paste lyrics or search for existing tracks.
            </p> */}
          </div>

          <Link
            href="/app/new"
            className="mt-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            {t('nav.newSong')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedSongs.length === 0 && searchQuery && (
            <div className="text-center py-12 text-zinc-500">
              No songs found matching "{searchQuery}"
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedSongs.map(song => (
              <div key={song.id} className="relative group">
                <Link
                  href={`/app/song/${song.id}`}
                  className="block bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all"
                >
                  <h3 className="font-bold text-lg text-white mb-1 group-hover:text-emerald-400 transition-colors truncate pr-8">{song.title}</h3>
                  <p className="text-zinc-500 text-sm truncate">{song.artist}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
                    <span>{new Date(song.createdAt).toLocaleDateString()}</span>
                    <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-400">Local</span>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setSongToDelete(song.id)
                  }}
                  className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!songToDelete}
        title={t('song.deleteConfirm.title')}
        description={t('song.deleteConfirm.desc')}
        confirmLabel={t('song.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onCancel={() => setSongToDelete(null)}
        onConfirm={() => {
          if (songToDelete) {
            SongStore.delete(songToDelete)
            setSongs(prev => prev.filter(s => s.id !== songToDelete))
            setSongToDelete(null)
          }
        }}
      />
    </div>
  )
}
