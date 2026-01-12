/**
 * Contact: List Contacts Tool
 * 
 * Lists contacts with optional filters.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ListContactsInput {
    role?: string;
    zenaCategory?: 'PULSE' | 'HOT_LEAD' | 'COLD_NURTURE' | 'HIGH_INTENT';
    search?: string;
    limit?: number;
}

interface ContactSummary {
    id: string;
    name: string;
    role: string;
    zenaCategory: string;
    email?: string;
    phone?: string;
    lastActivityAt?: string;
    intelligenceSnippet?: string;
}

interface ListContactsOutput {
    contacts: ContactSummary[];
    total: number;
}

export const listContactsTool: ZenaToolDefinition<ListContactsInput, ListContactsOutput> = {
    name: 'contact.list',
    domain: 'contact',
    description: 'List contacts with optional filters for role, Zena category, and search term',

    inputSchema: {
        type: 'object',
        properties: {
            role: {
                type: 'string',
                description: 'Filter by role (e.g., "buyer", "vendor", "agent")'
            },
            zenaCategory: {
                type: 'string',
                enum: ['PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'],
                description: 'Filter by Zena category'
            },
            search: {
                type: 'string',
                description: 'Search by name or email'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of contacts to return',
                default: 20
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            contacts: { type: 'array' },
            total: { type: 'number' }
        }
    },

    permissions: ['contacts:read'],
    requiresApproval: false,

    async execute(params: ListContactsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ListContactsOutput>> {
        try {
            const limit = params.limit || 20;

            // Build query
            const where: any = {
                userId: context.userId
            };

            if (params.role) {
                where.role = params.role;
            }
            if (params.zenaCategory) {
                where.zenaCategory = params.zenaCategory;
            }
            if (params.search) {
                where.OR = [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { emails: { has: params.search } }
                ];
            }

            // Fetch contacts
            const contacts = await prisma.contact.findMany({
                where,
                orderBy: { lastActivityAt: 'desc' },
                take: limit
            });

            // Get total count
            const total = await prisma.contact.count({ where });

            // Format output
            const contactSummaries: ContactSummary[] = contacts.map(c => ({
                id: c.id,
                name: c.name,
                role: c.role,
                zenaCategory: c.zenaCategory,
                email: c.emails[0] || undefined,
                phone: c.phones[0] || undefined,
                lastActivityAt: c.lastActivityAt?.toISOString(),
                intelligenceSnippet: c.intelligenceSnippet || undefined
            }));

            return {
                success: true,
                data: {
                    contacts: contactSummaries,
                    total
                }
            };
        } catch (error) {
            console.error('[contact.list] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list contacts'
            };
        }
    },

    auditLogFormat(_input, output) {
        const count = output.success && output.data ? output.data.contacts.length : 0;
        return {
            action: 'CONTACT_LIST',
            summary: `Listed ${count} contacts`
        };
    }
};

toolRegistry.register(listContactsTool);
