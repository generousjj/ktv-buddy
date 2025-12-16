import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function normalizeChineseLyrics(input: string): string[] {
    return input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0) // Remove empty lines for now
        .map(line => line.replace(/^(\d+\.|[0-9]+)\s+/, '')) // Remove leading numbering like "1. " or "01 "
}
