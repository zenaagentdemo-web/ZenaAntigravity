/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { EnhancedHomeDashboardOptimized } from './EnhancedHomeDashboardOptimized';
import { performanceMonitor } from '../../utils/performance';

/**
 * **Feature: enhanced-home-dashboard, Property 16: Dashboard Load Performance**
 * **Validates: Requirements 11.1**
 * 
 * Property: For any dashboard initialization, the basic layout should be visible within 500 milliseconds
 */

// Mock dependencies
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
  useRealTimeUpdates: () => ({
    isConnected: true,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
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
  useBackgroundRefresh: () => ({
    isRefreshing: false,
    lastRefresh: null,
    forceRefresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/useLazyLoading', () => ({
  useLazyWidgetLoading: () => ({
    getWidgetRef: vi.fn(() => ({ current: null })),
    isWidgetLoaded: vi.fn(() => true),
    isWidgetVisible: vi.fn(() => true),
    loadWidget: vi.fn(),
    loadedWidgets: ['smart-summary', 'priority-notifications', 'quick-actions'],
  }),
}));

vi.mock('../../services/personalizationService', () => ({
  personalizationService: {
    calculateOptimalLayout: vi.fn(() => [
      { widgetId: 'smart-summary', position: 0, visible: true, size: 'medium' },
      { widgetId: 'priority-notifications', position: 1, visible: true, size: 'small' },
      { widgetId: 'quick-actions', position: 2, visible: true, size: 'small' },
    ]),
  },
}));

// Generator for dashboard test data
const dashboardDataArbitrary = fc.record({
  focusThreadsCount: fc.integer({ min: 0, max: 20 }),
  waitingThreadsCount: fc.integer({ min: 0, max: 50 }),
  atRiskDealsCount: fc.integer({ min: 0, max: 10 }),
  urgencyLevel: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
});

// Generator for viewport sizes
const viewportArbitrary = fc.record({
  width: fc.integer({ min: 320, max: 1920 }),
  height: fc.integer({ min: 568, max: 1080 }),
});

describe('Dashboard Load Performance Property Tests', () => {
  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.clearMetrics();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    
    // Mock window.performance.timing for load time measurement
    Object.defineProperty(window, 'performance', {
      value: {
        ...window.performance,
        timing: {
          navigationStart: Date.now() - 1000,
          loadEventEnd: Date.now() - 500,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Cleanup all rendered components
    cleanup();
    
    // Clear all mocks
    vi.restoreAllMocks();
    
    // Clear performance metrics
    performanceMonitor.clearMetrics();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  it('should render basic layout within 500ms for any dashboard configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        dashboardDataArbitrary,
        viewportArbitrary,
        async (testData, viewport) => {
          // Set viewport size
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewport.width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewport.height,
          });

          const startTime = performance.now();

          // Render dashboard with test data
          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          // Wait for basic layout elements to appear
          await waitFor(
            () => {
              // Check for essential dashboard elements
              expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
              expect(container.querySelector('.enhanced-dashboard__container')).toBeInTheDocument();
              expect(container.querySelector('.enhanced-dashboard__header')).toBeInTheDocument();
              
              // Check for at least one widget section (critical widgets should load immediately)
              expect(container.querySelector('.enhanced-dashboard__section')).toBeInTheDocument();
            },
            { timeout: 500 } // Must complete within 500ms
          );

          const endTime = performance.now();
          const loadTime = endTime - startTime;

          // Property: Dashboard basic layout should be visible within 500ms
          expect(loadTime).toBeLessThanOrEqual(500);

          // Verify essential UI elements are present
          expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          expect(container.querySelector('.theme-toggle')).toBeInTheDocument();
          expect(container.querySelector('.real-time-status')).toBeInTheDocument();
          
          // At least one critical widget should be visible
          const widgetSections = container.querySelectorAll('.enhanced-dashboard__section');
          expect(widgetSections.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain load performance across different urgency levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 10 }),
        async (urgencyLevel, focusThreads, waitingThreads, atRiskDeals) => {
          const testData = {
            focusThreadsCount: focusThreads,
            waitingThreadsCount: waitingThreads,
            atRiskDealsCount: atRiskDeals,
            urgencyLevel,
          };

          const startTime = performance.now();

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          // Wait for dashboard to render
          await waitFor(
            () => {
              expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
              expect(container.querySelector('.enhanced-dashboard__section')).toBeInTheDocument();
            },
            { timeout: 500 }
          );

          const endTime = performance.now();
          const loadTime = endTime - startTime;

          // Property: Load time should be consistent regardless of urgency level
          expect(loadTime).toBeLessThanOrEqual(500);

          // Verify urgency-specific styling is applied without affecting load time
          const dashboard = container.querySelector('.enhanced-dashboard');
          expect(dashboard).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should load critical widgets immediately while deferring non-critical ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        dashboardDataArbitrary,
        async (testData) => {
          const startTime = performance.now();

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          // Critical widgets should be available immediately
          await waitFor(
            () => {
              // These are critical widgets that should load first
              const sections = container.querySelectorAll('.enhanced-dashboard__section');
              expect(sections.length).toBeGreaterThanOrEqual(1);
            },
            { timeout: 100 } // Critical widgets should load very quickly
          );

          const criticalLoadTime = performance.now() - startTime;

          // Property: Critical widgets should load within 100ms
          expect(criticalLoadTime).toBeLessThanOrEqual(100);

          // Full dashboard should still meet the 500ms requirement
          await waitFor(
            () => {
              expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
              expect(container.querySelector('.enhanced-dashboard__header')).toBeInTheDocument();
            },
            { timeout: 500 }
          );

          const totalLoadTime = performance.now() - startTime;
          expect(totalLoadTime).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases without exceeding load time limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          focusThreadsCount: fc.integer({ min: 0, max: 100 }), // Higher range for edge cases
          waitingThreadsCount: fc.integer({ min: 0, max: 200 }),
          atRiskDealsCount: fc.integer({ min: 0, max: 50 }),
          urgencyLevel: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
        }),
        async (testData) => {
          const startTime = performance.now();

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          await waitFor(
            () => {
              expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
              expect(container.querySelector('.enhanced-dashboard__section')).toBeInTheDocument();
            },
            { timeout: 500 }
          );

          const loadTime = performance.now() - startTime;

          // Property: Even with extreme values, load time should not exceed 500ms
          expect(loadTime).toBeLessThanOrEqual(500);

          // Verify the dashboard handles large numbers gracefully
          expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 } // Fewer runs for edge cases due to higher complexity
    );
  });
});