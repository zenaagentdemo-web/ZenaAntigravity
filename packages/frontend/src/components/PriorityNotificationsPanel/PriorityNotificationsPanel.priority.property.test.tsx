/**
 * Property-Based Tests for Priority Notifications Panel - Notification Priority Consistency
 * **Feature: professional-ui-redesign, Property 7: Notification Priority Consistency**
 * **Validates: Requirements 6.4**
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PriorityNotificationsPanel, Notification, NotificationAction } from './PriorityNotificationsPanel';

// Generator for notification actions
const notificationActionArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 20 }),
  action: fc.string({ minLength: 1, maxLength: 15 }),
  primary: fc.boolean()
});

// Generator for notifications with same priority level
const notificationArb = (type: 'urgent' | 'warning' | 'info' | 'success', priority: number) => 
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    type: fc.constant(type),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    message: fc.string({ minLength: 1, maxLength: 200 }),
    actionable: fc.boolean(),
    actions: fc.option(fc.array(notificationActionArb, { minLength: 1, maxLength: 3 })),
    timestamp: fc.date(),
    dismissed: fc.constant(false), // Only test active notifications
    priority: fc.constant(priority)
  });

// Generator for multiple notifications of the same type
const sameTypeNotificationsArb = fc.tuple(
  fc.constantFrom('urgent', 'warning', 'info', 'success'),
  fc.integer({ min: 1, max: 10 })
).chain(([type, priority]) => 
  fc.array(notificationArb(type, priority), { minLength: 2, maxLength: 5 })
);

describe('PriorityNotificationsPanel - Property 7: Notification Priority Consistency', () => {
  const mockOnDismiss = () => {};
  const mockOnAction = () => {};

  it('should use consistent color coding for notifications of the same priority level', () => {
    fc.assert(fc.property(sameTypeNotificationsArb, (notifications) => {
      const { container } = render(
        <PriorityNotificationsPanel
          notifications={notifications}
          onDismiss={mockOnDismiss}
          onAction={mockOnAction}
        />
      );

      const notificationElements = container.querySelectorAll('.notification');
      
      if (notificationElements.length > 1) {
        const firstNotificationClasses = notificationElements[0].className;
        const notificationType = notifications[0].type;
        
        // All notifications of the same type should have the same CSS class
        for (let i = 1; i < notificationElements.length; i++) {
          const currentClasses = notificationElements[i].className;
          expect(currentClasses).toContain(`notification--${notificationType}`);
          
          // Check that the base styling class structure is consistent
          expect(currentClasses).toContain('notification');
        }
        
        // Verify that the expected type-specific class is present
        expect(firstNotificationClasses).toContain(`notification--${notificationType}`);
      }
      
      return true;
    }), { numRuns: 100 });
  });

  it('should use consistent iconography for notifications of the same priority level', () => {
    fc.assert(fc.property(sameTypeNotificationsArb, (notifications) => {
      const { container } = render(
        <PriorityNotificationsPanel
          notifications={notifications}
          onDismiss={mockOnDismiss}
          onAction={mockOnAction}
        />
      );

      const iconElements = container.querySelectorAll('.notification__icon');
      
      if (iconElements.length > 1) {
        const firstIcon = iconElements[0].textContent;
        
        // All notifications of the same type should have the same icon
        for (let i = 1; i < iconElements.length; i++) {
          expect(iconElements[i].textContent).toBe(firstIcon);
        }
        
        // Verify the icon matches the expected type
        const notificationType = notifications[0].type;
        const expectedIcons = {
          'urgent': '🚨',
          'warning': '⚠️',
          'info': 'ℹ️',
          'success': '✅'
        };
        
        expect(firstIcon).toBe(expectedIcons[notificationType]);
      }
      
      return true;
    }), { numRuns: 100 });
  });

  it('should use consistent visual treatment for urgent notifications', () => {
    fc.assert(fc.property(
      fc.array(notificationArb('urgent', 10), { minLength: 2, maxLength: 4 }),
      (urgentNotifications) => {
        const { container } = render(
          <PriorityNotificationsPanel
            notifications={urgentNotifications}
            onDismiss={mockOnDismiss}
            onAction={mockOnAction}
          />
        );

        const urgentElements = container.querySelectorAll('.notification--urgent');
        const urgencyBadges = container.querySelectorAll('.urgency-badge');
        
        // All urgent notifications should have the urgent class
        expect(urgentElements.length).toBe(urgentNotifications.length);
        
        // All urgent notifications should have urgency badges
        expect(urgencyBadges.length).toBe(urgentNotifications.length);
        
        // All urgency badges should have consistent text
        for (const badge of urgencyBadges) {
          expect(badge.textContent).toBe('URGENT');
        }
        
        return true;
      }
    ), { numRuns: 100 });
  });

  it('should maintain consistent priority ordering regardless of notification content', () => {
    fc.assert(fc.property(
      fc.array(
        fc.tuple(
          fc.constantFrom('urgent', 'warning', 'info', 'success'),
          fc.integer({ min: 1, max: 10 })
        ).chain(([type, priority]) => notificationArb(type, priority)),
        { minLength: 3, maxLength: 8 }
      ),
      (mixedNotifications) => {
        const { container } = render(
          <PriorityNotificationsPanel
            notifications={mixedNotifications}
            onDismiss={mockOnDismiss}
            onAction={mockOnAction}
          />
        );

        const notificationElements = container.querySelectorAll('.notification');
        
        // Verify notifications are sorted by priority (highest first)
        const sortedNotifications = [...mixedNotifications]
          .filter(n => !n.dismissed)
          .sort((a, b) => b.priority - a.priority);
        
        expect(notificationElements.length).toBe(sortedNotifications.length);
        
        // Check that the DOM order matches the expected priority order
        for (let i = 0; i < Math.min(notificationElements.length, sortedNotifications.length); i++) {
          const element = notificationElements[i];
          const expectedType = sortedNotifications[i].type;
          expect(element.className).toContain(`notification--${expectedType}`);
        }
        
        return true;
      }
    ), { numRuns: 100 });
  });

  it('should apply consistent data attributes for priority levels', () => {
    fc.assert(fc.property(
      fc.array(
        fc.oneof(
          notificationArb('urgent', 10),
          notificationArb('warning', 5),
          notificationArb('info', 3),
          notificationArb('success', 1)
        ),
        { minLength: 2, maxLength: 6 }
      ),
      (notifications) => {
        const { container } = render(
          <PriorityNotificationsPanel
            notifications={notifications}
            onDismiss={mockOnDismiss}
            onAction={mockOnAction}
          />
        );

        const notificationElements = container.querySelectorAll('.notification');
        const activeNotifications = notifications
          .filter(n => !n.dismissed)
          .sort((a, b) => b.priority - a.priority);
        
        for (let i = 0; i < notificationElements.length; i++) {
          const element = notificationElements[i];
          const notification = activeNotifications[i];
          
          if (notification && notification.type === 'urgent') {
            expect(element.getAttribute('data-priority')).toBe('high');
          } else {
            expect(element.getAttribute('data-priority')).toBe('normal');
          }
        }
        
        return true;
      }
    ), { numRuns: 100 });
  });
});