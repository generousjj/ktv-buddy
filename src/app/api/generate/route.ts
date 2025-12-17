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

        // 1. Generate Pinyin Locally (Free & Fast)
        console.log(`[Generate] Generating Pinyin locally for ${hanziLines.length} lines`)
        const localPinyin = hanziLines.map(line => {
            let p = pinyin(line, {
                toneType: options?.toneNumbers ? 'num' : 'symbol',
                nonZh: 'consecutive',
                v: true
            })

            // Normalize punctuation
            p = p.replace(/，/g, ',')
                .replace(/。/g, '.')
                .replace(/！/g, '!')
                .replace(/？/g, '?')
                .replace(/：/g, ':')
                .replace(/；/g, ';')
                .replace(/（/g, '(')
                .replace(/）/g, ')')

            // Remove spacing anomalies around punctuation
            // Remove space BEFORE punctuation: "word ," -> "word,"
            p = p.replace(/\s+([,.!?:;)])/g, '$1')

            // Fix space AFTER opening paren if any: "( word" -> "(word"
            p = p.replace(/(\()\s+/g, '$1')

            return p
        })

        const apiKey = process.env.OPENAI_API_KEY
        const model = 'gpt-4o'
        const openai = apiKey ? new OpenAI({ apiKey: apiKey }) : null

        const systemPrompt = `
You are a Chinese song lyrics translator.
Input: An array of Chinese lyrics lines.
Task: Generate an English translation for each line.
Output JSON format: { "english": [string, ...] }
Arrays must have exactly the same length as input.

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

                // A. Send Pinyin immediately
                send({ type: 'pinyin', data: localPinyin })

                // If no API key, stop here (or send empty english)
                if (!openai) {
                    console.error('API Key missing, returning empty English')
                    send({ type: 'error', message: 'No OpenAI API Key. Pinyin generated only.' })
                    // Send empty English chunks for all lines to match expected structure
                    for (let i = 0; i < chunks.length; i++) {
                        send({ type: 'english', chunkIndex: i, totalChunks: chunks.length, data: Array(chunks[i].length).fill('') })
                    }
                    controller.close()
                    return
                }

                // Helper to clean JSON string
                const cleanJson = (text: string) => {
                    if (!text) return ''
                    text = text.replace(/```json\n?|\n?```/g, '')
                    return text.trim()
                }

                console.log(`[Generate] Processing translations for ${hanziLines.length} lines in ${chunks.length} chunks. Model: ${model}`)

                // B. Process English Chunks
                for (const [index, chunk] of chunks.entries()) {
                    console.log(`[Generate] Starting chunk ${index + 1}/${chunks.length} size=${chunk.length}`)
                    let englishChunk: string[] = []
                    let attempts = 0
                    let success = false
                    let lastError: any = null

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

                            if (parsed.english?.length !== chunk.length) {
                                console.warn(`[Generate] Chunk ${index} mismatch: Input ${chunk.length} vs Output ${parsed.english?.length}`)
                            }

                            englishChunk = parsed.english || Array(chunk.length).fill('')
                            console.log(`[Generate] Chunk ${index + 1} completed successfully on attempt ${attempts}`)
                            success = true

                        } catch (err: any) {
                            console.error(`[Generate] Error processing chunk ${index + 1} (Attempt ${attempts}):`, err?.message || err)
                            lastError = err?.message || 'Unknown error'
                            await new Promise(r => setTimeout(r, 1000 * attempts))
                        }
                    }

                    // Fallback
                    if (!success) {
                        console.warn(`[Generate] OpenAI failed for chunk ${index + 1}. Attempting fallback (Google Translate)...`)
                        try {
                            const textToTranslate = chunk.join('\n')
                            const res = await translate(textToTranslate, { to: 'en', rejectOnPartialFail: false }) as any
                            let fallbackLines = res.text.split('\n').map((l: string) => l.trim())

                            // Align length
                            if (fallbackLines.length < chunk.length) {
                                const diff = chunk.length - fallbackLines.length
                                fallbackLines = [...fallbackLines, ...Array(diff).fill('')]
                            } else if (fallbackLines.length > chunk.length) {
                                fallbackLines = fallbackLines.slice(0, chunk.length)
                            }
                            englishChunk = fallbackLines
                            console.log(`[Generate] Fallback successful for chunk ${index + 1}`)
                        } catch (fbErr: any) {
                            console.error(`[Generate] Fallback failed for chunk ${index + 1}:`, fbErr)
                            englishChunk = Array(chunk.length).fill(`Error: ${lastError || 'Fallback failed'}`)
                        }
                    }

                    // Send Chunk
                    send({ type: 'english', chunkIndex: index, totalChunks: chunks.length, data: englishChunk })
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
