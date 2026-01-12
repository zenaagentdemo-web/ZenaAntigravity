import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { voiceNoteService } from '../../services/voice-note.service.js';

export const processVoiceNoteTool: ZenaToolDefinition = {
    name: 'task.process_voice_note',
    domain: 'tasks',
    description: 'Process a recorded voice note to automatically extract and create tasks, contacts, and property notes.',

    inputSchema: {
        type: 'object',
        properties: {
            voiceNoteId: { type: 'string', description: 'The ID of the voice note to process. If omitted, the latest one is used.' }
        }
    },

    outputSchema: {
        type: 'object',
        properties: {
            transcript: { type: 'string' },
            createdTasks: { type: 'array', items: { type: 'string' } },
            extractedEntities: { type: 'array', items: { type: 'object' } }
        }
    },

    permissions: ['tasks:write'],
    requiresApproval: true,
    confirmationPrompt: (input) => `Shall I analyze your ${input.voiceNoteId ? 'voice note' : 'latest voice note'} and automatically create any tasks or notes I find?`,

    execute: async (params, context) => {
        const userId = context.userId;
        let voiceNoteId = params.voiceNoteId;

        if (!voiceNoteId) {
            const latest = await voiceNoteService.getVoiceNotes(userId, { limit: 1 });
            if (latest.length === 0) {
                return { success: false, error: 'No voice notes found to process.' };
            }
            voiceNoteId = latest[0].id;
        }

        const result = await voiceNoteService.processVoiceNote(voiceNoteId);

        return {
            success: true,
            data: {
                transcript: result.transcript,
                createdTasks: result.createdTasks,
                extractedEntities: result.extractedEntities
            }
        };
    },

    auditLogFormat: (input, output) => ({
        action: 'VOICE_NOTE_PROCESS',
        summary: `Processed voice note ${input.voiceNoteId || 'latest'}. Created ${output.data?.createdTasks?.length || 0} tasks.`
    })
};

toolRegistry.register(processVoiceNoteTool);
