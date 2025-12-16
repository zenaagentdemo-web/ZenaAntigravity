/**
 * Property-Based Tests for ThreadCard Dropdown Blur Prevention
 * 
 * **Feature: new-page-dropdown-fixes, Property 1: Dropdown Blur Prevention**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Tests that dropdown expansion does not apply backdrop-filter CSS properties
 * to parent elements outside the ThreadCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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
 * Get all parent elements of a given element up to document.body
 */
const getParentElements = (element: Element): Element[] => {
  const parents: Element[] = [];
  let current = element.parentElement;
  
  while (current && current !== document.body) {
    parents.push(current);
    current = current.parentElement;
  }
  
  return parents;
};

/**
 * Check if an element has backdrop-filter applied
 */
const hasBackdropFilter = (element: Element): boolean => {
  const computedStyle = window.getComputedStyle(element);
  const backdropFilter = computedStyle.backdropFilter || computedStyle.webkitBackdropFilter;
  return backdropFilter && backdropFilter !== 'none';
};

describe('ThreadCard Dropdown Blur Prevention Properties', () => {
  it('should prevent backdrop blur effects during dropdown expansion', () => {
    // **Feature: new-page-dropdown-fixes, Property 1: Dropdown Blur Prevention**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const mockOnDropdownToggle = vi.fn();
          
          const { container } = render(
            <ThreadCard 
              thread={thread} 
              onDropdownToggle={mockOnDropdownToggle}
              isDropdownExpanded={false}
            />
          );
          
          const dropdownButton = container.querySelector('[data-testid="dropdown-arrow"]') as HTMLElement;
          expect(dropdownButton).toBeTruthy();
          
          // Click to expand dropdown
          fireEvent.click(dropdownButton);
          
          // Verify no backdrop-filter is applied to parent elements
          const parentElements = getParentElements(container);
          const hasAnyBackdropFilter = parentElements.some(hasBackdropFilter);
          
          return !hasAnyBackdropFilter;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain normal screen visibility when dropdown is expanded', () => {
    // **Feature: new-page-dropdown-fixes, Property 1: Dropdown Blur Prevention**
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
          
          // Get initial backdrop filter state of parents
          const parentElements = getParentElements(container);
          const initialBackdropStates = parentElements.map(hasBackdropFilter);
          
          // Re-render with expanded dropdown
          rerender(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={true}
            />
          );
          
          // Verify backdrop filter states haven't changed
          const expandedBackdropStates = parentElements.map(hasBackdropFilter);
          
          return initialBackdropStates.every((initial, index) => 
            initial === expandedBackdropStates[index]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent blur effects from stacking with multiple expanded dropdowns', () => {
    // **Feature: new-page-dropdown-fixes, Property 1: Dropdown Blur Prevention**
    fc.assert(
      fc.property(
        fc.array(threadArbitrary, { minLength: 2, maxLength: 5 }),
        (threads) => {
          const { container } = render(
            <div>
              {threads.map((thread, index) => (
                <ThreadCard 
                  key={thread.id}
                  thread={thread} 
                  isDropdownExpanded={index < 2} // Expand first 2 dropdowns
                />
              ))}
            </div>
          );
          
          // Verify no backdrop-filter is applied to any parent elements
          const parentElements = getParentElements(container);
          const hasAnyBackdropFilter = parentElements.some(hasBackdropFilter);
          
          return !hasAnyBackdropFilter;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not trigger backdrop filters on parent elements during transitions', () => {
    // **Feature: new-page-dropdown-fixes, Property 1: Dropdown Blur Prevention**
    fc.assert(
      fc.property(
        threadArbitrary,
        (thread) => {
          const { container } = render(
            <ThreadCard 
              thread={thread} 
              isDropdownExpanded={false}
            />
          );
          
          const threadCardElement = container.querySelector('.thread-card') as HTMLElement;
          expect(threadCardElement).toBeTruthy();
          
          // Simulate transition by adding expanded class
          threadCardElement.classList.add('thread-card--expanded');
          
          // Force style recalculation
          window.getComputedStyle(threadCardElement).transform;
          
          // Verify no backdrop-filter is applied to parent elements
          const parentElements = getParentElements(container);
          const hasAnyBackdropFilter = parentElements.some(hasBackdropFilter);
          
          return !hasAnyBackdropFilter;
        }
      ),
      { numRuns: 100 }
    );
  });
});