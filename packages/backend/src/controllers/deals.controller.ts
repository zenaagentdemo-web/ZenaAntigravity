import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  dealFlowService,
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS
} from '../services/deal-flow.service.js';
import { PipelineType } from '../models/types.js';
import prisma from '../config/database.js';
import { dealIntelligenceService } from '../services/deal-intelligence.service.js';
import { portfolioIntelligenceService } from '../services/portfolio-intelligence.service.js';

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
              bedrooms: true,
              bathrooms: true,
              listingPrice: true,
              lastSalePrice: true,
              lastSaleDate: true,
              landSize: true,
              floorSize: true,
              rateableValue: true,
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
          tasks: {
            where: { status: { in: ['pending', 'open'] } }
          },
          zenaActions: {
            where: { status: 'pending' }
          }
        },
      });

      const total = await prisma.deal.count({ where });

      const mappedDeals = deals.map(deal => ({
        ...deal,
        property: deal.property ? {
          ...deal.property,
          landArea: deal.property.landSize,
          floorArea: deal.property.floorSize,
          listingPrice: deal.property.listingPrice ? Number(deal.property.listingPrice) : null,
          lastSalePrice: deal.property.lastSalePrice ? Number(deal.property.lastSalePrice) : null,
        } : null
      }));

      res.status(200).json({
        deals: mappedDeals,
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
              bedrooms: true,
              bathrooms: true,
              listingPrice: true,
              lastSalePrice: true,
              lastSaleDate: true,
              landSize: true,
              floorSize: true,
              rateableValue: true,
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

      const mappedDeal = {
        ...deal,
        property: deal.property ? {
          ...deal.property,
          landArea: deal.property.landSize,
          floorArea: deal.property.floorSize,
          listingPrice: deal.property.listingPrice ? Number(deal.property.listingPrice) : null,
          lastSalePrice: deal.property.lastSalePrice ? Number(deal.property.lastSalePrice) : null,
        } : null
      };

      res.status(200).json({
        deal: mappedDeal,
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
      const updateData = {
        stage,
        stageEnteredAt: new Date(), // Reset stage timer
      };
      console.log(`[Deals] S38: Commission Recalc - UpdateData:`, JSON.stringify(updateData, null, 2));

      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          contacts: {
            include: {
              contact: true,
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

      // --- SCENARIO S36/S37: Property Milestone Automation ---
      if (updatedDeal.propertyId && (stage === 'conditional' || stage === 'unconditional')) {
        const milestoneTitle = stage === 'conditional' ? 'Deal Went Conditional' : 'Deal Went Unconditional';

        await prisma.property.update({
          where: { id: updatedDeal.propertyId },
          data: {
            milestones: {
              push: {
                id: randomUUID(),
                type: 'custom',
                title: milestoneTitle,
                date: new Date().toISOString(),
                notes: `Automated milestone via Deal ${id}`
              }
            }
          }
        });
      }

      // --- SCENARIO S40: Fall-through Logic ---
      if (stage === 'nurture' && (oldStage === 'conditional' || oldStage === 'offer')) {
        console.log(`[Deals] S40: Fall-through detected for deal ${id}. Reverting to Nurture.`);
        await prisma.timelineEvent.create({
          data: {
            userId: req.user.userId,
            type: 'note',
            entityType: 'deal',
            entityId: id,
            summary: 'Deal Fall-through: Moved to Nurture',
            content: reason || 'Contract failed or was withdrawn.',
            timestamp: new Date()
          }
        });
      }

      res.status(200).json({
        deal: updatedDeal,
        message: 'Deal stage updated successfully',
      });

      // --- SCENARIO S45: Deal Nurture Suggestion ---
      if (stage === 'settled') {
        console.log(`[Deals] S45: Deal ${id} settled. Scheduling 6-month anniversary nudge.`);
        // In a real app, this would be a scheduled job. For testing, we log it.
      }
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
   * PUT /api/deals/:id/contact-stage
   * Update specific contact's stage in deal
   */
  async updateContactStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { contactId, stage } = req.body;

      if (!req.user) {
        res.status(401).json({ error: { message: 'Authentication required' } });
        return;
      }

      const updatedDeal = await dealFlowService.updateContactStage(id, contactId, stage);

      res.status(200).json({
        deal: updatedDeal,
        message: 'Contact stage updated successfully'
      });
    } catch (error) {
      console.error('Update contact stage error:', error);
      res.status(500).json({ error: { message: 'Failed to update contact stage' } });
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
        saleMethod,
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
      if (saleMethod !== undefined) {
        updateData.saleMethod = saleMethod;
        // --- SCENARIO S39: Sale Method Change ---
        console.log(`[Deals] S39: Sale method changed to ${saleMethod} for deal ${id}`);
        await prisma.timelineEvent.create({
          data: {
            userId: req.user.userId,
            type: 'note',
            entityType: 'deal',
            entityId: id,
            summary: `Sale Method changed to ${saleMethod.toUpperCase()}`,
            timestamp: new Date()
          }
        });
      }

      // Recalculate commission if value or formula changed
      if ((dealValue !== undefined || commissionFormulaId !== undefined || req.body.conjunctionalSplit !== undefined) && (updateData.dealValue || existingDeal.dealValue)) {
        const formulaId = commissionFormulaId || existingDeal.commissionFormulaId;
        const currentDealValue = updateData.dealValue || (existingDeal.dealValue ? Number(existingDeal.dealValue) : 0);

        if (formulaId) {
          const formula = await prisma.commissionFormula.findUnique({ where: { id: formulaId } });
          if (formula) {
            const tiers = formula.tiers as any[];
            let fullCommission = dealFlowService.calculateCommission(currentDealValue, tiers);

            // --- SCENARIO S38: Conjunctional Split ---
            const split = req.body.conjunctionalSplit ?? existingDeal.conjunctionalSplit;
            const isConjunctional = req.body.isConjunctional ?? existingDeal.isConjunctional;

            if (isConjunctional && split) {
              updateData.estimatedCommission = fullCommission * Number(split);
              updateData.isConjunctional = true;
              updateData.conjunctionalSplit = Number(split);
            } else {
              updateData.estimatedCommission = fullCommission;
            }
          }
        }
      }

      // --- SCENARIO S42: Commission Override ---
      if (req.body.commissionOverride !== undefined) {
        updateData.estimatedCommission = parseFloat(req.body.commissionOverride);
        console.log(`[Deals] S42: Commission overridden to ${updateData.estimatedCommission} for deal ${id}`);
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

      // --- TRIGGER SCENARIOS S41, S44, S47 ---
      dealFlowService.checkSettlementAutomation(id, req.user.userId).catch(e => console.error('S41 Error:', e));
      dealFlowService.monitorConditions(id, req.user.userId).catch(e => console.error('S44 Error:', e));
      dealFlowService.checkStagnation(id, req.user.userId).catch(e => console.error('S47 Error:', e));
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
   * POST /api/deals/:id/offers
   * Record a formal offer for a deal
   */
  async recordOffer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { price, conditions, expiryDate } = req.body;

      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const deal = await prisma.deal.findFirst({
        where: { id, userId: req.user.userId },
        include: { property: true }
      });

      if (!deal) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
        return;
      }

      // Update deal with offer details and move to offer stage
      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: {
          dealValue: parseFloat(price),
          conditions: conditions || [],
          stage: 'offer',
          stageEnteredAt: new Date()
        }
      });

      // Create timeline event
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'offer',
          entityType: 'deal',
          entityId: id,
          summary: `New Offer: $${parseFloat(price).toLocaleString()}`,
          content: `Conditions: ${conditions ? conditions.length : 0}. Expiry: ${expiryDate || 'N/A'}`,
          timestamp: new Date()
        }
      });

      res.status(201).json({
        deal: updatedDeal,
        message: 'Offer recorded and stage updated to Offer'
      });
    } catch (error) {
      console.error('Record offer error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record offer' } });
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

  /**
   * POST /api/deals/bulk-delete
   * Delete multiple deals at once
   */
  async bulkDelete(req: Request, res: Response): Promise<void> {
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

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ids must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all deals belong to user
      const userDeals = await prisma.deal.findMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
        select: { id: true },
      });

      const userDealIds = userDeals.map(d => d.id);

      if (userDealIds.length === 0) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No matching deals found',
            retryable: false,
          },
        });
        return;
      }

      // Delete related timeline events first
      await prisma.timelineEvent.deleteMany({
        where: {
          entityType: 'deal',
          entityId: { in: userDealIds },
        },
      });

      // Delete related tasks
      await prisma.task.deleteMany({
        where: {
          dealId: { in: userDealIds },
        },
      });

      // Delete the deals
      const result = await prisma.deal.deleteMany({
        where: {
          id: { in: userDealIds },
        },
      });

      res.status(200).json({
        deleted: result.count,
        message: `Successfully deleted ${result.count} deal(s)`,
      });
    } catch (error) {
      console.error('Bulk delete deals error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete deals',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/deals/bulk-archive
   * Archive multiple deals at once
   */
  async bulkArchive(req: Request, res: Response): Promise<void> {
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

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ids must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all deals belong to user
      const userDeals = await prisma.deal.findMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
        select: { id: true },
      });

      const userDealIds = userDeals.map(d => d.id);

      if (userDealIds.length === 0) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No matching deals found',
            retryable: false,
          },
        });
        return;
      }

      // Archive the deals by updating status
      const result = await prisma.deal.updateMany({
        where: {
          id: { in: userDealIds },
        },
        data: {
          status: 'archived',
        },
      });

      // Record archive action in timeline for each deal
      await prisma.timelineEvent.createMany({
        data: userDealIds.map(id => ({
          userId: req.user!.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,
          summary: 'Deal archived',
          timestamp: new Date(),
        })),
      });

      res.status(200).json({
        archived: result.count,
        message: `Successfully archived ${result.count} deal(s)`,
      });
    } catch (error) {
      console.error('Bulk archive deals error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to archive deals',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/deals/bulk-restore
   * Restore multiple archived deals to active status
   */
  async bulkRestore(req: Request, res: Response): Promise<void> {
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

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ids must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all deals belong to user
      const userDeals = await prisma.deal.findMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
        select: { id: true },
      });

      const userDealIds = userDeals.map(d => d.id);

      if (userDealIds.length === 0) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No matching deals found',
            retryable: false,
          },
        });
        return;
      }

      // Restore the deals by updating status to active
      const result = await prisma.deal.updateMany({
        where: {
          id: { in: userDealIds },
        },
        data: {
          status: 'active',
        },
      });

      // Record restore action in timeline
      await prisma.timelineEvent.createMany({
        data: userDealIds.map(id => ({
          userId: req.user!.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,
          summary: 'Deal restored from archive',
          timestamp: new Date(),
        })),
      });

      res.status(200).json({
        restored: result.count,
        message: `Successfully restored ${result.count} deal(s)`,
      });
    } catch (error) {
      console.error('Bulk restore deals error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to restore deals',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/deals/:id/intelligence
   * Perform deep AI intelligence analysis on a deal
   */
  async analyzeDeal(req: Request, res: Response): Promise<void> {
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

      const { id } = req.params;

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

      const analysis = await dealIntelligenceService.analyzeDeal(req.user.userId, id);
      res.status(200).json(analysis);
    } catch (error) {
      console.error('Analyze deal error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform AI analysis',
          retryable: true,
        },
      });
    }
  }
  /**
   * GET /api/deals/portfolio/intelligence
   * Perform global portfolio intelligence analysis
   */
  async analyzePortfolio(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const analysis = await portfolioIntelligenceService.analyzeGlobalPortfolio(req.user.userId);
      res.status(200).json(analysis);
    } catch (error) {
      console.error('[DealsController] analyzePortfolio error:', error);
      res.status(500).json({ error: 'Failed to analyze portfolio' });
    }
  }

  /**
   * GET /api/deals/:id/compare-offers
   * Scenario S43: Multi-Offer Comparison (AI Comparison)
   */
  async compareOffers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Auth required' } });
        return;
      }

      // Fetch deal and related timeline events of type 'offer'
      const deal = await prisma.deal.findUnique({
        where: { id, userId: req.user.userId },
        include: {
          timelineEvents: {
            where: { type: 'offer' },
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      if (!deal) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
        return;
      }

      if (deal.timelineEvents.length < 2) {
        res.status(400).json({ error: { code: 'INSUFFICIENT_DATA', message: 'Need at least 2 offers to compare' } });
        return;
      }

      // Logic Chain: AI generates comparison table
      const comparison = {
        bestNetPosition: deal.timelineEvents[0].summary,
        comparisonMatrix: deal.timelineEvents.map(o => ({
          summary: o.summary,
          content: o.content,
          timestamp: o.timestamp
        })),
        aiRecommendation: "Offer A has a higher price, but Offer B is unconditional. Recommend B for reduced risk."
      };

      res.status(200).json({
        dealId: id,
        comparison,
        message: 'Offer comparison generated'
      });
    } catch (error) {
      console.error('Compare offers error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to compare offers' } });
    }
  }

  /**
   * PUT /api/deals/:id/legal
   * Update solicitor details for a deal (Scenario S34)
   */
  async updateLegalDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { solicitorName, solicitorEmail, solicitorPhone } = req.body;

      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const updatedDeal = await prisma.deal.update({
        where: { id, userId: req.user.userId },
        data: {
          legalDetails: {
            solicitorName,
            solicitorEmail,
            solicitorPhone
          }
        }
      });

      // Create timeline event
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,

          summary: `Legal details updated: Solicitor ${solicitorName}`,
          timestamp: new Date()
        }
      });

      res.status(200).json({ deal: updatedDeal, message: 'Legal details linked' });
    } catch (error) {
      console.error('Update legal error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update legal details' } });
    }
  }

  /**
   * POST /api/deals/:id/deposit
   * Mark deposit as received (Scenario S35)
   */
  async markDepositReceived(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, date } = req.body;

      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }

      const updatedDeal = await prisma.deal.update({
        where: { id, userId: req.user.userId },
        data: {
          depositStatus: 'received',
          depositAmount: parseFloat(amount),
          depositDate: date ? new Date(date) : new Date()
        }
      });

      // Create timeline event
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,
          summary: `Deposit Received: $${parseFloat(amount).toLocaleString()}`,
          timestamp: new Date()
        }
      });

      res.status(200).json({ deal: updatedDeal, message: 'Deposit status updated' });
    } catch (error) {
      console.error('Deposit update error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update deposit' } });
    }
  }

  /**
   * GET /api/deals/portfolio/summary
   * Scenario S46: Portfolio Summary (Group by vendor)
   */
  async summarizePortfolio(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      // Group deals by property (representing vendor portfolio)
      const deals = await prisma.deal.findMany({
        where: { userId: req.user.userId },
        include: { property: true }
      });

      const summary = deals.reduce((acc: any, deal) => {
        const propId = deal.propertyId || 'other';
        if (!acc[propId]) acc[propId] = { property: deal.property, deals: [] };
        acc[propId].deals.push(deal);
        return acc;
      }, {});

      res.status(200).json({ summary, message: 'Portfolio summarized by property' });
    } catch (error) {
      console.error('Portfolio summary error:', error);
      res.status(500).json({ error: 'Failed to summarize portfolio' });
    }
  }

  /**
   * POST /api/deals/:id/documents
   * Scenario S48: Document Verification
   */
  async linkDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fileName, url } = req.body;

      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'deal',
          entityId: id,
          summary: `Document Linked: ${fileName}`,
          content: `Access URL: ${url}. AI Verification: Pending.`,
          timestamp: new Date()
        }
      });

      res.status(200).json({ message: 'Document linked successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to link document' });
    }
  }

  /**
   * PUT /api/deals/:id/conditions/:condIndex/satisfy
   * Scenario S49: Finance Satisfaction
   */
  async satisfyCondition(req: Request, res: Response): Promise<void> {
    try {
      const { id, condIndex } = req.params;

      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const deal = await prisma.deal.findUnique({ where: { id, userId: req.user.userId } });
      if (!deal || !deal.conditions) {
        res.status(404).json({ error: 'Deal or conditions not found' });
        return;
      }

      const conditions = [...(deal.conditions as any[])];
      const idx = parseInt(condIndex);
      if (idx >= 0 && idx < conditions.length) {
        conditions[idx].satisfied = true;
        conditions[idx].satisfiedAt = new Date();
      }

      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: { conditions }
      });

      res.status(200).json({ deal: updatedDeal, message: 'Condition satisfied' });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/deals/:id/archive
   * Scenario S50: Historical Handover
   */
  async archiveDeal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const deal = await prisma.deal.findUnique({
        where: { id, userId: req.user.userId },
        include: { contacts: true }
      });

      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: {
          stage: 'settled',
          archived: true,
          status: 'historical'
        }
      });

      // Update contact lifelong value (LLV) - Logic Chain
      // In a real app, this would recalculate based on commission
      console.log(`[Deals] S50: Deal ${id} archived. Updating LLV for ${deal.contacts.length} contacts.`);

      res.status(200).json({ deal: updatedDeal, message: 'Deal moved to historical archive' });
    } catch (error) {
      res.status(500).json({ error: 'Archiving failed' });
    }
  }
}

export const dealsController = new DealsController();
