/**
 * Shared text utilities for sanitization and decoding
 */

/**
 * Decodes HTML entities (decimal, hex, and common named entities)
 */
export function decodeHTMLEntities(text: string): string {
    if (!text) return text;

    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
    };

    return text
        .replace(/&[a-z]+;/gi, (match) => entities[match.toLowerCase()] || match)
        .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&#x([a-f0-9]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Sanitizes text specifically for Text-to-Speech by removing Markdown and decoding entities
 */
export function sanitizeForTTS(text: string): string {
    if (!text) return text;

    // 1. Decode HTML entities first
    let cleaned = decodeHTMLEntities(text);

    // 2. Remove Markdown markers that might be read literally by a TTS engine
    cleaned = cleaned
        .replace(/\b\*\*(.*?)\*\*\b/g, '$1') // Bold **text** -> text
        .replace(/\b\*(.*?)\*\b/g, '$1')     // Italic *text* -> text
        .replace(/#{1,6}\s+/g, '')           // Headers # Header -> Header
        .replace(/`{1,3}(.*?)(`{1,3})/g, '$1') // Inline or block code `code` -> code
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links [text](url) -> text

    return cleaned.trim();
}
