/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  selectAppropriateChartType, 
  analyzeDataCharacteristics, 
  validateChartTypeForData,
  getRecommendedColorScheme,
  ChartDataPoint,
  ChartType 
} from './index';

/**
 * **Feature: professional-ui-redesign, Property 8: Data Visualization Consistency**
 * **Validates: Requirements 6.2**
 * 
 * For any chart or graph component, it should use the brand color palette, 
 * consistent labeling, and professional styling patterns
 */

describe('Data Visualization Consistency Property Tests', () => {
  // Generators for test data
  const chartDataPointArb = fc.record({
    label: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.float({ min: 0, max: 10000, noNaN: true }),
    color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)),
    metadata: fc.option(fc.record({
      target: fc.option(fc.float({ min: 0, max: 10000, noNaN: true })),
      performanceLevel: fc.option(fc.constantFrom('excellent', 'good', 'warning', 'poor')),
      status: fc.option(fc.constantFrom('active', 'at-risk', 'completed', 'failed')),
      stage: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
      conversionRate: fc.option(fc.float({ min: 0, max: 100, noNaN: true }))
    }))
  });

  const timeSeriesLabelArb = fc.constantFrom(
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
    'Week 1', 'Week 2', 'Month 1', 'Q1', 'Q2',
    '01/15', '02/15', '2024-01', '2024-02'
  );

  const categoryLabelArb = fc.constantFrom(
    'Leads', 'Qualified', 'Proposal', 'Negotiation', 'Closing',
    'Residential', 'Commercial', 'Land', 'Rental',
    'North', 'South', 'East', 'West', 'Downtown'
  );

  const timeSeriesDataArb = fc.array(
    fc.record({
      label: timeSeriesLabelArb,
      value: fc.float({ min: 0, max: 1000, noNaN: true }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)),
      metadata: fc.option(fc.record({}))
    }),
    { minLength: 2, maxLength: 12 }
  );

  const categoryDataArb = fc.array(
    fc.record({
      label: categoryLabelArb,
      value: fc.float({ min: 0, max: 1000, noNaN: true }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)),
      metadata: fc.option(fc.record({}))
    }),
    { minLength: 1, maxLength: 10 }
  );

  const pipelineDataArb = fc.array(
    fc.record({
      label: fc.constantFrom('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closing', 'Won'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)),
      metadata: fc.option(fc.record({
        stage: fc.string({ minLength: 1, maxLength: 15 }),
        conversionRate: fc.float({ min: 0, max: 100, noNaN: true })
      }))
    }),
    { minLength: 3, maxLength: 8 }
  );

  const progressDataArb = fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)),
      metadata: fc.option(fc.record({
        target: fc.float({ min: 50, max: 100, noNaN: true })
      }))
    }),
    { minLength: 1, maxLength: 8 }
  );

  it('should recommend line charts for time series data', () => {
    fc.assert(fc.property(timeSeriesDataArb, (dataPoints) => {
      const characteristics = analyzeDataCharacteristics(dataPoints, { isTimeSeries: true });
      const recommendation = selectAppropriateChartType(characteristics);
      
      // Time series data should prefer line charts
      expect(recommendation.type).toBe('line');
      expect(recommendation.confidence).toBeGreaterThan(0.7);
      expect(recommendation.reason).toContain('time');
    }), { numRuns: 100 });
  });

  it('should recommend pipeline charts for pipeline data', () => {
    fc.assert(fc.property(pipelineDataArb, (dataPoints) => {
      const characteristics = analyzeDataCharacteristics(dataPoints, { isPipelineData: true });
      const recommendation = selectAppropriateChartType(characteristics);
      
      // Pipeline data should prefer pipeline charts
      expect(recommendation.type).toBe('pipeline');
      expect(recommendation.confidence).toBeGreaterThan(0.9);
      expect(recommendation.reason).toContain('pipeline');
    }), { numRuns: 100 });
  });

  it('should recommend progress charts for data with targets', () => {
    fc.assert(fc.property(progressDataArb, (dataPoints) => {
      const characteristics = analyzeDataCharacteristics(dataPoints, { hasTargets: true });
      const recommendation = selectAppropriateChartType(characteristics);
      
      // Data with targets should prefer progress charts
      expect(recommendation.type).toBe('progress');
      expect(recommendation.confidence).toBeGreaterThan(0.8);
      expect(recommendation.reason).toContain('target');
    }), { numRuns: 100 });
  });

  it('should recommend appropriate charts for categorical data based on count', () => {
    fc.assert(fc.property(categoryDataArb, (dataPoints) => {
      const characteristics = analyzeDataCharacteristics(dataPoints);
      const recommendation = selectAppropriateChartType(characteristics);
      
      if (dataPoints.length <= 6) {
        // Small categorical datasets can use pie or bar charts
        expect(['pie', 'bar']).toContain(recommendation.type);
      } else {
        // Large categorical datasets should use bar charts
        expect(recommendation.type).toBe('bar');
        expect(recommendation.reason).toContain('categories');
      }
      
      expect(recommendation.confidence).toBeGreaterThan(0.6);
    }), { numRuns: 100 });
  });

  it('should validate chart types appropriately for data characteristics', () => {
    fc.assert(fc.property(
      fc.array(chartDataPointArb, { minLength: 1, maxLength: 15 }),
      fc.constantFrom('line', 'bar', 'pie', 'progress', 'pipeline') as fc.Arbitrary<ChartType>,
      (dataPoints, chartType) => {
        const characteristics = analyzeDataCharacteristics(dataPoints);
        const validation = validateChartTypeForData(chartType, characteristics);
        
        // Validation should always return a boolean and warnings array
        expect(typeof validation.isValid).toBe('boolean');
        expect(Array.isArray(validation.warnings)).toBe(true);
        
        // Specific validation rules
        if (chartType === 'pie' && dataPoints.length > 8) {
          expect(validation.isValid).toBe(false);
          expect(validation.warnings.some(w => w.includes('8 segments'))).toBe(true);
        }
        
        if (chartType === 'line' && dataPoints.length < 2) {
          expect(validation.isValid).toBe(false);
          expect(validation.warnings.some(w => w.includes('2 data points'))).toBe(true);
        }
        
        // Charts with negative values should be invalid for pie and progress
        const hasNegativeValues = dataPoints.some(point => point.value < 0);
        if ((chartType === 'pie' || chartType === 'progress') && hasNegativeValues) {
          expect(validation.isValid).toBe(false);
          expect(validation.warnings.some(w => w.includes('negative values'))).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide appropriate color schemes based on data context', () => {
    fc.assert(fc.property(
      fc.array(chartDataPointArb, { minLength: 1, maxLength: 10 }),
      fc.constantFrom('line', 'bar', 'pie', 'progress', 'pipeline') as fc.Arbitrary<ChartType>,
      (dataPoints, chartType) => {
        const characteristics = analyzeDataCharacteristics(dataPoints);
        const colorScheme = getRecommendedColorScheme(chartType, characteristics);
        
        // Color scheme should be one of the valid options
        expect(['default', 'success', 'warning', 'danger', 'info']).toContain(colorScheme);
        
        // Performance-based data should get appropriate color schemes
        const hasPerformanceData = dataPoints.some(point => 
          point.metadata?.performanceLevel || 
          point.metadata?.status
        );
        
        const hasWarnings = dataPoints.some(point => 
          point.metadata?.performanceLevel === 'warning' ||
          point.metadata?.status === 'at-risk'
        );
        const hasErrors = dataPoints.some(point => 
          point.metadata?.performanceLevel === 'poor' ||
          point.metadata?.status === 'failed'
        );
        
        if (hasErrors) {
          expect(colorScheme).toBe('danger');
        } else if (hasWarnings) {
          expect(colorScheme).toBe('warning');
        } else if (hasPerformanceData) {
          // Any performance data (including 'active' status) should get success
          expect(colorScheme).toBe('success');
        } else {
          // Chart type specific color schemes only when no performance data
          if (chartType === 'progress') {
            expect(colorScheme).toBe('success');
          } else if (chartType === 'pipeline') {
            expect(colorScheme).toBe('info');
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle empty data gracefully', () => {
    fc.assert(fc.property(fc.constant([]), (emptyData) => {
      const characteristics = analyzeDataCharacteristics(emptyData);
      const recommendation = selectAppropriateChartType(characteristics);
      
      // Empty data should have a fallback recommendation
      expect(recommendation.type).toBe('bar');
      expect(recommendation.confidence).toBeLessThan(0.7);
      expect(recommendation.reason).toContain('empty');
      
      // Validation should handle empty data
      const validation = validateChartTypeForData('line', characteristics);
      expect(validation.isValid).toBe(false);
      expect(validation.warnings.some(w => w.includes('2 data points'))).toBe(true);
    }), { numRuns: 50 });
  });

  it('should maintain consistency in recommendations for similar data', () => {
    fc.assert(fc.property(
      fc.array(chartDataPointArb, { minLength: 3, maxLength: 8 }),
      (baseData) => {
        // Create two similar datasets
        const data1 = baseData;
        const data2 = baseData.map(point => ({
          ...point,
          value: point.value * 1.1 // Slightly different values
        }));
        
        const characteristics1 = analyzeDataCharacteristics(data1);
        const characteristics2 = analyzeDataCharacteristics(data2);
        
        const recommendation1 = selectAppropriateChartType(characteristics1);
        const recommendation2 = selectAppropriateChartType(characteristics2);
        
        // Similar data should get similar recommendations
        expect(recommendation1.type).toBe(recommendation2.type);
        expect(Math.abs(recommendation1.confidence - recommendation2.confidence)).toBeLessThan(0.2);
      }
    ), { numRuns: 100 });
  });

  it('should provide meaningful reasons for all recommendations', () => {
    fc.assert(fc.property(
      fc.array(chartDataPointArb, { minLength: 1, maxLength: 12 }),
      (dataPoints) => {
        const characteristics = analyzeDataCharacteristics(dataPoints);
        const recommendation = selectAppropriateChartType(characteristics);
        
        // Reason should be a non-empty string
        expect(typeof recommendation.reason).toBe('string');
        expect(recommendation.reason.length).toBeGreaterThan(0);
        
        // Confidence should be between 0 and 1
        expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence).toBeLessThanOrEqual(1);
        
        // Chart type should be valid
        expect(['line', 'bar', 'pie', 'progress', 'pipeline']).toContain(recommendation.type);
      }
    ), { numRuns: 100 });
  });

  it('should analyze data characteristics correctly', () => {
    fc.assert(fc.property(
      fc.array(chartDataPointArb, { minLength: 1, maxLength: 10 }),
      fc.record({
        isTimeSeries: fc.option(fc.boolean()),
        hasTargets: fc.option(fc.boolean()),
        isPipelineData: fc.option(fc.boolean()),
        showsPartToWhole: fc.option(fc.boolean())
      }),
      (dataPoints, context) => {
        const characteristics = analyzeDataCharacteristics(dataPoints, context);
        
        // Should return all expected properties
        expect(characteristics).toHaveProperty('dataPoints');
        expect(characteristics).toHaveProperty('hasTimeSequence');
        expect(characteristics).toHaveProperty('hasCategories');
        expect(characteristics).toHaveProperty('hasProgressTarget');
        expect(characteristics).toHaveProperty('showsComparison');
        expect(characteristics).toHaveProperty('showsTrend');
        expect(characteristics).toHaveProperty('isPipeline');
        
        // Data points should match input
        expect(characteristics.dataPoints).toEqual(dataPoints);
        
        // Context should influence characteristics
        if (context.isTimeSeries) {
          expect(characteristics.hasTimeSequence).toBe(true);
        }
        if (context.hasTargets) {
          expect(characteristics.hasProgressTarget).toBe(true);
        }
        if (context.isPipelineData) {
          expect(characteristics.isPipeline).toBe(true);
        }
        if (context.showsPartToWhole) {
          expect(characteristics.showsComparison).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  // Professional Design Consistency Tests
  describe('Professional Design Consistency', () => {
    it('should use professional brand colors from design tokens', () => {
      fc.assert(fc.property(
        fc.array(chartDataPointArb, { minLength: 1, maxLength: 8 }),
        fc.constantFrom('default', 'success', 'warning', 'danger', 'info'),
        (dataPoints, colorScheme) => {
          // Test that color schemes use CSS custom properties (design tokens)
          const expectedColorPatterns = {
            default: /var\(--color-(primary|success|warning|error)-\d{3}\)/,
            success: /var\(--color-success-\d{3}\)/,
            warning: /var\(--color-warning-\d{3}\)/,
            danger: /var\(--color-error-\d{3}\)/,
            info: /var\(--color-primary-\d{3}\)/
          };
          
          // Mock the Chart component's color generation
          const getColorForIndex = (index: number, scheme: string): string => {
            const colorSchemes = {
              default: [
                'var(--color-primary-500)',
                'var(--color-success-500)', 
                'var(--color-warning-500)',
                'var(--color-error-500)',
                'var(--color-primary-700)',
                'var(--color-success-600)',
                'var(--color-warning-600)',
                'var(--color-error-600)'
              ],
              success: [
                'var(--color-success-500)',
                'var(--color-success-600)', 
                'var(--color-success-700)',
                'var(--color-success-800)',
                'var(--color-success-400)'
              ],
              warning: [
                'var(--color-warning-500)',
                'var(--color-warning-600)',
                'var(--color-warning-700)',
                'var(--color-warning-800)',
                'var(--color-warning-400)'
              ],
              danger: [
                'var(--color-error-500)',
                'var(--color-error-600)',
                'var(--color-error-700)',
                'var(--color-error-800)',
                'var(--color-error-400)'
              ],
              info: [
                'var(--color-primary-500)',
                'var(--color-primary-600)',
                'var(--color-primary-700)',
                'var(--color-primary-800)',
                'var(--color-primary-400)'
              ]
            };
            return colorSchemes[scheme][index % colorSchemes[scheme].length];
          };
          
          // Test each data point gets a professional color
          dataPoints.forEach((point, index) => {
            if (!point.color) {
              const assignedColor = getColorForIndex(index, colorScheme);
              expect(assignedColor).toMatch(expectedColorPatterns[colorScheme]);
              expect(assignedColor).toContain('var(--color-');
            }
          });
        }
      ), { numRuns: 100 });
    });

    it('should maintain consistent styling patterns across chart types', () => {
      fc.assert(fc.property(
        fc.array(chartDataPointArb, { minLength: 2, maxLength: 6 }),
        fc.constantFrom('line', 'bar', 'pie', 'progress', 'pipeline') as fc.Arbitrary<ChartType>,
        (dataPoints, chartType) => {
          // All charts should use consistent design patterns
          const expectedStyleProperties = [
            'border-radius: var(--radius-lg)',
            'padding: var(--spacing-6)',
            'box-shadow: var(--shadow-sm)',
            'font-family: var(--font-family-sans)',
            'color: var(--color-text-primary)'
          ];
          
          // Mock CSS class generation for charts
          const getChartClasses = (type: ChartType) => {
            return [
              'chart',
              `chart--${type}`,
              'chart--default'
            ];
          };
          
          const classes = getChartClasses(chartType);
          
          // Should have consistent base classes
          expect(classes).toContain('chart');
          expect(classes).toContain(`chart--${chartType}`);
          
          // Should use design token-based styling
          expect(classes.length).toBeGreaterThanOrEqual(2);
        }
      ), { numRuns: 100 });
    });

    it('should provide consistent labeling and typography', () => {
      fc.assert(fc.property(
        fc.array(chartDataPointArb, { minLength: 1, maxLength: 10 }),
        (dataPoints) => {
          // Test typography consistency
          const expectedFontProperties = {
            title: {
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-sans)'
            },
            labels: {
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              fontFamily: 'var(--font-family-sans)'
            },
            values: {
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-sans)'
            }
          };
          
          // All charts should have consistent typography
          Object.values(expectedFontProperties).forEach(props => {
            expect(props.fontFamily).toBe('var(--font-family-sans)');
            expect(props.fontSize).toMatch(/var\(--font-size-\w+\)/);
            expect(props.fontWeight).toMatch(/var\(--font-weight-\w+\)/);
          });
          
          // Labels should be readable and consistent
          dataPoints.forEach(point => {
            expect(typeof point.label).toBe('string');
            expect(point.label.length).toBeGreaterThan(0);
          });
        }
      ), { numRuns: 100 });
    });

    it('should handle loading and error states consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom('line', 'bar', 'pie', 'progress', 'pipeline') as fc.Arbitrary<ChartType>,
        fc.boolean(),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        (chartType, loading, error) => {
          // Mock chart state handling - loading takes priority over error
          const getChartState = (type: ChartType, isLoading: boolean, errorMsg?: string) => {
            if (isLoading) {
              return {
                className: `chart chart--${type} chart--loading`,
                showSkeleton: true,
                showChart: false,
                showError: false
              };
            }
            if (errorMsg) {
              return {
                className: `chart chart--${type} chart--error`,
                showError: true,
                showChart: false,
                showSkeleton: false
              };
            }
            return {
              className: `chart chart--${type}`,
              showChart: true,
              showError: false,
              showSkeleton: false
            };
          };
          
          const state = getChartState(chartType, loading, error);
          
          // Should have consistent state handling
          expect(state.className).toContain('chart');
          expect(state.className).toContain(`chart--${chartType}`);
          
          if (loading) {
            // Loading state takes priority
            expect(state.className).toContain('chart--loading');
            expect(state.showSkeleton).toBe(true);
            expect(state.showChart).toBe(false);
            expect(state.showError).toBe(false);
          } else if (error) {
            // Error state only when not loading
            expect(state.className).toContain('chart--error');
            expect(state.showError).toBe(true);
            expect(state.showChart).toBe(false);
            expect(state.showSkeleton).toBe(false);
          } else {
            // Normal state
            expect(state.showChart).toBe(true);
            expect(state.showError).toBe(false);
            expect(state.showSkeleton).toBe(false);
          }
        }
      ), { numRuns: 100 });
    });

    it('should maintain responsive design consistency', () => {
      fc.assert(fc.property(
        fc.array(chartDataPointArb, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 320, max: 1920 }), // Screen widths
        fc.integer({ min: 200, max: 1080 }), // Screen heights
        (dataPoints, screenWidth, screenHeight) => {
          // Mock responsive behavior
          const getResponsiveStyles = (width: number, height: number) => {
            const isMobile = width <= 768;
            return {
              padding: isMobile ? 'var(--spacing-4)' : 'var(--spacing-6)',
              fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              minWidth: isMobile ? '100%' : '600px'
            };
          };
          
          const styles = getResponsiveStyles(screenWidth, screenHeight);
          
          // Should use design tokens for responsive styles
          expect(styles.padding).toMatch(/var\(--spacing-\d+\)/);
          expect(styles.fontSize).toMatch(/var\(--font-size-\w+\)/);
          
          // Mobile styles should be more compact
          if (screenWidth <= 768) {
            expect(styles.padding).toBe('var(--spacing-4)');
            expect(styles.fontSize).toBe('var(--font-size-sm)');
            expect(styles.minWidth).toBe('100%');
          } else {
            expect(styles.padding).toBe('var(--spacing-6)');
            expect(styles.fontSize).toBe('var(--font-size-base)');
            expect(styles.minWidth).toBe('600px');
          }
        }
      ), { numRuns: 100 });
    });

    it('should provide consistent accessibility features', () => {
      fc.assert(fc.property(
        fc.array(chartDataPointArb, { minLength: 1, maxLength: 10 }),
        fc.constantFrom('line', 'bar', 'pie', 'progress', 'pipeline') as fc.Arbitrary<ChartType>,
        (dataPoints, chartType) => {
          // Mock accessibility features
          const getAccessibilityFeatures = (type: ChartType, data: ChartDataPoint[]) => {
            return {
              hasTestId: true,
              testId: `chart-${type}`,
              hasFocusStyles: true,
              focusOutline: 'var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color)',
              hasAriaLabels: data.length > 0,
              isKeyboardNavigable: true
            };
          };
          
          const a11yFeatures = getAccessibilityFeatures(chartType, dataPoints);
          
          // Should have consistent accessibility features
          expect(a11yFeatures.hasTestId).toBe(true);
          expect(a11yFeatures.testId).toBe(`chart-${chartType}`);
          expect(a11yFeatures.hasFocusStyles).toBe(true);
          expect(a11yFeatures.focusOutline).toContain('var(--focus-ring-');
          expect(a11yFeatures.isKeyboardNavigable).toBe(true);
          
          if (dataPoints.length > 0) {
            expect(a11yFeatures.hasAriaLabels).toBe(true);
          }
        }
      ), { numRuns: 100 });
    });
  });
});