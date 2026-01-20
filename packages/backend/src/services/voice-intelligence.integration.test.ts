import { describe, it, expect, beforeEach, vi } from 'vitest';
import { voiceNoteService } from './voice-note.service.js';
import prisma from '../config/database.js';
import { aiProcessingService } from './ai-processing.service.js';
import { agentOrchestrator } from './agent-orchestrator.service.js';
import { timelineService } from './timeline.service.js';

// Mock the database
vi.mock('../config/database.js', () => ({
    default: {
        voiceNote: {
            update: vi.fn(),
            findUnique: vi.fn(),
        },
        property: {
            findFirst: vi.fn(),
        },
    },
}));

// Mock the AI processing service
vi.mock('./ai-processing.service.js', () => ({
    aiProcessingService: {
        processMultimodalAudio: vi.fn(),
        transcribeAudio: vi.fn(),
    },
}));

// Mock the agent orchestrator
vi.mock('./agent-orchestrator.service.js', () => ({
    agentOrchestrator: {
        extractIntentsFromTranscript: vi.fn(),
    },
}));

// Mock the timeline service
vi.mock('./timeline.service.js', () => ({
    timelineService: {
        createTimelineEvent: vi.fn(),
    },
}));

// Mock fetching audio data
global.fetch = vi.fn() as any;

describe('Voice Intelligence Integration', () => {
    const userId = 'user-123';
    const voiceNoteId = 'vn-456';
    const propertyId = 'prop-789';
    const audioUrl = 'https://s3.amazonaws.com/zena-audio/vn-456.mp3';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should flow from voice recording to property timeline entry correctly', async () => {
        // 1. Setup DB mocks
        const mockVoiceNote = {
            id: voiceNoteId,
            userId,
            audioUrl,
            createdAt: new Date(),
        };
        (prisma.voiceNote.findUnique as any).mockResolvedValue(mockVoiceNote);
        (prisma.voiceNote.update as any).mockResolvedValue({ ...mockVoiceNote, processingStatus: 'completed' });

        const mockProperty = {
            id: propertyId,
            userId,
            address: '12 Ponsonby Road',
        };
        (prisma.property.findFirst as any).mockResolvedValue(mockProperty);

        // 2. Setup AI perception mock (G2.0)
        const mockPerceptionResult = {
            transcript: 'Speaker 0: Met with Sarah at 12 Ponsonby Road. Speaker 1: Yes, the kitchen is beautiful.',
            timelineSummary: 'Agent met with Sarah regarding 12 Ponsonby Road appraisal.',
            entities: {
                properties: [{ address: '12 Ponsonby Road' }],
                contacts: [{ name: 'Sarah' }],
                dates: [],
                actions: [],
                dealStage: 'qualified'
            }
        };
        (aiProcessingService.processMultimodalAudio as any).mockResolvedValue(mockPerceptionResult);

        // 3. Setup Agent Orchestrator mock (G3 reasoning)
        const mockProposedActions = [
            {
                type: 'proposed_action',
                toolName: 'property.update',
                label: 'Link to 12 Ponsonby Road',
                params: { address: '12 Ponsonby Road' },
                confidence: 0.98
            }
        ];
        (agentOrchestrator.extractIntentsFromTranscript as any).mockResolvedValue(mockProposedActions);

        // 4. Setup audio fetch mock
        (global.fetch as any).mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
            headers: { get: () => 'audio/mpeg' }
        });

        // 5. Execute processing
        const result = await voiceNoteService.processVoiceNote(voiceNoteId);

        // 6. Verifications

        // Check if property timeline event was created
        expect(timelineService.createTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
            entityType: 'property',
            entityId: propertyId,
            summary: mockPerceptionResult.timelineSummary,
            type: 'voice_note'
        }));

        // Check if main voice note timeline event was created
        expect(timelineService.createTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
            entityType: 'voice_note',
            entityId: voiceNoteId,
            summary: mockPerceptionResult.timelineSummary
        }));

        // Check final result
        expect(result.transcript).toBe(mockPerceptionResult.transcript);
        expect(result.timelineSummary).toBe(mockPerceptionResult.timelineSummary);
        expect(result.proposedActions).toHaveLength(1);
        expect(result.proposedActions[0].toolName).toBe('property.update');

        // Verify flat entity structure (prevents the 'undefined.length' crash)
        expect(Array.isArray(result.extractedEntities)).toBe(true);
        expect(result.extractedEntities).toContainEqual(expect.objectContaining({
            type: 'property',
            data: expect.objectContaining({ address: '12 Ponsonby Road' })
        }));
        expect(result.extractedEntities).toContainEqual(expect.objectContaining({
            type: 'contact',
            data: expect.objectContaining({ name: 'Sarah' })
        }));

        // Check DB status update
        expect(prisma.voiceNote.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: voiceNoteId },
            data: expect.objectContaining({
                processingStatus: 'completed'
            })
        }));
    });
});
