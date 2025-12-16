'use client'

export function EditorView({ hanzi, pinyin, english, onChange }: {
    hanzi: string[],
    pinyin: string[],
    english: string[],
    onChange: (h: string[], p: string[], e: string[]) => void
}) {
    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-3 border-b border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0">
                <div className="p-3 border-r border-zinc-800">Hanzi (Chinese)</div>
                <div className="p-3 border-r border-zinc-800">Pinyin</div>
                <div className="p-3">English</div>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-zinc-900">
                {hanzi.map((line, i) => (
                    <div key={i} className="flex flex-col md:grid md:grid-cols-3 hover:bg-zinc-900/30 group py-4 md:py-0 border-b border-zinc-900 md:border-b-0 relative">
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
                                className="w-full bg-transparent border-none focus:outline-none focus:bg-zinc-900 p-2 md:p-3 text-zinc-400 text-base md:text-sm"
                                placeholder="English Translation"
                            />
                        </div>
                    </div>
                ))}
                {/* Add padding at bottom */}
                <div className="h-20"></div>
            </div>
        </div>
    )
}
