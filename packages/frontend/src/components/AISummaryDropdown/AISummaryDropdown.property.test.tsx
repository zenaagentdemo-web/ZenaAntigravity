/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for AISummaryDropdown Component
 * 
 * Tests correctness properties for the AISummaryDropdown component using fast-check.
 * 
 * **Feature: new-page-dropdown-fixes**
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { AISummaryDropdown } from './AISummaryDropdown';
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

describe('AISummaryDropdown Property Tests', () => {
  /**
   * **Feature: new-page-dropdown-fixes, Property 4: Dropdown Content Completeness**
   * 
   * *For any* expanded AI_Summary_Dropdown, the dropdown SHALL contain all required sections: 
   * AI summary, recommended actions (max 3), and linked entities (when available).
   * 
   * **Validates: Requirements 2.2, 6.1, 6.3**
   */
  it('Property 4: Dropdown Content Completeness - contains all required sections when expanded', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={true}
            isLoading={false}
            error={null}
          />
        );
        
        // AI Summary section must be present
        const summarySection = container.querySelector('.ai-summary-dropdown__section');
        expect(summarySection).toBeTruthy();
        
        const summaryTitle = container.querySelector('.ai-summary-dropdown__section-title');
        // Title should be "AI Summary" when AI data is available, "Summary" when not (Requirements 2.6, 8.1)
        const expectedTitle = thread.aiSummary ? 'AI Summary' : 'Summary';
        expect(summaryTitle?.textContent).toBe(expectedTitle);
        
        const summaryContent = container.querySelector('.ai-summary-dropdown__summary');
        expect(summaryContent).toBeTruthy();
        expect(summaryContent?.textContent).toBeTruthy();
        
        // Recommended Actions section must be present
        const actionsSection = Array.from(container.querySelectorAll('.ai-summary-dropdown__section'))
          .find(section => section.querySelector('.ai-summary-dropdown__section-title')?.textContent === 'Recommended Actions');
        expect(actionsSection).toBeTruthy();
        
        const actionButtons = container.querySelectorAll('.ai-summary-dropdown__action-button');
        expect(actionButtons.length).toBeGreaterThan(0);
        expect(actionButtons.length).toBeLessThanOrEqual(3); // Max 3 actions as per requirements
        
        // Verify each action button has required elements
        actionButtons.forEach(button => {
          const icon = button.querySelector('.ai-summary-dropdown__action-icon');
          const label = button.querySelector('.ai-summary-dropdown__action-label');
          expect(icon).toBeTruthy();
          expect(label).toBeTruthy();
          expect(label?.textContent).toBeTruthy();
        });
        
        // Linked entities section should be present when propertyAddress exists
        if (thread.propertyAddress) {
          const entitiesSection = Array.from(container.querySelectorAll('.ai-summary-dropdown__section'))
            .find(section => section.querySelector('.ai-summary-dropdown__section-title')?.textContent === 'Related');
          expect(entitiesSection).toBeTruthy();
          
          const entityCards = container.querySelectorAll('.ai-summary-dropdown__entity-card');
          expect(entityCards.length).toBeGreaterThan(0);
        }
        
        // Participants section must be present (always has participants)
        const participantsSection = Array.from(container.querySelectorAll('.ai-summary-dropdown__section'))
          .find(section => section.querySelector('.ai-summary-dropdown__section-title')?.textContent === 'Participants');
        expect(participantsSection).toBeTruthy();
        
        const participantCards = container.querySelectorAll('.ai-summary-dropdown__participant-card');
        expect(participantCards.length).toBe(thread.participants.length);
        
        // Verify each participant card has required elements
        participantCards.forEach((card, index) => {
          const participant = thread.participants[index];
          const name = card.querySelector('.ai-summary-dropdown__participant-name');
          const email = card.querySelector('.ai-summary-dropdown__participant-email');
          
          expect(name?.textContent).toBe(participant.name);
          expect(email?.textContent).toBe(participant.email);
        });
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 12: Entity Highlighting Presence**
   * 
   * *For any* AI summary containing detected entities, each entity SHALL have 
   * appropriate color-coded highlighting applied.
   * 
   * **Validates: Requirements 6.2**
   */
  it('Property 12: Entity Highlighting Presence - entities have highlighting classes when present', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={true}
            isLoading={false}
            error={null}
          />
        );
        
        // Check for entity highlighting elements
        const entityElements = container.querySelectorAll('.ai-summary-dropdown__entity');
        
        // If entities are present, they should have proper classes
        entityElements.forEach(entity => {
          const classList = Array.from(entity.classList);
          
          // Should have base entity class
          expect(classList).toContain('ai-summary-dropdown__entity');
          
          // Should have a type-specific class
          const typeClasses = classList.filter(cls => 
            cls.startsWith('ai-summary-dropdown__entity--')
          );
          expect(typeClasses.length).toBeGreaterThan(0);
          
          // Should have valid entity types
          const validTypes = ['person', 'property', 'date', 'amount', 'location'];
          const hasValidType = typeClasses.some(cls => {
            const type = cls.replace('ai-summary-dropdown__entity--', '');
            return validTypes.includes(type);
          });
          expect(hasValidType).toBe(true);
        });
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Dropdown Content Completeness - returns null when not expanded', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={false}
            isLoading={false}
            error={null}
          />
        );
        
        // Should render nothing when not expanded
        expect(container.firstChild).toBeNull();
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Dropdown Content Completeness - shows loading state when loading', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={true}
            isLoading={true}
            error={null}
          />
        );
        
        // Should show loading skeleton
        const loadingContainer = container.querySelector('.ai-summary-dropdown--loading');
        expect(loadingContainer).toBeTruthy();
        
        const skeleton = container.querySelector('.ai-summary-dropdown__skeleton');
        expect(skeleton).toBeTruthy();
        
        const skeletonLines = container.querySelectorAll('.ai-summary-dropdown__skeleton-line');
        expect(skeletonLines.length).toBeGreaterThan(0);
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Dropdown Content Completeness - shows error state with fallback content', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const error = new Error('Test error message');
        
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={true}
            isLoading={false}
            error={error}
          />
        );
        
        // Should show error container
        const errorContainer = container.querySelector('.ai-summary-dropdown--error');
        expect(errorContainer).toBeTruthy();
        
        // Should show error message
        const errorMessage = container.querySelector('.ai-summary-dropdown__error-message');
        expect(errorMessage?.textContent).toBe('Failed to load enhanced content');
        
        // Should show error details
        const errorDetails = container.querySelector('.ai-summary-dropdown__error-details');
        expect(errorDetails?.textContent).toBe(error.message);
        
        // Should show fallback content with thread summary
        const fallbackContent = container.querySelector('.ai-summary-dropdown__fallback');
        expect(fallbackContent).toBeTruthy();
        
        const fallbackSummary = fallbackContent?.querySelector('.ai-summary-dropdown__summary');
        expect(fallbackSummary?.textContent).toBe(thread.summary);
        
        const aiPending = fallbackContent?.querySelector('.ai-summary-dropdown__ai-pending');
        expect(aiPending?.textContent).toBe('AI analysis pending...');
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Dropdown Content Completeness - action buttons are clickable and have proper attributes', () => {
    fc.assert(
      fc.property(threadArbitrary, (thread) => {
        const { container } = render(
          <AISummaryDropdown 
            thread={thread} 
            isExpanded={true}
            isLoading={false}
            error={null}
          />
        );
        
        const actionButtons = container.querySelectorAll('.ai-summary-dropdown__action-button');
        
        actionButtons.forEach(button => {
          // Should be a button element
          expect(button.tagName.toLowerCase()).toBe('button');
          
          // Should have type="button"
          expect(button.getAttribute('type')).toBe('button');
          
          // Should have title attribute for accessibility
          expect(button.getAttribute('title')).toBeTruthy();
          
          // Should have icon and label
          const icon = button.querySelector('.ai-summary-dropdown__action-icon');
          const label = button.querySelector('.ai-summary-dropdown__action-label');
          
          expect(icon).toBeTruthy();
          expect(label).toBeTruthy();
          expect(icon?.textContent).toBeTruthy();
          expect(label?.textContent).toBeTruthy();
        });
        
        // Clean up
        container.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});