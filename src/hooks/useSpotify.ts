'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getAuthUrl, extractTokenFromUrl } from '@/lib/spotify'

export type SpotifyState = {
    isConnected: boolean
    isPlaying: boolean
    track: {
        id: string
        name: string
        artist: string
        duration_ms: number
        albumArt: string | null
    } | null
    progress_ms: number,
    lastUpdated: number
}

interface SpotifyContextType {
    spotifyState: SpotifyState
    token: string | null
    login: () => void
    logout: () => void
    fetchState: () => Promise<void>
    isSpotifyMode: boolean
    setSpotifyMode: (mode: boolean) => void
    controlPlayback: (action: 'play' | 'pause' | 'seek' | 'next' | 'previous', value?: any) => Promise<void>
    searchSpotify: (query: string) => Promise<any[]>
    playTrack: (uri: string) => Promise<{ success: boolean; error?: string }>
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined)

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null)
    const [isSpotifyMode, setSpotifyMode] = useState(false)
    const [spotifyState, setSpotifyState] = useState<SpotifyState>({
        isConnected: false,
        isPlaying: false,
        track: null,
        progress_ms: 0,
        lastUpdated: 0
    })

    // Init token with expiration check
    useEffect(() => {
        const checkAndSetToken = () => {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null
            const expiration = typeof window !== 'undefined' ? localStorage.getItem('spotify_token_expiration') : null

            if (stored) {
                // Check if token has expired (Spotify tokens last 1 hour = 3600000ms)
                if (expiration) {
                    const expirationTime = parseInt(expiration, 10)
                    if (Date.now() > expirationTime) {
                        console.log('[Spotify] Token expired, clearing...')
                        localStorage.removeItem('spotify_access_token')
                        localStorage.removeItem('spotify_token_expiration')
                        return false // Token expired
                    }
                }

                setToken(stored)
                setSpotifyState(prev => ({ ...prev, isConnected: true }))

                // Validate token is actually still valid with API
                validateToken(stored)
                return true
            } else {
                // Check hash for new token from OAuth callback (legacy implicit grant)
                const extracted = extractTokenFromUrl()
                if (extracted) {
                    setToken(extracted)
                    localStorage.setItem('spotify_access_token', extracted)
                    // Set expiration to 55 minutes from now (conservative to avoid edge cases)
                    const expiresAt = Date.now() + (55 * 60 * 1000)
                    localStorage.setItem('spotify_token_expiration', expiresAt.toString())
                    window.history.replaceState(null, '', window.location.pathname) // Clean URL
                    setSpotifyState(prev => ({ ...prev, isConnected: true }))
                    return true
                }
            }
            return false
        }

        // Initial check
        const foundToken = checkAndSetToken()

        // If no token found initially, set up polling to catch token after OAuth redirect.
        // The callback page may still be exchanging the code for a token.
        let retryInterval: NodeJS.Timeout | undefined
        let retryCount = 0
        const maxRetries = 20 // Poll for up to 2 seconds (20 * 100ms)

        if (!foundToken) {
            retryInterval = setInterval(() => {
                retryCount++
                if (checkAndSetToken() || retryCount >= maxRetries) {
                    if (retryInterval) clearInterval(retryInterval)
                }
            }, 100)
        }

        // Listen for storage changes (fires when another tab updates localStorage)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'spotify_access_token' && e.newValue) {
                console.log('[Spotify] Token detected from storage event')
                setToken(e.newValue)
                setSpotifyState(prev => ({ ...prev, isConnected: true }))
                validateToken(e.newValue)
            }
        }

        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            if (retryInterval) clearInterval(retryInterval)
        }
    }, [])

    // Validate token is still valid by making a test API call
    const validateToken = async (tokenToValidate: string) => {
        try {
            const res = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${tokenToValidate}` }
            })

            if (res.status === 401) {
                console.log('[Spotify] Token validation failed - expired or revoked')
                // Clear token directly (don't call logout to avoid hoisting issues)
                setToken(null)
                localStorage.removeItem('spotify_access_token')
                localStorage.removeItem('spotify_token_expiration')
                setSpotifyMode(false)
                setSpotifyState({
                    isConnected: false,
                    isPlaying: false,
                    track: null,
                    progress_ms: 0,
                    lastUpdated: 0
                })
                return false
            }

            return res.ok
        } catch (e) {
            console.error('[Spotify] Token validation error:', e)
            return false
        }
    }

    const login = async () => {
        const url = await getAuthUrl()
        window.location.href = url
    }

    const logout = useCallback(() => {
        setToken(null)
        localStorage.removeItem('spotify_access_token')
        localStorage.removeItem('spotify_token_expiration')
        setSpotifyMode(false)
        setSpotifyState({
            isConnected: false,
            isPlaying: false,
            track: null,
            progress_ms: 0,
            lastUpdated: 0
        })
    }, [])

    const fetchState = useCallback(async () => {
        if (!token) return

        try {
            const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (res.status === 204) {
                setSpotifyState(prev => ({ ...prev, isPlaying: false }))
                return
            }

            if (res.status === 401) {
                // Token expired
                logout()
                return
            }

            const data = await res.json()
            setSpotifyState({
                isConnected: true,
                isPlaying: data.is_playing,
                track: data.item ? {
                    id: data.item.id,
                    name: data.item.name,
                    artist: data.item.artists[0].name,
                    duration_ms: data.item.duration_ms,
                    albumArt: data.item.album?.images?.[0]?.url || null
                } : null,
                progress_ms: data.progress_ms,
                lastUpdated: Date.now()
            })
        } catch (e) {
            console.error('Spotify Fetch Error', e)
        }
    }, [token])

    // Poll when in Spotify Mode or connected? 
    // If it's a global "Mode", we probably want to poll frequently when enabled.
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (token && isSpotifyMode) {
            fetchState()
            interval = setInterval(fetchState, 1000)
        }
        return () => clearInterval(interval)
    }, [token, isSpotifyMode, fetchState])

    const controlPlayback = useCallback(async (action: 'play' | 'pause' | 'seek' | 'next' | 'previous', value?: any) => {
        if (!token) return

        try {
            let endpoint = ''
            let method = 'POST' // Default to POST for next/prev
            let body = null

            if (action === 'play') {
                endpoint = 'https://api.spotify.com/v1/me/player/play'
                method = 'PUT'
            }
            else if (action === 'pause') {
                endpoint = 'https://api.spotify.com/v1/me/player/pause'
                method = 'PUT'
            }
            else if (action === 'seek') {
                endpoint = `https://api.spotify.com/v1/me/player/seek?position_ms=${value}`
                method = 'PUT'
            }
            else if (action === 'next') {
                endpoint = 'https://api.spotify.com/v1/me/player/next'
            }
            else if (action === 'previous') {
                endpoint = 'https://api.spotify.com/v1/me/player/previous'
            }

            await fetch(endpoint, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: body ? JSON.stringify(body) : undefined
            })

            setTimeout(fetchState, 300)
        } catch (e) {
            console.error('Spotify Control Error', e)
        }
    }, [token, fetchState])

    const searchSpotify = useCallback(async (query: string) => {
        if (!token) return []
        try {
            const params = new URLSearchParams({ q: query, type: 'track', limit: '5' })
            const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            // Handle expired token
            if (res.status === 401) {
                console.log('[Spotify] Search failed - token expired')
                logout()
                return []
            }

            const data = await res.json()
            return data.tracks?.items || []
        } catch (e) {
            console.error('Search Error', e)
            return []
        }
    }, [token, logout])

    const playTrack = useCallback(async (uri: string): Promise<{ success: boolean; error?: string }> => {
        if (!token) return { success: false, error: 'Not connected to Spotify' }
        try {
            const res = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uris: [uri] })
            })

            // Handle expired token
            if (res.status === 401) {
                console.log('[Spotify] Play failed - token expired')
                logout()
                return { success: false, error: 'Session expired. Please reconnect to Spotify.' }
            }

            if (res.status === 404) {
                return { success: false, error: 'No active Spotify player found. Please open Spotify on your device first.' }
            }
            if (res.status === 403) {
                return { success: false, error: 'Spotify Premium is required for playback control.' }
            }
            if (!res.ok) {
                return { success: false, error: `Spotify error: ${res.status}` }
            }

            setTimeout(fetchState, 500)
            return { success: true }
        } catch (e) {
            console.error('Play Track Error', e)
            return { success: false, error: 'Failed to connect to Spotify' }
        }
    }, [token, fetchState, logout])

    const value = useMemo(() => ({
        spotifyState,
        token,
        login,
        logout,
        fetchState,
        isSpotifyMode,
        setSpotifyMode,
        controlPlayback,
        searchSpotify,
        playTrack
    }), [spotifyState, token, login, logout, fetchState, isSpotifyMode, setSpotifyMode, controlPlayback, searchSpotify, playTrack])

    return React.createElement(SpotifyContext.Provider, { value }, children)
}

export function useSpotify() {
    const context = useContext(SpotifyContext)
    if (context === undefined) {
        throw new Error('useSpotify must be used within a SpotifyProvider')
    }
    return context
}
