/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { usePagination } from './usePagination';

/**
 * Feature: zena-ai-real-estate-pwa, Property 88: Large thread pagination
 * Validates: Requirements 23.5
 * 
 * For any large email thread, the system should paginate or lazy-load content
 * to maintain responsiveness.
 */

describe('Pagination Property Tests', () => {
  describe('Property 88: Large thread pagination', () => {
    it('should paginate any array of items correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          (items, itemsPerPage) => {
            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            const expectedTotalPages = Math.ceil(items.length / itemsPerPage);

            // Property: Total pages should be calculated correctly
            expect(result.current.totalPages).toBe(expectedTotalPages);

            // Property: Current page should start at 1
            expect(result.current.currentPage).toBe(1);

            // Property: Paginated items should not exceed itemsPerPage
            expect(result.current.paginatedItems.length).toBeLessThanOrEqual(itemsPerPage);

            // Property: Paginated items should be a subset of original items
            result.current.paginatedItems.forEach((item) => {
              expect(items).toContain(item);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correct item count across all pages', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 1, maxLength: 500 }),
          fc.integer({ min: 1, max: 50 }),
          (items, itemsPerPage) => {
            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            let totalItemsAcrossPages = 0;
            const allPaginatedItems: number[] = [];

            // Iterate through all pages
            for (let page = 1; page <= result.current.totalPages; page++) {
              act(() => {
                result.current.goToPage(page);
              });

              totalItemsAcrossPages += result.current.paginatedItems.length;
              allPaginatedItems.push(...result.current.paginatedItems);
            }

            // Property: Total items across all pages should equal original array length
            expect(totalItemsAcrossPages).toBe(items.length);

            // Property: All original items should appear exactly once
            expect(allPaginatedItems.sort()).toEqual(items.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle page navigation correctly for any valid page number', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 10, maxLength: 200 }),
          fc.integer({ min: 5, max: 20 }),
          (items, itemsPerPage) => {
            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            const totalPages = result.current.totalPages;

            if (totalPages > 1) {
              // Test navigating to a random valid page
              const targetPage = Math.floor(Math.random() * totalPages) + 1;

              act(() => {
                result.current.goToPage(targetPage);
              });

              // Property: Current page should be the target page
              expect(result.current.currentPage).toBe(targetPage);

              // Property: Paginated items should be from the correct range
              const expectedStartIndex = (targetPage - 1) * itemsPerPage;
              const expectedEndIndex = Math.min(expectedStartIndex + itemsPerPage, items.length);
              const expectedItems = items.slice(expectedStartIndex, expectedEndIndex);

              expect(result.current.paginatedItems).toEqual(expectedItems);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clamp page numbers to valid range', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: -100, max: 200 }),
          (items, itemsPerPage, invalidPage) => {
            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            const totalPages = result.current.totalPages;

            act(() => {
              result.current.goToPage(invalidPage);
            });

            // Property: Page should be clamped to valid range [1, totalPages]
            expect(result.current.currentPage).toBeGreaterThanOrEqual(1);
            expect(result.current.currentPage).toBeLessThanOrEqual(totalPages);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly indicate navigation capabilities', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 5, max: 20 }),
          (items, itemsPerPage) => {
            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            const totalPages = result.current.totalPages;

            // Test first page
            act(() => {
              result.current.goToPage(1);
            });

            // Property: On first page, cannot go previous
            expect(result.current.canGoPrevious).toBe(false);
            expect(result.current.canGoNext).toBe(totalPages > 1);

            // Test last page
            if (totalPages > 1) {
              act(() => {
                result.current.goToPage(totalPages);
              });

              // Property: On last page, cannot go next
              expect(result.current.canGoNext).toBe(false);
              expect(result.current.canGoPrevious).toBe(true);
            }

            // Test middle page (a page that is neither first nor last)
            if (totalPages > 2) {
              // Use page 2 as the middle page (guaranteed to be between 1 and totalPages when totalPages > 2)
              const middlePage = 2;
              act(() => {
                result.current.goToPage(middlePage);
              });

              // Property: On middle page, can go both directions
              expect(result.current.canGoPrevious).toBe(true);
              expect(result.current.canGoNext).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty arrays correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (itemsPerPage) => {
            const { result } = renderHook(() =>
              usePagination({ items: [], itemsPerPage })
            );

            // Property: Empty array should have 0 total pages
            expect(result.current.totalPages).toBe(0);

            // Property: Paginated items should be empty
            expect(result.current.paginatedItems).toEqual([]);

            // Property: Should not be able to navigate
            expect(result.current.canGoNext).toBe(false);
            expect(result.current.canGoPrevious).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain responsiveness with large datasets', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 10, max: 100 }),
          (itemCount, itemsPerPage) => {
            // Generate large array
            const items = Array.from({ length: itemCount }, (_, i) => `item-${i}`);

            const startTime = performance.now();

            const { result } = renderHook(() =>
              usePagination({ items, itemsPerPage })
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Property: Pagination should be fast even with large datasets
            // Should complete in under 100ms
            expect(renderTime).toBeLessThan(100);

            // Property: Should only return items for current page
            expect(result.current.paginatedItems.length).toBeLessThanOrEqual(itemsPerPage);
          }
        ),
        { numRuns: 50 } // Fewer runs for performance test
      );
    });
  });
});
