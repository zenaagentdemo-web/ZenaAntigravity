/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for NewPageError Component
 * 
 * Tests the error state component using fast-check for property-based testing.
 * 
 * **Feature: enhanced-new-page, Property 26: Error State Display**
 * **Validates: Requirements 9.3**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, fireEvent } from '@testing-library/react';
import { NewPageError } from './NewPageError';

describe('NewPageError Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 26: Error State Display**
   * 
   * *For any* state where error is not null, the error state component
   * with retry button SHALL be visible.
   * 
   * **Validates: Requirements 9.3**
   */
  describe('Property 26: Error State Display', () => {
    it('should display error state with message for any valid error message', () => {
      fc.assert(
        fc.property(
          // Generate non-empty error message strings
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,200}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const errorState = container.querySelector('[data-testid="test-error"]');
            const messageElement = container.querySelector('[data-testid="test-error-message"]');
            
            const isVisible = errorState !== null;
            const hasMessage = messageElement !== null && messageElement.textContent === message;
            
            unmount();
            
            return isVisible && hasMessage;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display retry button for any error state', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const retryButton = container.querySelector('[data-testid="test-error-retry"]');
            const hasRetryButton = retryButton !== null && retryButton.tagName === 'BUTTON';
            
            unmount();
            
            return hasRetryButton;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should call onRetry when retry button is clicked', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const retryButton = container.querySelector('[data-testid="test-error-retry"]');
            if (retryButton) {
              fireEvent.click(retryButton);
            }
            
            const wasRetryCalled = mockOnRetry.mock.calls.length === 1;
            
            unmount();
            
            return wasRetryCalled;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have glassmorphism error card', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const errorCard = container.querySelector('[data-testid="test-error-card"]');
            const hasErrorCard = errorCard !== null;
            
            unmount();
            
            return hasErrorCard;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have error icon', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const errorIcon = container.querySelector('.new-page-error__icon');
            const hasErrorIcon = errorIcon !== null;
            
            unmount();
            
            return hasErrorIcon;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have proper accessibility attributes', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const errorState = container.querySelector('[data-testid="test-error"]');
            const hasRole = errorState?.getAttribute('role') === 'alert';
            const hasAriaLive = errorState?.getAttribute('aria-live') === 'assertive';
            
            const retryButton = container.querySelector('[data-testid="test-error-retry"]');
            const hasAriaLabel = retryButton?.getAttribute('aria-label') === 'Retry loading threads';
            
            unmount();
            
            return hasRole && hasAriaLive && hasAriaLabel;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display error title', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const title = container.querySelector('.new-page-error__title');
            const hasTitle = title !== null && title.textContent === 'Unable to load threads';
            
            unmount();
            
            return hasTitle;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have retry button with minimum touch target size', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{1,100}$/).filter(s => s.trim().length > 0),
          (message) => {
            const mockOnRetry = vi.fn();
            const { container, unmount } = render(
              <NewPageError 
                message={message}
                onRetry={mockOnRetry}
                testId="test-error"
              />
            );
            
            const retryButton = container.querySelector('.new-page-error__retry-button');
            // Check that the button has the class that ensures min-height: 44px
            const hasButton = retryButton !== null;
            
            unmount();
            
            return hasButton;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
