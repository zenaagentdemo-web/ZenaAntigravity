import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DealsController {
  /**
   * GET /api/deals
   * List deals with filters by stage and risk
   */
  async listDeals(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }

      const { 
        stage, 
        riskLevel,
        limit = '50', 
        offset = '0' 
      } = req.query;

      const where: any = {
        userId: req.user.userId,
      };

      // Apply stage filter
      if (stage) {
        where.stage = stage as string;
      }

      // Apply risk level filter
      if (riskLevel) {
        where.riskLevel = riskLevel as string;
      }

      const deals = await prisma.deal.findMany({
        where,
        orderBy: [
          { riskLevel: 'desc' }, // High risk first
          { updatedAt: 'desc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
        },
      });

      const total = await prisma.deal.count({ where });

      res.status(200).json({
        deals,
        total,
        displayed: deals.length,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + deals.length,
        },
      });
    } catch (error) {
      console.error('List deals error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch deals',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/deals/:id
   * Get deal details
   */
  async getDeal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }

      const deal = await prisma.deal.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          property: {
            select: {
              id: true,
              address: true,
              milestones: true,
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          threads: {
            select: {
              id: true,
              subject: true,
              participants: true,
              lastMessageAt: true,
              category: true,
              riskLevel: true,
              summary: true,
            },
            orderBy: {
              lastMessageAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!deal) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Deal not found',
            retryable: false,
          },
        });
        return;
      }

      // Get timeline events for this deal
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId: req.user.userId,
          entityType: 'deal',
          entityId: id,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      });

      // Get tasks for this deal
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.user.userId,
          dealId: id,
        },
        orderBy: [
          { status: 'asc' }, // Open tasks first
          { dueDate: 'asc' },
        ],
      });

      res.status(200).json({
        deal,
        timeline: timelineEvents,
        tasks,
      });
    } catch (error) {
      console.error('Get deal error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch deal',
          retryable: true,
        },
      });
    }
  }

  /**
   * PUT /api/deals/:id/stage
   * Update deal stage
   */
  async updateDealStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stage, reason } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }

      // Validate stage
      const validStages = ['lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'];
      if (!stage || !validStages.includes(stage)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `stage must be one of: ${validStages.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      // Verify deal belongs to user
      const deal = await prisma.deal.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!deal) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Deal not found',
            retryable: false,
          },
        });
        return;
      }

      const oldStage = deal.stage;

      // Update deal stage
      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: {
          stage,
        },
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
        },
      });

      // Record stage change in timeline
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,
          summary: `Deal stage changed from ${oldStage} to ${stage}`,
          content: reason || undefined,
          timestamp: new Date(),
        },
      });

      res.status(200).json({
        deal: updatedDeal,
        message: 'Deal stage updated successfully',
      });
    } catch (error) {
      console.error('Update deal stage error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update deal stage',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/deals/:id/tasks
   * Create task for deal
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { label, dueDate, propertyId, contactId } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication required',
            retryable: false,
          },
        });
        return;
      }

      // Validate required fields
      if (!label || typeof label !== 'string' || label.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'label is required and must be a non-empty string',
            retryable: false,
          },
        });
        return;
      }

      // Verify deal belongs to user
      const deal = await prisma.deal.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!deal) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Deal not found',
            retryable: false,
          },
        });
        return;
      }

      // Create task
      const task = await prisma.task.create({
        data: {
          userId: req.user.userId,
          label: label.trim(),
          status: 'open',
          dueDate: dueDate ? new Date(dueDate) : undefined,
          dealId: id,
          propertyId: propertyId || undefined,
          contactId: contactId || undefined,
          source: 'manual',
        },
      });

      // Create timeline event for task creation
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'task',
          entityType: 'deal',
          entityId: id,
          summary: `Task created: ${label.trim()}`,
          content: dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : undefined,
          timestamp: new Date(),
        },
      });

      res.status(201).json({
        task,
        message: 'Task created successfully',
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create task',
          retryable: true,
        },
      });
    }
  }
}

export const dealsController = new DealsController();
