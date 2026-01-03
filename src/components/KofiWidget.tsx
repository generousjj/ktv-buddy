'use client'

import { Coffee } from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface KofiWidgetProps {
    variant?: 'floating' | 'sidebar'
    className?: string
}

export function KofiWidget({ variant = 'floating', className }: KofiWidgetProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const pathname = usePathname()

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Delay appearance slightly for floating widget
    useEffect(() => {
        if (variant === 'floating') {
            const timer = setTimeout(() => setIsVisible(true), 2000)
            return () => clearTimeout(timer)
        } else {
            setIsVisible(true)
        }
    }, [variant])

    const href = "https://ko-fi.com/R5R04Z45J"

    if (variant === 'sidebar') {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                    "flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/50 rounded-md transition-colors text-xs font-medium group",
                    className
                )}
            >
                <Coffee className="w-4 h-4" />
                <span>Buy me a coffee</span>
            </a>
        )
    }

    // Hide floating widget on mobile /song pages entirely (not just CSS)
    // Route is /app/song/[id] so check for /app/song
    if (isMobile && pathname?.startsWith('/app/song')) {
        return null
    }

    // Floating variant
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
                "fixed z-50 transition-all duration-300 ease-in-out flex items-center gap-2 shadow-lg hover:shadow-xl",
                // Mobile positioning (higher to avoid bottom nav)
                "bottom-20 left-4",
                // Appearance
                "bg-emerald-500 text-white rounded-full p-3",
                // Animation
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
                isHovered ? "scale-105" : "scale-100",
                className
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
            {/* Mobile Only Label - subtle */}
            <span className="text-xs font-bold pl-1 pr-1">
                Support
            </span>
        </a>
    )
}
