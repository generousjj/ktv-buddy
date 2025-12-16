'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, Music2, Loader2 } from 'lucide-react'
import { SongStore, Song } from '@/lib/store'

export default function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load songs on mount
    setSongs(SongStore.getAll())
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Library</h1>
          <p className="text-zinc-400">Manage your song collection</p>
        </div>
        <Link
          href="/new"
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          New Song
        </Link>
      </div>

      {songs.length === 0 ? (
        <div className="w-full max-w-[720px] mx-auto my-8 p-12 flex flex-col items-center text-center gap-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-1">
            <Music2 className="w-6 h-6 text-zinc-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-zinc-900">Your library is empty</h3>
            <p className="text-zinc-600 text-base leading-relaxed max-w-md mx-auto">
              Get started by adding your first song. You can paste lyrics or search for existing tracks.
            </p>
          </div>

          <Link
            href="/new"
            className="mt-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            New Song
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map(song => (
            <Link
              key={song.id}
              href={`/song/${song.id}`}
              className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group"
            >
              <h3 className="font-bold text-lg text-white mb-1 group-hover:text-emerald-400 transition-colors truncate">{song.title}</h3>
              <p className="text-zinc-500 text-sm truncate">{song.artist}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
                <span>{new Date(song.createdAt).toLocaleDateString()}</span>
                <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-400">Local</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
