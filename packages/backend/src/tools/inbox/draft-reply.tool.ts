/**
 * Inbox: Draft Reply Tool
 * 
 * Generates an AI draft reply for an email thread.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { askZenaService } from '../../services/ask-zena.service.js';

interface DraftReplyInput {
    threadId: string;
    tone?: 'professional' | 'friendly' | 'brief' | 'formal';
    customInstructions?: string;
}

interface DraftReplyOutput {
    draftId: string;
    subject: string;
    body: string;
    confidenceScore: number;
    suggestedTone: string;
}

export const draftReplyTool: ZenaToolDefinition<DraftReplyInput, DraftReplyOutput> = {
    name: 'inbox.draft_reply',
    domain: 'inbox',
    description: 'Generate an AI-powered draft reply for an email thread. The draft can be reviewed and edited before sending.',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'The ID of the thread to draft a reply for (optional if threadSubject provided)'
            },
            threadSubject: {
                type: 'string',
                description: 'The subject of the thread to draft a reply for (will resolve to ID)'
            },
            tone: {
                type: 'string',
                enum: ['professional', 'friendly', 'brief', 'formal'],
                description: 'The tone to use for the reply. Defaults to professional.',
                default: 'professional'
            },
            customInstructions: {
                type: 'string',
                description: 'Optional custom instructions for the AI, e.g., "mention the viewing on Friday"'
            }
        },
        required: []
    },

    recommendedFields: ['threadId', 'threadSubject', 'tone', 'customInstructions'],

    outputSchema: {
        type: 'object',
        properties: {
            draftId: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            confidenceScore: { type: 'number' }
        }
    },

    permissions: ['email:read', 'ai:generate'],
    requiresApproval: false, // Draft only, no approval needed

    async execute(params: DraftReplyInput & { threadSubject?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<DraftReplyOutput>> {
        try {
            const userId = context.userId;
            let threadId = params.threadId;

            // 🧠 ZENA INTEL: Resolve thread subject
            if (!threadId && params.threadSubject) {
                const thread = await prisma.thread.findFirst({
                    where: { userId, subject: { contains: params.threadSubject, mode: 'insensitive' } }
                });
                if (thread) threadId = thread.id;
            }

            if (!threadId) return { success: false, error: 'Thread ID or Subject required' };

            // Fetch thread with messages
            const thread = await prisma.thread.findFirst({
                where: {
                    id: threadId,
                    userId
                },
                include: {
                    messages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 5
                    },
                    property: {
                        select: { address: true, status: true }
                    },
                    deal: {
                        select: { stage: true }
                    }
                }
            });

            if (!thread) {
                return {
                    success: false,
                    error: 'Thread not found'
                };
            }

            // Build context for AI
            const latestMessage = thread.messages[0];
            const fromData = latestMessage?.from as { name?: string; email?: string } | null;
            const senderName = fromData?.name || fromData?.email || 'the sender';

            // Build conversation context
            const conversationContext = thread.messages
                .slice(0, 5)
                .reverse()
                .map(m => {
                    const from = m.from as { name?: string; email?: string };
                    return `From: ${from?.name || from?.email || 'Unknown'}\n${m.body?.substring(0, 500) || ''}`;
                })
                .join('\n\n---\n\n');

            // Build property context if available
            let propertyContext = '';
            if (thread.property) {
                propertyContext = `\nProperty context: ${thread.property.address} (${thread.property.status})`;
            }
            if (thread.deal) {
                propertyContext += `\nDeal stage: ${thread.deal.stage}`;
            }

            // Generate draft using ask-zena service
            const tone = params.tone || 'professional';
            const prompt = `Draft a ${tone} email reply to this thread.
            
Sender: ${senderName}
Classification: ${thread.classification}
${propertyContext}

${params.customInstructions ? `Custom instructions: ${params.customInstructions}\n` : ''}

Recent conversation:
${conversationContext}

Generate ONLY the email body text. Do not include subject line or signature (those will be added automatically). Write in a ${tone} tone. Use UK English spelling.`;

            const draftBody = await askZenaService.askBrain(prompt, {
                jsonMode: false,
                systemPrompt: 'You are Zena, an AI assistant helping a real estate agent. Write clear, helpful email replies. Be concise but thorough. Use UK English.'
            });

            // Generate subject (typically Re: original subject)
            const originalSubject = thread.subject || latestMessage?.subject || '';
            const subject = originalSubject.startsWith('Re:')
                ? originalSubject
                : `Re: ${originalSubject}`;

            // Calculate confidence based on context quality
            let confidenceScore = 0.8;
            if (thread.classification && thread.classification !== 'noise') {
                confidenceScore += 0.05;
            }
            if (thread.property) {
                confidenceScore += 0.05;
            }
            if (params.customInstructions) {
                confidenceScore += 0.05;
            }
            confidenceScore = Math.min(confidenceScore, 0.95);

            // Store draft in thread
            await prisma.thread.update({
                where: { id: params.threadId },
                data: { draftResponse: draftBody }
            });

            return {
                success: true,
                data: {
                    draftId: `draft-${params.threadId}-${Date.now()}`,
                    subject,
                    body: draftBody,
                    confidenceScore,
                    suggestedTone: tone
                }
            };
        } catch (error) {
            console.error('[inbox.draft_reply] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate draft'
            };
        }
    },

    auditLogFormat(input, _output) {
        return {
            action: 'INBOX_DRAFT',
            summary: `Generated draft reply for thread (tone: ${input.tone || 'professional'})`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(draftReplyTool);
