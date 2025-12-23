'use client'

import { Coffee } from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function KofiWidget({ inline = false, label = true }: { inline?: boolean, label?: boolean }) {
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const pathname = usePathname()

    // Logic: 
    // 1. Inline mode: Always visible, static styling for Sidebar
    // 2. Floating mode (default):
    //    - Landing page (/): Visible on Mobile & Desktop
    //    - App pages (/app...): Visible ONLY on Mobile (hidden on desktop to avoid blocking)

    const isAppPage = pathname?.startsWith('/app')

    useEffect(() => {
        if (inline) {
            setIsVisible(true)
            return
        }
        const timer = setTimeout(() => setIsVisible(true), 2000)
        return () => clearTimeout(timer)
    }, [inline])

    // Inline render (for Sidebar)
    if (inline) {
        return (
            <a
                href="https://ko-fi.com/R5R04Z45J"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/50 transition-colors group"
                aria-label="Buy me a coffee"
            >
                <Coffee className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                {label && <span className="text-xs font-medium">Buy me a coffee</span>}
            </a>
        )
    }

    // Floating render
    return (
        <a
            href="https://ko-fi.com/R5R04Z45J"
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
                "fixed z-50 transition-all duration-300 ease-in-out flex items-center gap-2 shadow-lg hover:shadow-xl",
                // Desktop positioning
                "md:bottom-8 md:left-8",
                // Mobile positioning
                "bottom-20 left-4",
                // Appearance
                "bg-emerald-500 text-white rounded-full p-3 md:py-2 md:px-4",
                // Animation
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
                isHovered ? "scale-105" : "scale-100",
                // HIDE on Desktop if we are on an App Page
                isAppPage ? "md:hidden" : ""
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Buy me a coffee"
        >
            <div className="relative">
                <Coffee className="w-5 h-5 md:w-5 md:h-5" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                </span>
            </div>
            <span className={clsx(
                "font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                // Text visibility toggles
                "hidden md:inline-block"
            )}>
                Buy me a coffee
            </span>
            <span className="md:hidden text-xs font-bold pl-1 pr-1">
                Support
            </span>
        </a>
    )
}
