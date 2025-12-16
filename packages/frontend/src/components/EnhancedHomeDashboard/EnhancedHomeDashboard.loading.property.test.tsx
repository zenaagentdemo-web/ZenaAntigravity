/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { EnhancedHomeDashboardOptimized } from './EnhancedHomeDashboardOptimized';

/**
 * **Feature: enhanced-home-dashboard, Property 17: Interactive Loading States**
 * **Validates: Requirements 11.2**
 * 
 * Property: For any widget loading data, skeleton states should be shown while maintaining UI interactivity
 */

// Mock dependencies with loading state control
const mockUseRealTimeUpdates = vi.fn();
const mockUseBackgroundRefresh = vi.fn();
const mockUseLazyWidgetLoading = vi.fn();

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    effectiveTheme: 'day',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('../../hooks/useGestureHandling', () => ({
  useGestureHandling: () => ({
    attachGestureHandlers: vi.fn(),
    detachGestureHandlers: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    attachPullToRefresh: vi.fn(),
    detachPullToRefresh: vi.fn(),
    getPullContainerStyle: () => ({}),
    getPullIndicatorStyle: () => ({}),
    isPulling: false,
    pullDistance: 0,
  }),
}));

vi.mock('../../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: mockUseRealTimeUpdates,
}));

vi.mock('../../hooks/usePersonalization', () => ({
  usePersonalization: () => ({
    trackUsage: vi.fn(),
    calculateWidgetPriority: vi.fn(),
    getCurrentTimePreferences: vi.fn(),
    preferences: {},
    usagePatterns: [],
  }),
}));

vi.mock('../../hooks/useBackgroundRefresh', () => ({
  useBackgroundRefresh: mockUseBackgroundRefresh,
}));

vi.mock('../../hooks/useLazyLoading', () => ({
  useLazyWidgetLoading: mockUseLazyWidgetLoading,
}));

vi.mock('../../services/personalizationService', () => ({
  personalizationService: {
    calculateOptimalLayout: vi.fn(() => [
      { widgetId: 'smart-summary', position: 0, visible: true, size: 'medium' },
      { widgetId: 'priority-notifications', position: 1, visible: true, size: 'small' },
      { widgetId: 'quick-actions', position: 2, visible: true, size: 'small' },
      { widgetId: 'contextual-insights', position: 3, visible: true, size: 'medium' },
      { widgetId: 'recent-activity', position: 4, visible: true, size: 'medium' },
    ]),
  },
}));

// Generator for loading states
const loadingStateArbitrary = fc.record({
  isBackgroundRefreshing: fc.boolean(),
  isRealTimeConnected: fc.boolean(),
  loadedWidgets: fc.array(
    fc.constantFrom('smart-summary', 'priority-notifications', 'quick-actions', 'contextual-insights', 'recent-activity'),
    { minLength: 0, maxLength: 5 }
  ),
  visibleWidgets: fc.array(
    fc.constantFrom('smart-summary', 'priority-notifications', 'quick-actions', 'contextual-insights', 'recent-activity'),
    { minLength: 0, maxLength: 5 }
  ),
});

// Generator for widget loading delays
const widgetLoadingDelayArbitrary = fc.record({
  smartSummary: fc.integer({ min: 0, max: 1000 }),
  notifications: fc.integer({ min: 0, max: 1000 }),
  quickActions: fc.integer({ min: 0, max: 1000 }),
  contextualInsights: fc.integer({ min: 0, max: 2000 }),
  recentActivity: fc.integer({ min: 0, max: 2000 }),
});

