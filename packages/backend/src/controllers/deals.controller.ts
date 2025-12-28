import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  dealFlowService,
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS
} from '../services/deal-flow.service.js';
import { PipelineType } from '../models/types.js';

const prisma = new PrismaClient();

const VALID_PIPELINE_TYPES = ['buyer', 'seller'];
const VALID_SALE_METHODS = ['negotiation', 'auction', 'tender', 'deadline_sale'];

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

      // Validate stage based on pipeline type
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

      const validStages = deal.pipelineType === 'seller' ? SELLER_STAGES : BUYER_STAGES;
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

      const oldStage = deal.stage;

      // Update deal stage
      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: {
          stage,
          stageEnteredAt: new Date(), // Reset stage timer
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
  /**
   * GET /api/deals/pipeline/:type
   * Get deals grouped by stage for kanban view
   */
  async getPipelineDeals(req: Request, res: Response): Promise<void> {
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

      const { type } = req.params;

      if (!type || !VALID_PIPELINE_TYPES.includes(type)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `type must be one of: ${VALID_PIPELINE_TYPES.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      const pipeline = await dealFlowService.getPipelineDeals(
        req.user.userId,
        type as PipelineType
      );

      res.status(200).json(pipeline);
    } catch (error) {
      console.error('Get pipeline deals error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pipeline deals',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/deals/dashboard
   * Get aggregated dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
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

      const stats = await dealFlowService.getDashboardStats(req.user.userId);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard stats',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/deals/forecast
   * Get revenue forecast by month with stage-weighted probabilities
   */
  async getRevenueForecast(req: Request, res: Response): Promise<void> {
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

      const monthsAhead = parseInt(req.query.months as string, 10) || 6;
      const forecast = await dealFlowService.getRevenueForecast(req.user.userId, monthsAhead);
      res.status(200).json(forecast);
    } catch (error) {
      console.error('Get revenue forecast error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch revenue forecast',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/deals
   * Create a new deal
   */
  async createDeal(req: Request, res: Response): Promise<void> {
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
        pipelineType,
        saleMethod,
        stage,
        summary,
        propertyId,
        dealValue,
        commissionFormulaId,
        conditions,
        settlementDate,
        goLiveDate,
        auctionDate,
        tenderCloseDate,
        contactIds,
      } = req.body;

      // Validate required fields
      if (!pipelineType || !VALID_PIPELINE_TYPES.includes(pipelineType)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `pipelineType must be one of: ${VALID_PIPELINE_TYPES.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      if (saleMethod && !VALID_SALE_METHODS.includes(saleMethod)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `saleMethod must be one of: ${VALID_SALE_METHODS.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      const validStages = pipelineType === 'seller' ? SELLER_STAGES : BUYER_STAGES;
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

      if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'summary is required and must be a non-empty string',
            retryable: false,
          },
        });
        return;
      }

      const deal = await dealFlowService.createDeal({
        userId: req.user.userId,
        pipelineType,
        saleMethod: saleMethod || 'negotiation',
        stage,
        summary: summary.trim(),
        propertyId,
        dealValue: dealValue ? parseFloat(dealValue) : undefined,
        commissionFormulaId,
        conditions,
        settlementDate: settlementDate ? new Date(settlementDate) : undefined,
        goLiveDate: goLiveDate ? new Date(goLiveDate) : undefined,
        auctionDate: auctionDate ? new Date(auctionDate) : undefined,
        tenderCloseDate: tenderCloseDate ? new Date(tenderCloseDate) : undefined,
        contactIds,
      });

      res.status(201).json({
        deal,
        message: 'Deal created successfully',
      });
    } catch (error) {
      console.error('Create deal error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create deal',
          retryable: true,
        },
      });
    }
  }

  /**
   * PUT /api/deals/:id
   * Update deal details
   */
  async updateDeal(req: Request, res: Response): Promise<void> {
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

      // Verify deal belongs to user
      const existingDeal = await prisma.deal.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existingDeal) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Deal not found',
            retryable: false,
          },
        });
        return;
      }

      const {
        summary,
        nextAction,
        dealValue,
        commissionFormulaId,
        settlementDate,
        goLiveDate,
        auctionDate,
        tenderCloseDate,
        lastContactAt,
        contactIds,
      } = req.body;

      // Build update data
      const updateData: any = {};
      if (summary !== undefined) updateData.summary = summary;
      if (nextAction !== undefined) updateData.nextAction = nextAction;
      if (dealValue !== undefined) updateData.dealValue = parseFloat(dealValue);
      if (commissionFormulaId !== undefined) updateData.commissionFormulaId = commissionFormulaId;
      if (settlementDate !== undefined) updateData.settlementDate = settlementDate ? new Date(settlementDate) : null;
      if (goLiveDate !== undefined) updateData.goLiveDate = goLiveDate ? new Date(goLiveDate) : null;
      if (auctionDate !== undefined) updateData.auctionDate = auctionDate ? new Date(auctionDate) : null;
      if (tenderCloseDate !== undefined) updateData.tenderCloseDate = tenderCloseDate ? new Date(tenderCloseDate) : null;
      if (lastContactAt !== undefined) updateData.lastContactAt = lastContactAt ? new Date(lastContactAt) : null;

      // Recalculate commission if value or formula changed
      if ((dealValue !== undefined || commissionFormulaId !== undefined) && updateData.dealValue) {
        const formulaId = commissionFormulaId || existingDeal.commissionFormulaId;
        if (formulaId) {
          const formula = await prisma.commissionFormula.findUnique({ where: { id: formulaId } });
          if (formula) {
            const tiers = formula.tiers as any[];
            updateData.estimatedCommission = dealFlowService.calculateCommission(updateData.dealValue, tiers);
          }
        }
      }

      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          property: { select: { id: true, address: true } },
          contacts: { select: { id: true, name: true } },
          commissionFormula: true,
        },
      });

      // Update contacts if provided
      if (contactIds !== undefined) {
        await prisma.deal.update({
          where: { id },
          data: {
            contacts: {
              set: contactIds.map((cid: string) => ({ id: cid })),
            },
          },
        });
      }

      res.status(200).json({
        deal: updatedDeal,
        message: 'Deal updated successfully',
      });
    } catch (error) {
      console.error('Update deal error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update deal',
          retryable: true,
        },
      });
    }
  }

  /**
   * PUT /api/deals/:id/conditions
   * Update deal conditions
   */
  async updateConditions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { conditions } = req.body;

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

      // Verify deal belongs to user
      const deal = await prisma.deal.findFirst({
        where: { id, userId: req.user.userId },
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

      // Validate conditions array
      if (!Array.isArray(conditions)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'conditions must be an array',
            retryable: false,
          },
        });
        return;
      }

      // Update conditions and reassess risk
      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: { conditions },
      });

      // Reassess risk level
      const { riskLevel, riskFlags } = await dealFlowService.assessDealRisk(updatedDeal);

      const finalDeal = await prisma.deal.update({
        where: { id },
        data: { riskLevel, riskFlags },
        include: {
          property: { select: { id: true, address: true } },
          contacts: { select: { id: true, name: true } },
        },
      });

      res.status(200).json({
        deal: finalDeal,
        message: 'Conditions updated successfully',
      });
    } catch (error) {
      console.error('Update conditions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update conditions',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/deals/stages
   * Get available stages for a pipeline type
   */
  async getStages(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      if (type && !VALID_PIPELINE_TYPES.includes(type as string)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `type must be one of: ${VALID_PIPELINE_TYPES.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      if (type) {
        const stages = type === 'seller' ? SELLER_STAGES : BUYER_STAGES;
        res.status(200).json({
          pipelineType: type,
          stages: stages.map(s => ({ value: s, label: STAGE_LABELS[s] || s })),
        });
      } else {
        res.status(200).json({
          buyer: BUYER_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] || s })),
          seller: SELLER_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] || s })),
        });
      }
    } catch (error) {
      console.error('Get stages error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stages',
          retryable: true,
        },
      });
    }
  }
}

export const dealsController = new DealsController();
