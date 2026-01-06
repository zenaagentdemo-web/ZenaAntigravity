/**
 * Cloud Robot Service
 * 
 * Uses Puppeteer to extract data from connected websites using
 * captured session cookies and AI-generated site profiles.
 * 
 * Phase 5: Now includes NavigationExecutor for dynamic queries.
 */

import puppeteer, { Browser, Page, Cookie } from 'puppeteer';
import { pageAnalysisService, SiteProfile, DataField } from './page-analysis.service.js';
import { NavAction, siteNavigationMapService } from './site-navigation-maps.js';
import { NavigationPlan, navigationPlannerService } from './navigation-planner.service.js';
import * as fs from 'fs';
import * as path from 'path';

// Debug log file path
const DEBUG_LOG_PATH = path.join(process.cwd(), 'cloud-robot-debug.log');

// Clear log file on service load
try {
    fs.writeFileSync(DEBUG_LOG_PATH, `=== CloudRobot Debug Log Started at ${new Date().toISOString()} ===\n\n`);
} catch (e) {
    console.error('Could not initialize debug log file:', e);
}

// File-based debug logger
function debugLog(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] ${message}`;
    if (data !== undefined) {
        logLine += '\n' + JSON.stringify(data, null, 2);
    }
    logLine += '\n';

    // Write to console
    console.log(message, data !== undefined ? data : '');

    // Write to file
    try {
        fs.appendFileSync(DEBUG_LOG_PATH, logLine);
    } catch (e) {
        // Ignore file write errors
    }
}

export interface ExtractedData {
    domain: string;
    extractedAt: string;
    fields: Record<string, any[]>;
    rawData?: any;
    success: boolean;
    error?: string;
}

export interface ExtractionJob {
    id: string;
    domain: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    result?: ExtractedData;
    error?: string;
}

export interface NavigationResult {
    success: boolean;
    answer?: string;
    data?: any;
    error?: string;
    stepResults?: any[];
}

// Session vault reference (shared with connections controller)
// In production, this would be a proper database
const sessionVault: Map<string, any> = new Map();

// Extraction job queue
const extractionJobs: Map<string, ExtractionJob> = new Map();

// Browser pool for reuse
let browserInstance: Browser | null = null;

export class CloudRobotService {
    private isInitialized = false;

    /**
     * Initialize the browser pool
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('[CloudRobot] Initializing browser pool...');

        try {
            browserInstance = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ]
            });
            this.isInitialized = true;
            console.log('[CloudRobot] Browser pool initialized');
        } catch (error) {
            console.error('[CloudRobot] Failed to initialize browser:', error);
            throw error;
        }
    }

    /**
     * Get or create browser instance
     */
    private async getBrowser(): Promise<Browser> {
        if (!browserInstance || !browserInstance.isConnected()) {
            await this.initialize();
        }
        return browserInstance!;
    }

    /**
     * Set session cookies on a page
     */
    private async setSessionCookies(page: Page, cookies: any[]): Promise<void> {
        const puppeteerCookies: Cookie[] = cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            secure: c.secure || false,
            httpOnly: c.httpOnly || false,
            ...(c.expirationDate && { expires: c.expirationDate })
        }));

        await page.setCookie(...puppeteerCookies);
        console.log(`[CloudRobot] Set ${puppeteerCookies.length} cookies`);
    }

    /**
     * Get random delay for anti-bot evasion
     */
    private getRandomDelay(min: number = 500, max: number = 2000): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ===========================================
    // PHASE 5: NAVIGATION EXECUTOR
    // ===========================================

    /**
     * Execute a natural language query against a connected site
     * This is the main entry point for Phase 5 dynamic navigation
     */
    async executeQuery(question: string, preferredDomain?: string): Promise<NavigationResult> {
        console.log(`[CloudRobot] Executing query: "${question}"`);

        // Create navigation plan from question
        const plan = await navigationPlannerService.createPlan(question, preferredDomain);

        if (!plan) {
            return {
                success: false,
                error: 'Could not create navigation plan for this query'
            };
        }

        // Execute the plan
        return this.executeNavigationPlan(plan);
    }

    /**
     * Execute a navigation plan (multi-step workflow)
     */
    async executeNavigationPlan(plan: NavigationPlan): Promise<NavigationResult> {
        const { domain, steps, intent } = plan;

        debugLog('\n' + '='.repeat(60));
        debugLog('[CloudRobot] 🚀 STARTING NAVIGATION PLAN');
        debugLog('[CloudRobot] Domain: ' + domain);
        debugLog('[CloudRobot] Intent: ' + intent.action);
        debugLog('[CloudRobot] Steps: ' + steps.length);
        debugLog('[CloudRobot] Parameters:', intent.parameters);
        debugLog('='.repeat(60));

        // Get session
        const session = sessionVault.get(domain) || sessionVault.get(domain.replace('www.', ''));
        debugLog('[CloudRobot] Session found: ' + !!session);
        debugLog('[CloudRobot] SessionVault keys: [' + Array.from(sessionVault.keys()).join(', ') + ']');
        if (session) {
            debugLog('[CloudRobot] Session cookies: ' + (session.cookies?.length || 0));
        }

        // Get navigation map for anti-bot settings
        const navMap = siteNavigationMapService.getMap(domain);
        const antiBot = navMap?.antiBot || { minDelay: 1000, maxDelay: 3000 };

        const browser = await this.getBrowser();
        debugLog('[CloudRobot] Browser launched');
        const page = await browser.newPage();
        debugLog('[CloudRobot] New page created');

        try {
            // Setup page
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(
                antiBot.userAgent ||
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Phase 7: If it's a write intent, we might want to check for confirmation (handled by controller/frontend)
            // but here we just execute as planned.

            // Set cookies if we have a session
            if (session?.cookies) {
                await this.setSessionCookies(page, session.cookies);
                debugLog('[CloudRobot] ✅ Cookies set on page');
            } else {
                debugLog('[CloudRobot] ⚠️ NO COOKIES TO SET');
            }

            const stepResults: any[] = [];
            let lastExtractedData: any = null;

            // Execute each step
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                console.log(`[CloudRobot] Step ${i + 1}/${steps.length}: ${step.type}`);

                try {
                    const result = await this.executeStep(page, step, domain);
                    stepResults.push({ step: step.type, success: true, result });

                    if (step.type === 'extract') {
                        if (lastExtractedData && lastExtractedData.type === 'list' && result.type === 'list') {
                            // Aggregate lists
                            lastExtractedData.items = [...(lastExtractedData.items || []), ...(result.items || [])];
                            lastExtractedData.count = lastExtractedData.items.length;
                        } else {
                            lastExtractedData = result;
                        }
                    }

                    // Random delay between steps for anti-bot
                    if (i < steps.length - 1) {
                        await new Promise(r => setTimeout(r, this.getRandomDelay(antiBot.minDelay, antiBot.maxDelay)));
                    }
                } catch (stepError: any) {
                    console.error(`[CloudRobot] Step ${i + 1} failed:`, stepError.message);
                    stepResults.push({ step: step.type, success: false, error: stepError.message });

                    // Continue if possible, some steps are optional
                    if (step.type === 'extract' && !lastExtractedData) {
                        // Extraction failure is critical only if we have NO data yet
                        throw stepError;
                    }
                }
            }

            // Format the answer based on intent and extracted data
            const answer = this.formatAnswer(intent, lastExtractedData);

            return {
                success: true,
                answer,
                data: lastExtractedData,
                stepResults
            };

        } catch (error: any) {
            console.error(`[CloudRobot] Navigation failed:`, error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            await page.close();
        }
    }

    /**
     * Execute a single navigation step
     */
    private async executeStep(page: Page, step: NavAction, domain?: string): Promise<any> {
        const timeout = step.timeout || 10000;

        switch (step.type) {
            case 'navigate':
                await page.goto(step.url!, { waitUntil: 'networkidle2', timeout: 30000 });
                return { navigated: step.url };

            case 'wait':
                await page.waitForSelector(step.waitFor!, { timeout });
                return { waited: step.waitFor };

            case 'click':
                await page.waitForSelector(step.selector!, { timeout: 5000 });
                await page.click(step.selector!);
                await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
                return { clicked: step.selector };

            case 'type':
                await page.waitForSelector(step.selector!, { timeout: 5000 });
                await page.click(step.selector!);
                await page.type(step.selector!, step.value!, { delay: 50 });
                return { typed: step.value };

            case 'select':
                await page.select(step.selector!, step.value!);
                return { selected: step.value };

            case 'scroll':
                await page.evaluate(() => window.scrollBy(0, 500));
                return { scrolled: true };

            case 'submit':
                await page.waitForSelector(step.selector!, { timeout: 5000 });
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => { }),
                    page.click(step.selector!)
                ]);
                return { submitted: step.selector };

            case 'capture':
                // Capture current value to verify it was set correctly
                const val = await page.$eval(step.selector!, el => (el as HTMLInputElement).value || el.textContent || '').catch(() => '');
                return { captured: step.selector, value: val };

            case 'extract':
                const baseResult = await this.extractFromPage(page, step);

                // Phase 6: Handle Pagination
                if (step.maxPages && step.maxPages > 1 && domain) {
                    const paginatedResults = await this.executePagination(page, step, domain, step.maxPages);
                    if (baseResult.type === 'list' && paginatedResults.type === 'list') {
                        baseResult.items = [...(baseResult.items || []), ...(paginatedResults.items || [])];
                        baseResult.count = baseResult.items.length;
                    }
                }

                // Phase 6: Handle Detail Drilling
                if (step.drillDown && baseResult.type === 'list' && baseResult.items.length > 0) {
                    console.log(`[CloudRobot] Drilling into ${baseResult.items.length} items...`);
                    const drilledItems = [];
                    // Limit to first 10 items for performance/safety in this demo context
                    const itemsToDrill = baseResult.items.slice(0, 10);

                    for (const item of itemsToDrill) {
                        if (item.href) {
                            try {
                                console.log(`[CloudRobot] Drilling into: ${item.href}`);
                                const drillPage = await page.browser().newPage();
                                await drillPage.setViewport({ width: 1920, height: 1080 });
                                // Set cookies same as main page
                                const cookies = await page.cookies();
                                await drillPage.setCookie(...cookies);

                                await drillPage.goto(item.href, { waitUntil: 'networkidle2', timeout: 20000 });

                                const drilledData: any = {};
                                for (const drillStep of step.drillDown.steps) {
                                    const drResult = await this.executeStep(drillPage, drillStep);
                                    if (drillStep.type === 'extract') {
                                        Object.assign(drilledData, drResult);
                                    }
                                }

                                drilledItems.push({ ...item, details: drilledData });
                                await drillPage.close();
                            } catch (drillError) {
                                console.error(`[CloudRobot] Failed to drill into ${item.href}:`, drillError);
                                drilledItems.push(item);
                            }
                        } else {
                            drilledItems.push(item);
                        }
                    }
                    baseResult.items = drilledItems;
                }

                return baseResult;

            default:
                return { unknown: step.type };
        }
    }

    /**
     * Phase 6: Handle pagination (Next page)
     */
    private async executePagination(page: Page, step: NavAction, domain: string, maxPages: number): Promise<any> {
        const navMap = siteNavigationMapService.getMap(domain);
        const nextSelector = navMap?.search.paginationNext;

        if (!nextSelector) return { type: 'list', items: [] };

        const allItems: any[] = [];
        let currentPage = 1;

        while (currentPage < maxPages) {
            console.log(`[CloudRobot] Paginating to page ${currentPage + 1}/${maxPages}...`);

            try {
                const nextButton = await page.$(nextSelector);
                if (!nextButton) {
                    console.log(`[CloudRobot] Next button not found, stopping pagination.`);
                    break;
                }

                await page.click(nextSelector);
                await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });

                const pageResult = await this.extractFromPage(page, step);
                if (pageResult.type === 'list' && pageResult.items) {
                    allItems.push(...pageResult.items);
                    console.log(`[CloudRobot] Extracted ${pageResult.items.length} items from page ${currentPage + 1}`);
                }

                currentPage++;
                // Small anti-bot delay
                await new Promise(r => setTimeout(r, this.getRandomDelay(1000, 2000)));
            } catch (error) {
                console.error(`[CloudRobot] Pagination failed at page ${currentPage}:`, error);
                break;
            }
        }

        return { type: 'list', items: allItems, count: allItems.length };
    }

    /**
     * Extract data from page based on extract step config
     */
    private async extractFromPage(page: Page, step: NavAction): Promise<any> {
        const selector = step.selector!;
        const extractType = step.extractType || 'text';

        debugLog('[CloudRobot] 🔍 EXTRACT: type=' + extractType + ', selector="' + selector + '"');

        // Debug: Check if selector exists on page
        const elementExists = await page.$(selector).catch(() => null);
        debugLog('[CloudRobot] Selector exists: ' + !!elementExists);

        // Debug: Get current page URL and title
        const currentUrl = page.url();
        const pageTitle = await page.title().catch(() => 'unknown');
        debugLog('[CloudRobot] Current URL: ' + currentUrl);
        debugLog('[CloudRobot] Page title: ' + pageTitle);

        switch (extractType) {
            case 'count':
                const countText = await page.$eval(selector, el => el.textContent || '').catch((e) => {
                    debugLog('[CloudRobot] ❌ Count extraction FAILED: ' + e.message);
                    return '0';
                });
                debugLog('[CloudRobot] Raw count text: "' + countText + '"');
                const countMatch = countText.match(/(\d+)/);
                const countValue = countMatch ? parseInt(countMatch[1]) : 0;
                debugLog('[CloudRobot] Extracted count: ' + countValue);
                return {
                    type: 'count',
                    raw: countText.trim(),
                    value: countValue
                };

            case 'list':
                const items = await page.$$eval(selector, els => els.slice(0, 20).map(el => ({
                    text: el.textContent?.trim() || '',
                    href: (el as HTMLAnchorElement).href || (el.querySelector('a') as HTMLAnchorElement)?.href || ''
                })));
                return { type: 'list', items, count: items.length };

            case 'table':
                const rows = await page.$$eval(selector, rows =>
                    rows.slice(0, 50).map(row => {
                        const cells = row.querySelectorAll('td, th');
                        return Array.from(cells).map(cell => cell.textContent?.trim() || '');
                    })
                );
                return { type: 'table', rows };

            case 'links':
                const links = await page.$$eval(selector, els => els.map(el => ({
                    text: el.textContent?.trim() || '',
                    href: (el as HTMLAnchorElement).href || ''
                })));
                return { type: 'links', links };

            case 'text':
            default:
                const text = await page.$eval(selector, el => el.textContent || '').catch(() => '');
                return { type: 'text', value: text.trim() };
        }
    }

    /**
     * Format the extracted data into a natural language answer
     */
    private formatAnswer(intent: any, data: any): string {
        if (!data) return 'I could not extract the requested data.';

        switch (intent.action) {
            case 'count':
                if (data.type === 'count') {
                    const location = intent.parameters?.location || 'this area';
                    return `There are ${data.value} properties for sale in ${location}.`;
                }
                break;

            case 'search':
            case 'list':
                if (data.type === 'list' && data.items) {
                    const location = intent.parameters?.location || 'the area';
                    const detailMention = data.items.some((i: any) => i.details)
                        ? " including deep details (CVs/descriptions) for each"
                        : "";
                    const pageMention = intent.parameters?.maxPages > 1
                        ? ` across ${intent.parameters.maxPages} pages`
                        : "";

                    let answer = `I found ${data.count} properties in ${location}${pageMention}${detailMention}. Here are the top results:\n\n`;

                    data.items.slice(0, 10).forEach((item: any, idx: number) => {
                        answer += `${idx + 1}. **${item.text}**\n`;
                        if (item.details) {
                            // Summarize details if present
                            const details = Object.entries(item.details)
                                .map(([k, v]) => `   - ${k}: ${v}`)
                                .join('\n');
                            answer += `${details}\n`;
                        }
                    });

                    if (data.count > 10) {
                        answer += `\n...and ${data.count - 10} more.`;
                    }

                    return answer;
                }
                break;

            case 'getDetails':
                if (data.type === 'text') {
                    return data.value;
                }
                break;
        }

        // Default: return raw data summary
        return `Extracted data: ${JSON.stringify(data).substring(0, 500)}`;
    }

    // ===========================================
    // EXISTING METHODS (Phase 1-4)
    // ===========================================

    /**
     * Extract data from a page using site profile
     */
    private async extractDataWithProfile(page: Page, profile: SiteProfile): Promise<Record<string, any[]>> {
        const extractedFields: Record<string, any[]> = {};

        for (const field of profile.dataFields) {
            try {
                const values = await this.extractFieldData(page, field);
                extractedFields[field.name] = values;
                console.log(`[CloudRobot] Extracted ${values.length} items for field: ${field.name}`);
            } catch (error) {
                console.error(`[CloudRobot] Failed to extract field ${field.name}:`, error);
                extractedFields[field.name] = [];
            }
        }

        return extractedFields;
    }

    /**
     * Extract data for a single field
     */
    private async extractFieldData(page: Page, field: DataField): Promise<any[]> {
        const selector = field.selector;

        switch (field.type) {
            case 'text':
                return await page.$$eval(selector, els => els.map(el => el.textContent?.trim() || ''));

            case 'link':
                return await page.$$eval(selector, els => els.map(el => ({
                    text: el.textContent?.trim() || '',
                    href: (el as HTMLAnchorElement).href || ''
                })));

            case 'number':
                return await page.$$eval(selector, els => els.map(el => {
                    const text = el.textContent?.trim() || '';
                    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
                    return isNaN(num) ? text : num;
                }));

            case 'table':
                return await page.$$eval(selector, rows => rows.map(row => {
                    const cells = row.querySelectorAll('td, th');
                    return Array.from(cells).map(cell => cell.textContent?.trim() || '');
                }));

            case 'list':
                return await page.$$eval(selector, els => els.map(el => el.textContent?.trim() || ''));

            default:
                return await page.$$eval(selector, els => els.map(el => el.textContent?.trim() || ''));
        }
    }

    /**
     * Execute a data extraction job
     */
    async extractData(domain: string, targetUrl?: string): Promise<ExtractedData> {
        const jobId = `job_${Date.now()}`;

        const job: ExtractionJob = {
            id: jobId,
            domain,
            status: 'pending',
        };
        extractionJobs.set(jobId, job);

        console.log(`[CloudRobot] Starting extraction job ${jobId} for ${domain}`);

        try {
            job.status = 'running';
            job.startedAt = new Date().toISOString();

            // Get session from vault
            const session = sessionVault.get(domain);
            if (!session) {
                throw new Error(`No session found for ${domain}. Please bridge this site first.`);
            }

            // Get site profile
            const profile = pageAnalysisService.getProfile(domain);
            if (!profile) {
                throw new Error(`No site profile found for ${domain}. Please wait for AI analysis to complete.`);
            }

            // Get browser and create page
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            try {
                // Set viewport
                await page.setViewport({ width: 1920, height: 1080 });

                // Set user agent to look like a real browser
                await page.setUserAgent(
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                );

                // Set session cookies
                await this.setSessionCookies(page, session.cookies);

                // Navigate to target URL or last known URL
                const url = targetUrl || session.pageUrl;
                console.log(`[CloudRobot] Navigating to: ${url}`);

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Wait a bit for dynamic content
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Extract data using profile
                const fields = await this.extractDataWithProfile(page, profile);

                const result: ExtractedData = {
                    domain,
                    extractedAt: new Date().toISOString(),
                    fields,
                    success: true
                };

                job.status = 'completed';
                job.completedAt = new Date().toISOString();
                job.result = result;

                console.log(`[CloudRobot] Extraction complete for ${domain}`);
                return result;

            } finally {
                await page.close();
            }

        } catch (error: any) {
            console.error(`[CloudRobot] Extraction failed for ${domain}:`, error);

            job.status = 'failed';
            job.completedAt = new Date().toISOString();
            job.error = error.message;

            return {
                domain,
                extractedAt: new Date().toISOString(),
                fields: {},
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get extraction job status
     */
    getJobStatus(jobId: string): ExtractionJob | undefined {
        return extractionJobs.get(jobId);
    }

    /**
     * Get all jobs for a domain
     */
    getJobsForDomain(domain: string): ExtractionJob[] {
        return Array.from(extractionJobs.values())
            .filter(job => job.domain === domain);
    }

    /**
     * Schedule periodic extraction (placeholder for cron integration)
     */
    scheduleExtraction(domain: string, intervalHours: number): string {
        const scheduleId = `schedule_${domain}_${Date.now()}`;

        console.log(`[CloudRobot] Scheduled extraction for ${domain} every ${intervalHours} hours`);
        console.log(`[CloudRobot] Schedule ID: ${scheduleId}`);

        // In production, this would use node-cron or similar
        // For now, we just log and return the ID

        return scheduleId;
    }

    /**
     * Store session in vault (called from connections controller)
     */
    storeSession(domain: string, session: any): void {
        sessionVault.set(domain, session);
        console.log(`[CloudRobot] Session stored for ${domain}`);
    }

    /**
     * Check if we have a session for a domain
     */
    hasSession(domain: string): boolean {
        return sessionVault.has(domain) || sessionVault.has(domain.replace('www.', ''));
    }

    /**
     * Cleanup browser on shutdown
     */
    async shutdown(): Promise<void> {
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
            this.isInitialized = false;
            console.log('[CloudRobot] Browser pool shut down');
        }
    }
}

export const cloudRobotService = new CloudRobotService();

