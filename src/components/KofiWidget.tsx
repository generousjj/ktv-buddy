'use client'

import Script from 'next/script'

export function KofiWidget() {
    return (
        <Script
            id="kofi-widget-script"
            src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'
            strategy="afterInteractive"
            onLoad={() => {
                // @ts-ignore
                if (window.kofiwidget2) {
                    // @ts-ignore
                    window.kofiwidget2.init('Buy me a coffee', '#10b981', 'R5R04Z45J')
                    // @ts-ignore
                    window.kofiwidget2.draw()
                }
            }}
        />
    )
}
