import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const createCalendarEventTool: ZenaToolDefinition = {
    name: 'calendar.create',
    domain: 'calendar',
    description: 'Schedule a new calendar event. Only uses local storage for now (Sync happens in background).',

    inputSchema: {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            description: { type: 'string' },
            startTime: { type: 'string', description: 'ISO start date' },
            endTime: { type: 'string', description: 'ISO end date' },
            location: { type: 'string' },
            attendees: { type: 'array', items: { type: 'string' } },
            propertyId: { type: 'string', description: 'Explicit ID of the property to link' },
            contactId: { type: 'string', description: 'Explicit ID of the contact to link' },
            propertyAddress: { type: 'string' },
            contactName: { type: 'string' }
        },
        required: ['summary', 'startTime', 'endTime']
    },

    recommendedFields: ['description', 'location', 'attendees', 'propertyId', 'propertyAddress', 'contactName'],

    outputSchema: {
        type: 'object',
        properties: {
            event: { type: 'object' }
        }
    },

    permissions: ['calendar:write'],
    requiresApproval: false,  // Non-destructive action - auto-execute when intent is clear
    confirmationPrompt: (input) => `I'm ready to schedule "${input.summary}" for ${new Date(input.startTime).toLocaleString()}. Shall I proceed?`,

    execute: async (params, context) => {
        const userId = context.userId;
        let { summary, description, startTime, endTime, location, attendees, propertyId, contactId, contactName, propertyAddress } = params;

        // 🧠 ZENA INTEL: Resolve property address
        if (!propertyId && propertyAddress) {
            const property = await prisma.property.findFirst({
                where: { userId, address: { contains: propertyAddress, mode: 'insensitive' } }
            });
            if (property) propertyId = property.id;
        }

        // 🧠 ZENA INTEL: Resolve contact name
        let resolvedContactId: string | undefined = contactId;
        if (!resolvedContactId && contactName) {
            const contact = await prisma.contact.findFirst({
                where: { userId, name: { contains: contactName, mode: 'insensitive' } }
            });
            if (contact) resolvedContactId = contact.id;
        }

        // Mock external ID for local-first creation
        const externalId = `local_${Math.random().toString(36).substring(7)}`;

        const event = await prisma.timelineEvent.create({
            data: {
                userId,
                type: 'meeting',
                entityType: 'calendar_event',
                entityId: externalId,
                summary,
                content: description,
                timestamp: new Date(startTime),
                metadata: {
                    endTime,
                    location,
                    attendees,
                    propertyReference: propertyId,
                    contactReference: resolvedContactId,
                    isLocalOnly: true
                }
            }
        });

        return {
            success: true,
            data: {
                event: {
                    id: event.entityId,
                    localId: event.id,
                    summary: event.summary,
                    startTime: event.timestamp.toISOString(),
                    metadata: event.metadata
                }
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_CREATE',
        summary: `Scheduled calendar event: ${input.summary}`
    })
};

toolRegistry.register(createCalendarEventTool);
