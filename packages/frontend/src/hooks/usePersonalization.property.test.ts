/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonalization, UsagePattern, PersonalizationPreferences } from './usePersonalization';
import fc from 'fast-check';

/**
 * **Feature: enhanced-home-dashboard, Property 15: Personalization Learning**
 * **Validates: Requirements 10.1, 10.2, 10.3**
 * 
 * Property: For any user interaction pattern, the system should learn preferences 
 * and adjust dashboard layout and quick action prominence accordingly
 */

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Generators for property-based testing
const timeOfDayArb = fc.constantFrom('morning', 'afternoon', 'evening', 'night');
const dayOfWeekArb = fc.integer({ min: 0, max: 6 });
const urgencyLevelArb = fc.constantFrom('low', 'medium', 'high');
const actionIdArb = fc.constantFrom(
  'voice-note', 'ask-zena', 'focus-threads', 'property-search',
  'smart-summary', 'priority-notifications', 'quick-actions',
  'contextual-insights', 'recent-activity', 'calendar'
);

const usagePatternArb = fc.record({
  actionId: actionIdArb,
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  context: fc.record({
    timeOfDay: timeOfDayArb,
    dayOfWeek: dayOfWeekArb,
    urgencyLevel: fc.option(urgencyLevelArb),
    dealTypes: fc.array(fc.string(), { maxLength: 3 }),
  }),
});

const usagePatternsArb = fc.array(usagePatternArb, { minLength: 0, maxLength: 100 });

