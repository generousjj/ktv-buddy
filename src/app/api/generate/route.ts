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
        // const model = 'gpt-4o-mini'
        const model = 'gpt-4o-mini'

        if (!apiKey) {
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
        const CHUNK_SIZE = 20
        const chunks = []
        for (let i = 0; i < hanziLines.length; i += CHUNK_SIZE) {
            chunks.push(hanziLines.slice(i, i + CHUNK_SIZE))
        }

        console.log(`Processing ${hanziLines.length} lines in ${chunks.length} chunks...`)

        const results = await Promise.all(chunks.map(async (chunk, index) => {
            try {
                const response = await openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(chunk) }
                    ],
                    response_format: { type: 'json_object' }
                })

                const content = response.choices[0].message.content
                if (!content) throw new Error('No content')
                const parsed = JSON.parse(content)

                // Validate output length matches input chunk length
                if (parsed.pinyin?.length !== chunk.length || parsed.english?.length !== chunk.length) {
                    console.warn(`Chunk ${index} length mismatch. Input: ${chunk.length}, Output Pinyin: ${parsed.pinyin?.length}, Output English: ${parsed.english?.length}`)
                }

                return {
                    pinyin: parsed.pinyin || Array(chunk.length).fill(''),
                    english: parsed.english || Array(chunk.length).fill('')
                }
            } catch (err) {
                console.error(`Error processing chunk ${index}:`, err)
                // Return empty arrays on failure to preserve structure
                return {
                    pinyin: Array(chunk.length).fill('Error generating'),
                    english: Array(chunk.length).fill('Error generating')
                }
            }
        }))

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
