import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { logger } from '../../services/logger.service.js';

export const addMilestoneTool: ZenaToolDefinition = {
    name: 'property.add_milestone',
    domain: 'property',
    description: 'Add a campaign milestone (e.g. Photography, Open Home, Auction) to a property. Log multiple milestones individually.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' },
            title: { type: 'string', description: 'Milestone name (e.g. "Photography")' },
            date: { type: 'string', description: 'ISO date string' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
        },
        required: ['propertyId', 'title', 'date']
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
        const { propertyId, title, date, status } = params;

        const property = await prisma.property.findFirst({
            where: { id: propertyId, userId }
        });

        if (!property) return { success: false, error: 'Property not found' };

        const currentMilestones = (property.milestones as any[]) || [];
        const newMilestone = {
            id: Math.random().toString(36).substring(7),
            title,
            date,
            status: status || 'pending',
            createdAt: new Date().toISOString()
        };

        const updatedMilestones = [...currentMilestones, newMilestone];

        await prisma.property.update({
            where: { id: propertyId },
            data: { milestones: updatedMilestones }
        });

        // 📅 Create timeline event (calendar nature) for the milestone
        try {
            await prisma.timelineEvent.create({
                data: {
                    userId,
                    type: 'meeting', // Match what the UI expects for calendar items
                    entityType: 'calendar_event',
                    entityId: `milestone_${newMilestone.id}`,
                    summary: `${title} - ${property.address}`,
                    timestamp: new Date(date),
                    content: `Campaign milestone: ${title}`,
                    metadata: {
                        propertyId,
                        isMilestone: true,
                        status: 'pending'
                    }
                }
            });
            logger.info(`[property.add_milestone] Created timeline event for: ${title}`);
        } catch (calErr) {
            logger.warn(`[property.add_milestone] Failed to create timeline event:`, calErr);
        }

        // ✅ Create primary task for the milestone
        try {
            await prisma.task.create({
                data: {
                    userId,
                    label: `${title}: ${property.address}`,
                    dueDate: new Date(date),
                    status: 'open',
                    source: 'ai_suggested',
                    propertyId
                }
            });
            logger.info(`[property.add_milestone] Created primary task for: ${title}`);
        } catch (taskErr) {
            logger.warn(`[property.add_milestone] Failed to create task:`, taskErr);
        }

        // 🧠 ZENA SUPER-INTEL: Proactive Follow-up Task Generation
        const milestoneConfigs: Record<string, { label: string, offsetDays: number, type: string }> = {
            'photography': { label: 'Review photos and select marketing hero shot', offsetDays: 2, type: 'viewing' },
            'signage installed': { label: 'Verify signage placement and lighting', offsetDays: 1, type: 'other' },
            'open home': { label: 'Follow up with all attendees from open home', offsetDays: 1, type: 'open_home' },
            'listing live': { label: 'Share listing to social media channels', offsetDays: 0, type: 'listing' },
            'auction': { label: 'Prepare auction day materials', offsetDays: 0, type: 'auction' }
        };

        const milestoneKey = title.toLowerCase().trim();
        const config = milestoneConfigs[milestoneKey];

        // Ensure the milestone itself has a standard type for the frontend
        if (config) {
            newMilestone.type = config.type;
            // Re-update property with the typed milestone
            await prisma.property.update({
                where: { id: propertyId },
                data: { milestones: [...currentMilestones, newMilestone] }
            });
        }

        if (config) {
            try {
                const followUpDate = new Date(date);
                followUpDate.setDate(followUpDate.getDate() + config.offsetDays);

                await prisma.task.create({
                    data: {
                        userId,
                        label: `${config.label} (${property.address})`,
                        dueDate: followUpDate,
                        status: 'open',
                        source: 'ai_suggested',
                        propertyId
                    }
                });
                logger.info(`[property.add_milestone] 🧠 Proactive follow-up created: ${config.label}`);
            } catch (fuErr) {
                logger.warn(`[property.add_milestone] Failed to create follow-up task:`, fuErr);
            }
        }

        return {
            success: true,
            data: { milestones: updatedMilestones }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_MILESTONE_ADD',
        summary: `Added milestone "${input.title}" to property ${input.propertyId}`
    })
};

toolRegistry.register(addMilestoneTool);
