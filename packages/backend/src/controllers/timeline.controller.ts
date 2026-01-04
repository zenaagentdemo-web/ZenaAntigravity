import { Request, Response } from 'express';
import { timelineService } from '../services/timeline.service.js';

/**
 * Get timeline events with filters
 * GET /api/timeline
 * Query params:
 * - entityType: filter by entity type (thread, contact, property, deal, calendar_event)
 * - entityId: filter by specific entity ID
 * - type: filter by event type (email, call, meeting, task, note, voice_note)
 * - startDate: filter events after this date
 * - endDate: filter events before this date
 * - limit: max number of events to return
 * - offset: pagination offset
 */
export async function getTimeline(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      entityType,
      entityId,
      type,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const options: any = {
      userId,
    };

    if (entityType) {
      options.entityType = entityType as string;
    }

    if (entityId) {
      options.entityId = entityId as string;
    }

    if (type) {
      options.type = type as string;
    }

    if (startDate) {
      options.startDate = new Date(startDate as string);
    }

    if (endDate) {
      options.endDate = new Date(endDate as string);
    }

    if (limit) {
      options.limit = parseInt(limit as string, 10);
    }

    if (offset) {
      options.offset = parseInt(offset as string, 10);
    }

    const events = await timelineService.getEvents(options);

    res.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a manual note in the timeline
 * POST /api/timeline/notes
 * Body:
 * - entityType: thread | contact | property | deal
 * - entityId: ID of the entity
 * - summary: brief summary of the note
 * - content: full note content (optional)
 */
export async function createManualNote(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityType, entityId, summary, content, type } = req.body;

    // Validate required fields
    if (!entityType || !entityId || !summary) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['entityType', 'entityId', 'summary'],
      });
    }

    // Validate entityType
    const validEntityTypes = ['thread', 'contact', 'property', 'deal'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entityType',
        validTypes: validEntityTypes,
      });
    }

    // Validate type if provided
    const validTypes = ['note', 'voice_note'];
    const noteType = type && validTypes.includes(type) ? type : 'note';

    // Verify entity exists and belongs to user
    let entityExists = false;
    switch (entityType) {
      case 'thread':
        const thread = await req.app.locals.prisma.thread.findFirst({
          where: { id: entityId, userId },
        });
        entityExists = !!thread;
        break;
      case 'contact':
        const contact = await req.app.locals.prisma.contact.findFirst({
          where: { id: entityId, userId },
        });
        entityExists = !!contact;
        break;
      case 'property':
        const property = await req.app.locals.prisma.property.findFirst({
          where: { id: entityId, userId },
        });
        entityExists = !!property;
        break;
      case 'deal':
        const deal = await req.app.locals.prisma.deal.findFirst({
          where: { id: entityId, userId },
        });
        entityExists = !!deal;
        break;
    }

    if (!entityExists) {
      return res.status(404).json({
        error: 'Entity not found',
        entityType,
        entityId,
      });
    }

    // Create the manual note
    const event = await timelineService.createManualNote(
      userId,
      entityType,
      entityId,
      summary,
      content,
      noteType
    );

    res.status(201).json({
      message: 'Manual note created successfully',
      event,
    });
  } catch (error) {
    console.error('Error creating manual note:', error);
    res.status(500).json({
      error: 'Failed to create manual note',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get timeline for a specific entity
 * GET /api/timeline/:entityType/:entityId
 */
export async function getEntityTimeline(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityType, entityId } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : undefined;

    const events = await timelineService.getEntityTimeline(
      userId,
      entityType,
      entityId,
      limitNum
    );

    res.json({
      entityType,
      entityId,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching entity timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch entity timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update timeline event
 * PUT /api/timeline/:id
 */
export async function updateEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { summary, content, metadata } = req.body;

    // Validate that at least one field is being updated
    if (summary === undefined && content === undefined && metadata === undefined) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    await timelineService.updateEvent(userId, id, {
      summary,
      content,
      metadata
    });

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete timeline event
 * DELETE /api/timeline/:id
 */
export async function deleteEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await timelineService.deleteEvent(userId, id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
