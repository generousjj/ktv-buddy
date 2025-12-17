'use client'

import { useState } from 'react'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export function EditorView({ hanzi, pinyin, english, onChange, onAutoSave, isGenerating, onRegenerate }: {
    hanzi: string[],
    pinyin: string[],
    english: string[],
    onChange: (h: string[], p: string[], e: string[]) => void,
    onAutoSave?: (h: string[], p: string[], e: string[]) => void,
    isGenerating?: boolean,
    onRegenerate?: () => void
}) {
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-3 border-b border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0">
                <div className="p-3 border-r border-zinc-800 flex justify-between items-center">
                    <span>Hanzi (Chinese)</span>
                    <button
                        onClick={() => !isGenerating && setShowRegenerateConfirm(true)}
                        disabled={isGenerating || !onRegenerate}
                        className={`text-[10px] px-2 py-0.5 rounded transition-colors flex items-center gap-1.5 ${isGenerating
                            ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 cursor-pointer'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-2 h-2 rounded-full border border-zinc-500 border-t-transparent animate-spin" />
                                Generating...
                            </>
                        ) : 'Regenerate'}
                    </button>
                </div>
                <div className="p-3 border-r border-zinc-800">Pinyin</div>
                <div className="p-3">English</div>
            </div>

            {/* Mobile Actions Header */}
            <div className="md:hidden flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/50">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Editor</span>
                <button
                    onClick={() => !isGenerating && setShowRegenerateConfirm(true)}
                    disabled={isGenerating || !onRegenerate}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${isGenerating
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                        }`}
                >
                    {isGenerating ? 'Generating...' : 'Regenerate All'}
                </button>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-zinc-900">
                {hanzi.map((line, i) => (
                    <div key={i} className={`flex flex-col md:grid md:grid-cols-3 hover:bg-zinc-900/30 group py-4 md:py-0 border-b border-zinc-900 md:border-b-0 relative transition-opacity duration-200 ${isGenerating ? 'pointer-events-none' : ''}`}>
                        {/* Mobile Label */}
                        <div className="md:hidden absolute top-2 right-2 text-[10px] text-zinc-600 font-mono">#{i + 1}</div>

                        <div className="md:border-r border-zinc-900/50 group-hover:border-zinc-800 px-4 md:px-0">
                            <span className="md:hidden text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Hanzi</span>
                            <input
                                type="text"
                                value={line}
                                onChange={(e) => {
                                    const newHanzi = [...hanzi]
                                    newHanzi[i] = e.target.value
                                    onChange(newHanzi, pinyin, english)
                                }}
                                className="w-full bg-transparent border-none focus:outline-none focus:bg-zinc-900 p-2 md:p-3 text-zinc-100 font-medium text-lg md:text-base"
                                placeholder="Hanzi"
                            />
                        </div>
                        <div className="md:border-r border-zinc-900/50 group-hover:border-zinc-800 px-4 md:px-0">
                            <span className="md:hidden text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block mt-2">Pinyin</span>
                            <input
                                type="text"
                                value={pinyin[i] || ''}
                                onChange={(e) => {
                                    const newPinyin = [...pinyin]
                                    newPinyin[i] = e.target.value
                                    onChange(hanzi, newPinyin, english)
                                }}
                                className="w-full bg-transparent border-none focus:outline-none focus:bg-zinc-900 p-2 md:p-3 text-emerald-400 font-mono text-base md:text-sm"
                                placeholder="Pinyin"
                            />
                        </div>
                        <div className="px-4 md:px-0">
                            <span className="md:hidden text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block mt-2">English</span>
                            <input
                                type="text"
                                value={english[i] || ''}
                                onChange={(e) => {
                                    const newEnglish = [...english]
                                    newEnglish[i] = e.target.value
                                    onChange(hanzi, pinyin, newEnglish)
                                }}
                                className={`w-full bg-transparent border-none focus:outline-none focus:bg-zinc-900 p-2 md:p-3 text-base md:text-sm transition-all duration-300 ${(isGenerating && (!english[i] || english[i] === '')) ? 'animate-pulse text-emerald-500/50 blur-[0.5px]' : 'text-zinc-400'}`}
                                placeholder={hanzi[i]}
                            />
                        </div>
                    </div>
                ))}
                {/* Add padding at bottom */}
                <div className="h-20"></div>
            </div>

            <ConfirmationModal
                isOpen={showRegenerateConfirm}
                title="Regenerate Translations?"
                description="This will re-generate Pinyin and English translations for ALL lines based on the current Hanzi text. Any manual edits you've made to Pinyin or English will be overwritten. This cannot be undone."
                confirmLabel="Regenerate"
                variant="warning"
                onConfirm={() => {
                    setShowRegenerateConfirm(false)
                    if (onRegenerate) onRegenerate()
                }}
                onCancel={() => setShowRegenerateConfirm(false)}
            />
        </div>
    )
}
