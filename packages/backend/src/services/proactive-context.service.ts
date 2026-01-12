/**
 * Proactive Context Service
 * 
 * Scans all data sources (inbox, contacts, properties, deals) BEFORE entity creation
 * to surface relevant existing data. This is the "Super Smart Zena" brain.
 */

import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import { marketScraperService } from './market-scraper.service.js';

export interface ContextMatch {
    source: 'thread' | 'contact' | 'property' | 'deal';
    id: string;
    title: string;
    snippet: string;
    relevance: number;
    extractedData?: Record<string, any>;
}

export interface ContextScanResult {
    hasMatches: boolean;
    matches: ContextMatch[];
    suggestedData: Record<string, any>;
    summaryForUser: string;
    scanKey?: string; // Unique key for the parameters scanned (e.g. address)
}

export class ProactiveContextService {

    // 🔥 PERFORMANCE: In-memory cache for web lookups (5-minute TTL)
    private webSearchCache = new Map<string, { data: ContextMatch | null; timestamp: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * MAIN ENTRY: Scan all data sources before creating an entity
     * 🔥 PERFORMANCE OPTIMIZED: Includes caching, timeout protection, and skip logic
     */
    async scanForContext(
        userId: string,
        intent: 'create' | 'update',
        entityType: 'property' | 'contact' | 'deal' | 'task' | 'calendar',
        params: Record<string, any>
    ): Promise<ContextScanResult> {
        const startTime = Date.now();
        logger.info(`[ProactiveContext] Scanning for ${entityType} context with params:`, params);

        const matches: ContextMatch[] = [];
        const suggestedData: Record<string, any> = {};

        // 🧠 ZENA SUPER-INTEL: Generate a unique scan key (e.g. based on address)
        const scanKey = params.address || params.propertyAddress || params.name || params.email || 'generic';

        // 🔥 FAST-PATH: Skip if we already have key property data (from user input or prior scan)
        const alreadyHasPropertyData = params.bedrooms || params.bathrooms || params.floorArea || params.landArea;

        try {
            // 1. Address-based search (for properties, deals, tasks)
            if (params.address || params.propertyAddress) {
                const address = params.address || params.propertyAddress;

                // Fast DB queries first (usually <100ms)
                const threadMatches = await this.searchThreadsForAddress(userId, address);
                matches.push(...threadMatches);

                // Also check for existing properties with similar address
                const propertyMatch = await this.findExistingProperty(userId, address);
                if (propertyMatch) matches.push(propertyMatch);

                // 🧠 ZENA SUPER-INTEL: Web Search for enrichment
                // 🔥 PERFORMANCE: Skip if we already have data OR use cache
                if (entityType === 'property' && !alreadyHasPropertyData) {
                    const webMatch = await this.searchWebForPropertyCached(address);
                    if (webMatch) matches.push(webMatch);
                } else if (alreadyHasPropertyData) {
                    console.log(`⚡ [ProactiveContext] Skipping web search - property data already provided`);
                }
            }

            // 2. Name/Email based search (for contacts) - these are fast DB queries
            if (params.name || params.vendorName || params.contactName) {
                const name = params.name || params.vendorName || params.contactName;
                const contactMatches = await this.searchForContactByName(userId, name);
                matches.push(...contactMatches);
            }

            if (params.email || params.vendorEmail) {
                const email = params.email || params.vendorEmail;
                const emailMatches = await this.searchThreadsForEmail(userId, email);
                matches.push(...emailMatches);
            }

            // 3. Extract suggested data from top matches
            if (matches.length > 0) {
                this.extractSuggestedData(matches, suggestedData, entityType);
            }

        } catch (error) {
            logger.error(`[ProactiveContext] Error during scan:`, error);
        }

        const duration = Date.now() - startTime;
        console.log(`⏱️ [ProactiveContext] Total scan took ${duration}ms (${matches.length} matches)`);

        // Build user-facing summary
        const summaryForUser = this.buildSummary(matches, entityType);

        return {
            hasMatches: matches.length > 0,
            matches,
            suggestedData,
            summaryForUser,
            scanKey
        };
    }

    /**
     * 🔥 PERFORMANCE: Cached web search with timeout protection
     */
    private async searchWebForPropertyCached(address: string): Promise<ContextMatch | null> {
        const cacheKey = address.toLowerCase().trim();

        // Check cache first
        const cached = this.webSearchCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
            console.log(`⚡ [ProactiveContext] Web search cache HIT for "${address}"`);
            return cached.data;
        }

        console.log(`⏱️ [ProactiveContext] Web search cache MISS - calling API...`);
        const startTime = Date.now();

        try {
            // 🔥 TIMEOUT PROTECTION: 45-second max for web search (Gemini Grounding is slow)
            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Web search timeout')), 45000)
            );

            const searchPromise = this.searchWebForProperty(address);
            const result = await Promise.race([searchPromise, timeoutPromise]);

            const duration = Date.now() - startTime;
            console.log(`⏱️ [ProactiveContext] Web search took ${duration}ms`);

            // Cache the result
            this.webSearchCache.set(cacheKey, { data: result, timestamp: Date.now() });

            return result;
        } catch (error: any) {
            console.warn(`⚠️ [ProactiveContext] Web search failed/timeout: ${error.message}`);
            // Cache the failure too to prevent repeated slow calls
            this.webSearchCache.set(cacheKey, { data: null, timestamp: Date.now() });
            return null;
        }
    }

    /**
     * Search email threads for address mentions in subject, summary, or messages
     */
    private async searchThreadsForAddress(userId: string, address: string): Promise<ContextMatch[]> {
        const matches: ContextMatch[] = [];

        // Normalize address for fuzzy matching
        const addressParts = this.normalizeAddress(address);

        // Search threads
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                OR: [
                    { subject: { contains: addressParts.street, mode: 'insensitive' } },
                    { summary: { contains: addressParts.street, mode: 'insensitive' } }
                ]
            },
            include: {
                messages: {
                    take: 3,
                    orderBy: { sentAt: 'desc' }
                }
            },
            take: 5,
            orderBy: { lastMessageAt: 'desc' }
        });

        for (const thread of threads) {
            // Extract data from thread content
            const extractedData = this.extractPropertyDataFromThread(thread);

            matches.push({
                source: 'thread',
                id: thread.id,
                title: `Email: ${thread.subject}`,
                snippet: thread.summary.substring(0, 200),
                relevance: this.calculateAddressRelevance(thread.subject + ' ' + thread.summary, address),
                extractedData
            });
        }

        return matches;
    }

    /**
     * Search for existing property with similar address
     */
    private async findExistingProperty(userId: string, address: string): Promise<ContextMatch | null> {
        const addressParts = this.normalizeAddress(address);

        const property = await prisma.property.findFirst({
            where: {
                userId,
                address: { contains: addressParts.street, mode: 'insensitive' }
            },
            include: {
                vendors: true
            }
        });

        if (property) {
            return {
                source: 'property',
                id: property.id,
                title: `Existing Property: ${property.address}`,
                snippet: `Status: ${property.status}, ${property.bedrooms || '?'} beds, ${property.bathrooms || '?'} baths`,
                relevance: 100,
                extractedData: {
                    listingPrice: property.listingPrice ? Number(property.listingPrice) : undefined,
                    bedrooms: property.bedrooms,
                    bathrooms: property.bathrooms,
                    vendorName: property.vendors[0]?.name,
                    vendorEmail: property.vendors[0]?.emails[0]
                }
            };
        }

        return null;
    }

    /**
     * Search the web for property details
     */
    private async searchWebForProperty(address: string): Promise<ContextMatch | null> {
        const details = await marketScraperService.getPropertyDetails(address);
        if (details) {
            // Build a rich snippet including all found data
            const specParts: string[] = [];
            if (details.bedrooms) specParts.push(`${details.bedrooms} beds`);
            if (details.bathrooms) specParts.push(`${details.bathrooms} baths`);
            if (details.floorArea) specParts.push(`${details.floorArea} floor`);
            if (details.landArea) specParts.push(`${details.landArea} land`);

            return {
                source: 'property', // Use property source to trigger enrichment extraction
                id: 'web_search',
                title: `Web Result: ${details.address}`,
                snippet: `Search found matching property: ${specParts.join(', ') || 'specs unknown'}. ${details.description || ''}`,
                relevance: 95,
                extractedData: {
                    bedrooms: details.bedrooms,
                    bathrooms: details.bathrooms,
                    landArea: details.landArea,
                    floorArea: details.floorArea,
                    listingPrice: details.listingPrice,
                    type: details.type
                }
            };
        }
        return null;
    }


    /**
     * Search for contacts by name (fuzzy)
     */
    private async searchForContactByName(userId: string, name: string): Promise<ContextMatch[]> {
        const matches: ContextMatch[] = [];
        const nameParts = name.toLowerCase().split(/\s+/);

        const contacts = await prisma.contact.findMany({
            where: {
                userId,
                name: { contains: nameParts[0], mode: 'insensitive' }
            },
            take: 3
        });

        for (const contact of contacts) {
            matches.push({
                source: 'contact',
                id: contact.id,
                title: `Existing Contact: ${contact.name}`,
                snippet: `Role: ${contact.role}, Emails: ${contact.emails.join(', ')}`,
                relevance: this.calculateNameRelevance(contact.name, name),
                extractedData: {
                    email: contact.emails[0],
                    phone: contact.phones[0],
                    role: contact.role
                }
            });
        }

        return matches;
    }

    /**
     * Search threads for email sender/recipient
     */
    private async searchThreadsForEmail(userId: string, email: string): Promise<ContextMatch[]> {
        const matches: ContextMatch[] = [];

        // Search threads where participants include this email
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                participants: {
                    path: ['$[*].email'],
                    array_contains: email
                }
            },
            take: 3,
            orderBy: { lastMessageAt: 'desc' }
        });

        for (const thread of threads) {
            // Extract name from participants
            const participants = thread.participants as any[];
            const matchingParticipant = participants.find(p => p.email?.toLowerCase() === email.toLowerCase());

            matches.push({
                source: 'thread',
                id: thread.id,
                title: `Email from: ${matchingParticipant?.name || email}`,
                snippet: thread.summary.substring(0, 150),
                relevance: 80,
                extractedData: {
                    name: matchingParticipant?.name,
                    email: email
                }
            });
        }

        return matches;
    }

    /**
     * Extract property data from thread content (price, bedrooms, etc.)
     */
    private extractPropertyDataFromThread(thread: any): Record<string, any> {
        const data: Record<string, any> = {};
        const text = (thread.subject + ' ' + thread.summary).toLowerCase();

        // Price extraction: $X, $Xk, $X million, asking $X
        const priceMatch = text.match(/\$\s*([\d,.]+)\s*(k|m|million|thousand)?/i);
        if (priceMatch) {
            let price = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (priceMatch[2]?.toLowerCase() === 'k' || priceMatch[2]?.toLowerCase() === 'thousand') {
                price *= 1000;
            } else if (priceMatch[2]?.toLowerCase() === 'm' || priceMatch[2]?.toLowerCase() === 'million') {
                price *= 1000000;
            }
            data.listingPrice = price;
        }

        // Bedrooms extraction
        const bedsMatch = text.match(/(\d+)\s*(bed|bedroom|br)/i);
        if (bedsMatch) data.bedrooms = parseInt(bedsMatch[1]);

        // Bathrooms extraction
        const bathMatch = text.match(/(\d+)\s*(bath|bathroom)/i);
        if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);

        // Extract sender as potential vendor
        const participants = thread.participants as any[];
        const externalParticipant = participants.find((p: any) => !p.isFromUser);
        if (externalParticipant) {
            data.vendorName = externalParticipant.name;
            data.vendorEmail = externalParticipant.email;
        }

        return data;
    }

    /**
     * Normalize address for fuzzy matching
     */
    private normalizeAddress(address: string): { street: string; city: string } {
        const parts = address.split(',').map(p => p.trim());
        return {
            street: parts[0] || address,
            city: parts[1] || ''
        };
    }

    /**
     * Calculate relevance score for address match
     */
    private calculateAddressRelevance(text: string, address: string): number {
        const textLower = text.toLowerCase();
        const addressLower = address.toLowerCase();

        if (textLower.includes(addressLower)) return 100;

        const streetPart = this.normalizeAddress(address).street.toLowerCase();
        if (textLower.includes(streetPart)) return 80;

        return 50;
    }

    /**
     * Calculate relevance score for name match
     */
    private calculateNameRelevance(foundName: string, searchName: string): number {
        const foundLower = foundName.toLowerCase();
        const searchLower = searchName.toLowerCase();

        if (foundLower === searchLower) return 100;
        if (foundLower.includes(searchLower) || searchLower.includes(foundLower)) return 80;

        return 50;
    }

    /**
     * Extract suggested data from matches
     */
    private extractSuggestedData(
        matches: ContextMatch[],
        suggestedData: Record<string, any>,
        entityType: string
    ): void {
        // Prioritize by relevance
        const sortedMatches = [...matches].sort((a, b) => b.relevance - a.relevance);

        for (const match of sortedMatches) {
            if (match.extractedData) {
                for (const [key, value] of Object.entries(match.extractedData)) {
                    if (value !== undefined && suggestedData[key] === undefined) {
                        suggestedData[key] = value;
                    }
                }
            }
        }
    }

    /**
     * Build user-facing summary of found context
     */
    private buildSummary(matches: ContextMatch[], entityType: string): string {
        if (matches.length === 0) {
            return '';
        }

        const lines: string[] = [];
        lines.push(`🧠 **I found ${matches.length} related item(s) in your data:**\n`);

        for (const match of matches.slice(0, 3)) {
            lines.push(`• **${match.title}**: ${match.snippet}`);

            if (match.extractedData && Object.keys(match.extractedData).length > 0) {
                const dataPoints = Object.entries(match.extractedData)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                if (dataPoints) {
                    lines.push(`  _Extracted: ${dataPoints}_`);
                }
            }
        }

        lines.push(`\n**Would you like me to use this information?**`);

        return lines.join('\n');
    }
}

export const proactiveContextService = new ProactiveContextService();
