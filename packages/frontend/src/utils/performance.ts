/**
 * Performance monitoring utilities for tracking load times and navigation
 */

export interface PerformanceMetrics {
  loadTime: number;
  navigationTime: number;
  interactionTime: number;
  componentRenderTime: number;
  timestamp: number;
  type: 'load' | 'navigation' | 'interaction' | 'render';
  componentName?: string;
  actionType?: string;
}

export interface DashboardPerformanceMetrics {
  dashboardLoadTime: number;
  widgetLoadTimes: Record<string, number>;
  interactionResponseTimes: Record<string, number>;
  backgroundRefreshTime: number;
  totalWidgets: number;
  loadedWidgets: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private navigationStartTime: number | null = null;
  private interactionStartTimes: Map<string, number> = new Map();
  private componentRenderTimes: Map<string, number> = new Map();
  private dashboardMetrics: DashboardPerformanceMetrics = {
    dashboardLoadTime: 0,
    widgetLoadTimes: {},
    interactionResponseTimes: {},
    backgroundRefreshTime: 0,
    totalWidgets: 0,
    loadedWidgets: 0,
  };

  /**
   * Measure initial page load time
   */
  measureLoadTime(): number | null {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;

    if (loadTime > 0) {
      this.metrics.push({
        loadTime,
        navigationTime: 0,
        interactionTime: 0,
        componentRenderTime: 0,
        timestamp: Date.now(),
        type: 'load',
      });
      
      this.dashboardMetrics.dashboardLoadTime = loadTime;
    }

    return loadTime;
  }

  /**
   * Start measuring navigation time
   */
  startNavigation(): void {
    this.navigationStartTime = performance.now();
  }

  /**
   * End measuring navigation time and return duration
   */
  endNavigation(): number | null {
    if (this.navigationStartTime === null) {
      return null;
    }

    const navigationTime = performance.now() - this.navigationStartTime;
    this.navigationStartTime = null;

    this.metrics.push({
      loadTime: 0,
      navigationTime,
      interactionTime: 0,
      componentRenderTime: 0,
      timestamp: Date.now(),
      type: 'navigation',
    });

    return navigationTime;
  }

  /**
   * Start measuring interaction response time
   */
  startInteraction(actionType: string): void {
    this.interactionStartTimes.set(actionType, performance.now());
  }

  /**
   * End measuring interaction response time
   */
  endInteraction(actionType: string): number | null {
    const startTime = this.interactionStartTimes.get(actionType);
    if (startTime === undefined) {
      return null;
    }

    const interactionTime = performance.now() - startTime;
    this.interactionStartTimes.delete(actionType);

    this.metrics.push({
      loadTime: 0,
      navigationTime: 0,
      interactionTime,
      componentRenderTime: 0,
      timestamp: Date.now(),
      type: 'interaction',
      actionType,
    });

    this.dashboardMetrics.interactionResponseTimes[actionType] = interactionTime;
    return interactionTime;
  }

  /**
   * Measure component render time
   */
  measureComponentRender(componentName: string, renderTime: number): void {
    this.componentRenderTimes.set(componentName, renderTime);

    this.metrics.push({
      loadTime: 0,
      navigationTime: 0,
      interactionTime: 0,
      componentRenderTime: renderTime,
      timestamp: Date.now(),
      type: 'render',
      componentName,
    });

    if (componentName.includes('Widget') || componentName.includes('Panel')) {
      this.dashboardMetrics.widgetLoadTimes[componentName] = renderTime;
    }
  }

  /**
   * Start measuring background refresh
   */
  startBackgroundRefresh(): void {
    this.interactionStartTimes.set('background-refresh', performance.now());
  }

  /**
   * End measuring background refresh
   */
  endBackgroundRefresh(): number | null {
    const startTime = this.interactionStartTimes.get('background-refresh');
    if (startTime === undefined) {
      return null;
    }

    const refreshTime = performance.now() - startTime;
    this.interactionStartTimes.delete('background-refresh');
    this.dashboardMetrics.backgroundRefreshTime = refreshTime;

    return refreshTime;
  }

  /**
   * Update widget loading progress
   */
  updateWidgetProgress(totalWidgets: number, loadedWidgets: number): void {
    this.dashboardMetrics.totalWidgets = totalWidgets;
    this.dashboardMetrics.loadedWidgets = loadedWidgets;
  }

  /**
   * Get dashboard-specific performance metrics
   */
  getDashboardMetrics(): DashboardPerformanceMetrics {
    return { ...this.dashboardMetrics };
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetrics['type']): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.type === type);
  }

  /**
   * Get average interaction response time
   */
  getAverageInteractionTime(): number {
    const interactionMetrics = this.getMetricsByType('interaction');
    if (interactionMetrics.length === 0) return 0;

    const totalTime = interactionMetrics.reduce((sum, metric) => sum + metric.interactionTime, 0);
    return totalTime / interactionMetrics.length;
  }

  /**
   * Check if performance meets requirements
   */
  checkPerformanceRequirements(): {
    dashboardLoadTime: boolean; // Should be <= 500ms
    interactionResponseTime: boolean; // Should be <= 100ms
    backgroundRefresh: boolean; // Should not block UI
  } {
    const avgInteractionTime = this.getAverageInteractionTime();
    
    return {
      dashboardLoadTime: this.dashboardMetrics.dashboardLoadTime <= 500,
      interactionResponseTime: avgInteractionTime <= 100,
      backgroundRefresh: this.dashboardMetrics.backgroundRefreshTime < 1000, // Non-blocking threshold
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.interactionStartTimes.clear();
    this.componentRenderTimes.clear();
    this.dashboardMetrics = {
      dashboardLoadTime: 0,
      widgetLoadTimes: {},
      interactionResponseTimes: {},
      backgroundRefreshTime: 0,
      totalWidgets: 0,
      loadedWidgets: 0,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to measure component render time
 */
export function measureRenderTime(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  };
}
