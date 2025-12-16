import prisma from '../config/database.js';
import { aiProcessingService } from './ai-processing.service.js';
import { timelineService } from './timeline.service.js';
import { taskService } from './task.service.js';

interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}

interface VoiceNoteProcessingResult {
  voiceNoteId: string;
  transcript: string;
  extractedEntities: ExtractedEntity[];
  createdTasks: string[];
  createdTimelineEvents: string[];
}

/**
 * Service for processing voice notes
 */
class VoiceNoteService {
  /**
   * Create a new voice note record
   */
  async createVoiceNote(userId: string, audioUrl: string): Promise<string> {
    const voiceNote = await prisma.voiceNote.create({
      data: {
        userId,
        audioUrl,
        transcript: '', // Will be filled after transcription
        extractedEntities: [],
        processingStatus: 'pending',
      },
    });

    return voiceNote.id;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    // TODO: Implement actual OpenAI Whisper API call
    // For now, this is a placeholder that would need:
    // 1. Fetch audio file from S3/storage
    // 2. Send to OpenAI Whisper API
    // 3. Return transcript
    
    // Placeholder implementation
    throw new Error('Whisper API integration not yet implemented. Requires OpenAI API key and audio file handling.');
  }

  /**
   * Extract entities from transcript using AI
   */
  async extractEntitiesFromTranscript(
    transcript: string,
    userId: string
  ): Promise<ExtractedEntity[]> {
    const extractionPrompt = `
You are analyzing a voice note from a real estate agent. Extract the following information:

1. Contacts mentioned (names, roles like buyer/vendor/lawyer)
2. Property addresses mentioned
3. Tasks or action items mentioned
4. Important notes or observations

Voice note transcript:
${transcript}

Return a JSON array of extracted entities in this format:
[
  {
    "type": "contact",
    "data": { "name": "John Smith", "role": "buyer", "context": "interested in property" },
    "confidence": 0.9
  },
  {
    "type": "property",
    "data": { "address": "123 Main St", "context": "viewing scheduled" },
    "confidence": 0.85
  },
  {
    "type": "task",
    "data": { "label": "Follow up with John about viewing", "dueDate": null },
    "confidence": 0.8
  },
  {
    "type": "note",
    "data": { "content": "Buyer seemed very interested in the kitchen", "context": "property feedback" },
    "confidence": 0.75
  }
]
`;

    try {
      const response = await aiProcessingService.processWithLLM(extractionPrompt);
      
      // Parse the JSON response
      const entities = JSON.parse(response);
      
      // Validate and filter entities
      return entities.filter((entity: any) => 
        entity.type && entity.data && entity.confidence >= 0.5
      );
    } catch (error) {
      console.error('Error extracting entities from transcript:', error);
      return [];
    }
  }

  /**
   * Process a voice note: transcribe and extract entities
   */
  async processVoiceNote(voiceNoteId: string): Promise<VoiceNoteProcessingResult> {
    // Update status to processing
    await prisma.voiceNote.update({
      where: { id: voiceNoteId },
      data: { processingStatus: 'processing' },
    });

    try {
      const voiceNote = await prisma.voiceNote.findUnique({
        where: { id: voiceNoteId },
      });

      if (!voiceNote) {
        throw new Error('Voice note not found');
      }

      // Step 1: Transcribe audio
      const transcript = await this.transcribeAudio(voiceNote.audioUrl);

      // Step 2: Extract entities from transcript
      const extractedEntities = await this.extractEntitiesFromTranscript(
        transcript,
        voiceNote.userId
      );

      // Step 3: Create tasks from extracted task entities
      const createdTasks: string[] = [];
      for (const entity of extractedEntities) {
        if (entity.type === 'task') {
          const task = await taskService.createTask({
            userId: voiceNote.userId,
            label: entity.data.label,
            dueDate: entity.data.dueDate,
            source: 'voice_note',
          });
          createdTasks.push(task.id);
        }
      }

      // Step 4: Create timeline entry for the voice note
      const timelineEventId = await timelineService.createTimelineEvent({
        userId: voiceNote.userId,
        type: 'voice_note',
        entityType: 'voice_note',
        entityId: voiceNoteId,
        summary: `Voice note: ${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}`,
        content: transcript,
        metadata: { extractedEntities },
        timestamp: voiceNote.createdAt,
      });

      // Step 5: Create timeline entries for notes
      const createdTimelineEvents: string[] = [timelineEventId];
      for (const entity of extractedEntities) {
        if (entity.type === 'note') {
          const noteEventId = await timelineService.createTimelineEvent({
            userId: voiceNote.userId,
            type: 'note',
            entityType: 'voice_note',
            entityId: voiceNoteId,
            summary: entity.data.content,
            content: entity.data.content,
            metadata: { source: 'voice_note', context: entity.data.context },
            timestamp: new Date(),
          });
          createdTimelineEvents.push(noteEventId);
        }
      }

      // Step 6: Update voice note with results
      await prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: {
          transcript,
          extractedEntities,
          processingStatus: 'completed',
          processedAt: new Date(),
        },
      });

      return {
        voiceNoteId,
        transcript,
        extractedEntities,
        createdTasks,
        createdTimelineEvents,
      };
    } catch (error) {
      // Mark as failed
      await prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: { processingStatus: 'failed' },
      });

      throw error;
    }
  }

  /**
   * Get voice note by ID
   */
  async getVoiceNote(voiceNoteId: string, userId: string) {
    const voiceNote = await prisma.voiceNote.findFirst({
      where: {
        id: voiceNoteId,
        userId,
      },
    });

    if (!voiceNote) {
      throw new Error('Voice note not found');
    }

    return voiceNote;
  }

  /**
   * Get all voice notes for a user
   */
  async getVoiceNotes(userId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };

    if (filters?.status) {
      where.processingStatus = filters.status;
    }

    const voiceNotes = await prisma.voiceNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return voiceNotes;
  }
}

export const voiceNoteService = new VoiceNoteService();
