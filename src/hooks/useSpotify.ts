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

    // Init token
    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null
        if (stored) {
            setToken(stored)
            setSpotifyState(prev => ({ ...prev, isConnected: true }))
        } else {
            // Check hash
            const extracted = extractTokenFromUrl()
            if (extracted) {
                setToken(extracted)
                localStorage.setItem('spotify_access_token', extracted)
                window.history.replaceState(null, '', window.location.pathname) // Clean URL
                setSpotifyState(prev => ({ ...prev, isConnected: true }))
            }
        }
    }, [])

    const login = async () => {
        const url = await getAuthUrl()
        window.location.href = url
    }

    const logout = () => {
        setToken(null)
        localStorage.removeItem('spotify_access_token')
        setSpotifyMode(false)
        setSpotifyState({
            isConnected: false,
            isPlaying: false,
            track: null,
            progress_ms: 0,
            lastUpdated: 0
        })
    }

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
            const data = await res.json()
            return data.tracks?.items || []
        } catch (e) {
            console.error('Search Error', e)
            return []
        }
    }, [token])

    const playTrack = useCallback(async (uri: string): Promise<{ success: boolean; error?: string }> => {
        if (!token) return { success: false, error: 'Not connected to Spotify' }
        try {
            const res = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uris: [uri] })
            })

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
    }, [token, fetchState])

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
