'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { extractTokenFromUrl, exchangeToken } from '@/lib/spotify'

export default function CallbackPage() {
    const router = useRouter()

    // Prevent double execution in Strict Mode
    const processingRef = useRef(false)

    useEffect(() => {
        const handleAuth = async () => {
            if (processingRef.current) return
            processingRef.current = true

            // Check for PKCE Code
            const params = new URLSearchParams(window.location.search)
            const code = params.get('code')

            // Debug: Log the verifier
            const verifier = localStorage.getItem('spotify_code_verifier')
            console.log('[Callback] Code:', code?.substring(0, 20) + '...', 'Verifier:', verifier?.substring(0, 20) + '...')

            // Check Legacy Hash
            const urlToken = extractTokenFromUrl()

            // Check Storage
            const storedToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null

            // Prefer Code Exchange First
            if (code) {
                if (!verifier) {
                    console.error('[Callback] No code_verifier found! Auth will fail.')
                    // Try to recover by redirecting to login again
                    router.push('/app')
                    return
                }

                try {
                    const data = await exchangeToken(code)
                    localStorage.setItem('spotify_access_token', data.access_token)
                    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token)

                    // Store expiration time (expires_in is in seconds, use 55 min conservatively)
                    const expiresAt = Date.now() + (55 * 60 * 1000)
                    localStorage.setItem('spotify_token_expiration', expiresAt.toString())

                    // Clear the verifier after successful exchange
                    localStorage.removeItem('spotify_code_verifier')

                    console.log('[Callback] Token exchange successful!')
                    router.push('/app')
                    return
                } catch (e) {
                    console.error('Token Exchange Failed', e)
                    // Clear the verifier so user can try again
                    localStorage.removeItem('spotify_code_verifier')
                    // Fallthrough to stored/legacy checks
                }
            }

            const validToken = urlToken || storedToken
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
    }, [router]) // Removed contextToken to prevent re-runs

    return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">
            <p>Connecting to Spotify...</p>
        </div>
    )
}
