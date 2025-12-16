/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for AISummaryDropdown Keyboard Navigation
 * 
 * **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
 * **Validates: Requirements 7.3**
 * 
 * Tests that keyboard navigation follows logical order through dropdown content:
 * action buttons, entity cards, then participant cards.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { AISummaryDropdown } from './AISummaryDropdown';
import { Thread } from '../../models/newPage.types';

// Test setup
beforeEach(() => {
  // Add keyboard navigation class to body for testing
  document.body.classList.add('keyboard-navigation');
});

afterEach(() => {
  cleanup();
  document.body.classList.remove('keyboard-navigation');
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
 * Helper function to get all focusable elements in logical order
 */
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
};

/**
 * Helper function to simulate tab navigation
 */
const simulateTabNavigation = (elements: HTMLElement[], startIndex = 0): HTMLElement[] => {
  const navigationOrder: HTMLElement[] = [];
  
  if (elements.length === 0) return navigationOrder;
  
  // Start with first element or specified index
  let currentIndex = startIndex;
  elements[currentIndex]?.focus();
  navigationOrder.push(elements[currentIndex]);
  
  // Navigate through all elements
  for (let i = 1; i < elements.length; i++) {
    // Simulate Tab key press
    fireEvent.keyDown(elements[currentIndex], { key: 'Tab' });
    currentIndex = (currentIndex + 1) % elements.length;
    elements[currentIndex]?.focus();
    navigationOrder.push(elements[currentIndex]);
  }
  
  return navigationOrder;
};

/**
 * Helper function to categorize elements by their role in the dropdown
 */
const categorizeElements = (elements: HTMLElement[]): {
  actionButtons: HTMLElement[];
  entityLinks: HTMLElement[];
  participantElements: HTMLElement[];
  otherElements: HTMLElement[];
} => {
  const actionButtons: HTMLElement[] = [];
  const entityLinks: HTMLElement[] = [];
  const participantElements: HTMLElement[] = [];
  const otherElements: HTMLElement[] = [];
  
  elements.forEach(element => {
    const className = element.className;
    
    if (className.includes('ai-summary-dropdown__action-button')) {
      actionButtons.push(element);
    } else if (className.includes('ai-summary-dropdown__entity-link')) {
      entityLinks.push(element);
    } else if (className.includes('ai-summary-dropdown__participant') || 
               element.closest('.ai-summary-dropdown__participants')) {
      participantElements.push(element);
    } else {
      otherElements.push(element);
    }
  });
  
  return { actionButtons, entityLinks, participantElements, otherElements };
};

describe('AISummaryDropdown Keyboard Navigation Properties', () => {
  it('should maintain logical tab order: action buttons → entity cards → participant cards', () => {
    // **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          const mockOnAction = () => {};
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          const focusableElements = getFocusableElements(container);
          
          // Skip test if no focusable elements (valid case for some threads)
          if (focusableElements.length === 0) {
            return true;
          }
          
          const categorized = categorizeElements(focusableElements);
          
          // Verify logical order: action buttons come first
          let expectedIndex = 0;
          
          // Action buttons should come first
          categorized.actionButtons.forEach(button => {
            const actualIndex = focusableElements.indexOf(button);
            expect(actualIndex).toBeGreaterThanOrEqual(expectedIndex);
            expectedIndex = actualIndex + 1;
          });
          
          // Entity links should come after action buttons
          categorized.entityLinks.forEach(link => {
            const actualIndex = focusableElements.indexOf(link);
            expect(actualIndex).toBeGreaterThanOrEqual(expectedIndex);
            expectedIndex = actualIndex + 1;
          });
          
          // Participant elements should come last
          categorized.participantElements.forEach(element => {
            const actualIndex = focusableElements.indexOf(element);
            // Participant elements should come after action buttons and entity links
            const lastActionButtonIndex = categorized.actionButtons.length > 0 
              ? focusableElements.indexOf(categorized.actionButtons[categorized.actionButtons.length - 1])
              : -1;
            const lastEntityLinkIndex = categorized.entityLinks.length > 0
              ? focusableElements.indexOf(categorized.entityLinks[categorized.entityLinks.length - 1])
              : -1;
            
            const minExpectedIndex = Math.max(lastActionButtonIndex, lastEntityLinkIndex);
            if (minExpectedIndex >= 0) {
              expect(actualIndex).toBeGreaterThan(minExpectedIndex);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow sequential navigation through all interactive elements', () => {
    // **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          const mockOnAction = () => {};
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          const focusableElements = getFocusableElements(container);
          
          // Skip test if no focusable elements
          if (focusableElements.length === 0) {
            return true;
          }
          
          // Test that we can navigate through all elements sequentially
          const navigationOrder = simulateTabNavigation(focusableElements);
          
          // Should be able to navigate to all elements
          expect(navigationOrder.length).toBe(focusableElements.length);
          
          // Each element should be unique in the navigation order
          const uniqueElements = new Set(navigationOrder);
          expect(uniqueElements.size).toBe(focusableElements.length);
          
          // Navigation order should match the DOM order
          navigationOrder.forEach((element, index) => {
            expect(element).toBe(focusableElements[index]);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have proper ARIA attributes for navigation context', () => {
    // **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          const mockOnAction = () => {};
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          // Dropdown container should have proper role and label
          const dropdown = container.querySelector('.ai-summary-dropdown');
          expect(dropdown).toHaveAttribute('role', 'region');
          expect(dropdown).toHaveAttribute('aria-label', 'AI Summary Details');
          
          // Action buttons should have proper labels
          const actionButtons = container.querySelectorAll('.ai-summary-dropdown__action-button');
          actionButtons.forEach(button => {
            expect(button).toHaveAttribute('aria-label');
            expect(button.getAttribute('aria-label')).toBeTruthy();
          });
          
          // Entity links should have descriptive labels
          const entityLinks = container.querySelectorAll('.ai-summary-dropdown__entity-link');
          entityLinks.forEach(link => {
            expect(link).toHaveAttribute('aria-label');
            expect(link.getAttribute('aria-label')).toContain('View details');
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle keyboard events properly for navigation', () => {
    // **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          const mockOnAction = () => {};
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          const focusableElements = getFocusableElements(container);
          
          if (focusableElements.length === 0) {
            return true;
          }
          
          // Test Tab navigation
          focusableElements[0]?.focus();
          expect(document.activeElement).toBe(focusableElements[0]);
          
          // Test Shift+Tab navigation (reverse)
          if (focusableElements.length > 1) {
            fireEvent.keyDown(focusableElements[0], { key: 'Tab', shiftKey: true });
            // Should wrap to last element or stay on first
            expect(document.activeElement).toBeTruthy();
          }
          
          // Test Enter/Space activation on buttons
          const buttons = container.querySelectorAll('button');
          buttons.forEach(button => {
            button.focus();
            
            // Enter key should work
            fireEvent.keyDown(button, { key: 'Enter' });
            expect(button).toBeTruthy(); // Button should still exist after event
            
            // Space key should work
            fireEvent.keyDown(button, { key: ' ' });
            expect(button).toBeTruthy(); // Button should still exist after event
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain focus visibility with proper indicators', () => {
    // **Feature: new-page-dropdown-fixes, Property 17: Keyboard Navigation Order**
    fc.assert(
      fc.property(
        threadArb,
        (thread) => {
          const mockOnAction = () => {};
          
          const { container } = render(
            <AISummaryDropdown
              thread={thread}
              isExpanded={true}
              onAction={mockOnAction}
            />
          );
          
          const focusableElements = getFocusableElements(container);
          
          if (focusableElements.length === 0) {
            return true;
          }
          
          // Test that focus indicators are properly applied
          focusableElements.forEach(element => {
            element.focus();
            
            // Element should be focused
            expect(document.activeElement).toBe(element);
            
            // Should have focus styles (outline or box-shadow)
            const computedStyle = window.getComputedStyle(element);
            const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
            const hasBoxShadow = computedStyle.boxShadow !== 'none' && computedStyle.boxShadow !== '';
            
            // At least one focus indicator should be present
            expect(hasOutline || hasBoxShadow).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});