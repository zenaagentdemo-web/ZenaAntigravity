import { tokenTrackingService } from './token-tracking.service.js';

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

/**
 * LiveSearchService: Uses Gemini Search Grounding to discover listing URLs.
 * This provides a 100% free (via Gemini API key) and reliable discovery path.
 */
export class LiveSearchService {
    private readonly apiKey: string;
    private readonly model: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        this.model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    }

    /**
     * Search for property listings in New Zealand using Gemini Search Grounding
     */
    async searchPropertyListing(address: string): Promise<string | null> {
        console.log(`[LiveSearch] Discovering URLs for "${address}" via Gemini Search Grounding...`);
        console.time(`[LiveSearch] Discovery for "${address}"`);

        if (!this.apiKey) {
            console.error('[LiveSearch] No GEMINI_API_KEY found. Discovery disabled.');
            console.timeEnd(`[LiveSearch] Discovery for "${address}"`);
            return null;
        }

        const prompt = `What is the property listing URL for ${address} in New Zealand? Prefer homes.co.nz or trademe.co.nz for stability. Return ONLY the raw URL.`;

        try {
            const startTime = Date.now();
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        tools: [{ google_search: {} }]
                    }),
                }
            );

            if (!response.ok) {
                console.error('[LiveSearch] Gemini Discovery failed:', await response.text());
                console.timeEnd(`[LiveSearch] Discovery for "${address}"`);
                return null;
            }

            const data = await response.json();

            // Log token usage
            if (data.usageMetadata) {
                tokenTrackingService.log({
                    source: 'live-search',
                    model: this.model,
                    inputTokens: data.usageMetadata.promptTokenCount,
                    outputTokens: data.usageMetadata.candidatesTokenCount,
                    durationMs: Date.now() - startTime
                }).catch(() => { });
            }

            const url = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            console.timeEnd(`[LiveSearch] Discovery for "${address}"`);

            if (url && url.startsWith('http')) {
                console.log(`[LiveSearch] Discovery success: ${url}`);
                return url;
            }

            console.log(`[LiveSearch] No valid URL found in Gemini response for "${address}".`);
            return null;
        } catch (error) {
            console.error('[LiveSearch] Error during Gemini discovery:', error);
            console.timeEnd(`[LiveSearch] Discovery for "${address}"`);
            return null;
        }
    }
}

export const liveSearchService = new LiveSearchService();
