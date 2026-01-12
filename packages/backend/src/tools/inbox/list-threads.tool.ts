/**
 * Inbox: List Threads Tool
 * 
 * Lists email threads from the New Mail or Awaiting tabs on the Inbox page.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ListThreadsInput {
    tab: 'new_mail' | 'awaiting';
    limit?: number;
    classification?: string;
}

interface ThreadSummary {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    snippet: string;
    receivedAt: string;
    classification?: string;
    riskLevel: string;
    linkedPropertyId?: string;
    linkedDealId?: string;
}

interface ListThreadsOutput {
    threads: ThreadSummary[];
    total: number;
    tab: string;
}

export const listThreadsTool: ZenaToolDefinition<ListThreadsInput, ListThreadsOutput> = {
    name: 'inbox.list_threads',
    domain: 'inbox',
    description: 'List email threads from the New Mail or Awaiting tabs on the Inbox page',

    inputSchema: {
        type: 'object',
        properties: {
            tab: {
                type: 'string',
                enum: ['new_mail', 'awaiting'],
                description: 'Which inbox tab to list from. "new_mail" shows unread/actionable emails (focus). "awaiting" shows emails waiting for response.'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of threads to return',
                default: 20
            },
            classification: {
                type: 'string',
                description: 'Optional filter by classification (e.g., "buyer", "vendor", "lawyer_broker")'
            }
        },
        required: ['tab']
    },

    outputSchema: {
        type: 'object',
        properties: {
            threads: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        subject: { type: 'string' },
                        from: { type: 'string' },
                        snippet: { type: 'string' },
                        receivedAt: { type: 'string' }
                    }
                }
            },
            total: { type: 'number' },
            tab: { type: 'string' }
        }
    },

    permissions: ['email:read'],
    requiresApproval: false,

    async execute(params: ListThreadsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ListThreadsOutput>> {
        try {
            const limit = params.limit || 20;

            // Map tab names to category
            // new_mail = focus (actionable)
            // awaiting = waiting (awaiting response)
            const category = params.tab === 'new_mail' ? 'focus' : 'waiting';

            // Build query
            const where: any = {
                userId: context.userId,
                category
            };

            if (params.classification) {
                where.classification = params.classification;
            }

            // Fetch threads with latest message
            const threads = await prisma.thread.findMany({
                where,
                orderBy: { lastMessageAt: 'desc' },
                take: limit,
                include: {
                    messages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 1
                    }
                }
            });

            // Get total count
            const total = await prisma.thread.count({ where });

            // Format output
            const threadSummaries: ThreadSummary[] = threads.map(thread => {
                const latestMessage = thread.messages[0];
                const fromData = latestMessage?.from as { name?: string; email?: string } | null;

                return {
                    id: thread.id,
                    subject: thread.subject || '(No subject)',
                    from: fromData?.name || fromData?.email || 'Unknown',
                    fromEmail: fromData?.email || '',
                    snippet: latestMessage?.body?.substring(0, 200) || thread.summary?.substring(0, 200) || '',
                    receivedAt: (latestMessage?.receivedAt || thread.lastMessageAt)?.toISOString() || '',
                    classification: thread.classification || undefined,
                    riskLevel: thread.riskLevel,
                    linkedPropertyId: thread.propertyId || undefined,
                    linkedDealId: thread.dealId || undefined
                };
            });

            return {
                success: true,
                data: {
                    threads: threadSummaries,
                    total,
                    tab: params.tab
                }
            };
        } catch (error) {
            console.error('[inbox.list_threads] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list threads'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.threads.length : 0;
        return {
            action: 'INBOX_LIST',
            summary: `Listed ${count} threads from ${input.tab}`
        };
    }
};

// Auto-register
toolRegistry.register(listThreadsTool);
