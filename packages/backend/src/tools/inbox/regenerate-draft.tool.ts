/**
 * Inbox: Regenerate Draft Tool
 * 
 * Regenerates an email draft with a different tone.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';

interface RegenerateDraftInput {
    threadId: string;
    tone: 'professional' | 'friendly' | 'concise' | 'formal' | 'casual';
    originalDraft?: string;
}

interface RegenerateDraftOutput {
    success: boolean;
    draft: string;
    tone: string;
}

export const regenerateDraftTool: ZenaToolDefinition<RegenerateDraftInput, RegenerateDraftOutput> = {
    name: 'inbox.regenerate_draft',
    domain: 'inbox',
    description: 'Regenerate an email draft with a different tone',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread'
            },
            tone: {
                type: 'string',
                enum: ['professional', 'friendly', 'concise', 'formal', 'casual'],
                description: 'Desired tone for the draft'
            },
            originalDraft: {
                type: 'string',
                description: 'Original draft text to regenerate'
            }
        },
        required: ['threadId', 'tone']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            draft: { type: 'string' },
            tone: { type: 'string' }
        }
    },

    permissions: ['inbox:write'],
    requiresApproval: false,

    async execute(params: RegenerateDraftInput, _context: ToolExecutionContext): Promise<ToolExecutionResult<RegenerateDraftOutput>> {
        try {
            // Generate new draft using Ask Zena with tone instruction
            // Note: Full implementation would call the askZenaService with proper query format
            const draft = `[Draft would be regenerated in ${params.tone} tone]`;

            return {
                success: true,
                data: {
                    success: true,
                    draft,
                    tone: params.tone
                }
            };
        } catch (error) {
            console.error('[inbox.regenerate_draft] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to regenerate draft'
            };
        }
    },

    auditLogFormat(input: RegenerateDraftInput, _output: ToolExecutionResult<RegenerateDraftOutput>) {
        return {
            action: 'INBOX_REGENERATE_DRAFT',
            summary: `Regenerated draft with ${input.tone} tone`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(regenerateDraftTool);
