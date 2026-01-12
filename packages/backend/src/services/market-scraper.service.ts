import * as cheerio from 'cheerio';
import { liveSearchService } from './live-search.service.js';

export interface ComparableSale {
    address: string;
    soldPrice: string;
    soldDate: string;
    agency?: string;
    bedrooms?: number;
    bathrooms?: number;
    distance?: string;
    link?: string;
}

export interface PropertyDetails {
    address: string;
    bedrooms?: number;
    bathrooms?: number;
    type?: string;
    description?: string;
    landArea?: string;
    floorArea?: string;
    listingPrice?: number;
    inferred: boolean;
}

// 🆕 Interface for CMA request with full context
export interface CMARequest {
    targetAddress: string;
    suburb: string;
    city: string;
    bedrooms: number;
}

// 🆕 Interface for target property's sale history
export interface TargetSaleHistory {
    lastSoldPrice?: string;
    lastSoldDate?: string;
    source?: string;
}

export class MarketScraperService {
    private apiKey: string;
    private model: string = 'gemini-3-flash-preview';

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    /**
     * Find comparable sales for a given property
     * 🔥 FIX: Now accepts full context (targetAddress, suburb, city, bedrooms) 
     *         to prevent cross-regional confusion
     */
    async findComparableSales(request: CMARequest): Promise<{ comparables: ComparableSale[], sourceUrls: string[], targetSaleHistory?: TargetSaleHistory }> {
        const { targetAddress, suburb, city, bedrooms } = request;
        console.log(`[MarketScraper] Executing CMA for ${targetAddress}`);
        console.log(`[MarketScraper] Context: suburb="${suburb}", city="${city}", bedrooms=${bedrooms}`);

        try {
            // Updated to use Search Grounding with full geographic context
            const result = await this.extractWithGemini(request);
            return result;
        } catch (error) {
            console.error('[MarketScraper] Failed to get search-grounded market data:', error);
            return { comparables: [], sourceUrls: [] };
        }
    }


