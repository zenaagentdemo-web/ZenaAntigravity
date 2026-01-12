/**
 * Inbox: Search Inbox Tool
 * 
 * Search for email threads by subject, sender, or content.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchInboxInput {
    query: string;
}

interface SearchInboxOutput {
    bestMatch?: {
        id: string;
        subject: string;
        from: string;
        lastMessageAt: string;
    };
    alternatives: Array<{
        id: string;
        subject: string;
        from: string;
        lastMessageAt: string;
    }>;
}

export const searchInboxTool: ZenaToolDefinition<SearchInboxInput, SearchInboxOutput> = {
    name: 'inbox.search',
    domain: 'inbox',
    description: 'Search for email threads by subject or sender. Use this to find a threadId before drafting or archiving.',

    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search term for subject or sender name/email'
            }
        },
        required: ['query']
    },

    outputSchema: {
        type: 'object',
        properties: {
            bestMatch: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['email:read'],
    requiresApproval: false,

    async execute(params: SearchInboxInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchInboxOutput>> {
        try {
            const userId = context.userId;

            const threads = await prisma.thread.findMany({
                where: {
                    userId,
                    OR: [
                        { subject: { contains: params.query, mode: 'insensitive' } },
                        { messages: { some: { from: { path: ['email'], string_contains: params.query } } } },
                        { messages: { some: { from: { path: ['name'], string_contains: params.query } } } }
                    ]
                },
                take: 5,
                orderBy: { lastMessageAt: 'desc' },
                include: {
                    messages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 1
                    }
                }
            });

            const formatted = threads.map(t => {
                const latest = t.messages[0];
                const from = latest?.from as { name?: string; email?: string } | null;
                return {
                    id: t.id,
                    subject: t.subject || '(No subject)',
                    from: from?.name || from?.email || 'Unknown',
                    lastMessageAt: t.lastMessageAt.toISOString()
                };
            });

            return {
                success: true,
                data: {
                    bestMatch: formatted[0],
                    alternatives: formatted.slice(1)
                }
            };
        } catch (error) {
            console.error('[inbox.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search inbox'
            };
        }
    }
};

toolRegistry.register(searchInboxTool);
