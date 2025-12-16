/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for AI Summary Dropdown Fallback Content Display
 * 
 * **Feature: new-page-dropdown-fixes, Property 16: Fallback Content Display**
 * **Validates: Requirements 2.6, 8.1**
 * 
 * Tests that the AI Summary Dropdown displays appropriate fallback content
 * when AI summary data is unavailable, ensuring users always have access
 * to basic thread information and functionality.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AISummaryDropdown } from './AISummaryDropdown';
import { Thread, Participant } from '../../models/newPage.types';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generates a participant for thread testing
 * Uses alphanumeric strings to avoid whitespace-only names that can't be queried
 */
const participantArbitrary = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,49}$/),
  email: fc.emailAddress(),
  role: fc.oneof(
    fc.constant('buyer'),
    fc.constant('vendor'),
    fc.constant('lawyer'),
    fc.constant('agent'),
    fc.constant('other')
  ),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined })
});

/**
 * Generates a thread with optional AI summary data
 * Uses alphanumeric strings to avoid whitespace-only values that can't be queried
 */
const threadArbitrary = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  subject: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,99}$/),
  summary: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{9,499}$/),
  aiSummary: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{9,499}$/), { nil: undefined }),
  participants: fc.array(participantArbitrary, { minLength: 1, maxLength: 5 }),
  lastMessageAt: fc.date(),
  isUnread: fc.boolean(),
  priority: fc.oneof(
    fc.constant('low'),
    fc.constant('medium'),
    fc.constant('high')
  ),
  classification: fc.oneof(
    fc.constant('buyer_inquiry'),
    fc.constant('vendor_update'),
    fc.constant('legal_document'),
    fc.constant('inspection_report'),
    fc.constant('other')
  ),
  propertyAddress: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{5,100}$/), { nil: undefined }),
  propertyId: fc.option(fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/), { nil: undefined })
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('AISummaryDropdown Fallback Content Display', () => {
  afterEach(() => {
    cleanup();
  });
  /**
   * Property 16: Fallback Content Display
   * When AI summary data is unavailable, the dropdown should display
   * fallback content with regular summary and AI pending notification
   */
  it('should display fallback content when AI summary is unavailable', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          // Force thread to not have AI summary
          const threadWithoutAI: Thread = {
            ...thread,
            aiSummary: undefined
          };

          const { container } = render(
            <AISummaryDropdown
              thread={threadWithoutAI}
              isExpanded={true}
              isLoading={false}
              error={null}
            />
          );

          // Should display "Summary" instead of "AI Summary" in title
          const summaryTitle = container.querySelector('#ai-summary-title');
          expect(summaryTitle).toBeTruthy();
          expect(summaryTitle?.textContent).toBe('Summary');

          // Should display the regular summary text in the summary section
          const summarySection = container.querySelector('.ai-summary-dropdown__summary');
          expect(summarySection).toBeTruthy();
          expect(summarySection?.textContent).toContain(thread.summary.trim());

          // Should display AI pending notification
          const aiPendingElement = container.querySelector('.ai-summary-dropdown__ai-pending');
          expect(aiPendingElement).toBeTruthy();
          expect(aiPendingElement?.textContent).toMatch(/AI analysis pending/i);

          // Should still display basic recommended actions - use toolbar query
          const toolbar = container.querySelector('[role="toolbar"]');
          expect(toolbar).toBeTruthy();
          const actionButtons = toolbar?.querySelectorAll('button');
          expect(actionButtons?.length).toBe(3);

          // Should display participants even without AI data
          // Use container query for participant cards
          const participantCards = container.querySelectorAll('.ai-summary-dropdown__participant-card');
          expect(participantCards.length).toBe(thread.participants.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.1: AI Summary Title Display
   * When AI summary is available, should show "AI Summary" title
   * When unavailable, should show "Summary" title
   */
  it('should display appropriate section title based on AI data availability', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        fc.boolean(),
        (baseThread, hasAIData) => {
          const thread: Thread = {
            ...baseThread,
            aiSummary: hasAIData ? baseThread.summary + ' (AI enhanced)' : undefined
          };

          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              isLoading={false}
              error={null}
            />
          );

          // Use container query to find the specific title element
          const summaryTitle = container.querySelector('#ai-summary-title');
          expect(summaryTitle).toBeTruthy();

          // Use specific class selector to find AI pending element (not ARIA regions)
          const aiPendingElement = container.querySelector('.ai-summary-dropdown__ai-pending');

          if (hasAIData) {
            expect(summaryTitle?.textContent).toBe('AI Summary');
            
            // Should not show AI pending message when AI data is available
            expect(aiPendingElement).toBeNull();
          } else {
            expect(summaryTitle?.textContent).toBe('Summary');
            
            // Should show AI pending message when AI data is unavailable
            expect(aiPendingElement).toBeTruthy();
            expect(aiPendingElement?.textContent).toMatch(/AI analysis pending/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.2: Basic Actions Availability
   * Basic recommended actions should always be available regardless of AI data
   */
  it('should always provide basic recommended actions even without AI data', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          // Force thread to not have AI summary
          const threadWithoutAI: Thread = {
            ...thread,
            aiSummary: undefined
          };

          const { container, getAllByRole } = render(
            <AISummaryDropdown
              thread={threadWithoutAI}
              isExpanded={true}
              isLoading={false}
              error={null}
            />
          );

          // Should have basic actions available - use container query to find toolbar buttons
          const toolbar = container.querySelector('[role="toolbar"]');
          expect(toolbar).toBeTruthy();
          
          const actionButtons = toolbar?.querySelectorAll('button');
          expect(actionButtons?.length).toBe(3);

          // Verify button labels exist
          const buttonLabels = Array.from(actionButtons || []).map(btn => 
            btn.querySelector('.ai-summary-dropdown__action-label')?.textContent
          );
          expect(buttonLabels).toContain('Quick Reply');
          expect(buttonLabels).toContain('Schedule Follow-up');
          expect(buttonLabels).toContain('Mark Priority');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.3: Participant Information Preservation
   * Participant information should be displayed regardless of AI data availability
   */
  it('should preserve participant information when AI data is unavailable', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          // Ensure we have participants to test
          fc.pre(thread.participants.length > 0);

          // Force thread to not have AI summary
          const threadWithoutAI: Thread = {
            ...thread,
            aiSummary: undefined
          };

          const { container } = render(
            <AISummaryDropdown
              thread={threadWithoutAI}
              isExpanded={true}
              isLoading={false}
              error={null}
            />
          );

          // Should display participants section - use container query to avoid multiple matches
          const participantsTitle = container.querySelector('#participants-title');
          expect(participantsTitle).toBeTruthy();
          expect(participantsTitle?.textContent).toBe('Participants');

          // Should display participant cards
          const participantCards = container.querySelectorAll('.ai-summary-dropdown__participant-card');
          expect(participantCards.length).toBe(thread.participants.length);

          // Each participant should have name and email displayed
          thread.participants.forEach((participant, index) => {
            const card = participantCards[index];
            const nameElement = card.querySelector('.ai-summary-dropdown__participant-name');
            const emailElement = card.querySelector('.ai-summary-dropdown__participant-email');
            
            expect(nameElement).toBeTruthy();
            expect(emailElement).toBeTruthy();
            expect(nameElement?.textContent).toBe(participant.name);
            expect(emailElement?.textContent).toBe(participant.email);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.4: AI Pending Message Accessibility
   * AI pending message should be properly announced to screen readers
   */
  it('should make AI pending message accessible to screen readers', () => {
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          // Force thread to not have AI summary
          const threadWithoutAI: Thread = {
            ...thread,
            aiSummary: undefined
          };

          const { container } = render(
            <AISummaryDropdown
              thread={threadWithoutAI}
              isExpanded={true}
              isLoading={false}
              error={null}
            />
          );

          // AI pending message should have proper ARIA attributes
          const aiPendingElement = container.querySelector('.ai-summary-dropdown__ai-pending');
          expect(aiPendingElement).toBeTruthy();
          expect(aiPendingElement?.getAttribute('role')).toBe('status');
          expect(aiPendingElement?.getAttribute('aria-live')).toBe('polite');

          // Should contain the pending message text
          expect(aiPendingElement?.textContent).toMatch(/AI analysis pending/i);
        }
      ),
      { numRuns: 50 }
    );
  });
});