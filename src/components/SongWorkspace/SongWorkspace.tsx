'use client'

import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { KaraokeView } from './KaraokeView'
import { EditorView } from './EditorView'
// import { updateSongVersion } from '@/app/actions' 

import { UnifiedView } from './UnifiedView'

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
}

import { SongStore } from '@/lib/store'
// ... imports

export function SongWorkspace({ initialData }: { initialData: SongData }) {
    const [activeTab, setActiveTab] = useState<'editor' | 'karaoke' | 'unified' | 'export'>('unified')

    const [hanzi, setHanzi] = useState(initialData.hanzi)
    const [pinyin, setPinyin] = useState(initialData.pinyin)
    const [english, setEnglish] = useState(initialData.english)
    const [saving, setSaving] = useState(false)

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
                lrcJson: initialData.lrcJson
            })
            // Optional: Show success toast
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-white">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-6 py-4 border-b border-zinc-900 bg-zinc-950 shrink-0 gap-4">
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight truncate max-w-[200px] md:max-w-none">{initialData.title || 'Untitled Song'}</h1>
                            <p className="text-xs text-zinc-500 truncate max-w-[200px] md:max-w-none">{initialData.artist || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    {/* Mobile Save Button (Top Right) */}
                    <div className="md:hidden">
                        {activeTab === 'editor' && (
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-emerald-400 text-sm font-medium hover:text-emerald-300 bg-zinc-900 p-2 rounded-lg disabled:opacity-50">
                                <Save className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 overflow-x-auto no-scrollbar justify-between md:justify-start">
                    <button onClick={() => setActiveTab('editor')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'editor' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Editor</button>
                    <button onClick={() => setActiveTab('unified')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'unified' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Unified</button>
                    <button onClick={() => setActiveTab('karaoke')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'karaoke' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Karaoke</button>
                    <button onClick={() => setActiveTab('export')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'export' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Export</button>
                </div>

                {/* Desktop Save Button */}
                <div className="hidden md:flex w-[100px] justify-end">
                    {activeTab === 'editor' && (
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-emerald-400 text-sm font-medium hover:text-emerald-300 disabled:opacity-50">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'editor' && <EditorView hanzi={hanzi} pinyin={pinyin} english={english} onChange={(h: string[], p: string[], e: string[]) => { setHanzi(h); setPinyin(p); setEnglish(e); }} />}
                {activeTab === 'unified' && <UnifiedView hanzi={hanzi} pinyin={pinyin} english={english} />}
                {activeTab === 'karaoke' && <KaraokeView hanzi={hanzi} pinyin={pinyin} english={english} />}
                {activeTab === 'export' && (
                    <div className="p-8 text-center text-zinc-500 h-full flex items-center justify-center">
                        <div>
                            <p className="mb-2">Export functionality coming soon.</p>
                            <p className="text-xs opacity-50">This is an MVP.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
