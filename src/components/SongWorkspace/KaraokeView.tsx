'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function KaraokeView({ hanzi, pinyin, english }: { hanzi: string[], pinyin: string[], english: string[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    // Handle spacebar / arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input (but there are no inputs here)
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault()
                setCurrentIndex(prev => Math.min(prev + 1, hanzi.length - 1))
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                setCurrentIndex(prev => Math.max(prev - 1, 0))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [hanzi.length])

    return (
        <div className="h-full flex flex-col items-center justify-between p-8 bg-black">
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto min-h-0">
                <div className="flex flex-col gap-8 md:gap-12 justify-center text-center w-full py-8 overflow-y-auto custom-scrollbar">
                    {/* Pinyin */}
                    <p className="text-3xl md:text-5xl text-emerald-400 font-mono opacity-90 transition-all duration-300 leading-relaxed break-words">
                        {pinyin[currentIndex] || '\u00A0'}
                    </p>

                    {/* Hanzi */}
                    <h2 className="text-7xl md:text-9xl font-black text-white tracking-wide transition-all duration-300 leading-tight break-words py-2">
                        {hanzi[currentIndex] || ''}
                    </h2>

                    {/* English */}
                    <p className="text-2xl md:text-4xl text-zinc-400 font-light transition-all duration-300 leading-relaxed break-words">
                        {english[currentIndex] || '\u00A0'}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="shrink-0 flex justify-center items-center gap-12 text-zinc-500 pt-8 pb-4">
                <button
                    onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                    className="p-4 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <div className="text-lg font-mono text-zinc-600 font-medium select-none">
                    {currentIndex + 1} <span className="text-zinc-700">/</span> {hanzi.length}
                </div>

                <button
                    onClick={() => setCurrentIndex(i => Math.min(i + 1, hanzi.length - 1))}
                    className="p-4 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                    disabled={currentIndex === hanzi.length - 1}
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
        </div>
    )
}
