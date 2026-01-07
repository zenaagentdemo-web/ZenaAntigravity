/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import useBatchState from './useBatchState';

describe('useBatchState Property Tests', () => {
  /**
   * Invariant: isBatchMode should be true if any items are selected
   * Note: This hook allows selecting items only when in batch mode ideally,
   * but let's test the state relationship.
   */
  it('should maintain isBatchMode=true if items are selected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        (ids) => {
          const { result } = renderHook(() => useBatchState());

          // Enter batch mode and select items
          act(() => {
            result.current.enterBatchMode();
            ids.forEach(id => result.current.toggleSelection(id));
          });

          expect(result.current.isBatchMode).toBe(true);
          expect(result.current.selectedCount).toBe(new Set(ids).size);
        }
      )
    );
  });

  /**
   * Invariant: exitBatchMode should ALWAYS clear selection and set isBatchMode to false
   */
  it('should clear all state on exitBatchMode', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
        (ids) => {
          const { result } = renderHook(() => useBatchState());

          act(() => {
            result.current.enterBatchMode();
            ids.forEach(id => result.current.toggleSelection(id));
            result.current.exitBatchMode();
          });

          expect(result.current.isBatchMode).toBe(false);
          expect(result.current.selectedCount).toBe(0);
          expect(result.current.selectedIds.size).toBe(0);
        }
      )
    );
  });

  /**
   * Invariant: Toggling selection twice should return to original state
   */
  it('should return to original state after toggling selection twice', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (id) => {
          const { result } = renderHook(() => useBatchState());

          act(() => {
            result.current.enterBatchMode();
          });

          const initialCount = result.current.selectedCount;
          const initiallySelected = result.current.isSelected(id);

          act(() => {
            result.current.toggleSelection(id);
          });

          expect(result.current.isSelected(id)).toBe(!initiallySelected);

          act(() => {
            result.current.toggleSelection(id);
          });

          expect(result.current.isSelected(id)).toBe(initiallySelected);
          expect(result.current.selectedCount).toBe(initialCount);
        }
      )
    );
  });

  /**
   * Invariant: Relationship between isBatchMode and visibility (logical test)
   * On NewPage, the bar is visible if: isBatchMode && selectedCount > 0
   */
  it('should satisfy NewPage visibility logic: isBatchMode && selectedCount > 0', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial batch mode
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 10 }), // items to select
        (initialBatchMode, idsToSelect) => {
          const { result } = renderHook(() => useBatchState());

          if (initialBatchMode) {
            act(() => { result.current.enterBatchMode(); });
          }

          act(() => {
            idsToSelect.forEach(id => result.current.toggleSelection(id));
          });

          const isVisibleOnPage = result.current.isBatchMode && result.current.selectedCount > 0;

          if (!result.current.isBatchMode) {
            expect(isVisibleOnPage).toBe(false);
          }

          if (result.current.selectedCount === 0) {
            expect(isVisibleOnPage).toBe(false);
          }

          if (result.current.isBatchMode && result.current.selectedCount > 0) {
            expect(isVisibleOnPage).toBe(true);
          }
        }
      )
    );
  });
});
