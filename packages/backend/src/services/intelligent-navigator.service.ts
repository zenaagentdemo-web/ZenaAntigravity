/**
 * Intelligent Navigator Service
 * 
 * Executes user queries using learned site knowledge.
 * Uses cached action paths for speed, falls back to vision-based navigation for new tasks.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/database.js';
import { logger } from './logger.service.js';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export interface NavigationResult {
    success: boolean;
    answer?: string;
    data?: any;
    error?: string;
    executionTimeMs?: number;
    usedCache?: boolean;
}

export interface QueryIntent {
    action: 'count' | 'search' | 'list' | 'details' | 'filter' | 'unknown';
    targetSite?: string;
    parameters: {
        location?: string;
        propertyType?: string;
        bedrooms?: number;
        priceMin?: number;
        priceMax?: number;
        query?: string;
        [key: string]: any;
    };
}

// Session vault (shared with other services)
const sessionVault: Map<string, any> = new Map();

class IntelligentNavigatorService {
    private browser: Browser | null = null;

    /**
     * Get or launch browser instance
     */
    private async getBrowser(): Promise<Browser> {
        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1920x1080'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Store session for a domain
     */
    storeSession(domain: string, session: any): void {
        sessionVault.set(domain, session);
        console.log(`[IntelligentNavigator] Session stored for ${domain}`);
    }

    /**
     * Check if we have a session for a domain
     */
    hasSession(domain: string): boolean {
        return sessionVault.has(domain) || sessionVault.has(domain.replace('www.', ''));
    }

    /**
     * Main entry point: Execute a natural language query
     */
    async executeQuery(query: string, preferredDomain?: string): Promise<NavigationResult> {
        const startTime = Date.now();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[IntelligentNavigator] 🧠 Processing query: "${query}"`);
        console.log(`${'='.repeat(60)}`);

        // 1. Parse the query intent
        const intent = await this.parseQueryIntent(query);
        console.log(`[IntelligentNavigator] Intent:`, intent);

        // 2. Determine which domain to use
        const domain = preferredDomain || intent.targetSite || 'trademe.co.nz';
        console.log(`[IntelligentNavigator] Target domain: ${domain}`);

        // 3. Check if we have learned knowledge for this domain
        const hasKnowledge = await siteDiscoveryService.hasKnowledge(domain);

        if (!hasKnowledge) {
            console.log(`[IntelligentNavigator] No knowledge for ${domain}, triggering discovery...`);

            // Check if we have a session to use for discovery
            const session = sessionVault.get(domain) || sessionVault.get(domain.replace('www.', ''));

            if (!session) {
                return {
                    success: false,
                    error: `No session available for ${domain}. Please connect to ${domain} first.`,
                    executionTimeMs: Date.now() - startTime,
                    usedCache: false
                };
            }

            // Trigger discovery (this runs in background conceptually, but we wait for it here)
            try {
                await siteDiscoveryService.discoverSite(domain, session.cookies || []);
            } catch (discoveryError: any) {
                console.error(`[IntelligentNavigator] Discovery failed:`, discoveryError);
                // Continue with vision-based fallback
            }
        }

        // 4. Get the appropriate action path
        const taskType = this.intentToTaskType(intent);
        let actionPath = await siteDiscoveryService.getActionPath(domain, taskType);

        // EXTRA: Check predefined maps if no learned path exists
        if (!actionPath) {
            const map = siteNavigationMapService.getMap(domain);
            const predefinedAction = map?.actions[taskType];
            if (predefinedAction) {
                console.log(`[IntelligentNavigator] Using predefined action map for: ${taskType}`);
                actionPath = {
                    taskType,
                    description: predefinedAction.description,
                    steps: predefinedAction.steps as any,
                    extractionRules: {
                        selector: map.pages.search.resultCountSelector || 'h1',
                        type: 'count'
                    }
                };
            }
        }

        let usedCache = !!actionPath;
        logger.info(`[IntelligentNavigator] Using cached path: ${usedCache}`);

        // 5. Execute the navigation
        try {
            const result = await this.executeNavigation(
                domain,
                intent,
                actionPath
            );

            const executionTimeMs = Date.now() - startTime;
            logger.info(`[IntelligentNavigator] ✅ Query completed in ${executionTimeMs}ms`);

            return {
                ...result,
                executionTimeMs,
                usedCache
            };

        } catch (execError: any) {
            logger.error(`[IntelligentNavigator] Execution failed:`, execError);

            // Close browser on fatal error to prevent leaks
            if (this.browser) {
                await this.browser.close().catch(() => { });
                this.browser = null;
            }

            return {
                success: false,
                error: execError.message || 'Navigation execution failed',
                executionTimeMs: Date.now() - startTime,
                usedCache
            };
        }
    }

    /**
     * Parse query to determine intent
     */
    private async parseQueryIntent(query: string): Promise<QueryIntent> {
        const lowerQuery = query.toLowerCase();

        // Simple pattern matching first
        const intent: QueryIntent = {
            action: 'unknown',
            parameters: {}
        };

        // Detect action type
        if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
            intent.action = 'count';
        } else if (lowerQuery.includes('list') || lowerQuery.includes('show me') || lowerQuery.includes('find')) {
            intent.action = 'list';
        } else if (lowerQuery.includes('search') || lowerQuery.includes('looking for')) {
            intent.action = 'search';
        } else if (lowerQuery.includes('details') || lowerQuery.includes('tell me about')) {
            intent.action = 'details';
        }

        // Extract location
        const locationPatterns = [
            /in\s+([A-Za-z\s]+?)(?:,|\s+auckland|\s+nz|\s+new zealand|\?|$)/i,
            /for\s+([A-Za-z\s]+?)(?:,|\s+auckland|\s+nz|\s+new zealand|\?|$)/i,
            /([A-Za-z]+)\s+(?:area|suburb|region)/i
        ];

        for (const pattern of locationPatterns) {
            const match = query.match(pattern);
            if (match) {
                intent.parameters.location = match[1].trim();
                break;
            }
        }

        // Extract bedrooms
        const bedroomMatch = query.match(/(\d+)\s*(?:-|\s)?(?:bed|bedroom|br)/i);
        if (bedroomMatch) {
            intent.parameters.bedrooms = parseInt(bedroomMatch[1]);
        }

        // Detect target site
        if (lowerQuery.includes('trademe') || lowerQuery.includes('trade me')) {
            intent.targetSite = 'trademe.co.nz';
        } else if (lowerQuery.includes('realestate')) {
            intent.targetSite = 'realestate.co.nz';
        } else if (lowerQuery.includes('corelogic')) {
            intent.targetSite = 'corelogic.co.nz';
        }

        // If still unknown, assume search
        if (intent.action === 'unknown') {
            intent.action = 'search';
        }

        // Store original query
        intent.parameters.query = query;

        return intent;
    }

    /**
     * Map intent to task type
     */
    private intentToTaskType(intent: QueryIntent): string {
        const hasFilters = intent.parameters.bedrooms || intent.parameters.priceMin || intent.parameters.priceMax;

        switch (intent.action) {
            case 'count':
            case 'search':
            case 'list':
                return hasFilters ? 'search_properties_filtered' : 'search_properties';
            case 'details':
                return 'get_details';
            case 'report':
                return 'get_report';
            case 'filter':
                return 'apply_filter';
            default:
                return 'search_properties';
        }
    }

    /**
     * Execute navigation using learned path or vision
     */
    private async executeNavigation(
        domain: string,
        intent: QueryIntent,
        actionPath: LearnedPath | null
    ): Promise<NavigationResult> {
        const session = sessionVault.get(domain) || sessionVault.get(domain.replace('www.', ''));

        if (!session) {
            return {
                success: false,
                error: `No session for ${domain}`
            };
        }

        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            );

            // Set cookies
            if (session.cookies && session.cookies.length > 0) {
                const puppeteerCookies = session.cookies.map((c: any) => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: c.path || '/',
                    secure: c.secure || false,
                    httpOnly: c.httpOnly || false
                }));
                await page.setCookie(...puppeteerCookies);
                console.log(`[IntelligentNavigator] Set ${puppeteerCookies.length} cookies`);
            }

            if (actionPath) {
                // Execute cached path
                return this.executeCachedPath(page, domain, intent, actionPath);
            } else {
                // Fall back to vision-based navigation
                return this.executeVisionNavigation(page, domain, intent);
            }

        } catch (err: any) {
            console.error(`[IntelligentNavigator] Browser/Page error:`, err.message);
            throw err;
        } finally {
            if (page && !page.isClosed()) {
                await page.close().catch(() => { });
            }
        }
    }

    /**
     * Execute using cached action path
     */
    private async executeCachedPath(
        page: Page,
        domain: string,
        intent: QueryIntent,
        actionPath: LearnedPath
    ): Promise<NavigationResult> {
        console.log(`[IntelligentNavigator] Executing cached path: ${actionPath.taskType}`);

        for (let i = 0; i < actionPath.steps.length; i++) {
            const step = actionPath.steps[i];
            console.log(`[IntelligentNavigator] Step ${i + 1}/${actionPath.steps.length}: ${step.action}`);

            try {
                await this.executeStep(page, step, intent);

                if (step.waitAfter) {
                    await new Promise(r => setTimeout(r, step.waitAfter));
                }
            } catch (stepError: any) {
                console.error(`[IntelligentNavigator] Step failed: ${step.action}`, stepError.message);

                // If cached path fails, fall back to vision
                console.log(`[IntelligentNavigator] Cached path failed, falling back to vision...`);
                return this.executeVisionNavigation(page, domain, intent);
            }
        }

        // Extract data based on extraction rules
        if (actionPath.extractionRules) {
            const data = await this.extractData(page, actionPath.extractionRules);
            const answer = this.formatAnswer(intent, data);

            return {
                success: true,
                answer,
                data
            };
        }

        return {
            success: true,
            answer: 'Navigation completed successfully'
        };
    }

    /**
     * Execute a single navigation step
     */
    private async executeStep(page: Page, step: NavigationStep, intent: QueryIntent): Promise<void> {
        // Substitute parameters in target/value
        let target = step.target || '';
        let value = step.value || '';

        // Replace {{location}} with actual location
        if (intent.parameters.location) {
            target = target.replace(/{{location}}/g, intent.parameters.location);
            value = value.replace(/{{location}}/g, intent.parameters.location);
        }

        // Replace {{bedrooms}} with actual bedrooms
        if (intent.parameters.bedrooms) {
            target = target.replace(/{{bedrooms}}/g, String(intent.parameters.bedrooms));
            value = value.replace(/{{bedrooms}}/g, String(intent.parameters.bedrooms));
        }

        // Replace other parameters
        for (const [key, val] of Object.entries(intent.parameters)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            target = target.replace(regex, String(val));
            value = value.replace(regex, String(val));
        }

        switch (step.action) {
            case 'navigate':
                console.log(`[IntelligentNavigator] Navigating to: ${target}`);
                await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });
                break;

            case 'wait':
                console.log(`[IntelligentNavigator] Waiting for: ${target}`);
                await page.waitForSelector(target, { timeout: 10000 }).catch(() => {
                    console.log(`[IntelligentNavigator] Wait selector not found, continuing...`);
                });
                break;

            case 'type':
                console.log(`[IntelligentNavigator] Typing "${value}" into: ${target}`);
                // Try multiple selectors
                const selectors = target.split(',').map(s => s.trim());
                let typed = false;
                let typedSelector = '';

                for (const selector of selectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 3000 });
                        await page.click(selector);
                        await page.type(selector, value, { delay: 50 });
                        typed = true;
                        typedSelector = selector;
                        console.log(`[IntelligentNavigator] Successfully typed using: ${selector}`);
                        break;
                    } catch {
                        continue;
                    }
                }

                if (!typed) {
                    throw new Error(`Could not find any input matching: ${target}`);
                }

                // NEW: If this was a price field and we have an adjustment, re-read and adjust
                if ((target.includes('price') || target.includes('amount')) && intent.parameters.priceAdjustment) {
                    console.log(`[IntelligentNavigator] Applying price adjustment of ${intent.parameters.priceAdjustment}`);
                    try {
                        const currentValueRaw = await page.$eval(typedSelector, (el: any) => el.value);
                        const currentValue = parseInt(currentValueRaw.replace(/[^0-9]/g, ''));
                        if (!isNaN(currentValue)) {
                            const newValue = currentValue + intent.parameters.priceAdjustment;
                            console.log(`[IntelligentNavigator] Calculated new price: ${newValue} (from ${currentValue})`);
                            await page.click(typedSelector, { clickCount: 3 }); // Select all
                            await page.keyboard.press('Backspace');
                            await page.type(typedSelector, String(newValue), { delay: 50 });
                        }
                    } catch (e) {
                        console.error(`[IntelligentNavigator] Price adjustment calculation failed:`, e);
                    }
                }
                break;

            case 'click':
                console.log(`[IntelligentNavigator] Clicking: ${target}`);
                const clickSelectors = target.split(',').map(s => s.trim());
                let clicked = false;

                for (const selector of clickSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 3000 });
                        await page.click(selector);
                        clicked = true;
                        console.log(`[IntelligentNavigator] Successfully clicked: ${selector}`);
                        break;
                    } catch {
                        continue;
                    }
                }

                if (!clicked) {
                    // Try pressing Enter as fallback for search
                    console.log(`[IntelligentNavigator] Click failed, trying Enter key...`);
                    await page.keyboard.press('Enter');
                }

                // Wait for navigation
                await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
                break;

            case 'select':
                await page.select(target, value);
                break;

            case 'extract':
                // Extraction is handled separately
                break;

            case 'screenshot':
                await page.screenshot({ path: target });
                break;
        }
    }

    /**
     * Extract data from page
     */
    private async extractData(page: Page, rules: any): Promise<any> {
        const selectors = rules.selector.split(',').map((s: string) => s.trim());

        // Debug: Log current page info
        const url = page.url();
        const title = await page.title();
        console.log(`[IntelligentNavigator] Extracting from: ${url} (${title})`);

        for (const selector of selectors) {
            try {
                const exists = await page.$(selector);
                if (exists) {
                    console.log(`[IntelligentNavigator] Found element: ${selector}`);

                    if (rules.type === 'count') {
                        const text = await page.$eval(selector, el => el.textContent || '');
                        const match = text.match(/(\d+)/);
                        const count = match ? parseInt(match[1]) : 0;

                        console.log(`[IntelligentNavigator] Extracted count: ${count} from "${text.trim().substring(0, 50)}"`);

                        return { type: 'count', value: count, raw: text.trim() };
                    }

                    if (rules.type === 'text') {
                        const text = await page.$eval(selector, el => el.textContent || '');
                        return { type: 'text', value: text.trim() };
                    }

                    if (rules.type === 'list') {
                        const items = await page.$$eval(selector, els =>
                            els.slice(0, 20).map(el => ({
                                text: el.textContent?.trim() || '',
                                href: (el as HTMLAnchorElement).href || ''
                            }))
                        );
                        return { type: 'list', items, count: items.length };
                    }
                }
            } catch (e) {
                console.log(`[IntelligentNavigator] Selector ${selector} failed:`, (e as Error).message);
            }
        }

        // If no selector worked, try to extract any visible count from h1
        try {
            const h1Text = await page.$eval('h1', el => el.textContent || '');
            const match = h1Text.match(/(\d+)/);
            if (match) {
                console.log(`[IntelligentNavigator] Fallback: Found count in h1: ${match[1]}`);
                return { type: 'count', value: parseInt(match[1]), raw: h1Text };
            }
        } catch {
            console.log(`[IntelligentNavigator] No h1 found for fallback extraction`);
        }

        // Ultimate fallback: take screenshot and use vision
        console.log(`[IntelligentNavigator] All selectors failed, using vision extraction...`);
        return this.extractWithVision(page);
    }

    /**
     * Extract data using Gemini Vision (fallback)
     * Extract data using vision (Gemini Vision)
     */
    private async extractWithVision(page: Page, intent: QueryIntent): Promise<any> {
        try {
            const screenshot = await page.screenshot({ encoding: 'base64' });

            const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });

            const result = await model.generateContent([
                {
                    text: `Look at this real estate search results page. 
                    
                    Find and return ONLY the number of properties/results shown on this page.
                    
                    IMPORTANT: The user has applied filters (location: ${intent.parameters.location || 'any'}, bedrooms: ${intent.parameters.bedrooms || 'any'}). 
                    Find the specific count that reflects these filters.
                    
                    Look for text like:
                    - "Showing X results"
                    - "X properties for sale"
                    - "X listings"
                    - A large number next to "results"
                    
                    Return ONLY a JSON object: {"count": <number>, "rawText": "<the exact text you found>"}
                    
                    If you cannot find a count, return: {"count": 0, "rawText": "not found"}`
                },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: screenshot as string
                    }
                }
            ]);

            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            try {
                const data = JSON.parse(cleanJson);
                console.log(`[IntelligentNavigator] Vision extraction result:`, data);
                return { type: 'count', value: data.count || 0, raw: data.rawText };
            } catch {
                console.log(`[IntelligentNavigator] Vision parse failed:`, cleanJson);
                return { type: 'count', value: 0, raw: 'Vision extraction failed' };
            }

        } catch (visionError: any) {
            console.error(`[IntelligentNavigator] Vision extraction failed:`, visionError.message);
            return { type: 'count', value: 0, raw: 'Error' };
        }
    }

    /**
     * Vision-based navigation (when no cached path exists)
     */
    private async executeVisionNavigation(
        page: Page,
        domain: string,
        intent: QueryIntent
    ): Promise<NavigationResult> {
        console.log(`[IntelligentNavigator] Using vision-based navigation for ${domain}`);

        try {
            // Navigate to main page or specific section if known
            let mainUrl = `https://www.${domain}`;
            if (domain.includes('trademe.co.nz') && (intent.action === 'count' || intent.action === 'search' || intent.action === 'list')) {
                // Point directly to property section to avoid generic home page search
                mainUrl = 'https://www.trademe.co.nz/a/property/residential/sale';
            }

            console.log(`[IntelligentNavigator] Navigating to: ${mainUrl}`);
            await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Take screenshot and ask vision where to search
            const screenshot = await page.screenshot({ encoding: 'base64' });

            const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });

            const searchPrompt = `I want to search for properties in "${intent.parameters.location || 'Auckland'}".

Looking at this web page, tell me:
1. Where is the search input field? Describe its approximate location (top, center, sidebar, etc.)
2. What does the search button look like?
3. Are there any visible property links or categories I should click?

Return a JSON object:
{
    "searchFieldLocation": "description of where search field is",
    "searchFieldPlaceholder": "what the placeholder text says if visible",
    "hasSearchButton": true/false,
    "searchButtonText": "text on search button if visible",
    "suggestedAction": "type in search" | "click category" | "navigate to property section",
    "categoryLinks": ["list of visible category/section links"],
    "isPropertyPage": true/false
}`;

            const visionResult = await model.generateContent([
                { text: searchPrompt },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: screenshot as string
                    }
                }
            ]);

            const visionText = visionResult.response.text();
            console.log(`[IntelligentNavigator] Vision guidance:`, visionText.substring(0, 200));

            // Try to find and use search
            const searchSelectors = [
                'input[data-testid="searchbar-input"]', // Trade Me specific
                'input[name="search_string"]',        // Trade Me legacy
                'input[type="search"]',
                'input[placeholder*="search"]',
                'input[placeholder*="Search"]',
                'input[name*="search"]',
                '.search-input',
                '[data-testid*="search"]',
                'input.search',
                '#search',
                'input[aria-label*="search"]'
            ];

            let searchFound = false;
            for (const selector of searchSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        console.log(`[IntelligentNavigator] Found search input: ${selector}`);
                        await page.click(selector);
                        await page.type(selector, intent.parameters.location || 'Auckland', { delay: 50 });
                        await page.keyboard.press('Enter');
                        searchFound = true;
                        break;
                    }
                } catch {
                    continue;
                }
            }

            if (!searchFound) {
                console.log(`[IntelligentNavigator] Could not find search input`);
                return {
                    success: false,
                    error: 'Could not find search functionality on the page'
                };
            }

            // Wait for results
            await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
            await new Promise(r => setTimeout(r, 2000));

            // NEW: Apply filters after initial search
            let filtersApplied = false;
            if (intent.parameters.bedrooms || intent.parameters.priceMin || intent.parameters.priceMax) {
                filtersApplied = await this.applyFilters(page, domain, intent);
                if (filtersApplied) {
                    console.log(`[IntelligentNavigator] Filters applied successfully`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            // Extract results using vision
            const data = await this.extractWithVision(page, intent);
            const answer = this.formatAnswer(intent, data);

            return {
                success: true,
                answer,
                data
            };

        } catch (error: any) {
            console.error(`[IntelligentNavigator] Vision navigation failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format extracted data into a natural language answer
     */
    private formatAnswer(intent: QueryIntent, data: any): string {
        if (!data) return 'I could not extract the requested data.';

        const location = intent.parameters.location || 'the area';
        const bedrooms = intent.parameters.bedrooms;

        switch (intent.action) {
            case 'count':
            case 'search':
                if (data.type === 'count') {
                    const bedroomText = bedrooms ? `${bedrooms}-bedroom ` : '';
                    return `There are ${data.value} ${bedroomText}properties for sale in ${location}.`;
                }
                break;

            case 'list':
                if (data.type === 'list' && data.items) {
                    let answer = `I found ${data.count} properties in ${location}:\n\n`;
                    data.items.slice(0, 5).forEach((item: any, idx: number) => {
                        answer += `${idx + 1}. ${item.text}\n`;
                    });
                    if (data.count > 5) {
                        answer += `\n...and ${data.count - 5} more.`;
                    }
                    return answer;
                }
                break;
        }

        return `Extracted data: ${JSON.stringify(data).substring(0, 200)}`;
    }

    /**
     * Apply filters (bedrooms, etc.) using vision or known selectors
     */
    private async applyFilters(page: Page, domain: string, intent: QueryIntent): Promise<boolean> {
        console.log(`[IntelligentNavigator] Attempting to apply filters for ${domain}`);

        // 1. Try known selectors for Trade Me
        if (domain.includes('trademe.co.nz')) {
            try {
                if (intent.parameters.bedrooms) {
                    const beds = intent.parameters.bedrooms;

                    // Click Bedroom filter
                    const filterSelector = '[data-testid="filter-bedrooms"], button:has-text("Bedrooms")';
                    await page.waitForSelector(filterSelector, { timeout: 5000 });
                    await page.click(filterSelector);
                    await new Promise(r => setTimeout(r, 800));

                    // In Trade Me popovers, there are usually 'From' and 'To' selects
                    await page.evaluate((b) => {
                        const selects = Array.from(document.querySelectorAll('select'));
                        if (selects.length >= 2) {
                            selects[0].value = String(b);
                            selects[1].value = String(b);
                            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                            selects[1].dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        return false;
                    }, beds);

                    // Click Apply/View button
                    await page.click('button:has-text("View"), [data-testid="filter-apply"]').catch(() => { });
                    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => { });
                    return true;
                }
            } catch (e) {
                console.log(`[IntelligentNavigator] Known selector filter failed, falling back to vision...`);
            }
        }

        // 2. Vision fallback to apply filters
        try {
            const screenshot = await page.screenshot({ encoding: 'base64' });
            const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });

            const prompt = `I need to apply filters to this property search. 
            User wants exactly ${intent.parameters.bedrooms || 'any'} bedrooms.
            
            How do I do this? 
            Return a JSON with the click coordinates or selector:
            {"action": "click", "selector": "string", "description": "what to click"}
            
            If multiple steps are needed, just give the first one.`;

            const result = await model.generateContent([{ text: prompt }, { inlineData: { mimeType: 'image/png', data: screenshot as string } }]);
            console.log(`[IntelligentNavigator] Vision filter guidance:`, result.response.text());

            // For now, return false to indicate we might still be at the total count
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Cleanup
     */
    async shutdown(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export const intelligentNavigatorService = new IntelligentNavigatorService();
