import prisma from '../config/database.js';

export interface TimelineEventInput {
  userId: string;
  type: 'email' | 'call' | 'meeting' | 'task' | 'note' | 'voice_note';
  entityType: 'thread' | 'contact' | 'property' | 'deal' | 'calendar_event' | 'voice_note';
  entityId: string;
  summary: string;
  content?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface TimelineQueryOptions {
  userId: string;
  entityType?: string;
  entityId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class TimelineService {
  /**
   * Create a timeline event
   */
  async createEvent(input: TimelineEventInput) {
    const event = await prisma.timelineEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        content: input.content,
        metadata: input.metadata || {},
        timestamp: input.timestamp,
      },
    });

    // If this is a contact event, trigger intelligence update
    if (input.entityType === 'contact') {
      const { aiProcessingService } = await import('./ai-processing.service.js');
      aiProcessingService.updateContactIntelligence(input.entityId).catch(err =>
        console.error(`Failed to update intelligence for contact ${input.entityId}:`, err)
      );
    }

    return event;
  }

  /**
   * Create a timeline event and return the ID
   */
  async createTimelineEvent(input: TimelineEventInput): Promise<string> {
    const event = await this.createEvent(input);
    return event.id;
  }

  /**
   * Create timeline event for email sent/received
   */
  async createEmailEvent(
    userId: string,
    threadId: string,
    summary: string,
    content?: string,
    metadata?: Record<string, any>
  ) {
    return await this.createEvent({
      userId,
      type: 'email',
      entityType: 'thread',
      entityId: threadId,
      summary,
      content,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Create timeline event for calendar event
   */
  async createCalendarEvent(
    userId: string,
    entityType: 'property' | 'contact' | 'deal',
    entityId: string,
    summary: string,
    content?: string,
    metadata?: Record<string, any>,
    timestamp?: Date
  ) {
    return await this.createEvent({
      userId,
      type: 'meeting',
      entityType,
      entityId,
      summary,
      content,
      metadata,
      timestamp: timestamp || new Date(),
    });
  }

  /**
   * Create timeline event for task
   */
  async createTaskEvent(
    userId: string,
    entityType: 'deal' | 'property' | 'contact',
    entityId: string,
    summary: string,
    content?: string,
    metadata?: Record<string, any>
  ) {
    return await this.createEvent({
      userId,
      type: 'task',
      entityType,
      entityId,
      summary,
      content,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Create timeline event for manual note
   */
  async createManualNote(
    userId: string,
    entityType: 'thread' | 'contact' | 'property' | 'deal',
    entityId: string,
    summary: string,
    content?: string,
    type: 'note' | 'voice_note' = 'note'
  ) {
    return await this.createEvent({
      userId,
      type,
      entityType,
      entityId,
      summary,
      content,
      timestamp: new Date(),
    });
  }

  /**
   * Create timeline event for voice note
   */
  async createVoiceNoteEvent(
    userId: string,
    entityType: 'thread' | 'contact' | 'property' | 'deal',
    entityId: string,
    summary: string,
    content?: string,
    metadata?: Record<string, any>
  ) {
    return await this.createEvent({
      userId,
      type: 'voice_note',
      entityType,
      entityId,
      summary,
      content,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Get timeline events with filters
   * Returns events in chronological order (oldest to newest by default)
   */
  async getEvents(options: TimelineQueryOptions) {
    const where: any = {
      userId: options.userId,
    };

    if (options.entityType) {
      where.entityType = options.entityType;
    }

    if (options.entityId) {
      where.entityId = options.entityId;
    }

    if (options.type) {
      where.type = options.type;
    }

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const events = await prisma.timelineEvent.findMany({
      where,
      orderBy: {
        timestamp: 'asc', // Chronological order
      },
      take: options.limit,
      skip: options.offset,
    });

    return events;
  }

  /**
   * Get timeline events for a specific entity
   */
  async getEntityTimeline(
    userId: string,
    entityType: string,
    entityId: string,
    limit?: number
  ) {
    return await this.getEvents({
      userId,
      entityType,
      entityId,
      limit,
    });
  }

  /**
   * Get all timeline events for a user
   */
  async getUserTimeline(userId: string, limit?: number, offset?: number) {
    return await this.getEvents({
      userId,
      limit,
      offset,
    });
  }

  /**
   * Delete timeline event
   */
  async deleteEvent(userId: string, eventId: string) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id: eventId, userId }
    });

    const result = await prisma.timelineEvent.deleteMany({
      where: {
        id: eventId,
        userId,
      },
    });

    if (event && event.entityType === 'contact') {
      const { aiProcessingService } = await import('./ai-processing.service.js');
      aiProcessingService.updateContactIntelligence(event.entityId).catch(err =>
        console.error(`Failed to update intelligence for contact ${event.entityId}:`, err)
      );
    }

    return result;
  }

  /**
   * Update timeline event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: {
      summary?: string;
      content?: string;
      metadata?: Record<string, any>;
      timestamp?: Date;
    }
  ) {
    console.log(`[TimelineService] Executing updateMany for eventId=${eventId}, userId=${userId}`);
    const result = await prisma.timelineEvent.updateMany({
      where: {
        id: eventId,
        userId,
      },
      data: updates,
    });
    console.log(`[TimelineService] updateMany result count:`, result.count);

    const event = await prisma.timelineEvent.findFirst({
      where: { id: eventId, userId }
    });
    console.log(`[TimelineService] Event after update:`, event ? { id: event.id, summary: event.summary, timestamp: event.timestamp } : 'NOT FOUND');

    if (event && event.entityType === 'contact') {
      const { aiProcessingService } = await import('./ai-processing.service.js');
      aiProcessingService.updateContactIntelligence(event.entityId).catch(err =>
        console.error(`Failed to update intelligence for contact ${event.entityId}:`, err)
      );
    }

    return result;
  }
}

export const timelineService = new TimelineService();
