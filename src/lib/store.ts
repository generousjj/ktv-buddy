export type Song = {
    id: string
    title: string
    artist: string
    createdAt: string
    versionId: string
    hanzi: string[]
    pinyin: string[]
    english: string[]
    lrcJson: string | null
}

const STORAGE_KEY = 'ktv_buddy_songs'

export const SongStore = {
    getAll: (): Song[] => {
        if (typeof window === 'undefined') return []
        const data = localStorage.getItem(STORAGE_KEY)
        if (!data) return []
        try {
            return JSON.parse(data)
        } catch (e) {
            console.error('Failed to parse songs', e)
            return []
        }
    },

    getById: (id: string): Song | undefined => {
        const songs = SongStore.getAll()
        return songs.find(s => s.id === id)
    },

    save: (song: Omit<Song, 'id' | 'createdAt' | 'versionId'> & { id?: string, createdAt?: string, versionId?: string }): Song => {
        const songs = SongStore.getAll()
        const now = new Date().toISOString()

        const newSong: Song = {
            ...song,
            id: song.id || crypto.randomUUID(),
            title: song.title || 'Untitled Song',
            artist: song.artist || 'Unknown Artist',
            createdAt: song.createdAt || now,
            versionId: song.versionId || crypto.randomUUID(), // Versioning simplified for local storage
        }

        const existingIndex = songs.findIndex(s => s.id === newSong.id)
        if (existingIndex >= 0) {
            songs[existingIndex] = newSong
        } else {
            songs.unshift(newSong)
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
        }
        return newSong
    },

    delete: (id: string) => {
        const songs = SongStore.getAll().filter(s => s.id !== id)
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
        }
    }
}
