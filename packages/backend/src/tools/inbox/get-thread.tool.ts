/**
 * Inbox: Get Thread Tool
 * 
 * Gets full thread details with all messages and linked entities.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface GetThreadInput {
    threadId: string;
}

interface Message {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    to: string[];
    body: string;
    receivedAt: string;
    isFromUser: boolean;
}

interface GetThreadOutput {
    thread: {
        id: string;
        subject: string;
        classification?: string;
        category: string;
        riskLevel: string;
        riskReason?: string;
        lastMessageAt: string;
        messageCount: number;
        nextAction?: string;
        summary: string;
    };
    messages: Message[];
    linkedProperty?: {
        id: string;
        address: string;
        status?: string;
    };
    linkedDeal?: {
        id: string;
        stage: string;
        propertyAddress?: string;
    };
    suggestedReplyTone?: string;
}

export const getThreadTool: ZenaToolDefinition<GetThreadInput, GetThreadOutput> = {
    name: 'inbox.get_thread',
    domain: 'inbox',
    description: 'Get full thread details with all messages, linked properties, and deals',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'The ID of the thread to retrieve'
            }
        },
        required: ['threadId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            thread: { type: 'object' },
            messages: { type: 'array' },
            linkedProperty: { type: 'object' },
            linkedDeal: { type: 'object' }
        }
    },

    permissions: ['email:read'],
    requiresApproval: false,

    async execute(params: GetThreadInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetThreadOutput>> {
        try {
            // Fetch thread with all related data
            const thread = await prisma.thread.findFirst({
                where: {
                    id: params.threadId,
                    userId: context.userId
                },
                include: {
                    messages: {
                        orderBy: { receivedAt: 'asc' }
                    },
                    property: {
                        select: {
                            id: true,
                            address: true,
                            status: true
                        }
                    },
                    deal: {
                        select: {
                            id: true,
                            stage: true
                        }
                    }
                }
            });

            if (!thread) {
                return {
                    success: false,
                    error: 'Thread not found'
                };
            }

            // Format messages
            const messages: Message[] = thread.messages.map(msg => {
                const fromData = msg.from as { name?: string; email?: string } | null;
                const toData = (msg.to as Array<{ name?: string; email?: string }>) || [];

                return {
                    id: msg.id,
                    subject: msg.subject || '',
                    from: fromData?.name || fromData?.email || 'Unknown',
                    fromEmail: fromData?.email || '',
                    to: toData.map(t => t.email || t.name || ''),
                    body: msg.body || msg.bodyHtml || '',
                    receivedAt: msg.receivedAt?.toISOString() || '',
                    isFromUser: msg.isFromUser
                };
            });

            // Suggest reply tone based on classification
            let suggestedReplyTone = 'professional';
            if (thread.classification === 'buyer') {
                suggestedReplyTone = 'friendly';
            } else if (thread.classification === 'vendor') {
                suggestedReplyTone = 'professional';
            } else if (thread.classification === 'lawyer_broker') {
                suggestedReplyTone = 'formal';
            }

            return {
                success: true,
                data: {
                    thread: {
                        id: thread.id,
                        subject: thread.subject || messages[0]?.subject || '(No subject)',
                        classification: thread.classification || undefined,
                        category: thread.category,
                        riskLevel: thread.riskLevel,
                        riskReason: thread.riskReason || undefined,
                        lastMessageAt: thread.lastMessageAt?.toISOString() || '',
                        messageCount: messages.length,
                        nextAction: thread.nextAction || undefined,
                        summary: thread.summary || ''
                    },
                    messages,
                    linkedProperty: thread.property ? {
                        id: thread.property.id,
                        address: thread.property.address,
                        status: thread.property.status || undefined
                    } : undefined,
                    linkedDeal: thread.deal ? {
                        id: thread.deal.id,
                        stage: thread.deal.stage,
                        propertyAddress: thread.property?.address
                    } : undefined,
                    suggestedReplyTone
                }
            };
        } catch (error) {
            console.error('[inbox.get_thread] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get thread'
            };
        }
    },

    auditLogFormat(input, output) {
        const subject = output.success && output.data ? output.data.thread.subject : 'Unknown';
        return {
            action: 'INBOX_GET',
            summary: `Opened thread: "${subject}"`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

// Auto-register
toolRegistry.register(getThreadTool);
