import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { threadLinkingService } from '../services/thread-linking.service.js';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';
import { marketScraperService } from '../services/market-scraper.service.js';

const prisma = new PrismaClient();

export class PropertiesController {
  /**
   * GET /api/properties
   * List properties
   */

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
          prediction: {
            select: {
              id: true,
              momentumScore: true,
              buyerInterestLevel: true,
              reasoning: true,
              suggestedActions: true,
              predictedSaleDate: true,
              confidenceScore: true,
            },
          },
        },
      });

      const total = await prisma.property.count({ where });

      // Get most recent activity for each property
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId: req.user.userId,
          entityType: 'property',
          entityId: { in: properties.map(p => p.id) }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      // Enrich properties with server-side intelligence
      const enrichedProperties = properties.map(p => {
        const heat = propertyIntelligenceService.computeHeat(p);
        const lastActivity = timelineEvents.find(e => e.entityId === p.id);

        return {
          ...p,
          heatLevel: heat.level,
          momentumScore: p.prediction?.momentumScore || heat.score,
          heatReasoning: p.prediction?.reasoning || heat.reasoning,
          suggestedActions: p.prediction?.suggestedActions || [],
          buyerInterestLevel: p.prediction?.buyerInterestLevel,
          predictedSaleDate: p.prediction?.predictedSaleDate,
          lastActivityDetail: lastActivity ? lastActivity.summary : 'Awaiting Zena activity scan...'
        };
      });

      // Get Global Market Pulse
      const marketPulse = await propertyIntelligenceService.getMarketPulse(req.user.userId);

      res.status(200).json({
        properties: enrichedProperties,
        marketPulse,
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
   * GET /api/properties/:id/smart-matches
   * Get smart matches for a property
   */
  async getSmartMatches(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const matches = await propertyIntelligenceService.findSmartMatches(id);

      res.status(200).json({
        matches
      });
    } catch (error) {
      console.error('Get smart matches error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to find matches',
          retryable: true
        }
      });
    }
  }

  /**
   * GET /api/properties/smart-matches
   * Get smart matches across portfolio
   */
  async getAllSmartMatches(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const matches = await propertyIntelligenceService.findAllSmartMatches(req.user.userId);
      res.status(200).json({ matches });
    } catch (error) {
      console.error('Get all smart matches error:', error);
      res.status(500).json({ error: 'Failed' });
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

      const {
        address,
        type = 'residential',
        status = 'active',
        listingPrice,
        bedrooms,
        bathrooms,
        landSize,
        listingDate,
        rateableValue,
        viewingCount,
        inquiryCount,
        vendor, // New: { firstName, lastName, email, phone }
        vendorContactIds = [],
        buyerContactIds = []
      } = req.body;

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

      // Handle vendor contact creation if vendor object is provided
      let vendorIdsToConnect = [...vendorContactIds];

      if (vendor && vendor.firstName && vendor.lastName && vendor.email && vendor.phone) {
        // Create a new vendor contact
        const vendorContact = await prisma.contact.create({
          data: {
            userId: req.user.userId,
            name: `${vendor.firstName} ${vendor.lastName}`.trim(),
            emails: [vendor.email],
            phones: [vendor.phone],
            role: 'vendor',
            intelligenceSnippet: `Vendor for ${address.trim()}`,
            relationshipNotes: [],
          },
        });
        vendorIdsToConnect.push(vendorContact.id);
      }

      // Create property
      const property = await prisma.property.create({
        data: {
          userId: req.user.userId,
          address: address.trim(),
          type,
          status,
          listingPrice: listingPrice != null ? (typeof listingPrice === 'number' ? listingPrice : parseFloat(listingPrice)) : null,
          bedrooms: bedrooms != null ? (typeof bedrooms === 'number' ? bedrooms : parseInt(bedrooms)) : null,
          bathrooms: bathrooms != null ? (typeof bathrooms === 'number' ? bathrooms : parseInt(bathrooms)) : null,
          landSize: landSize != null ? String(landSize) : null,
          listingDate: listingDate ? new Date(listingDate) : null,
          rateableValue: rateableValue != null ? parseInt(rateableValue) : null,
          viewingCount: viewingCount != null ? parseInt(viewingCount) : 0,
          inquiryCount: inquiryCount != null ? parseInt(inquiryCount) : 0,
          milestones: [],
          vendors: {
            connect: vendorIdsToConnect.map((id: string) => ({ id })),
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
      const {
        address,
        type,
        status,
        listingPrice,
        bedrooms,
        bathrooms,
        landSize,
        listingDate,
        rateableValue,
        viewingCount,
        inquiryCount,
        vendorContactIds,
        buyerContactIds,
        riskOverview,
        vendor // New: { firstName, lastName, email, phone }
      } = req.body;

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

      if (type !== undefined) updateData.type = type;
      if (status !== undefined) updateData.status = status;
      if (listingPrice !== undefined) updateData.listingPrice = listingPrice != null ? parseFloat(listingPrice) : null;
      if (bedrooms !== undefined) updateData.bedrooms = bedrooms != null ? parseInt(bedrooms) : null;
      if (bathrooms !== undefined) updateData.bathrooms = bathrooms != null ? parseInt(bathrooms) : null;
      if (landSize !== undefined) updateData.landSize = landSize != null ? String(landSize) : null;
      if (listingDate !== undefined) updateData.listingDate = listingDate ? new Date(listingDate) : null;
      if (rateableValue !== undefined) updateData.rateableValue = rateableValue != null ? parseInt(rateableValue) : null;
      if (viewingCount !== undefined) updateData.viewingCount = viewingCount != null ? parseInt(viewingCount) : 0;
      if (inquiryCount !== undefined) updateData.inquiryCount = inquiryCount != null ? parseInt(inquiryCount) : 0;

      if (riskOverview !== undefined) {
        updateData.riskOverview = riskOverview;
      }

      // Handle vendor object - create or update vendor contact
      if (vendor && (vendor.firstName || vendor.lastName || vendor.email || vendor.phone)) {
        const vendorName = `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim();

        // Check if property already has a vendor we should update
        const existingProperty = await prisma.property.findUnique({
          where: { id },
          include: { vendors: true }
        });

        if (existingProperty?.vendors && existingProperty.vendors.length > 0) {
          // Update existing vendor
          const existingVendor = existingProperty.vendors[0];
          await prisma.contact.update({
            where: { id: existingVendor.id },
            data: {
              name: vendorName || existingVendor.name,
              emails: vendor.email ? [vendor.email] : existingVendor.emails,
              phones: vendor.phone ? [vendor.phone] : existingVendor.phones,
            }
          });
        } else {
          // Create new vendor contact and link to property
          const newVendor = await prisma.contact.create({
            data: {
              userId: req.user.userId,
              name: vendorName,
              emails: vendor.email ? [vendor.email] : [],
              phones: vendor.phone ? [vendor.phone] : [],
              role: 'vendor',
              intelligenceSnippet: `Vendor for ${property.address}`,
              relationshipNotes: [],
            }
          });
          updateData.vendors = {
            connect: [{ id: newVendor.id }]
          };
        }
      }

      // Handle vendor contacts update (by IDs)
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
   * DELETE /api/properties/:id
   * Delete property
   */
  async deleteProperty(req: Request, res: Response): Promise<void> {
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

      // Delete property
      await prisma.property.delete({
        where: { id },
      });

      res.status(200).json({
        message: 'Property deleted successfully',
      });
    } catch (error) {
      console.error('Delete property error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete property',
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

      if (!date || isNaN(new Date(date).getTime())) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'date is required and must be a valid date string',
            retryable: false,
          },
        });
        return;
      }

      // Validate milestone type
      const validTypes = [
        'listing', 'first_open', 'open_home', 'viewing', 'auction', 'offer_received', 'conditional', 'unconditional', 'settled',
        'listed', 'first_viewing', 'contract_signed', 'settlement', 'custom'
      ];
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
        type: type as string,
        title: req.body.title || type,
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
      // Note: timestamp uses current time (when logged), not the milestone's scheduled date
      // The scheduled date is included in the summary so users can see when the event is planned
      const scheduledDate = new Date(date);
      const formattedScheduledDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'property',
          entityId: id,
          summary: `Milestone added: ${type} — Scheduled for ${formattedScheduledDate}`,
          content: notes || undefined,
          timestamp: new Date(),
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

  /**
   * POST /api/properties/bulk-delete
   * Bulk delete properties
   */
  async bulkDeleteProperties(req: Request, res: Response): Promise<void> {
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

      // Delete only properties belonging to the user
      const deleteResult = await prisma.property.deleteMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
      });

      res.status(200).json({
        success: true,
        count: deleteResult.count,
        message: `Successfully deleted ${deleteResult.count} properties`,
      });
    } catch (error) {
      console.error('Bulk delete properties error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete properties',
          retryable: true,
        },
      });
    }
  }

  /**
   * PATCH /api/properties/bulk
   * Bulk update properties (status, type)
   */
  async bulkUpdateProperties(req: Request, res: Response): Promise<void> {
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

      const { ids, data } = req.body;

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

      // Verify all properties belong to user
      const propertiesCount = await prisma.property.count({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
      });

      if (propertiesCount !== ids.length) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'One or more properties not found or access denied',
            retryable: false,
          },
        });
        return;
      }

      const updateData: any = {};

      // Validate and apply status update
      if (data.status) {
        const validStatuses = ['active', 'under_contract', 'sold', 'withdrawn'];
        if (!validStatuses.includes(data.status)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: `status must be one of: ${validStatuses.join(', ')}`,
              retryable: false,
            },
          });
          return;
        }
        updateData.status = data.status;
      }

      // Validate and apply type update
      if (data.type) {
        const validTypes = ['residential', 'commercial', 'land'];
        if (!validTypes.includes(data.type)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: `type must be one of: ${validTypes.join(', ')}`,
              retryable: false,
            },
          });
          return;
        }
        updateData.type = data.type;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'No valid update data provided',
            retryable: false,
          },
        });
        return;
      }

      // Bulk update properties
      await prisma.property.updateMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        count: ids.length,
        message: `Successfully updated ${ids.length} properties`,
      });
    } catch (error) {
      console.error('Bulk update properties error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update properties',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/properties/:id/intelligence/refresh
   * Manual trigger to refresh Zena Intelligence for a property
   */
  async refreshIntelligence(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      // Verify ownership
      const property = await prisma.property.findFirst({
        where: { id, userId: req.user.userId }
      });

      if (!property) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Property not found' } });
        return;
      }

      // Import dynamically to avoid circular dependencies if any
      const { propertyIntelligenceService } = await import('../services/property-intelligence.service.js');
      const forceReview = req.body && req.body.force === true;
      const prediction = await propertyIntelligenceService.refreshIntelligence(id, req.user.userId, forceReview);

      res.status(200).json({ success: true, prediction });

    } catch (error) {
      console.error('Refresh intelligence error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to refresh intelligence' } });
    }
  }

  /**
   * GET /api/properties/:id/intelligence
   * Get cached Zena Intelligence
   */
  async getIntelligence(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const prediction = await prisma.propertyPrediction.findUnique({
        where: { propertyId: id }
      });

      if (!prediction) {
        // If no prediction exists, trigger a refresh automatically
        const property = await prisma.property.findFirst({
          where: { id, userId: req.user.userId }
        });

        if (property) {
          const { propertyIntelligenceService } = await import('../services/property-intelligence.service.js');
          const newPrediction = await propertyIntelligenceService.refreshIntelligence(id, req.user.userId);
          res.status(200).json({ prediction: newPrediction });
          return;
        }

        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Property not found' } });
        return;
      }

      res.status(200).json({ prediction });

    } catch (error) {
      console.error('Get intelligence error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get intelligence' } });
    }
  }

  /**
   * PUT /api/properties/:id/milestones/:milestoneId
   * Update campaign milestone
   */
  async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id, milestoneId } = req.params;
      const { title, date, notes, type } = req.body;

      if (!req.user) {
        res.status(401).json({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication required' } });
        return;
      }

      const property = await prisma.property.findFirst({
        where: { id, userId: req.user.userId }
      });

      if (!property) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Property not found' } });
        return;
      }

      const milestones = property.milestones as any[];
      const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);

      if (milestoneIndex === -1) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Milestone not found' } });
        return;
      }

      // Validate date if provided
      if (date && isNaN(new Date(date).getTime())) {
        res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid date format' } });
        return;
      }

      // Update milestone
      milestones[milestoneIndex] = {
        ...milestones[milestoneIndex],
        title: title || milestones[milestoneIndex].title,
        type: type || milestones[milestoneIndex].type,
        date: date ? new Date(date).toISOString() : milestones[milestoneIndex].date,
        notes: notes !== undefined ? notes : milestones[milestoneIndex].notes
      };

      const updatedProperty = await prisma.property.update({
        where: { id },
        data: { milestones }
      });

      res.status(200).json({ property: updatedProperty, milestone: milestones[milestoneIndex] });
    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update milestone' } });
    }
  }

  /**
   * DELETE /api/properties/:id/milestones/:milestoneId
   * Delete campaign milestone
   */
  async deleteMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id, milestoneId } = req.params;

      if (!req.user) {
        res.status(401).json({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication required' } });
        return;
      }

      const property = await prisma.property.findFirst({
        where: { id, userId: req.user.userId }
      });

      if (!property) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Property not found' } });
        return;
      }

      const existingMilestones = property.milestones as any[];
      const updatedMilestones = existingMilestones.filter(m => m.id !== milestoneId);

      const updatedProperty = await prisma.property.update({
        where: { id },
        data: { milestones: updatedMilestones }
      });

      res.status(200).json({ property: updatedProperty, success: true });
    } catch (error) {
      console.error('Delete milestone error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete milestone' } });
    }
  }

  /**
   * POST /api/properties/:id/comparables
   * Run market scraper for property
   */
  async generateComparables(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Fetch property to get address/bedrooms
      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }

      const suburb = property.address.split(',').pop()?.trim() || 'Auckland';
      const bedrooms = property.bedrooms || 3;

      console.log(`[PropertiesController] Generating comparables for ${property.address} (${suburb})`);
      const comparables = await marketScraperService.findComparableSales(suburb, bedrooms);

      res.status(200).json({ comparables });
    } catch (error) {
      console.error('Generate Comparables error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
}

export const propertiesController = new PropertiesController();
