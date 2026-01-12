/**
 * Contact: Add Relationship Note Tool
 * 
 * Adds an intel/relationship note to a contact.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface AddRelationshipNoteInput {
    contactId?: string;
    contactName?: string;
    note: string;
    source?: string;
}

interface AddRelationshipNoteOutput {
    success: boolean;
    contactId: string;
    noteAdded: boolean;
}

export const addRelationshipNoteTool: ZenaToolDefinition<AddRelationshipNoteInput, AddRelationshipNoteOutput> = {
    name: 'contact.add_relationship_note',
    domain: 'contact',
    description: 'Add an intel or relationship note to a contact (e.g., "John is motivated to sell due to divorce")',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to add a note to (optional if contactName provided)'
            },
            contactName: {
                type: 'string',
                description: 'The name of the contact to add a note to (will resolve to ID)'
            },
            note: {
                type: 'string',
                description: 'The relationship/intel note content'
            },
            source: {
                type: 'string',
                description: 'Optional source identifier (e.g., "voice_note", "email", "call")',
                default: 'agent'
            }
        },
        required: ['note']
    },
    recommendedFields: ['note'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contactId: { type: 'string' },
            noteAdded: { type: 'boolean' }
        }
    },

    permissions: ['contacts:write'],
    requiresApproval: false,

    async execute(params: AddRelationshipNoteInput, context: ToolExecutionContext): Promise<ToolExecutionResult<AddRelationshipNoteOutput>> {
        try {
            let resolvedContactId = params.contactId;

            // 🧠 ZENA INTEL: Resolve contact name to ID
            if (!resolvedContactId && params.contactName) {
                const foundContact = await prisma.contact.findFirst({
                    where: { userId: context.userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (foundContact) {
                    resolvedContactId = foundContact.id;
                } else {
                    return { success: false, error: `Contact "${params.contactName}" not found` };
                }
            }

            if (!resolvedContactId) {
                return { success: false, error: 'Please provide either contactId or contactName' };
            }

            // Fetch contact
            const contact = await prisma.contact.findFirst({
                where: {
                    id: resolvedContactId,
                    userId: context.userId
                }
            });

            if (!contact) {
                return {
                    success: false,
                    error: 'Contact not found'
                };
            }

            // Get existing notes
            const existingNotes = (contact.relationshipNotes as any[]) || [];

            // Add new note
            const newNote = {
                note: params.note,
                source: params.source || 'agent',
                createdAt: new Date().toISOString()
            };

            await prisma.contact.update({
                where: { id: params.contactId },
                data: {
                    relationshipNotes: [...existingNotes, newNote],
                    lastActivityAt: new Date(),
                    lastActivityDetail: `Note added: ${params.note.substring(0, 50)}`
                }
            });

            // Also create timeline event
            await prisma.timelineEvent.create({
                data: {
                    userId: context.userId,
                    entityType: 'contact',
                    entityId: params.contactId,
                    type: 'relationship_note',
                    summary: params.note.substring(0, 200),
                    content: params.note,
                    metadata: { source: params.source || 'agent' },
                    timestamp: new Date()
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    contactId: params.contactId,
                    noteAdded: true
                }
            };
        } catch (error) {
            console.error('[contact.add_relationship_note] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add note'
            };
        }
    },

    auditLogFormat(input, _output) {
        const preview = input.note.length > 50 ? input.note.substring(0, 50) + '...' : input.note;
        return {
            action: 'CONTACT_NOTE_ADD',
            summary: `Added relationship note: "${preview}"`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(addRelationshipNoteTool);
