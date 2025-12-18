export function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

export function findBestMatch(target: string, candidates: { id: string, title: string | null }[]) {
    if (!target) return null;

    // Normalize target
    const normTarget = target.toLowerCase().trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '') // Keep words, spaces, and chinese

    let bestMatch = null;
    let minDistance = Infinity;

    for (const item of candidates) {
        if (!item.title) continue;

        const normTitle = item.title.toLowerCase().trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '');

        // Exact Match
        if (normTitle === normTarget) return item;

        // Substring check
        // Only valid if length is reasonable to avoid "Song" matching "My Song"
        if (normTitle.length > 3 && normTarget.includes(normTitle)) return item;
        if (normTarget.length > 3 && normTitle.includes(normTarget)) return item;

        // Levenshtein
        const distance = levenshtein(normTitle, normTarget);

        // Threshold: Allow e.g. 20% difference or Max 3 edits for short strings
        const maxLen = Math.max(normTitle.length, normTarget.length);
        const threshold = Math.max(2, Math.floor(maxLen * 0.3)); // 30% difference allowed or at least 2 chars

        if (distance <= threshold && distance < minDistance) {
            // Confirmation Step: Check for meaningful overlap
            // Convert to char sets
            const setA = new Set(normTitle.split(''))
            const setB = new Set(normTarget.split(''))
            let intersection = 0
            setA.forEach(char => { if (setB.has(char)) intersection++ })

            const overlapRatio = intersection / Math.max(setA.size, setB.size)

            if (overlapRatio > 0.4) { // At least 40% characters must be same
                minDistance = distance;
                bestMatch = item;
            }
        }
    }

    return bestMatch;
}
