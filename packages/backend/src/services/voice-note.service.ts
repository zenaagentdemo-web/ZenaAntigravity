import prisma from '../config/database.js';
import { aiProcessingService } from './ai-processing.service.js';
import { timelineService } from './timeline.service.js';
import { taskService } from './task.service.js';
import { agentOrchestrator } from './agent-orchestrator.service.js';
import { logger } from './logger.service.js';

interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}

interface VoiceNoteProcessingResult {
  voiceNoteId: string;
  transcript: string;
  timelineSummary?: string;
  extractedEntities: ExtractedEntity[];
  proposedActions: any[];
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
  /**
   * Transcribe audio using Gemini Multimodal
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      let audioData: string;
      let mimeType = 'audio/mpeg';

      if (audioUrl.startsWith('data:')) {
        // Handle data URI
        const [header, base64] = audioUrl.split(',');
        audioData = base64;
        mimeType = header.split(':')[1].split(';')[0];
      } else if (audioUrl.startsWith('http')) {
        // Fetch remote URL
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        audioData = Buffer.from(buffer).toString('base64');
        mimeType = response.headers.get('content-type') || 'audio/mpeg';
      } else if (process.env.NODE_ENV === 'test' || audioUrl.includes('placeholder')) {
        // Mock transcription for testing/placeholders
        return "I need to follow up with Sarah about the 12 Ponsonby Road appraisal next Tuesday.";
      } else {
        throw new Error('Unsupported audio URL format');
      }

      // Use AI Processing Service to transcribe
      return await aiProcessingService.transcribeAudio(audioData, mimeType);
    } catch (error) {
      console.error('[VoiceNoteService] Transcription failed:', error);
      // Fallback for demo/dev if API fails
      if (process.env.NODE_ENV !== 'production') {
        return "Manual transcript fallback: Follow up with client regarding property viewing.";
      }
      throw error;
    }
  }

  /**
   * Flatten categorized entities into a single array for frontend display
   */
  private flattenEntities(entities: any): ExtractedEntity[] {
    const flattened: ExtractedEntity[] = [];
    if (!entities) return flattened;

    if (entities.contacts && Array.isArray(entities.contacts)) {
      entities.contacts.forEach((c: any) => flattened.push({
        type: 'contact',
        data: c,
        confidence: c.confidence || 0.8
      }));
    }

    if (entities.properties && Array.isArray(entities.properties)) {
      entities.properties.forEach((p: any) => flattened.push({
        type: 'property',
        data: p,
        confidence: p.confidence || 0.8
      }));
    }

    if (entities.actions && Array.isArray(entities.actions)) {
      entities.actions.forEach((a: any) => flattened.push({
        type: 'task',
        data: { label: a.action || a.label, dueDate: a.dueDate },
        confidence: a.confidence || 0.8
      }));
    }

    if (entities.dates && Array.isArray(entities.dates)) {
      entities.dates.forEach((d: any) => flattened.push({
        type: 'note',
        data: { content: `${d.type}: ${d.description}`, date: d.date },
        confidence: d.confidence || 0.8
      }));
    }

    return flattened;
  }

