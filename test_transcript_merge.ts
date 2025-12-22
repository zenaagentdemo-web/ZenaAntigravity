
// Logic to test
function mergeTranscript(current: string, incoming: string): string {
    const c = current.trim();
    const i = incoming.trim();

    // 0. Base case: if current is empty, take incoming
    if (!c) return i;

    // 1. Direct Extension (Standard ASR): "Hello" -> "Hello world"
    if (i.toLowerCase().startsWith(c.toLowerCase())) {
        return i;
    }

    // 2. Exact match (Redundant update)
    if (c.toLowerCase() === i.toLowerCase()) {
        return c;
    }

    // 3. Suffix Overlap Check (e.g. "What is" + "is the weather")
    // Check for overlapping "tail" of current and "head" of incoming
    const cWords = c.split(/\s+/);
    const iWords = i.split(/\s+/);

    // Try to find the longest suffix of C that matches a prefix of I
    for (let len = Math.min(cWords.length, iWords.length); len > 0; len--) {
        const suffix = cWords.slice(-len).join(' ').toLowerCase();
        const prefix = iWords.slice(0, len).join(' ').toLowerCase();

        // Simple string comparison for now, could be fuzzier
        if (suffix === prefix) {
            // Found overlap!
            // Return current + non-overlapping part of incoming
            return c + ' ' + iWords.slice(len).join(' ');
        }
    }

    // 4. Disjoint Append: "What" + "is" -> "What is"
    // If incoming seems to be a new chunk, append it.
    // Heuristic: If incoming is relatively short or disjoint, append.
    // Risk: "The wether" (correction) vs "The weather" -> "The wether The weather"

    return c + ' ' + i;
}

// Test Cases
const tests = [
    { name: "Standard Extension", current: "What", incoming: "What is", expected: "What is" },
    { name: "Standard Extension 2", current: "What is", incoming: "What is the", expected: "What is the" },
    { name: "Disjoint Chunks", current: "What", incoming: "is", expected: "What is" },
    { name: "Disjoint Chunks 2", current: "What is", incoming: "the weather", expected: "What is the weather" },
    { name: "Overlap Chunks", current: "What is", incoming: "is the weather", expected: "What is the weather" },
    { name: "Overlap Chunks 2", current: "Hello there", incoming: "there friend", expected: "Hello there friend" },
    { name: "Mid-word overlap (should fail word check)", current: "Hel", incoming: "lo", expected: "Hel lo" }, // Maybe we want "Hello"? But ASR usually sends words.
    { name: "Correction (Hard)", current: "The wether", incoming: "The weather", expected: "The weather" }, // Current logic will fail this and return "The wether The weather"
];

// Refined Logic for Correction handling?
// If Levenshtein distance is small relative to length, treat as replacement?
// PROPOSAL:
function mergeTranscriptRefined(current: string, incoming: string): string {
    const c = current.trim();
    const i = incoming.trim();

    if (!c) return i;

    // 1. Prefix Check (Extension)
    if (i.toLowerCase().startsWith(c.toLowerCase())) return i;
    if (c.toLowerCase().startsWith(i.toLowerCase())) return c; // Ignore older short partial? or maybe use longer one? Usually keep longer.

    // 2. Overlap Check (Word-based)
    const cWords = c.split(/\s+/);
    const iWords = i.split(/\s+/);

    // Check overlap of up to 3 words (rarely need more for stitching)
    const maxOverlapCheck = Math.min(3, cWords.length, iWords.length);
    for (let len = maxOverlapCheck; len > 0; len--) {
        const suffix = cWords.slice(-len).join(' ').toLowerCase();
        const prefix = iWords.slice(0, len).join(' ').toLowerCase();
        if (suffix === prefix) {
            return c + ' ' + iWords.slice(len).join(' ');
        }
    }

    // 3. Correction Check (Levenshtein-ish or simple length/similarity)
    // If lengths are similar and common words > 50%, treat as replace
    // Implementation of simple similarity:
    const commonWords = iWords.filter(w => cWords.includes(w)).length;
    const similarity = commonWords / Math.max(cWords.length, iWords.length);

    if (similarity > 0.6) {
        // High similarity, likely a correction/rephrase -> Pick the newer one (incoming)
        // Exception: If incoming is visibly shorter and "worse"? Hard to know. Trust latest.
        return i;
    }

    // 4. Default: Append
    return c + ' ' + i;
}

console.log("Running Tests...");
tests.forEach(t => {
    const result = mergeTranscriptRefined(t.current, t.incoming);
    const pass = result.toLowerCase() === t.expected.toLowerCase();
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name}`);
    if (!pass) console.log(`   Expected: "${t.expected}"\n   Got:      "${result}"`);
});

// Run with: npx ts-node test_transcript_merge.ts
