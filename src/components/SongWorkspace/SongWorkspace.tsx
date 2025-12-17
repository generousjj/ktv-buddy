'use client'

import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { KaraokeView } from './KaraokeView'
import { EditorView } from './EditorView'
import { UnifiedView } from './UnifiedView'
import { SongStore } from '@/lib/store'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

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
}

export function SongWorkspace({ initialData }: { initialData: SongData }) {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<'editor' | 'karaoke' | 'unified' | 'export'>('unified')

    const [hanzi, setHanzi] = useState(initialData.hanzi)
    const [pinyin, setPinyin] = useState(initialData.pinyin)
    const [english, setEnglish] = useState(initialData.english)
    const [audioUrl, setAudioUrl] = useState(initialData.audioUrl || '')
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
                lrcJson: initialData.lrcJson,
                audioUrl
            })
            // Optional: Show success toast
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const handleBulkUpdate = (h: string[], p: string[], e: string[]) => {
        // Update local state
        setHanzi(h)
        setPinyin(p)
        setEnglish(e)

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
                lrcJson: initialData.lrcJson,
                audioUrl
            })
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
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
                        <div className="min-w-0">
                            <h1 className="font-bold text-lg leading-tight truncate">{initialData.title || t('newSong.placeholder.title')}</h1>
                            <p className="text-xs text-zinc-500 truncate">{initialData.artist || t('newSong.placeholder.artist')}</p>
                        </div>
                    </div>

                    {/* Mobile Save Button (Top Right) */}
                    <div className="md:hidden shrink-0 flex items-center gap-2">
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
                {activeTab === 'editor' && <EditorView hanzi={hanzi} pinyin={pinyin} english={english} onChange={(h: string[], p: string[], e: string[]) => { setHanzi(h); setPinyin(p); setEnglish(e); }} onAutoSave={handleBulkUpdate} />}
                {activeTab === 'unified' && <UnifiedView hanzi={hanzi} pinyin={pinyin} english={english} lrcJson={initialData.lrcJson} audioUrl={audioUrl} onAudioUrlSave={(url) => { setAudioUrl(url); handleSave(); }} />}
                {activeTab === 'karaoke' && <KaraokeView hanzi={hanzi} pinyin={pinyin} english={english} />}
                {activeTab === 'export' && (
                    <div className="p-8 h-full flex items-center justify-center">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{t('song.export')}</h3>
                                <p className="text-zinc-400 text-sm">Download the song data as a JSON file including Lyrics, Pinyin, and translations.</p>
                            </div>

                            <button
                                onClick={handleExport}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer"
                            >
                                <Save className="w-5 h-5" />
                                Download JSON
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
