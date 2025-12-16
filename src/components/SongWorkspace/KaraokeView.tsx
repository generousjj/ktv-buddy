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
        <div className="h-full flex flex-col items-center justify-center p-8 bg-black relative">
            <div className="text-center space-y-8 max-w-4xl w-full">

                <div className="space-y-6">
                    {/* Pinyin */}
                    <p className="text-3xl md:text-4xl text-emerald-400 font-mono opacity-90 transition-all duration-300 min-h-[3rem]">
                        {pinyin[currentIndex] || '\u00A0'}
                    </p>

                    {/* Hanzi */}
                    <h2 className="text-6xl md:text-8xl font-black text-white tracking-wide transition-all duration-300 min-h-[6rem]">
                        {hanzi[currentIndex] || ''}
                    </h2>

                    {/* English */}
                    <p className="text-2xl md:text-3xl text-zinc-400 font-light transition-all duration-300 min-h-[2.5rem]">
                        {english[currentIndex] || '\u00A0'}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 text-zinc-500">
                <button onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))} className="p-4 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <div className="text-sm font-mono text-zinc-600">
                    {currentIndex + 1} / {hanzi.length}
                </div>

                <button onClick={() => setCurrentIndex(i => Math.min(i + 1, hanzi.length - 1))} className="p-4 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
        </div>
    )
}
