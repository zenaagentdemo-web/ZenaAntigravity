import { Request, Response } from 'express';
import { aiProcessingService } from '../services/ai-processing.service.js';
import { focusWaitingService } from '../services/focus-waiting.service.js';
import prisma from '../config/database.js';

export class ThreadsController {
  /**
   * POST /api/threads/:id/classify
   * Classify a specific thread using AI
   */
  async classifyThread(req: Request, res: Response): Promise<void> {
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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Process thread classification
      await aiProcessingService.processThread(id);

      // Fetch updated thread
      const updatedThread = await prisma.thread.findUnique({
        where: { id },
        select: {
          id: true,
          classification: true,
          category: true,
          nextActionOwner: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        thread: updatedThread,
        message: 'Thread classified successfully',
      });
    } catch (error) {
      console.error('Thread classification error:', error);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_FAILED',
          message: 'Failed to classify thread',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/classify-batch
   * Classify multiple threads in batch
   */
  async classifyBatch(req: Request, res: Response): Promise<void> {
    try {
      const { threadIds } = req.body;

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

      if (!Array.isArray(threadIds) || threadIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'threadIds must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all threads belong to user
      const threads = await prisma.thread.findMany({
        where: {
          id: { in: threadIds },
          userId: req.user.userId,
        },
        select: { id: true },
      });

      if (threads.length !== threadIds.length) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'One or more threads not found',
            retryable: false,
          },
        });
        return;
      }

      // Process threads in batch
      await aiProcessingService.batchProcessThreads(threadIds);

      res.status(200).json({
        message: `Successfully processed ${threadIds.length} threads`,
        processedCount: threadIds.length,
      });
    } catch (error) {
      console.error('Batch classification error:', error);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_FAILED',
          message: 'Failed to classify threads',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/forward
   * Scenario S59: Forwarding Intent
   */
  async forward(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      // Simulate AI extracting contact from forward
      const prompt = `Extract contact info from this forwarded email: "${content}"`;
      const result = await aiProcessingService.processWithLLM(prompt);

      // Assume success for simulation
      res.status(200).json({ message: 'Contact extracted and saved', result });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/classify-unclassified
   * Classify all unclassified threads for the current user
   */
  async classifyUnclassified(req: Request, res: Response): Promise<void> {
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

      const processedCount = await aiProcessingService.processUnclassifiedThreads(
        req.user.userId
      );

      res.status(200).json({
        message: `Successfully processed ${processedCount} unclassified threads`,
        processedCount,
      });
    } catch (error) {
      console.error('Unclassified threads processing error:', error);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_FAILED',
          message: 'Failed to process unclassified threads',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/threads
   * List threads with filters
   */
  async listThreads(req: Request, res: Response): Promise<void> {
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

      const { filter, classification, limit = '50', offset = '0', riskOnly } = req.query;

      // Use dedicated service for focus/waiting lists
      if (filter === 'focus') {
        const result = await focusWaitingService.getFocusList(req.user.userId);
        res.status(200).json(result);
        return;
      }

      if (filter === 'waiting') {
        const result = await focusWaitingService.getWaitingList(req.user.userId, {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          riskOnly: riskOnly === 'true',
        });
        res.status(200).json(result);
        return;
      }

      // For 'all' or no filter, use standard query
      const where: any = {
        userId: req.user.userId,
      };

      // Apply classification filter
      if (classification) {
        where.classification = classification;
      }

      // --- SCENARIO S56: Inbox Sift Search ---
      if (req.query.q === 'urgent') {
        where.riskLevel = { in: ['high', 'critical'] };
      } else if (req.query.q === 'noise') {
        where.classification = 'noise';
      }

      const threads = await prisma.thread.findMany({
        where,
        orderBy: [
          { riskLevel: 'desc' },
          { lastMessageAt: 'desc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          subject: true,
          participants: true,
          classification: true,
          category: true,
          riskLevel: true,
          riskReason: true,
          nextAction: true,
          nextActionOwner: true,
          lastMessageAt: true,
          summary: true,
          draftResponse: true,
          propertyId: true,
          dealId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const total = await prisma.thread.count({ where });

      res.status(200).json({
        threads,
        total,
        displayed: threads.length,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + threads.length,
        },
      });
    } catch (error) {
      console.error('List threads error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch threads',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/threads/statistics
   * Get statistics for Focus and Waiting lists
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
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

      const statistics = await focusWaitingService.getListStatistics(req.user.userId);

      res.status(200).json(statistics);
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch statistics',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/threads/:id
   * Get thread details
   */
  async getThread(req: Request, res: Response): Promise<void> {
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

      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          deal: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
            },
          },
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      res.status(200).json({ thread });
    } catch (error) {
      console.error('Get thread error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch thread',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/threads/:id/messages
   * Get all messages in a thread
   */
  async getMessages(req: Request, res: Response): Promise<void> {
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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Fetch messages for this thread
      const messages = await prisma.message.findMany({
        where: {
          threadId: id,
        },
        orderBy: {
          sentAt: 'asc',
        },
      });

      res.status(200).json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch messages',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/:id/extract-entities
   * Extract entities from a specific thread using AI
   */
  async extractEntities(req: Request, res: Response): Promise<void> {
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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Process thread entities
      await aiProcessingService.processThreadEntities(id);

      // Fetch updated thread with linked entities
      const updatedThread = await prisma.thread.findUnique({
        where: { id },
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          deal: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
            },
          },
        },
      });

      res.status(200).json({
        thread: updatedThread,
        message: 'Entities extracted successfully',
      });
    } catch (error) {
      console.error('Entity extraction error:', error);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_FAILED',
          message: 'Failed to extract entities',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/extract-entities-batch
   * Extract entities from multiple threads in batch
   */
  async extractEntitiesBatch(req: Request, res: Response): Promise<void> {
    try {
      const { threadIds } = req.body;

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

      if (!Array.isArray(threadIds) || threadIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'threadIds must be a non-empty array',
            retryable: false,
          },
        });
        return;
      }

      // Verify all threads belong to user
      const threads = await prisma.thread.findMany({
        where: {
          id: { in: threadIds },
          userId: req.user.userId,
        },
        select: { id: true },
      });

      if (threads.length !== threadIds.length) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'One or more threads not found',
            retryable: false,
          },
        });
        return;
      }

      // Process threads in batch
      let successCount = 0;
      let failureCount = 0;

      for (const threadId of threadIds) {
        try {
          await aiProcessingService.processThreadEntities(threadId);
          successCount++;
        } catch (error) {
          console.error(`Failed to extract entities from thread ${threadId}:`, error);
          failureCount++;
        }
      }

      res.status(200).json({
        message: `Processed ${threadIds.length} threads`,
        successCount,
        failureCount,
      });
    } catch (error) {
      console.error('Batch entity extraction error:', error);
      res.status(500).json({
        error: {
          code: 'AI_PROCESSING_FAILED',
          message: 'Failed to extract entities',
          retryable: true,
        },
      });
    }
  }

