import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { threadLinkingService } from '../services/thread-linking.service.js';

const prisma = new PrismaClient();

export class ContactsController {
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
      const { name, emails, phones, role } = req.body;

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
        const validRoles = ['buyer', 'vendor', 'market', 'other'];
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
}

export const contactsController = new ContactsController();
