/**
 * Property-based tests for NewThreadsBanner component
 * 
 * Feature: enhanced-new-page
 * Property 21: New Threads Banner Display
 * Validates: Requirements 8.1
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { NewThreadsBanner } from './NewThreadsBanner';

// Cleanup after each test to prevent multiple elements in DOM
afterEach(() => {
  cleanup();
});

describe('NewThreadsBanner Property Tests', () => {
  describe('Property 21: New Threads Banner Display', () => {
    /**
     * Feature: enhanced-new-page, Property 21: New Threads Banner Display
     * Validates: Requirements 8.1
     * 
     * For any state where newThreadsAvailable > 0, the "New threads available" 
     * banner SHALL be visible.
     */
    it('should be visible when isVisible is true and count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { container, unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            // Property: When isVisible is true and count > 0, the banner should be visible
            const banner = container.querySelector('[data-testid="new-threads-banner"]');
            expect(banner).not.toBeNull();
            expect(banner).toBeInTheDocument();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT be visible when isVisible is false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { container, unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={false}
                onMerge={onMerge}
              />
            );

            // Property: When isVisible is false, the banner should NOT be visible
            const banner = container.querySelector('[data-testid="new-threads-banner"]');
            expect(banner).toBeNull();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT be visible when count is 0 or less', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 0 }),
          (count) => {
            const onMerge = vi.fn();

            const { container, unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            // Property: When count <= 0, the banner should NOT be visible
            const banner = container.querySelector('[data-testid="new-threads-banner"]');
            expect(banner).toBeNull();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle visibility correctly based on isVisible and count', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: -10, max: 100 }),
          (isVisible, count) => {
            const onMerge = vi.fn();

            const { container, unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={isVisible}
                onMerge={onMerge}
              />
            );

            const banner = container.querySelector('[data-testid="new-threads-banner"]');

            // Property: Banner should only be visible when isVisible is true AND count > 0
            const shouldBeVisible = isVisible && count > 0;
            if (shouldBeVisible) {
              expect(banner).not.toBeNull();
            } else {
              expect(banner).toBeNull();
            }
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Thread Count Display', () => {
    /**
     * Validates that the thread count is displayed correctly in the banner text
     */
    it('should display correct singular/plural text based on count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            const expectedText = count === 1 
              ? '1 new thread available' 
              : `${count} new threads available`;
            
            // Property: The banner text should correctly reflect the count with proper pluralization
            expect(banner).toHaveTextContent(expectedText);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display singular form for count of 1', () => {
      const onMerge = vi.fn();

      const { unmount } = render(
        <NewThreadsBanner
          count={1}
          isVisible={true}
          onMerge={onMerge}
        />
      );

      const banner = screen.getByTestId('new-threads-banner');
      expect(banner).toHaveTextContent('1 new thread available');
      expect(banner).not.toHaveTextContent('threads');
      
      unmount();
    });
  });

  describe('Merge Callback', () => {
    /**
     * Validates that the onMerge callback is called when banner is clicked
     */
    it('should call onMerge when banner is clicked', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            fireEvent.click(banner);

            // Property: onMerge should be called when banner is clicked
            expect(onMerge).toHaveBeenCalledTimes(1);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call onMerge when Enter key is pressed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            fireEvent.keyDown(banner, { key: 'Enter' });

            // Property: onMerge should be called when Enter key is pressed
            expect(onMerge).toHaveBeenCalledTimes(1);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call onMerge when Space key is pressed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            fireEvent.keyDown(banner, { key: ' ' });

            // Property: onMerge should be called when Space key is pressed
            expect(onMerge).toHaveBeenCalledTimes(1);
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Accessibility', () => {
    /**
     * Validates accessibility requirements
     */
    it('should have proper ARIA attributes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            
            // Property: Banner should have button role for interactivity
            expect(banner).toHaveAttribute('role', 'button');
            
            // Property: Banner should be focusable
            expect(banner).toHaveAttribute('tabIndex', '0');
            
            // Property: Banner should have aria-label
            expect(banner).toHaveAttribute('aria-label');
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have descriptive aria-label with count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const onMerge = vi.fn();

            const { unmount } = render(
              <NewThreadsBanner
                count={count}
                isVisible={true}
                onMerge={onMerge}
              />
            );

            const banner = screen.getByTestId('new-threads-banner');
            const ariaLabel = banner.getAttribute('aria-label');
            
            // Property: aria-label should contain the count
            expect(ariaLabel).toContain(count.toString());
            expect(ariaLabel).toContain('Tap to load');
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
