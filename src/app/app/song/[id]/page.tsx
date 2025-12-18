'use client'

import { SongWorkspace } from '@/components/SongWorkspace/SongWorkspace'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SongStore, Song } from '@/lib/store'
import { Loader2 } from 'lucide-react'

export default function SongPage() {
    const { id } = useParams()
    const router = useRouter()
    const [song, setSong] = useState<Song | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (typeof id === 'string') {
            const found = SongStore.getById(id)
            if (found) {
                setSong(found)
            } else {
                router.push('/')
            }
        }
        setLoading(false)
    }, [id, router])

    if (loading) return (
        <div className="h-full flex items-center justify-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    )

    if (!song) return null

    return (
        <div className="h-[calc(100dvh-4rem)] md:h-[100dvh] w-full overflow-hidden">
            {/* Only use song ID as key - SongWorkspace manages its own state */}
            <SongWorkspace key={song.id} initialData={song} />
        </div>
    )
}
