/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMonitor } from '../../utils/performance';
import { useLoadingStates } from '../../hooks/useLoadingStates';
import { useInteractionOptimizer } from '../../hooks/useInteractionOptimizer';

/**
 * **Feature: enhanced-home-dashboard, Property 16: Dashboard Load Performance**
 * **Validates: Requirements 11.1**
 * 
 * Unit tests for performance optimization utilities without rendering the full component
 */

describe('Dashboard Performance Utilities Tests', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.clearMetrics();
    vi.restoreAllMocks();
  });

  it('should track dashboard load performance correctly', () => {
    // Mock performance.now to return predictable values
    const startTime = 100;
    const endTime = 150;
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    
    // First call for start, second call for end
    mockPerformanceNow.mockReturnValueOnce(startTime);
    mockPerformanceNow.mockReturnValueOnce(endTime);
    
    performanceMonitor.startInteraction('dashboard-load');
    const loadTime = performanceMonitor.endInteraction('dashboard-load');
    
    expect(loadTime).toBeDefined();
    expect(loadTime).toBe(endTime - startTime);
    
    // Verify metrics are recorded
    const metrics = performanceMonitor.getDashboardMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.interactionResponseTimes['dashboard-load']).toBe(loadTime);
  });

  it('should check performance requirements correctly', () => {
    // Set up some mock metrics
    performanceMonitor.updateWidgetProgress(5, 5);
    
    const requirements = performanceMonitor.checkPerformanceRequirements();
    
    expect(requirements).toBeDefined();
    expect(typeof requirements.dashboardLoadTime).toBe('boolean');
    expect(typeof requirements.interactionResponseTime).toBe('boolean');
    expect(typeof requirements.backgroundRefresh).toBe('boolean');
  });

  it('should handle widget loading progress tracking', () => {
    const totalWidgets = 6;
    const loadedWidgets = 3;
    
    performanceMonitor.updateWidgetProgress(totalWidgets, loadedWidgets);
    
    const metrics = performanceMonitor.getDashboardMetrics();
    expect(metrics.totalWidgets).toBe(totalWidgets);
    expect(metrics.loadedWidgets).toBe(loadedWidgets);
  });

  it('should measure component render times', () => {
    const componentName = 'TestWidget';
    const renderTime = 25; // 25ms
    
    performanceMonitor.measureComponentRender(componentName, renderTime);
    
    const metrics = performanceMonitor.getDashboardMetrics();
    expect(metrics.widgetLoadTimes[componentName]).toBe(renderTime);
  });

  it('should track background refresh performance', () => {
    const startTime = 200;
    const endTime = 300;
    const expectedRefreshTime = endTime - startTime;
    
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValueOnce(startTime);
    mockPerformanceNow.mockReturnValueOnce(endTime);
    
    performanceMonitor.startBackgroundRefresh();
    const actualRefreshTime = performanceMonitor.endBackgroundRefresh();
    
    expect(actualRefreshTime).toBe(expectedRefreshTime);
    
    const metrics = performanceMonitor.getDashboardMetrics();
    expect(metrics.backgroundRefreshTime).toBe(expectedRefreshTime);
  });

  it('should validate performance requirements thresholds', () => {
    // Test with good performance (under 100ms threshold)
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    
    // Fast interaction: 50ms
    mockPerformanceNow.mockReturnValueOnce(0);
    mockPerformanceNow.mockReturnValueOnce(50);
    
    performanceMonitor.startInteraction('fast-action');
    performanceMonitor.endInteraction('fast-action');
    
    let requirements = performanceMonitor.checkPerformanceRequirements();
    expect(requirements.interactionResponseTime).toBe(true);
    
    // Clear and test with poor performance
    performanceMonitor.clearMetrics();
    
    // Slow interaction: 150ms (exceeds 100ms threshold)
    mockPerformanceNow.mockReturnValueOnce(0);
    mockPerformanceNow.mockReturnValueOnce(150);
    
    performanceMonitor.startInteraction('slow-action');
    performanceMonitor.endInteraction('slow-action');
    
    requirements = performanceMonitor.checkPerformanceRequirements();
    expect(requirements.interactionResponseTime).toBe(false);
  });

  it('should clear metrics correctly', () => {
    // Add some metrics
    performanceMonitor.measureComponentRender('TestWidget', 50);
    performanceMonitor.updateWidgetProgress(5, 3);
    
    let metrics = performanceMonitor.getDashboardMetrics();
    expect(Object.keys(metrics.widgetLoadTimes)).toHaveLength(1);
    expect(metrics.totalWidgets).toBe(5);
    
    // Clear metrics
    performanceMonitor.clearMetrics();
    
    metrics = performanceMonitor.getDashboardMetrics();
    expect(Object.keys(metrics.widgetLoadTimes)).toHaveLength(0);
    expect(metrics.totalWidgets).toBe(0);
    expect(metrics.loadedWidgets).toBe(0);
    expect(metrics.dashboardLoadTime).toBe(0);
    expect(metrics.backgroundRefreshTime).toBe(0);
  });
});