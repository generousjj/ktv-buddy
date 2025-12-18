'use client'

import React from 'react'
import { Music2, LogOut, Check, X } from 'lucide-react'
import { SpotifyState } from '@/hooks/useSpotify'

interface SpotifyControlProps {
    spotifyState: SpotifyState
    onLogin: () => void
    onLogout: () => void
    isSpotifyMode: boolean
    onToggleMode: (val: boolean) => void
}

export function SpotifyControl({ spotifyState, onLogin, onLogout, isSpotifyMode, onToggleMode }: SpotifyControlProps) {
    if (!spotifyState.isConnected) {
        return (
            <button
                onClick={onLogin}
                className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-1.5 px-3 rounded-full text-xs transition-colors shrink-0 cursor-pointer"
            >
                <Music2 className="w-4 h-4" />
                Connect Spotify
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2 bg-zinc-900 rounded-full p-1 pl-3 border border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Music2 className={`w-4 h-4 ${isSpotifyMode ? 'text-[#1DB954]' : 'text-zinc-500'}`} />
                <span className="hidden md:inline font-medium">Spotify Mode</span>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700 mx-1" />

            {/* Toggle */}
            <button
                onClick={() => onToggleMode(!isSpotifyMode)}
                className={`relative w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${isSpotifyMode ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}
            >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isSpotifyMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>

            {/* Info / Logout */}
            <button onClick={onLogout} className="ml-1 p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors cursor-pointer" title="Disconnect">
                <LogOut className="w-3 h-3" />
            </button>
        </div>
    )
}
