'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, PlusCircle, Settings, Music } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/lib/i18n'

export function Sidebar() {
    const pathname = usePathname()
    const { t } = useLanguage()

    const navItems = [
        { href: '/app', label: t('nav.library'), icon: Library },
        { href: '/app/new', label: t('nav.newSong'), icon: PlusCircle },
    ]

    // Simple active check: strictly equal or starts with for sub-routes?
    // For now simple checks.
    const isActive = (href: string) => {
        if (href === '/app') return pathname === '/app'
        return pathname.startsWith(href)
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-100 flex-col h-screen fixed left-0 top-0 z-50">
                <Link href="/" className="p-6 flex items-center gap-2 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <Music className="w-6 h-6 text-emerald-400" />
                    <h1 className="font-bold text-lg tracking-tight">{t('app.title')}</h1>
                </Link>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-zinc-800 text-emerald-400'
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
                    {t('app.title')} v0.1
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 z-50 flex items-center justify-around px-2 pb-safe">
                {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'flex flex-col items-center justify-center p-2 rounded-md transition-colors w-full',
                                active
                                    ? 'text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}
