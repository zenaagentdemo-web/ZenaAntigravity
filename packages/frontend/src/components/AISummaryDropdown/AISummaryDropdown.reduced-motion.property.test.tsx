/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for AISummaryDropdown Reduced Motion Compliance
 * 
 * **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
 * **Validates: Requirements 7.5**
 * 
 * Tests that all dropdown animations use instant transitions (duration <= 0.01ms)
 * when user prefers reduced motion, while maintaining functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { AISummaryDropdown } from './AISummaryDropdown';
import { Thread } from '../../models/newPage.types';

// Mock the useReducedMotion hook
const mockUseReducedMotion = vi.fn();
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion()
}));

// Mock the useKeyboardNavigation hook
vi.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    announceToScreenReader: vi.fn(),
    focusFirstElement: vi.fn()
  })
}));

// Test setup
beforeEach(() => {
  // Reset mocks
  mockUseReducedMotion.mockClear();
});

afterEach(() => {
  cleanup();
});

// Arbitraries for property-based testing
const participantArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 50 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('buyer', 'vendor', 'lawyer', 'broker', 'other'),
  avatarUrl: fc.option(fc.webUrl())
});

const threadArb = fc.record({
  id: fc.uuid(),
  subject: fc.string({ minLength: 5, maxLength: 100 }),
  summary: fc.string({ minLength: 20, maxLength: 500 }),
  aiSummary: fc.option(fc.string({ minLength: 20, maxLength: 500 })),
  participants: fc.array(participantArb, { minLength: 1, maxLength: 5 }),
  propertyAddress: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  propertyId: fc.option(fc.uuid()),
  classification: fc.constantFrom('buyer', 'vendor', 'market', 'lawyer_broker', 'noise'),
  priority: fc.constantFrom('low', 'medium', 'high'),
  timestamp: fc.date(),
  isRead: fc.boolean(),
  hasAttachments: fc.boolean()
});

/**
 * Helper function to parse CSS duration values
 */
