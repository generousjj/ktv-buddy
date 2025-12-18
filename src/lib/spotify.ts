export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '875075bf34744076b7e4a1007ab0d832'
export const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3001/callback'

export const SCOPES = [
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-modify-playback-state'
]

const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const values = crypto.getRandomValues(new Uint8Array(length))
    return values.reduce((acc, x) => acc + possible[x % possible.length], "")
}

const sha256 = async (plain: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input: ArrayBuffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
}

export const getAuthUrl = async () => {
    const codeVerifier = generateRandomString(64)
    const hashed = await sha256(codeVerifier)
    const codeChallenge = base64encode(hashed)

    if (typeof window !== 'undefined') {
        localStorage.setItem('spotify_code_verifier', codeVerifier)
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SCOPES.join(' '),
        show_dialog: 'true',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    })
    return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export const extractTokenFromUrl = () => {
    // Legacy support for implicit grant (mostly unused now but harmless)
    if (typeof window === 'undefined') return null
    const hash = window.location.hash
    if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        return params.get('access_token')
    }
    return null
}

export const exchangeToken = async (code: string) => {
    const codeVerifier = localStorage.getItem('spotify_code_verifier')
    if (!codeVerifier) {
        throw new Error('Code verifier missing')
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: codeVerifier
    })

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    })

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data.error_description || 'Failed to exchange token')
    }

    return data as { access_token: string; refresh_token?: string; expires_in: number }
}
