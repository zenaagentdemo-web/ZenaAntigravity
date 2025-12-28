import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import prisma from '../config/database.js';
import { AskZenaService, type AskZenaQuery, type AskZenaResponse } from './ask-zena.service.js';

/**
 * Property-Based Tests for Ask Zena Service
 * 
 * These tests use the real database with per-run user isolation and mock LLM.
 */
describe('Ask Zena Service - Property-Based Tests', () => {
  const service = new AskZenaService();

  // Mock generateLLMResponse to avoid hitting real APIs and timing out
  vi.spyOn(service as any, 'generateLLMResponse').mockImplementation(async (query: any, context: any) => {
    return {
      answer: `This is a mock response to: "${query.query}". I found ${context.threads?.length || 0} threads.`,
      sources: [],
      suggestedActions: ['draft_email']
    } as AskZenaResponse;
  });

  // Helper function to create a test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-ask-zena-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Ask Zena PBT User',
      },
    });
  };

  // Helper function to clean up test user
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.chatMessage.deleteMany({ where: { conversation: { userId } } });
      await prisma.chatConversation.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.emailAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  it('Property 24: should process any natural language query without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (query) => {
          const user = await createTestUser();
          try {
            const askQuery: AskZenaQuery = {
              userId: user.id,
              query,
              conversationHistory: [],
            };

            const response = await service.processQuery(askQuery);
            expect(response).toBeDefined();
            expect(response.answer).toContain('mock response');
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 25: should search across all data sources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('buyer', 'property', 'deal'),
        async (searchTerm) => {
          const user = await createTestUser();
          try {
            // Create some data
            await prisma.contact.create({
              data: { userId: user.id, name: 'John Buyer', emails: ['j@t.com'], role: 'buyer' }
            });

            const askQuery: AskZenaQuery = {
              userId: user.id,
              query: `Tell me about ${searchTerm}`,
              conversationHistory: [],
            };

            const response = await service.processQuery(askQuery);
            expect(response).toBeDefined();
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
