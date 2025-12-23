'use client'

import { useEffect } from 'react'

export function KofiWidget() {
    useEffect(() => {
        // Prevent duplicate script injection
        if (document.getElementById('kofi-script')) return

        const script = document.createElement('script')
        script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js'
        script.id = 'kofi-script'
        script.async = true

        script.onload = () => {
            // @ts-ignore
            if (window.kofiwidget2) {
                // @ts-ignore
                window.kofiwidget2.init('Support me on Ko-fi', '#10b981', 'R5R04Z45J')
                // @ts-ignore
                window.kofiwidget2.draw()
            }
        }

        document.body.appendChild(script)

        // Helper to move widget on mobile if it overlaps
        // We do this via CSS preferably, but we can also check here
    }, [])

    return null
}
