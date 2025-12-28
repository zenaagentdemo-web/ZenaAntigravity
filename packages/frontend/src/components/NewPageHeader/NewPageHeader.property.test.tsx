/**
 * Property-based tests for NewPageHeader component
 * 
 * Feature: enhanced-new-page
 * Property 35: Header Thread Count Accuracy
 * Property 36: Urgent Notification Dot Display
 * Property 37: Header Compact on Scroll
 * Validates: Requirements 12.2, 12.5, 12.6
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { NewPageHeader } from './NewPageHeader';
import { SyncStatus } from '../../models/newPage.types';

// Mock useNavigate hook
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Cleanup after each test to prevent multiple elements in DOM
afterEach(() => {
  cleanup();
});

// Arbitrary for SyncStatus
const syncStatusArb = fc.constantFrom<SyncStatus>('idle', 'syncing', 'error', 'offline');

describe('NewPageHeader Property Tests', () => {
  describe('Property 35: Header Thread Count Accuracy', () => {
    /**
     * Feature: enhanced-new-page, Property 35: Header Thread Count Accuracy
     * Validates: Requirements 12.2
     * 
     * For any loaded state, the header thread count SHALL equal the length of 
     * the threads array, and the urgent count SHALL equal the count of threads 
     * with riskLevel === 'high'.
     */
    it('should display the correct thread count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            // Ensure urgentCount doesn't exceed threadCount
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: The displayed thread count should match the threadCount prop
            const countElement = screen.getByTestId('thread-count');
            const expectedText = new RegExp(`${threadCount}\\s+thread${threadCount !== 1 ? 's' : ''}`, 'i');
            expect(countElement.textContent?.trim().replace(/\s+/g, ' ')).toBe(`${threadCount} thread${threadCount !== 1 ? 's' : ''}`);

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should display urgent count badge when urgentCount > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            // Ensure urgentCount doesn't exceed threadCount
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When urgentCount > 0, the urgent badge should be visible
            const urgentBadge = screen.getByTestId('urgent-badge');
            expect(urgentBadge).toBeInTheDocument();
            expect(urgentBadge).toHaveTextContent(`${validUrgentCount} urgent`);

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should NOT display urgent badge when urgentCount is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          syncStatusArb,
          (threadCount, syncStatus) => {
            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { container, unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={0}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When urgentCount is 0, the urgent badge should NOT be visible
            const urgentBadge = container.querySelector('[data-testid="urgent-badge"]');
            expect(urgentBadge).toBeNull();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 36: Urgent Notification Dot Display', () => {
    /**
     * Feature: enhanced-new-page, Property 36: Urgent Notification Dot Display
     * Validates: Requirements 12.6
     * 
     * For any state where at least one thread has riskLevel === 'high', 
     * the header SHALL display a pulsing notification dot.
     */
    it('should display notification dot when urgentCount > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            // Ensure urgentCount doesn't exceed threadCount
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When urgentCount > 0, the notification dot should be visible
            const notificationDot = screen.getByTestId('urgent-notification-dot');
            expect(notificationDot).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should NOT display notification dot when urgentCount is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          syncStatusArb,
          (threadCount, syncStatus) => {
            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { container, unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={0}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When urgentCount is 0, the notification dot should NOT be visible
            const notificationDot = container.querySelector('[data-testid="urgent-notification-dot"]');
            expect(notificationDot).toBeNull();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should have proper aria-label on notification dot', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          (threadCount, urgentCount) => {
            // Ensure urgentCount doesn't exceed threadCount
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus="idle"
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: Notification dot should have aria-label with urgent count
            const notificationDot = screen.getByTestId('urgent-notification-dot');
            expect(notificationDot).toHaveAttribute('aria-label', `${validUrgentCount} urgent threads`);

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 37: Header Compact on Scroll', () => {
    /**
     * Feature: enhanced-new-page, Property 37: Header Compact on Scroll
     * Validates: Requirements 12.5
     * 
     * For any scroll position > 100px, the header SHALL be in compact mode 
     * (reduced height).
     */
    it('should apply compact class when isCompact is true', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={true}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When isCompact is true, the header should have compact class
            const header = screen.getByTestId('new-page-header');
            expect(header).toHaveClass('new-page-header--compact');

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should NOT apply compact class when isCompact is false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When isCompact is false, the header should NOT have compact class
            const header = screen.getByTestId('new-page-header');
            expect(header).not.toHaveClass('new-page-header--compact');

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should hide stats section in compact mode', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { container, unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={true}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: In compact mode, the stats section should not be rendered
            const statsSection = container.querySelector('[data-testid="header-stats"]');
            expect(statsSection).toBeNull();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should show stats section in non-compact mode', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          syncStatusArb,
          (threadCount, urgentCount, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={false}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: In non-compact mode, the stats section should be rendered
            const statsSection = screen.getByTestId('header-stats');
            expect(statsSection).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 23: Sync Status Indicator Visibility', () => {
    /**
     * Feature: enhanced-new-page, Property 23: Sync Status Indicator Visibility
     * Validates: Requirements 8.4
     * 
     * For any state where syncStatus equals 'syncing', the sync indicator 
     * SHALL be visible in the header.
     */
    it('should show sync indicator when syncStatus is syncing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (threadCount, urgentCount, isCompact) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus="syncing"
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When syncStatus is 'syncing', the sync indicator should be visible
            const syncIndicator = screen.getByTestId('sync-indicator');
            expect(syncIndicator).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should NOT show sync indicator when syncStatus is idle', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (threadCount, urgentCount, isCompact) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { container, unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus="idle"
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When syncStatus is 'idle', the sync indicator should NOT be visible
            const syncIndicator = container.querySelector('[data-testid="sync-indicator"]');
            expect(syncIndicator).toBeNull();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should show offline indicator when syncStatus is offline', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (threadCount, urgentCount, isCompact) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus="offline"
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When syncStatus is 'offline', the offline indicator should be visible
            const offlineIndicator = screen.getByTestId('offline-indicator');
            expect(offlineIndicator).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should show error indicator when syncStatus is error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (threadCount, urgentCount, isCompact) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus="error"
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: When syncStatus is 'error', the error indicator should be visible
            const errorIndicator = screen.getByTestId('error-indicator');
            expect(errorIndicator).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should show correct indicator based on syncStatus', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          syncStatusArb,
          (threadCount, urgentCount, isCompact, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { container, unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: The correct indicator should be visible based on syncStatus
            const syncIndicator = container.querySelector('[data-testid="sync-indicator"]');
            const offlineIndicator = container.querySelector('[data-testid="offline-indicator"]');
            const errorIndicator = container.querySelector('[data-testid="error-indicator"]');

            if (syncStatus === 'syncing') {
              expect(syncIndicator).not.toBeNull();
              expect(offlineIndicator).toBeNull();
              expect(errorIndicator).toBeNull();
            } else if (syncStatus === 'offline') {
              expect(syncIndicator).toBeNull();
              expect(offlineIndicator).not.toBeNull();
              expect(errorIndicator).toBeNull();
            } else if (syncStatus === 'error') {
              expect(syncIndicator).toBeNull();
              expect(offlineIndicator).toBeNull();
              expect(errorIndicator).not.toBeNull();
            } else {
              // idle - no indicators
              expect(syncIndicator).toBeNull();
              expect(offlineIndicator).toBeNull();
              expect(errorIndicator).toBeNull();
            }

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Refresh Button', () => {
    /**
     * Validates refresh button behavior
     */
    it('should always render refresh button', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          syncStatusArb,
          (threadCount, urgentCount, isCompact, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: Refresh button should always be present
            const refreshButton = screen.getByTestId('refresh-button');
            expect(refreshButton).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should disable refresh button when syncing', () => {
      const onRefresh = vi.fn();
      const onSearch = vi.fn();

      const { unmount } = render(
        <NewPageHeader
          threadCount={10}
          urgentCount={2}
          isCompact={false}
          syncStatus="syncing"
          onRefresh={onRefresh}
          onSearch={onSearch}
        />
      );

      // Property: Refresh button should be disabled when syncing
      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeDisabled();

      unmount();
    });
  });

  describe('Search Toggle', () => {
    /**
     * Validates search toggle functionality
     */
    it('should always render search toggle button', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          syncStatusArb,
          (threadCount, urgentCount, isCompact, syncStatus) => {
            const validUrgentCount = Math.min(urgentCount, threadCount);

            const onRefresh = vi.fn();
            const onSearch = vi.fn();

            const { unmount } = render(
              <NewPageHeader
                threadCount={threadCount}
                urgentCount={validUrgentCount}
                isCompact={isCompact}
                syncStatus={syncStatus}
                onRefresh={onRefresh}
                onSearch={onSearch}
              />
            );

            // Property: Search toggle button should always be present
            const searchToggle = screen.getByTestId('search-toggle');
            expect(searchToggle).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Selection Mode (Batch Mode)', () => {
    /**
     * Validates Batch Mode toggle behavior
     */
    it('should display selection mode toggle when onToggleBatchMode is provided', { timeout: 20000 }, () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (isBatchMode) => {
            const onToggleBatchMode = vi.fn();
            const { unmount } = render(
              <NewPageHeader
                threadCount={10}
                urgentCount={0}
                isCompact={false}
                syncStatus="idle"
                onRefresh={vi.fn()}
                onSearch={vi.fn()}
                onToggleBatchMode={onToggleBatchMode}
                isBatchMode={isBatchMode}
              />
            );

            const toggle = screen.getByTestId('batch-mode-toggle');
            expect(toggle).toBeInTheDocument();
            expect(toggle).toHaveAttribute('aria-pressed', String(isBatchMode));
            expect(screen.getByText('Select')).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should have correct aria-label based on isBatchMode', { timeout: 20000 }, () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (isBatchMode) => {
            const { unmount } = render(
              <NewPageHeader
                threadCount={10}
                urgentCount={0}
                isCompact={false}
                syncStatus="idle"
                onRefresh={vi.fn()}
                onSearch={vi.fn()}
                onToggleBatchMode={vi.fn()}
                isBatchMode={isBatchMode}
              />
            );

            const toggle = screen.getByTestId('batch-mode-toggle');
            const expectedLabel = isBatchMode ? "Exit selection mode" : "Enter selection mode";
            expect(toggle).toHaveAttribute('aria-label', expectedLabel);

            unmount();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Accessibility', () => {
    /**
     * Validates accessibility requirements
     */
    it('should have proper role and aria attributes', () => {
      const onRefresh = vi.fn();
      const onSearch = vi.fn();

      const { unmount } = render(
        <NewPageHeader
          threadCount={10}
          urgentCount={2}
          isCompact={false}
          syncStatus="idle"
          onRefresh={onRefresh}
          onSearch={onSearch}
        />
      );

      // Property: Header should have banner role
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();

      // Property: Buttons should have aria-labels
      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh threads');

      const searchToggle = screen.getByTestId('search-toggle');
      expect(searchToggle).toHaveAttribute('aria-label');

      unmount();
    });
  });
});
