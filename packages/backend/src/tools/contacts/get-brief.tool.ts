import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { contactIntelligenceService } from '../../services/contact-intelligence.service.js';

export const getContactBriefTool: ZenaToolDefinition = {
    name: 'contact.get_brief',
    domain: 'contacts',
    description: 'Fetch a deep intelligence brief for a contact, including motivation analysis, urgency score, and strategic advice.',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: { type: 'string', description: 'The ID of the contact to analyze.' }
        },
        required: ['contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            analysis: { type: 'object' }
        }
    },

    permissions: ['contacts:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { contactId } = params;
        const userId = context.userId;

        const analysis = await contactIntelligenceService.analyzeContact(userId, contactId);

        return {
            success: true,
            data: { analysis }
        };
    },

    auditLogFormat: (input, output) => ({
        action: 'CONTACT_BRIEF_FETCH',
        summary: `Fetched intelligence brief for contact ${input.contactId}. Urgency Score: ${output.data?.analysis?.urgencyScore}`
    })
};

toolRegistry.register(getContactBriefTool);