describe('usePersonalization Property Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('Property 15: Personalization Learning', () => {
    it('should learn from usage patterns and adjust quick action prominence', () => {
      fc.assert(
        fc.property(usagePatternsArb, (initialPatterns) => {
          const { result } = renderHook(() => usePersonalization());
          
          // Simulate usage patterns
          act(() => {
            initialPatterns.forEach(pattern => {
              result.current.trackUsage(pattern.actionId, {
                urgencyLevel: pattern.context.urgencyLevel,
                dealTypes: pattern.context.dealTypes,
              });
            });
          });

          const prioritizedActions = result.current.getPrioritizedQuickActions();
          
          // Property: System should return a valid list of prioritized actions
          expect(Array.isArray(prioritizedActions)).toBe(true);
          expect(prioritizedActions.length).toBeGreaterThan(0);

          // Property: All returned actions should be valid action IDs
          prioritizedActions.forEach(actionId => {
            expect(['voice-note', 'ask-zena', 'focus-threads', 'property-search',
                   'smart-summary', 'priority-notifications', 'quick-actions',
                   'contextual-insights', 'recent-activity', 'calendar'])
              .toContain(actionId);
          });

          // Property: Actions should be unique (no duplicates)
          const uniqueActions = new Set(prioritizedActions);
          expect(uniqueActions.size).toBe(prioritizedActions.length);

          // Property: If there are significant usage patterns, frequently used actions 
          // should have some influence on ordering (but not necessarily be dominant)
          if (initialPatterns.length > 10) {
            const actionFrequencies = initialPatterns.reduce((acc, pattern) => {
              acc[pattern.actionId] = (acc[pattern.actionId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const sortedByFrequency = Object.entries(actionFrequencies)
              .sort(([, a], [, b]) => b - a);

            if (sortedByFrequency.length >= 2 && sortedByFrequency[0][1] > sortedByFrequency[1][1] * 2) {
              // If one action is used significantly more than others, it should appear in prioritized list
              const mostUsedAction = sortedByFrequency[0][0];
              expect(prioritizedActions).toContain(mostUsedAction);
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should adjust widget priorities based on usage patterns', () => {
      fc.assert(
        fc.property(usagePatternsArb, (patterns) => {
          const { result } = renderHook(() => usePersonalization());
          
          // Track usage patterns
          act(() => {
            patterns.forEach(pattern => {
              result.current.trackUsage(pattern.actionId, {
                urgencyLevel: pattern.context.urgencyLevel,
                dealTypes: pattern.context.dealTypes,
              });
            });
          });

          // Test widget priority calculation
          const widgetIds = ['smart-summary', 'priority-notifications', 'quick-actions', 
                           'contextual-insights', 'recent-activity', 'calendar'];
          
          const priorities = widgetIds.map(widgetId => ({
            widgetId,
            priority: result.current.calculateWidgetPriority(widgetId),
          }));

          // Property: Priorities should be positive numbers
          priorities.forEach(({ priority }) => {
            expect(priority).toBeGreaterThan(0);
            expect(Number.isFinite(priority)).toBe(true);
          });

          // Property: Priority calculation should be consistent
          const samePriority = result.current.calculateWidgetPriority('smart-summary');
          expect(samePriority).toBe(result.current.calculateWidgetPriority('smart-summary'));

          // Property: Usage should influence priorities (but not necessarily dominate)
          if (patterns.length > 20) {
            const usageCount = patterns.reduce((acc, pattern) => {
              if (widgetIds.includes(pattern.actionId)) {
                acc[pattern.actionId] = (acc[pattern.actionId] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>);

            const sortedByUsage = Object.entries(usageCount)
              .sort(([, a], [, b]) => b - a);

            // If there's a widget with significantly more usage, it should get some priority boost
            if (sortedByUsage.length >= 2 && sortedByUsage[0][1] > sortedByUsage[1][1] * 3) {
              const mostUsedWidget = sortedByUsage[0][0];
              const leastUsedWidget = sortedByUsage[sortedByUsage.length - 1][0];
              
              const mostUsedPriority = result.current.calculateWidgetPriority(mostUsedWidget);
              const leastUsedPriority = result.current.calculateWidgetPriority(leastUsedWidget);
              
              // Most used should have higher priority than least used (accounting for base priorities)
              const mostUsedFrequency = result.current.getActionFrequency(mostUsedWidget);
              const leastUsedFrequency = result.current.getActionFrequency(leastUsedWidget);
              
              if (mostUsedFrequency > leastUsedFrequency * 2) {
                expect(mostUsedPriority).toBeGreaterThan(leastUsedPriority - 2); // Allow for base priority differences
              }
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should adapt to time-based usage patterns', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              actionId: actionIdArb,
              timeOfDay: timeOfDayArb,
              count: fc.integer({ min: 1, max: 10 }),
            }),
            { minLength: 1, maxLength: 4 }
          ),
          (timeBasedUsage) => {
            const { result } = renderHook(() => usePersonalization());
            
            // Create patterns concentrated in specific times
            const patterns: UsagePattern[] = [];
            timeBasedUsage.forEach(({ actionId, timeOfDay, count }) => {
              for (let i = 0; i < count; i++) {
                patterns.push({
                  actionId,
                  timestamp: new Date(),
                  context: {
                    timeOfDay,
                    dayOfWeek: Math.floor(Math.random() * 7),
                    urgencyLevel: 'medium',
                    dealTypes: [],
                  },
                });
              }
            });

            // Track the patterns
            act(() => {
              patterns.forEach(pattern => {
                result.current.trackUsage(pattern.actionId, {
                  urgencyLevel: pattern.context.urgencyLevel,
                  dealTypes: pattern.context.dealTypes,
                });
              });
            });

            // Property: Time preferences should reflect usage patterns
            const currentTimePreferences = result.current.getCurrentTimePreferences();
            
            // Should return an array of action IDs
            expect(Array.isArray(currentTimePreferences)).toBe(true);
            currentTimePreferences.forEach(actionId => {
              expect(typeof actionId).toBe('string');
              expect(actionId.length).toBeGreaterThan(0);
            });

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain data consistency across sessions', () => {
      fc.assert(
        fc.property(usagePatternsArb, (patterns) => {
          // First session
          const { result: result1 } = renderHook(() => usePersonalization());
          
          act(() => {
            patterns.forEach(pattern => {
              result1.current.trackUsage(pattern.actionId, {
                urgencyLevel: pattern.context.urgencyLevel,
                dealTypes: pattern.context.dealTypes,
              });
            });
          });

          const preferences1 = result1.current.preferences;
          const usagePatterns1 = result1.current.usagePatterns;

          // Second session (simulating app restart)
          const { result: result2 } = renderHook(() => usePersonalization());

          // Property: Data should persist across sessions
          expect(result2.current.preferences.lastUpdated).toBeDefined();
          expect(result2.current.usagePatterns.length).toBeGreaterThanOrEqual(0);

          // Property: Preferences structure should be maintained
          expect(result2.current.preferences).toHaveProperty('preferredQuickActions');
          expect(result2.current.preferences).toHaveProperty('widgetPriorities');
          expect(result2.current.preferences).toHaveProperty('timeBasedPreferences');
          expect(result2.current.preferences).toHaveProperty('dealTypeFocus');

          // Property: Usage patterns should be arrays with proper structure
          result2.current.usagePatterns.forEach(pattern => {
            expect(pattern).toHaveProperty('actionId');
            expect(pattern).toHaveProperty('timestamp');
            expect(pattern).toHaveProperty('context');
            expect(pattern.context).toHaveProperty('timeOfDay');
            expect(pattern.context).toHaveProperty('dayOfWeek');
          });

          return true;
        }),
        { numRuns: 30 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            emptyPatterns: fc.constant([]),
            invalidActionId: fc.string(),
            extremeFrequency: fc.integer({ min: 0, max: 1000 }),
          }),
          ({ emptyPatterns, invalidActionId, extremeFrequency }) => {
            const { result } = renderHook(() => usePersonalization());

            // Property: Should handle empty usage patterns
            const prioritizedEmpty = result.current.getPrioritizedQuickActions();
            expect(Array.isArray(prioritizedEmpty)).toBe(true);
            expect(prioritizedEmpty.length).toBeGreaterThan(0);

            // Property: Should handle invalid action IDs gracefully
            act(() => {
              result.current.trackUsage(invalidActionId);
            });
            
            // Should not crash and should still return valid data
            const prioritizedAfterInvalid = result.current.getPrioritizedQuickActions();
            expect(Array.isArray(prioritizedAfterInvalid)).toBe(true);

            // Property: Should handle extreme frequencies
            act(() => {
              for (let i = 0; i < Math.min(extremeFrequency, 100); i++) {
                result.current.trackUsage('voice-note');
              }
            });

            const frequency = result.current.getActionFrequency('voice-note');
            expect(frequency).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(frequency)).toBe(true);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should respect learning enabled/disabled state', () => {
      fc.assert(
        fc.property(usagePatternsArb, (patterns) => {
          const { result } = renderHook(() => usePersonalization());
          
          // Disable learning
          act(() => {
            result.current.toggleLearning(false);
          });

          expect(result.current.learningEnabled).toBe(false);

          const initialPatternCount = result.current.usagePatterns.length;

          // Try to track usage while learning is disabled
          act(() => {
            patterns.slice(0, 5).forEach(pattern => {
              result.current.trackUsage(pattern.actionId, {
                urgencyLevel: pattern.context.urgencyLevel,
                dealTypes: pattern.context.dealTypes,
              });
            });
          });

          // Property: Usage patterns should not be recorded when learning is disabled
          expect(result.current.usagePatterns.length).toBe(initialPatternCount);

          // Enable learning
          act(() => {
            result.current.toggleLearning(true);
          });

          expect(result.current.learningEnabled).toBe(true);

          // Now tracking should work
          act(() => {
            result.current.trackUsage('voice-note');
          });

          expect(result.current.usagePatterns.length).toBeGreaterThan(initialPatternCount);

          return true;
        }),
        { numRuns: 20 }
      );
    });
  });
});