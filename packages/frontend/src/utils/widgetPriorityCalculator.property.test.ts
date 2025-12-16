/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  WidgetPriorityCalculator, 
  WidgetPriorityContext
} from './widgetPriorityCalculator';
import { UsagePattern, PersonalizationPreferences } from '../hooks/usePersonalization';

/**
 * **Feature: enhanced-home-dashboard, Property 2: Widget Priority Ordering**
 * 
 * Property: For any set of widgets with assigned priorities, the dashboard should 
 * display them in descending priority order based on urgency and agent behavior patterns
 * 
 * **Validates: Requirements 1.2**
 */

// Generators for test data
const timeOfDayArb = fc.constantFrom('morning' as const, 'afternoon' as const, 'evening' as const, 'night' as const);
const urgencyLevelArb = fc.constantFrom('low' as const, 'medium' as const, 'high' as const);
const widgetIdArb = fc.constantFrom(
  'smart-summary', 
  'priority-notifications', 
  'quick-actions', 
  'contextual-insights', 
  'recent-activity', 
  'calendar'
);

const usagePatternArb = fc.record({
  actionId: widgetIdArb,
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  context: fc.record({
    timeOfDay: timeOfDayArb,
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    urgencyLevel: fc.option(urgencyLevelArb, { nil: undefined }),
    dealTypes: fc.array(fc.string(), { maxLength: 3 })
  })
});

const personalizationPreferencesArb = fc.record({
  preferredQuickActions: fc.array(widgetIdArb, { maxLength: 6 }),
  widgetPriorities: fc.dictionary(
    widgetIdArb,
    fc.integer({ min: 1, max: 15 })
  ),
  timeBasedPreferences: fc.record({
    morning: fc.array(widgetIdArb, { maxLength: 3 }),
    afternoon: fc.array(widgetIdArb, { maxLength: 3 }),
    evening: fc.array(widgetIdArb, { maxLength: 3 }),
    night: fc.array(widgetIdArb, { maxLength: 3 })
  }),
  dealTypeFocus: fc.array(fc.string(), { maxLength: 3 }),
  lastUpdated: fc.date()
});

const workloadMetricsArb = fc.record({
  focusThreadsCount: fc.integer({ min: 0, max: 20 }),
  waitingThreadsCount: fc.integer({ min: 0, max: 50 }),
  atRiskDealsCount: fc.integer({ min: 0, max: 10 }),
  upcomingAppointmentsCount: fc.integer({ min: 0, max: 15 }),
  overdueTasksCount: fc.integer({ min: 0, max: 25 })
});

const agentBehaviorPatternArb = fc.record({
  patternType: fc.constantFrom('time_preference' as const, 'feature_usage' as const, 'workflow_sequence' as const, 'urgency_response' as const),
  confidence: fc.float({ min: 0, max: 1 }),
  data: fc.dictionary(fc.string(), fc.anything()),
  lastUpdated: fc.date()
});

const widgetPriorityContextArb = fc.record({
  timeOfDay: timeOfDayArb,
  urgencyLevel: urgencyLevelArb,
  dealTypes: fc.array(fc.string(), { maxLength: 3 }),
  agentBehaviorPatterns: fc.array(agentBehaviorPatternArb, { maxLength: 5 }),
  currentWorkload: workloadMetricsArb
});

