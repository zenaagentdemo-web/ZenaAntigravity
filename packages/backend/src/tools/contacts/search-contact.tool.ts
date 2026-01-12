/**
 * Contact: Search Contact Tool
 * 
 * Searches for a contact by name, email, or phone.
 * Returns the best matching contact for follow-up actions.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchContactInput {
    name?: string;
    email?: string;
    phone?: string;
    query?: string;
}

interface SearchContactOutput {
    found: boolean;
    contact?: {
        id: string;
        name: string;
        role: string;
        emails: string[];
        phones: string[];
        zenaCategory: string;
        intelligenceSnippet?: string;
    };
    alternatives?: Array<{
        id: string;
        name: string;
        role: string;
    }>;
}

export const searchContactTool: ZenaToolDefinition<SearchContactInput, SearchContactOutput> = {
    name: 'contact.search',
    domain: 'contact',
    description: 'Search for a contact by name, email, or phone number. Use this to find a contact before updating or adding notes.',

    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Contact name to search for'
            },
            email: {
                type: 'string',
                description: 'Email address to search for'
            },
            phone: {
                type: 'string',
                description: 'Phone number to search for'
            },
            query: {
                type: 'string',
                description: 'General search query (searches name, email, phone)'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            found: { type: 'boolean' },
            contact: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['contacts:read'],
    requiresApproval: false,

    async execute(params: SearchContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchContactOutput>> {
        try {
            const searchTerm = params.name || params.email || params.phone || params.query;

            if (!searchTerm) {
                return { success: false, error: 'Please provide a name, email, phone, or query to search' };
            }

            // Search by multiple fields
            const contacts = await prisma.contact.findMany({
                where: {
                    userId: context.userId,
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { emails: { hasSome: [searchTerm.toLowerCase()] } },
                        { phones: { hasSome: [searchTerm] } }
                    ]
                },
                take: 5,
                orderBy: { lastActivityAt: 'desc' }
            });

            if (contacts.length === 0) {
                return {
                    success: true,
                    data: { found: false }
                };
            }

            const bestMatch = contacts[0];
            const alternatives = contacts.slice(1).map(c => ({
                id: c.id,
                name: c.name,
                role: c.role
            }));

            return {
                success: true,
                data: {
                    found: true,
                    contact: {
                        id: bestMatch.id,
                        name: bestMatch.name,
                        role: bestMatch.role,
                        emails: bestMatch.emails,
                        phones: bestMatch.phones,
                        zenaCategory: bestMatch.zenaCategory,
                        intelligenceSnippet: bestMatch.intelligenceSnippet || undefined
                    },
                    alternatives: alternatives.length > 0 ? alternatives : undefined
                }
            };
        } catch (error) {
            console.error('[contact.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search contacts'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'CONTACT_SEARCH',
            summary: `Searched for contact: ${input.name || input.email || input.query}`,
            entityType: 'contact',
            entityId: output.success && output.data?.contact ? output.data.contact.id : undefined
        };
    }
};

toolRegistry.register(searchContactTool);
