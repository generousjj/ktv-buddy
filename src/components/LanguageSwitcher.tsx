'use client'

import { useLanguage } from '@/lib/i18n'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage()

    const cycleLanguage = () => {
        if (locale === 'en') setLocale('zh-CN')
        else if (locale === 'zh-CN') setLocale('zh-TW')
        else setLocale('en')
    }

    const labels = {
        'en': 'EN',
        'zh-CN': '简',
        'zh-TW': '繁'
    }

    return (
        <button
            onClick={cycleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            title="Switch Language"
        >
            <Languages className="w-3.5 h-3.5" />
            <span>{labels[locale]}</span>
        </button>
    )
}