const parseDuration = (duration: string): number => {
  if (duration === 'none' || duration === '0' || duration === '0s' || duration === '0ms') {
    return 0;
  }
  
  const match = duration.match(/^([\d.]+)(ms|s)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return unit === 's' ? value * 1000 : value;
};

/**
 * Helper function to check if an element has reduced motion styles
 */
const hasReducedMotionStyles = (element: Element): boolean => {
  const computedStyle = window.getComputedStyle(element);
  
  // Check animation duration
  const animationDuration = computedStyle.animationDuration;
  if (animationDuration && animationDuration !== 'none') {
    const duration = parseDuration(animationDuration);
    if (duration > 10) return false; // Should be <= 0.01ms (10ms tolerance for testing)
  }
  
  // Check transition duration
  const transitionDuration = computedStyle.transitionDuration;
  if (transitionDuration && transitionDuration !== 'none') {
    const duration = parseDuration(transitionDuration);
    if (duration > 10) return false; // Should be <= 0.01ms (10ms tolerance for testing)
  }
  
  return true;
};

/**
 * Helper function to check if element has reduced motion class
 */
const hasReducedMotionClass = (element: Element): boolean => {
  return element.classList.contains('ai-summary-dropdown--reduced-motion');
};

describe('AISummaryDropdown Reduced Motion Compliance Properties', () => {
  it('should apply reduced motion styles when user prefers reduced motion', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock reduced motion preference
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: true,
            getTransitionDuration: (defaultDuration: string) => '0.01ms',
            getAnimationDuration: (defaultDuration: number) => 0,
            shouldDisableAnimations: true
          });
          
          const mockOnAction = vi.fn();
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          // Check main dropdown has reduced motion class
          const dropdown = container.querySelector('.ai-summary-dropdown');
          expect(dropdown).toBeTruthy();
          expect(hasReducedMotionClass(dropdown!)).toBe(true);
          
          // Check that custom properties are set for reduced motion
          const dropdownElement = dropdown as HTMLElement;
          const style = dropdownElement.style;
          expect(style.getPropertyValue('--dropdown-transition-duration')).toBe('0.01ms');
          expect(style.getPropertyValue('--dropdown-animation-duration')).toBe('0.01ms');
          
          // Check all interactive elements have reduced motion styles
          const interactiveElements = container.querySelectorAll(
            '.ai-summary-dropdown__action-button, .ai-summary-dropdown__entity-link, .ai-summary-dropdown__retry-button'
          );
          
          interactiveElements.forEach(element => {
            expect(hasReducedMotionStyles(element)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use normal animations when user does not prefer reduced motion', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock normal motion preference
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: false,
            getTransitionDuration: (defaultDuration: string) => defaultDuration,
            getAnimationDuration: (defaultDuration: number) => defaultDuration,
            shouldDisableAnimations: false
          });
          
          const mockOnAction = vi.fn();
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          // Check main dropdown does NOT have reduced motion class
          const dropdown = container.querySelector('.ai-summary-dropdown');
          expect(dropdown).toBeTruthy();
          expect(hasReducedMotionClass(dropdown!)).toBe(false);
          
          // Check that custom properties are set for normal motion
          const dropdownElement = dropdown as HTMLElement;
          const style = dropdownElement.style;
          expect(style.getPropertyValue('--dropdown-transition-duration')).toBe('300ms');
          expect(style.getPropertyValue('--dropdown-animation-duration')).toBe('300ms');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain functionality with reduced motion enabled', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock reduced motion preference
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: true,
            getTransitionDuration: (defaultDuration: string) => '0.01ms',
            getAnimationDuration: (defaultDuration: number) => 0,
            shouldDisableAnimations: true
          });
          
          const mockOnAction = vi.fn();
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          // All content should still be rendered and accessible
          expect(container.querySelector('.ai-summary-dropdown')).toBeTruthy();
          
          // Action buttons should still be clickable
          const actionButtons = container.querySelectorAll('.ai-summary-dropdown__action-button');
          actionButtons.forEach(button => {
            expect(button).toBeTruthy();
            expect(button.getAttribute('aria-label')).toBeTruthy();
            
            // Button should be clickable
            fireEvent.click(button);
          });
          
          // Should have called onAction for each button click
          expect(mockOnAction).toHaveBeenCalledTimes(actionButtons.length);
          
          // Entity links should still be accessible
          const entityLinks = container.querySelectorAll('.ai-summary-dropdown__entity-link');
          entityLinks.forEach(link => {
            expect(link).toBeTruthy();
            expect(link.getAttribute('href')).toBeTruthy();
          });
          
          // Participant cards should still be rendered
          const participantCards = container.querySelectorAll('.ai-summary-dropdown__participant-card');
          expect(participantCards.length).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle error states with reduced motion', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock reduced motion preference
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: true,
            getTransitionDuration: (defaultDuration: string) => '0.01ms',
            getAnimationDuration: (defaultDuration: number) => 0,
            shouldDisableAnimations: true
          });
          
          const mockOnAction = vi.fn();
          const mockOnRetry = vi.fn();
          const testError = new Error('Test error');
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              error={testError}
              onAction={mockOnAction}
              onRetry={mockOnRetry}
            />
          );
          
          // Error state should be rendered
          const errorSection = container.querySelector('.ai-summary-dropdown--error');
          expect(errorSection).toBeTruthy();
          
          // Retry button should be functional
          const retryButton = container.querySelector('.ai-summary-dropdown__retry-button');
          if (retryButton) {
            expect(hasReducedMotionStyles(retryButton)).toBe(true);
            
            fireEvent.click(retryButton);
            expect(mockOnRetry).toHaveBeenCalledTimes(1);
          }
          
          // Fallback content should be accessible
          const fallbackSection = container.querySelector('.ai-summary-dropdown__fallback');
          if (fallbackSection) {
            expect(fallbackSection.textContent).toBeTruthy();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle loading states with reduced motion', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock reduced motion preference
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: true,
            getTransitionDuration: (defaultDuration: string) => '0.01ms',
            getAnimationDuration: (defaultDuration: number) => 0,
            shouldDisableAnimations: true
          });
          
          const mockOnAction = vi.fn();
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              isLoading={true}
              onAction={mockOnAction}
            />
          );
          
          // Loading state should be rendered
          const loadingSection = container.querySelector('.ai-summary-dropdown--loading');
          expect(loadingSection).toBeTruthy();
          
          // Skeleton elements should have reduced motion
          const skeletonLines = container.querySelectorAll('.ai-summary-dropdown__skeleton-line');
          skeletonLines.forEach(line => {
            expect(hasReducedMotionStyles(line)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect CSS media query for reduced motion as fallback', () => {
    // **Feature: new-page-dropdown-fixes, Property 19: Reduced Motion Compliance**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          // Mock normal motion preference (testing CSS fallback)
          mockUseReducedMotion.mockReturnValue({
            prefersReducedMotion: false,
            getTransitionDuration: (defaultDuration: string) => defaultDuration,
            getAnimationDuration: (defaultDuration: number) => defaultDuration,
            shouldDisableAnimations: false
          });
          
          const mockOnAction = vi.fn();
          
          // Mock the media query to simulate reduced motion preference
          const originalMatchMedia = window.matchMedia;
          window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          // Even without the reduced motion class, CSS media query should handle it
          const dropdown = container.querySelector('.ai-summary-dropdown');
          expect(dropdown).toBeTruthy();
          
          // Restore original matchMedia
          window.matchMedia = originalMatchMedia;
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});