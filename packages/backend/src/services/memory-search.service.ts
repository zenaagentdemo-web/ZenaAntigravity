/**
 * Memory Search Service - Natural Language Memory Search
 * 
 * Enables queries like "When did the lawyer mention the LIM issue?"
 * by searching across all text content (emails, voice notes, timeline, chat).
 */

import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { logger } from './logger.service.js';

export interface MemorySearchResult {
    type: 'email' | 'voice_note' | 'timeline' | 'chat';
    entityId: string;
    threadId?: string;
    title: string;
    snippet: string;
    timestamp: Date;
    relevanceScore: number;
    metadata?: {
        contactName?: string;
        propertyAddress?: string;
        dealStage?: string;
    };
}

export interface MemorySearchQuery {
    userId: string;
    query: string;
    types?: ('email' | 'voice_note' | 'timeline' | 'chat')[];
    limit?: number;
}

export class MemorySearchService {
    /**
     * Search across all memory sources using natural language
     */
    async searchMemory(params: MemorySearchQuery): Promise<MemorySearchResult[]> {
        const { userId, query, types, limit = 20 } = params;

        logger.info(`[MemorySearchService] Searching memory for: "${query}"`);

        // Step 1: Extract semantic keywords from natural language query
        const keywords = await this.extractSearchKeywords(query);
        logger.info(`[MemorySearchService] Extracted keywords: ${keywords.join(', ')}`);

        // Step 2: Search all sources in parallel
        const searchTypes = types || ['email', 'voice_note', 'timeline', 'chat'];

        const searchPromises: Promise<MemorySearchResult[]>[] = [];

        if (searchTypes.includes('email')) {
            searchPromises.push(this.searchEmails(userId, keywords));
        }
        if (searchTypes.includes('voice_note')) {
            searchPromises.push(this.searchVoiceNotes(userId, keywords));
        }
        if (searchTypes.includes('timeline')) {
            searchPromises.push(this.searchTimeline(userId, keywords));
        }
        if (searchTypes.includes('chat')) {
            searchPromises.push(this.searchChatHistory(userId, keywords));
        }

        const allResults = (await Promise.all(searchPromises)).flat();

        // Step 3: LLM re-ranking for contextual relevance
        const rankedResults = await this.rerankResults(query, allResults);

        // Return top results
        return rankedResults.slice(0, limit);
    }

