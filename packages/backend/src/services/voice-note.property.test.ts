import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { voiceNoteService } from './voice-note.service.js';
import { aiProcessingService } from './ai-processing.service.js';
import prisma from '../config/database.js';

/**
 * Property-Based Tests for Voice Note Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Voice Note Property-Based Tests', () => {
  // Helper function to create a test user for each property-based test
  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `test-voicenote-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User VoiceNote PBT',
      },
    });
    return user.id;
  };

  // Helper function to clean up test user and related data
  const cleanupTestUser = async (userId: string): Promise<void> => {
    try {
      await prisma.timelineEvent.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.voiceNote.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe('Property 13: Voice note transcription', () => {
    it('should create voice note with pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['https'] }),
          async (audioUrl) => {
            const testUserId = await createTestUser();
            try {
              const voiceNoteId = await voiceNoteService.createVoiceNote(testUserId, audioUrl);
              expect(voiceNoteId).toBeTruthy();

              const voiceNote = await prisma.voiceNote.findUnique({ where: { id: voiceNoteId } });
              expect(voiceNote).toBeTruthy();
              expect(voiceNote?.userId).toBe(testUserId);
              expect(voiceNote?.audioUrl).toBe(audioUrl);
              expect(voiceNote?.processingStatus).toBe('pending');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 14/15: Transcript entity extraction and recording', () => {
    it('should process voice note and create tasks/timeline entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            transcript: fc.string({ minLength: 10 }).map(s => s.trim()).filter(s => s.length > 5),
            entities: fc.array(
              fc.record({
                type: fc.constantFrom('task', 'note'),
                data: fc.record({
                  label: fc.string({ minLength: 5 }),
                  content: fc.string({ minLength: 5 }),
                }),
                confidence: fc.float({ min: 0.5, max: 1 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ transcript, entities }) => {
            const testUserId = await createTestUser();
            try {
              const voiceNoteId = await voiceNoteService.createVoiceNote(testUserId, 'https://example.com/audio.mp3');

              // Mock transcribeAudio and aiProcessing
              vi.spyOn(voiceNoteService as any, 'transcribeAudio').mockResolvedValue(transcript);
              vi.spyOn(aiProcessingService, 'processWithLLM').mockResolvedValue(JSON.stringify(entities));

              const result = await voiceNoteService.processVoiceNote(voiceNoteId);

              expect(result.transcript).toBe(transcript);
              expect(result.voiceNoteId).toBe(voiceNoteId);

              // Check side-effects: timeline events
              // 1 for voice note + N for notes
              const noteCount = entities.filter(e => e.type === 'note').length;
              expect(result.createdTimelineEvents.length).toBe(1 + noteCount);

              // Check side-effects: tasks
              const taskCount = entities.filter(e => e.type === 'task').length;
              expect(result.createdTasks.length).toBe(taskCount);

              const voiceNote = await prisma.voiceNote.findUnique({ where: { id: voiceNoteId } });
              expect(voiceNote?.processingStatus).toBe('completed');
              expect(voiceNote?.transcript).toBe(transcript);
            } finally {
              vi.restoreAllMocks();
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
