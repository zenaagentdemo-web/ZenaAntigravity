import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { threadLinkingService } from '../services/thread-linking.service.js';
import { websocketService } from '../services/websocket.service.js';
import { askZenaService } from '../services/ask-zena.service.js';
import { neuralScorerService } from '../services/neural-scorer.service.js';

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

      // Generate an initial "Bootstrap Intelligence Snippet"
      let initialSnippet = 'Zena is analyzing this contact...';
      if (intelligence) {
        const parts = [];
        if (intelligence.timeline) parts.push(`Priority: ${intelligence.timeline}`);
        if (intelligence.location) parts.push(`Area: ${intelligence.location}`);
        if (intelligence.maxBudget) parts.push(`Budget: up to $${intelligence.maxBudget}`);
        if (parts.length > 0) initialSnippet = parts.join('. ') + '.';
      } else if (context) {
        initialSnippet = `Initial context provided: ${context.substring(0, 100)}`;
      }

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
          intelligenceSnippet: initialSnippet,
          lastActivityDetail: context ? `Contact created with note: ${context.substring(0, 50)}...` : 'Contact created',
          lastActivityAt: new Date()
        }
      });

      res.status(201).json({
        contact: newContact,
        message: 'Contact created successfully'
      });

      // Step 3: Proactive Enrichment - Trigger deep discovery pulse immediately
      // We don't await this to keep the response snappy
      askZenaService.runDiscovery(req.user.userId, newContact.id).catch(err => {
        console.error(`[Contacts] Neural pulse failed for new contact ${newContact.id}:`, err);
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

      // Apply search filter (Brain-First Semantic Logic)
      if (search) {
        const query = search as string;
        console.log(`[Contacts] Parsing semantic search query: "${query}"`);

        // Use Zena's Brain to parse intent even in the main search bar
        const semanticFilters = await askZenaService.parseSearchQuery(req.user.userId, query);
        console.log('[Contacts] Semantic filters extracted:', JSON.stringify(semanticFilters));

        // Augment existing filters with brain-parsed intent
        if (semanticFilters.role !== 'all') {
          where.role = semanticFilters.role;
        }
        if (semanticFilters.category !== 'all') {
          where.zenaCategory = semanticFilters.category;
        }
        if (semanticFilters.dealStage !== 'all') {
          where.deals = {
            some: {
              stage: semanticFilters.dealStage
            }
          };
        }

        const searchTerm = (semanticFilters.keywords || query).toLowerCase();

        // Search by name, email, intelligence snippet, or activity details
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
          {
            intelligenceSnippet: {
              contains: searchTerm,
              mode: 'insensitive',
            }
          },
          {
            // CRITICAL: Search lastActivityDetail for property/location mentions
            // e.g., "Inquired about 24 Ponsonby Road, Ponsonby"
            lastActivityDetail: {
              contains: searchTerm,
              mode: 'insensitive',
            }
          }
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

      // Apply Zena Intelligence Category Filter (Server-Side)
      // category: 'HOT_LEAD', 'HIGH_INTENT', 'COLD_NURTURE', 'PULSE'
      if (req.query.category) {
        const category = req.query.category as string;
        if (category !== 'all') {
          where.zenaCategory = category;
        }
      }

      // Apply Deal Stage Filter
      if (req.query.dealStage) {
        where.deals = {
          some: {
            stage: req.query.dealStage as string
          }
        };
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

      // Map dealStage to top level for frontend simplicity
      const mappedContacts = contacts.map(c => ({
        ...c,
        dealStage: c.deals?.[0]?.stage || undefined
      }));

      res.status(200).json({
        contacts: mappedContacts,
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
   * POST /api/contacts/:id/discovery
   * Trigger manual discovery pulse for relationship intel
   */
  async runDiscovery(req: Request, res: Response): Promise<void> {
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

      // Trigger neural pulse
      // We await this one because it's a manual trigger and user expects feedback
      await askZenaService.runDiscovery(req.user.userId, id);

      res.status(200).json({
        message: 'Neural pulse complete. Relationship intel updated.',
      });
    } catch (error) {
      console.error('Run discovery error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to run discovery',
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
      console.log('[Bulk Update] Received request for IDs:', ids?.length, 'Data:', JSON.stringify(data));

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

      // Calculate common snippets and categories for the batch
      const intelligenceUpdate = data.zenaIntelligence || {};

      // Generate a manual update snippet to ensure UI reflects change
      const rolePart = data.role ? `Role updated to ${data.role}. ` : '';
      const timelinePart = intelligenceUpdate.timeline ? `Priority: ${intelligenceUpdate.timeline}. ` : '';
      const manualSnippet = `${rolePart}${timelinePart}Zena intelligence manually synchronized.`.trim();

      // Use a transaction to update all contacts
      await prisma.$transaction(
        ids.map((id) => {
          const contact = contacts.find((c) => c.id === id);
          const currentIntel = (contact?.zenaIntelligence as any) || {};
          const newIntel = { ...currentIntel, ...intelligenceUpdate };

          // Determine Zena Category based on the new intelligence or existing one
          let inferredCategory = contact?.zenaCategory || 'PULSE';
          if (intelligenceUpdate.timeline) {
            const timeline = intelligenceUpdate.timeline;
            if (timeline.includes('ASAP')) inferredCategory = 'HIGH_INTENT';
            else if (timeline.includes('3 months')) inferredCategory = 'HOT_LEAD';
            else if (timeline.includes('Watching')) inferredCategory = 'COLD_NURTURE';
            else inferredCategory = 'PULSE';
          }

          return prisma.contact.update({
            where: { id },
            data: {
              ...updateData,
              zenaIntelligence: newIntel,
              zenaCategory: inferredCategory as any,
              intelligenceSnippet: manualSnippet,
              categorizedAt: new Date()
            },
          });
        })
      );

      // Create timeline events for the updates
      await prisma.timelineEvent.createMany({
        data: ids.map((id) => ({
          userId: req.user!.userId,
          type: 'note',
          entityType: 'contact',
          entityId: id,
          summary: 'Contact intelligence updated via batch action',
          content: manualSnippet,
          timestamp: new Date(),
        })),
      });

      // Broadcast changes to ensure immediate UI feedback (all at once)
      const batchUpdatePayload = ids.map(id => {
        const contact = contacts.find(c => c.id === id);
        let inferredCategory = contact?.zenaCategory || 'PULSE';
        if (intelligenceUpdate.timeline) {
          const timeline = intelligenceUpdate.timeline;
          if (timeline.includes('ASAP')) inferredCategory = 'HIGH_INTENT';
          else if (timeline.includes('3 months')) inferredCategory = 'HOT_LEAD';
          else if (timeline.includes('Watching')) inferredCategory = 'COLD_NURTURE';
          else inferredCategory = 'PULSE';
        }

        return {
          contactId: id,
          zenaCategory: inferredCategory,
          intelligenceSnippet: manualSnippet,
          role: data.role || contact?.role
        };
      });

      console.log(`[Bulk Update] Broadcasting batch update for ${ids.length} contacts...`);
      websocketService.broadcastToUser(req.user!.userId, 'batch.contacts.updated', { updates: batchUpdatePayload });

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

      // Step 1: Voice Note Auto-Extraction
      // Trigger a neural discovery pulse if this is a voice note
      // This extracts budget, intent, and location from the transcript
      if (source === 'voice_note' && req.user) {
        // We run this in the background to not block the response
        askZenaService.runDiscovery(req.user.userId, id).catch(err => {
          console.error('[Intelligence] Voice note extraction pulse failed:', err);
        });
      }

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

      // Trigger AI intelligence update and DEEP DISCOVERY in background
      // This implements "Active Intel Digestion" - Zena re-analyzes immediately after a note is added
      askZenaService.runDiscovery(req.user.userId, id).catch(err =>
        console.error(`[Active Intel] Failed to refresh intelligence for contact ${id}:`, err)
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
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await neuralScorerService.calculateEngagement(id);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Get contact engagement error:', error);
      res.status(500).json({ error: 'Failed' });
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
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { contactIds } = req.body;
      if (!contactIds || !Array.isArray(contactIds)) {
        res.status(400).json({ error: 'contactIds array is required' });
        return;
      }

      const engagementData = await neuralScorerService.calculateBatch(req.user.userId, contactIds);
      res.status(200).json({ engagementData });
    } catch (error) {
      console.error('Get batch engagement error:', error);
      res.status(500).json({ error: 'Failed' });
    }
  }
}

export const contactsController = new ContactsController();