    /**
     * Extract semantic keywords from natural language query
     */
    private async extractSearchKeywords(query: string): Promise<string[]> {
        // Quick extraction: split words and filter stop words
        const stopWords = new Set([
            'when', 'did', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
            'what', 'where', 'who', 'how', 'about', 'mention', 'mentioned',
            'say', 'said', 'tell', 'told', 'discuss', 'discussed', 'talk',
            'talked', 'regarding', 'concerning', 'with', 'from', 'to', 'at',
            'in', 'on', 'for', 'of', 'that', 'this', 'it', 'and', 'or'
        ]);

        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));

        // Use LLM for more complex extraction if needed
        if (words.length === 0) {
            try {
                const prompt = `Extract the key search terms from this question. Return only the important nouns, names, and specific terms.

Question: "${query}"

Respond with a JSON array of strings:
["term1", "term2", "term3"]`;

                const response = await askZenaService.askBrain(prompt, {
                    temperature: 0.1,
                    jsonMode: true
                });

                const parsed = JSON.parse(response);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                logger.warn('[MemorySearchService] Failed to extract keywords via LLM');
                return [];
            }
        }

        return words;
    }

    /**
     * Search email messages
     */
    private async searchEmails(userId: string, keywords: string[]): Promise<MemorySearchResult[]> {
        if (keywords.length === 0) return [];

        const searchConditions = keywords.map(keyword => ({
            OR: [
                { body: { contains: keyword, mode: 'insensitive' as const } },
                { subject: { contains: keyword, mode: 'insensitive' as const } }
            ]
        }));

        const messages = await prisma.message.findMany({
            where: {
                thread: { userId },
                AND: searchConditions
            },
            include: {
                thread: {
                    include: {
                        property: true,
                        deal: true
                    }
                }
            },
            orderBy: { sentAt: 'desc' },
            take: 50
        });

        return messages.map(msg => ({
            type: 'email' as const,
            entityId: msg.id,
            threadId: msg.threadId,
            title: msg.subject,
            snippet: this.generateSnippet(msg.body, keywords),
            timestamp: msg.sentAt,
            relevanceScore: this.calculateRelevance(msg.body + ' ' + msg.subject, keywords),
            metadata: {
                propertyAddress: msg.thread?.property?.address,
                dealStage: msg.thread?.deal?.stage
            }
        }));
    }

    /**
     * Search voice note transcripts
     */
    private async searchVoiceNotes(userId: string, keywords: string[]): Promise<MemorySearchResult[]> {
        if (keywords.length === 0) return [];

        const searchConditions = keywords.map(keyword => ({
            transcript: { contains: keyword, mode: 'insensitive' as const }
        }));

        const voiceNotes = await prisma.voiceNote.findMany({
            where: {
                userId,
                AND: searchConditions
            },
            orderBy: { createdAt: 'desc' },
            take: 30
        });

        return voiceNotes.map(note => ({
            type: 'voice_note' as const,
            entityId: note.id,
            title: `Voice Note - ${note.createdAt.toLocaleDateString()}`,
            snippet: this.generateSnippet(note.transcript, keywords),
            timestamp: note.createdAt,
            relevanceScore: this.calculateRelevance(note.transcript, keywords)
        }));
    }

    /**
     * Search timeline events
     */
    private async searchTimeline(userId: string, keywords: string[]): Promise<MemorySearchResult[]> {
        if (keywords.length === 0) return [];

        const searchConditions = keywords.map(keyword => ({
            OR: [
                { summary: { contains: keyword, mode: 'insensitive' as const } },
                { content: { contains: keyword, mode: 'insensitive' as const } }
            ]
        }));

        const events = await prisma.timelineEvent.findMany({
            where: {
                userId,
                AND: searchConditions
            },
            orderBy: { timestamp: 'desc' },
            take: 30
        });

        return events.map(event => ({
            type: 'timeline' as const,
            entityId: event.id,
            title: event.summary,
            snippet: event.content ? this.generateSnippet(event.content, keywords) : event.summary,
            timestamp: event.timestamp,
            relevanceScore: this.calculateRelevance(
                (event.summary || '') + ' ' + (event.content || ''),
                keywords
            )
        }));
    }

    /**
     * Search chat history
     */
    private async searchChatHistory(userId: string, keywords: string[]): Promise<MemorySearchResult[]> {
        if (keywords.length === 0) return [];

        const searchConditions = keywords.map(keyword => ({
            content: { contains: keyword, mode: 'insensitive' as const }
        }));

        const messages = await prisma.chatMessage.findMany({
            where: {
                conversation: { userId },
                AND: searchConditions
            },
            include: {
                conversation: true
            },
            orderBy: { createdAt: 'desc' },
            take: 30
        });

        return messages.map(msg => ({
            type: 'chat' as const,
            entityId: msg.id,
            title: msg.conversation.title || 'Chat with Zena',
            snippet: this.generateSnippet(msg.content, keywords),
            timestamp: msg.createdAt,
            relevanceScore: this.calculateRelevance(msg.content, keywords)
        }));
    }

    /**
     * Generate a snippet around matching keywords
     */
    private generateSnippet(text: string, keywords: string[], maxLength: number = 200): string {
        const lowerText = text.toLowerCase();

        // Find the first keyword match
        let matchIndex = -1;
        for (const keyword of keywords) {
            const idx = lowerText.indexOf(keyword.toLowerCase());
            if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
                matchIndex = idx;
            }
        }

        if (matchIndex === -1) {
            return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
        }

        // Extract context around the match
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(text.length, matchIndex + 150);
        let snippet = text.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
    }

    /**
     * Calculate relevance score based on keyword matches
     */
    private calculateRelevance(text: string, keywords: string[]): number {
        const lowerText = text.toLowerCase();
        let score = 0;

        for (const keyword of keywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                score += matches.length * 10;
            }
        }

        // Bonus for exact phrase matches
        const fullPhrase = keywords.join(' ').toLowerCase();
        if (lowerText.includes(fullPhrase)) {
            score += 50;
        }

        return score;
    }

    /**
     * Re-rank results using LLM for contextual relevance
     */
    private async rerankResults(
        originalQuery: string,
        results: MemorySearchResult[]
    ): Promise<MemorySearchResult[]> {
        if (results.length <= 5) {
            // For small result sets, just sort by score
            return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }

        // For larger sets, use LLM to re-rank top candidates
        try {
            const topCandidates = results
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 15);

            const snippets = topCandidates.map((r, i) =>
                `${i + 1}. [${r.type}] ${r.title}: "${r.snippet.substring(0, 100)}..."`
            ).join('\n');

            const prompt = `Given this search query: "${originalQuery}"

And these search results:
${snippets}

Rank the TOP 5 most relevant results by their index numbers (1-15).
Consider: semantic relevance, specificity of match, and directness of answer.

Respond with JSON:
{ "ranking": [3, 7, 1, 5, 12] }`;

            const response = await askZenaService.askBrain(prompt, {
                temperature: 0.1,
                jsonMode: true
            });

            const parsed = JSON.parse(response);
            const ranking: number[] = parsed.ranking || [];

            // Reorder based on LLM ranking
            const reranked: MemorySearchResult[] = [];
            for (const idx of ranking) {
                if (idx >= 1 && idx <= topCandidates.length) {
                    const result = topCandidates[idx - 1];
                    result.relevanceScore += (10 - reranked.length) * 10; // Boost ranked items
                    reranked.push(result);
                }
            }

            // Add remaining results
            for (const result of topCandidates) {
                if (!reranked.includes(result)) {
                    reranked.push(result);
                }
            }

            // Add rest of original results
            for (const result of results) {
                if (!reranked.includes(result)) {
                    reranked.push(result);
                }
            }

            return reranked;
        } catch (error) {
            logger.warn('[MemorySearchService] LLM re-ranking failed, using score-based ranking');
            return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
    }
}

export const memorySearchService = new MemorySearchService();
