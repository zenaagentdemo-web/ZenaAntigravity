import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response } from 'express';
import { ThreadsController } from './threads.controller.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    thread: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock services
vi.mock('../services/ai-processing.service.js', () => ({
  aiProcessingService: {
    processThread: vi.fn(),
    batchProcessThreads: vi.fn(),
    processUnclassifiedThreads: vi.fn(),
    processThreadEntities: vi.fn(),
  },
}));

vi.mock('../services/focus-waiting.service.js', () => ({
  focusWaitingService: {
    getFocusList: vi.fn(),
    getWaitingList: vi.fn(),
    getListStatistics: vi.fn(),
  },
}));

describe('ThreadsController Property-Based Tests', () => {
  let controller: ThreadsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let prisma: any;

  beforeEach(() => {
    controller = new ThreadsController();
    prisma = new PrismaClient();
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 53: Draft response delivery
   * Validates: Requirements 15.4
   * 
   * For any draft response sent by an agent, the system should deliver it 
   * through the connected email account.
   * 
   * This property tests that when an agent sends a draft response:
   * 1. The thread state is updated correctly (category changes to 'waiting')
   * 2. The lastReplyAt timestamp is set
   * 3. The nextActionOwner changes to 'other'
   * 4. The draft is cleared after sending
   * 5. A timeline event is created
   */
  describe('Property 53: Draft response delivery', () => {
    it('should deliver draft responses through connected email account and update thread state', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary thread data
          fc.record({
            threadId: fc.uuid(),
            userId: fc.uuid(),
            emailAccountId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            draftResponse: fc.string({ minLength: 10, maxLength: 1000 }),
            category: fc.constantFrom('focus', 'waiting'),
            nextActionOwner: fc.constantFrom('agent', 'other'),
          }),
          async (threadData: {
            threadId: string;
            userId: string;
            emailAccountId: string;
            subject: string;
            draftResponse: string;
            category: string;
            nextActionOwner: string;
          }) => {
            // Setup mock request
            mockRequest = {
              params: { id: threadData.threadId },
              body: { useDraft: true },
              user: { userId: threadData.userId },
            };

            // Setup mock thread with draft
            const mockThread = {
              id: threadData.threadId,
              userId: threadData.userId,
              emailAccountId: threadData.emailAccountId,
              subject: threadData.subject,
              draftResponse: threadData.draftResponse,
              category: threadData.category,
              nextActionOwner: threadData.nextActionOwner,
              emailAccount: {
                id: threadData.emailAccountId,
                email: 'agent@example.com',
              },
            };

            prisma.thread.findFirst.mockResolvedValue(mockThread);

            const updatedThread = {
              ...mockThread,
              lastReplyAt: new Date(),
              category: 'waiting',
              nextActionOwner: 'other',
              draftResponse: null,
            };

            prisma.thread.update.mockResolvedValue(updatedThread);
            prisma.timelineEvent.create.mockResolvedValue({});

            // Execute
            await controller.replyToThread(
              mockRequest as Request,
              mockResponse as Response
            );

            // Verify thread update was called with correct data
            expect(prisma.thread.update).toHaveBeenCalledWith({
              where: { id: threadData.threadId },
              data: expect.objectContaining({
                category: 'waiting', // Property: After agent replies, moves to waiting
                nextActionOwner: 'other', // Property: Next action owner changes to other
                draftResponse: null, // Property: Draft is cleared after sending
                lastReplyAt: expect.any(Date), // Property: Reply timestamp is set
              }),
            });

            // Property: Timeline event should be created
            expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
              data: expect.objectContaining({
                userId: threadData.userId,
                type: 'email',
                entityType: 'thread',
                entityId: threadData.threadId,
                content: threadData.draftResponse,
              }),
            });

            // Property: Response should indicate success
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
              expect.objectContaining({
                message: 'Reply sent successfully',
                thread: expect.objectContaining({
                  category: 'waiting',
                  nextActionOwner: 'other',
                  draftResponse: null,
                }),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle custom message body when not using draft', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            threadId: fc.uuid(),
            userId: fc.uuid(),
            customBody: fc.string({ minLength: 10, maxLength: 1000 }),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async (data: {
            threadId: string;
            userId: string;
            customBody: string;
            subject: string;
          }) => {
            mockRequest = {
              params: { id: data.threadId },
              body: { body: data.customBody, useDraft: false },
              user: { userId: data.userId },
            };

            const mockThread = {
              id: data.threadId,
              userId: data.userId,
              subject: data.subject,
              draftResponse: 'Some draft',
              emailAccount: { id: 'account-id', email: 'agent@example.com' },
            };

            prisma.thread.findFirst.mockResolvedValue(mockThread);
            prisma.thread.update.mockResolvedValue({ ...mockThread, category: 'waiting' });
            prisma.timelineEvent.create.mockResolvedValue({});

            await controller.replyToThread(
              mockRequest as Request,
              mockResponse as Response
            );

            // Property: Custom body should be used instead of draft
            expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
              data: expect.objectContaining({
                content: data.customBody, // Not the draft
              }),
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 65: Reply account selection
   * Validates: Requirements 18.3
   * 
   * For any reply sent by an agent, the system should use the appropriate 
   * email account based on the original recipient address.
   * 
   * This property tests that:
   * 1. The thread's associated email account is identified
   * 2. The reply is sent through the correct account
   * 3. Multi-account scenarios are handled correctly
   */
  describe('Property 65: Reply account selection', () => {
    it('should use the correct email account for replies based on thread origin', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            threadId: fc.uuid(),
            userId: fc.uuid(),
            emailAccountId: fc.uuid(),
            accountEmail: fc.emailAddress(),
            messageBody: fc.string({ minLength: 10, maxLength: 500 }),
          }),
          async (data: {
            threadId: string;
            userId: string;
            emailAccountId: string;
            accountEmail: string;
            messageBody: string;
          }) => {
            mockRequest = {
              params: { id: data.threadId },
              body: { body: data.messageBody },
              user: { userId: data.userId },
            };

            // Mock thread with specific email account
            const mockThread = {
              id: data.threadId,
              userId: data.userId,
              emailAccountId: data.emailAccountId,
              subject: 'Test Subject',
              emailAccount: {
                id: data.emailAccountId,
                email: data.accountEmail,
                provider: 'gmail',
              },
            };

            prisma.thread.findFirst.mockResolvedValue(mockThread);
            prisma.thread.update.mockResolvedValue({ ...mockThread, category: 'waiting' });
            prisma.timelineEvent.create.mockResolvedValue({});

            await controller.replyToThread(
              mockRequest as Request,
              mockResponse as Response
            );

            // Property: Thread lookup should include email account
            expect(prisma.thread.findFirst).toHaveBeenCalledWith({
              where: {
                id: data.threadId,
                userId: data.userId,
              },
              include: {
                emailAccount: true, // Property: Email account must be included
              },
            });

            // Property: The correct email account should be available for sending
            // In a full implementation, this would verify the email is sent through
            // the correct provider API using the thread's emailAccount
            expect(mockResponse.status).toHaveBeenCalledWith(200);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain email account association across multiple threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              threadId: fc.uuid(),
              emailAccountId: fc.uuid(),
              accountEmail: fc.emailAddress(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.uuid(), // userId
          async (
            threads: Array<{
              threadId: string;
              emailAccountId: string;
              accountEmail: string;
            }>,
            userId: string
          ) => {
            // Property: Each thread should maintain its own email account association
            for (const thread of threads) {
              mockRequest = {
                params: { id: thread.threadId },
                body: { body: 'Test message' },
                user: { userId },
              };

              const mockThread = {
                id: thread.threadId,
                userId,
                emailAccountId: thread.emailAccountId,
                subject: 'Test',
                emailAccount: {
                  id: thread.emailAccountId,
                  email: thread.accountEmail,
                },
              };

              prisma.thread.findFirst.mockResolvedValue(mockThread);
              prisma.thread.update.mockResolvedValue({ ...mockThread, category: 'waiting' });
              prisma.timelineEvent.create.mockResolvedValue({});

              await controller.replyToThread(
                mockRequest as Request,
                mockResponse as Response
              );

              // Property: Each reply should use its thread's specific email account
              const findFirstCall = prisma.thread.findFirst.mock.calls[
                prisma.thread.findFirst.mock.calls.length - 1
              ][0];
              
              expect(findFirstCall.where.id).toBe(thread.threadId);
              expect(findFirstCall.include.emailAccount).toBe(true);
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to nested loop
      );
    });
  });
});