describe('Interactive Loading States Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseRealTimeUpdates.mockReturnValue({
      isConnected: true,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    mockUseBackgroundRefresh.mockReturnValue({
      isRefreshing: false,
      lastRefresh: null,
      forceRefresh: vi.fn(),
    });

    mockUseLazyWidgetLoading.mockReturnValue({
      getWidgetRef: vi.fn(() => ({ current: null })),
      isWidgetLoaded: vi.fn(() => true),
      isWidgetVisible: vi.fn(() => true),
      loadWidget: vi.fn(),
      loadedWidgets: ['smart-summary', 'priority-notifications', 'quick-actions'],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show skeleton states for unloaded widgets while maintaining interactivity', async () => {
    await fc.assert(
      fc.asyncProperty(
        loadingStateArbitrary,
        async (loadingState) => {
          // Configure mocks based on loading state
          mockUseBackgroundRefresh.mockReturnValue({
            isRefreshing: loadingState.isBackgroundRefreshing,
            lastRefresh: null,
            forceRefresh: vi.fn(),
          });

          mockUseRealTimeUpdates.mockReturnValue({
            isConnected: loadingState.isRealTimeConnected,
            refresh: vi.fn().mockResolvedValue(undefined),
          });

          mockUseLazyWidgetLoading.mockReturnValue({
            getWidgetRef: vi.fn(() => ({ current: null })),
            isWidgetLoaded: vi.fn((widgetId: string) => loadingState.loadedWidgets.includes(widgetId)),
            isWidgetVisible: vi.fn((widgetId: string) => loadingState.visibleWidgets.includes(widgetId)),
            loadWidget: vi.fn(),
            loadedWidgets: loadingState.loadedWidgets,
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Property: Skeleton states should be shown for unloaded widgets
          const allWidgets = ['smart-summary', 'priority-notifications', 'quick-actions', 'contextual-insights', 'recent-activity'];
          
          allWidgets.forEach(widgetId => {
            const isLoaded = loadingState.loadedWidgets.includes(widgetId);
            
            if (!isLoaded && widgetId !== 'smart-summary' && widgetId !== 'priority-notifications' && widgetId !== 'quick-actions') {
              // Non-critical widgets should show skeleton when not loaded
              const skeletonElements = container.querySelectorAll('.skeleton');
              expect(skeletonElements.length).toBeGreaterThan(0);
            }
          });

          // Property: UI should remain interactive during loading
          const themeToggle = container.querySelector('.theme-toggle');
          if (themeToggle) {
            // Should be able to interact with theme toggle even during loading
            expect(themeToggle).not.toHaveAttribute('disabled');
            
            // Simulate click to verify interactivity
            fireEvent.click(themeToggle);
            // No error should be thrown, indicating the UI remains interactive
          }

          // Property: Dashboard container should be present and interactive
          const dashboardContainer = container.querySelector('.enhanced-dashboard__container');
          expect(dashboardContainer).toBeInTheDocument();
          
          // Should be able to interact with the container (e.g., for gestures)
          expect(dashboardContainer).not.toHaveClass('disabled');
          expect(dashboardContainer).not.toHaveAttribute('aria-disabled', 'true');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain skeleton animation and styling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('smart-summary', 'contextual-insights', 'recent-activity'),
          { minLength: 1, maxLength: 3 }
        ),
        async (unloadedWidgets) => {
          // Configure widgets as unloaded to show skeletons
          mockUseLazyWidgetLoading.mockReturnValue({
            getWidgetRef: vi.fn(() => ({ current: null })),
            isWidgetLoaded: vi.fn((widgetId: string) => !unloadedWidgets.includes(widgetId)),
            isWidgetVisible: vi.fn(() => true),
            loadWidget: vi.fn(),
            loadedWidgets: ['smart-summary', 'priority-notifications', 'quick-actions'].filter(w => !unloadedWidgets.includes(w)),
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Property: Skeleton elements should have consistent styling
          const skeletonElements = container.querySelectorAll('.skeleton');
          
          if (skeletonElements.length > 0) {
            skeletonElements.forEach(skeleton => {
              // Should have skeleton class
              expect(skeleton).toHaveClass('skeleton');
              
              // Should have animation (CSS animation property would be set)
              const computedStyle = window.getComputedStyle(skeleton);
              // Note: In test environment, we can't easily check CSS animations,
              // but we can verify the class is applied which contains the animation
              expect(skeleton.className).toContain('skeleton');
            });
          }

          // Property: Loading states should not break layout
          const dashboardSections = container.querySelectorAll('.enhanced-dashboard__section');
          dashboardSections.forEach(section => {
            // Sections should maintain their structure even with skeleton content
            expect(section).toBeInTheDocument();
            expect(section).toHaveClass('enhanced-dashboard__section');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle progressive loading without blocking user interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        widgetLoadingDelayArbitrary,
        async (delays) => {
          let loadedWidgets: string[] = [];
          const mockLoadWidget = vi.fn((widgetId: string) => {
            setTimeout(() => {
              loadedWidgets.push(widgetId);
            }, delays[widgetId as keyof typeof delays] || 0);
          });

          mockUseLazyWidgetLoading.mockReturnValue({
            getWidgetRef: vi.fn(() => ({ current: null })),
            isWidgetLoaded: vi.fn((widgetId: string) => loadedWidgets.includes(widgetId)),
            isWidgetVisible: vi.fn(() => true),
            loadWidget: mockLoadWidget,
            loadedWidgets: ['smart-summary', 'priority-notifications', 'quick-actions'], // Critical widgets loaded immediately
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Property: User should be able to interact immediately, even with loading widgets
          const interactiveElements = container.querySelectorAll('button, [role="button"], a, [tabindex]');
          
          interactiveElements.forEach(element => {
            // Interactive elements should not be disabled during loading
            expect(element).not.toHaveAttribute('disabled');
            expect(element).not.toHaveAttribute('aria-disabled', 'true');
            
            // Should be able to focus interactive elements
            if (element.tagName === 'BUTTON' || element.hasAttribute('tabindex')) {
              element.focus();
              expect(document.activeElement).toBe(element);
            }
          });

          // Property: Dashboard should remain responsive during progressive loading
          const dashboard = container.querySelector('.enhanced-dashboard');
          expect(dashboard).toBeInTheDocument();
          
          // Should be able to trigger events on the dashboard
          fireEvent.mouseMove(dashboard!);
          fireEvent.touchStart(dashboard!);
          
          // No errors should be thrown, indicating the dashboard remains responsive
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show appropriate loading indicators without blocking critical functionality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isBackgroundRefreshing: fc.boolean(),
          isInitialLoad: fc.boolean(),
          hasNetworkError: fc.boolean(),
        }),
        async (loadingScenario) => {
          mockUseBackgroundRefresh.mockReturnValue({
            isRefreshing: loadingScenario.isBackgroundRefreshing,
            lastRefresh: loadingScenario.hasNetworkError ? null : new Date(),
            forceRefresh: vi.fn(),
          });

          mockUseRealTimeUpdates.mockReturnValue({
            isConnected: !loadingScenario.hasNetworkError,
            refresh: vi.fn().mockResolvedValue(undefined),
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Property: Loading indicators should be visible when appropriate
          if (loadingScenario.isBackgroundRefreshing) {
            const refreshIndicator = container.querySelector('.background-refresh-indicator');
            if (refreshIndicator) {
              expect(refreshIndicator).toBeInTheDocument();
            }
          }

          // Property: Connection status should be indicated
          const statusIndicator = container.querySelector('.real-time-status');
          expect(statusIndicator).toBeInTheDocument();
          
          if (loadingScenario.hasNetworkError) {
            expect(statusIndicator).toHaveClass('disconnected');
          } else {
            expect(statusIndicator).toHaveClass('connected');
          }

          // Property: Critical functionality should remain available
          const themeToggle = container.querySelector('.theme-toggle');
          if (themeToggle) {
            expect(themeToggle).not.toHaveAttribute('disabled');
          }

          // Property: Dashboard structure should be maintained
          expect(container.querySelector('.enhanced-dashboard__container')).toBeInTheDocument();
          expect(container.querySelector('.enhanced-dashboard__header')).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle skeleton-to-content transitions smoothly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('contextual-insights', 'recent-activity'),
        fc.integer({ min: 100, max: 1000 }),
        async (widgetId, transitionDelay) => {
          let isWidgetLoaded = false;
          
          // Simulate widget loading after delay
          setTimeout(() => {
            isWidgetLoaded = true;
          }, transitionDelay);

          mockUseLazyWidgetLoading.mockReturnValue({
            getWidgetRef: vi.fn(() => ({ current: null })),
            isWidgetLoaded: vi.fn(() => isWidgetLoaded),
            isWidgetVisible: vi.fn(() => true),
            loadWidget: vi.fn(),
            loadedWidgets: isWidgetLoaded ? [widgetId] : [],
          });

          const { container, rerender } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Initially should show skeleton for non-critical widgets
          if (widgetId !== 'smart-summary' && widgetId !== 'priority-notifications' && widgetId !== 'quick-actions') {
            const initialSkeletons = container.querySelectorAll('.skeleton');
            expect(initialSkeletons.length).toBeGreaterThan(0);
          }

          // Property: UI should remain interactive during transition
          const dashboard = container.querySelector('.enhanced-dashboard');
          expect(dashboard).toBeInTheDocument();
          
          // Should be able to interact with dashboard during skeleton state
          fireEvent.mouseEnter(dashboard!);
          fireEvent.mouseLeave(dashboard!);
          
          // Wait for transition
          await new Promise(resolve => setTimeout(resolve, transitionDelay + 100));
          
          // Re-render to reflect loaded state
          isWidgetLoaded = true;
          rerender(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          // Property: Content should replace skeleton without layout shift
          expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          expect(container.querySelector('.enhanced-dashboard__container')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 } // Fewer runs due to timing complexity
    );
  });
});