describe('Widget Priority Ordering Property Tests', () => {
  describe('Property 2: Widget Priority Ordering', () => {
    it('should always return widgets in descending priority order', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 100 }),
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (usagePatterns, preferences, context) => {
            const result = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            // Property: Widgets should be ordered by descending final score
            for (let i = 0; i < result.orderedWidgets.length - 1; i++) {
              const currentWidget = result.orderedWidgets[i];
              const nextWidget = result.orderedWidgets[i + 1];
              
              expect(currentWidget.finalScore).toBeGreaterThanOrEqual(nextWidget.finalScore);
            }

            // Property: All widget scores should be non-negative
            result.orderedWidgets.forEach(widget => {
              expect(widget.finalScore).toBeGreaterThanOrEqual(0);
            });

            // Property: All expected widgets should be present
            const expectedWidgets = ['smart-summary', 'priority-notifications', 'quick-actions', 
                                   'contextual-insights', 'recent-activity', 'calendar'];
            const actualWidgets = result.orderedWidgets.map(w => w.widgetId);
            
            expectedWidgets.forEach(expectedWidget => {
              expect(actualWidgets).toContain(expectedWidget);
            });

            // Property: No duplicate widgets
            const uniqueWidgets = new Set(actualWidgets);
            expect(uniqueWidgets.size).toBe(actualWidgets.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize urgent widgets when urgency level is high', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 50 }),
          personalizationPreferencesArb,
          workloadMetricsArb,
          fc.array(agentBehaviorPatternArb, { maxLength: 3 }),
          fc.array(fc.string(), { maxLength: 2 }),
          timeOfDayArb,
          (usagePatterns, preferences, workload, behaviorPatterns, dealTypes, timeOfDay) => {
            // Create high urgency context
            const highUrgencyContext: WidgetPriorityContext = {
              timeOfDay,
              urgencyLevel: 'high',
              dealTypes,
              agentBehaviorPatterns: behaviorPatterns,
              currentWorkload: workload
            };

            // Create low urgency context for comparison
            const lowUrgencyContext: WidgetPriorityContext = {
              ...highUrgencyContext,
              urgencyLevel: 'low'
            };

            const highUrgencyResult = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              highUrgencyContext
            );

            const lowUrgencyResult = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              lowUrgencyContext
            );

            // Find urgent widgets (priority-notifications and smart-summary)
            const urgentWidgets = ['priority-notifications', 'smart-summary'];
            
            urgentWidgets.forEach(urgentWidgetId => {
              const highUrgencyWidget = highUrgencyResult.orderedWidgets.find(w => w.widgetId === urgentWidgetId);
              const lowUrgencyWidget = lowUrgencyResult.orderedWidgets.find(w => w.widgetId === urgentWidgetId);
              
              if (highUrgencyWidget && lowUrgencyWidget) {
                // Property: Urgent widgets should have higher scores in high urgency contexts
                expect(highUrgencyWidget.finalScore).toBeGreaterThanOrEqual(lowUrgencyWidget.finalScore);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should adjust widget visibility based on urgency and scores', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 30 }),
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (usagePatterns, preferences, context) => {
            const result = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            const visibleWidgets = Object.entries(result.visibilityMap)
              .filter(([, visible]) => visible)
              .map(([widgetId]) => widgetId);

            // Property: At least 4 widgets should be visible (minimum requirement)
            expect(visibleWidgets.length).toBeGreaterThanOrEqual(4);

            // Property: No more than 6 widgets should be visible (maximum limit)
            expect(visibleWidgets.length).toBeLessThanOrEqual(6);

            // Property: High urgency should show fewer widgets (focus on important ones)
            if (context.urgencyLevel === 'high') {
              expect(visibleWidgets.length).toBeLessThanOrEqual(5);
            }

            // Property: Visible widgets should be among the highest scoring ones
            const sortedWidgets = result.orderedWidgets.sort((a, b) => b.finalScore - a.finalScore);
            const topWidgets = sortedWidgets.slice(0, visibleWidgets.length).map(w => w.widgetId);
            
            visibleWidgets.forEach(visibleWidget => {
              expect(topWidgets).toContain(visibleWidget);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign appropriate widget sizes based on priority scores', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 40 }),
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (usagePatterns, preferences, context) => {
            const result = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            const topWidget = result.orderedWidgets[0];
            const topWidgetSize = result.sizeMap[topWidget.widgetId];

            // Property: Top widget with high score should get large or medium size
            if (topWidget.finalScore > 12) {
              expect(['large', 'medium']).toContain(topWidgetSize);
            }

            // Property: All sizes should be valid
            Object.values(result.sizeMap).forEach(size => {
              expect(['small', 'medium', 'large']).toContain(size);
            });

            // Property: In high urgency, urgent widgets should be larger
            if (context.urgencyLevel === 'high') {
              const priorityNotificationsSize = result.sizeMap['priority-notifications'];
              const smartSummarySize = result.sizeMap['smart-summary'];
              
              if (priorityNotificationsSize) {
                expect(['medium', 'large']).toContain(priorityNotificationsSize);
              }
              if (smartSummarySize) {
                expect(['medium', 'large']).toContain(smartSummarySize);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should incorporate usage patterns into priority calculations', () => {
      fc.assert(
        fc.property(
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          widgetIdArb,
          fc.integer({ min: 5, max: 20 }),
          (preferences, context, frequentWidgetId, usageCount) => {
            // Create usage patterns with one widget used frequently
            const baseTimestamp = new Date().getTime();
            const frequentUsagePatterns: UsagePattern[] = [];
            
            for (let i = 0; i < usageCount; i++) {
              frequentUsagePatterns.push({
                actionId: frequentWidgetId,
                timestamp: new Date(baseTimestamp - i * 24 * 60 * 60 * 1000), // Spread over days
                context: {
                  timeOfDay: context.timeOfDay,
                  dayOfWeek: Math.floor(Math.random() * 7),
                  urgencyLevel: context.urgencyLevel,
                  dealTypes: context.dealTypes
                }
              });
            }

            // Add some random usage for other widgets
            const otherWidgets = ['smart-summary', 'priority-notifications', 'quick-actions', 
                                'contextual-insights', 'recent-activity', 'calendar']
              .filter(w => w !== frequentWidgetId);
            
            const randomUsagePatterns: UsagePattern[] = [];
            for (let i = 0; i < 5; i++) {
              randomUsagePatterns.push({
                actionId: otherWidgets[Math.floor(Math.random() * otherWidgets.length)],
                timestamp: new Date(baseTimestamp - i * 24 * 60 * 60 * 1000),
                context: {
                  timeOfDay: context.timeOfDay,
                  dayOfWeek: Math.floor(Math.random() * 7),
                  urgencyLevel: context.urgencyLevel,
                  dealTypes: context.dealTypes
                }
              });
            }

            const allUsagePatterns = [...frequentUsagePatterns, ...randomUsagePatterns];

            const result = WidgetPriorityCalculator.calculateWidgetPriorities(
              allUsagePatterns,
              preferences,
              context
            );

            const frequentWidget = result.orderedWidgets.find(w => w.widgetId === frequentWidgetId);
            
            if (frequentWidget) {
              // Property: Frequently used widget should have a usage bonus
              expect(frequentWidget.usageBonus).toBeGreaterThan(0);
              
              // Property: Usage bonus should be reasonable (not exceed maximum)
              expect(frequentWidget.usageBonus).toBeLessThanOrEqual(5);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate meaningful reasoning for widget ordering', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 20 }),
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (usagePatterns, preferences, context) => {
            const result = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            // Property: Reasoning should be a non-empty string
            expect(result.reasoning).toBeTruthy();
            expect(typeof result.reasoning).toBe('string');
            expect(result.reasoning.length).toBeGreaterThan(0);

            // Property: Reasoning should mention the time of day
            expect(result.reasoning.toLowerCase()).toContain(context.timeOfDay);

            // Property: Each widget should have reasoning for its score
            result.orderedWidgets.forEach(widget => {
              expect(Array.isArray(widget.reasoning)).toBe(true);
              expect(widget.reasoning.length).toBeGreaterThan(0);
              
              // Each reasoning item should be a non-empty string
              widget.reasoning.forEach(reason => {
                expect(typeof reason).toBe('string');
                expect(reason.length).toBeGreaterThan(0);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (preferences, context) => {
            // Test with empty usage patterns
            const emptyUsageResult = WidgetPriorityCalculator.calculateWidgetPriorities(
              [],
              preferences,
              context
            );

            // Property: Should still return valid results with empty usage patterns
            expect(emptyUsageResult.orderedWidgets.length).toBeGreaterThan(0);
            expect(emptyUsageResult.reasoning).toBeTruthy();

            // Test with minimal preferences
            const minimalPreferences: PersonalizationPreferences = {
              preferredQuickActions: [],
              widgetPriorities: {},
              timeBasedPreferences: {
                morning: [],
                afternoon: [],
                evening: [],
                night: []
              },
              dealTypeFocus: [],
              lastUpdated: new Date()
            };

            const minimalResult = WidgetPriorityCalculator.calculateWidgetPriorities(
              [],
              minimalPreferences,
              context
            );

            // Property: Should handle minimal preferences gracefully
            expect(minimalResult.orderedWidgets.length).toBeGreaterThan(0);
            minimalResult.orderedWidgets.forEach(widget => {
              expect(widget.finalScore).toBeGreaterThanOrEqual(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistency across multiple calls with same input', () => {
      fc.assert(
        fc.property(
          fc.array(usagePatternArb, { maxLength: 30 }),
          personalizationPreferencesArb,
          widgetPriorityContextArb,
          (usagePatterns, preferences, context) => {
            const result1 = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            const result2 = WidgetPriorityCalculator.calculateWidgetPriorities(
              usagePatterns,
              preferences,
              context
            );

            // Property: Same inputs should produce identical results
            expect(result1.orderedWidgets.length).toBe(result2.orderedWidgets.length);
            
            for (let i = 0; i < result1.orderedWidgets.length; i++) {
              const widget1 = result1.orderedWidgets[i];
              const widget2 = result2.orderedWidgets[i];
              
              expect(widget1.widgetId).toBe(widget2.widgetId);
              expect(widget1.finalScore).toBe(widget2.finalScore);
              expect(widget1.baseScore).toBe(widget2.baseScore);
              expect(widget1.urgencyBonus).toBe(widget2.urgencyBonus);
              expect(widget1.timeBonus).toBe(widget2.timeBonus);
              expect(widget1.usageBonus).toBe(widget2.usageBonus);
              expect(widget1.behaviorBonus).toBe(widget2.behaviorBonus);
              expect(widget1.workloadBonus).toBe(widget2.workloadBonus);
            }

            // Property: Visibility and size maps should be identical
            expect(result1.visibilityMap).toEqual(result2.visibilityMap);
            expect(result1.sizeMap).toEqual(result2.sizeMap);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});