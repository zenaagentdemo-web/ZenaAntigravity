/**
 * Voice Note: Upload Tool
 * 
 * Creates a new voice note from audio URL.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { voiceNoteService } from '../../services/voice-note.service.js';

interface UploadVoiceNoteInput {
    audioUrl: string;
}

interface UploadVoiceNoteOutput {
    success: boolean;
    voiceNoteId: string;
    status: string;
}

export const uploadVoiceNoteTool: ZenaToolDefinition<UploadVoiceNoteInput, UploadVoiceNoteOutput> = {
    name: 'voice_note.upload',
    domain: 'voice_note',
    description: 'Upload a new voice note from an audio URL',

    inputSchema: {
        type: 'object',
        properties: {
            audioUrl: {
                type: 'string',
                description: 'URL of the audio file to upload'
            }
        },
        required: ['audioUrl']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            voiceNoteId: { type: 'string' },
            status: { type: 'string' }
        }
    },

    permissions: ['voice_notes:write'],
    requiresApproval: false,

    async execute(params: UploadVoiceNoteInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UploadVoiceNoteOutput>> {
        try {
            const voiceNoteId = await voiceNoteService.createVoiceNote(context.userId, params.audioUrl);

            // Start processing asynchronously
            voiceNoteService.processVoiceNote(voiceNoteId).catch(error => {
                console.error('Error processing voice note:', error);
            });

            return {
                success: true,
                data: {
                    success: true,
                    voiceNoteId,
                    status: 'processing'
                }
            };
        } catch (error) {
            console.error('[voice_note.upload] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload voice note'
            };
        }
    },

    auditLogFormat(_input: UploadVoiceNoteInput, output: ToolExecutionResult<UploadVoiceNoteOutput>) {
        return {
            action: 'VOICE_NOTE_UPLOAD',
            summary: 'Uploaded new voice note',
            entityType: 'voice_note',
            entityId: output.success && output.data ? output.data.voiceNoteId : undefined
        };
    }
};

toolRegistry.register(uploadVoiceNoteTool);
