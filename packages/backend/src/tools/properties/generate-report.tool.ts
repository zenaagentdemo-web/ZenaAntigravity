import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const generatePropertyReportTool: ZenaToolDefinition = {
    name: 'property.generate_report',
    domain: 'property',
    description: 'Generate a vendor status report summary for a property.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' }
        },
        required: ['propertyId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            reportSummary: { type: 'string' }
        }
    },

    permissions: ['properties:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        const { propertyId } = params;

        const property = await prisma.property.findFirst({
            where: { id: propertyId, userId },
            include: {
                vendors: true,
                deals: {
                    select: { stage: true, riskLevel: true }
                }
            }
        });

        if (!property) return { success: false, error: 'Property not found' };

        // Simple mock report generation logic for now
        const milestones = (property.milestones as any[]) || [];
        const completed = milestones.filter(m => m.status === 'completed').length;
        const total = milestones.length;

        const reportSummary = `
Vendor Report for ${property.address}
Status: ${property.status}
Marketing Progress: ${completed}/${total} milestones completed.
Current Interest: ${property.viewingCount} viewings, ${property.inquiryCount} inquiries.
Active Deals: ${property.deals.length}
Best Next Action: Follow up with the most recent inquiry to convert to viewing.
        `.trim();

        return {
            success: true,
            data: { reportSummary }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_REPORT_GENERATE',
        summary: `Generated vendor report for property ${input.propertyId}`
    })
};

toolRegistry.register(generatePropertyReportTool);
