import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('VoiceNoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVoiceNote', () => {
    it('should create a voice note with pending status', async () => {
      const mockVoiceNote = {
        id: 'voice-note-1',
        userId: 'user-1',
        audioUrl: 'https://example.com/audio.mp3',
        transcript: '',
        extractedEntities: [],
        processingStatus: 'pending',
        createdAt: new Date(),
        processedAt: null,
      };

      (prisma.voiceNote.create as any).mockResolvedValue(mockVoiceNote);

      const voiceNoteId = await voiceNoteService.createVoiceNote(
        'user-1',
        'https://example.com/audio.mp3'
      );

      expect(voiceNoteId).toBe('voice-note-1');
      expect(prisma.voiceNote.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          audioUrl: 'https://example.com/audio.mp3',
          transcript: '',
          extractedEntities: [],
          processingStatus: 'pending',
        },
      });
    });
  });

  describe('getVoiceNote', () => {
    it('should retrieve a voice note by ID', async () => {
      const mockVoiceNote = {
        id: 'voice-note-1',
        userId: 'user-1',
        audioUrl: 'https://example.com/audio.mp3',
        transcript: 'Test transcript',
        extractedEntities: [],
        processingStatus: 'completed',
        createdAt: new Date(),
        processedAt: new Date(),
      };

      (prisma.voiceNote.findFirst as any).mockResolvedValue(mockVoiceNote);

      const voiceNote = await voiceNoteService.getVoiceNote('voice-note-1', 'user-1');

      expect(voiceNote).toEqual(mockVoiceNote);
      expect(prisma.voiceNote.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'voice-note-1',
          userId: 'user-1',
        },
      });
    });

    it('should throw error if voice note not found', async () => {
      (prisma.voiceNote.findFirst as any).mockResolvedValue(null);

      await expect(
        voiceNoteService.getVoiceNote('voice-note-1', 'user-1')
      ).rejects.toThrow('Voice note not found');
    });
  });

  describe('getVoiceNotes', () => {
    it('should retrieve all voice notes for a user', async () => {
      const mockVoiceNotes = [
        {
          id: 'voice-note-1',
          userId: 'user-1',
          audioUrl: 'https://example.com/audio1.mp3',
          transcript: 'Test transcript 1',
          extractedEntities: [],
          processingStatus: 'completed',
          createdAt: new Date(),
          processedAt: new Date(),
        },
        {
          id: 'voice-note-2',
          userId: 'user-1',
          audioUrl: 'https://example.com/audio2.mp3',
          transcript: 'Test transcript 2',
          extractedEntities: [],
          processingStatus: 'completed',
          createdAt: new Date(),
          processedAt: new Date(),
        },
      ];

      (prisma.voiceNote.findMany as any).mockResolvedValue(mockVoiceNotes);

      const voiceNotes = await voiceNoteService.getVoiceNotes('user-1');

      expect(voiceNotes).toEqual(mockVoiceNotes);
      expect(prisma.voiceNote.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter voice notes by status', async () => {
      const mockVoiceNotes = [
        {
          id: 'voice-note-1',
          userId: 'user-1',
          audioUrl: 'https://example.com/audio1.mp3',
          transcript: '',
          extractedEntities: [],
          processingStatus: 'pending',
          createdAt: new Date(),
          processedAt: null,
        },
      ];

      (prisma.voiceNote.findMany as any).mockResolvedValue(mockVoiceNotes);

      const voiceNotes = await voiceNoteService.getVoiceNotes('user-1', {
        status: 'pending',
      });

      expect(voiceNotes).toEqual(mockVoiceNotes);
      expect(prisma.voiceNote.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', processingStatus: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('extractEntitiesFromTranscript', () => {
    it('should extract entities from transcript using AI', async () => {
      const mockResponse = JSON.stringify([
        {
          type: 'contact',
          data: { name: 'John Smith', role: 'buyer' },
          confidence: 0.9,
        },
        {
          type: 'property',
          data: { address: '123 Main St' },
          confidence: 0.85,
        },
        {
          type: 'task',
          data: { label: 'Follow up with John' },
          confidence: 0.8,
        },
      ]);

      const { aiProcessingService } = await import('./ai-processing.service.js');
      (aiProcessingService.processWithLLM as any).mockResolvedValue(mockResponse);

      const entities = await voiceNoteService.extractEntitiesFromTranscript(
        'Met with John Smith about 123 Main St. Need to follow up.',
        'user-1'
      );

      expect(entities).toHaveLength(3);
      expect(entities[0].type).toBe('contact');
      expect(entities[1].type).toBe('property');
      expect(entities[2].type).toBe('task');
    });

    it('should filter out low confidence entities', async () => {
      const mockResponse = JSON.stringify([
        {
          type: 'contact',
          data: { name: 'John Smith', role: 'buyer' },
          confidence: 0.9,
        },
        {
          type: 'property',
          data: { address: '123 Main St' },
          confidence: 0.3, // Low confidence
        },
      ]);

      const { aiProcessingService } = await import('./ai-processing.service.js');
      (aiProcessingService.processWithLLM as any).mockResolvedValue(mockResponse);

      const entities = await voiceNoteService.extractEntitiesFromTranscript(
        'Met with John Smith about 123 Main St.',
        'user-1'
      );

      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('contact');
    });

    it('should return empty array on AI processing error', async () => {
      const { aiProcessingService } = await import('./ai-processing.service.js');
      (aiProcessingService.processWithLLM as any).mockRejectedValue(
        new Error('AI processing failed')
      );

      const entities = await voiceNoteService.extractEntitiesFromTranscript(
        'Test transcript',
        'user-1'
      );

      expect(entities).toEqual([]);
    });
  });
});
