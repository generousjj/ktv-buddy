'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function KaraokeView({ hanzi, pinyin, english }: { hanzi: string[], pinyin: string[], english: string[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scale, setScale] = useState(1)
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Handle spacebar / arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    // Scale Logic
    useLayoutEffect(() => {
        const adjustScale = () => {
            if (containerRef.current && contentRef.current) {
                // Reset to 1 to measure natural size
                // We set it via style direct manipulation to avoid render cycle loop issues if measuring checks current style
                // but since we read 'scale' state in render, we assume render is clean.
                // However, measuring getBoundingClientRect() respects current transform.
                // So we MUST compute based on unscaled.

                // Get container dimensions
                const { width: filesW, height: containerH } = containerRef.current.getBoundingClientRect()

                // Temporarily remove transform to measure content's intrinsic size
                contentRef.current.style.transform = 'none'
                const { width: contentW, height: contentH } = contentRef.current.getBoundingClientRect()

                // Restore logic (React will apply via style prop next, but for now...)

                const padding = 40
                const availableH = containerH - padding
                const availableW = filesW - padding // Use filesW (container width)

                const scaleH = availableH / contentH
                const scaleW = availableW / contentW

                // Scale down if needed, but max 1
                const newScale = Math.min(1, scaleH, scaleW)

                setScale(newScale)
            }
        }

        adjustScale()
        window.addEventListener('resize', adjustScale)
        return () => window.removeEventListener('resize', adjustScale)
    }, [currentIndex, hanzi, pinyin, english])

    return (
        <div className="h-full flex flex-col items-center justify-between p-8 bg-black">
            {/* Scalable Container */}
            <div ref={containerRef} className="flex-1 flex items-center justify-center w-full max-w-6xl mx-auto min-h-0 overflow-hidden relative">
                <div
                    ref={contentRef}
                    className="flex flex-col gap-6 md:gap-10 items-center justify-center text-center w-max origin-center"
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Pinyin */}
                    <p className="text-3xl md:text-5xl text-emerald-400 font-mono opacity-90 leading-relaxed whitespace-pre">
                        {pinyin[currentIndex] || '\u00A0'}
                    </p>

                    {/* Hanzi */}
                    <h2 className="text-7xl md:text-9xl font-black text-white tracking-wide leading-tight whitespace-pre py-2">
                        {hanzi[currentIndex] || ''}
                    </h2>

                    {/* English */}
                    <p className="text-2xl md:text-4xl text-zinc-400 font-light leading-relaxed whitespace-pre">
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
