'use client'

import { Coffee } from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'

export function KofiWidget() {
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 2000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            <a
                href="https://ko-fi.com/R5R04Z45J"
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                    // Mobile Only - Hidden on Desktop
                    "md:hidden",
                    "fixed z-50 transition-all duration-300 ease-in-out flex items-center gap-2 shadow-lg hover:shadow-xl",
                    "bottom-20 left-4",
                    "bg-emerald-500 text-white rounded-full p-3",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
                    isHovered ? "scale-105" : "scale-100"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label="Buy me a coffee"
            >
                <div className="relative">
                    <Coffee className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                    </span>
                </div>
                <span className={clsx(
                    "font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                    isHovered ? "max-w-[150px] ml-2" : "max-w-0 ml-0"
                )}>
                    Buy me a coffee
                </span>
            </a>
        </>
    )
}
