import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

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

                // If no API key, stop here
                if (!openai) {
                    console.error('API Key missing, returning empty')
                    send({ type: 'error', message: 'No OpenAI API Key.' })
                    controller.close()
                    return
                }

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

                            const pinyinChunk = parsed.pinyin || Array(chunk.length).fill('')
                            const englishChunk = parsed.english || Array(chunk.length).fill('')

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

                            console.log(`[Generate] Chunk ${index + 1} completed successfully`)
                            success = true

                        } catch (err: any) {
                            console.error(`[Generate] Error processing chunk ${index + 1} (Attempt ${attempts}):`, err?.message || err)
                            await new Promise(r => setTimeout(r, 1000 * attempts))
                        }
                    }

                    if (!success) {
                        const errorData = Array(chunk.length).fill('Error generating')
                        send({
                            type: 'pinyin_chunk',
                            chunkIndex: index,
                            totalChunks: chunks.length,
                            data: errorData
                        })
                        send({
                            type: 'english',
                            chunkIndex: index,
                            totalChunks: chunks.length,
                            data: errorData
                        })
                    }
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
