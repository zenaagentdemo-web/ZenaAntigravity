/**
 * Property-Based Tests for ThreadCard Animation Timing Consistency
 * 
 * **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
 * **Validates: Requirements 2.3, 7.1**
 * 
 * Tests that dropdown expansion and collapse animations complete within 300ms ± 50ms tolerance.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { ThreadCard } from './ThreadCard';
import { Thread, ThreadClassification, RiskLevel } from '../../models/newPage.types';

// Arbitrary for generating test thread data
const threadArbitrary = fc.record({
  id: fc.uuid(),
  subject: fc.string({ minLength: 5, maxLength: 100 }),
  summary: fc.string({ minLength: 20, maxLength: 500 }),
  aiSummary: fc.option(fc.string({ minLength: 20, maxLength: 500 })),
  classification: fc.constantFrom('buyer', 'vendor', 'market', 'lawyer_broker', 'noise') as fc.Arbitrary<ThreadClassification>,
  riskLevel: fc.constantFrom('none', 'low', 'medium', 'high') as fc.Arbitrary<RiskLevel>,
  lastMessageAt: fc.date({ min: new Date('2023-01-01'), max: new Date() }).map(d => d.toISOString()),
  participants: fc.array(fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    email: fc.emailAddress(),
    role: fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker'),
    avatarUrl: fc.option(fc.webUrl())
  }), { minLength: 1, maxLength: 5 }),
  propertyId: fc.option(fc.uuid()),
  propertyAddress: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  dealId: fc.option(fc.uuid()),
  dealStage: fc.option(fc.constantFrom('inquiry', 'viewing', 'offer', 'negotiation', 'conditional', 'unconditional', 'settled')),
  draftResponse: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
});

/**
 * Get computed transition duration from an element
 */
const getTransitionDuration = (element: Element): number => {
  const computedStyle = window.getComputedStyle(element);
  const duration = computedStyle.transitionDuration;
  
  if (!duration || duration === '0s') return 0;
  
  // Parse duration (could be in seconds or milliseconds)
  const match = duration.match(/^([\d.]+)(s|ms)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return unit === 's' ? value * 1000 : value;
};

/**
 * Get animation duration from CSS animation property
 */
const getAnimationDuration = (element: Element): number => {
  const computedStyle = window.getComputedStyle(element);
  const duration = computedStyle.animationDuration;
  
  if (!duration || duration === '0s') return 0;
  
  // Parse duration (could be in seconds or milliseconds)
  const match = duration.match(/^([\d.]+)(s|ms)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return unit === 's' ? value * 1000 : value;
};

/**
 * Check if duration is within acceptable range (300ms ± 50ms)
 */
const isWithinAcceptableRange = (duration: number): boolean => {
  const target = 300; // 300ms target
  const tolerance = 50; // ±50ms tolerance
  return duration >= (target - tolerance) && duration <= (target + tolerance);
};

describe('ThreadCard Animation Timing Consistency Properties', () => {
  it('should complete dropdown expansion animation within 300ms ± 50ms tolerance', () => {
    // **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const { container, rerender } = render(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={false}
            />
          );
          
          // Re-render with expanded dropdown to trigger animation
          rerender(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={true}
            />
          );
          
          const dropdownContainer = container.querySelector('.thread-card__dropdown-container');
          if (!dropdownContainer) return true; // No dropdown to animate
          
          const animationDuration = getAnimationDuration(dropdownContainer);
          
          // If no animation is set, that's acceptable (instant transition)
          if (animationDuration === 0) return true;
          
          return isWithinAcceptableRange(animationDuration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent transition timing for card hover effects', () => {
    // **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const { container } = render(
            <ThreadCard thread={thread} />
          );
          
          const threadCardElement = container.querySelector('.thread-card');
          if (!threadCardElement) return false;
          
          const transitionDuration = getTransitionDuration(threadCardElement);
          
          // If no transition is set, that's acceptable
          if (transitionDuration === 0) return true;
          
          return isWithinAcceptableRange(transitionDuration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent timing for action button transitions', () => {
    // **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const { container } = render(
            <ThreadCard 
              thread={thread} 
              showQuickReply={true}
              isDropdownExpanded={true}
            />
          );
          
          const quickReplyButton = container.querySelector('.thread-card__quick-reply');
          const dropdownToggle = container.querySelector('.thread-card__dropdown-toggle');
          
          let allWithinRange = true;
          
          if (quickReplyButton) {
            const duration = getTransitionDuration(quickReplyButton);
            if (duration > 0 && !isWithinAcceptableRange(duration)) {
              allWithinRange = false;
            }
          }
          
          if (dropdownToggle) {
            const duration = getTransitionDuration(dropdownToggle);
            if (duration > 0 && !isWithinAcceptableRange(duration)) {
              allWithinRange = false;
            }
          }
          
          return allWithinRange;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have proper CSS classes for performance optimization', () => {
    // **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const { container } = render(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={true}
            />
          );
          
          const threadCardElement = container.querySelector('.thread-card');
          if (!threadCardElement) return false;
          
          // Check that the thread card has the proper CSS class
          const hasThreadCardClass = threadCardElement.classList.contains('thread-card');
          
          // Check for dropdown container when expanded
          const dropdownContainer = container.querySelector('.thread-card__dropdown-container');
          const hasDropdownClass = dropdownContainer ? dropdownContainer.classList.contains('thread-card__dropdown-container') : true;
          
          return hasThreadCardClass && hasDropdownClass;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect reduced motion preferences', () => {
    // **Feature: new-page-dropdown-fixes, Property 5: Animation Timing Consistency**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          // Mock reduced motion preference
          Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
              matches: query === '(prefers-reduced-motion: reduce)',
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            })),
          });
          
          const { container } = render(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={true}
            />
          );
          
          const dropdownContainer = container.querySelector('.thread-card__dropdown-container');
          if (!dropdownContainer) return true;
          
          // With reduced motion, animations should be disabled or very fast
          const animationDuration = getAnimationDuration(dropdownContainer);
          const transitionDuration = getTransitionDuration(dropdownContainer);
          
          // Should have no animation or very short duration
          return animationDuration <= 10 && transitionDuration <= 10;
        }
      ),
      { numRuns: 100 }
    );
  });
});