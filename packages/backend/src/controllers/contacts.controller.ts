import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { threadLinkingService } from '../services/thread-linking.service.js';

const prisma = new PrismaClient();

export class ContactsController {
  /**
   * POST /api/contacts
   * Create a new contact
   */
  async createContact(req: Request, res: Response): Promise<void> {
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

      const { firstName, lastName, email, phone, role, intelligence, context } = req.body;

      if (!firstName || !lastName || !email) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'First name, last name, and email are required',
            retryable: false,
          },
        });
        return;
      }

      // Create structured contact from parts
      const name = `${firstName} ${lastName}`.trim();
      const emails = [email.toLowerCase()];
      const phones = phone ? [phone] : [];

      // Initial context as a note
      const relationshipNotes = context ? [{
        id: randomUUID(),
        content: context,
        source: 'manual',
        createdAt: new Date().toISOString()
      }] : [];

      const newContact = await prisma.contact.create({
        data: {
          id: randomUUID(),
          userId: req.user.userId,
          name,
          emails,
          phones,
          role: role || 'other',
          zenaIntelligence: intelligence || {},
          relationshipNotes,
          lastActivityDetail: context ? `Contact created with note: ${context.substring(0, 50)}...` : 'Contact created',
          lastActivityAt: new Date()
        }
      });

      res.status(201).json({
        contact: newContact,
        message: 'Contact created successfully'
      });
    } catch (error) {
      console.error('Create contact error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create contact',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/contacts
   * List contacts with search and filters
   */
  async listContacts(req: Request, res: Response): Promise<void> {
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

      console.log('[Contacts] User ID from token:', req.user.userId);

      const {
        search,
        role,
        limit = '50',
        offset = '0'
      } = req.query;

      const where: any = {
        userId: req.user.userId,
      };

      // Apply role filter
      if (role) {
        where.role = role;
      }

      console.log('[Contacts] Query where clause:', JSON.stringify(where));

      // Apply search filter (name, email, or associated property)
      if (search) {
        const searchTerm = (search as string).toLowerCase();

        // Search by name or email
        where.OR = [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            emails: {
              hasSome: [searchTerm],
            },
          },
        ];

        // Also search for contacts associated with properties matching the search
        const properties = await prisma.property.findMany({
          where: {
            userId: req.user.userId,
            address: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });

        if (properties.length > 0) {
          const propertyIds = properties.map((p: { id: string }) => p.id);

          // Add property-based search to OR conditions
          where.OR.push(
            {
              vendorProperties: {
                some: {
                  id: { in: propertyIds },
                },
              },
            },
            {
              buyerProperties: {
                some: {
                  id: { in: propertyIds },
                },
              },
            }
          );
        }
      }

      const contacts = await prisma.contact.findMany({
        where,
        orderBy: [
          { updatedAt: 'desc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
          vendorProperties: {
            select: {
              id: true,
              address: true,
            },
          },
          buyerProperties: {
            select: {
              id: true,
              address: true,
            },
          },
        },
      });

      const total = await prisma.contact.count({ where });

      console.log('[Contacts] Found', contacts.length, 'contacts out of', total, 'total');

      res.status(200).json({
        contacts,
        total,
        displayed: contacts.length,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + contacts.length,
        },
      });
    } catch (error) {
      console.error('List contacts error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch contacts',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/contacts/:id
   * Get contact details
   */
  async getContact(req: Request, res: Response): Promise<void> {
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

      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
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
          vendorProperties: {
            select: {
              id: true,
              address: true,
              milestones: true,
            },
          },
          buyerProperties: {
            select: {
              id: true,
              address: true,
              milestones: true,
            },
          },
        },
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Get communication timeline for this contact
      const threads = await threadLinkingService.getThreadsForContact(id);

      res.status(200).json({
        contact,
        threads,
      });
    } catch (error) {
      console.error('Get contact error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch contact',
          retryable: true,
        },
      });
    }
  }

  /**
   * PUT /api/contacts/:id
   * Update contact
   */
  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, emails, phones, role, zenaIntelligence } = req.body;

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

      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Build update data object
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (emails !== undefined) {
        if (!Array.isArray(emails)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'emails must be an array',
              retryable: false,
            },
          });
          return;
        }
        updateData.emails = emails;
      }
      if (phones !== undefined) {
        if (!Array.isArray(phones)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: 'phones must be an array',
              retryable: false,
            },
          });
          return;
        }
        updateData.phones = phones;
      }
      if (role !== undefined) {
        const validRoles = ['buyer', 'vendor', 'agent', 'investor', 'tradesperson', 'market', 'other'];
        if (!validRoles.includes(role)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: `role must be one of: ${validRoles.join(', ')}`,
              retryable: false,
            },
          });
          return;
        }
        updateData.role = role;
      }
      if (zenaIntelligence !== undefined) {
        updateData.zenaIntelligence = zenaIntelligence;
      }

      // Update contact
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: updateData,
        include: {
          deals: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
              summary: true,
            },
          },
          vendorProperties: {
            select: {
              id: true,
              address: true,
            },
          },
          buyerProperties: {
            select: {
              id: true,
              address: true,
            },
          },
        },
      });

      res.status(200).json({
        contact: updatedContact,
        message: 'Contact updated successfully',
      });
    } catch (error) {
      console.error('Update contact error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update contact',
          retryable: true,
        },
      });
    }
  }

  /**
   * DELETE /api/contacts/:id
   * Delete contact
   */
  async deleteContact(req: Request, res: Response): Promise<void> {
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

      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Use a transaction to ensure clean deletion
      await prisma.$transaction([
        // Delete related timeline events
        prisma.timelineEvent.deleteMany({
          where: {
            entityType: 'contact',
            entityId: id,
            userId: req.user.userId,
          },
        }),
        // Delete the contact itself (Prisma will handle many-to-many relation cleanup)
        prisma.contact.delete({
          where: { id },
        }),
      ]);

      res.status(200).json({
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete contact',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/contacts/bulk-delete
   * Bulk delete contacts
   */
  async bulkDeleteContacts(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

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

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ids must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all contacts belong to user
      const contactsCount = await prisma.contact.count({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
      });

      if (contactsCount !== ids.length) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'One or more contacts not found or access denied',
            retryable: false,
          },
        });
        return;
      }

      // Use a transaction to ensure clean deletion
      await prisma.$transaction([
        // Delete related timeline events
        prisma.timelineEvent.deleteMany({
          where: {
            entityType: 'contact',
            entityId: { in: ids },
            userId: req.user.userId,
          },
        }),
        // Delete the contacts
        prisma.contact.deleteMany({
          where: {
            id: { in: ids },
            userId: req.user.userId,
          },
        }),
      ]);

      res.status(200).json({
        message: `Successfully deleted ${ids.length} contacts`,
      });
    } catch (error) {
      console.error('Bulk delete contacts error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete contacts',
          retryable: true,
        },
      });
    }
  }

  /**
   * PATCH /api/contacts/bulk
   * Bulk update contacts (role, intelligence)
   */
  async bulkUpdateContacts(req: Request, res: Response): Promise<void> {
    try {
      const { ids, data } = req.body;

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

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ids must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all contacts belong to user
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: ids },
          userId: req.user.userId,
        },
      });

      if (contacts.length !== ids.length) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'One or more contacts not found or access denied',
            retryable: false,
          },
        });
        return;
      }

      const updateData: any = {};
      if (data.role) updateData.role = data.role;

      // Use a transaction to update all contacts
      await prisma.$transaction(
        ids.map((id) => {
          const contact = contacts.find((c) => c.id === id);
          const currentIntel = (contact?.zenaIntelligence as any) || {};
          const newIntel = { ...currentIntel, ...(data.zenaIntelligence || {}) };

          return prisma.contact.update({
            where: { id },
            data: {
              ...updateData,
              zenaIntelligence: newIntel,
            },
          });
        })
      );

      // Create timeline events for the updates
      await prisma.timelineEvent.createMany({
        data: ids.map((id) => ({
          userId: req.user?.userId || '',
          type: 'update',
          entityType: 'contact',
          entityId: id,
          summary: `Contact bulk updated via Tag Intel`,
          content: `Updated fields: ${Object.keys(data).join(', ')}`,
          timestamp: new Date(),
        })),
      });

      res.status(200).json({
        message: `Successfully updated ${ids.length} contacts`,
      });
    } catch (error) {
      console.error('Bulk update contacts error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update contacts',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/contacts/:id/notes
   * Add relationship note to contact
   */
  async addNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content, source = 'manual' } = req.body;

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

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'content is required and must be a non-empty string',
            retryable: false,
          },
        });
        return;
      }

      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Validate source
      const validSources = ['email', 'voice_note', 'manual'];
      if (!validSources.includes(source)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `source must be one of: ${validSources.join(', ')}`,
            retryable: false,
          },
        });
        return;
      }

      // Create new relationship note
      const newNote = {
        id: randomUUID(),
        content: content.trim(),
        source,
        createdAt: new Date().toISOString(),
      };

      // Get existing notes and add the new one
      const existingNotes = (contact.relationshipNotes as any[]) || [];
      const updatedNotes = [...existingNotes, newNote];

      // Update contact with new note
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: {
          relationshipNotes: updatedNotes,
        },
        include: {
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

      // Create timeline event for the note
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'note',
          entityType: 'contact',
          entityId: id,
          summary: `Note added to ${contact.name}`,
          content: content.trim(),
          timestamp: new Date(),
        },
      });

      // Trigger AI intelligence update in background
      const { aiProcessingService } = await import('../services/ai-processing.service.js');
      aiProcessingService.updateContactIntelligence(id).catch(err =>
        console.error(`Failed to update intelligence for contact ${id}:`, err)
      );

      res.status(201).json({
        contact: updatedContact,
        note: newNote,
        message: 'Note added successfully',
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add note',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/contacts/:id/recategorize
   * Manually trigger recategorization for a single contact
   */
  async recategorizeContact(req: Request, res: Response): Promise<void> {
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

      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Trigger recategorization
      const { contactCategorizationService } = await import('../services/contact-categorization.service.js');
      const result = await contactCategorizationService.categorizeContact(id);

      // Fetch updated contact
      const updatedContact = await prisma.contact.findUnique({
        where: { id },
      });

      res.status(200).json({
        contact: updatedContact,
        categorization: result,
        message: 'Contact recategorized successfully',
      });
    } catch (error) {
      console.error('Recategorize contact error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to recategorize contact',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/contacts/recategorize-all
   * Recategorize all contacts for the authenticated user
   */
  async recategorizeAll(req: Request, res: Response): Promise<void> {
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

      // Trigger batch recategorization
      const { contactCategorizationService } = await import('../services/contact-categorization.service.js');
      const result = await contactCategorizationService.recategorizeAllForUser(req.user.userId);

      res.status(200).json({
        updated: result.updated,
        categories: result.categories,
        message: `Recategorized ${result.updated} contacts`,
      });
    } catch (error) {
      console.error('Recategorize all contacts error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to recategorize contacts',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/contacts/:id/engagement
   * Get real engagement data for a contact from Zena's AI brain
   * This replaces the frontend mock data
   */
  async getContactEngagement(req: Request, res: Response): Promise<void> {
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

      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          deals: { select: { stage: true } }
        }
      });

      if (!contact) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Contact not found',
            retryable: false,
          },
        });
        return;
      }

      // Calculate engagement using the backend categorization service
      const { contactCategorizationService } = await import('../services/contact-categorization.service.js');

      // Calculate signals which includes engagement score and momentum
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Get recent timeline events
      const recentEvents = await prisma.timelineEvent.findMany({
        where: {
          entityType: 'contact',
          entityId: id,
          timestamp: { gte: fourteenDaysAgo }
        },
        orderBy: { timestamp: 'desc' }
      });

      const events7d = recentEvents.filter(e => e.timestamp >= sevenDaysAgo).length;
      const events14d = recentEvents.length;
      const eventsPrevWeek = events14d - events7d;

      // Calculate days since last activity
      const lastActivity = contact.lastActivityAt || contact.updatedAt || contact.createdAt;
      const daysSinceActivity = Math.floor(
        (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Get deal stages
      const dealStages = contact.deals?.map((d: any) => d.stage) || [];
      const primaryDealStage = dealStages[0] || null;

      // Calculate engagement score (0-100)
      let score = 0;

      // Profile completeness (20 points)
      if (contact.name) score += 5;
      if (contact.emails.length > 0) score += 8;
      if (contact.phones.length > 0) score += 5;
      if (contact.role && contact.role !== 'other') score += 2;

      // Recent activity (30 points)
      score += Math.min(30, events7d * 6);

      // Engagement depth (25 points) - based on relationship notes
      const notes = (contact.relationshipNotes as any[]) || [];
      score += Math.min(25, notes.length * 5);

      // Deal stage bonus (25 points)
      if (primaryDealStage === 'offer' || primaryDealStage === 'conditional') score += 25;
      else if (primaryDealStage === 'viewing') score += 20;
      else if (primaryDealStage === 'qualified') score += 15;
      else if (primaryDealStage === 'lead') score += 10;

      score = Math.min(100, score);

      // Calculate momentum
      let momentum = 0;
      if (eventsPrevWeek > 0) {
        momentum = Math.round(((events7d - eventsPrevWeek) / eventsPrevWeek) * 100);
      } else if (events7d > 0) {
        momentum = 50; // New activity from zero
      } else if (daysSinceActivity > 14) {
        momentum = -Math.min(50, Math.floor(daysSinceActivity / 7) * 10);
      }
      momentum = Math.max(-100, Math.min(100, momentum));

      // Determine next best action
      let nextBestAction = 'Schedule a check-in call';
      if (events7d === 0 && daysSinceActivity > 7) {
        nextBestAction = 'Send a touchpoint email - engagement dropping';
      } else if (contact.role === 'buyer' && primaryDealStage === 'viewing') {
        nextBestAction = 'Follow up on recent viewings';
      } else if (contact.role === 'vendor') {
        nextBestAction = 'Provide campaign update';
      } else if (score < 30) {
        nextBestAction = 'Complete profile information';
      }

      res.status(200).json({
        contactId: id,
        engagementScore: score,
        momentum,
        dealStage: primaryDealStage,
        activityCount7d: events7d,
        daysSinceActivity,
        nextBestAction,
        zenaCategory: contact.zenaCategory,
        categoryConfidence: contact.categoryConfidence,
        lastActivityAt: lastActivity
      });
    } catch (error) {
      console.error('Get contact engagement error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get contact engagement',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/contacts/batch-engagement
   * Get engagement data for multiple contacts at once
   * This is used by ContactsPage to enrich contact list with real scores
   */
  async getBatchEngagement(req: Request, res: Response): Promise<void> {
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

      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'contactIds array is required',
            retryable: false,
          },
        });
        return;
      }

      // Limit batch size
      const limitedIds = contactIds.slice(0, 100);

      // Get all contacts
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: limitedIds },
          userId: req.user.userId,
        },
        include: {
          deals: { select: { stage: true } }
        }
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get timeline events for all contacts
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          entityType: 'contact',
          entityId: { in: limitedIds },
          timestamp: { gte: sevenDaysAgo }
        }
      });

      // Group events by contact
      const eventsByContact: Record<string, number> = {};
      timelineEvents.forEach(event => {
        eventsByContact[event.entityId] = (eventsByContact[event.entityId] || 0) + 1;
      });

      // Calculate engagement for each contact
      const engagementData: Record<string, any> = {};

      for (const contact of contacts) {
        const events7d = eventsByContact[contact.id] || 0;
        const dealStages = contact.deals?.map((d: any) => d.stage) || [];
        const primaryDealStage = dealStages[0] || null;

        // Calculate score
        let score = 0;
        if (contact.name) score += 5;
        if (contact.emails.length > 0) score += 8;
        if (contact.phones.length > 0) score += 5;
        if (contact.role && contact.role !== 'other') score += 2;
        score += Math.min(30, events7d * 6);
        const notes = (contact.relationshipNotes as any[]) || [];
        score += Math.min(25, notes.length * 5);
        if (primaryDealStage === 'offer' || primaryDealStage === 'conditional') score += 25;
        else if (primaryDealStage === 'viewing') score += 20;
        else if (primaryDealStage === 'qualified') score += 15;
        else if (primaryDealStage === 'lead') score += 10;
        score = Math.min(100, score);

        // Calculate momentum (simplified for batch)
        const lastActivity = contact.lastActivityAt || contact.updatedAt;
        const daysSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000));
        let momentum = events7d > 0 ? Math.min(50, events7d * 15) : -Math.min(50, daysSince * 3);

        engagementData[contact.id] = {
          engagementScore: score,
          momentum,
          dealStage: primaryDealStage,
          activityCount7d: events7d
        };
      }

      res.status(200).json({ engagementData });
    } catch (error) {
      console.error('Get batch engagement error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get batch engagement',
          retryable: true,
        },
      });
    }
  }
}

export const contactsController = new ContactsController();
