/**
 * Deal: Add Note Tool
 * 
 * Adds a note to a deal's timeline.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface AddNoteInput {
    dealId: string;
    note: string;
    source?: string;
}

interface AddNoteOutput {
    success: boolean;
    eventId: string;
    dealId: string;
}

export const addNoteTool: ZenaToolDefinition<AddNoteInput, AddNoteOutput> = {
    name: 'deal.add_note',
    domain: 'deal',
    description: 'Add a note to a deal timeline',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'The ID of the deal to add a note to'
            },
            note: {
                type: 'string',
                description: 'The note content'
            },
            source: {
                type: 'string',
                description: 'Optional source identifier (e.g., "voice_note", "agent")',
                default: 'agent'
            }
        },
        required: ['dealId', 'note']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            eventId: { type: 'string' },
            dealId: { type: 'string' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: AddNoteInput, context: ToolExecutionContext): Promise<ToolExecutionResult<AddNoteOutput>> {
        try {
            // Verify deal exists
            const deal = await prisma.deal.findFirst({
                where: {
                    id: params.dealId,
                    userId: context.userId
                }
            });

            if (!deal) {
                return {
                    success: false,
                    error: 'Deal not found'
                };
            }

            // Create timeline event
            const event = await prisma.timelineEvent.create({
                data: {
                    userId: context.userId,
                    entityType: 'deal',
                    entityId: params.dealId,
                    type: 'note',
                    summary: params.note.substring(0, 200),
                    content: params.note,
                    metadata: {
                        source: params.source || 'agent'
                    },
                    timestamp: new Date()
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    eventId: event.id,
                    dealId: params.dealId
                }
            };
        } catch (error) {
            console.error('[deal.add_note] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add note'
            };
        }
    },

    auditLogFormat(input, _output) {
        const preview = input.note.length > 50 ? input.note.substring(0, 50) + '...' : input.note;
        return {
            action: 'DEAL_NOTE_ADD',
            summary: `Added note: "${preview}"`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(addNoteTool);
