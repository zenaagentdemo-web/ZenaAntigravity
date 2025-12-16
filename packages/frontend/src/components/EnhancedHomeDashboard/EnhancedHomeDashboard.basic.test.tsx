/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EnhancedHomeDashboardOptimized } from './EnhancedHomeDashboardOptimized';
import { performanceMonitor } from '../../utils/performance';

/**
 * **Feature: enhanced-home-dashboard, Property 16: Dashboard Load Performance**
 * **Validates: Requirements 11.1**
 * 
 * Basic test to verify performance optimizations are working
 */

// Mock all dependencies to prevent memory leaks
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
    refresh: vi.fn(),
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

vi.mock('../../hooks/useLazyLoading', () => ({
  useLazyWidgetLoading: () => ({
    getWidgetRef: () => ({ current: null }),
    isWidgetLoaded: () => true,
    isWidgetVisible: () => true,
    loadWidget: vi.fn(),
    loadedWidgets: ['smart-summary', 'quick-actions'],
    visibleWidgets: ['smart-summary', 'quick-actions'],
  }),
}));

vi.mock('../../hooks/useBackgroundRefresh', () => ({
  useBackgroundRefresh: () => ({
    isRefreshing: false,
    lastRefresh: null,
    forceRefresh: vi.fn(),
  }),
}));

vi.mock('../../services/personalizationService', () => ({
  personalizationService: {
    calculateOptimalLayout: () => [
      { widgetId: 'smart-summary', position: 0, visible: true, size: 'medium' },
      { widgetId: 'quick-actions', position: 1, visible: true, size: 'small' },
    ],
  },
}));

describe('Dashboard Performance Basic Tests', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    vi.clearAllMocks();
  });

  it('should render dashboard with performance optimizations', () => {
    const testData = {
      focusThreadsCount: 2,
      waitingThreadsCount: 5,
      atRiskDealsCount: 1,
      urgencyLevel: 'medium' as const,
    };

    const startTime = performance.now();

    const { container, unmount } = render(
      <BrowserRouter>
        <EnhancedHomeDashboardOptimized testData={testData} />
      </BrowserRouter>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    try {
      // Verify basic structure exists
      expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
      expect(container.querySelector('.enhanced-dashboard__container')).toBeInTheDocument();
      
      // Verify performance debug panel exists in development
      expect(container.querySelector('.performance-debug-panel')).toBeInTheDocument();
      
      // Verify render time is reasonable
      expect(renderTime).toBeLessThan(1000);
      
      console.log(`Dashboard rendered in ${renderTime.toFixed(2)}ms`);
    } finally {
      unmount();
    }
  });

  it('should handle different urgency levels', () => {
    const urgencyLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    
    urgencyLevels.forEach(urgencyLevel => {
      const testData = {
        focusThreadsCount: 1,
        waitingThreadsCount: 3,
        atRiskDealsCount: 0,
        urgencyLevel,
      };

      const { container, unmount } = render(
        <BrowserRouter>
          <EnhancedHomeDashboardOptimized testData={testData} />
        </BrowserRouter>
      );

      try {
        expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
      } finally {
        unmount();
      }
    });
  });

  it('should initialize performance monitoring', () => {
    const testData = {
      focusThreadsCount: 0,
      waitingThreadsCount: 0,
      atRiskDealsCount: 0,
      urgencyLevel: 'low' as const,
    };

    const { unmount } = render(
      <BrowserRouter>
        <EnhancedHomeDashboardOptimized testData={testData} />
      </BrowserRouter>
    );

    try {
      // Verify performance monitor is available
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.getDashboardMetrics).toBeDefined();
      expect(performanceMonitor.checkPerformanceRequirements).toBeDefined();
      
      const metrics = performanceMonitor.getDashboardMetrics();
      expect(metrics).toBeDefined();
      
      const requirements = performanceMonitor.checkPerformanceRequirements();
      expect(requirements).toBeDefined();
      expect(requirements.dashboardLoadTime).toBeDefined();
      expect(requirements.interactionResponseTime).toBeDefined();
      expect(requirements.backgroundRefresh).toBeDefined();
    } finally {
      unmount();
    }
  });
});