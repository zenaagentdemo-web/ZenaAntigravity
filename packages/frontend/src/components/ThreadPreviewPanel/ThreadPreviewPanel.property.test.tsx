/**
 * Property-Based Tests for ThreadPreviewPanel Component
 * 
 * Tests correctness properties for the ThreadPreviewPanel component using fast-check.
 * 
 * **Feature: enhanced-new-page**
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { ThreadPreviewPanel, limitSuggestedReplies } from './ThreadPreviewPanel';
import { 
  Thread, 
  Participant, 
  ThreadClassification, 
  RiskLevel, 
  DealStage,
  MessagePreview
} from '../../models/newPage.types';

// ============================================================================
// Custom Arbitraries for Thread Generation
// ============================================================================

const riskLevelArb = fc.constantFrom<RiskLevel>('none', 'low', 'medium', 'high');
const classificationArb = fc.constantFrom<ThreadClassification>('buyer', 'vendor', 'market', 'lawyer_broker', 'noise');
const dealStageArb = fc.constantFrom<DealStage>('inquiry', 'viewing', 'offer', 'negotiation', 'conditional', 'unconditional', 'settled');

const participantArb: fc.Arbitrary<Participant> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress(),
  role: fc.option(fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker', 'other') as fc.Arbitrary<'buyer' | 'vendor' | 'agent' | 'lawyer' | 'broker' | 'other'>),
});

// Generate timestamps within the last 7 days
const recentTimestampArb = fc.date({ 
  min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
  max: new Date() 
}).map(d => d.toISOString());

const messagePreviewArb: fc.Arbitrary<MessagePreview> = fc.record({
  id: fc.uuid(),
  senderId: fc.uuid(),
  senderName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  timestamp: recentTimestampArb,
  isFromUser: fc.boolean(),
});

const threadArbitrary: fc.Arbitrary<Thread> = fc.record({
  id: fc.uuid(),
  subject: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  participants: fc.array(participantArb, { minLength: 1, maxLength: 10 }),
  classification: classificationArb,
  riskLevel: riskLevelArb,
  riskReason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  lastMessageAt: recentTimestampArb,
  createdAt: recentTimestampArb,
  draftResponse: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
  summary: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
  aiSummary: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
  propertyId: fc.option(fc.uuid()),
  propertyAddress: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  dealId: fc.option(fc.uuid()),
  dealStage: fc.option(dealStageArb),
  messageCount: fc.integer({ min: 1, max: 100 }),
  unreadCount: fc.integer({ min: 0, max: 50 }),
  lastMessages: fc.option(fc.array(messagePreviewArb, { minLength: 0, maxLength: 5 })),
  suggestedReplies: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 6 })),
  priorityScore: fc.option(fc.float({ min: 0, max: 100 })),
  snoozedUntil: fc.option(recentTimestampArb),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('ThreadPreviewPanel Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 32: Single Expansion Invariant**
   * 
   * *For any* state of the thread list, at most one Thread_Card SHALL have isExpanded = true at any time.
   * 
   * This test verifies that the panel only renders when isExpanded is true.
   * 
   * **Validates: Requirements 11.3**
   */
  it('Property 32: Single Expansion Invariant - panel only renders when isExpanded is true', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const onClose = vi.fn();
        
        // When isExpanded is false, panel should not render
        const { container: containerClosed } = render(
          <ThreadPreviewPanel 
            thread={thread} 
            isExpanded={false} 
            onClose={onClose} 
          />
        );
        
        const panelClosed = containerClosed.querySelector('[data-testid="thread-preview-panel"]');
        expect(panelClosed).toBeNull();
        
        containerClosed.remove();
        
        // When isExpanded is true, panel should render
        const { container: containerOpen } = render(
          <ThreadPreviewPanel 
            thread={thread} 
            isExpanded={true} 
            onClose={onClose} 
          />
        );
        
        const panelOpen = containerOpen.querySelector('[data-testid="thread-preview-panel"]');
        expect(panelOpen).toBeTruthy();
        
        containerOpen.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: enhanced-new-page, Property 33: Expanded Panel Required Content**
   * 
   * *For any* expanded Thread_Preview_Panel, the panel SHALL contain: 
   * AI summary section, message previews section (if messages exist), 
   * and suggested replies section (if suggestedReplies exists).
   * 
   * **Validates: Requirements 11.2**
   */
  it('Property 33: Expanded Panel Required Content - AI summary section always present', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const onClose = vi.fn();
        
        const { container } = render(
          <ThreadPreviewPanel 
            thread={thread} 
            isExpanded={true} 
            onClose={onClose} 
          />
        );
        
        // AI summary section must always be present
        const aiSummarySection = container.querySelector('[data-testid="ai-summary-section"]');
        expect(aiSummarySection).toBeTruthy();
        
        // Summary text should match thread's aiSummary or summary
        const summaryText = container.querySelector('.thread-preview-panel__summary');
        expect(summaryText).toBeTruthy();
        const expectedSummary = thread.aiSummary || thread.summary;
        expect(summaryText?.textContent).toBe(expectedSummary);
        
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 33: Expanded Panel Required Content - message previews section when messages exist', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.array(messagePreviewArb, { minLength: 1, maxLength: 5 }),
        (baseThread, messages) => {
          const thread: Thread = { ...baseThread, lastMessages: messages };
          const onClose = vi.fn();
          
          const { container } = render(
            <ThreadPreviewPanel 
              thread={thread} 
              isExpanded={true} 
              onClose={onClose} 
            />
          );
          
          // Message previews section must be present when messages exist
          const messageSection = container.querySelector('[data-testid="message-previews-section"]');
          expect(messageSection).toBeTruthy();
          
          // Should show message preview items (max 2)
          const messagePreviews = container.querySelectorAll('[data-testid="message-preview"]');
          expect(messagePreviews.length).toBeGreaterThan(0);
          expect(messagePreviews.length).toBeLessThanOrEqual(2);
          
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 33: Expanded Panel Required Content - no message section when no messages', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        const thread: Thread = { ...baseThread, lastMessages: undefined };
        const onClose = vi.fn();
        
        const { container } = render(
          <ThreadPreviewPanel 
            thread={thread} 
            isExpanded={true} 
            onClose={onClose} 
          />
        );
        
        // Message previews section should NOT be present when no messages
        const messageSection = container.querySelector('[data-testid="message-previews-section"]');
        expect(messageSection).toBeNull();
        
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 33: Expanded Panel Required Content - suggested replies section when replies exist', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        (baseThread, replies) => {
          const thread: Thread = { ...baseThread, suggestedReplies: replies };
          const onClose = vi.fn();
          
          const { container } = render(
            <ThreadPreviewPanel 
              thread={thread} 
              isExpanded={true} 
              onClose={onClose} 
            />
          );
          
          // Suggested replies section must be present when replies exist
          const repliesSection = container.querySelector('[data-testid="suggested-replies-section"]');
          expect(repliesSection).toBeTruthy();
          
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: enhanced-new-page, Property 34: Suggested Reply Limit**
   * 
   * *For any* Thread_Preview_Panel displaying suggested replies, 
   * the number of displayed reply options SHALL be <= 3.
   * 
   * **Validates: Requirements 11.6**
   */
  it('Property 34: Suggested Reply Limit - displays at most 3 suggested replies', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
        (baseThread, replies) => {
          const thread: Thread = { ...baseThread, suggestedReplies: replies };
          const onClose = vi.fn();
          
          const { container } = render(
            <ThreadPreviewPanel 
              thread={thread} 
              isExpanded={true} 
              onClose={onClose} 
            />
          );
          
          // Count displayed reply chips
          const replyChips = container.querySelectorAll('[data-testid="reply-chip"]');
          
          // Should display at most 3 reply chips
          expect(replyChips.length).toBeLessThanOrEqual(3);
          
          // Should display correct number (min of actual replies and 3)
          const expectedCount = Math.min(replies.length, 3);
          expect(replyChips.length).toBe(expectedCount);
          
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34: Suggested Reply Limit - limitSuggestedReplies function limits to 3', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 20 }),
        (replies) => {
          const limited = limitSuggestedReplies(replies);
          
          // Should return at most 3 items
          expect(limited.length).toBeLessThanOrEqual(3);
          
          // Should return correct number
          const expectedLength = Math.min(replies.length, 3);
          expect(limited.length).toBe(expectedLength);
          
          // Items should match first N items from original array
          for (let i = 0; i < limited.length; i++) {
            expect(limited[i]).toBe(replies[i]);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34: Suggested Reply Limit - handles undefined/empty replies', () => {
    // Test with undefined
    const undefinedResult = limitSuggestedReplies(undefined);
    expect(undefinedResult).toEqual([]);
    
    // Test with empty array
    const emptyResult = limitSuggestedReplies([]);
    expect(emptyResult).toEqual([]);
  });
});
