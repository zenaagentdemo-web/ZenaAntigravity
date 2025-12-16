/**
 * Property-based tests for sync status transparency
 * **Feature: enhanced-home-dashboard, Property 23: Sync Status Transparency**
 * **Validates: Requirements 15.1, 15.4**
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useOffline } from '../../hooks/useOffline';

// Mock the useOffline hook
vi.mock('../../hooks/useOffline');

const mockUseOffline = vi.mocked(useOffline);

// Generators for test data
const offlineStateGenerator = fc.record({
  isOnline: fc.boolean(),
  isSyncing: fc.boolean(),
  pendingActions: fc.integer({ min: 0, max: 100 }),
  lastSyncTime: fc.option(fc.integer({ min: 1000000000000, max: Date.now() })),
  dataFreshness: fc.constantFrom('fresh', 'stale', 'unknown'),
  unresolvedConflicts: fc.integer({ min: 0, max: 10 }),
});

const positionGenerator = fc.constantFrom('top-right', 'bottom-right', 'inline');

describe('SyncStatusIndicator Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    // Clear any existing DOM content
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });

  it('Property 23.1: Sync status transparency - last update time should be displayed when connectivity is available', () => {
    fc.assert(
      fc.property(
        fc.record({
          isOnline: fc.constant(true),
          isSyncing: fc.boolean(),
          pendingActions: fc.integer({ min: 0, max: 50 }),
          lastSyncTime: fc.integer({ min: 1000000000000, max: Date.now() }),
          dataFreshness: fc.constantFrom('fresh', 'stale'),
          unresolvedConflicts: fc.integer({ min: 0, max: 5 }),
        }),
        positionGenerator,
        fc.boolean(), // showDetails
        (state, position, showDetails) => {
          mockUseOffline.mockReturnValue({
            ...state,
            syncQueue: vi.fn(),
            updatePendingCount: vi.fn(),
          });

          const { unmount } = render(
            <SyncStatusIndicator 
              position={position} 
              showDetails={showDetails}
            />
          );

          try {
            // When online with connectivity, should show sync status
            if (state.isSyncing || state.dataFreshness === 'stale' || showDetails) {
              // Should have a status indicator
              const statusElement = screen.getByRole('status');
              expect(statusElement).toBeInTheDocument();
              
              // Should have proper accessibility attributes
              expect(statusElement).toHaveAttribute('aria-live', 'polite');
              
              // Should display meaningful status information
              const statusText = statusElement.textContent || '';
              expect(statusText.trim().length).toBeGreaterThan(0);
              
              // When showing details or stale data (but not syncing), should include last sync time
              if ((showDetails || state.dataFreshness === 'stale') && !state.isSyncing) {
                // Should contain time-related information
                expect(statusText).toMatch(/(ago|now|synced)/i);
              }
            }
            
            // When syncing, should indicate syncing status
            if (state.isSyncing) {
              expect(screen.getByText(/syncing/i)).toBeInTheDocument();
              
              if (state.pendingActions > 0) {
                // Should show pending actions count
                const actionText = state.pendingActions === 1 ? '1 action' : `${state.pendingActions} actions`;
                expect(screen.getByText(new RegExp(actionText, 'i'))).toBeInTheDocument();
              }
            }
            
            // When data is stale, should indicate outdated status
            if (state.dataFreshness === 'stale' && !state.isSyncing) {
              expect(screen.getByText(/outdated|stale/i)).toBeInTheDocument();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 23.2: Sync status transparency - offline status should be clearly indicated', () => {
    fc.assert(
      fc.property(
        fc.record({
          isOnline: fc.constant(false),
          isSyncing: fc.constant(false), // Can't sync when offline
          pendingActions: fc.integer({ min: 0, max: 20 }),
          lastSyncTime: fc.option(fc.integer({ min: 1000000000000, max: Date.now() })),
          dataFreshness: fc.constantFrom('stale', 'unknown'),
          unresolvedConflicts: fc.integer({ min: 0, max: 5 }),
        }),
        positionGenerator,
        (state, position) => {
          mockUseOffline.mockReturnValue({
            ...state,
            syncQueue: vi.fn(),
            updatePendingCount: vi.fn(),
          });

          const { unmount } = render(
            <SyncStatusIndicator position={position} />
          );

          try {
            // Should always show status when offline
            const statusElement = screen.getByRole('status');
            expect(statusElement).toBeInTheDocument();
            
            // Should clearly indicate offline status
            expect(screen.getByText(/offline/i)).toBeInTheDocument();
            
            // Should show cached data information
            if (state.pendingActions > 0) {
              const actionText = state.pendingActions === 1 ? '1 action queued' : `${state.pendingActions} actions queued`;
              expect(screen.getByText(actionText)).toBeInTheDocument();
            } else {
              expect(screen.getByText(/cached data/i)).toBeInTheDocument();
            }
            
            // Should have proper accessibility
            expect(statusElement).toHaveAttribute('aria-live', 'polite');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 23.3: Time formatting should be consistent and human-readable', () => {
    const timeTestCases = [
      { timeDiff: 0, expectedPattern: /just now/i },
      { timeDiff: 30000, expectedPattern: /just now/i }, // 30 seconds
      { timeDiff: 300000, expectedPattern: /5m ago/i }, // 5 minutes
      { timeDiff: 3600000, expectedPattern: /1h ago/i }, // 1 hour
      { timeDiff: 7200000, expectedPattern: /2h ago/i }, // 2 hours
      { timeDiff: 86400000, expectedPattern: /1d ago/i }, // 1 day
    ];

    timeTestCases.forEach(({ timeDiff, expectedPattern }) => {
      const lastSyncTime = Date.now() - timeDiff;
      const state = {
        isOnline: true,
        isSyncing: false,
        pendingActions: 0,
        lastSyncTime,
        dataFreshness: 'stale' as const,
        unresolvedConflicts: 0,
      };

      mockUseOffline.mockReturnValue({
        ...state,
        syncQueue: vi.fn(),
        updatePendingCount: vi.fn(),
      });

      const { unmount } = render(<SyncStatusIndicator showDetails={true} />);

      try {
        const statusElement = screen.getByRole('status');
        const statusText = statusElement.textContent || '';
        
        // Time should be formatted in a human-readable way
        expect(statusText).toMatch(expectedPattern);
        
        // Should contain "synced" to indicate what the time refers to
        expect(statusText).toMatch(/synced/i);
      } finally {
        unmount();
      }
    });
  });

  it('Property 23.4: Status indicators should have proper visual hierarchy', () => {
    fc.assert(
      fc.property(
        offlineStateGenerator,
        positionGenerator,
        (state, position) => {
          mockUseOffline.mockReturnValue({
            ...state,
            syncQueue: vi.fn(),
            updatePendingCount: vi.fn(),
          });

          const { unmount } = render(
            <SyncStatusIndicator position={position} />
          );

          try {
            // If status is shown, it should have proper CSS classes for visual hierarchy
            const statusElements = screen.queryAllByRole('status');
            
            statusElements.forEach(element => {
              // Should have base class
              expect(element).toHaveClass('sync-status-indicator');
              
              // Should have position-specific class
              expect(element).toHaveClass(`sync-status-indicator--${position}`);
              
              // Should have status-type specific class
              if (state.isSyncing) {
                expect(element).toHaveClass('sync-status-indicator--syncing');
              } else if (!state.isOnline) {
                expect(element).toHaveClass('sync-status-indicator--offline');
              } else if (state.dataFreshness === 'stale') {
                expect(element).toHaveClass('sync-status-indicator--stale');
              } else {
                expect(element).toHaveClass('sync-status-indicator--online');
              }
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  it('Property 23.5: Component should handle null/undefined lastSyncTime gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          isOnline: fc.boolean(),
          isSyncing: fc.boolean(),
          pendingActions: fc.integer({ min: 0, max: 10 }),
          lastSyncTime: fc.constant(null),
          dataFreshness: fc.constantFrom('unknown', 'stale'),
          unresolvedConflicts: fc.integer({ min: 0, max: 3 }),
        }),
        (state) => {
          mockUseOffline.mockReturnValue({
            ...state,
            syncQueue: vi.fn(),
            updatePendingCount: vi.fn(),
          });

          const { unmount } = render(<SyncStatusIndicator showDetails={true} />);

          try {
            // Should not crash with null lastSyncTime
            if (state.isSyncing || !state.isOnline || state.dataFreshness === 'stale') {
              const statusElement = screen.getByRole('status');
              expect(statusElement).toBeInTheDocument();
              
              // Should handle null lastSyncTime gracefully
              const statusText = statusElement.textContent || '';
              if (statusText.includes('synced')) {
                expect(statusText).toMatch(/never/i);
              }
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Property 23.6: Component should not render when online with fresh data and showDetails is false', () => {
    const freshOnlineState = {
      isOnline: true,
      isSyncing: false,
      pendingActions: 0,
      lastSyncTime: Date.now(),
      dataFreshness: 'fresh' as const,
      unresolvedConflicts: 0,
    };

    mockUseOffline.mockReturnValue({
      ...freshOnlineState,
      syncQueue: vi.fn(),
      updatePendingCount: vi.fn(),
    });

    const { container, unmount } = render(
      <SyncStatusIndicator showDetails={false} />
    );

    try {
      // Should not render anything when online with fresh data and showDetails is false
      expect(container.firstChild).toBeNull();
      
      // Should not have any status elements
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      unmount();
    }
  });

  it('Property 23.7: Accessibility attributes should be consistent across all states', () => {
    fc.assert(
      fc.property(
        offlineStateGenerator,
        (state) => {
          mockUseOffline.mockReturnValue({
            ...state,
            syncQueue: vi.fn(),
            updatePendingCount: vi.fn(),
          });

          const { unmount } = render(<SyncStatusIndicator showDetails={true} />);

          try {
            const statusElements = screen.queryAllByRole('status');
            
            // If any status is shown, it should have proper accessibility
            statusElements.forEach(element => {
              // Should have role="status" for screen readers
              expect(element).toHaveAttribute('role', 'status');
              
              // Should have aria-live for dynamic updates
              expect(element).toHaveAttribute('aria-live', 'polite');
              
              // Should have meaningful text content
              expect(element.textContent).toBeTruthy();
              expect(element.textContent!.trim().length).toBeGreaterThan(0);
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});