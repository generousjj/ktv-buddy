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
    try {
        const body = await req.json()
        const { hanziLines, options } = generateSchema.parse(body)

        if (hanziLines.length === 0) {
            return NextResponse.json({ pinyin: [], english: [] })
        }

        const apiKey = process.env.OPENAI_API_KEY
        // Use gpt-4o for better JSON reliability
        const model = 'gpt-4o'

        if (!apiKey) {
            console.error('API Key missing in environment')
            return NextResponse.json({ error: 'OpenAI API Key not configured at source.' }, { status: 401 })
        }

        const openai = new OpenAI({ apiKey: apiKey })

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

        // Batch processing to handle long songs
        // Reduced chunk size to 10 to prevent JSON truncation issues
        const CHUNK_SIZE = 10
        const chunks = []
        for (let i = 0; i < hanziLines.length; i += CHUNK_SIZE) {
            chunks.push(hanziLines.slice(i, i + CHUNK_SIZE))
        }

        console.log(`[Generate] Processing ${hanziLines.length} lines in ${chunks.length} chunks. Model: ${model}`)

        // Helper to clean JSON string
        const cleanJson = (text: string) => {
            if (!text) return ''
            // Remove markdown code blocks
            text = text.replace(/```json\n?|\n?```/g, '')
            return text.trim()
        }

        // Sequential processing to avoid Rate Limits (429)
        const results = []
        for (const [index, chunk] of chunks.entries()) {
            console.log(`[Generate] Starting chunk ${index + 1}/${chunks.length} size=${chunk.length}`)

            let attempts = 0
            let success = false
            let lastError: any = null

            while (attempts < 3 && !success) {
                attempts++
                try {
                    const response = await openai.chat.completions.create({
                        model: model,
                        max_tokens: 4096, // Ensure enough tokens for complete JSON
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: JSON.stringify(chunk) }
                        ],
                        response_format: { type: 'json_object' },
                    })

                    let content = response.choices[0].message.content
                    if (!content) throw new Error('No content received from OpenAI')

                    content = cleanJson(content)

                    // Log raw content for debugging if it parses successfully (optional, maybe verbose)
                    // console.log(`[Generate] Chunk ${index} content cleaned:`, content.substring(0, 50) + '...')

                    const parsed = JSON.parse(content)

                    if (parsed.pinyin?.length !== chunk.length) {
                        console.warn(`[Generate] Chunk ${index} mismatch: Input ${chunk.length} vs Output ${parsed.pinyin?.length}`)
                    }

                    results.push({
                        pinyin: parsed.pinyin || Array(chunk.length).fill(''),
                        english: parsed.english || Array(chunk.length).fill('')
                    })

                    console.log(`[Generate] Chunk ${index + 1} completed successfully on attempt ${attempts}`)
                    success = true

                } catch (err: any) {
                    console.error(`[Generate] Error processing chunk ${index + 1} (Attempt ${attempts}):`, err?.message || err)
                    lastError = err?.message || 'Unknown error'
                    // Wait a bit before retry (exponential backoff very naively)
                    await new Promise(r => setTimeout(r, 1000 * attempts))
                }
            }

            if (!success) {
                console.error(`[Generate] Failed chunk ${index + 1} after 3 attempts.`)
                const msg = `Error: ${lastError}`
                results.push({
                    pinyin: Array(chunk.length).fill(msg),
                    english: Array(chunk.length).fill(msg)
                })
            }
        }

        // Flatten results
        const finalPinyin = results.flatMap(r => r.pinyin)
        const finalEnglish = results.flatMap(r => r.english)

        return NextResponse.json({
            pinyin: finalPinyin,
            english: finalEnglish
        })

    } catch (error: any) {
        console.error('Generate error:', error)
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
