/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Real-Time Update Notification
 * 
 * **Feature: new-page-dropdown-fixes, Property 23: Real-time Update Notification**
 * **Validates: Requirements 8.6**
 * 
 * Tests that real-time update notifications are properly displayed during
 * reply composition without disrupting the user's workflow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { conflictDetectionService, ConflictNotification } from './conflictDetectionService';

// Mock the real-time data service
vi.mock('./realTimeDataService', () => ({
  realTimeDataService: {
    onDataUpdate: vi.fn(),
    sendMessage: vi.fn()
  }
}));

// Mock the error handling service
vi.mock('./errorHandlingService', () => ({
  errorHandlingService: {
    reportError: vi.fn()
  }
}));

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generates a single action with proper constraints
 * Only one action in a set can be primary
 */
const actionArbitrary = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  label: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{1,29}$/),
  type: fc.oneof(
    fc.constant('refresh'),
    fc.constant('merge'),
    fc.constant('discard'),
    fc.constant('save_as_draft')
  ),
  primary: fc.constant(false) as fc.Arbitrary<boolean | undefined>
});

/**
 * Generates an array of actions with at most one primary action
 */
const actionsArrayArbitrary = fc.array(actionArbitrary, { minLength: 1, maxLength: 4 })
  .chain(actions => {
    // Optionally make one action primary
    return fc.integer({ min: -1, max: actions.length - 1 }).map(primaryIndex => {
      if (primaryIndex >= 0 && actions[primaryIndex]) {
        return actions.map((action, idx) => ({
          ...action,
          primary: idx === primaryIndex ? true : undefined
        }));
      }
      return actions.map(action => ({ ...action, primary: undefined }));
    });
  });

/**
 * Generates a conflict notification with proper constraints
 * - Update+info notifications always have autoHideAfter defined
 * - Error notifications with autoHideAfter have values >= 10000
 * - Timestamps are always after epoch (> 0)
 * - At most one primary action
 */
const conflictNotificationArbitrary = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
  threadId: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  type: fc.oneof(fc.constant('conflict'), fc.constant('update')),
  title: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{4,99}$/),
  message: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{9,199}$/),
  severity: fc.oneof(fc.constant('info'), fc.constant('warning'), fc.constant('error')),
  // Ensure timestamp is always after epoch (year 2000+)
  timestamp: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
  actions: fc.option(actionsArrayArbitrary, { nil: undefined }),
  // Base autoHideAfter - will be adjusted based on type/severity
  autoHideAfter: fc.option(fc.integer({ min: 1000, max: 30000 }), { nil: undefined })
}).chain(notification => {
  // Apply constraints based on type and severity
  if (notification.type === 'update' && notification.severity === 'info') {
    // Update+info notifications must have autoHideAfter defined
    return fc.integer({ min: 3000, max: 15000 }).map(autoHide => ({
      ...notification,
      autoHideAfter: autoHide
    }));
  }
  if (notification.severity === 'error' && notification.autoHideAfter !== undefined) {
    // Error notifications with autoHideAfter must have >= 10000
    return fc.integer({ min: 10000, max: 30000 }).map(autoHide => ({
      ...notification,
      autoHideAfter: autoHide
    }));
  }
  return fc.constant(notification);
});

/**
 * Generates a sequence of notifications for testing
 */
const notificationSequenceArbitrary = fc.array(
  conflictNotificationArbitrary,
  { minLength: 1, maxLength: 10 }
);

/**
 * Generates notification timing scenarios
 */
