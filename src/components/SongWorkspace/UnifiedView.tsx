'use client'

import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { cn } from '@/lib/utils'

export function UnifiedView({ hanzi, pinyin, english }: { hanzi: string[], pinyin: string[], english: string[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => {
        // Scroll active item into view
        if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            })
        }
    }, [activeIndex])

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing in input (but there are no inputs here)
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault()
            setActiveIndex(prev => Math.min(prev + 1, hanzi.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => Math.max(prev - 1, 0))
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [hanzi.length])

    return (
        <div className="h-full overflow-y-auto bg-zinc-950 px-4 py-20 pb-[50vh] scroll-smooth select-none">
            <div className="max-w-2xl mx-auto space-y-8">
                {hanzi.map((line, i) => {
                    const isActive = i === activeIndex

                    return (
                        <div
                            key={i}
                            ref={el => { itemRefs.current[i] = el }}
                            onClick={() => setActiveIndex(i)}
                            className={cn(
                                "cursor-pointer transition-all duration-300 rounded-xl p-6 border-2",
                                isActive
                                    ? "bg-zinc-900 border-emerald-500/50 scale-105 shadow-2xl shadow-black"
                                    : "bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-zinc-900/30"
                            )}
                        >
                            <div className="space-y-2 text-center">
                                {/* Pinyin */}
                                <p className={cn(
                                    "font-mono text-emerald-400 transition-all",
                                    isActive ? "text-base md:text-lg opacity-100" : "text-xs md:text-sm opacity-70"
                                )}>
                                    {pinyin[i] || '\u00A0'}
                                </p>

                                {/* Hanzi */}
                                <h3 className={cn(
                                    "font-bold text-white transition-all leading-relaxed",
                                    isActive ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"
                                )}>
                                    {line || '\u00A0'}
                                </h3>

                                {/* English */}
                                <p className={cn(
                                    "text-zinc-400 transition-all font-light",
                                    isActive ? "text-lg md:text-xl" : "text-sm md:text-base"
                                )}>
                                    {english[i] || '\u00A0'}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
