/**
 * Property-Based Tests for ThreadCard Component
 * 
 * Tests correctness properties for the ThreadCard component using fast-check.
 * 
 * **Feature: enhanced-new-page**
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { ThreadCard, formatParticipants } from './ThreadCard';
import { 
  Thread, 
  Participant, 
  ThreadClassification, 
  RiskLevel, 
  DealStage 
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
  lastMessages: fc.option(fc.array(fc.record({
    id: fc.uuid(),
    senderId: fc.uuid(),
    senderName: fc.string({ minLength: 1, maxLength: 50 }),
    content: fc.string({ minLength: 1, maxLength: 500 }),
    timestamp: recentTimestampArb,
    isFromUser: fc.boolean(),
  }), { minLength: 0, maxLength: 5 })),
  suggestedReplies: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 3 })),
  priorityScore: fc.option(fc.float({ min: 0, max: 100 })),
  snoozedUntil: fc.option(recentTimestampArb),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('ThreadCard Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 5: Thread Card Required Elements**
   * 
   * *For any* thread rendered as a Thread_Card, the card SHALL contain all required elements:
   * classification badge, subject line, at least one participant name, summary text, and timestamp.
   * 
   * **Validates: Requirements 3.1**
   */
  it('Property 5: Thread Card Required Elements - all required elements are present', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Classification badge must be present
        const classificationBadge = container.querySelector('[data-testid="classification-badge"]');
        expect(classificationBadge).toBeTruthy();
        expect(classificationBadge?.textContent).toBeTruthy();
        
        // Subject line must be present
        const subject = container.querySelector('[data-testid="subject"]');
        expect(subject).toBeTruthy();
        expect(subject?.textContent).toBe(thread.subject);
        
        // At least one participant name must be present
        const participants = container.querySelector('[data-testid="participants"]');
        expect(participants).toBeTruthy();
        expect(participants?.textContent).toBeTruthy();
        // Verify at least the first participant name is shown
        expect(participants?.textContent).toContain(thread.participants[0].name);
        
        // Summary text must be present
        const summary = container.querySelector('[data-testid="summary"]');
        expect(summary).toBeTruthy();
        const expectedSummary = thread.aiSummary || thread.summary;
        expect(summary?.textContent).toBe(expectedSummary);
        
        // Timestamp must be present
        const timestamp = container.querySelector('[data-testid="timestamp"]');
        expect(timestamp).toBeTruthy();
        expect(timestamp?.textContent).toBeTruthy();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Risk Level Indicator Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 3: Risk Level Indicator Styling**
   * 
   * *For any* thread with a non-none risk level, the rendered Thread_Card SHALL contain 
   * an Urgency_Indicator element with the correct color: high → #FF4444, medium → #FFAA00, low → #00FF88.
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 3: Risk Level Indicator Styling - risk indicator present with correct styling class', () => {
    const nonNoneRiskLevels: RiskLevel[] = ['low', 'medium', 'high'];
    
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.constantFrom<RiskLevel>(...nonNoneRiskLevels),
        (baseThread, riskLevel) => {
          const thread: Thread = { ...baseThread, riskLevel };
          
          const { container } = render(<ThreadCard thread={thread} />);
          
          // Risk indicator must be present for non-none risk levels
          const riskIndicator = container.querySelector('[data-testid="risk-indicator"]');
          expect(riskIndicator).toBeTruthy();
          
          // Verify correct CSS class is applied for the risk level
          expect(riskIndicator?.classList.contains(`thread-card__risk--${riskLevel}`)).toBe(true);
          
          // Verify the risk dot element exists (for animation)
          const riskDot = riskIndicator?.querySelector('.thread-card__risk-dot');
          expect(riskDot).toBeTruthy();
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Risk Level Indicator Styling - no risk indicator for none risk level', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        const thread: Thread = { ...baseThread, riskLevel: 'none' };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Risk indicator should NOT be present for 'none' risk level
        const riskIndicator = container.querySelector('[data-testid="risk-indicator"]');
        expect(riskIndicator).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Conditional Badges Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 4: Response Overdue Badge Display**
   * 
   * *For any* thread where (currentTime - lastMessageAt) exceeds 48 hours, 
   * the rendered Thread_Card SHALL contain a "Response Overdue" badge element.
   * 
   * **Validates: Requirements 2.5**
   */
  it('Property 4: Response Overdue Badge Display - shows overdue badge when >48 hours', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        // Create a thread that is definitely overdue (72 hours ago)
        const overdueTimestamp = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        const thread: Thread = { ...baseThread, lastMessageAt: overdueTimestamp };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Overdue badge must be present
        const overdueBadge = container.querySelector('[data-testid="overdue-badge"]');
        expect(overdueBadge).toBeTruthy();
        expect(overdueBadge?.textContent).toBe('Response Overdue');
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Response Overdue Badge Display - no overdue badge when <48 hours', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        // Create a thread that is NOT overdue (1 hour ago)
        const recentTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
        const thread: Thread = { ...baseThread, lastMessageAt: recentTimestamp };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Overdue badge should NOT be present
        const overdueBadge = container.querySelector('[data-testid="overdue-badge"]');
        expect(overdueBadge).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: enhanced-new-page, Property 7: Linked Entity Badge Presence**
   * 
   * *For any* thread with a non-null propertyId, the Thread_Card SHALL contain a property badge.
   * *For any* thread with a non-null dealId, the Thread_Card SHALL contain a deal stage indicator.
   * 
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Property 7: Linked Entity Badge Presence - property badge when propertyId exists', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.uuid(),
        fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        (baseThread, propertyId, propertyAddress) => {
          const thread: Thread = { 
            ...baseThread, 
            propertyId, 
            propertyAddress: propertyAddress ?? undefined 
          };
          
          const { container } = render(<ThreadCard thread={thread} />);
          
          // Property badge must be present
          const propertyBadge = container.querySelector('[data-testid="property-badge"]');
          expect(propertyBadge).toBeTruthy();
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Linked Entity Badge Presence - no property badge when propertyId is null', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        const thread: Thread = { 
          ...baseThread, 
          propertyId: undefined, 
          propertyAddress: undefined 
        };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Property badge should NOT be present
        const propertyBadge = container.querySelector('[data-testid="property-badge"]');
        expect(propertyBadge).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Linked Entity Badge Presence - deal badge when dealId exists', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.uuid(),
        dealStageArb,
        (baseThread, dealId, dealStage) => {
          const thread: Thread = { ...baseThread, dealId, dealStage };
          
          const { container } = render(<ThreadCard thread={thread} />);
          
          // Deal badge must be present
          const dealBadge = container.querySelector('[data-testid="deal-badge"]');
          expect(dealBadge).toBeTruthy();
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Linked Entity Badge Presence - no deal badge when dealId is null', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        const thread: Thread = { 
          ...baseThread, 
          dealId: undefined, 
          dealStage: undefined 
        };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Deal badge should NOT be present
        const dealBadge = container.querySelector('[data-testid="deal-badge"]');
        expect(dealBadge).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: enhanced-new-page, Property 8: Draft Indicator Presence**
   * 
   * *For any* thread with a non-empty draftResponse, the Thread_Card SHALL contain 
   * a "Draft Ready" indicator badge.
   * 
   * **Validates: Requirements 3.2**
   */
  it('Property 8: Draft Indicator Presence - shows draft indicator when draftResponse exists', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.string({ minLength: 1, maxLength: 1000 }),
        (baseThread, draftResponse) => {
          const thread: Thread = { ...baseThread, draftResponse };
          
          const { container } = render(<ThreadCard thread={thread} />);
          
          // Draft indicator must be present
          const draftIndicator = container.querySelector('[data-testid="draft-indicator"]');
          expect(draftIndicator).toBeTruthy();
          expect(draftIndicator?.textContent).toBe('Draft Ready');
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Draft Indicator Presence - no draft indicator when draftResponse is empty', () => {
    fc.assert(
      fc.property(threadArbitrary, (baseThread) => {
        const thread: Thread = { ...baseThread, draftResponse: undefined };
        
        const { container } = render(<ThreadCard thread={thread} />);
        
        // Draft indicator should NOT be present
        const draftIndicator = container.querySelector('[data-testid="draft-indicator"]');
        expect(draftIndicator).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Action Row Layout Property Tests', () => {
  /**
   * **Feature: new-page-dropdown-fixes, Property 10: Action Row Layout Order**
   * 
   * *For any* ThreadCard action row, the Quick_Reply_Button SHALL appear before the dropdown arrow in DOM order.
   * 
   * **Validates: Requirements 4.1, 4.2**
   */
  it('Property 10: Action Row Layout Order - Quick Reply button appears before dropdown arrow in DOM order', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(<ThreadCard thread={thread} showQuickReply={true} />);
        
        // Get the action row
        const actionRow = container.querySelector('[data-testid="action-row"]');
        expect(actionRow).toBeTruthy();
        
        // Get both buttons
        const quickReplyButton = container.querySelector('[data-testid="quick-reply-button"]');
        const dropdownArrow = container.querySelector('[data-testid="dropdown-arrow"]');
        
        expect(quickReplyButton).toBeTruthy();
        expect(dropdownArrow).toBeTruthy();
        
        // Get all children of the action row
        const actionRowChildren = Array.from(actionRow!.children);
        
        // Find the indices of the buttons in the DOM order
        const quickReplyIndex = actionRowChildren.findIndex(child => 
          child.getAttribute('data-testid') === 'quick-reply-button'
        );
        const dropdownIndex = actionRowChildren.findIndex(child => 
          child.getAttribute('data-testid') === 'dropdown-arrow'
        );
        
        // Quick Reply button should appear before dropdown arrow in DOM order
        expect(quickReplyIndex).toBeGreaterThanOrEqual(0);
        expect(dropdownIndex).toBeGreaterThanOrEqual(0);
        expect(quickReplyIndex).toBeLessThan(dropdownIndex);
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 10: Action Row Layout Order - dropdown arrow is present even when Quick Reply is hidden', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(<ThreadCard thread={thread} showQuickReply={false} />);
        
        // Get the action row
        const actionRow = container.querySelector('[data-testid="action-row"]');
        expect(actionRow).toBeTruthy();
        
        // Quick Reply button should not be present
        const quickReplyButton = container.querySelector('[data-testid="quick-reply-button"]');
        expect(quickReplyButton).toBeNull();
        
        // Dropdown arrow should still be present
        const dropdownArrow = container.querySelector('[data-testid="dropdown-arrow"]');
        expect(dropdownArrow).toBeTruthy();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('formatParticipants Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 6: Participant Display Limit**
   * 
   * *For any* thread with N participants where N > 3, the Thread_Card SHALL display 
   * exactly 3 participant names plus a "+{N-3} more" indicator.
   * 
   * **Validates: Requirements 3.3**
   */
  it('Property 6: Participant Display Limit - shows max 3 participants with +N more indicator', () => {
    fc.assert(
      fc.property(
        fc.array(participantArb, { minLength: 1, maxLength: 20 }),
        (participants) => {
          const result = formatParticipants(participants, 3);
          
          // Should display at most 3 participants
          expect(result.displayed.length).toBeLessThanOrEqual(3);
          
          // Should display correct number of participants
          const expectedDisplayed = Math.min(participants.length, 3);
          expect(result.displayed.length).toBe(expectedDisplayed);
          
          // Remaining count should be correct
          const expectedRemaining = Math.max(0, participants.length - 3);
          expect(result.remaining).toBe(expectedRemaining);
          
          // Displayed names should match first N participants
          for (let i = 0; i < result.displayed.length; i++) {
            expect(result.displayed[i]).toBe(participants[i].name);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Participant Display Limit - renders +N more indicator when participants > 3', () => {
    fc.assert(
      fc.property(
        fc.array(participantArb, { minLength: 4, maxLength: 20 }),
        (participants) => {
          const thread: Thread = {
            id: 'test-id',
            subject: 'Test Subject',
            participants,
            classification: 'buyer',
            riskLevel: 'none',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            summary: 'Test summary text',
            messageCount: 1,
            unreadCount: 0,
          };
          
          const { container } = render(<ThreadCard thread={thread} />);
          
          // Should show "+N more" indicator
          const moreIndicator = container.querySelector('[data-testid="participants-more"]');
          expect(moreIndicator).toBeTruthy();
          expect(moreIndicator?.textContent).toBe(`+${participants.length - 3} more`);
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
