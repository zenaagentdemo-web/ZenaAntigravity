import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AIProcessingService } from './ai-processing.service.js';
import type { ThreadData } from './ai-processing.service.js';

describe('AIProcessingService Property-Based Tests', () => {
  let aiService: AIProcessingService;

  beforeEach(() => {
    aiService = new AIProcessingService();

    // Mock callLLM to return valid JSON based on the prompt
    vi.spyOn(aiService as any, 'callLLM').mockImplementation(async (...args: any[]) => {
      const prompt = args[0] as string;
      if (prompt.includes('CLASSIFICATION RULES')) {
        return JSON.stringify({
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          confidence: 0.9,
          reasoning: 'Mocked reasoning'
        });
      }
      if (prompt.includes('CONTACTS:')) {
        return JSON.stringify({
          contacts: [{ name: 'Test User', email: 'test@example.com', role: 'buyer', confidence: 0.9 }],
          properties: [{ address: '123 Mock St', confidence: 0.9 }],
          dates: [],
          actions: [],
          dealStage: 'lead',
          riskSignal: { level: 'none', reason: '', confidence: 1.0 }
        });
      }
      return null; // Trigger fallback for drafts
    });
  });

  // Generator for thread data
  const meaningfulString = (min: number, max: number) =>
    fc.string({ minLength: min, maxLength: max })
      .filter(s => s.trim().length >= Math.min(min, 1));

  const threadDataArbitrary = fc.record({
    id: fc.uuid(),
    subject: meaningfulString(5, 200),
    participants: fc.array(
      fc.record({
        name: meaningfulString(3, 100),
        email: fc.emailAddress(),
        role: fc.option(fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker', 'other'), { nil: undefined }),
      }),
      { minLength: 1, maxLength: 10 }
    ),
    summary: meaningfulString(10, 500),
    lastMessageAt: fc.date(),
  });

  describe('Property 4: Thread classification completeness', () => {
    it('should classify every thread into exactly one valid category', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);
            const validClassifications = ['buyer', 'vendor', 'market', 'lawyer_broker', 'noise'];
            expect(validClassifications).toContain(result.classification);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 18: Focus thread draft generation', () => {
    it('should generate professional drafts', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const draft = await aiService.generateDraftResponse(threadData);
            expect(draft.length).toBeGreaterThan(20);
            const lowerDraft = draft.toLowerCase();
            const hasProfessionalTone = lowerDraft.includes('best regards') || lowerDraft.includes('received') || lowerDraft.includes('thank you');
            expect(hasProfessionalTone).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
