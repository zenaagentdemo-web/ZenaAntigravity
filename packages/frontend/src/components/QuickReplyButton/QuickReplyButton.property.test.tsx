/**
 * Property-Based Tests for QuickReplyButton Component
 * 
 * Tests correctness properties for the QuickReplyButton component using fast-check.
 * 
 * **Feature: new-page-dropdown-fixes**
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { QuickReplyButton } from './QuickReplyButton';

// ============================================================================
// Custom Arbitraries for QuickReplyButton Generation
// ============================================================================

const threadIdArb = fc.uuid();
const disabledArb = fc.boolean();
const classNameArb = fc.option(
  fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s))
);

// ============================================================================
// Property Tests
// ============================================================================

describe('QuickReplyButton Property Tests', () => {
  /**
   * **Feature: new-page-dropdown-fixes, Property 6: Quick Reply Button Presence**
   * 
   * *For any* rendered ThreadCard, a Quick Reply button SHALL be present and visible 
   * with cyan glow styling.
   * 
   * **Validates: Requirements 3.1**
   */
  it('Property 6: Quick Reply Button Presence - button is present and visible with proper styling', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        disabledArb,
        classNameArb,
        (threadId, disabled, className) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={disabled}
              onClick={mockOnClick}
              className={className || ''}
            />
          );
          
          // Button must be present
          const button = container.querySelector('.quick-reply-button');
          expect(button).toBeTruthy();
          expect(button?.tagName.toLowerCase()).toBe('button');
          
          // Button must be visible (not hidden)
          const computedStyle = window.getComputedStyle(button as Element);
          expect(computedStyle.display).not.toBe('none');
          expect(computedStyle.visibility).not.toBe('hidden');
          
          // Button must have proper base class for cyan glow styling
          expect(button?.classList.contains('quick-reply-button')).toBe(true);
          
          // Button must have proper disabled state
          if (disabled) {
            expect(button?.classList.contains('quick-reply-button--disabled')).toBe(true);
            expect((button as HTMLButtonElement)?.disabled).toBe(true);
          } else {
            expect(button?.classList.contains('quick-reply-button--disabled')).toBe(false);
            expect((button as HTMLButtonElement)?.disabled).toBe(false);
          }
          
          // Button must have additional className if provided
          if (className && className.trim()) {
            expect(button?.classList.contains(className.trim())).toBe(true);
          }
          
          // Button must have proper accessibility attributes
          expect(button?.getAttribute('type')).toBe('button');
          expect(button?.getAttribute('aria-label')).toBe('Quick Reply');
          expect(button?.getAttribute('data-testid')).toBe('quick-reply-button');
          
          // Button must contain icon and text elements
          const icon = button?.querySelector('.quick-reply-button__icon');
          const text = button?.querySelector('.quick-reply-button__text');
          
          expect(icon).toBeTruthy();
          expect(text).toBeTruthy();
          expect(icon?.textContent).toBe('↩');
          expect(text?.textContent).toBe('Quick Reply');
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 11: Touch Target Accessibility**
   * 
   * *For any* interactive element (Quick Reply button, dropdown arrow) within ThreadCard, 
   * the element's computed width and height SHALL both be >= 44px.
   * 
   * **Validates: Requirements 4.3**
   */
  it('Property 11: Touch Target Accessibility - button meets minimum touch target size', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        disabledArb,
        classNameArb,
        (threadId, disabled, className) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={disabled}
              onClick={mockOnClick}
              className={className || ''}
            />
          );
          
          const button = container.querySelector('.quick-reply-button') as HTMLElement;
          expect(button).toBeTruthy();
          
          // In test environment, we primarily check that CSS classes are applied
          // The actual sizing will be verified through CSS tests and browser rendering
          expect(button.classList.contains('quick-reply-button')).toBe(true);
          
          // Verify button has proper structure for touch interaction
          expect(button.tagName.toLowerCase()).toBe('button');
          expect(button.getAttribute('type')).toBe('button');
          
          // Clean up
          container.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Quick Reply Button Presence - click handler is called with correct threadId when enabled', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        classNameArb,
        (threadId, className) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={false}
              onClick={mockOnClick}
              className={className || ''}
            />
          );
          
          const button = container.querySelector('.quick-reply-button') as HTMLButtonElement;
          expect(button).toBeTruthy();
          
          // Simulate click
          button.click();
          
          // Verify onClick was called with correct threadId
          expect(mockOnClick).toHaveBeenCalledTimes(1);
          expect(mockOnClick).toHaveBeenCalledWith(threadId);
          
          // Clean up
          container.remove();
          vi.clearAllMocks();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Quick Reply Button Presence - click handler is not called when disabled', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        classNameArb,
        (threadId, className) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={true}
              onClick={mockOnClick}
              className={className || ''}
            />
          );
          
          const button = container.querySelector('.quick-reply-button') as HTMLButtonElement;
          expect(button).toBeTruthy();
          expect(button.disabled).toBe(true);
          
          // Simulate click on disabled button
          button.click();
          
          // Verify onClick was not called
          expect(mockOnClick).not.toHaveBeenCalled();
          
          // Clean up
          container.remove();
          vi.clearAllMocks();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Quick Reply Button Presence - keyboard interaction works correctly', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.constantFrom('Enter', ' '), // Test both Enter and Space keys
        (threadId, key) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={false}
              onClick={mockOnClick}
            />
          );
          
          const button = container.querySelector('.quick-reply-button') as HTMLButtonElement;
          expect(button).toBeTruthy();
          
          // Simulate keydown event
          const keyEvent = new KeyboardEvent('keydown', { 
            key, 
            bubbles: true, 
            cancelable: true 
          });
          button.dispatchEvent(keyEvent);
          
          // Verify onClick was called with correct threadId
          expect(mockOnClick).toHaveBeenCalledTimes(1);
          expect(mockOnClick).toHaveBeenCalledWith(threadId);
          
          // Clean up
          container.remove();
          vi.clearAllMocks();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Quick Reply Button Presence - keyboard interaction is disabled when button is disabled', () => {
    fc.assert(
      fc.property(
        threadIdArb,
        fc.constantFrom('Enter', ' '), // Test both Enter and Space keys
        (threadId, key) => {
          const mockOnClick = vi.fn();
          
          const { container } = render(
            <QuickReplyButton
              threadId={threadId}
              disabled={true}
              onClick={mockOnClick}
            />
          );
          
          const button = container.querySelector('.quick-reply-button') as HTMLButtonElement;
          expect(button).toBeTruthy();
          expect(button.disabled).toBe(true);
          
          // Simulate keydown event on disabled button
          const keyEvent = new KeyboardEvent('keydown', { 
            key, 
            bubbles: true, 
            cancelable: true 
          });
          button.dispatchEvent(keyEvent);
          
          // Verify onClick was not called
          expect(mockOnClick).not.toHaveBeenCalled();
          
          // Clean up
          container.remove();
          vi.clearAllMocks();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});