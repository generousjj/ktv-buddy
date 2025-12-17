'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Locale = 'en' | 'zh-CN' | 'zh-TW'

type TranslationKey =
    | 'app.title'
    | 'nav.landing'
    | 'nav.library'
    | 'nav.newSong'
    | 'landing.hero.title'
    | 'landing.hero.subtitle'
    | 'landing.cta.start'
    | 'landing.cta.learn'
    | 'library.mySongs'
    | 'library.search'
    | 'library.empty'
    | 'song.editor'
    | 'song.unified'
    | 'song.karaoke'
    | 'song.export'
    | 'song.save'
    | 'song.saving'
    | 'song.regenerate'
    | 'song.delete'
    | 'song.deleteConfirm.title'
    | 'song.deleteConfirm.desc'
    | 'common.confirm'
    | 'common.cancel'
    | 'common.loading'

const translations: Record<Locale, Record<string, string>> = {
    'en': {
        'app.title': 'KTV Buddy',
        'nav.landing': 'Home',
        'nav.library': 'My Songs',
        'nav.newSong': 'New Song',
        'landing.badge': 'v0.1 Beta Now Live',
        'landing.hero.title': 'Master Chinese Songs',
        'landing.hero.subtitle': 'Word by Word',
        'landing.hero.desc.p1': 'The ultimate tool for learning and singing.',
        'landing.hero.desc.p2': 'Automatically generate',
        'landing.hero.desc.pinyin': 'Pinyin',
        'landing.hero.desc.english': 'English',
        'landing.hero.desc.suffix': 'translations for any Chinese lyrics.',
        'landing.cta.start': 'Start Singing',
        'landing.cta.learn': 'Learn More',
        'landing.features.smart.title': 'Smart Translations',
        'landing.features.smart.desc': 'Instantly convert Chinese lyrics into Pinyin with accurate tone marks and English translations.',
        'landing.features.sync.title': 'AI-Assisted Sync',
        'landing.features.sync.desc': 'Powerful tools to help you synchronize lyrics to music with precision timing.',
        'landing.features.mobile.title': 'Mobile Ready',
        'landing.features.mobile.desc': 'Control your session from any device with our responsive, mobile-first design.',
        'landing.footer.allRightsReserved': 'All rights reserved.',
        'library.mySongs': 'My Songs',
        'library.search': 'Search Pinyin...',
        'library.empty': 'No songs found. Create one!',
        'song.editor': 'Editor',
        'song.unified': 'Sync View',
        'song.karaoke': 'Karaoke',
        'song.export': 'Export',
        'song.save': 'Save',
        'song.saving': 'Saving...',
        'song.regenerate': 'Regenerate',
        'song.delete': 'Delete Song',
        'song.deleteConfirm.title': 'Delete Song',
        'song.deleteConfirm.desc': 'Are you sure you want to delete this song? This action cannot be undone.',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'unified.syncAvailable': 'Sync available! Add audio to enable auto-play.',
        'unified.addYoutube': 'Add YouTube URL',
        'unified.pasteUrl': 'Paste YouTube URL...',
        'unified.noAudio': 'No Audio Source',
        'unified.linked': 'Linked',
        'unified.timerMode': 'Without audio, the player will run as a timer. Add a URL to sync with music.',
        'unified.intro': 'Introduction Playing...',
        'newSong.tab.search': 'Search Song',
        'newSong.tab.paste': 'Paste Lyrics',
        'newSong.title': 'Title (Optional)',
        'newSong.artist': 'Artist (Optional)',
        'newSong.lyrics': 'Lyrics (Chinese)',
        'newSong.placeholder.title': 'Song Title',
        'newSong.placeholder.artist': 'Artist Name',
        'newSong.placeholder.lyrics': 'Paste Chinese lyrics here...',
        'newSong.placeholder.search': 'Search Title or Artist...',
        'newSong.submit': 'Generate & Save',
        'newSong.searchBtn': 'Search',
        'newSong.select': 'Select',
        'newSong.synced': 'Synced',
        'newSong.error.noLyrics': 'No valid lyrics found.',
        'newSong.processing': 'Processing...',
        'newSong.noResults': 'No results found.'
    },
    'zh-CN': {
        'app.title': 'KTV 助手',
        'nav.landing': '首页',
        'nav.library': '我的歌库',
        'nav.newSong': '新建歌曲',
        'landing.badge': 'v0.1 测试版已上线',
        'landing.hero.title': '精通中文歌曲',
        'landing.hero.subtitle': '逐字逐句',
        'landing.hero.desc.p1': '学习唱歌的终极工具。',
        'landing.hero.desc.p2': '自动为任何中文歌词生成',
        'landing.hero.desc.pinyin': '拼音',
        'landing.hero.desc.english': '英文',
        'landing.hero.desc.suffix': '翻译。',
        'landing.cta.start': '开始欢唱',
        'landing.cta.learn': '了解更多',
        'landing.features.smart.title': '智能翻译',
        'landing.features.smart.desc': '即时将中文歌词转换为带准确声调的拼音和英文翻译。',
        'landing.features.sync.title': 'AI 辅助同步',
        'landing.features.sync.desc': '强大的工具帮助您精确地将歌词与音乐同步。',
        'landing.features.mobile.title': '移动端就绪',
        'landing.features.mobile.desc': '通过我们响应式的移动优先设计，在任何设备上控制您的会话。',
        'landing.footer.allRightsReserved': '保留所有权利。',
        'library.mySongs': '我的歌库',
        'library.search': '搜索拼音...',
        'library.empty': '暂无歌曲，快去创建吧！',
        'song.editor': '编辑',
        'song.unified': '同步视图',
        'song.karaoke': '卡拉OK',
        'song.export': '导出',
        'song.save': '保存',
        'song.saving': '保存中...',
        'song.regenerate': '重新生成',
        'song.delete': '删除歌曲',
        'song.deleteConfirm.title': '删除歌曲',
        'song.deleteConfirm.desc': '确定要删除这首歌吗？此操作无法撤销。',
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.loading': '加载中...',
        'common.save': '保存',
        'unified.syncAvailable': '歌词已同步！添加音频以启用自动播放。',
        'unified.addYoutube': '添加 YouTube 链接',
        'unified.pasteUrl': '粘贴 YouTube 链接...',
        'unified.noAudio': '无音频源',
        'unified.linked': '已链接',
        'unified.timerMode': '无音频时，播放器将作为计时器运行。添加链接以同步音乐。',
        'unified.intro': '前奏播放中...',
        'newSong.tab.search': '搜索歌曲',
        'newSong.tab.paste': '粘贴歌词',
        'newSong.title': '标题（可选）',
        'newSong.artist': '艺术家（可选）',
        'newSong.lyrics': '歌词（中文）',
        'newSong.placeholder.title': '歌曲标题',
        'newSong.placeholder.artist': '艺术家名字',
        'newSong.placeholder.lyrics': '在此粘贴中文歌词...',
        'newSong.placeholder.search': '搜索标题或艺术家...',
        'newSong.submit': '生成并保存',
        'newSong.searchBtn': '搜索',
        'newSong.select': '选择',
        'newSong.synced': '已同步',
        'newSong.error.noLyrics': '未找到有效歌词。',
        'newSong.processing': '处理中...',
        'newSong.noResults': '未找到结果。'
    },
    'zh-TW': {
        'app.title': 'KTV 助手',
        'nav.landing': '首頁',
        'nav.library': '我的歌庫',
        'nav.newSong': '新建歌曲',
        'landing.badge': 'v0.1 測試版已上線',
        'landing.hero.title': '精通中文歌曲',
        'landing.hero.subtitle': '逐字逐句',
        'landing.hero.desc.p1': '學習唱歌的終極工具。',
        'landing.hero.desc.p2': '自動為任何中文歌詞生成',
        'landing.hero.desc.pinyin': '拼音',
        'landing.hero.desc.english': '英文',
        'landing.hero.desc.suffix': '翻譯。',
        'landing.cta.start': '開始歡唱',
        'landing.cta.learn': '了解更多',
        'landing.features.smart.title': '智能翻譯',
        'landing.features.smart.desc': '即時將中文歌詞轉換為帶準確聲調的拼音和英文翻譯。',
        'landing.features.sync.title': 'AI 輔助同步',
        'landing.features.sync.desc': '強大的工具幫助您精確地將歌詞與音樂同步。',
        'landing.features.mobile.title': '移動端就緒',
        'landing.features.mobile.desc': '通過我們響應式的移動優先設計，在任何設備上控制您的會話。',
        'landing.footer.allRightsReserved': '保留所有權利。',
        'library.mySongs': '我的歌庫',
        'library.search': '搜尋拼音...',
        'library.empty': '暫無歌曲，快去創建吧！',
        'song.editor': '編輯',
        'song.unified': '同步視圖',
        'song.karaoke': '卡拉OK',
        'song.export': '匯出',
        'song.save': '保存',
        'song.saving': '保存中...',
        'song.regenerate': '重新生成',
        'song.delete': '刪除歌曲',
        'song.deleteConfirm.title': '刪除歌曲',
        'song.deleteConfirm.desc': '確定要刪除這首歌嗎？此操作無法撤銷。',
        'common.confirm': '確認',
        'common.cancel': '取消',
        'common.loading': '載入中...',
        'common.save': '保存',
        'unified.syncAvailable': '歌詞已同步！添加音頻以啟用自動播放。',
        'unified.addYoutube': '添加 YouTube 連結',
        'unified.pasteUrl': '貼上 YouTube 連結...',
        'unified.noAudio': '無音頻源',
        'unified.linked': '已連結',
        'unified.timerMode': '無音頻時，播放器將作為計時器運行。添加連結以同步音樂。',
        'unified.intro': '前奏播放中...',
        'newSong.tab.search': '搜尋歌曲',
        'newSong.tab.paste': '貼上歌詞',
        'newSong.title': '標題（可選）',
        'newSong.artist': '藝術家（可選）',
        'newSong.lyrics': '歌詞（中文）',
        'newSong.placeholder.title': '歌曲標題',
        'newSong.placeholder.artist': '藝術家名字',
        'newSong.placeholder.lyrics': '在此貼上中文歌詞...',
        'newSong.placeholder.search': '搜尋標題或藝術家...',
        'newSong.submit': '生成並保存',
        'newSong.searchBtn': '搜尋',
        'newSong.select': '選擇',
        'newSong.synced': '已同步',
        'newSong.error.noLyrics': '未找到有效歌詞。',
        'newSong.processing': '處理中...',
        'newSong.noResults': '未找到結果。'
    }
}

interface LanguageContextType {
    locale: Locale
    setLocale: (mode: Locale) => void
    t: (key: TranslationKey | string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en')

    useEffect(() => {
        // Check URL params first
        const params = new URLSearchParams(window.location.search)
        const langParam = params.get('lang') || params.get('locale')

        let initial: Locale | null = null
        if (langParam === 'zh-CN' || langParam === 'zh-TW' || langParam === 'en') {
            initial = langParam as Locale
        }

        if (initial) {
            setLocaleState(initial)
            localStorage.setItem('ktv-locale', initial)
        } else {
            const saved = localStorage.getItem('ktv-locale') as Locale
            if (saved && (saved === 'en' || saved === 'zh-CN' || saved === 'zh-TW')) {
                setLocaleState(saved)
            }
        }
    }, [])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('ktv-locale', newLocale)
    }

    const t = (key: string): string => {
        return translations[locale][key] || key
    }

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
