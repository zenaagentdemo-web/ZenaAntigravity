import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const updateMilestoneTool: ZenaToolDefinition = {
    name: 'property.update_milestone',
    domain: 'property',
    description: 'Update an existing campaign milestone. Use this to CHANGE DATE, RESCHEDULE, RENAME, or update the status of a milestone. This is NOT for deleting milestones.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' },
            milestoneId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
            date: { type: 'string', description: 'ISO date string' },
            title: { type: 'string', description: 'New name/title for the milestone' }
        },
        required: ['propertyId', 'milestoneId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            milestones: { type: 'array' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        const { propertyId, milestoneId, status, date, title } = params;

        const property = await prisma.property.findFirst({
            where: { id: propertyId, userId }
        });

        if (!property) return { success: false, error: 'Property not found' };

        const currentMilestones = (property.milestones as any[]) || [];
        const updatedMilestones = currentMilestones.map(m => {
            if (m.id === milestoneId) {
                return {
                    ...m,
                    ...(status && { status }),
                    ...(date && { date }),
                    ...(title && { title }),
                    updatedAt: new Date().toISOString()
                };
            }
            return m;
        });

        await prisma.property.update({
            where: { id: propertyId },
            data: { milestones: updatedMilestones }
        });

        const milestone = updatedMilestones.find(m => m.id === milestoneId);
        if (milestone) {
            const title = milestone.title || 'Milestone';

            // 📅 Update or Create timeline event
            try {
                // Try to find existing timeline event for this milestone
                const existingEvent = await prisma.timelineEvent.findFirst({
                    where: { userId, entityType: 'calendar_event', entityId: `milestone_${milestoneId}` }
                });

                if (existingEvent) {
                    await prisma.timelineEvent.update({
                        where: { id: existingEvent.id },
                        data: {
                            ...(date && { timestamp: new Date(date) }),
                            summary: `${title} - ${property.address}`
                        }
                    });
                } else {
                    // Create if missing
                    await prisma.timelineEvent.create({
                        data: {
                            userId,
                            type: 'meeting',
                            entityType: 'calendar_event',
                            entityId: `milestone_${milestoneId}`,
                            summary: `${title} - ${property.address}`,
                            timestamp: new Date(milestone.date),
                            content: `Campaign milestone: ${title}`,
                            metadata: { propertyId, isMilestone: true, status: milestone.status }
                        }
                    });
                }
            } catch (calErr) {
                console.warn(`[property.update_milestone] Calendar sync failed:`, calErr);
            }

            // ✅ Update or Create task
            try {
                const existingTask = await prisma.task.findFirst({
                    where: { userId, propertyId, label: { contains: title } }
                });

                if (existingTask) {
                    await prisma.task.update({
                        where: { id: existingTask.id },
                        data: {
                            ...(date && { dueDate: new Date(date) }),
                            status: status === 'completed' ? 'completed' : 'open'
                        }
                    });
                } else {
                    await prisma.task.create({
                        data: {
                            userId,
                            label: `${title}: ${property.address}`,
                            dueDate: new Date(milestone.date),
                            status: milestone.status === 'completed' ? 'completed' : 'open',
                            source: 'ai_suggested',
                            propertyId
                        }
                    });
                }
            } catch (taskErr) {
                console.warn(`[property.update_milestone] Task sync failed:`, taskErr);
            }
        }

        return {
            success: true,
            data: { milestones: updatedMilestones }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_MILESTONE_UPDATE',
        summary: `Updated milestone ${input.milestoneId} on property ${input.propertyId}`
    })
};

toolRegistry.register(updateMilestoneTool);
