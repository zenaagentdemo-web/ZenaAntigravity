/**
 * Memory Search Tool for Agent Orchestrator
 * 
 * Enables natural language queries like "When did the lawyer mention the LIM issue?"
 * across all memory sources (emails, voice notes, timeline, chat).
 */

import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { memorySearchService } from '../../services/memory-search.service.js';

const searchMemoryTool: ZenaToolDefinition = {
    name: 'search_memory',
    description: 'Search across all past emails, voice notes, conversations, and timeline events. Use this when the user asks about something that was mentioned, discussed, or said in the past. Examples: "When did Dan mention the LIM issue?", "What did Sarah say about the offer?", "Find the email about the finance deadline".',
    domain: 'memory',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The natural language search query'
            },
            types: {
                type: 'array',
                items: { type: 'string', enum: ['email', 'voice_note', 'timeline', 'chat'] },
                description: 'Optional filter for specific memory types'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)'
            }
        },
        required: ['query']
    },
    confirmationRequired: false,
    isDestructive: false,
    execute: async (userId: string, params: { query: string; types?: string[]; limit?: number }) => {
        const results = await memorySearchService.searchMemory({
            userId,
            query: params.query,
            types: params.types as any,
            limit: params.limit || 10
        });

        if (results.length === 0) {
            return {
                success: true,
                message: `No results found for "${params.query}"`,
                data: { results: [] }
            };
        }

        // Format results for display
        const formattedResults = results.slice(0, 5).map(r => ({
            type: r.type,
            title: r.title,
            snippet: r.snippet,
            date: r.timestamp.toLocaleDateString(),
            entityId: r.entityId
        }));

        return {
            success: true,
            message: `Found ${results.length} results for "${params.query}"`,
            data: {
                results: formattedResults,
                totalCount: results.length
            }
        };
    }
};

// Register the tool
toolRegistry.register(searchMemoryTool);

export { searchMemoryTool };
