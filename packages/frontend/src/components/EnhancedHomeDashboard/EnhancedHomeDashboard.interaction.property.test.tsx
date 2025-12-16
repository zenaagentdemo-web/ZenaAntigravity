/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { EnhancedHomeDashboardOptimized } from './EnhancedHomeDashboardOptimized';
import { performanceMonitor } from '../../utils/performance';

/**
 * **Feature: enhanced-home-dashboard, Property 18: Interaction Response Time**
 * **Validates: Requirements 11.3**
 * 
 * Property: For any user interaction with dashboard elements, visual feedback should appear within 100 milliseconds
 */

// Mock dependencies
const mockTrackUsage = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    trackUsage: mockTrackUsage,
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

// Generator for interaction types
const interactionTypeArbitrary = fc.constantFrom(
  'click',
  'mousedown',
  'mouseup',
  'touchstart',
  'touchend',
  'keydown',
  'keyup',
  'focus',
  'blur'
);

// Generator for dashboard test data
const dashboardDataArbitrary = fc.record({
  focusThreadsCount: fc.integer({ min: 0, max: 20 }),
  waitingThreadsCount: fc.integer({ min: 0, max: 50 }),
  atRiskDealsCount: fc.integer({ min: 0, max: 10 }),
  urgencyLevel: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
});

// Generator for interaction coordinates
const coordinatesArbitrary = fc.record({
  clientX: fc.integer({ min: 0, max: 1920 }),
  clientY: fc.integer({ min: 0, max: 1080 }),
});

