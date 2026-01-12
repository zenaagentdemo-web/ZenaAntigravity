import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const deletePropertyTool: ZenaToolDefinition = {
    name: 'property.delete',
    domain: 'property',
    description: 'Permanently delete a property listing. Requires explicit confirmation.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The property ID' }
        },
        required: ['id']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: true,
    confirmationPrompt: (_input) => `⚠️ You are about to PERMANENTLY DELETE this property listing. This cannot be undone. Type YES to confirm.`,

    execute: async (params, context) => {
        const userId = context.userId;
        const { id } = params;

        await prisma.property.delete({
            where: { id, userId }
        });

        return {
            success: true,
            data: { success: true }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_DELETE',
        summary: `Deleted property ${input.id}`
    })
};

toolRegistry.register(deletePropertyTool);
