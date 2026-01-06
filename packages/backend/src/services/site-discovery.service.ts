/**
 * Site Discovery Service
 * 
 * Uses Puppeteer + Gemini Vision to intelligently learn website UI structures.
 * This is the "hive mind" learning system that makes Zena scalable across any site.
 * 
 * Flow:
 * 1. Launch headless browser with user's captured cookies
 * 2. Navigate to site and take screenshots
 * 3. Send screenshots to Gemini Vision for UI analysis
 * 4. Store learned UI map and action paths in database
 * 5. All future users benefit from cached knowledge
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/database.js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Gemini Vision
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

// Screenshot storage directory
const SCREENSHOT_DIR = path.join(process.cwd(), 'site-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export interface UIElement {
    type: 'button' | 'input' | 'link' | 'select' | 'form' | 'container' | 'text';
    label?: string;
    selector?: string;
    location?: { x: number; y: number; width: number; height: number };
    purpose?: string;
    children?: UIElement[];
}

export interface PageMap {
    url: string;
    title: string;
    screenshotPath: string;
    elements: UIElement[];
    navigation: string[];
    forms: { name: string; fields: string[] }[];
    searchCapabilities: string[];
    dataDisplayAreas: string[];
}

export interface SiteUIMap {
    domain: string;
    pages: PageMap[];
    globalNavigation: string[];
    commonActions: { action: string; description: string; pageUrl: string }[];
    lastAnalyzed: string;
}

export interface NavigationStep {
    action: 'navigate' | 'click' | 'type' | 'select' | 'wait' | 'extract' | 'screenshot';
    target?: string;  // Selector or URL
    value?: string;   // Value to type or select
    description: string;
    waitAfter?: number; // ms to wait after action
}

export interface LearnedPath {
    taskType: string;
    description: string;
    steps: NavigationStep[];
    extractionRules?: {
        selector: string;
        type: 'text' | 'count' | 'list' | 'table';
        postProcess?: string;
    };
}

class SiteDiscoveryService {
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
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920x1080'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Main entry point: Discover and learn a new site
     */
    async discoverSite(domain: string, cookies: any[]): Promise<SiteUIMap> {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[SiteDiscovery] 🔍 Starting discovery for: ${domain}`);
        console.log(`${'='.repeat(60)}`);

        // Update discovery status
        await prisma.siteKnowledge.upsert({
            where: { domain },
            create: {
                domain,
                displayName: domain,
                discoveryStatus: 'discovering',
                discoveryProgress: 10
            },
            update: {
                discoveryStatus: 'discovering',
                discoveryProgress: 10,
                discoveryError: null
            }
        });

        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Set cookies for authentication
            if (cookies && cookies.length > 0) {
                const puppeteerCookies = cookies.map((c: any) => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: c.path || '/',
                    secure: c.secure || false,
                    httpOnly: c.httpOnly || false,
                    ...(c.expirationDate && { expires: c.expirationDate })
                }));
                await page.setCookie(...puppeteerCookies);
                console.log(`[SiteDiscovery] Set ${puppeteerCookies.length} cookies`);
            }

            // Navigate to main site
            const mainUrl = `https://www.${domain}`;
            console.log(`[SiteDiscovery] Navigating to ${mainUrl}`);
            await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Update progress
            await prisma.siteKnowledge.update({
                where: { domain },
                data: { discoveryProgress: 30 }
            });

            // Analyze the main page
            const mainPageMap = await this.analyzeCurrentPage(page, domain, 'main');
            console.log(`[SiteDiscovery] Main page analyzed: ${mainPageMap.title}`);

            // Update progress
            await prisma.siteKnowledge.update({
                where: { domain },
                data: { discoveryProgress: 50 }
            });

            // Discover navigation items and explore key pages
            const additionalPages: PageMap[] = [];
            const navigationLinks = await this.extractNavigationLinks(page);

            console.log(`[SiteDiscovery] Found ${navigationLinks.length} navigation links`);

            // Explore up to 5 key pages
            const pagesToExplore = navigationLinks.slice(0, 5);
            for (let i = 0; i < pagesToExplore.length; i++) {
                const link = pagesToExplore[i];
                try {
                    console.log(`[SiteDiscovery] Exploring: ${link.text} (${link.href})`);
                    await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 20000 });

                    const pageMap = await this.analyzeCurrentPage(page, domain, link.text.toLowerCase().replace(/\s+/g, '_'));
                    additionalPages.push(pageMap);

                    // Update progress
                    const progress = 50 + Math.floor((i + 1) / pagesToExplore.length * 30);
                    await prisma.siteKnowledge.update({
                        where: { domain },
                        data: { discoveryProgress: progress }
                    });
                } catch (navError) {
                    console.error(`[SiteDiscovery] Failed to explore ${link.href}:`, navError);
                }
            }

            // Build the complete UI map
            const uiMap: SiteUIMap = {
                domain,
                pages: [mainPageMap, ...additionalPages],
                globalNavigation: navigationLinks.map(l => l.text),
                commonActions: this.identifyCommonActions(mainPageMap, additionalPages),
                lastAnalyzed: new Date().toISOString()
            };

            // Learn common action paths
            const actionPaths = await this.learnActionPaths(page, domain, uiMap);

            // Store in database
            await prisma.siteKnowledge.update({
                where: { domain },
                data: {
                    displayName: mainPageMap.title || domain,
                    discoveryStatus: 'completed',
                    discoveryProgress: 100,
                    lastDiscoveredAt: new Date(),
                    uiMap: uiMap as any,
                    screenshotRefs: uiMap.pages.map(p => p.screenshotPath),
                    mainUrl
                }
            });

            // Store learned action paths
            for (const path of actionPaths) {
                const siteKnowledge = await prisma.siteKnowledge.findUnique({ where: { domain } });
                if (siteKnowledge) {
                    await prisma.learnedActionPath.upsert({
                        where: {
                            siteKnowledgeId_taskType_version: {
                                siteKnowledgeId: siteKnowledge.id,
                                taskType: path.taskType,
                                version: 1
                            }
                        },
                        create: {
                            siteKnowledgeId: siteKnowledge.id,
                            taskType: path.taskType,
                            taskDescription: path.description,
                            steps: path.steps as any,
                            extractionRules: path.extractionRules as any
                        },
                        update: {
                            taskDescription: path.description,
                            steps: path.steps as any,
                            extractionRules: path.extractionRules as any,
                            updatedAt: new Date()
                        }
                    });
                }
            }

            await page.close();

            console.log(`[SiteDiscovery] ✅ Discovery complete for ${domain}`);
            console.log(`[SiteDiscovery] Learned ${uiMap.pages.length} pages, ${actionPaths.length} action paths`);

            return uiMap;

        } catch (error: any) {
            console.error(`[SiteDiscovery] ❌ Discovery failed for ${domain}:`, error);

            await prisma.siteKnowledge.update({
                where: { domain },
                data: {
                    discoveryStatus: 'failed',
                    discoveryError: error.message
                }
            });

            throw error;
        }
    }

    /**
     * Analyze current page using Gemini Vision
     */
    private async analyzeCurrentPage(page: Page, domain: string, pageName: string): Promise<PageMap> {
        // Take screenshot
        const screenshotFilename = `${domain.replace(/\./g, '_')}_${pageName}_${Date.now()}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);

        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`[SiteDiscovery] Screenshot saved: ${screenshotFilename}`);

        // Get page info
        const url = page.url();
        const title = await page.title();

        // Read screenshot as base64
        const screenshotBuffer = fs.readFileSync(screenshotPath);
        const screenshotBase64 = screenshotBuffer.toString('base64');

        // Analyze with Gemini Vision
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });

        const prompt = `Analyze this web application screenshot and identify:

1. **Navigation Elements**: All menu items, nav links, and navigation buttons
2. **Search Capabilities**: Search bars, filter options, search buttons
3. **Forms**: Any input forms with their fields
4. **Action Buttons**: Important buttons (Submit, Search, Apply, etc.)
5. **Data Display Areas**: Tables, lists, cards that show data
6. **Key Interactive Elements**: Dropdowns, checkboxes, toggles

Return a JSON object with this structure:
{
  "navigation": ["array of navigation item labels"],
  "searchElements": [
    { "type": "search_bar" | "filter" | "dropdown", "label": "string", "approximateLocation": "top/center/sidebar/etc" }
  ],
  "forms": [
    { "name": "form purpose", "fields": ["field labels"] }
  ],
  "actionButtons": [
    { "label": "button text", "purpose": "what it does" }
  ],
  "dataAreas": [
    { "type": "table" | "list" | "cards", "description": "what data it shows" }
  ],
  "pageType": "search" | "listing" | "detail" | "form" | "dashboard" | "other"
}

Only return valid JSON, no markdown formatting.`;

        try {
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: screenshotBase64
                    }
                }
            ]);

            const responseText = result.response.text();
            // Clean the response - remove markdown code blocks if present
            const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let analysis;
            try {
                analysis = JSON.parse(cleanJson);
            } catch (parseError) {
                console.error('[SiteDiscovery] Failed to parse vision response:', cleanJson);
                analysis = { navigation: [], searchElements: [], forms: [], actionButtons: [], dataAreas: [], pageType: 'other' };
            }

            console.log(`[SiteDiscovery] Vision analysis complete - Type: ${analysis.pageType}`);

            // Convert analysis to PageMap
            return {
                url,
                title,
                screenshotPath,
                elements: this.convertAnalysisToElements(analysis),
                navigation: analysis.navigation || [],
                forms: (analysis.forms || []).map((f: any) => ({ name: f.name, fields: f.fields || [] })),
                searchCapabilities: (analysis.searchElements || []).map((s: any) => `${s.type}: ${s.label}`),
                dataDisplayAreas: (analysis.dataAreas || []).map((d: any) => `${d.type}: ${d.description}`)
            };

        } catch (visionError: any) {
            console.error('[SiteDiscovery] Vision analysis failed:', visionError.message);

            // Return basic page info without vision analysis
            return {
                url,
                title,
                screenshotPath,
                elements: [],
                navigation: [],
                forms: [],
                searchCapabilities: [],
                dataDisplayAreas: []
            };
        }
    }

    /**
     * Convert vision analysis to UIElement format
     */
    private convertAnalysisToElements(analysis: any): UIElement[] {
        const elements: UIElement[] = [];

        // Add search elements
        for (const search of (analysis.searchElements || [])) {
            elements.push({
                type: 'input',
                label: search.label,
                purpose: search.type
            });
        }

        // Add action buttons
        for (const button of (analysis.actionButtons || [])) {
            elements.push({
                type: 'button',
                label: button.label,
                purpose: button.purpose
            });
        }

        // Add navigation links
        for (const nav of (analysis.navigation || [])) {
            elements.push({
                type: 'link',
                label: nav,
                purpose: 'Navigation'
            });
        }

        return elements;
    }

    /**
     * Extract navigation links from page
     */
    private async extractNavigationLinks(page: Page): Promise<{ text: string; href: string }[]> {
        return page.evaluate(() => {
            const links: { text: string; href: string }[] = [];

            // Find nav elements
            const navElements = document.querySelectorAll('nav a, header a, [role="navigation"] a');

            navElements.forEach(el => {
                const href = (el as HTMLAnchorElement).href;
                const text = el.textContent?.trim() || '';

                // Filter out empty, external, or non-content links
                if (text && href &&
                    !href.includes('login') &&
                    !href.includes('logout') &&
                    !href.includes('javascript:') &&
                    href.startsWith(window.location.origin)) {
                    links.push({ text, href });
                }
            });

            // Deduplicate
            const unique = links.filter((link, index, self) =>
                index === self.findIndex(l => l.href === link.href)
            );

            return unique.slice(0, 10); // Limit to 10 links
        });
    }

    /**
     * Identify common actions from analyzed pages
     */
    private identifyCommonActions(mainPage: PageMap, additionalPages: PageMap[]): { action: string; description: string; pageUrl: string }[] {
        const actions: { action: string; description: string; pageUrl: string }[] = [];

        // Check for search capability on main page
        if (mainPage.searchCapabilities.length > 0) {
            actions.push({
                action: 'search',
                description: `Search using: ${mainPage.searchCapabilities.join(', ')}`,
                pageUrl: mainPage.url
            });
        }

        // Check for forms
        for (const form of mainPage.forms) {
            actions.push({
                action: 'form_submit',
                description: `Submit ${form.name} form`,
                pageUrl: mainPage.url
            });
        }

        // Check additional pages
        for (const page of additionalPages) {
            if (page.searchCapabilities.length > 0 && !actions.some(a => a.action === 'search')) {
                actions.push({
                    action: 'search',
                    description: `Search on ${page.title}`,
                    pageUrl: page.url
                });
            }
        }

        return actions;
    }

    /**
     * Learn action paths based on discovered UI
     */
    private async learnActionPaths(page: Page, domain: string, uiMap: SiteUIMap): Promise<LearnedPath[]> {
        const paths: LearnedPath[] = [];

        // Determine site type and create appropriate action paths
        const isPropertySite = domain.includes('trademe') ||
            domain.includes('realestate') ||
            domain.includes('property') ||
            uiMap.pages.some(p => p.title.toLowerCase().includes('property'));

        if (isPropertySite) {
            // Property search path
            paths.push({
                taskType: 'search_properties',
                description: 'Search for properties by location',
                steps: [
                    {
                        action: 'navigate',
                        target: uiMap.pages[0]?.url || `https://www.${domain}`,
                        description: 'Navigate to main page'
                    },
                    {
                        action: 'wait',
                        target: 'input[type="search"], input[placeholder*="search"], input[name*="search"], .search-input, [data-testid*="search"]',
                        description: 'Wait for search field',
                        waitAfter: 1000
                    },
                    {
                        action: 'type',
                        target: 'input[type="search"], input[placeholder*="search"], input[name*="search"], .search-input, [data-testid*="search"]',
                        value: '{{location}}',
                        description: 'Enter search location'
                    },
                    {
                        action: 'click',
                        target: 'button[type="submit"], button:has-text("Search"), [data-testid*="submit"], .search-button',
                        description: 'Click search button',
                        waitAfter: 3000
                    },
                    {
                        action: 'wait',
                        target: '.results, .listings, .search-results, [class*="result"], [class*="listing"]',
                        description: 'Wait for results to load',
                        waitAfter: 2000
                    },
                    {
                        action: 'extract',
                        target: 'h1, .results-count, .count, [class*="count"], [class*="result"]',
                        description: 'Extract result count'
                    }
                ],
                extractionRules: {
                    selector: 'h1, .results-count, .count, [class*="count"]',
                    type: 'count',
                    postProcess: 'Extract first number from text'
                }
            });

            // Property count path (simpler)
            paths.push({
                taskType: 'count_results',
                description: 'Count search results',
                steps: [
                    {
                        action: 'extract',
                        target: 'h1, .results-count, .count, [class*="count"], [class*="showing"]',
                        description: 'Extract count from current page'
                    }
                ],
                extractionRules: {
                    selector: 'h1, .results-count, [class*="count"]',
                    type: 'count',
                    postProcess: 'Extract first number from text'
                }
            });
        }

        console.log(`[SiteDiscovery] Created ${paths.length} action paths for ${domain}`);
        return paths;
    }

    /**
     * Check if a site has been discovered
     */
    async hasKnowledge(domain: string): Promise<boolean> {
        const knowledge = await prisma.siteKnowledge.findUnique({
            where: { domain }
        });
        return knowledge?.discoveryStatus === 'completed';
    }

    /**
     * Get learned action path for a task
     */
    async getActionPath(domain: string, taskType: string): Promise<LearnedPath | null> {
        const knowledge = await prisma.siteKnowledge.findUnique({
            where: { domain },
            include: {
                actionPaths: {
                    where: { taskType, isActive: true },
                    orderBy: { version: 'desc' },
                    take: 1
                }
            }
        });

        if (knowledge?.actionPaths[0]) {
            const path = knowledge.actionPaths[0];
            return {
                taskType: path.taskType,
                description: path.taskDescription,
                steps: path.steps as NavigationStep[],
                extractionRules: path.extractionRules as any
            };
        }

        return null;
    }

    /**
     * Get discovery status for a domain
     */
    async getDiscoveryStatus(domain: string): Promise<{ status: string; progress: number; error?: string } | null> {
        const knowledge = await prisma.siteKnowledge.findUnique({
            where: { domain },
            select: {
                discoveryStatus: true,
                discoveryProgress: true,
                discoveryError: true
            }
        });

        if (!knowledge) return null;

        return {
            status: knowledge.discoveryStatus,
            progress: knowledge.discoveryProgress,
            error: knowledge.discoveryError || undefined
        };
    }

    /**
     * Cleanup browser on shutdown
     */
    async shutdown(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('[SiteDiscovery] Browser closed');
        }
    }
}

export const siteDiscoveryService = new SiteDiscoveryService();
