/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for BatchActionBar component
 * 
 * Feature: enhanced-new-page
 * Property 20: Batch Action Bar Visibility
 * Validates: Requirements 7.2
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { BatchActionBar } from './BatchActionBar';
import { BatchAction } from '../../models/newPage.types';

// Cleanup after each test to prevent multiple elements in DOM
afterEach(() => {
  cleanup();
});

describe('BatchActionBar Property Tests', () => {
  describe('Property 20: Batch Action Bar Visibility', () => {
    /**
     * Feature: enhanced-new-page, Property 20: Batch Action Bar Visibility
     * Validates: Requirements 7.2
     * 
     * For any state where isBatchMode is true, the BatchActionBar component 
     * SHALL be visible. For any state where isBatchMode is false, the 
     * BatchActionBar SHALL not be visible.
     */
    it('should be visible when isVisible is true', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { container, unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={true}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            // Property: When isVisible is true, the batch action bar should be in the DOM
            const batchActionBar = container.querySelector('[data-testid="batch-action-bar"]');
            expect(batchActionBar).not.toBeNull();
            expect(batchActionBar).toBeInTheDocument();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT be visible when isVisible is false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { container, unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={false}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            // Property: When isVisible is false, the batch action bar should NOT be in the DOM
            const batchActionBar = container.querySelector('[data-testid="batch-action-bar"]');
            expect(batchActionBar).toBeNull();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle visibility correctly based on isVisible prop', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }),
          (isVisible, selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { container, unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={isVisible}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            const batchActionBar = container.querySelector('[data-testid="batch-action-bar"]');

            // Property: Visibility should match isVisible prop exactly
            if (isVisible) {
              expect(batchActionBar).not.toBeNull();
            } else {
              expect(batchActionBar).toBeNull();
            }
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Selection Count Display', () => {
    /**
     * Validates that the selection count is displayed correctly
     */
    it('should display the correct selection count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={true}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            // Property: The displayed count should match the selectedCount prop
            const countElement = screen.getByTestId('selection-count');
            expect(countElement).toHaveTextContent(selectedCount.toString());
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Action Buttons', () => {
    /**
     * Validates that all required action buttons are present when visible
     */
    it('should render all required action buttons when visible', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={true}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            // Property: All required buttons should be present
            expect(screen.getByTestId('snooze-all-button')).toBeInTheDocument();
            expect(screen.getByTestId('archive-all-button')).toBeInTheDocument();
            expect(screen.getByTestId('mark-read-button')).toBeInTheDocument();
            expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should disable action buttons when selectedCount is 0', () => {
      const onAction = vi.fn();
      const onCancel = vi.fn();

      const { unmount } = render(
        <BatchActionBar
          selectedCount={0}
          isVisible={true}
          onAction={onAction}
          onCancel={onCancel}
        />
      );

      // Property: Action buttons should be disabled when no items selected
      expect(screen.getByTestId('snooze-all-button')).toBeDisabled();
      expect(screen.getByTestId('archive-all-button')).toBeDisabled();
      expect(screen.getByTestId('mark-read-button')).toBeDisabled();
      
      // Cancel button should always be enabled
      expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
      
      unmount();
    });

    it('should enable action buttons when selectedCount > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={true}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            // Property: Action buttons should be enabled when items are selected
            expect(screen.getByTestId('snooze-all-button')).not.toBeDisabled();
            expect(screen.getByTestId('archive-all-button')).not.toBeDisabled();
            expect(screen.getByTestId('mark-read-button')).not.toBeDisabled();
            
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Action Callbacks', () => {
    /**
     * Validates that action callbacks are called with correct action types
     */
    it('should call onAction with correct action type when buttons are clicked', () => {
      const actionTypes: BatchAction[] = ['snooze_all', 'archive_all', 'mark_read'];
      const buttonTestIds = ['snooze-all-button', 'archive-all-button', 'mark-read-button'];

      actionTypes.forEach((expectedAction, index) => {
        const onAction = vi.fn();
        const onCancel = vi.fn();

        const { unmount } = render(
          <BatchActionBar
            selectedCount={5}
            isVisible={true}
            onAction={onAction}
            onCancel={onCancel}
          />
        );

        const button = screen.getByTestId(buttonTestIds[index]);
        button.click();

        // Property: onAction should be called with the correct action type
        expect(onAction).toHaveBeenCalledWith(expectedAction);
        expect(onAction).toHaveBeenCalledTimes(1);

        unmount();
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (selectedCount) => {
            const onAction = vi.fn();
            const onCancel = vi.fn();

            const { unmount } = render(
              <BatchActionBar
                selectedCount={selectedCount}
                isVisible={true}
                onAction={onAction}
                onCancel={onCancel}
              />
            );

            const cancelButton = screen.getByTestId('cancel-button');
            cancelButton.click();

            // Property: onCancel should be called when cancel button is clicked
            expect(onCancel).toHaveBeenCalledTimes(1);
            expect(onAction).not.toHaveBeenCalled();
            
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
      const onAction = vi.fn();
      const onCancel = vi.fn();

      const { unmount } = render(
        <BatchActionBar
          selectedCount={5}
          isVisible={true}
          onAction={onAction}
          onCancel={onCancel}
        />
      );

      // Property: The toolbar should have proper role and aria-label
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Batch actions');

      // Property: All buttons should have aria-labels
      expect(screen.getByTestId('snooze-all-button')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('archive-all-button')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('mark-read-button')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('cancel-button')).toHaveAttribute('aria-label');
      
      unmount();
    });
  });
});
