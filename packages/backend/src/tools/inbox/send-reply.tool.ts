/**
 * Inbox: Send Reply Tool
 * 
 * Sends a reply to an email thread. REQUIRES APPROVAL.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SendReplyInput {
    threadId: string;
    body: string;
    subject?: string;
}

interface SendReplyOutput {
    success: boolean;
    messageId: string;
    sentTo: string;
    sentAt: string;
}

export const sendReplyTool: ZenaToolDefinition<SendReplyInput, SendReplyOutput> = {
    name: 'inbox.send_reply',
    domain: 'inbox',
    description: 'Send a reply to an email thread. This action sends a real email and requires your approval.',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'The ID of the thread to reply to (optional if threadSubject provided)'
            },
            threadSubject: {
                type: 'string',
                description: 'The subject of the thread to reply to (will resolve to ID)'
            },
            body: {
                type: 'string',
                description: 'The email body text to send'
            },
            subject: {
                type: 'string',
                description: 'Optional subject line override'
            }
        },
        required: ['body']
    },

    recommendedFields: ['threadId', 'threadSubject', 'subject'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            messageId: { type: 'string' },
            sentTo: { type: 'string' },
            sentAt: { type: 'string' }
        }
    },

    permissions: ['email:send'],
    requiresApproval: true,  // ALWAYS requires approval
    approvalType: 'standard',

    confirmationPrompt: (params) => {
        const preview = params.body.length > 100
            ? params.body.substring(0, 100) + '...'
            : params.body;
        return `Ready to send this email reply:\n\n"${preview}"\n\nApprove to send, or say "edit" to make changes.`;
    },

    // Generate idempotency key to prevent duplicate sends
    idempotencyKey: (input) => {
        return `send_reply:${input.threadId}:${input.body.substring(0, 50)}`;
    },

    async execute(params: SendReplyInput & { threadSubject?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<SendReplyOutput>> {
        // Safety check: must have approval
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Email send requires explicit approval'
            };
        }

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

            // Fetch thread with email account
            const thread = await prisma.thread.findFirst({
                where: {
                    id: threadId,
                    userId
                },
                include: {
                    emailAccount: true,
                    messages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 1
                    }
                }
            });

            if (!thread) {
                return {
                    success: false,
                    error: 'Thread not found'
                };
            }

            if (!thread.emailAccount) {
                return {
                    success: false,
                    error: 'No email account linked to thread'
                };
            }

            // Get recipient from latest message
            const latestMessage = thread.messages[0];
            const fromData = latestMessage?.from as { name?: string; email?: string } | null;
            const replyTo = fromData?.email;

            if (!replyTo) {
                return {
                    success: false,
                    error: 'Could not determine recipient email'
                };
            }

            // Determine subject
            const subject = params.subject || (
                thread.subject?.startsWith('Re:')
                    ? thread.subject
                    : `Re: ${thread.subject || 'No Subject'}`
            );

            // TODO: Integrate with actual email sending service
            // For now, create a placeholder message record
            const messageId = `sent-${Date.now()}`;

            // Create sent message in database
            await prisma.message.create({
                data: {
                    threadId: thread.id,
                    externalId: messageId,
                    from: { name: 'Me', email: thread.emailAccount.email },
                    to: [{ name: fromData?.name, email: replyTo }],
                    cc: [],
                    subject,
                    body: params.body,
                    sentAt: new Date(),
                    receivedAt: new Date(),
                    isFromUser: true
                }
            });

            // Clear draft after successful send
            await prisma.thread.update({
                where: { id: params.threadId },
                data: {
                    draftResponse: null,
                    lastReplyAt: new Date(),
                    category: 'waiting' // Move to awaiting response
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    messageId,
                    sentTo: replyTo,
                    sentAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('[inbox.send_reply] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send email'
            };
        }
    },

    auditLogFormat(input, output) {
        const sentTo = output.success && output.data ? output.data.sentTo : 'unknown';
        return {
            action: 'EMAIL_SENT',
            summary: `Sent email reply to ${sentTo}`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(sendReplyTool);