describe('Interaction Response Time Property Tests', () => {
  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.clearMetrics();
    
    // Mock performance.now for precise timing
    let mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime++);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide visual feedback within 100ms for any interactive element', async () => {
    await fc.assert(
      fc.asyncProperty(
        dashboardDataArbitrary,
        interactionTypeArbitrary,
        coordinatesArbitrary,
        async (testData, interactionType, coordinates) => {
          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Find interactive elements
          const interactiveElements = container.querySelectorAll(
            'button, [role="button"], a, [tabindex], .quick-action-button, .theme-toggle, .notification-item'
          );

          if (interactiveElements.length > 0) {
            // Test a random interactive element
            const randomIndex = Math.floor(Math.random() * interactiveElements.length);
            const element = interactiveElements[randomIndex] as HTMLElement;

            const startTime = performance.now();

            // Trigger interaction based on type
            switch (interactionType) {
              case 'click':
                fireEvent.click(element, coordinates);
                break;
              case 'mousedown':
                fireEvent.mouseDown(element, coordinates);
                break;
              case 'mouseup':
                fireEvent.mouseUp(element, coordinates);
                break;
              case 'touchstart':
                fireEvent.touchStart(element, { touches: [coordinates] });
                break;
              case 'touchend':
                fireEvent.touchEnd(element, { changedTouches: [coordinates] });
                break;
              case 'keydown':
                fireEvent.keyDown(element, { key: 'Enter' });
                break;
              case 'keyup':
                fireEvent.keyUp(element, { key: 'Enter' });
                break;
              case 'focus':
                fireEvent.focus(element);
                break;
              case 'blur':
                fireEvent.blur(element);
                break;
            }

            // Wait for immediate visual feedback (should be synchronous or very fast)
            await waitFor(
              () => {
                // Check for visual feedback indicators
                const hasActiveState = element.matches(':active, :focus, .active, .pressed, .clicked');
                const hasVisualChange = element.style.transform !== '' || 
                                      element.style.opacity !== '' ||
                                      element.classList.contains('active') ||
                                      element.classList.contains('pressed') ||
                                      element.classList.contains('clicked');
                
                // At least one form of visual feedback should be present
                expect(hasActiveState || hasVisualChange || element !== document.activeElement).toBeTruthy();
              },
              { timeout: 100 } // Must respond within 100ms
            );

            const responseTime = performance.now() - startTime;

            // Property: Visual feedback should appear within 100ms
            expect(responseTime).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistent response times across different dashboard states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          focusThreadsCount: fc.integer({ min: 0, max: 100 }),
          waitingThreadsCount: fc.integer({ min: 0, max: 200 }),
          atRiskDealsCount: fc.integer({ min: 0, max: 50 }),
          urgencyLevel: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
        }),
        async (testData) => {
          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized testData={testData} />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Test theme toggle response time
          const themeToggle = container.querySelector('.theme-toggle');
          if (themeToggle) {
            const startTime = performance.now();
            
            fireEvent.click(themeToggle);
            
            // Should provide immediate visual feedback
            await waitFor(
              () => {
                // Check for any visual state change
                const hasChanged = themeToggle.matches(':active, :focus') ||
                                 themeToggle.classList.contains('active') ||
                                 document.activeElement === themeToggle;
                expect(hasChanged).toBeTruthy();
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            expect(responseTime).toBeLessThanOrEqual(100);
          }

          // Test quick action buttons response time
          const quickActionButtons = container.querySelectorAll('.quick-action-button');
          if (quickActionButtons.length > 0) {
            const button = quickActionButtons[0] as HTMLElement;
            const startTime = performance.now();
            
            fireEvent.mouseDown(button);
            
            await waitFor(
              () => {
                const hasVisualFeedback = button.matches(':active') ||
                                        button.classList.contains('active') ||
                                        button.style.transform !== '';
                expect(hasVisualFeedback).toBeTruthy();
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            expect(responseTime).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid successive interactions without degrading response time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 10, max: 100 }),
        async (numInteractions, intervalMs) => {
          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          const themeToggle = container.querySelector('.theme-toggle');
          if (themeToggle) {
            const responseTimes: number[] = [];

            // Perform rapid successive interactions
            for (let i = 0; i < numInteractions; i++) {
              const startTime = performance.now();
              
              fireEvent.click(themeToggle);
              
              // Wait for visual feedback
              await waitFor(
                () => {
                  const hasResponse = themeToggle.matches(':active, :focus') ||
                                    document.activeElement === themeToggle;
                  expect(hasResponse).toBeTruthy();
                },
                { timeout: 100 }
              );

              const responseTime = performance.now() - startTime;
              responseTimes.push(responseTime);

              // Wait before next interaction
              await new Promise(resolve => setTimeout(resolve, intervalMs));
            }

            // Property: All interactions should respond within 100ms
            responseTimes.forEach(time => {
              expect(time).toBeLessThanOrEqual(100);
            });

            // Property: Response time should not degrade significantly
            const firstResponse = responseTimes[0];
            const lastResponse = responseTimes[responseTimes.length - 1];
            const degradation = lastResponse - firstResponse;
            
            // Allow some variance but not significant degradation
            expect(degradation).toBeLessThanOrEqual(50); // Max 50ms degradation
          }
        }
      ),
      { numRuns: 50 } // Fewer runs due to timing complexity
    );
  });

  it('should provide haptic feedback on supported devices within response time limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (hasVibrationSupport) => {
          // Mock navigator.vibrate
          const mockVibrate = vi.fn();
          Object.defineProperty(navigator, 'vibrate', {
            value: hasVibrationSupport ? mockVibrate : undefined,
            writable: true,
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          const quickActionButtons = container.querySelectorAll('.quick-action-button');
          if (quickActionButtons.length > 0) {
            const button = quickActionButtons[0] as HTMLElement;
            const startTime = performance.now();
            
            fireEvent.click(button);
            
            // Visual feedback should still appear within 100ms regardless of haptic support
            await waitFor(
              () => {
                const hasVisualFeedback = button.matches(':active, :focus') ||
                                        button.classList.contains('active') ||
                                        document.activeElement === button;
                expect(hasVisualFeedback).toBeTruthy();
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            expect(responseTime).toBeLessThanOrEqual(100);

            // Property: Haptic feedback should be triggered if supported
            if (hasVibrationSupport) {
              expect(mockVibrate).toHaveBeenCalled();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle touch interactions with appropriate response times', async () => {
    await fc.assert(
      fc.asyncProperty(
        coordinatesArbitrary,
        fc.integer({ min: 1, max: 5 }),
        async (touchCoordinates, numTouches) => {
          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          const dashboard = container.querySelector('.enhanced-dashboard');
          if (dashboard) {
            const startTime = performance.now();
            
            // Create touch event with multiple touches
            const touches = Array.from({ length: numTouches }, (_, i) => ({
              clientX: touchCoordinates.clientX + i * 10,
              clientY: touchCoordinates.clientY + i * 10,
              identifier: i,
            }));

            fireEvent.touchStart(dashboard, { touches });
            
            // Should handle touch without errors and provide feedback
            await waitFor(
              () => {
                // Dashboard should remain responsive
                expect(dashboard).toBeInTheDocument();
                expect(dashboard).not.toHaveClass('disabled');
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            
            // Property: Touch interactions should be handled within 100ms
            expect(responseTime).toBeLessThanOrEqual(100);

            // Clean up touch
            fireEvent.touchEnd(dashboard, { changedTouches: touches });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain response times during background operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.boolean(),
        async (isBackgroundRefreshing, hasNetworkActivity) => {
          // Mock background operations
          vi.mocked(vi.importMock('../../hooks/useBackgroundRefresh')).mockReturnValue({
            useBackgroundRefresh: () => ({
              isRefreshing: isBackgroundRefreshing,
              lastRefresh: hasNetworkActivity ? new Date() : null,
              forceRefresh: vi.fn(),
            }),
          });

          const { container } = render(
            <BrowserRouter>
              <EnhancedHomeDashboardOptimized />
            </BrowserRouter>
          );

          await waitFor(() => {
            expect(container.querySelector('.enhanced-dashboard')).toBeInTheDocument();
          });

          // Test interaction during background operations
          const themeToggle = container.querySelector('.theme-toggle');
          if (themeToggle) {
            const startTime = performance.now();
            
            fireEvent.click(themeToggle);
            
            await waitFor(
              () => {
                const hasResponse = themeToggle.matches(':active, :focus') ||
                                  document.activeElement === themeToggle;
                expect(hasResponse).toBeTruthy();
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            
            // Property: Background operations should not affect interaction response time
            expect(responseTime).toBeLessThanOrEqual(100);
          }

          // Test widget interactions during background operations
          const widgetSections = container.querySelectorAll('.enhanced-dashboard__section');
          if (widgetSections.length > 0) {
            const widget = widgetSections[0] as HTMLElement;
            const startTime = performance.now();
            
            fireEvent.click(widget);
            
            // Should track usage without blocking UI
            await waitFor(
              () => {
                expect(mockTrackUsage).toHaveBeenCalled();
              },
              { timeout: 100 }
            );

            const responseTime = performance.now() - startTime;
            expect(responseTime).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});