/**
 * Contact: Run Discovery Tool
 * 
 * Triggers AI discovery pulse for relationship intelligence.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { contactCategorizationService } from '../../services/contact-categorization.service.js';

interface RunDiscoveryInput {
    contactId: string;
}

interface RunDiscoveryOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
        intelligenceSnippet?: string;
    };
}

export const runDiscoveryTool: ZenaToolDefinition<RunDiscoveryInput, RunDiscoveryOutput> = {
    name: 'contact.run_discovery',
    domain: 'contact',
    description: 'Trigger AI discovery pulse to gather relationship intelligence for a contact',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to analyze'
            }
        },
        required: ['contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contact: { type: 'object' }
        }
    },

    permissions: ['contacts:read'],
    requiresApproval: false,

    async execute(params: RunDiscoveryInput, context: ToolExecutionContext): Promise<ToolExecutionResult<RunDiscoveryOutput>> {
        try {
            const contact = await prisma.contact.findFirst({
                where: { id: params.contactId, userId: context.userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            // Trigger discovery via categorization service
            await contactCategorizationService.categorizeContact(params.contactId);

            // Fetch updated contact
            const updated = await prisma.contact.findUnique({
                where: { id: params.contactId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    contact: {
                        id: updated!.id,
                        name: updated!.name,
                        intelligenceSnippet: updated!.intelligenceSnippet || undefined
                    }
                }
            };
        } catch (error) {
            console.error('[contact.run_discovery] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run discovery'
            };
        }
    },

    auditLogFormat(input, output) {
        const name = output.success && output.data ? output.data.contact.name : 'Unknown';
        return {
            action: 'CONTACT_DISCOVERY',
            summary: `Ran discovery pulse for: "${name}"`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(runDiscoveryTool);