  /**
   * Extract entities from transcript using AI
   */
  async extractEntitiesFromTranscript(
    transcript: string,
    userId: string
  ): Promise<ExtractedEntity[]> {
    const extractionPrompt = `
You are analyzing a voice note from a real estate agent in New Zealand. Extract the following information:

1. Contacts mentioned (names, roles like buyer/vendor/lawyer)
2. Property addresses mentioned
3. Tasks or action items mentioned (Extract labels and normalize due dates to ISO format if possible)
4. Important notes or observations

Voice note transcript:
${transcript}

Current Date: ${new Date().toISOString()}

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
    "data": { "label": "Follow up with John about viewing", "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ" },
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

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      // Parse the JSON response
      const entities = JSON.parse(jsonString);

      // Validate and filter entities
      return entities.filter((entity: any) =>
        entity.type && entity.data && entity.confidence >= 0.5
      );
    } catch (error) {
      console.error('Error extracting entities from transcript:', error);
      // Fallback for demo/dev if API fails
      if (process.env.NODE_ENV !== 'production') {
        return [
          {
            type: 'task',
            data: { label: 'Follow up regarding property viewing', dueDate: new Date(Date.now() + 86400000).toISOString() },
            confidence: 0.9
          },
          {
            type: 'note',
            data: { content: 'Client interested in the layout', context: 'viewing' },
            confidence: 0.8
          }
        ];
      }
      return [];
    }
  }

  /**
   * Orchestrate voice note processing using the Duo-Model pipeline
   */
  async processVoiceNote(voiceNoteId: string): Promise<VoiceNoteProcessingResult> {
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

      // Step 1: PERCEPTION LAYER (Gemini 2.0 Flash)
      // Fetch audio data
      let audioData: string;
      let mimeType = 'audio/mpeg';

      if (voiceNote.audioUrl.startsWith('data:')) {
        const [header, base64] = voiceNote.audioUrl.split(',');
        audioData = base64;
        mimeType = header.split(':')[1].split(';')[0];
      } else {
        const response = await fetch(voiceNote.audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        audioData = Buffer.from(buffer).toString('base64');
        mimeType = response.headers.get('content-type') || 'audio/mpeg';
      }

      const perceptionResult = await aiProcessingService.processMultimodalAudio(audioData, mimeType);
      const transcript = perceptionResult.transcript || '';
      const timelineSummary = perceptionResult.timelineSummary || 'Voice note recorded';
      const entities = this.flattenEntities(perceptionResult.entities || {});

      // Step 2: REASONING LAYER (Gemini 3 Flash via Agent Orchestrator)
      const proposedActions = await agentOrchestrator.extractIntentsFromTranscript(
        voiceNote.userId,
        transcript,
        timelineSummary
      );

      // Step 3: CRM AUTOMATION - Property Timeline Summary
      const createdTimelineEvents: string[] = [];
      const linkToPropertyAction = proposedActions.find(a => a.toolName === 'property.update' || a.label.toLowerCase().includes('property'));

      // If we have a property mention, create a timeline event for it
      const propertyEntity = entities.find(e => e.type === 'property')?.data;
      if (propertyEntity || linkToPropertyAction) {
        const address = propertyEntity?.address || linkToPropertyAction?.params?.address;

        // Find property ID by address if possible
        const property = await prisma.property.findFirst({
          where: {
            userId: voiceNote.userId,
            address: { contains: address, mode: 'insensitive' }
          }
        });

        if (property) {
          const timelineId = await timelineService.createTimelineEvent({
            userId: voiceNote.userId,
            type: 'voice_note',
            entityType: 'property',
            entityId: property.id,
            summary: timelineSummary,
            content: transcript,
            metadata: { voiceNoteId, diarized: true },
            timestamp: new Date(),
          });
          createdTimelineEvents.push(timelineId);
          logger.info(`[VoiceNoteService] Automated timeline entry for property: ${property.address}`);
        }
      }

      // General voice note timeline event
      const mainTimelineId = await timelineService.createTimelineEvent({
        userId: voiceNote.userId,
        type: 'voice_note',
        entityType: 'voice_note',
        entityId: voiceNoteId,
        summary: timelineSummary,
        content: transcript,
        metadata: { entities, proposedActions },
        timestamp: voiceNote.createdAt,
      });
      createdTimelineEvents.push(mainTimelineId);

      // Simple Task Creation (Legacy support)
      const createdTasks: string[] = [];
      for (const action of proposedActions) {
        if (action.toolName === 'task.create') {
          const task = await taskService.createTask({
            userId: voiceNote.userId,
            label: action.params?.label || action.label,
            dueDate: action.params?.dueDate,
            source: 'voice_note',
          });
          createdTasks.push(task.id);
        }
      }

      await prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: {
          transcript,
          extractedEntities: entities as any,
          processingStatus: 'completed',
          processedAt: new Date(),
          // Note: We'd ideally have a dedicated field for timelineSummary and proposedActions
          // For now, we'll store them in metadata or the transcript field temporarily if needed
          // or just return them to the caller to handle DB updates if schema isn't ready.
        },
      });

      return {
        voiceNoteId,
        transcript,
        timelineSummary,
        extractedEntities: entities as any,
        proposedActions,
        createdTasks,
        createdTimelineEvents,
      };
    } catch (error) {
      logger.error(`[VoiceNoteService] Failed to process voice note ${voiceNoteId}:`, error);
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
