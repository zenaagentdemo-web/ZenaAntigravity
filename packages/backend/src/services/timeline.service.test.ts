import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { timelineService } from './timeline.service.js';

const prisma = new PrismaClient();
const testUserId = 'test-timeline-user-id';

describe('TimelineService', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
  });

  describe('createEvent', () => {
    it('should create a timeline event', async () => {
      const event = await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'test-thread-id',
        summary: 'Test email event',
        content: 'Test content',
        timestamp: new Date(),
      });

      expect(event).toBeDefined();
      expect(event.userId).toBe(testUserId);
      expect(event.type).toBe('email');
      expect(event.entityType).toBe('thread');
      expect(event.summary).toBe('Test email event');
    });
  });

  describe('createEmailEvent', () => {
    it('should create an email timeline event', async () => {
      const event = await timelineService.createEmailEvent(
        testUserId,
        'test-thread-id',
        'New email received',
        'Email content'
      );

      expect(event).toBeDefined();
      expect(event.type).toBe('email');
      expect(event.entityType).toBe('thread');
      expect(event.summary).toBe('New email received');
    });
  });

  describe('createManualNote', () => {
    it('should create a manual note timeline event', async () => {
      const event = await timelineService.createManualNote(
        testUserId,
        'deal',
        'test-deal-id',
        'Manual note summary',
        'Manual note content'
      );

      expect(event).toBeDefined();
      expect(event.type).toBe('note');
      expect(event.entityType).toBe('deal');
      expect(event.summary).toBe('Manual note summary');
      expect(event.content).toBe('Manual note content');
    });
  });

  describe('getEvents', () => {
    it('should return events in chronological order', async () => {
      // Create events with different timestamps
      const now = new Date();
      const event1 = await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'First event',
        timestamp: new Date(now.getTime() - 3000),
      });

      const event2 = await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Second event',
        timestamp: new Date(now.getTime() - 2000),
      });

      const event3 = await timelineService.createEvent({
        userId: testUserId,
        type: 'task',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Third event',
        timestamp: new Date(now.getTime() - 1000),
      });

      const events = await timelineService.getEvents({ userId: testUserId });

      expect(events).toHaveLength(3);
      expect(events[0].id).toBe(event1.id);
      expect(events[1].id).toBe(event2.id);
      expect(events[2].id).toBe(event3.id);

      // Verify chronological ordering
      expect(events[0].timestamp.getTime()).toBeLessThan(
        events[1].timestamp.getTime()
      );
      expect(events[1].timestamp.getTime()).toBeLessThan(
        events[2].timestamp.getTime()
      );
    });

    it('should filter events by entityType', async () => {
      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Thread event',
        timestamp: new Date(),
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'deal',
        entityId: 'deal-1',
        summary: 'Deal event',
        timestamp: new Date(),
      });

      const threadEvents = await timelineService.getEvents({
        userId: testUserId,
        entityType: 'thread',
      });

      expect(threadEvents).toHaveLength(1);
      expect(threadEvents[0].entityType).toBe('thread');
    });

    it('should filter events by entityId', async () => {
      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Thread 1 event',
        timestamp: new Date(),
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-2',
        summary: 'Thread 2 event',
        timestamp: new Date(),
      });

      const thread1Events = await timelineService.getEvents({
        userId: testUserId,
        entityId: 'thread-1',
      });

      expect(thread1Events).toHaveLength(1);
      expect(thread1Events[0].entityId).toBe('thread-1');
    });

    it('should filter events by type', async () => {
      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Email event',
        timestamp: new Date(),
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Note event',
        timestamp: new Date(),
      });

      const emailEvents = await timelineService.getEvents({
        userId: testUserId,
        type: 'email',
      });

      expect(emailEvents).toHaveLength(1);
      expect(emailEvents[0].type).toBe('email');
    });

    it('should filter events by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Old event',
        timestamp: yesterday,
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'thread',
        entityId: 'thread-1',
        summary: 'Recent event',
        timestamp: now,
      });

      const recentEvents = await timelineService.getEvents({
        userId: testUserId,
        startDate: new Date(now.getTime() - 1000),
      });

      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].summary).toBe('Recent event');
    });

    it('should respect limit parameter', async () => {
      // Create 5 events
      for (let i = 0; i < 5; i++) {
        await timelineService.createEvent({
          userId: testUserId,
          type: 'email',
          entityType: 'thread',
          entityId: 'thread-1',
          summary: `Event ${i}`,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      const events = await timelineService.getEvents({
        userId: testUserId,
        limit: 3,
      });

      expect(events).toHaveLength(3);
    });
  });

  describe('getEntityTimeline', () => {
    it('should return timeline for specific entity', async () => {
      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'deal',
        entityId: 'deal-1',
        summary: 'Deal event 1',
        timestamp: new Date(),
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'deal',
        entityId: 'deal-1',
        summary: 'Deal event 2',
        timestamp: new Date(),
      });

      await timelineService.createEvent({
        userId: testUserId,
        type: 'email',
        entityType: 'deal',
        entityId: 'deal-2',
        summary: 'Different deal event',
        timestamp: new Date(),
      });

      const deal1Timeline = await timelineService.getEntityTimeline(
        testUserId,
        'deal',
        'deal-1'
      );

      expect(deal1Timeline).toHaveLength(2);
      expect(deal1Timeline.every((e) => e.entityId === 'deal-1')).toBe(true);
    });
  });

  describe('updateEvent', () => {
    it('should update timeline event', async () => {
      const event = await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'deal',
        entityId: 'deal-1',
        summary: 'Original summary',
        timestamp: new Date(),
      });

      await timelineService.updateEvent(testUserId, event.id, {
        summary: 'Updated summary',
        content: 'Updated content',
      });

      const updated = await prisma.timelineEvent.findUnique({
        where: { id: event.id },
      });

      expect(updated?.summary).toBe('Updated summary');
      expect(updated?.content).toBe('Updated content');
    });
  });

  describe('deleteEvent', () => {
    it('should delete timeline event', async () => {
      const event = await timelineService.createEvent({
        userId: testUserId,
        type: 'note',
        entityType: 'deal',
        entityId: 'deal-1',
        summary: 'To be deleted',
        timestamp: new Date(),
      });

      await timelineService.deleteEvent(testUserId, event.id);

      const deleted = await prisma.timelineEvent.findUnique({
        where: { id: event.id },
      });

      expect(deleted).toBeNull();
    });
  });
});
