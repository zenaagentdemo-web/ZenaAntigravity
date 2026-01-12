import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const deleteMilestoneTool: ZenaToolDefinition = {
    name: 'property.delete_milestone',
    domain: 'property',
    description: 'PERMANENTLY REMOVE a campaign milestone from a property. Use this ONLY when the user explicitly wants to DELETE or REMOVE a milestone entirely, NOT when they want to change its date, rename it, or reschedule it.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' },
            milestoneId: { type: 'string' }
        },
        required: ['propertyId', 'milestoneId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: true,
    confirmationPrompt: (_input) => `Are you sure you want to remove this milestone from the property?`,

    execute: async (params, context) => {
        const userId = context.userId;
        const { propertyId, milestoneId } = params;

        const property = await prisma.property.findFirst({
            where: { id: propertyId, userId }
        });

        if (!property) return { success: false, error: 'Property not found' };

        const currentMilestones = (property.milestones as any[]) || [];
        const updatedMilestones = currentMilestones.filter(m => m.id !== milestoneId);

        await prisma.property.update({
            where: { id: propertyId },
            data: { milestones: updatedMilestones }
        });

        return {
            success: true,
            data: { success: true }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_MILESTONE_DELETE',
        summary: `Deleted milestone ${input.milestoneId} from property ${input.propertyId}`
    })
};

toolRegistry.register(deleteMilestoneTool);
