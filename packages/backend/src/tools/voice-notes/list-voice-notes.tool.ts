/**
 * Voice Note: List Tool
 * 
 * Lists user's voice notes.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { voiceNoteService } from '../../services/voice-note.service.js';

interface ListVoiceNotesInput {
    status?: string;
    limit?: number;
}

interface ListVoiceNotesOutput {
    success: boolean;
    voiceNotes: Array<{
        id: string;
        status: string;
        transcript?: string;
        createdAt: string;
    }>;
    count: number;
}

export const listVoiceNotesTool: ZenaToolDefinition<ListVoiceNotesInput, ListVoiceNotesOutput> = {
    name: 'voice_note.list',
    domain: 'voice_note',
    description: 'List voice notes with optional status filter',

    inputSchema: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                description: 'Filter by status (pending, processed, failed)'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of voice notes to return'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            voiceNotes: { type: 'array' },
            count: { type: 'number' }
        }
    },

    permissions: ['voice_notes:read'],
    requiresApproval: false,

    async execute(params: ListVoiceNotesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ListVoiceNotesOutput>> {
        try {
            const voiceNotes = await voiceNoteService.getVoiceNotes(context.userId, {
                status: params.status,
                limit: params.limit
            }) as any[];

            return {
                success: true,
                data: {
                    success: true,
                    voiceNotes: voiceNotes.map((v: any) => ({
                        id: v.id,
                        status: v.processingStatus || 'unknown',
                        transcript: v.transcript || undefined,
                        createdAt: v.createdAt.toISOString()
                    })),
                    count: voiceNotes.length
                }
            };
        } catch (error) {
            console.error('[voice_note.list] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list voice notes'
            };
        }
    },

    auditLogFormat(_input: ListVoiceNotesInput, output: ToolExecutionResult<ListVoiceNotesOutput>) {
        const count = output.success && output.data ? output.data.count : 0;
        return {
            action: 'VOICE_NOTE_LIST',
            summary: `Listed ${count} voice notes`,
            entityType: 'voice_note'
        };
    }
};

toolRegistry.register(listVoiceNotesTool);
