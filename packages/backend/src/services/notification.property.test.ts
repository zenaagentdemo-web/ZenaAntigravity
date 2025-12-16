import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { notificationService } from './notification.service.js';
import prisma from '../config/database.js';

/**
 * Property-Based Tests for Notification Service
 * 
 * These tests verify universal properties that should hold across all inputs.
 */

describe('Notification Service - Property-Based Tests', () => {
  // Mock web-push to avoid actual push notifications during tests
  vi.mock('web-push', () => ({
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn().mockResolvedValue(undefined),
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      })),
    },
  }));

  beforeEach(async () => {
    // Clean up test data
    await prisma.pushSubscription.deleteMany({});
    await prisma.notificationPreferences.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.pushSubscription.deleteMany({});
    await prisma.notificationPreferences.deleteMany({});
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 74: Notification preference respect
   * 
   * For any notification category disabled by an agent, the system should not send 
   * notifications for that category.
   * 
   * **Validates: Requirements 20.5**
   */
  describe('Property 74: Notification preference respect', () => {
    it('should respect highPriorityThreads preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(),
          async (userId, threadId, subject, preferenceEnabled) => {
            // Setup: Create user with specific preference
            await prisma.notificationPreferences.create({
              data: {
                userId,
                highPriorityThreads: preferenceEnabled,
                riskDeals: true,
                calendarReminders: true,
                taskReminders: true,
                newThreads: false,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification to track if it's called
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Action: Attempt to send high-priority thread notification
            await notificationService.notifyHighPriorityThread(
              userId,
              threadId,
              subject
            );

            // Assertion: Notification should only be sent if preference is enabled
            if (preferenceEnabled) {
              expect(sendSpy).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                  title: 'High Priority Thread',
                  body: expect.stringContaining(subject),
                })
              );
            } else {
              expect(sendSpy).not.toHaveBeenCalled();
            }

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect riskDeals preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.boolean(),
          async (userId, dealId, propertyAddress, riskReason, preferenceEnabled) => {
            // Setup: Create user with specific preference
            await prisma.notificationPreferences.create({
              data: {
                userId,
                highPriorityThreads: true,
                riskDeals: preferenceEnabled,
                calendarReminders: true,
                taskReminders: true,
                newThreads: false,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Action: Attempt to send risk deal notification
            await notificationService.notifyRiskDeal(
              userId,
              dealId,
              propertyAddress,
              riskReason
            );

            // Assertion: Notification should only be sent if preference is enabled
            if (preferenceEnabled) {
              expect(sendSpy).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                  title: 'Deal At Risk',
                  body: expect.stringContaining(propertyAddress),
                })
              );
            } else {
              expect(sendSpy).not.toHaveBeenCalled();
            }

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect calendarReminders preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.date(),
          fc.boolean(),
          async (userId, eventId, eventTitle, eventTime, preferenceEnabled) => {
            // Setup: Create user with specific preference
            await prisma.notificationPreferences.create({
              data: {
                userId,
                highPriorityThreads: true,
                riskDeals: true,
                calendarReminders: preferenceEnabled,
                taskReminders: true,
                newThreads: false,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Action: Attempt to send calendar reminder notification
            await notificationService.notifyCalendarReminder(
              userId,
              eventId,
              eventTitle,
              eventTime
            );

            // Assertion: Notification should only be sent if preference is enabled
            if (preferenceEnabled) {
              expect(sendSpy).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                  title: 'Upcoming Event',
                  body: expect.stringContaining(eventTitle),
                })
              );
            } else {
              expect(sendSpy).not.toHaveBeenCalled();
            }

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect taskReminders preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.date(),
          fc.boolean(),
          async (userId, taskId, taskLabel, dueDate, preferenceEnabled) => {
            // Setup: Create user with specific preference
            await prisma.notificationPreferences.create({
              data: {
                userId,
                highPriorityThreads: true,
                riskDeals: true,
                calendarReminders: true,
                taskReminders: preferenceEnabled,
                newThreads: false,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Action: Attempt to send task reminder notification
            await notificationService.notifyTaskReminder(
              userId,
              taskId,
              taskLabel,
              dueDate
            );

            // Assertion: Notification should only be sent if preference is enabled
            if (preferenceEnabled) {
              expect(sendSpy).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                  title: 'Task Due',
                  body: expect.stringContaining(taskLabel),
                })
              );
            } else {
              expect(sendSpy).not.toHaveBeenCalled();
            }

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect newThreads preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(),
          async (userId, threadId, subject, sender, preferenceEnabled) => {
            // Setup: Create user with specific preference
            await prisma.notificationPreferences.create({
              data: {
                userId,
                highPriorityThreads: true,
                riskDeals: true,
                calendarReminders: true,
                taskReminders: true,
                newThreads: preferenceEnabled,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Action: Attempt to send new thread notification
            await notificationService.notifyNewThread(
              userId,
              threadId,
              subject,
              sender
            );

            // Assertion: Notification should only be sent if preference is enabled
            if (preferenceEnabled) {
              expect(sendSpy).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                  title: 'New Thread',
                  body: expect.stringContaining(sender),
                })
              );
            } else {
              expect(sendSpy).not.toHaveBeenCalled();
            }

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect all preferences simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            highPriorityThreads: fc.boolean(),
            riskDeals: fc.boolean(),
            calendarReminders: fc.boolean(),
            taskReminders: fc.boolean(),
            newThreads: fc.boolean(),
          }),
          async (userId, preferences) => {
            // Setup: Create user with random preferences
            await prisma.notificationPreferences.create({
              data: {
                userId,
                ...preferences,
              },
            });

            // Create a push subscription for the user
            await prisma.pushSubscription.create({
              data: {
                userId,
                endpoint: `https://fcm.googleapis.com/fcm/send/${userId}`,
                keys: {
                  p256dh: 'test-p256dh',
                  auth: 'test-auth',
                },
              },
            });

            // Spy on sendNotification
            const sendSpy = vi.spyOn(notificationService, 'sendNotification');

            // Test each notification type
            await notificationService.notifyHighPriorityThread(userId, 'thread1', 'Test');
            const highPriorityCallCount = sendSpy.mock.calls.length;
            expect(highPriorityCallCount).toBe(preferences.highPriorityThreads ? 1 : 0);

            sendSpy.mockClear();
            await notificationService.notifyRiskDeal(userId, 'deal1', 'Address', 'Risk');
            const riskDealCallCount = sendSpy.mock.calls.length;
            expect(riskDealCallCount).toBe(preferences.riskDeals ? 1 : 0);

            sendSpy.mockClear();
            await notificationService.notifyCalendarReminder(userId, 'event1', 'Event', new Date());
            const calendarCallCount = sendSpy.mock.calls.length;
            expect(calendarCallCount).toBe(preferences.calendarReminders ? 1 : 0);

            sendSpy.mockClear();
            await notificationService.notifyTaskReminder(userId, 'task1', 'Task', new Date());
            const taskCallCount = sendSpy.mock.calls.length;
            expect(taskCallCount).toBe(preferences.taskReminders ? 1 : 0);

            sendSpy.mockClear();
            await notificationService.notifyNewThread(userId, 'thread2', 'Subject', 'Sender');
            const newThreadCallCount = sendSpy.mock.calls.length;
            expect(newThreadCallCount).toBe(preferences.newThreads ? 1 : 0);

            sendSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Subscription management consistency
   * 
   * For any user, registering the same subscription endpoint multiple times
   * should result in only one subscription record (upsert behavior).
   */
  describe('Subscription management consistency', () => {
    it('should upsert subscriptions with same endpoint', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.integer({ min: 2, max: 5 }),
          async (userId, endpoint, registrationCount) => {
            // Action: Register the same subscription multiple times
            for (let i = 0; i < registrationCount; i++) {
              await notificationService.registerSubscription(userId, {
                endpoint,
                keys: {
                  p256dh: `p256dh-${i}`,
                  auth: `auth-${i}`,
                },
              });
            }

            // Assertion: Should only have one subscription record
            const subscriptions = await prisma.pushSubscription.findMany({
              where: { endpoint },
            });

            expect(subscriptions).toHaveLength(1);
            expect(subscriptions[0].userId).toBe(userId);
            expect(subscriptions[0].endpoint).toBe(endpoint);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Default preferences creation
   * 
   * For any user without existing preferences, getting preferences should
   * create default preferences with sensible defaults.
   */
  describe('Default preferences creation', () => {
    it('should create default preferences when none exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            // Ensure no preferences exist
            await prisma.notificationPreferences.deleteMany({
              where: { userId },
            });

            // Action: Get preferences
            const preferences = await notificationService.getPreferences(userId);

            // Assertion: Should have created default preferences
            expect(preferences).toBeDefined();
            expect(preferences.userId).toBe(userId);
            expect(preferences.highPriorityThreads).toBe(true);
            expect(preferences.riskDeals).toBe(true);
            expect(preferences.calendarReminders).toBe(true);
            expect(preferences.taskReminders).toBe(true);
            expect(preferences.newThreads).toBe(false);

            // Verify it was persisted
            const dbPreferences = await prisma.notificationPreferences.findUnique({
              where: { userId },
            });
            expect(dbPreferences).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
