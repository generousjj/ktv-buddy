import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { pinyin } from 'pinyin-pro'
import { translate } from 'google-translate-api-x'

const generateSchema = z.object({
    hanziLines: z.array(z.string()).optional(),
    title: z.string().optional(),
    artist: z.string().optional(),
    options: z.object({
        toneNumbers: z.boolean().optional(),
    }).optional()
})

export async function POST(req: Request) {
    let body
    try {
        body = await req.json()
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    try {
        const { hanziLines = [], title, artist, options } = generateSchema.parse(body)

        const apiKey = process.env.OPENAI_API_KEY
        // Use gpt-4o as per commit c5499c1
        const model = 'gpt-4o'
        const openai = apiKey ? new OpenAI({ apiKey: apiKey }) : null

        // NEW: Fetch lyrics from LRCLIB first, then OpenAI as fallback
        let workingHanziLines = [...hanziLines];
        let foundLrc: string | null = null; // Store synced lyrics if found

        // Try to fetch LRC sync data (both for new songs AND existing songs missing sync)
        if (title && artist) {
            console.log(`[Generate] Checking LRCLIB for: ${title} - ${artist}`)

            try {
                // Try search with title + artist first
                let query = new URLSearchParams({ q: `${title} ${artist}` })
                let lrcRes = await fetch(`https://lrclib.net/api/search?${query}`, {
                    headers: { 'User-Agent': 'KTV-Buddy/1.0' },
                    signal: AbortSignal.timeout(3000) // 3s timeout
                })

                let hits: any[] = []
                if (lrcRes.ok) {
                    hits = await lrcRes.json()
                    console.log(`[Generate] LRCLIB search (title+artist) returned ${hits.length} results`)
                }

                // If no results with title+artist, try title-only as fallback
                if (!Array.isArray(hits) || hits.length === 0) {
                    console.log(`[Generate] Trying title-only search: ${title}`)
                    query = new URLSearchParams({ q: title })
                    lrcRes = await fetch(`https://lrclib.net/api/search?${query}`, {
                        headers: { 'User-Agent': 'KTV-Buddy/1.0' },
                        signal: AbortSignal.timeout(3000)
                    })

                    if (lrcRes.ok) {
                        hits = await lrcRes.json()
                        console.log(`[Generate] LRCLIB search (title-only) returned ${hits.length} results`)
                    }
                }

                if (Array.isArray(hits) && hits.length > 0) {
                    // Find best match - HEAVILY prefer hits with syncedLyrics
                    const titleLower = title.toLowerCase()

                    // Priority 1: Exact title match WITH synced lyrics
                    let best = hits.find((h: any) =>
                        h.syncedLyrics && h.name.toLowerCase() === titleLower
                    )

                    // Priority 2: Title contains match WITH synced lyrics
                    if (!best) {
                        best = hits.find((h: any) =>
                            h.syncedLyrics && (
                                h.name.toLowerCase().includes(titleLower) ||
                                titleLower.includes(h.name.toLowerCase())
                            )
                        )
                    }

                    // Priority 3: ANY hit with synced lyrics
                    if (!best) {
                        best = hits.find((h: any) => h.syncedLyrics)
                    }

                    // Priority 4: Fallback to first hit (even if no sync)
                    if (!best) {
                        best = hits[0]
                    }

                    if (best) {
                        console.log(`[Generate] Selected match: "${best.name}" by "${best.artistName}" (ID: ${best.id})`)

                        // Always capture synced lyrics if available
                        foundLrc = best.syncedLyrics || null

                        // Only update hanzi if we don't have any yet
                        if (workingHanziLines.length === 0 && best.plainLyrics) {
                            console.log(`[Generate] Found lyrics on LRCLIB: ${best.name}`)
                            workingHanziLines = best.plainLyrics.split('\n').map((l: string) => l.trim()).filter((l: string) => l)
                        }

                        if (foundLrc) {
                            console.log(`[Generate] Found synced LRC for: ${best.name}`)
                        } else {
                            console.log(`[Generate] Found lyrics but NO SYNC for: ${best.name}`)
                        }
                    }
                } else {
                    console.log('[Generate] No results from LRCLIB')
                }
            } catch (e) {
                console.warn('[Generate] LRCLIB fetch failed:', e)
            }
        }

        // Backup: Try Genius scraping if LRCLIB had no lyrics (no sync, but may have content)
        if (workingHanziLines.length === 0 && title && artist) {
            console.log(`[Generate] Trying Genius for: ${title} - ${artist}`)
            try {
                // Genius search API (no key needed for basic search)
                const geniusQuery = encodeURIComponent(`${title} ${artist}`)
                const geniusRes = await fetch(`https://genius.com/api/search/multi?q=${geniusQuery}`, {
                    headers: { 'User-Agent': 'KTV-Buddy/1.0' },
                    signal: AbortSignal.timeout(5000)
                })

                if (geniusRes.ok) {
                    const geniusData = await geniusRes.json()
                    const songs = geniusData?.response?.sections?.find((s: any) => s.type === 'song')?.hits || []

                    if (songs.length > 0) {
                        const geniusSong = songs[0]?.result
                        if (geniusSong?.url) {
                            console.log(`[Generate] Found on Genius: ${geniusSong.full_title}`)
                            // Note: Genius lyrics require scraping the page - we'll let OpenAI handle it
                            // But we log that we found the song exists
                        }
                    }
                }
            } catch (e) {
                console.warn('[Generate] Genius search failed:', e)
            }
        }

        // NOTE: OpenAI is NOT used for lyrics fetching - it makes up lyrics!
        // Only LRCLIB database is used. If no lyrics found, return empty.

        if (workingHanziLines.length === 0) {
            console.log('[Generate] No lyrics found from any source.')
            // Still return a stream for consistency with client expectations
            const stream = new ReadableStream({
                start(controller) {
                    const encoder = new TextEncoder()
                    const send = (data: any) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

                    send({
                        type: 'info',
                        message: 'No lyrics found. Please add lyrics manually or try a different song.'
                    })

                    controller.close()
                }
            })

            return new Response(stream, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            })
        }

        // System prompt from commit c5499c1
        const systemPrompt = `
You are a Chinese song lyrics assistant.
Input: An array of Chinese lyrics lines.
Task: Generate Pinyin (Mandarin) and English translation for each line.
Output JSON format: { "pinyin": [string, ...], "english": [string, ...] }
Arrays must have exactly the same length as input.

Pinyin rules:
- Use standard pinyin with ${options?.toneNumbers ? 'tone numbers (e.g. ni3 hao3)' : 'tone marks (e.g. nǐ hǎo)'}.
- Preserve punctuation from the input line.
- Keep the structure aligned.

English rules:
- Learner-friendly, literal but natural.
- Keep line breaks aligned.
- Use empty string if input line is just punctuation or empty.
`

        const CHUNK_SIZE = 10
        const chunks: string[][] = []
        for (let i = 0; i < workingHanziLines.length; i += CHUNK_SIZE) {
            chunks.push(workingHanziLines.slice(i, i + CHUNK_SIZE))
        }

        // Create Stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()
                const send = (data: any) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

                // If we fetched new lyrics, send them to the client FIRST!
                if (workingHanziLines.length > 0 && hanziLines.length === 0) {
                    send({
                        type: 'lyrics_update',
                        data: workingHanziLines
                    })

                    if (foundLrc) {
                        send({
                            type: 'lrc_update',
                            data: foundLrc
                        })
                    }
                }

                // Helper to clean JSON string
                const cleanJson = (text: string) => {
                    if (!text) return ''
                    text = text.replace(/```json\n?|\n?```/g, '')
                    return text.trim()
                }

                console.log(`[Generate] Processing ${workingHanziLines.length} lines in ${chunks.length} chunks. Model: ${model}. Streaming enabled.`)

                // Process Chunks
                for (const [index, chunk] of chunks.entries()) {
                    console.log(`[Generate] Starting chunk ${index + 1}/${chunks.length} size=${chunk.length}`)

                    let attempts = 0
                    let success = false

                    // Arrays to hold the final result for this chunk
                    let pinyinChunk: string[] = []
                    let englishChunk: string[] = []

                    // Try OpenAI if available
                    if (openai) {
                        while (attempts < 3 && !success) {
                            attempts++
                            try {
                                const response = await openai.chat.completions.create({
                                    model: model,
                                    max_tokens: 4096,
                                    messages: [
                                        { role: 'system', content: systemPrompt },
                                        { role: 'user', content: JSON.stringify(chunk) }
                                    ],
                                    response_format: { type: 'json_object' },
                                })

                                let content = response.choices[0].message.content
                                if (!content) throw new Error('No content received from OpenAI')

                                content = cleanJson(content)
                                const parsed = JSON.parse(content)

                                pinyinChunk = parsed.pinyin || []
                                englishChunk = parsed.english || []

                                // Validate lengths
                                if (pinyinChunk.length !== chunk.length || englishChunk.length !== chunk.length) {
                                    throw new Error('Mismatch in output length')
                                }

                                console.log(`[Generate] Chunk ${index + 1} completed successfully (OpenAI)`)
                                success = true

                            } catch (err: any) {
                                console.error(`[Generate] Error processing chunk ${index + 1} (Attempt ${attempts}):`, err?.message || err)
                                await new Promise(r => setTimeout(r, 1000 * attempts))
                            }
                        }
                    }

                    // Fallback Logic
                    if (!success) {
                        console.warn(`[Generate] OpenAI failed or unavailable for chunk ${index + 1}. Using Fallback.`)

                        // 1. Pinyin Fallback (pinyin-pro)
                        try {
                            pinyinChunk = chunk.map(line => {
                                let p = pinyin(line, {
                                    toneType: options?.toneNumbers ? 'num' : 'symbol',
                                    nonZh: 'consecutive',
                                    v: true
                                })
                                // Clean up pinyin similar to before if needed, or keep raw.
                                // Applying basic punctuation cleanup for consistency
                                p = p.replace(/  /g, ' ')
                                return p + '*' // Mark with *
                            })
                        } catch (e) {
                            console.error('Pinyin fallback error:', e)
                            pinyinChunk = chunk.map(() => 'Error*')
                        }

                        // 2. English Fallback (google-translate)
                        try {
                            // Batched translation usually better but let's do line-by-line or joined to be safe
                            // Join with unique delimiter to preserve structure
                            const textToTranslate = chunk.join('\n|||\n')
                            const res = await translate(textToTranslate, { to: 'en', rejectOnPartialFail: false }) as any
                            const translatedText = res.text || ''
                            let lines = translatedText.split('\n|||\n')

                            // Safety check on length
                            if (lines.length !== chunk.length) {
                                // Try simple newline split if delimiter failed
                                lines = translatedText.split('\n')
                            }

                            englishChunk = lines.map((l: string) => l.trim() + '*')

                            // Pad or truncate if still mismatch
                            if (englishChunk.length < chunk.length) {
                                const diff = chunk.length - englishChunk.length
                                englishChunk = [...englishChunk, ...Array(diff).fill('Translation Error*')]
                            } else if (englishChunk.length > chunk.length) {
                                englishChunk = englishChunk.slice(0, chunk.length)
                            }

                        } catch (e) {
                            console.error('English fallback error:', e)
                            englishChunk = chunk.map(() => 'Translation Error*')
                        }
                    }

                    // Send chunks
                    send({
                        type: 'pinyin_chunk',
                        chunkIndex: index,
                        totalChunks: chunks.length,
                        data: pinyinChunk
                    })

                    send({
                        type: 'english',
                        chunkIndex: index,
                        totalChunks: chunks.length,
                        data: englishChunk
                    })
                }

                controller.close()
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })

    } catch (error: any) {
        console.error('Generate setup error:', error)
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
