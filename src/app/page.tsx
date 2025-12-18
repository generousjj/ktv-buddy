'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Music, Mic, Wand2, Smartphone, Headphones } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'
import { useSpotify } from '@/hooks/useSpotify'

export default function LandingPage() {
  const { t, locale } = useLanguage()
  const { setSpotifyMode } = useSpotify()

  // Ensure Spotify mode is OFF when landing on the home page
  useEffect(() => {
    setSpotifyMode(false)
  }, [setSpotifyMode])

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto w-full z-10 relative">
        <div className="flex items-center gap-2">
          <Music className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight">{t('app.title')}</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/app"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full font-medium transition-all min-w-[140px] text-center"
          >
            {t('landing.cta.start')}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">

          <Image
            src="/hero-bg.png"
            alt="Background"
            fill
            className="object-cover opacity-30 select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/60 to-zinc-950" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t('landing.badge')}
            <Image
              src="/ktv-buddy.png"
              alt="KTV Buddy mascot"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            {t('landing.hero.title')} <br />
            <span className="text-emerald-400">{t('landing.hero.subtitle')}</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.desc.p1')}
            {(locale === 'zh-CN' || locale === 'zh-TW') ? <br /> : ' '}
            {t('landing.hero.desc.p2')}
            <span className="text-white font-medium"> {t('landing.hero.desc.pinyin')}</span> {locale === 'en' ? 'and' : locale === 'zh-CN' ? '和' : '和'}
            <span className="text-white font-medium"> {t('landing.hero.desc.english')}</span> {t('landing.hero.desc.suffix')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/app"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-emerald-500 px-8 font-medium text-white transition-all duration-300 hover:bg-emerald-600 hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(16,185,129,0.3)]"
            >
              <span className="mr-2">{t('landing.cta.start')}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full px-8 font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
            >
              {t('landing.cta.learn')}
            </Link>
          </div>

          {/* Visual Demo Card */}
          <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-sm max-w-sm mx-auto shadow-2xl shadow-black/50 hover:scale-105 transition-transform duration-500">
            <div className="space-y-2 text-center">
              <p className="text-emerald-400 font-mono text-sm tracking-wide">yuè liang dài biǎo wǒ de xīn</p>
              <h3 className="text-3xl font-bold text-white">月亮代表我的心</h3>
              <p className="text-zinc-500 text-sm">The moon represents my heart</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Mic,
                title: t('landing.features.smart.title'),
                description: t('landing.features.smart.desc')
              },
              {
                icon: Wand2,
                title: t('landing.features.sync.title'),
                description: t('landing.features.sync.desc')
              },
              {
                icon: Headphones,
                title: t('landing.features.spotify.title'),
                description: t('landing.features.spotify.desc')
              },
              {
                icon: Smartphone,
                title: t('landing.features.mobile.title'),
                description: t('landing.features.mobile.desc')
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/app"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-emerald-500 px-8 font-medium text-white transition-all duration-300 hover:bg-emerald-600 hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(16,185,129,0.3)]"
            >
              <span className="mr-2">{t('landing.cta.start')}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-600 text-sm border-t border-zinc-900">
        <p>&copy; {new Date().getFullYear()} {t('app.title')}. {t('landing.footer.allRightsReserved')}</p>
      </footer>
    </div>
  )
}
