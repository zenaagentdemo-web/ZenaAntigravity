/**
 * Contact: Create Contact Tool
 * 
 * Creates a new contact in the user's CRM.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface CreateContactInput {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    company?: string;
}

interface CreateContactOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
        emails: string[];
        phones: string[];
        role: string;
    };
}

export const createContactTool: ZenaToolDefinition<CreateContactInput, CreateContactOutput> = {
    name: 'contact.create',
    domain: 'contact',
    description: 'Create a new contact with name, email, phone, role, and company',

    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Full name of the contact (required)'
            },
            email: {
                type: 'string',
                description: 'Email address of the contact'
            },
            phone: {
                type: 'string',
                description: 'Phone number of the contact'
            },
            role: {
                type: 'string',
                description: 'Role of the contact (e.g., "Buyer", "Vendor", "Lawyer")'
            },
            company: {
                type: 'string',
                description: 'Company or organization name'
            }
        },
        required: ['name']
    },

    recommendedFields: ['email', 'phone', 'role', 'company'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contact: { type: 'object' }
        }
    },

    permissions: ['contacts:write'],
    requiresApproval: true,
    approvalType: 'standard',

    confirmationPrompt: (params) => {
        let prompt = `Create contact: "${params.name}"`;
        if (params.email) prompt += ` (${params.email})`;
        if (params.role) prompt += ` as ${params.role}`;
        return prompt + '?';
    },

    async execute(params: CreateContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<CreateContactOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Contact creation requires approval'
            };
        }

        try {
            const emails = params.email ? [params.email] : [];
            const phones = params.phone ? [params.phone] : [];
            const role = params.role || 'Other';

            const contact = await prisma.contact.create({
                data: {
                    userId: context.userId,
                    name: params.name,
                    emails,
                    phones,
                    role,
                    zenaCategory: 'PULSE',
                    zenaIntelligence: params.company ? { company: params.company } : undefined
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    contact: {
                        id: contact.id,
                        name: contact.name,
                        emails: contact.emails,
                        phones: contact.phones,
                        role: contact.role
                    }
                }
            };
        } catch (error) {
            console.error('[contact.create] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create contact'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'CONTACT_CREATE',
            summary: `Created contact: "${input.name}"`,
            entityType: 'contact',
            entityId: output.success && output.data ? output.data.contact.id : undefined
        };
    }
};

toolRegistry.register(createContactTool);
