'use client'

import Link from 'next/link'
import { Music } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export function MobileHeader() {
    const { t } = useLanguage()

    return (
        <div className="md:hidden flex items-center px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
            <Link href="/" className="flex items-center gap-2">
                <Music className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-lg tracking-tight text-white">{t('app.title')}</span>
            </Link>
        </div>
    )
}
