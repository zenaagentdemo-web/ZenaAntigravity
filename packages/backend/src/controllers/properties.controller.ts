import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { threadLinkingService } from '../services/thread-linking.service.js';

const prisma = new PrismaClient();

export class PropertiesController {
  /**
   * GET /api/properties
   * List properties
   */
  async listProperties(req: Request, res: Response): Promise<void> {
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
        search, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const where: any = {
        userId: req.user.userId,
      };

      // Apply search filter (address)
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        where.address = {
          contains: searchTerm,
          mode: 'insensitive',
        };
      }

      const properties = await prisma.property.findMany({
        where,
        orderBy: [
          { updatedAt: 'desc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          vendors: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          buyers: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
        },
      });

      const total = await prisma.property.count({ where });

      res.status(200).json({
        properties,
        total,
        displayed: properties.length,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + properties.length,
        },
      });
    } catch (error) {
      console.error('List properties error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch properties',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/properties
   * Create property
   */
  async createProperty(req: Request, res: Response): Promise<void> {
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

      const { address, vendorContactIds = [], buyerContactIds = [] } = req.body;

      // Validate required fields
      if (!address || typeof address !== 'string' || address.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'address is required and must be a non-empty string',
            retryable: false,
          },
        });
        return;
      }

      // Validate contact IDs arrays
      if (!Array.isArray(vendorContactIds)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'vendorContactIds must be an array',
            retryable: false,
          },
        });
        return;
      }

      if (!Array.isArray(buyerContactIds)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'buyerContactIds must be an array',
            retryable: false,
          },
        });
        return;
      }

      // Create property
      const property = await prisma.property.create({
        data: {
          userId: req.user.userId,
          address: address.trim(),
          milestones: [],
          vendors: {
            connect: vendorContactIds.map((id: string) => ({ id })),
          },
          buyers: {
            connect: buyerContactIds.map((id: string) => ({ id })),
          },
        },
        include: {
          vendors: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          buyers: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
        },
      });

      // Link relevant threads to this property
      await threadLinkingService.linkThreadsToProperty(property.id, address.trim());

      res.status(201).json({
        property,
        message: 'Property created successfully',
      });
    } catch (error) {
      console.error('Create property error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create property',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/properties/:id
   * Get property details
   */
  async getProperty(req: Request, res: Response): Promise<void> {
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

      const property = await prisma.property.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          vendors: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          buyers: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              riskFlags: true,
              nextAction: true,
              nextActionOwner: true,
              summary: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      });

      if (!property) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            retryable: false,
          },
        });
        return;
      }

      // Get threads linked to this property
      const threads = await threadLinkingService.getThreadsForProperty(id);

      // Get timeline events for this property
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId: req.user.userId,
          entityType: 'property',
          entityId: id,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      });

      res.status(200).json({
        property,
        threads,
        timeline: timelineEvents,
      });
    } catch (error) {
      console.error('Get property error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch property',
          retryable: true,
        },
      });
    }
  }

  /**
   * PUT /api/properties/:id
   * Update property
   */
  async updateProperty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { address, vendorContactIds, buyerContactIds, riskOverview } = req.body;

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

      // Verify property belongs to user
      const property = await prisma.property.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!property) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            retryable: false,
          },
        });
        return;
      }

      // Build update data object
      const updateData: any = {};
      
      if (address !== undefined) {
        if (typeof address !== 'string' || address.trim().length === 0) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'address must be a non-empty string',
              retryable: false,
            },
          });
          return;
        }
        updateData.address = address.trim();
      }

      if (riskOverview !== undefined) {
        updateData.riskOverview = riskOverview;
      }

      // Handle vendor contacts update
      if (vendorContactIds !== undefined) {
        if (!Array.isArray(vendorContactIds)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'vendorContactIds must be an array',
              retryable: false,
            },
          });
          return;
        }
        updateData.vendors = {
          set: vendorContactIds.map((id: string) => ({ id })),
        };
      }

      // Handle buyer contacts update
      if (buyerContactIds !== undefined) {
        if (!Array.isArray(buyerContactIds)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'buyerContactIds must be an array',
              retryable: false,
            },
          });
          return;
        }
        updateData.buyers = {
          set: buyerContactIds.map((id: string) => ({ id })),
        };
      }

      // Update property
      const updatedProperty = await prisma.property.update({
        where: { id },
        data: updateData,
        include: {
          vendors: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          buyers: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
        },
      });

      res.status(200).json({
        property: updatedProperty,
        message: 'Property updated successfully',
      });
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update property',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/properties/:id/milestones
   * Add campaign milestone to property
   */
  async addMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, date, notes } = req.body;

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
      if (!type || typeof type !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'type is required and must be a string',
            retryable: false,
          },
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'date is required',
            retryable: false,
          },
        });
        return;
      }

      // Validate milestone type
      const validTypes = ['listing', 'first_open', 'offer_received', 'conditional', 'unconditional', 'settled'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `type must be one of: ${validTypes.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      // Verify property belongs to user
      const property = await prisma.property.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!property) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            retryable: false,
          },
        });
        return;
      }

      // Create new milestone
      const newMilestone = {
        id: randomUUID(),
        type,
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      };

      // Get existing milestones and add the new one
      const existingMilestones = (property.milestones as any[]) || [];
      const updatedMilestones = [...existingMilestones, newMilestone];

      // Update property with new milestone
      const updatedProperty = await prisma.property.update({
        where: { id },
        data: {
          milestones: updatedMilestones,
        },
        include: {
          vendors: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          buyers: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true,
              role: true,
            },
          },
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
        },
      });

      // Create timeline event for the milestone
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'property',
          entityId: id,
          summary: `Milestone added: ${type}`,
          content: notes || undefined,
          timestamp: new Date(date),
        },
      });

      res.status(201).json({
        property: updatedProperty,
        milestone: newMilestone,
        message: 'Milestone added successfully',
      });
    } catch (error) {
      console.error('Add milestone error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add milestone',
          retryable: true,
        },
      });
    }
  }
}

export const propertiesController = new PropertiesController();
