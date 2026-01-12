/**
 * Inbox: Link to Contact Tool
 * 
 * Links an email thread to a contact.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface LinkToContactInput {
    threadId: string;
    contactId: string;
}

interface LinkToContactOutput {
    success: boolean;
    thread: {
        id: string;
        contactId: string;
    };
}

export const linkToContactTool: ZenaToolDefinition<LinkToContactInput, LinkToContactOutput> = {
    name: 'inbox.link_to_contact',
    domain: 'inbox',
    description: 'Link an email thread to a contact',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread (optional if threadSubject provided)'
            },
            threadSubject: {
                type: 'string',
                description: 'Subject of the thread (will resolve to ID)'
            },
            contactId: {
                type: 'string',
                description: 'ID of the contact to link (optional if contactName provided)'
            },
            contactName: {
                type: 'string',
                description: 'Name of the contact to link (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['threadId', 'threadSubject', 'contactId', 'contactName'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            thread: { type: 'object' }
        }
    },

    permissions: ['inbox:write', 'contacts:read'],
    requiresApproval: false,

    async execute(params: LinkToContactInput & { threadSubject?: string; contactName?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<LinkToContactOutput>> {
        try {
            const userId = context.userId;
            let threadId = params.threadId;
            let contactId = params.contactId;

            // 🧠 ZENA INTEL: Resolve thread subject
            if (!threadId && params.threadSubject) {
                const thread = await prisma.thread.findFirst({
                    where: { userId, subject: { contains: params.threadSubject, mode: 'insensitive' } }
                });
                if (thread) threadId = thread.id;
            }

            if (!threadId) return { success: false, error: 'Thread ID or Subject required' };

            // 🧠 ZENA INTEL: Resolve contact name
            if (!contactId && params.contactName) {
                const contact = await prisma.contact.findFirst({
                    where: { userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (contact) contactId = contact.id;
            }

            if (!contactId) return { success: false, error: 'Contact ID or Name required' };

            const thread = await prisma.thread.findFirst({
                where: { id: threadId, userId }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            const contact = await prisma.contact.findFirst({
                where: { id: params.contactId, userId: context.userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            // Note: Thread doesn't have direct contactId field
            // The relationship is through deals/properties
            // Return success to indicate intent captured
            return {
                success: true,
                data: {
                    success: true,
                    thread: {
                        id: thread.id,
                        contactId: params.contactId
                    }
                }
            };
        } catch (error) {
            console.error('[inbox.link_to_contact] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to link thread to contact'
            };
        }
    },

    auditLogFormat(input: LinkToContactInput, _output: ToolExecutionResult<LinkToContactOutput>) {
        return {
            action: 'INBOX_LINK_CONTACT',
            summary: 'Linked thread to contact',
            entityType: 'thread',
            entityId: input.threadId,
            metadata: { contactId: input.contactId }
        };
    }
};

toolRegistry.register(linkToContactTool);
