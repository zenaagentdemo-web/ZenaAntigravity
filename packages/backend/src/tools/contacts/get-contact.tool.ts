/**
 * Contact: Get Contact Tool
 * 
 * Gets full contact details with related entities.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface GetContactInput {
    contactId: string;
}

interface GetContactOutput {
    contact: {
        id: string;
        name: string;
        role: string;
        zenaCategory: string;
        emails: string[];
        phones: string[];
        intelligenceSnippet?: string;
        zenaIntelligence?: any;
        lastActivityAt?: string;
        lastActivityDetail?: string;
    };
    deals: Array<{
        id: string;
        propertyAddress?: string;
        stage: string;
        pipelineType: string;
    }>;
    recentNotes: Array<{
        content: string;
        date: string;
    }>;
}

export const getContactTool: ZenaToolDefinition<GetContactInput, GetContactOutput> = {
    name: 'contact.get',
    domain: 'contact',
    description: 'Get full contact details including linked deals and recent notes',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to retrieve'
            }
        },
        required: ['contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            contact: { type: 'object' },
            deals: { type: 'array' },
            recentNotes: { type: 'array' }
        }
    },

    permissions: ['contacts:read'],
    requiresApproval: false,

    async execute(params: GetContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetContactOutput>> {
        try {
            // Fetch contact with relations
            const contact = await prisma.contact.findFirst({
                where: {
                    id: params.contactId,
                    userId: context.userId
                },
                include: {
                    deals: {
                        include: {
                            property: { select: { address: true } }
                        }
                    }
                }
            });

            if (!contact) {
                return {
                    success: false,
                    error: 'Contact not found'
                };
            }

            // Extract relationship notes
            const relationshipNotes = (contact.relationshipNotes as any[]) || [];

            return {
                success: true,
                data: {
                    contact: {
                        id: contact.id,
                        name: contact.name,
                        role: contact.role,
                        zenaCategory: contact.zenaCategory,
                        emails: contact.emails,
                        phones: contact.phones,
                        intelligenceSnippet: contact.intelligenceSnippet || undefined,
                        zenaIntelligence: contact.zenaIntelligence || undefined,
                        lastActivityAt: contact.lastActivityAt?.toISOString(),
                        lastActivityDetail: contact.lastActivityDetail || undefined
                    },
                    deals: contact.deals.map(d => ({
                        id: d.id,
                        propertyAddress: d.property?.address || undefined,
                        stage: d.stage,
                        pipelineType: d.pipelineType
                    })),
                    recentNotes: relationshipNotes.slice(0, 5).map((n: any) => ({
                        content: n.note || n.content || '',
                        date: n.createdAt || n.date || ''
                    }))
                }
            };
        } catch (error) {
            console.error('[contact.get] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get contact'
            };
        }
    },

    auditLogFormat(input, output) {
        const name = output.success && output.data?.contact?.name || 'Unknown';
        return {
            action: 'CONTACT_GET',
            summary: `Opened contact: ${name}`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(getContactTool);
