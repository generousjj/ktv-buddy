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

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(hanziLines) }
            ],
            response_format: { type: 'json_object' }
        })

        const content = response.choices[0].message.content
        if (!content) throw new Error('No content from OpenAI')

        // Parse
        let result: { pinyin: string[], english: string[] }
        try {
            result = JSON.parse(content)
        } catch (e) {
            throw new Error('Failed to parse OpenAI JSON response')
        }

        return NextResponse.json({
            pinyin: result.pinyin || [],
            english: result.english || []
        })

    } catch (error: any) {
        console.error('Generate error:', error)
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
    }
}
