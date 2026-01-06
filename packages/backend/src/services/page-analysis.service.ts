/**
 * Page Analysis Service
 * 
 * Uses Gemini AI to analyze captured DOM and create a "Site Profile"
 * that defines how to extract data from a custom-connected website.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DataField {
    name: string;
    description: string;
    selector: string;
    type: 'text' | 'link' | 'number' | 'date' | 'list' | 'table';
    example?: string;
}

export interface NavigationPattern {
    name: string;
    description: string;
    selector: string;
    action: 'click' | 'hover' | 'scroll';
}

export interface SiteProfile {
    domain: string;
    analyzedAt: string;
    pageType: 'dashboard' | 'list' | 'detail' | 'search' | 'unknown';
    dataFields: DataField[];
    navigationPatterns: NavigationPattern[];
    suggestedActions: string[];
    confidence: number;
    rawAnalysis?: string;
}

// In-memory store for site profiles (would be DB in production)
const siteProfiles: Map<string, SiteProfile> = new Map();

const PAGE_ANALYSIS_PROMPT = `You are an expert web scraping analyst. Analyze the following HTML from a logged-in dashboard/portal and identify:

1. **Page Type**: Is this a dashboard, list view, detail page, or search results?

2. **Data Fields**: What data can be extracted? For each field, provide:
   - name: A clean identifier (e.g., "property_address", "client_name")
   - description: What this field represents
   - selector: A CSS selector to extract this data
   - type: One of: text, link, number, date, list, table
   - example: An example value if visible in the HTML

3. **Navigation Patterns**: What links/buttons lead to more data?
   - name: What does this navigate to
   - selector: CSS selector for the element
   - action: click, hover, or scroll

4. **Suggested Actions**: What automated actions could Zena perform here?
   - Examples: "Extract all properties", "Navigate to property details", "Export client list"

5. **Confidence**: Rate 0-100 how confident you are in this analysis.

Return your analysis as JSON in this exact format:
{
    "pageType": "dashboard|list|detail|search|unknown",
    "dataFields": [...],
    "navigationPatterns": [...],
    "suggestedActions": [...],
    "confidence": 85
}

HTML to analyze:
`;

export class PageAnalysisService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        } else {
            console.warn('[PageAnalysisService] No Gemini API key found');
        }
    }

    /**
     * Analyze captured DOM and create a site profile
     */
    async analyzePageStructure(domain: string, pageDOM: string): Promise<SiteProfile> {
        console.log(`[PageAnalysisService] Analyzing page structure for: ${domain}`);
        console.log(`[PageAnalysisService] DOM size: ${pageDOM.length} characters`);

        // Check if we already have a profile
        const existing = siteProfiles.get(domain);
        if (existing) {
            console.log(`[PageAnalysisService] Using cached profile for ${domain}`);
            return existing;
        }

        if (!this.model) {
            console.log('[PageAnalysisService] No AI model available, using fallback analysis');
            return this.createFallbackProfile(domain, pageDOM);
        }

        try {
            // Truncate DOM if too large (Gemini has token limits)
            const truncatedDOM = pageDOM.length > 50000
                ? pageDOM.substring(0, 50000) + '\n<!-- truncated -->'
                : pageDOM;

            const prompt = PAGE_ANALYSIS_PROMPT + truncatedDOM;

            console.log(`[PageAnalysisService] Sending to Gemini for analysis...`);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log(`[PageAnalysisService] Received Gemini response (${text.length} chars)`);

            // Parse the JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            const profile: SiteProfile = {
                domain,
                analyzedAt: new Date().toISOString(),
                pageType: analysis.pageType || 'unknown',
                dataFields: analysis.dataFields || [],
                navigationPatterns: analysis.navigationPatterns || [],
                suggestedActions: analysis.suggestedActions || [],
                confidence: analysis.confidence || 50,
                rawAnalysis: text
            };

            // Cache the profile
            siteProfiles.set(domain, profile);

            console.log(`[PageAnalysisService] Profile created for ${domain}:`);
            console.log(`  - Page type: ${profile.pageType}`);
            console.log(`  - Data fields: ${profile.dataFields.length}`);
            console.log(`  - Navigation patterns: ${profile.navigationPatterns.length}`);
            console.log(`  - Confidence: ${profile.confidence}%`);

            return profile;

        } catch (error) {
            console.error('[PageAnalysisService] AI analysis failed:', error);
            return this.createFallbackProfile(domain, pageDOM);
        }
    }

    /**
     * Create a basic profile using heuristics when AI is unavailable
     */
    private createFallbackProfile(domain: string, pageDOM: string): SiteProfile {
        const dataFields: DataField[] = [];
        const navigationPatterns: NavigationPattern[] = [];

        // Simple heuristic detection
        const hasTable = pageDOM.includes('<table');
        const hasList = pageDOM.includes('<ul') || pageDOM.includes('<ol');
        const hasCards = pageDOM.includes('card') || pageDOM.includes('Card');
        const hasGrid = pageDOM.includes('grid') || pageDOM.includes('Grid');

        // Detect common data patterns
        if (hasTable) {
            dataFields.push({
                name: 'table_data',
                description: 'Data from table elements',
                selector: 'table tr',
                type: 'table',
                example: 'Row data'
            });
        }

        if (hasList) {
            dataFields.push({
                name: 'list_items',
                description: 'List item contents',
                selector: 'ul li, ol li',
                type: 'list',
                example: 'List item'
            });
        }

        if (hasCards || hasGrid) {
            dataFields.push({
                name: 'card_content',
                description: 'Content from card/grid elements',
                selector: '.card, [class*="card"], .grid-item',
                type: 'text',
                example: 'Card content'
            });
        }

        // Detect navigation
        const hasLogout = pageDOM.includes('logout') || pageDOM.includes('sign-out');
        if (hasLogout) {
            navigationPatterns.push({
                name: 'logout',
                description: 'Logout/Sign out button',
                selector: '[href*="logout"], [href*="sign-out"], .logout',
                action: 'click'
            });
        }

        const profile: SiteProfile = {
            domain,
            analyzedAt: new Date().toISOString(),
            pageType: hasTable ? 'list' : hasCards ? 'dashboard' : 'unknown',
            dataFields,
            navigationPatterns,
            suggestedActions: ['Extract visible data', 'Navigate to detail pages'],
            confidence: 30
        };

        siteProfiles.set(domain, profile);
        return profile;
    }

    /**
     * Get cached site profile
     */
    getProfile(domain: string): SiteProfile | undefined {
        return siteProfiles.get(domain);
    }

    /**
     * Get all cached profiles
     */
    getAllProfiles(): SiteProfile[] {
        return Array.from(siteProfiles.values());
    }

    /**
     * Clear a profile (for re-analysis)
     */
    clearProfile(domain: string): boolean {
        return siteProfiles.delete(domain);
    }
}

export const pageAnalysisService = new PageAnalysisService();