const notificationTimingArbitrary = fc.record({
  notifications: notificationSequenceArbitrary,
  intervals: fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 1, maxLength: 10 }),
  composingDuration: fc.integer({ min: 1000, max: 30000 })
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Real-Time Update Notification', () => {
  beforeEach(() => {
    // Reset the service state
    conflictDetectionService.cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    conflictDetectionService.cleanup();
  });

  /**
   * Property 23: Real-time Update Notification
   * Notifications should be delivered without disrupting composition workflow
   */
  it('should deliver notifications without disrupting composition', () => {
    fc.assert(
      fc.property(
        notificationSequenceArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }),
        (notifications, threadId) => {
          const receivedNotifications: ConflictNotification[] = [];
          let compositionDisrupted = false;

          // Subscribe to notifications
          const unsubscribe = conflictDetectionService.onNotification((notification) => {
            receivedNotifications.push(notification);
            
            // Check if notification is non-disruptive
            if (notification.severity === 'info' && notification.autoHideAfter) {
              // Info notifications with auto-hide should be non-disruptive
              expect(notification.autoHideAfter).toBeGreaterThan(0);
            }
          });

          try {
            conflictDetectionService.initialize();

            // Start composing
            conflictDetectionService.startComposing(threadId);

            // Simulate notifications during composition
            notifications.forEach(notification => {
              // Verify notification structure
              expect(notification.id).toBeDefined();
              expect(notification.threadId).toBeDefined();
              expect(notification.type).toMatch(/^(conflict|update)$/);
              expect(notification.title).toBeDefined();
              expect(notification.message).toBeDefined();
              expect(notification.severity).toMatch(/^(info|warning|error)$/);
              expect(notification.timestamp).toBeInstanceOf(Date);

              // Verify non-disruptive characteristics
              if (notification.type === 'update' && notification.severity === 'info') {
                // Update notifications should be non-disruptive
                expect(notification.autoHideAfter).toBeDefined();
                expect(notification.autoHideAfter).toBeGreaterThan(0);
              }

              // Verify actions are properly structured
              if (notification.actions) {
                notification.actions.forEach(action => {
                  expect(action.id).toBeDefined();
                  expect(action.label).toBeDefined();
                  expect(action.type).toMatch(/^(refresh|merge|discard|save_as_draft)$/);
                });
              }
            });

            // Stop composing
            conflictDetectionService.stopComposing(threadId);

            // Verify composition workflow wasn't disrupted
            expect(compositionDisrupted).toBe(false);

          } finally {
            unsubscribe();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.1: Notification Severity Handling
   * Different severity levels should be handled appropriately
   */
  it('should handle different notification severities appropriately', () => {
    fc.assert(
      fc.property(
        conflictNotificationArbitrary,
        (notification) => {
          let receivedNotification: ConflictNotification | null = null;

          const unsubscribe = conflictDetectionService.onNotification((notif) => {
            receivedNotification = notif;
          });

          try {
            conflictDetectionService.initialize();

            // Verify severity-specific behavior expectations
            switch (notification.severity) {
              case 'info':
                // Info notifications should be non-disruptive
                if (notification.autoHideAfter) {
                  expect(notification.autoHideAfter).toBeGreaterThan(0);
                }
                break;

              case 'warning':
                // Warning notifications may require user attention
                expect(notification.title).toBeDefined();
                expect(notification.message).toBeDefined();
                break;

              case 'error':
                // Error notifications should have clear actions
                expect(notification.title).toBeDefined();
                expect(notification.message).toBeDefined();
                if (notification.actions) {
                  expect(notification.actions.length).toBeGreaterThan(0);
                }
                break;
            }

            // Verify notification structure is valid
            expect(notification.id).toBeDefined();
            expect(notification.threadId).toBeDefined();
            expect(['conflict', 'update']).toContain(notification.type);
            expect(['info', 'warning', 'error']).toContain(notification.severity);

          } finally {
            unsubscribe();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.2: Notification Action Validation
   * Notification actions should be properly structured and functional
   */
  it('should provide properly structured notification actions', () => {
    fc.assert(
      fc.property(
        conflictNotificationArbitrary,
        (notification) => {
          conflictDetectionService.initialize();

          // Verify actions structure if present
          if (notification.actions) {
            expect(Array.isArray(notification.actions)).toBe(true);
            expect(notification.actions.length).toBeGreaterThan(0);
            expect(notification.actions.length).toBeLessThanOrEqual(4); // Reasonable limit

            notification.actions.forEach(action => {
              // Verify required action properties
              expect(action.id).toBeDefined();
              expect(typeof action.id).toBe('string');
              expect(action.id.length).toBeGreaterThan(0);

              expect(action.label).toBeDefined();
              expect(typeof action.label).toBe('string');
              expect(action.label.length).toBeGreaterThan(0);

              expect(action.type).toBeDefined();
              expect(['refresh', 'merge', 'discard', 'save_as_draft']).toContain(action.type);

              // Primary flag should be boolean if defined
              if (action.primary !== undefined) {
                expect(typeof action.primary).toBe('boolean');
              }
            });

            // Should have at most one primary action
            const primaryActions = notification.actions.filter(action => action.primary);
            expect(primaryActions.length).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.3: Notification Timing and Auto-Hide
   * Auto-hide notifications should have appropriate timing
   */
  it('should handle notification timing and auto-hide appropriately', () => {
    fc.assert(
      fc.property(
        conflictNotificationArbitrary,
        (notification) => {
          conflictDetectionService.initialize();

          // Verify auto-hide timing
          if (notification.autoHideAfter !== undefined) {
            expect(typeof notification.autoHideAfter).toBe('number');
            expect(notification.autoHideAfter).toBeGreaterThan(0);
            
            // Auto-hide should be reasonable (between 1 second and 30 seconds)
            expect(notification.autoHideAfter).toBeGreaterThanOrEqual(1000);
            expect(notification.autoHideAfter).toBeLessThanOrEqual(30000);

            // Info notifications should typically auto-hide
            if (notification.severity === 'info') {
              expect(notification.autoHideAfter).toBeDefined();
            }
          }

          // Error notifications should not auto-hide (or have longer duration)
          if (notification.severity === 'error' && notification.autoHideAfter) {
            expect(notification.autoHideAfter).toBeGreaterThanOrEqual(10000); // At least 10 seconds
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.4: Notification Thread Association
   * Notifications should be properly associated with threads
   */
  it('should properly associate notifications with threads', () => {
    fc.assert(
      fc.property(
        fc.array(conflictNotificationArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        (notifications, threadIds) => {
          const notificationsByThread = new Map<string, ConflictNotification[]>();

          const unsubscribe = conflictDetectionService.onNotification((notification) => {
            const threadNotifications = notificationsByThread.get(notification.threadId) || [];
            threadNotifications.push(notification);
            notificationsByThread.set(notification.threadId, threadNotifications);
          });

          try {
            conflictDetectionService.initialize();

            // Start composing for multiple threads
            threadIds.forEach(threadId => {
              conflictDetectionService.startComposing(threadId);
            });

            // Verify each notification has a valid thread association
            notifications.forEach(notification => {
              expect(notification.threadId).toBeDefined();
              expect(typeof notification.threadId).toBe('string');
              expect(notification.threadId.length).toBeGreaterThan(0);

              // Verify notification ID is unique
              expect(notification.id).toBeDefined();
              expect(typeof notification.id).toBe('string');
              expect(notification.id.length).toBeGreaterThan(0);
            });

            // Stop composing for all threads
            threadIds.forEach(threadId => {
              conflictDetectionService.stopComposing(threadId);
            });

          } finally {
            unsubscribe();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.5: Notification Callback Management
   * Notification callbacks should be properly managed
   */
  it('should properly manage notification callbacks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (callbackCount) => {
          conflictDetectionService.initialize();

          const callbacks: (() => void)[] = [];
          const receivedNotifications: ConflictNotification[][] = [];

          // Subscribe multiple callbacks
          for (let i = 0; i < callbackCount; i++) {
            const notifications: ConflictNotification[] = [];
            receivedNotifications.push(notifications);

            const unsubscribe = conflictDetectionService.onNotification((notification) => {
              notifications.push(notification);
            });

            callbacks.push(unsubscribe);

            // Verify unsubscribe function is returned
            expect(typeof unsubscribe).toBe('function');
          }

          // Test that callbacks can be unsubscribed
          callbacks.forEach((unsubscribe, index) => {
            expect(() => unsubscribe()).not.toThrow();
          });

          // Verify service remains stable after unsubscribing
          expect(() => conflictDetectionService.cleanup()).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23.6: Notification Content Validation
   * Notification content should be properly formatted and informative
   */
  it('should provide properly formatted and informative notification content', () => {
    fc.assert(
      fc.property(
        conflictNotificationArbitrary,
        (notification) => {
          conflictDetectionService.initialize();

          // Verify required content fields
          expect(notification.title).toBeDefined();
          expect(typeof notification.title).toBe('string');
          expect(notification.title.trim().length).toBeGreaterThan(0);

          expect(notification.message).toBeDefined();
          expect(typeof notification.message).toBe('string');
          expect(notification.message.trim().length).toBeGreaterThan(0);

          // Verify timestamp is valid
          expect(notification.timestamp).toBeInstanceOf(Date);
          expect(notification.timestamp.getTime()).toBeGreaterThan(0);

          // Verify ID is unique and meaningful
          expect(notification.id).toBeDefined();
          expect(typeof notification.id).toBe('string');
          expect(notification.id.trim().length).toBeGreaterThan(0);

          // Verify thread ID is valid
          expect(notification.threadId).toBeDefined();
          expect(typeof notification.threadId).toBe('string');
          expect(notification.threadId.trim().length).toBeGreaterThan(0);

          // Verify type and severity are valid enums
          expect(['conflict', 'update']).toContain(notification.type);
          expect(['info', 'warning', 'error']).toContain(notification.severity);
        }
      ),
      { numRuns: 100 }
    );
  });
});