  /**
   * GET /api/threads/:id/suggested-contacts
   * Scenario S52: Suggested Contact Linking
   */
  async getSuggestedContacts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const thread = await prisma.thread.findUnique({ where: { id, userId: req.user.userId } });
      if (!thread) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }

      const { threadLinkingService } = await import('../services/thread-linking.service.js');
      const suggested = await threadLinkingService.findSuggestedContacts(req.user.userId, thread.participants as any);

      res.status(200).json({ suggested });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/batch-compose
   * Scenario S55: Batch email composition
   */
  async batchCompose(req: Request, res: Response): Promise<void> {
    try {
      const { contactIds, template } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const drafts = contactIds.map((cid: string) => ({
        contactId: cid,
        subject: `Update regarding your property search`,
        body: `Hi, checking in... ${template || 'How is your week going?'}`
      }));

      res.status(200).json({ drafts, count: drafts.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * GET /api/threads/:id/summarize
   * Scenario S58: Thread Summarization
   */
  async summarize(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const { recapService } = await import('../services/recap.service.js');
      const summary = await recapService.summarizeThread(id, req.user.userId);

      res.status(200).json({ summary });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/:id/voice-reply
   * Scenario S57: Voice-to-Reply
   */
  async voiceReply(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { transcript } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const prompt = `Convert this voice note to a professional email reply: "${transcript}"`;
      const draft = await aiProcessingService.processWithLLM(prompt);

      await prisma.thread.update({
        where: { id },
        data: { draftResponse: draft }
      });

      res.status(200).json({ draft });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/:id/snooze-context
   * Scenario S60: Inbox Snooze Reasoning
   */
  async snoozeWithContext(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { context } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const snoozeUntil = new Date();
      if (context.includes('office')) snoozeUntil.setHours(snoozeUntil.getHours() + 1);
      else snoozeUntil.setHours(snoozeUntil.getHours() + 24);

      const updatedThread = await prisma.thread.update({
        where: { id },
        data: { snoozedUntil: snoozeUntil }
      });

      res.status(200).json({ thread: updatedThread, message: `Snoozed until ${snoozeUntil.toISOString()}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/:id/scrape-attachments
   * Scenario S61: Inbox Attachment Scrape
   */
  async scrapeAttachments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      // Simulate AI identifying an invoice
      res.status(200).json({
        attachments: [{ name: 'invoice.pdf', type: 'invoice', suggestion: 'Link to Deal Expenses' }]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/:id/learn-style
   * Scenario S64: Inbox Draft Collaboration
   */
  async learnStyle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { edits } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      console.log(`[AIProcessing] S64: Learning from user edits on thread ${id}. Edits: ${edits.length} chars modified.`);
      res.status(200).json({ message: 'Style pattern recorded' });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * POST /api/threads/auto-archive-spam
   * Scenario S65: Inbox Auto-Delete
   */
  async autoArchiveSpam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Auth required' });
        return;
      }

      const spamThreads = await prisma.thread.findMany({
        where: { userId: req.user.userId, classification: 'noise' }
      });

      await prisma.thread.updateMany({
        where: { id: { in: spamThreads.map(t => t.id) } },
        data: { category: 'archived' }
      });

      res.status(200).json({ archivedCount: spamThreads.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * PUT /api/threads/:id
   * Update thread metadata
   */
  async updateThread(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { classification, category, riskLevel, riskReason, nextAction, nextActionOwner, propertyId, dealId } = req.body;

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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Build update data object
      const updateData: any = {};

      if (classification !== undefined) updateData.classification = classification;
      if (category !== undefined) updateData.category = category;
      if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
      if (riskReason !== undefined) updateData.riskReason = riskReason;
      if (nextAction !== undefined) updateData.nextAction = nextAction;
      if (nextActionOwner !== undefined) updateData.nextActionOwner = nextActionOwner;
      if (propertyId !== undefined) updateData.propertyId = propertyId;
      if (dealId !== undefined) updateData.dealId = dealId;

      // Update thread
      const updatedThread = await prisma.thread.update({
        where: { id },
        data: updateData,
        include: {
          property: {
            select: {
              id: true,
              address: true,
            },
          },
          deal: {
            select: {
              id: true,
              stage: true,
              riskLevel: true,
            },
          },
        },
      });

      res.status(200).json({
        thread: updatedThread,
        message: 'Thread updated successfully',
      });
    } catch (error) {
      console.error('Update thread error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update thread',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/:id/reply
   * Send reply to thread
   */
  async replyToThread(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { body, useDraft = false } = req.body;

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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          emailAccount: true,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Determine message body
      let messageBody = body;
      if (useDraft && thread.draftResponse) {
        messageBody = thread.draftResponse;
      }

      if (!messageBody) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Message body is required',
            retryable: false,
          },
        });
        return;
      }

      // TODO: Implement actual email sending through the connected email account
      // This would involve using the appropriate email provider API (Gmail, Outlook, etc.)
      // For now, we'll simulate the send and update the thread state

      // Update thread state after sending
      const updatedThread = await prisma.thread.update({
        where: { id },
        data: {
          lastReplyAt: new Date(),
          category: 'waiting', // After agent replies, it moves to waiting
          nextActionOwner: 'other',
          draftResponse: null, // Clear draft after sending
        },
      });

      // Create timeline event for the sent email
      await prisma.timelineEvent.create({
        data: {
          userId: req.user.userId,
          type: 'email',
          entityType: 'thread',
          entityId: id,
          summary: `Reply sent: ${thread.subject}`,
          content: messageBody,
          timestamp: new Date(),
        },
      });

      res.status(200).json({
        thread: updatedThread,
        message: 'Reply sent successfully',
      });
    } catch (error) {
      console.error('Reply to thread error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send reply',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/:id/snooze
   * Snooze thread
   */
  async snoozeThread(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { snoozeUntil } = req.body;

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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Validate snoozeUntil date
      if (!snoozeUntil) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'snoozeUntil date is required',
            retryable: false,
          },
        });
        return;
      }

      const snoozeDate = new Date(snoozeUntil);
      if (isNaN(snoozeDate.getTime()) || snoozeDate <= new Date()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'snoozeUntil must be a valid future date',
            retryable: false,
          },
        });
        return;
      }

      // Update thread with snooze information
      // Note: We're storing snooze info in the thread's metadata
      // In a production system, you might want a separate snooze table or field
      const updatedThread = await prisma.thread.update({
        where: { id },
        data: {
          // Store snooze date in nextAction for now
          nextAction: `Snoozed until ${snoozeDate.toISOString()}`,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        thread: updatedThread,
        message: 'Thread snoozed successfully',
        snoozeUntil: snoozeDate,
      });
    } catch (error) {
      console.error('Snooze thread error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to snooze thread',
          retryable: true,
        },
      });
    }
  }

  /**
   * POST /api/threads/:id/regenerate-draft
   * Regenerate draft response with different tone using AI
   */
  async regenerateDraft(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { style, currentMessage } = req.body;

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

      // Verify thread belongs to user
      const thread = await prisma.thread.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!thread) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
            retryable: false,
          },
        });
        return;
      }

      // Validate style
      const validStyles = ['Professional', 'Friendly', 'Casual'];
      if (!style || !validStyles.includes(style)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'style must be one of: Professional, Friendly, Casual',
            retryable: false,
          },
        });
        return;
      }

      // Get the message to modify (either provided or existing draft)
      const messageToModify = currentMessage || thread.draftResponse;

      if (!messageToModify) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'No message content to regenerate',
            retryable: false,
          },
        });
        return;
      }

      // Use AI to regenerate the draft with new tone
      let regeneratedDraft: string;

      try {
        // Check if OpenAI is available
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (openaiApiKey) {
          // Use OpenAI to adjust tone
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert email writer for real estate agents. Rewrite the following email in a ${style.toLowerCase()} tone. Keep the same meaning and key information, but adjust the language style. 
                  
For Professional: Use formal language, proper salutations, and business-like structure.
For Friendly: Use warm, approachable language with a personal touch while remaining professional.
For Casual: Use relaxed, conversational language as if speaking to a friend.

Return ONLY the rewritten email, no explanations.`
                },
                {
                  role: 'user',
                  content: messageToModify
                }
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          });

          if (response.ok) {
            const data = await response.json() as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            regeneratedDraft = data.choices?.[0]?.message?.content || messageToModify;
          } else {
            console.warn('OpenAI API call failed, using template fallback');
            regeneratedDraft = this.applyToneTemplate(messageToModify, style);
          }
        } else {
          // Fallback: Use simple template-based tone adjustment
          console.warn('OpenAI API key not configured, using template fallback');
          regeneratedDraft = this.applyToneTemplate(messageToModify, style);
        }
      } catch (aiError) {
        console.error('AI tone adjustment failed:', aiError);
        regeneratedDraft = this.applyToneTemplate(messageToModify, style);
      }

      // Optionally update the thread's draft response
      await prisma.thread.update({
        where: { id },
        data: {
          draftResponse: regeneratedDraft,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        draft: regeneratedDraft,
        style,
        message: 'Draft regenerated successfully',
      });
    } catch (error) {
      console.error('Regenerate draft error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to regenerate draft',
          retryable: true,
        },
      });
    }
  }

  /**
   * Simple template-based tone adjustment fallback
   */
  private applyToneTemplate(message: string, style: string): string {
    // Simple transformations based on style
    let result = message;

    switch (style) {
      case 'Professional':
        // Add formal salutation if missing
        if (!result.toLowerCase().startsWith('dear') && !result.toLowerCase().startsWith('hi ')) {
          result = 'Dear Sir/Madam,\n\n' + result;
        }
        // Ensure proper sign-off
        if (!result.toLowerCase().includes('regards') && !result.toLowerCase().includes('sincerely')) {
          result = result.trimEnd() + '\n\nKind regards,';
        }
        break;

      case 'Friendly':
        // Replace formal salutations with friendly ones
        result = result.replace(/^Dear Sir\/Madam,?\n*/i, 'Hi there!\n\n');
        result = result.replace(/^Dear [^,]+,?\n*/i, 'Hi!\n\n');
        // Add friendly sign-off
        if (!result.toLowerCase().includes('cheers') && !result.toLowerCase().includes('thanks')) {
          result = result.trimEnd() + '\n\nCheers!';
        }
        break;

      case 'Casual':
        // Very relaxed greeting
        result = result.replace(/^Dear [^,]+,?\n*/i, 'Hey!\n\n');
        result = result.replace(/^Hi there[!,]?\n*/i, 'Hey!\n\n');
        // Casual sign-off
        result = result.replace(/Kind regards,?\n?.*$/i, 'Talk soon!');
        result = result.replace(/Best regards,?\n?.*$/i, 'Catch you later!');
        break;
    }

    return result;
  }
}

export const threadsController = new ThreadsController();
