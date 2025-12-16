
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { ReplyComposer } from './ReplyComposer';
import { Thread, ReplyStyle, Participant } from '../../models/newPage.types';

// Mock dependencies
vi.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    announceToScreenReader: vi.fn(),
  }),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => ({
    prefersReducedMotion: false,
    getTransitionDuration: () => '0ms',
  }),
}));

vi.mock('../../utils/hapticFeedback', () => ({
  hapticFeedback: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Arbitraries
const participantArb = fc.record({
  id: fc.uuid(),
  name: fc.string(),
  email: fc.emailAddress(),
  role: fc.oneof(fc.constant(undefined), fc.constant('buyer'), fc.constant('vendor')),
  avatarUrl: fc.option(fc.webUrl()),
});

const threadArb = fc.record({
  id: fc.uuid(),
  subject: fc.string(), // The potential culprit?
  participants: fc.array(participantArb),
  classification: fc.constantFrom('buyer', 'vendor', 'market', 'lawyer_broker', 'noise'),
  riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
  lastMessageAt: fc.date().map(d => d.toISOString()),
  createdAt: fc.date().map(d => d.toISOString()),
  summary: fc.string(),
  // Optional fields
  aiSummary: fc.option(fc.string()),
  propertyAddress: fc.option(fc.string()),
  messageCount: fc.integer({ min: 0 }),
  unreadCount: fc.integer({ min: 0 }),
}) as fc.Arbitrary<Thread>;

const replyStyleArb = fc.constantFrom<ReplyStyle>('Friendly', 'Professional', 'Casual');

describe('ReplyComposer Property Tests', () => {
  it('should render without crashing for any valid Thread state', () => {
    fc.assert(
      fc.property(threadArb, replyStyleArb, (thread, style) => {
        try {
          // Render component
          const { unmount } = render(
            <ReplyComposer
              isOpen={true}
              thread={thread}
              selectedStyle={style}
              isGenerating={false}
              generatedMessage=""
              onClose={vi.fn()}
              onSend={vi.fn()}
            />
          );

          unmount();
        } catch (error) {
          console.error('CRASH REPRODUCED WITH THREAD:', JSON.stringify(thread, null, 2));
          console.error('STYLE:', style);
          throw error;
        }
      }),
      { numRuns: 100 } // fast-check default
    );
  });
});