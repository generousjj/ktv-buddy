'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createSong(data: {
    title?: string
    artist?: string
    source: string // 'PASTE' | 'LRCLIB' | 'KUGOU'
    rawInput: string
    settingsJson: string
    hanziLines: string[]
    pinyinLines: string[]
    englishLines: string[]
    lrcJson?: string
    versionId?: string // Optional? No, new song new version.
}) {
    const song = await prisma.song.create({
        data: {
            title: data.title,
            artist: data.artist,
            source: data.source,
            rawInput: data.rawInput,
            versions: {
                create: {
                    settingsJson: data.settingsJson,
                    hanziLinesJson: JSON.stringify(data.hanziLines),
                    pinyinLinesJson: JSON.stringify(data.pinyinLines),
                    englishLinesJson: JSON.stringify(data.englishLines),
                    lrcJson: data.lrcJson,
                    dirtyFlagsJson: JSON.stringify({})
                }
            }
        }
    })

    revalidatePath('/')
    return { id: song.id }
}

export async function saveSettings(formData: FormData) {
    const apiKey = formData.get('apiKey') as string
    const model = formData.get('model') as string

    // Simple validation could be added here

    if (typeof apiKey === 'string') {
        // Allow empty string to clear? Or just upsert if not empty? 
        // Let's upsert whatever is passed.
        await prisma.appSetting.upsert({
            where: { key: 'OPENAI_API_KEY' },
            update: { value: apiKey },
            create: { key: 'OPENAI_API_KEY', value: apiKey }
        })
    }

    if (model) {
        await prisma.appSetting.upsert({
            where: { key: 'OPENAI_MODEL' },
            update: { value: model },
            create: { key: 'OPENAI_MODEL', value: model }
        })
    }

    revalidatePath('/settings')
}
