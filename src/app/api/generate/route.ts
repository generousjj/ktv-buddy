import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { pinyin } from 'pinyin-pro'
import { translate } from 'google-translate-api-x'

const generateSchema = z.object({
    hanziLines: z.array(z.string()),
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
        const { hanziLines, options } = generateSchema.parse(body)

        if (hanziLines.length === 0) {
            return NextResponse.json({ pinyin: [], english: [] })
        }

        const apiKey = process.env.OPENAI_API_KEY
        // Use gpt-4o as per commit c5499c1
        const model = 'gpt-4o'
        const openai = apiKey ? new OpenAI({ apiKey: apiKey }) : null

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
        for (let i = 0; i < hanziLines.length; i += CHUNK_SIZE) {
            chunks.push(hanziLines.slice(i, i + CHUNK_SIZE))
        }

        // Create Stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()
                const send = (data: any) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

                // Note: We deliberately continue even if no API key is present, to trigger fallback mechanism if desired.
                // However, the original code returned early. With the new requirement, 
                // if there is NO api key, we should prolly just use fallback for everything?
                // The prompt says "if error generating... use google translate". 
                // So if openai is null, it's effectively an error for every chunk.

                // Helper to clean JSON string
                const cleanJson = (text: string) => {
                    if (!text) return ''
                    text = text.replace(/```json\n?|\n?```/g, '')
                    return text.trim()
                }

                console.log(`[Generate] Processing ${hanziLines.length} lines in ${chunks.length} chunks. Model: ${model}. Streaming enabled.`)

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