    /**
     * Search the web for specific property details (beds, baths, type)
     * Used for auto-enriching new property records.
     * 
     * 🚀 FAST PATH: Uses direct Gemini Search Grounding to get data in ~5s
     * instead of the slow Discovery → Fetch → Extract pipeline (30-90s).
     */
    async getPropertyDetails(address: string): Promise<PropertyDetails | null> {
        console.log(`[MarketScraper] Looking up details for: ${address}...`);
        console.time(`[MarketScraper] Total lookup for "${address}"`);

        const lowerAddress = address.toLowerCase();

        // 🛑 Check mocks FIRST for demo reliability (instant)
        const mockKey = Object.keys(this.MOCK_PROPERTIES).find(key =>
            lowerAddress === key || lowerAddress.startsWith(key + ' ') || lowerAddress.startsWith(key + ',')
        );

        if (mockKey) {
            const mockData = this.MOCK_PROPERTIES[mockKey];
            console.log(`[MarketScraper] Mock property found for "${address}"`);
            console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
            return mockData;
        }

        // 🚀 FAST PATH: Direct Gemini Search Grounding query
        // 🔥 PERMANENT FIX: Enhanced prompt with NZ property portals for reliable results
        console.log(`🌐 [MarketScraper] Initiating LIVE web search for "${address}" (no mock match)`);
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

            if (!apiKey) {
                console.warn('[MarketScraper] No GEMINI_API_KEY, cannot do fast lookup.');
                console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
                return null;
            }

            // 🔥 ENHANCED PROMPT: Explicitly search NZ property portals for better hit rate
            const prompt = `Search New Zealand property websites (homes.co.nz, oneroof.co.nz, realestate.co.nz, trademe.co.nz/property) for property details at: ${address}

Find and return property specifications including bedrooms, bathrooms, land area, floor area.

Return ONLY a JSON object with these fields:
{"bedrooms": X, "bathrooms": X, "landArea": "XXXm²", "floorArea": "XXXm²", "type": "residential", "listingPrice": XXXXXX}

Example: {"bedrooms": 3, "bathrooms": 2, "landArea": "809m²", "floorArea": "170m²", "type": "residential", "listingPrice": 1250000}

If you cannot find property data for this specific address, return: {"found": false}`;

            console.time(`[MarketScraper] Direct Grounding for "${address}"`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        tools: [{ google_search: {} }]
                    }),
                }
            );
            console.timeEnd(`[MarketScraper] Direct Grounding for "${address}"`);

            if (!response.ok) {
                console.error('[MarketScraper] Gemini Direct Grounding failed:', await response.text());
                console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
                return null;
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

            // Extract JSON from the response (may be wrapped in markdown code block)
            const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) {
                console.log(`[MarketScraper] No JSON found in Gemini response for "${address}"`);
                console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
                return null;
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.found === false || (!parsed.bedrooms && !parsed.bathrooms && !parsed.floorArea)) {
                console.log(`[MarketScraper] Gemini found no data for "${address}"`);
                console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
                return null;
            }

            console.log(`[MarketScraper] ✅ Fast lookup success for "${address}":`, parsed);
            console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);

            return {
                address: address,
                bedrooms: parsed.bedrooms || null,
                bathrooms: parsed.bathrooms || null,
                landArea: parsed.landArea || null,
                floorArea: parsed.floorArea || null,
                type: parsed.type || 'residential',
                description: parsed.description || null,
                found: true
            };
        } catch (error) {
            console.error('[MarketScraper] Fast lookup failed:', error);
            console.timeEnd(`[MarketScraper] Total lookup for "${address}"`);
            return null;
        }
    }

    /**
     * Sieve: Uses Cheerio to aggressively remove non-content elements
     */
    private sanitizeHtml(html: string): string {
        const $ = cheerio.load(html);

        // Remove heavy non-content tags
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('svg').remove();
        $('.ad-container').remove();
        $('.navigation').remove();
        $('.menu').remove();

        // Collapse whitespace
        const text = $('body').text().replace(/\s+/g, ' ').trim();

        // Limit to reasonable context window if huge
        return text.substring(0, 20000);
    }

    /**
     * Worker: LLM Extraction with Geographic Anchoring
     * 🔥 FIX: Now includes city/region to prevent cross-city confusion
     */
    private async extractWithGemini(request: CMARequest): Promise<{ comparables: ComparableSale[], sourceUrls: string[], targetSaleHistory?: TargetSaleHistory }> {
        const { targetAddress, suburb, city, bedrooms } = request;

        if (!this.apiKey) {
            console.warn('[MarketScraper] No API key for search grounding');
            return { comparables: [], sourceUrls: [] };
        }

        const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

        // 🔥 ENHANCED PROMPT WITH CITY ANCHORING
        const prompt = `
        CONTEXT: NZ Real Estate Comparable Market Analysis (CMA) - Industry Standard Appraisal.
        
        🎯 TARGET PROPERTY: ${targetAddress}
        📍 CITY/REGION: ${city || 'Not specified'} (MANDATORY - all comparables MUST be in or near ${city || suburb})
        📍 SUBURB: ${suburb}
        🛏️ BEDROOMS: ${bedrooms}
        
        ⛔⛔⛔ CRITICAL GEOGRAPHIC RULES (READ CAREFULLY) ⛔⛔⛔
        1. ALL comparables MUST be in ${city} or immediately adjacent suburbs WITHIN ${city}
        2. NEVER include properties from different cities!
           - If target is Taupo, NEVER include Auckland, Wellington, Hamilton, etc.
           - If target is Auckland, NEVER include Taupo, Wellington, Christchurch, etc.
        3. If you cannot find comparables in ${city}, return an EMPTY array - DO NOT substitute other cities!
        4. Maximum distance from ${suburb}: 3km WITHIN the same city/region
        5. If suburb name exists in multiple NZ cities, ONLY use the one in ${city}
        
        TASK: Find 3-5 REAL recent sales using this TIERED SEARCH STRATEGY:
        
        🎯 TIER 1 - SAME SUBURB IN ${city} (REQUIRED FIRST):
        Find sales ONLY within ${suburb}, ${city} from the last 6 months.
        These are the most relevant comparables.
        
        🎯 TIER 2 - ADJACENT SUBURBS IN ${city} (If Tier 1 < 3 results):
        Expand to immediately adjacent suburbs within 2km of ${suburb}, but STILL in ${city}.
        
        🎯 TIER 3 - EXTEND TIME IN ${city} (If still < 3 results):
        Go back to 12 months within ${suburb} and adjacent suburbs in ${city} only.
        
        🆕 BONUS: ALSO search for the TARGET PROPERTY's last sale price if available.
        Search "${targetAddress}" to find its previous sale history.
        
        📅 TIME PRIORITIZATION:
        - Last 3 months = "Recent" (most relevant)
        - 3-6 months = "Current" (good)
        - 6-12 months = "Acceptable" (include with caution)
        - > 12 months = DO NOT INCLUDE
        
        INSTRUCTIONS:
        1. Use Google Search to find actual sold properties from OneRoof, Homes.co.nz, or Realestate.co.nz.
        2. VERIFY each result is in ${city} before including it.
        3. Match bedroom count (${bedrooms}) as closely as possible.
        4. Extract: Address (MUST include ${city}), Sold Price, Sold Date, Agency, Bedrooms, Bathrooms, Distance, Link.
        5. Provide source URLs for verification.
        
        OUTPUT FORMAT (JSON ONLY):
        {
          "targetSaleHistory": {
            "lastSoldPrice": "$X,XXX,XXX or null if not found",
            "lastSoldDate": "DD MMM YYYY or null", 
            "source": "https://... or null"
          },
          "comparables": [
            {
              "address": "Full Address INCLUDING ${city}",
              "soldPrice": "$X,XXX,XXX",
              "soldDate": "DD MMM YYYY",
              "agency": "Agency Name",
              "bedrooms": X,
              "bathrooms": X,
              "distance": "0.5km",
              "link": "https://..."
            }
          ],
          "sourceUrls": ["https://..."]
        }
        
        RULES:
        - Only include properties that are explicitly "Sold".
        - Ignore "For Sale" listings.
        - If price is "Undisclosed", ignore that listing.
        - Date format DD MMM YYYY (e.g. 12 May 2024).
        - Every address MUST include the city name (${city}).
        - If you cannot find 3+ comparables IN ${city}, return fewer results or empty - DO NOT use other cities!
        `;


        console.log(`[MarketScraper] Triggering search grounding for ${suburb}, ${city}...`);
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        tools: [{ google_search: {} }],
                        generationConfig: {
                            temperature: 0.1,
                            response_mime_type: 'application/json'
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini search grounding error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

            // Handle cases where Gemini might return markdown-wrapped JSON or just JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;

            const json = JSON.parse(jsonStr);

            // 🚀 ZENA TRUST: Normalize all URLs to ensure they are absolute and valid
            let comparables = (json.comparables || []).map((c: any) => ({
                ...c,
                link: this.normalizeUrl(c.link)
            }));

            // 🔥 POST-PROCESSING VALIDATION: Filter out cross-city results
            if (city) {
                const cityLower = city.toLowerCase();
                const originalCount = comparables.length;

                comparables = comparables.filter((c: ComparableSale) => {
                    const addressLower = c.address.toLowerCase();

                    // Must contain the target city OR be a suburb we can verify is in that city
                    // Also check it doesn't contain known OTHER major cities
                    const otherCities = ['auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga',
                        'dunedin', 'napier', 'hastings', 'nelson', 'rotorua', 'taupo',
                        'palmerston north', 'new plymouth', 'whangarei', 'invercargill']
                        .filter(c => c !== cityLower);

                    // Check if address contains a wrong city
                    for (const wrongCity of otherCities) {
                        if (addressLower.includes(wrongCity)) {
                            console.warn(`[MarketScraper] ⚠️ FILTERED cross-city result: "${c.address}" contains "${wrongCity}" (target: ${city})`);
                            return false;
                        }
                    }

                    // Prefer addresses that explicitly mention our city, but don't filter all if many pass
                    return true;
                });

                if (comparables.length < originalCount) {
                    console.log(`[MarketScraper] 🔥 Filtered ${originalCount - comparables.length} cross-city results`);
                }
            }

            const sourceUrls = (json.sourceUrls || []).map((url: string) => this.normalizeUrl(url));

            // 🆕 Extract target property's sale history if found
            const targetSaleHistory: TargetSaleHistory | undefined = json.targetSaleHistory ? {
                lastSoldPrice: json.targetSaleHistory.lastSoldPrice || undefined,
                lastSoldDate: json.targetSaleHistory.lastSoldDate || undefined,
                source: this.normalizeUrl(json.targetSaleHistory.source) || undefined
            } : undefined;

            console.log(`[MarketScraper] ✅ CMA complete: ${comparables.length} comparables found in ${city}`);
            if (targetSaleHistory?.lastSoldPrice) {
                console.log(`[MarketScraper] 🏠 Target last sold: ${targetSaleHistory.lastSoldPrice} on ${targetSaleHistory.lastSoldDate}`);
            }

            return {
                comparables,
                sourceUrls,
                targetSaleHistory
            };
        } catch (e) {
            console.error('[MarketScraper] Search grounding failed', e);
            return { comparables: [], sourceUrls: [] };
        }
    }

    /**
     * Centralized Mock Data for Test Addresses
     * 🛑 ANTI-HALLUCINATION: Only these specific addresses will return web results in development.
     */
    private readonly MOCK_PROPERTIES: Record<string, any> = {
        '45 walmer road': {
            bedrooms: 3,
            bathrooms: 2,
            landArea: '650m²',
            floorArea: '220m²',
            type: 'residential',
            description: "Modern family home with spacious living areas. Perfect for local residents."
        },
        '77 wing street': {
            bedrooms: 3,
            bathrooms: 2,
            landArea: '650m²',
            floorArea: '220m²',
            type: 'residential',
            description: "Charming character home with a sunny deck and garden."
        },
        '10 whitby place': {
            bedrooms: 3,
            bathrooms: 1,
            landArea: '1000m²',
            floorArea: '180m²',
            type: 'residential',
            description: "Modern family home with spacious living areas. Perfect for local residents."
        },
        // 🆕 Added for demo reliability
        '42 woodward': {
            bedrooms: 3,
            bathrooms: 2,
            landArea: '799m²',
            floorArea: '171m²',
            type: 'residential',
            description: "Well-maintained Taupo property in sought-after Nukuhau location."
        },
        '44 woodward': {
            bedrooms: 3,
            bathrooms: 2,
            landArea: '750m²',
            floorArea: '165m²',
            type: 'residential',
            description: "Family home in Nukuhau with lake views and established gardens."
        },
        '10 boundary': {
            bedrooms: 3,
            bathrooms: 1,
            landArea: '1200m²',
            floorArea: '160m²',
            type: 'residential',
            description: "Classic Taupo property with generous land and potential for development."
        },
        '12 boundary': {
            bedrooms: 4,
            bathrooms: 2,
            landArea: '1266m²',
            floorArea: '170m²',
            type: 'residential',
            description: "Spacious family home with large backyard in quiet Waipahihi location."
        },
        '14 boundary': {
            bedrooms: 4,
            bathrooms: 2,
            landArea: '809m²',
            floorArea: '170m²',
            type: 'residential',
            description: "Modern build in established neighbourhood, walking distance to lake."
        },
        '16 boundary': {
            bedrooms: 3,
            bathrooms: 2,
            landArea: '850m²',
            floorArea: '165m²',
            type: 'residential',
            description: "Well-maintained Taupo residence in quiet Waipahihi neighbourhood."
        },
        '18 boundary': {
            bedrooms: 4,
            bathrooms: 2,
            landArea: '920m²',
            floorArea: '185m²',
            type: 'residential',
            description: "Spacious family home with lake views in popular Taupo suburb."
        },
        '20 boundary': {
            bedrooms: 3,
            bathrooms: 1,
            landArea: '780m²',
            floorArea: '140m²',
            type: 'residential',
            description: "Character home with development potential in central Taupo location."
        }
    };

    /**
     * Worker: Extract specific property details using LLM
     */
    private async extractPropertyDetailsWithGemini(cleanText: string, searchAddress: string): Promise<PropertyDetails | null> {
        // MOCK: Check for specific test addresses
        const lowerAddress = searchAddress.toLowerCase();

        // Find exact mock match by checking if lowerAddress starts with any of our mock keys followed by space or comma (strict matching)
        const mockKey = Object.keys(this.MOCK_PROPERTIES).find(key =>
            lowerAddress === key || lowerAddress.startsWith(key + ' ') || lowerAddress.startsWith(key + ',')
        );

        if (mockKey) {
            const mockData = this.MOCK_PROPERTIES[mockKey];
            return {
                address: searchAddress,
                ...mockData,
                inferred: true
            };
        }

        if (!this.apiKey) return null;

        const model = process.env.GEMINI_MODEL || this.model;
        const prompt = `
        CTXT: NZ Real Estate Property Page.
        TASK: Extract specific details for the property related to "${searchAddress}".
        
        INPUT TEXT:
        ${cleanText}
        
        OUTPUT JSON:
        {
          "address": "Confirmed Address",
          "bedrooms": X,
          "bathrooms": X,
          "landArea": "XXXm²",
          "floorArea": "XXXm²",
          "listingPrice": XXXXXX,
          "type": "residential|commercial|land",
          "description": "Short summary",
          "found": true|false
        }
        
        RULES:
        - If the text doesn't mention a property that reasonably matches "${searchAddress}", set "found": false.
        - REASONABLE MATCH: "${searchAddress}" matches "Unit X, Number", "Flat X", "X/Number", or just "Number" if building specs are for the unit. 
        - DO NOT be overly pedantic about unit number formatting. If the street and house number match and it looks like a listing for that property, set "found": true.
        - If "found" is false, do NOT guess any fields.
        - PRIORITIZE: If you see "Public Record", "Council Data", or "Property Profile" specs (beds/baths/area), use those even if there is no active "Listing".
        - Normalize the address to the official NZ format.
        `;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            response_mime_type: 'application/json'
                        },
                    }),
                }
            );

            if (!response.ok) return null;

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const json = JSON.parse(text);

            if (json.found === false) {
                console.log(`[MarketScraper] Gemini confirmed no results found for "${searchAddress}".`);
                return null;
            }

            return {
                ...json,
                inferred: true
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Simulated Fetcher for specific property page
     * Updated to support LIVE search if mock not found
     */
    private async fetchPropertyDetailsPage(address: string): Promise<string | null> {
        await new Promise(resolve => setTimeout(resolve, 500));

        const lowerAddress = address.toLowerCase();

        // 🛑 ANTI-HALLUCINATION: Only return mock results for SPECIFIC test addresses in our map.
        const mockKey = Object.keys(this.MOCK_PROPERTIES).find(key =>
            lowerAddress === key || lowerAddress.startsWith(key + ' ') || lowerAddress.startsWith(key + ',')
        );

        if (mockKey) {
            const mockData = this.MOCK_PROPERTIES[mockKey];
            console.log(`[MarketScraper] Mock property found for "${address}"`);
            // Return a mock page structure that looks like a listing for test addresses
            return `
            <html>
                <body>
                    <h1>Property Details: ${address}</h1>
                    <div class="specs">
                        <span class="beds">${mockData.bedrooms} Bedrooms</span>
                        <span class="baths">${mockData.bathrooms} Bathroom${mockData.bathrooms > 1 ? 's' : ''}</span>
                        <span class="land">Land Area: ${mockData.landArea}</span>
                        <span class="floor">Floor Area: ${mockData.floorArea}</span>
                        <span class="type">${mockData.type === 'residential' ? 'Residential Home' : mockData.type}</span>
                    </div>
                    <div class="description">
                        ${mockData.description}
                    </div>
                </body>
            </html>
            `;
        }

        // 🌐 LIVE FALLBACK: If not in mock, try to find it on the real web
        console.log(`[MarketScraper] "${address}" not in mocks, attempting live web search...`);
        let liveLink = await liveSearchService.searchPropertyListing(address);

        // 🧠 UNIT FALLBACK: If unit search (e.g. 3/186) failed, try parent (e.g. 186)
        if (!liveLink && (address.includes('/') || address.toLowerCase().includes('unit') || address.toLowerCase().includes('flat'))) {
            const parentAddress = address.replace(/^([0-9A-Za-z]+\/|Unit\s+[0-9A-Za-z]+\s*,\s*|Flat\s+[0-9A-Za-z]+\s*,\s*|Unit\s+[0-9A-Za-z]+\s+|Flat\s+[0-9A-Za-z]+\s+)/i, '').trim();
            if (parentAddress !== address) {
                console.log(`[MarketScraper] Unit discovery failed for "${address}", trying parent address: "${parentAddress}"`);
                liveLink = await liveSearchService.searchPropertyListing(parentAddress);
            }
        }

        if (liveLink) {
            console.log(`[MarketScraper] Found live listing for "${address}": ${liveLink}`);
            try {
                const response = await fetch(liveLink, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                if (response.ok) {
                    const html = await response.text();

                    // 🛑 BOT DETECTION: Check if the content is actually a block page
                    const $ = cheerio.load(html);
                    const title = $('title').text().toLowerCase();
                    const isBlocked = title.includes('captcha') ||
                        title.includes('forbidden') ||
                        title.includes('checking your browser') ||
                        title.includes('access denied') ||
                        html.includes('Cloudflare') ||
                        html.includes('distilnetworks');

                    if (isBlocked) {
                        console.warn(`[MarketScraper] Bot protection wall detected at ${liveLink}. Falling back to manual.`);
                        return null;
                    }

                    console.log(`[MarketScraper] Successfully fetched live HTML from ${liveLink}`);
                    return html;
                } else {
                    console.error(`[MarketScraper] Failed to fetch live page: ${response.status} ${response.statusText}`);
                    if (response.status === 403 || response.status === 429) {
                        console.warn(`[MarketScraper] Access denied (bot block) at ${liveLink}`);
                        return null;
                    }
                }
            } catch (err) {
                console.error(`[MarketScraper] Error fetching live link:`, err);
            }
        }

        console.log(`[MarketScraper] Non-test address "${address}" detected and no live matches found - returning No Results page.`);
        return `
        <html>
            <body>
                <h1>Search Results</h1>
                <p>Sorry, we couldn't find any current listings or public records matching "${address}".</p>
            </body>
        </html>
        `;
    }

    /**
     * 🚀 ZENA TRUST HELPER: Ensure all links are absolute and start with https://
     */
    private normalizeUrl(url: string | undefined): string {
        if (!url) return '';
        let clean = url.trim();

        // Handle relative paths (rare with Search Grounding but good for safety)
        if (clean.startsWith('//')) clean = 'https:' + clean;
        if (clean.startsWith('/')) {
            // Default to OneRoof if no domain, as it's a common relative path source in NZ
            clean = 'https://www.oneroof.co.nz' + clean;
        }

        // Ensure protocol
        if (!clean.startsWith('http')) {
            clean = 'https://' + clean;
        }

        return clean;
    }
}

export const marketScraperService = new MarketScraperService();
