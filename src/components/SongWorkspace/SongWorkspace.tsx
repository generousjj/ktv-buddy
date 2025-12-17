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
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [exportOptions, setExportOptions] = useState({
        hanzi: true,
        pinyin: true,
        english: true
    })

    // Auto-generate if only Hanzi exists (e.g. newly created)
    useEffect(() => {
        if (initialData.hanzi.length > 0 && (initialData.pinyin.length === 0 || initialData.pinyin.length !== initialData.hanzi.length)) {
            handleGenerate()
        }
    }, [])

    const handleGenerate = async () => {
        if (isGenerating) return
        setIsGenerating(true)

        try {
            // fast-lib generation for immediate feedback
            let currentPinyin = [...pinyin]
            // If empty pinyin, generate client-side immediately
            if (currentPinyin.length === 0 || currentPinyin.length !== hanzi.length) {
                const fastPinyin = hanzi.map(line => pinyinPro(line, {
                    toneType: 'symbol',
                    nonZh: 'consecutive',
                    v: true
                }))
                currentPinyin = fastPinyin
                setPinyin([...currentPinyin])

                // Initialize English with placeholders if empty to align arrays
                if (english.length !== hanzi.length) {
                    setEnglish(hanzi.map(() => ''))
                }
            }

            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ hanziLines: hanzi, options: { toneNumbers: false } }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.body) throw new Error('No stream body')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = '' // Handle partial chunks

            // Sync local reference again in case state update hasn't propagated to this closure's pinyin
            // (Actually currentPinyin is local variable so it's fine, but just to be safe)

            let currentEnglish = [...english]
            if (currentEnglish.length !== hanzi.length) {
                currentEnglish = Array(hanzi.length).fill('')
            }

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep last partial line

                let pinyinUpdated = false
                let englishUpdated = false

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const msg = JSON.parse(line)
                        if (msg.type === 'pinyin') {
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
                        } else if (msg.type === 'error') {
                            console.error('Stream error:', msg.message)
                        }
                    } catch (e) {
                        console.warn('Stream parse error:', e)
                    }
                }

                // Update state and save if changed
                if (pinyinUpdated || englishUpdated) {
                    setHanzi(hanzi) // Trigger re-render
                    setPinyin([...currentPinyin])
                    setEnglish([...currentEnglish])

                    // We save incrementally so if they leave, they have partial progress
                    handleBulkUpdate(hanzi, currentPinyin, currentEnglish)
                }
            }

            // Final save
            handleBulkUpdate(hanzi, currentPinyin, currentEnglish)

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
                lrcJson: initialData.lrcJson,
                audioUrl
            })
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
                {activeTab === 'editor' && <EditorView hanzi={hanzi} pinyin={pinyin} english={english} onChange={(h: string[], p: string[], e: string[]) => { setHanzi(h); setPinyin(p); setEnglish(e); }} onAutoSave={handleBulkUpdate} isGenerating={isGenerating} onRegenerate={handleGenerate} />}
                {activeTab === 'unified' && <UnifiedView hanzi={hanzi} pinyin={pinyin} english={english} lrcJson={initialData.lrcJson} audioUrl={audioUrl} onAudioUrlSave={(url) => { setAudioUrl(url); handleSave(); }} isGenerating={isGenerating} />}
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
