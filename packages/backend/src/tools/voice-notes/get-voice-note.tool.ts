/**
 * Voice Note: Get Tool
 * 
 * Gets a specific voice note.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { voiceNoteService } from '../../services/voice-note.service.js';

interface GetVoiceNoteInput {
    voiceNoteId: string;
}

interface GetVoiceNoteOutput {
    success: boolean;
    voiceNote: {
        id: string;
        status: string;
        transcript?: string;
        summary?: string;
        createdAt: string;
    };
}

export const getVoiceNoteTool: ZenaToolDefinition<GetVoiceNoteInput, GetVoiceNoteOutput> = {
    name: 'voice_note.get',
    domain: 'voice_note',
    description: 'Get details of a specific voice note including transcript',

    inputSchema: {
        type: 'object',
        properties: {
            voiceNoteId: {
                type: 'string',
                description: 'ID of the voice note'
            }
        },
        required: ['voiceNoteId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            voiceNote: { type: 'object' }
        }
    },

    permissions: ['voice_notes:read'],
    requiresApproval: false,

    async execute(params: GetVoiceNoteInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetVoiceNoteOutput>> {
        try {
            const voiceNote = await voiceNoteService.getVoiceNote(params.voiceNoteId, context.userId);

            return {
                success: true,
                data: {
                    success: true,
                    voiceNote: {
                        id: voiceNote.id,
                        status: voiceNote.processingStatus || 'unknown',
                        transcript: voiceNote.transcript || undefined,
                        summary: undefined, // VoiceNote doesn't have summary field
                        createdAt: voiceNote.createdAt.toISOString()
                    }
                }
            };
        } catch (error) {
            console.error('[voice_note.get] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get voice note'
            };
        }
    },

    auditLogFormat(input: GetVoiceNoteInput, _output: ToolExecutionResult<GetVoiceNoteOutput>) {
        return {
            action: 'VOICE_NOTE_GET',
            summary: `Retrieved voice note ${input.voiceNoteId}`,
            entityType: 'voice_note',
            entityId: input.voiceNoteId
        };
    }
};

toolRegistry.register(getVoiceNoteTool);
