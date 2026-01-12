/**
 * Inbox: Link to Property Tool
 * 
 * Links an email thread to a property.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface LinkToPropertyInput {
    threadId: string;
    propertyId: string;
}

interface LinkToPropertyOutput {
    success: boolean;
    thread: {
        id: string;
        propertyId: string;
    };
}

export const linkToPropertyTool: ZenaToolDefinition<LinkToPropertyInput, LinkToPropertyOutput> = {
    name: 'inbox.link_to_property',
    domain: 'inbox',
    description: 'Link an email thread to a property',

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
            propertyId: {
                type: 'string',
                description: 'ID of the property to link (optional if propertyAddress provided)'
            },
            propertyAddress: {
                type: 'string',
                description: 'Address of the property to link (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['threadId', 'threadSubject', 'propertyId', 'propertyAddress'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            thread: { type: 'object' }
        }
    },

    permissions: ['inbox:write', 'properties:read'],
    requiresApproval: false,

    async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult<LinkToPropertyOutput>> {
        try {
            const userId = context.userId;
            let threadId = params.threadId;
            let propertyId = params.propertyId;

            // 🧠 ZENA INTEL: Resolve thread subject
            if (!threadId && params.threadSubject) {
                const thread = await prisma.thread.findFirst({
                    where: { userId, subject: { contains: params.threadSubject, mode: 'insensitive' } }
                });
                if (thread) threadId = thread.id;
            }

            if (!threadId) return { success: false, error: 'Thread ID or Subject required' };

            // 🧠 ZENA INTEL: Resolve property address
            if (!propertyId && params.propertyAddress) {
                const property = await prisma.property.findFirst({
                    where: { userId, address: { contains: params.propertyAddress, mode: 'insensitive' } }
                });
                if (property) propertyId = property.id;
            }

            if (!propertyId) return { success: false, error: 'Property ID or Address required' };

            const thread = await prisma.thread.findFirst({
                where: { id: threadId, userId }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            const property = await prisma.property.findFirst({
                where: { id: params.propertyId, userId: context.userId }
            });

            if (!property) {
                return { success: false, error: 'Property not found' };
            }

            const updated = await prisma.thread.update({
                where: { id: params.threadId },
                data: { propertyId: params.propertyId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    thread: {
                        id: updated.id,
                        propertyId: params.propertyId
                    }
                }
            };
        } catch (error) {
            console.error('[inbox.link_to_property] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to link thread to property'
            };
        }
    },

    auditLogFormat(input: LinkToPropertyInput, _output: ToolExecutionResult<LinkToPropertyOutput>) {
        return {
            action: 'INBOX_LINK_PROPERTY',
            summary: 'Linked thread to property',
            entityType: 'thread',
            entityId: input.threadId,
            metadata: { propertyId: input.propertyId }
        };
    }
};

toolRegistry.register(linkToPropertyTool);
