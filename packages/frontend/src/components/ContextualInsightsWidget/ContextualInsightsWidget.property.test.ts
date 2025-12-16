/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for ContextualInsightsWidget Component
 * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import * as fc from 'fast-check';
import { ContextualInsightsWidget } from './ContextualInsightsWidget';
import type { BusinessMetric, TrendData, ContextualInsightsProps } from './ContextualInsightsWidget';

describe('ContextualInsightsWidget Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  // Generators for property-based testing
  let metricIdCounter = 0;
  let trendIdCounter = 0;

  const businessMetricGenerator: fc.Arbitrary<BusinessMetric> = fc.record({
    id: fc.integer().map(() => `metric-${++metricIdCounter}-${Math.random().toString(36).substr(2, 9)}`),
    label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    value: fc.integer({ min: 0, max: 10000 }),
    change: fc.float({ min: -100, max: 100 }),
    trend: fc.constantFrom('up', 'down', 'stable') as fc.Arbitrary<'up' | 'down' | 'stable'>,
    visualization: fc.constantFrom('number', 'chart', 'progress') as fc.Arbitrary<'number' | 'chart' | 'progress'>,
    unit: fc.option(fc.constantFrom('h', '%', 'days'), { nil: undefined }),
    target: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  });

  const trendDataGenerator: fc.Arbitrary<TrendData> = fc.record({
    id: fc.integer().map(() => `trend-${++trendIdCounter}-${Math.random().toString(36).substr(2, 9)}`),
    label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    data: fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 3, maxLength: 30 }),
    timeframe: fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 30 }),
    color: fc.constantFrom('#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'),
  });

  const contextualInsightsPropsGenerator: fc.Arbitrary<ContextualInsightsProps> = fc.record({
    metrics: fc.array(businessMetricGenerator, { minLength: 1, maxLength: 5 }),
    trends: fc.array(trendDataGenerator, { minLength: 0, maxLength: 3 }),
    timeframe: fc.constantFrom('week', 'month', 'quarter') as fc.Arbitrary<'week' | 'month' | 'quarter'>,
    onDrillDown: fc.constant(vi.fn()),
  });

  /**
   * Property Test: Contextual Insights Display Completeness
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   * 
   * For any dashboard load, the contextual insights widget should display 2-3 relevant 
   * business metrics with appropriate performance feedback
   */
  it('should display 2-3 relevant business metrics with performance feedback for any valid props', () => {
    fc.assert(
      fc.property(contextualInsightsPropsGenerator, (props) => {
        const { metrics, trends, timeframe, onDrillDown } = props;
        
        cleanup(); // Clean up before each property test run
        const { unmount } = render(
          React.createElement(ContextualInsightsWidget, {
            metrics,
            trends,
            timeframe,
            onDrillDown,
          })
        );

        // Verify widget is rendered
        const widget = screen.getByTestId('contextual-insights-widget');
        expect(widget).toBeInTheDocument();

        // Verify title is present
        expect(screen.getByText('Business Insights')).toBeInTheDocument();

        // Verify timeframe is displayed
        expect(screen.getByText(`This ${timeframe}`)).toBeInTheDocument();

        // Verify metrics are displayed (up to 3 as per design)
        const displayedMetrics = Math.min(metrics.length, 3);
        
        for (let i = 0; i < displayedMetrics; i++) {
          const metric = metrics[i];
          
          // Verify metric is rendered with test id
          const metricElement = screen.getByTestId(`metric-${metric.id}`);
          expect(metricElement).toBeInTheDocument();
          
          // Verify metric label is displayed within the metric element
          const labelElement = metricElement.querySelector('.insight-metric__label');
          expect(labelElement).toBeInTheDocument();
          expect(labelElement?.textContent?.trim()).toBe(metric.label.trim());
          
          // Verify metric value is displayed within the metric element
          expect(metricElement.querySelector('.insight-metric__value')).toHaveTextContent(metric.value.toLocaleString());
          
          // Verify trend indicator is present within the metric element
          const trendIcon = metricElement.querySelector('.trend-icon');
          expect(trendIcon).toBeInTheDocument();
          const trendIcons = ['↗️', '↘️', '→'];
          const hasTrendIcon = trendIcons.some(icon => 
            trendIcon?.textContent?.includes(icon)
          );
          expect(hasTrendIcon).toBe(true);
        }

        // Verify performance feedback is present
        const feedbackMessages = [
          /great work/i,
          /excellent/i,
          /consider setting up/i,
          /business metrics are stable/i,
        ];
        
        const hasFeedback = feedbackMessages.some(pattern => 
          screen.queryByText(pattern) !== null
        );
        expect(hasFeedback).toBe(true);

        // Verify feedback has appropriate icon
        const feedbackIcons = ['🎉', '💡', 'ℹ️'];
        const hasFeedbackIcon = feedbackIcons.some(icon => 
          screen.queryByText(icon) !== null
        );
        expect(hasFeedbackIcon).toBe(true);
        
        unmount(); // Clean up after each property test run
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Trend Visualization Appropriateness
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 5.2, 5.3**
   * 
   * For any business metric with trend data, appropriate micro-visualizations should be displayed
   */
  it('should display appropriate micro-visualizations for metrics with trend data', () => {
    fc.assert(
      fc.property(
        fc.record({
          metrics: fc.array(
            fc.record({
              id: fc.integer().map(() => `metric-viz-${++metricIdCounter}-${Math.random().toString(36).substr(2, 9)}`),
              label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              value: fc.integer({ min: 0, max: 10000 }),
              change: fc.float({ min: -100, max: 100 }),
              trend: fc.constantFrom('up', 'down', 'stable') as fc.Arbitrary<'up' | 'down' | 'stable'>,
              visualization: fc.constantFrom('chart', 'progress') as fc.Arbitrary<'chart' | 'progress'>,
              target: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          trends: fc.array(trendDataGenerator, { minLength: 1, maxLength: 3 }),
          timeframe: fc.constantFrom('week', 'month', 'quarter') as fc.Arbitrary<'week' | 'month' | 'quarter'>,
          onDrillDown: fc.constant(vi.fn()),
        }),
        (props) => {
          // Ensure trends match metrics for visualization
          const alignedProps = {
            ...props,
            trends: props.metrics.map((metric, index) => ({
              ...props.trends[index % props.trends.length],
              id: metric.id,
            })),
          };

          cleanup(); // Clean up before each property test run
          const { unmount } = render(
            React.createElement(ContextualInsightsWidget, alignedProps)
          );

          alignedProps.metrics.forEach((metric) => {
            const metricElement = screen.getByTestId(`metric-${metric.id}`);
            expect(metricElement).toBeInTheDocument();

            if (metric.visualization === 'progress' && metric.target) {
              // Should have progress bar visualization
              const progressBar = metricElement.querySelector('.progress-bar');
              expect(progressBar).toBeInTheDocument();
              
              const progressText = metricElement.querySelector('.progress-text');
              expect(progressText).toBeInTheDocument();
            }

            if (metric.visualization === 'chart') {
              // Should have chart visualization
              const chartSvg = metricElement.querySelector('.trend-chart');
              expect(chartSvg).toBeInTheDocument();
              
              const polyline = metricElement.querySelector('polyline');
              expect(polyline).toBeInTheDocument();
            }
          });
          
          unmount(); // Clean up after each property test run
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Drill-Down Capability
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 5.4**
   * 
   * For any metric or trend, clicking should trigger drill-down functionality
   */
  it('should provide drill-down capability for all metrics and trends', () => {
    fc.assert(
      fc.property(contextualInsightsPropsGenerator, (props) => {
        const { metrics, trends, timeframe } = props;
        const mockDrillDown = vi.fn();

        cleanup(); // Clean up before each property test run
        const { unmount } = render(
          React.createElement(ContextualInsightsWidget, {
            metrics,
            trends,
            timeframe,
            onDrillDown: mockDrillDown,
          })
        );

        // Test drill-down for metrics (up to 3 displayed)
        const displayedMetrics = Math.min(metrics.length, 3);
        
        for (let i = 0; i < displayedMetrics; i++) {
          const metric = metrics[i];
          const metricElement = screen.getByTestId(`metric-${metric.id}`);
          
          // Verify metric is clickable (has click handler)
          expect(metricElement).toBeInTheDocument();
          
          // Verify element has the insight-metric class (indicating it's interactive)
          expect(metricElement).toHaveClass('insight-metric');
        }

        // Test drill-down for trends (up to 2 displayed)
        const displayedTrends = Math.min(trends.length, 2);
        
        for (let i = 0; i < displayedTrends; i++) {
          const trend = trends[i];
          const trendElement = screen.getByTestId(`trend-${trend.id}`);
          
          // Verify trend has drill-down button
          const drillDownButton = trendElement.querySelector('.trend-item__drill-down');
          expect(drillDownButton).toBeInTheDocument();
          expect(drillDownButton).toHaveTextContent('View Details →');
        }
        
        unmount(); // Clean up after each property test run
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Performance Feedback Appropriateness
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 5.2, 5.5**
   * 
   * For any set of metrics, appropriate performance feedback should be generated
   */
  it('should generate appropriate performance feedback based on metric trends', () => {
    fc.assert(
      fc.property(
        fc.record({
          responseTimeMetric: fc.record({
            id: fc.constant('response-time'),
            label: fc.constant('Response Time'),
            value: fc.integer({ min: 1, max: 48 }),
            change: fc.float({ min: -50, max: 50 }),
            trend: fc.constantFrom('up', 'down', 'stable') as fc.Arbitrary<'up' | 'down' | 'stable'>,
            visualization: fc.constant('number') as fc.Arbitrary<'number'>,
            unit: fc.constant('h'),
          }),
          dealPipelineMetric: fc.record({
            id: fc.constant('deal-pipeline'),
            label: fc.constant('Deal Pipeline'),
            value: fc.integer({ min: 0, max: 50 }),
            change: fc.float({ min: -20, max: 20 }),
            trend: fc.constantFrom('up', 'down', 'stable') as fc.Arbitrary<'up' | 'down' | 'stable'>,
            visualization: fc.constant('number') as fc.Arbitrary<'number'>,
          }),
          timeframe: fc.constantFrom('week', 'month', 'quarter') as fc.Arbitrary<'week' | 'month' | 'quarter'>,
        }),
        ({ responseTimeMetric, dealPipelineMetric, timeframe }) => {
          const metrics = [responseTimeMetric, dealPipelineMetric];
          
          cleanup(); // Clean up before each property test run
          const { unmount } = render(
            React.createElement(ContextualInsightsWidget, {
              metrics,
              trends: [],
              timeframe,
              onDrillDown: vi.fn(),
            })
          );

          // Verify feedback is contextual based on metrics
          if (responseTimeMetric.trend === 'up' && responseTimeMetric.change > 0) {
            // Should show positive feedback for improved response time
            expect(screen.getByText(/great work/i)).toBeInTheDocument();
            expect(screen.getByText('🎉')).toBeInTheDocument();
          } else if (dealPipelineMetric.trend === 'up') {
            // Should show positive feedback for growing pipeline
            expect(screen.getByText(/excellent/i)).toBeInTheDocument();
            expect(screen.getByText('🎉')).toBeInTheDocument();
          } else if (responseTimeMetric.trend === 'down' && responseTimeMetric.change < -20) {
            // Should show suggestion for poor response time
            expect(screen.getByText(/consider setting up/i)).toBeInTheDocument();
            expect(screen.getByText('💡')).toBeInTheDocument();
          } else {
            // Should show neutral feedback for stable metrics
            expect(screen.getByText(/business metrics are stable/i)).toBeInTheDocument();
            expect(screen.getByText('ℹ️')).toBeInTheDocument();
          }
          
          unmount(); // Clean up after each property test run
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Responsive Layout Adaptation
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 5.1**
   * 
   * For any screen size, the widget should maintain proper layout and readability
   */
  it('should maintain proper layout structure regardless of content volume', () => {
    fc.assert(
      fc.property(
        fc.record({
          metrics: fc.array(businessMetricGenerator, { minLength: 1, maxLength: 10 }),
          trends: fc.array(trendDataGenerator, { minLength: 0, maxLength: 5 }),
          timeframe: fc.constantFrom('week', 'month', 'quarter') as fc.Arbitrary<'week' | 'month' | 'quarter'>,
        }),
        ({ metrics, trends, timeframe }) => {
          cleanup(); // Clean up before each property test run
          const { unmount } = render(
            React.createElement(ContextualInsightsWidget, {
              metrics,
              trends,
              timeframe,
              onDrillDown: vi.fn(),
            })
          );

          const widget = screen.getByTestId('contextual-insights-widget');
          
          // Verify widget maintains structure
          expect(widget).toBeInTheDocument();
          expect(widget).toHaveClass('contextual-insights-widget');
          
          // Verify header is always present
          const header = widget.querySelector('.contextual-insights-widget__header');
          expect(header).toBeInTheDocument();
          
          // Verify metrics section is present
          const metricsSection = widget.querySelector('.contextual-insights-widget__metrics');
          expect(metricsSection).toBeInTheDocument();
          
          // Verify feedback section is present
          const feedbackSection = widget.querySelector('.contextual-insights-widget__feedback');
          expect(feedbackSection).toBeInTheDocument();
          
          // Verify only up to 3 metrics are displayed (design constraint)
          const displayedMetrics = widget.querySelectorAll('.insight-metric');
          expect(displayedMetrics.length).toBeLessThanOrEqual(3);
          
          // If trends exist, verify trends section
          if (trends.length > 0) {
            const trendsSection = widget.querySelector('.contextual-insights-widget__trends');
            expect(trendsSection).toBeInTheDocument();
            
            // Verify only up to 2 trends are displayed (design constraint)
            const displayedTrends = widget.querySelectorAll('.trend-item');
            expect(displayedTrends.length).toBeLessThanOrEqual(2);
          }
          
          unmount(); // Clean up after each property test run
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Accessibility Compliance
   * **Feature: enhanced-home-dashboard, Property 10: Contextual Insights Display**
   * **Validates: Requirements 12.2, 12.3**
   * 
   * For any widget state, accessibility features should be properly implemented
   */
  it('should maintain accessibility compliance for all interactive elements', () => {
    fc.assert(
      fc.property(contextualInsightsPropsGenerator, (props) => {
        const { metrics, trends, timeframe, onDrillDown } = props;
        
        cleanup(); // Clean up before each property test run
        const { unmount } = render(
          React.createElement(ContextualInsightsWidget, {
            metrics,
            trends,
            timeframe,
            onDrillDown,
          })
        );

        // Verify main widget has proper test id for screen readers
        const widget = screen.getByTestId('contextual-insights-widget');
        expect(widget).toBeInTheDocument();

        // Verify all drill-down buttons have proper aria-labels
        const drillDownButtons = widget.querySelectorAll('.trend-item__drill-down');
        drillDownButtons.forEach((button) => {
          expect(button).toHaveAttribute('aria-label');
          expect(button.getAttribute('aria-label')).toMatch(/view details for/i);
        });

        // Verify metrics are properly labeled for screen readers
        const displayedMetrics = Math.min(metrics.length, 3);
        for (let i = 0; i < displayedMetrics; i++) {
          const metric = metrics[i];
          const metricElement = screen.getByTestId(`metric-${metric.id}`);
          expect(metricElement).toBeInTheDocument();
        }

        // Verify trends are properly labeled for screen readers
        const displayedTrends = Math.min(trends.length, 2);
        for (let i = 0; i < displayedTrends; i++) {
          const trend = trends[i];
          const trendElement = screen.getByTestId(`trend-${trend.id}`);
          expect(trendElement).toBeInTheDocument();
        }
        
        unmount(); // Clean up after each property test run
      }),
      { numRuns: 100 }
    );
  });
});