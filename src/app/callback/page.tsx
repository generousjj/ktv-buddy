'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { extractTokenFromUrl, exchangeToken } from '@/lib/spotify'
import { useSpotify } from '@/hooks/useSpotify'

export default function CallbackPage() {
    const router = useRouter()

    const { token: contextToken } = useSpotify()

    // Prevent double execution in Strict Mode
    const processingRef = useRef(false)

    useEffect(() => {
        const handleAuth = async () => {
            if (processingRef.current) return
            processingRef.current = true

            // Check for PKCE Code
            const params = new URLSearchParams(window.location.search)
            const code = params.get('code')

            // Check Legacy Hash
            const urlToken = extractTokenFromUrl()

            // Check Storage
            const storedToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null

            // Prefer Code Exchange First
            if (code) {
                try {
                    const data = await exchangeToken(code)
                    localStorage.setItem('spotify_access_token', data.access_token)
                    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token)

                    // Cleanup URL to avoid re-use attempts on refresh? Maybe not needed as we redirect.
                    router.push('/app')
                    return
                } catch (e) {
                    console.error('Token Exchange Failed', e)
                    // Fallthrough to stored/legacy checks
                }
            }

            const validToken = urlToken || contextToken || storedToken
            if (validToken) {
                if (urlToken) localStorage.setItem('spotify_access_token', urlToken)
                router.push('/app')
            } else {
                if (params.get('error')) {
                    console.error('Spotify Auth Error:', params.get('error'))
                } else {
                    if (!code) console.error('No token found in callback. Hash:', window.location.hash)
                }
                router.push('/')
            }
        }

        handleAuth()
    }, [router, contextToken])

    return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">
            <p>Connecting to Spotify...</p>
        </div>
    )
}
