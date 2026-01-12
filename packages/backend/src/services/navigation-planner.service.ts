/**
 * Navigation Planner Service
 * 
 * Uses LLM (Gemini) to convert natural language questions into
 * navigation action sequences that the Cloud Robot can execute.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    siteNavigationMapService,
    SiteNavigationMap,
    NavAction,
    ActionSequence
} from './site-navigation-maps.js';
import { logger } from './logger.service.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface NavigationIntent {
    action: 'search' | 'getDetails' | 'count' | 'list' | 'compare' | 'report' | 'write' | 'summarizePortfolio' | 'unknown';
    targetSite?: string;
    parameters: {
        location?: string;
        address?: string;
        bedrooms?: number;
        bathrooms?: number;
        priceMin?: number;
        priceMax?: number;
        priceUpdate?: number;
        priceAdjustment?: number; // e.g. -10000
        propertyType?: string;
        query?: string;
        maxPages?: number; // Phase 6
        drillDown?: boolean; // Phase 6
        writeAction?: string; // Phase 7
        writePayload?: {
            address?: string;
            newPrice?: number;
            adjustment?: number;
            note?: string;
            currentPrice?: number;
            [key: string]: any;
        };
    };
    confidence: number;
}

export interface NavigationPlan {
    intent: NavigationIntent;
    domain: string;
    steps: NavAction[];
    expectedOutput: string;
    isCustomSite: boolean;
}

// ===========================================
// PROMPT TEMPLATE
// ===========================================

const INTENT_PARSING_PROMPT = `You are an intent parser for a real estate AI assistant. 
Analyze the user's question and extract structured navigation intent.

Available actions:
- search: General property search by location
- getDetails: Get specific property details by address
- count: Count properties matching criteria
- list: List properties matching criteria
- compare: Compare multiple properties
- report: Generate a detailed comparable sales report (CMA) for an address
- write: Perform a mutative action (log note, update field, change status)
- summarizePortfolio: Provide an executive summary of ALL active deals and portfolio health

Available target sites (use domain):
{{availableSites}}

User Question: "{{question}}"

Return JSON only, no explanation:
{
    "action": "search|getDetails|count|list|compare|report|summarizePortfolio|unknown",
    "targetSite": "domain or null if not specified",
    "parameters": {
        "location": "suburb or area if mentioned",
        "address": "specific address if mentioned",
        "bedrooms": number or null,
        "bathrooms": number or null,
        "priceMin": number or null,
        "priceMax": number or null,
        "propertyType": "house|apartment|land|etc or null",
        "query": "any other search terms",
        "maxPages": number,
        "drillDown": boolean,
        "writeAction": "logNote|updateStatus|updatePrice|etc",
        "writePayload": { "address": "string", "newPrice": number, "adjustment": "number (negative for reductions, positive for increases)" }
    },
    "confidence": 0.0-1.0
}`;

// ===========================================
// NAVIGATION PLANNER SERVICE
// ===========================================

export class NavigationPlannerService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: modelName });
            logger.info(`[NavigationPlanner] Initialized with Gemini model: ${modelName}`);
        } else {
            logger.warn('[NavigationPlanner] No API key found, using fallback parsing');
        }
    }

    /**
     * Parse user question into navigation intent using LLM
     */
    async parseIntent(question: string): Promise<NavigationIntent> {
        logger.info(`[NavigationPlanner] Parsing intent: "${question}"`);

        // Get available sites for context
        const availableSites = siteNavigationMapService.getAllMaps()
            .map(m => `- ${m.name} (${m.domain})`)
            .join('\n');

        if (this.model) {
            try {
                const prompt = INTENT_PARSING_PROMPT
                    .replace('{{availableSites}}', availableSites)
                    .replace('{{question}}', question);

                const result = await this.model.generateContent(prompt);
                const text = result.response.text();

                // Extract JSON from response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const intent = JSON.parse(jsonMatch[0]) as NavigationIntent;
                    logger.info('[NavigationPlanner] Parsed intent from LLM:', intent);
                    return intent;
                }
            } catch (error) {
                logger.error('[NavigationPlanner] LLM parsing error:', error);
            }
        }

        // Fallback: Simple keyword-based parsing
        return this.fallbackParse(question);
    }

    /**
     * Fallback intent parsing using keywords
     */
    private fallbackParse(question: string): NavigationIntent {
        const lower = question.toLowerCase();

        const intent: NavigationIntent = {
            action: 'unknown',
            parameters: {},
            confidence: 0.5
        };

        // Detect action type
        if (lower.includes('how many') || lower.includes('count')) {
            intent.action = 'count';
        } else if (lower.includes('details') || lower.includes('info about') || lower.includes('tell me about')) {
            intent.action = 'getDetails';
        } else if (lower.includes('list') || lower.includes('show me')) {
            intent.action = 'list';
        } else if (lower.includes('compare')) {
            intent.action = 'compare';
        } else if (lower.includes('search') || lower.includes('find') || lower.includes('for sale')) {
            intent.action = 'search';
        } else if (lower.includes('log') || lower.includes('update') || lower.includes('save') || lower.includes('set')) {
            intent.action = 'write';
            if (lower.includes('note')) intent.parameters.writeAction = 'logNote';
            if (lower.includes('price')) intent.parameters.writeAction = 'updatePrice';
        }

        // Detect price adjustment
        const adjustMatch = lower.match(/(reduce|lower|increase|raise).*by\s*\$?(\d+,?\d*)/);
        if (adjustMatch) {
            const amount = parseInt(adjustMatch[2].replace(',', ''));
            const adjustment = lower.includes('reduce') || lower.includes('lower') ? -amount : amount;
            intent.parameters.priceAdjustment = adjustment;

            if (intent.action === 'write') {
                if (!intent.parameters.writePayload) intent.parameters.writePayload = {};
                intent.parameters.writePayload.adjustment = adjustment;
            }
        }

        // Extract address (look for street patterns, including units)
        const addressMatch = question.match(/(?:\d+\/)?\d+\s+[\w\s]+(?:road|street|avenue|drive|place|lane|way|rd|st|ave|dr|pl|ln|wy)/i);
        if (addressMatch) {
            const addr = addressMatch[0].trim();
            intent.parameters.address = addr;
            if (intent.action === 'write') {
                if (!intent.parameters.writePayload) intent.parameters.writePayload = {};
                intent.parameters.writePayload.address = addr;
            }
        }

        // Phase 6: Pagination / Depth
        if (lower.includes('all') || lower.includes('every') || lower.includes('top 50') || lower.includes('many')) {
            intent.parameters.maxPages = 3; // Default for "all" in demo
        }
        if (lower.includes('detailed') || lower.includes('full info') || lower.includes('deep') || lower.includes('cv for each')) {
            intent.parameters.drillDown = true;
        }

        // Detect target site
        if (lower.includes('trade me') || lower.includes('trademe')) {
            intent.targetSite = 'trademe.co.nz';
        } else if (lower.includes('oneroof') || lower.includes('one roof')) {
            intent.targetSite = 'oneroof.co.nz';
        } else if (lower.includes('corelogic') || lower.includes('core logic') || lower.includes('cv')) {
            intent.targetSite = 'corelogic.co.nz';
        }

        // Extract location (common NZ suburbs)
        const suburbs = [
            'takapuna', 'devonport', 'ponsonby', 'grey lynn', 'remuera',
            'epsom', 'parnell', 'mission bay', 'st heliers', 'kohimarama',
            'herne bay', 'westmere', 'pt chev', 'point chevalier', 'mt eden',
            'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga'
        ];

        for (const suburb of suburbs) {
            if (lower.includes(suburb)) {
                intent.parameters.location = suburb.split(' ').map(
                    w => w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ');
                break;
            }
        }

        // Extract bedrooms
        const bedroomMatch = lower.match(/(\d+)\s*(?:bed|bedroom|br)/);
        if (bedroomMatch) {
            intent.parameters.bedrooms = parseInt(bedroomMatch[1]);
        }


        return intent;
    }

    /**
     * Create a navigation plan from intent
     */
    async createPlan(question: string, preferredDomain?: string): Promise<NavigationPlan | null> {
        const intent = await this.parseIntent(question);

        // Determine which site to use
        const domain = preferredDomain || intent.targetSite || 'trademe.co.nz';
        const navMap = siteNavigationMapService.getMap(domain);

        if (!navMap) {
            console.log(`[NavigationPlanner] No navigation map for: ${domain}`);
            return null;
        }

        console.log(`[NavigationPlanner] Creating plan for ${domain}, action: ${intent.action}`);

        const plan: NavigationPlan = {
            intent,
            domain,
            steps: [],
            expectedOutput: '',
            isCustomSite: navMap.isCustom
        };

        // Build steps based on intent
        switch (intent.action) {
            case 'count':
            case 'search':
            case 'list':
                plan.steps = this.buildSearchSteps(navMap, intent);
                plan.expectedOutput = 'Property listing count and results';
                break;

            case 'getDetails':
                plan.steps = this.buildDetailsSteps(navMap, intent);
                plan.expectedOutput = 'Property details object';
                break;

            case 'compare':
                plan.steps = this.buildCompareSteps(navMap, intent);
                plan.expectedOutput = 'Comparison data for multiple properties';
                break;

            case 'write':
                plan.steps = this.buildWriteSteps(navMap, intent);
                plan.expectedOutput = 'Status of write operation';
                break;

            case 'report':
                plan.steps = this.buildReportSteps(navMap, intent);
                plan.expectedOutput = 'Detailed property insights and comparable sales';
                break;

            default:
                // For custom sites, use generic extraction
                if (navMap.isCustom) {
                    const extractAction = navMap.actions.extractCurrentPage;
                    if (extractAction) {
                        plan.steps = [...extractAction.steps];
                        plan.expectedOutput = 'Page data extraction';
                    }
                }
        }

        // Substitute parameters into steps
        plan.steps = this.substituteParameters(plan.steps, intent.parameters);

        console.log(`[NavigationPlanner] Plan created with ${plan.steps.length} steps`);
        return plan;
    }

    /**
     * Build steps for search/count/list actions
     */
    private buildSearchSteps(navMap: SiteNavigationMap, intent: NavigationIntent): NavAction[] {
        const steps: NavAction[] = [];
        const searchConfig = navMap.pages.search;

        if (!searchConfig) {
            console.log('[NavigationPlanner] No search config for this site');
            return steps;
        }

        // Navigate to search page
        steps.push({
            type: 'navigate',
            url: navMap.baseUrl + searchConfig.url
        });

        // Wait for search field
        steps.push({
            type: 'wait',
            waitFor: searchConfig.searchField,
            timeout: 10000
        });

        // Type search query
        const searchTerm = intent.parameters.location ||
            intent.parameters.address ||
            intent.parameters.query || '';

        if (searchTerm) {
            steps.push({
                type: 'type',
                selector: searchConfig.searchField,
                value: searchTerm
            });
        }

        // Submit search
        if (searchConfig.submitButton) {
            steps.push({
                type: 'click',
                selector: searchConfig.submitButton
            });
        }

        // Wait for results
        steps.push({
            type: 'wait',
            waitFor: searchConfig.resultsContainer,
            timeout: 15000
        });

        // Extract results
        if (intent.action === 'count' && searchConfig.resultCountSelector) {
            steps.push({
                type: 'extract',
                selector: searchConfig.resultCountSelector,
                extractType: 'count'
            });
        } else {
            const extractStep: NavAction = {
                type: 'extract',
                selector: searchConfig.resultItemSelector,
                extractType: 'list',
                maxPages: intent.parameters.maxPages || 1
            };

            // If drillDown is requested, add the detail page steps
            if (intent.parameters.drillDown && navMap.pages.propertyDetail) {
                const detailConfig = navMap.pages.propertyDetail;
                const drillSteps: NavAction[] = [];

                // For each detail field, add an extract step
                for (const [fieldName, selector] of Object.entries(detailConfig.fields)) {
                    drillSteps.push({
                        type: 'extract',
                        selector: selector,
                        extractType: 'text'
                    });
                }

                extractStep.drillDown = { steps: drillSteps };
            }

            steps.push(extractStep);
        }

        return steps;
    }

    /**
     * Build steps for property detail retrieval
     */
    private buildDetailsSteps(navMap: SiteNavigationMap, intent: NavigationIntent): NavAction[] {
        const steps: NavAction[] = [];
        const searchConfig = navMap.pages.search;
        const detailConfig = navMap.pages.propertyDetail;

        if (!searchConfig || !detailConfig) {
            return steps;
        }

        // Search for the property first
        steps.push({
            type: 'navigate',
            url: navMap.baseUrl + searchConfig.url
        });

        steps.push({
            type: 'wait',
            waitFor: searchConfig.searchField,
            timeout: 10000
        });

        const address = intent.parameters.address || intent.parameters.query || '';
        steps.push({
            type: 'type',
            selector: searchConfig.searchField,
            value: address
        });

        // Wait for autocomplete and click first result
        steps.push({
            type: 'wait',
            waitFor: '.autocomplete-suggestion, .suggestion, .search-suggestion',
            timeout: 5000
        });

        steps.push({
            type: 'click',
            selector: '.autocomplete-suggestion:first-child, .suggestion:first-child'
        });

        // Wait for detail page
        steps.push({
            type: 'wait',
            waitFor: Object.values(detailConfig.fields)[0],
            timeout: 15000
        });

        // Extract all detail fields
        for (const [fieldName, selector] of Object.entries(detailConfig.fields)) {
            steps.push({
                type: 'extract',
                selector: selector,
                extractType: 'text'
            });
        }

        return steps;
    }

    /**
     * Build steps for comparison (multiple properties)
     */
    private buildCompareSteps(navMap: SiteNavigationMap, intent: NavigationIntent): NavAction[] {
        // For now, just do a search - comparison logic can be added later
        return this.buildSearchSteps(navMap, intent);
    }

    /**
     * Build steps for mutative write actions
     */
    private buildWriteSteps(navMap: SiteNavigationMap, intent: NavigationIntent): NavAction[] {
        const steps: NavAction[] = [];
        const writeAction = intent.parameters.writeAction;

        if (!writeAction || !navMap.pages.crmWrite || !navMap.pages.crmWrite[writeAction]) {
            console.log(`[NavigationPlanner] No write action config for: ${writeAction}`);
            return this.buildSearchSteps(navMap, intent); // Fallback to search
        }

        // 1. Navigate to target object (e.g. search for property first)
        const searchSteps = this.buildSearchSteps(navMap, intent);
        steps.push(...searchSteps);

        // 2. Add the specific write steps
        const actionSequence = navMap.pages.crmWrite[writeAction];
        steps.push(...actionSequence.steps);

        return steps;
    }

    /**
     * Build steps for a detailed CMA report
     */
    private buildReportSteps(navMap: SiteNavigationMap, intent: NavigationIntent): NavAction[] {
        const steps: NavAction[] = [];
        const domain = navMap.domain;

        if (domain === 'trademe.co.nz') {
            // Specialized Trade Me Insights path
            steps.push({ type: 'navigate', url: 'https://www.trademe.co.nz/a/property/insights' });
            steps.push({ type: 'wait', waitFor: 'input[placeholder*="address"]', timeout: 5000 });
            steps.push({ type: 'type', selector: 'input[placeholder*="address"]', value: intent.parameters.address || '' });
            steps.push({ type: 'wait', waitFor: '.autocomplete-suggestion, .suggestion', timeout: 3000 });
            steps.push({ type: 'click', selector: '.autocomplete-suggestion:first-child, .suggestion:first-child' });
            steps.push({ type: 'wait', waitFor: '.property-insights, .tm-property-insights', timeout: 15000 });

            // Extract everything!
            steps.push({ type: 'extract', selector: '.tm-property-insights__profile-section', extractType: 'text' });
            steps.push({ type: 'extract', selector: '.tm-property-insights__estimate-section', extractType: 'text' });
            steps.push({ type: 'extract', selector: '.tm-property-insights__comparables-section, .comparables-table', extractType: 'table' });
        } else {
            // Fallback: details + search
            return this.buildDetailsSteps(navMap, intent);
        }

        return steps;
    }

    /**
     * Substitute parameters into step values
     */
    private substituteParameters(steps: NavAction[], params: Record<string, any>): NavAction[] {
        const payload = params.writePayload || {};

        return steps.map(step => {
            const newStep = { ...step };

            // Replace {{param}} placeholders in values
            if (newStep.value) {
                // Check in main parameters
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined && value !== null && key !== 'writePayload') {
                        newStep.value = newStep.value.replace(`{{${key}}}`, String(value));
                    }
                }
                // Check in write payload
                for (const [key, value] of Object.entries(payload)) {
                    if (value !== undefined && value !== null) {
                        newStep.value = newStep.value.replace(`{{${key}}}`, String(value));
                    }
                }
            }

            if (newStep.url) {
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined && value !== null) {
                        newStep.url = newStep.url.replace(`{{${key}}}`, String(value));
                    }
                }
            }

            return newStep;
        });
    }

    /**
     * Check if a question is asking about 3rd party data
     */
    isThirdPartyQuery(question: string): boolean {
        const lower = question.toLowerCase();

        // Check for explicit site mentions
        const siteMentions = [
            'trade me', 'trademe', 'oneroof', 'one roof',
            'corelogic', 'core logic', 'homes.co.nz', 'realestate.co.nz'
        ];

        if (siteMentions.some(s => lower.includes(s))) {
            return true;
        }

        // Check for property-related queries that need external data
        const propertyQueries = [
            'for sale', 'on the market', 'listed', 'listing',
            'cv', 'capital value', 'estimate', 'valuation',
            'sold for', 'last sold', 'sale price',
            'how many properties', 'properties in'
        ];

        return propertyQueries.some(q => lower.includes(q));
    }
}

export const navigationPlannerService = new NavigationPlannerService();
