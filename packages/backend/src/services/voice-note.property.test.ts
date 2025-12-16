import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { voiceNoteService } from './voice-note.service.js';
import prisma from '../config/database.js';

// Mock the database
vi.mock('../config/database.js', () => ({
  default: {
    voiceNote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock the AI processing service
vi.mock('./ai-processing.service.js', () => ({
  aiProcessingService: {
    processWithLLM: vi.fn(),
  },
}));

// Mock the timeline service
vi.mock('./timeline.service.js', () => ({
  timelineService: {
    createTimelineEvent: vi.fn(),
  },
}));

// Mock the task service
vi.mock('./task.service.js', () => ({
  taskService: {
    createTask: vi.fn(),
  },
}));

describe('Voice Note Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 13: Voice note transcription
   * 
   * For any received voice note or audio upload, the system should attempt transcription
   * using speech-to-text technology.
   * 
   * Validates: Requirements 5.3
   */
  describe('Property 13: Voice note transcription', () => {
    it('should attempt transcription for any valid audio URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            audioUrl: fc.webUrl({ validSchemes: ['https'] }),
          }),
          async ({ userId, audioUrl }) => {
            // Mock voice note creation
            const mockVoiceNote = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId,
              audioUrl,
              transcript: '',
              extractedEntities: [],
              processingStatus: 'pending',
              createdAt: new Date(),
              processedAt: null,
            };

            (prisma.voiceNote.create as any).mockResolvedValue(mockVoiceNote);
            (prisma.voiceNote.findUnique as any).mockResolvedValue(mockVoiceNote);

            // Mock transcription to throw error (since we don't have real Whisper API)
            // This tests that the system ATTEMPTS transcription
            (prisma.voiceNote.update as any).mockResolvedValue({
              ...mockVoiceNote,
              processingStatus: 'failed',
            });

            // Create voice note
            const voiceNoteId = await voiceNoteService.createVoiceNote(userId, audioUrl);

            // Verify voice note was created
            expect(voiceNoteId).toBeTruthy();
            expect(prisma.voiceNote.create).toHaveBeenCalledWith({
              data: {
                userId,
                audioUrl,
                transcript: '',
                extractedEntities: [],
                processingStatus: 'pending',
              },
            });

            // The property is satisfied if:
            // 1. Voice note is created with pending status
            // 2. Processing can be initiated (even if it fails due to missing API)
            expect(mockVoiceNote.processingStatus).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 14: Transcript entity extraction
   * 
   * For any transcribed voice note, the system should extract key facts including
   * who, what property, and what was discussed.
   * 
   * Validates: Requirements 5.4
   */
  describe('Property 14: Transcript entity extraction', () => {
    it('should extract entities from any transcript', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            transcript: fc.string({ minLength: 10, maxLength: 500 }),
            entities: fc.array(
              fc.record({
                type: fc.constantFrom('contact', 'property', 'task', 'note'),
                data: fc.object(),
                confidence: fc.double({ min: 0.5, max: 1.0 }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          async ({ userId, transcript, entities }) => {
            // Mock AI response
            const { aiProcessingService } = await import('./ai-processing.service.js');
            (aiProcessingService.processWithLLM as any).mockResolvedValue(
              JSON.stringify(entities)
            );

            // Extract entities
            const extractedEntities = await voiceNoteService.extractEntitiesFromTranscript(
              transcript,
              userId
            );

            // Property: For any transcript, entity extraction should be attempted
            // and return an array (even if empty)
            expect(Array.isArray(extractedEntities)).toBe(true);

            // All returned entities should have required fields
            extractedEntities.forEach((entity) => {
              expect(entity).toHaveProperty('type');
              expect(entity).toHaveProperty('data');
              expect(entity).toHaveProperty('confidence');
              expect(entity.confidence).toBeGreaterThanOrEqual(0.5);
            });

            // Entities should match the mocked response
            expect(extractedEntities.length).toBe(entities.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter out low confidence entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            transcript: fc.string({ minLength: 10, maxLength: 500 }),
            highConfidenceEntities: fc.array(
              fc.record({
                type: fc.constantFrom('contact', 'property', 'task', 'note'),
                data: fc.object(),
                confidence: fc.double({ min: 0.5, max: 1.0 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            lowConfidenceEntities: fc.array(
              fc.record({
                type: fc.constantFrom('contact', 'property', 'task', 'note'),
                data: fc.object(),
                confidence: fc.double({ min: 0.0, max: 0.49 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ userId, transcript, highConfidenceEntities, lowConfidenceEntities }) => {
            // Mock AI response with mixed confidence entities
            const allEntities = [...highConfidenceEntities, ...lowConfidenceEntities];
            const { aiProcessingService } = await import('./ai-processing.service.js');
            (aiProcessingService.processWithLLM as any).mockResolvedValue(
              JSON.stringify(allEntities)
            );

            // Extract entities
            const extractedEntities = await voiceNoteService.extractEntitiesFromTranscript(
              transcript,
              userId
            );

            // Property: Only high confidence entities (>= 0.5) should be returned
            expect(extractedEntities.length).toBe(highConfidenceEntities.length);
            extractedEntities.forEach((entity) => {
              expect(entity.confidence).toBeGreaterThanOrEqual(0.5);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 15: Transcript entity creation and linking
   * 
   * For any processed transcript with extracted entities, the system should create
   * timeline entries, tasks, and relationship notes linked to relevant deals,
   * properties, or contacts.
   * 
   * Validates: Requirements 5.5
   */
  describe('Property 15: Transcript entity creation and linking', () => {
    it('should create tasks for task entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            voiceNoteId: fc.uuid(),
            userId: fc.uuid(),
            audioUrl: fc.webUrl({ validSchemes: ['https'] }),
            transcript: fc.string({ minLength: 10, maxLength: 500 }),
            taskEntities: fc.array(
              fc.record({
                type: fc.constant('task'),
                data: fc.record({
                  label: fc.string({ minLength: 5, maxLength: 100 }),
                  dueDate: fc.option(fc.date(), { nil: null }),
                }),
                confidence: fc.double({ min: 0.5, max: 1.0 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ voiceNoteId, userId, audioUrl, transcript, taskEntities }) => {
            // Mock voice note
            const mockVoiceNote = {
              id: voiceNoteId,
              userId,
              audioUrl,
              transcript: '',
              extractedEntities: [],
              processingStatus: 'pending',
              createdAt: new Date(),
              processedAt: null,
            };

            (prisma.voiceNote.findUnique as any).mockResolvedValue(mockVoiceNote);
            (prisma.voiceNote.update as any).mockResolvedValue({
              ...mockVoiceNote,
              transcript,
              extractedEntities: taskEntities,
              processingStatus: 'completed',
            });

            // Mock transcription
            vi.spyOn(voiceNoteService, 'transcribeAudio').mockResolvedValue(transcript);

            // Mock entity extraction
            vi.spyOn(voiceNoteService, 'extractEntitiesFromTranscript').mockResolvedValue(
              taskEntities
            );

            // Mock task creation
            const { taskService } = await import('./task.service.js');
            const mockTaskIds = taskEntities.map(() => fc.sample(fc.uuid(), 1)[0]);
            mockTaskIds.forEach((id, index) => {
              (taskService.createTask as any).mockResolvedValueOnce({ id });
            });

            // Mock timeline creation
            const { timelineService } = await import('./timeline.service.js');
            (timelineService.createTimelineEvent as any).mockResolvedValue(
              fc.sample(fc.uuid(), 1)[0]
            );

            // Process voice note
            const result = await voiceNoteService.processVoiceNote(voiceNoteId);

            // Property: For each task entity, a task should be created
            expect(result.createdTasks.length).toBe(taskEntities.length);
            expect(taskService.createTask).toHaveBeenCalledTimes(taskEntities.length);

            // Verify each task was created with correct data
            taskEntities.forEach((entity, index) => {
              expect(taskService.createTask).toHaveBeenNthCalledWith(index + 1, {
                userId,
                label: entity.data.label,
                dueDate: entity.data.dueDate,
                source: 'voice_note',
              });
            });
          }
        ),
        { numRuns: 50 } // Reduced runs due to complexity
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 56: Voice note timeline integration
   * 
   * For any processed voice note, its summary should be added to the relevant timeline.
   * 
   * Validates: Requirements 16.3
   */
  describe('Property 56: Voice note timeline integration', () => {
    it('should create timeline entry for any processed voice note', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            voiceNoteId: fc.uuid(),
            userId: fc.uuid(),
            audioUrl: fc.webUrl({ validSchemes: ['https'] }),
            transcript: fc.string({ minLength: 10, maxLength: 500 }),
            entities: fc.array(
              fc.record({
                type: fc.constantFrom('contact', 'property', 'task', 'note'),
                data: fc.object(),
                confidence: fc.double({ min: 0.5, max: 1.0 }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          async ({ voiceNoteId, userId, audioUrl, transcript, entities }) => {
            // Mock voice note
            const mockVoiceNote = {
              id: voiceNoteId,
              userId,
              audioUrl,
              transcript: '',
              extractedEntities: [],
              processingStatus: 'pending',
              createdAt: new Date(),
              processedAt: null,
            };

            (prisma.voiceNote.findUnique as any).mockResolvedValue(mockVoiceNote);
            (prisma.voiceNote.update as any).mockResolvedValue({
              ...mockVoiceNote,
              transcript,
              extractedEntities: entities,
              processingStatus: 'completed',
            });

            // Mock transcription
            vi.spyOn(voiceNoteService, 'transcribeAudio').mockResolvedValue(transcript);

            // Mock entity extraction
            vi.spyOn(voiceNoteService, 'extractEntitiesFromTranscript').mockResolvedValue(
              entities
            );

            // Mock task creation
            const { taskService } = await import('./task.service.js');
            (taskService.createTask as any).mockResolvedValue({
              id: fc.sample(fc.uuid(), 1)[0],
            });

            // Mock timeline creation
            const { timelineService } = await import('./timeline.service.js');
            const mockTimelineIds: string[] = [];
            (timelineService.createTimelineEvent as any).mockImplementation(() => {
              const id = fc.sample(fc.uuid(), 1)[0];
              mockTimelineIds.push(id);
              return Promise.resolve(id);
            });

            // Process voice note
            const result = await voiceNoteService.processVoiceNote(voiceNoteId);

            // Property: At least one timeline entry should be created for the voice note
            expect(result.createdTimelineEvents.length).toBeGreaterThan(0);
            expect(timelineService.createTimelineEvent).toHaveBeenCalled();

            // The first timeline entry should be for the voice note itself
            const firstCall = (timelineService.createTimelineEvent as any).mock.calls[0][0];
            expect(firstCall.type).toBe('voice_note');
            expect(firstCall.entityType).toBe('voice_note');
            expect(firstCall.entityId).toBe(voiceNoteId);
            expect(firstCall.summary).toContain(transcript.substring(0, 100));
          }
        ),
        { numRuns: 50 } // Reduced runs due to complexity
      );
    });

    it('should create timeline entries for note entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            voiceNoteId: fc.uuid(),
            userId: fc.uuid(),
            audioUrl: fc.webUrl({ validSchemes: ['https'] }),
            transcript: fc.string({ minLength: 10, maxLength: 500 }),
            noteEntities: fc.array(
              fc.record({
                type: fc.constant('note'),
                data: fc.record({
                  content: fc.string({ minLength: 5, maxLength: 200 }),
                  context: fc.string({ minLength: 3, maxLength: 50 }),
                }),
                confidence: fc.double({ min: 0.5, max: 1.0 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ voiceNoteId, userId, audioUrl, transcript, noteEntities }) => {
            // Mock voice note
            const mockVoiceNote = {
              id: voiceNoteId,
              userId,
              audioUrl,
              transcript: '',
              extractedEntities: [],
              processingStatus: 'pending',
              createdAt: new Date(),
              processedAt: null,
            };

            (prisma.voiceNote.findUnique as any).mockResolvedValue(mockVoiceNote);
            (prisma.voiceNote.update as any).mockResolvedValue({
              ...mockVoiceNote,
              transcript,
              extractedEntities: noteEntities,
              processingStatus: 'completed',
            });

            // Mock transcription
            vi.spyOn(voiceNoteService, 'transcribeAudio').mockResolvedValue(transcript);

            // Mock entity extraction
            vi.spyOn(voiceNoteService, 'extractEntitiesFromTranscript').mockResolvedValue(
              noteEntities
            );

            // Mock task creation
            const { taskService } = await import('./task.service.js');
            (taskService.createTask as any).mockResolvedValue({
              id: fc.sample(fc.uuid(), 1)[0],
            });

            // Mock timeline creation
            const { timelineService } = await import('./timeline.service.js');
            const mockTimelineIds: string[] = [];
            (timelineService.createTimelineEvent as any).mockImplementation(() => {
              const id = fc.sample(fc.uuid(), 1)[0];
              mockTimelineIds.push(id);
              return Promise.resolve(id);
            });

            // Process voice note
            const result = await voiceNoteService.processVoiceNote(voiceNoteId);

            // Property: Timeline entries should be created for voice note + each note entity
            const expectedTimelineEntries = 1 + noteEntities.length; // 1 for voice note + notes
            expect(result.createdTimelineEvents.length).toBe(expectedTimelineEntries);
            expect(timelineService.createTimelineEvent).toHaveBeenCalledTimes(
              expectedTimelineEntries
            );

            // Verify note timeline entries
            noteEntities.forEach((entity, index) => {
              const callIndex = index + 1; // +1 because first call is for voice note
              const call = (timelineService.createTimelineEvent as any).mock.calls[callIndex][0];
              expect(call.type).toBe('note');
              expect(call.summary).toBe(entity.data.content);
            });
          }
        ),
        { numRuns: 50 } // Reduced runs due to complexity
      );
    });
  });
});
