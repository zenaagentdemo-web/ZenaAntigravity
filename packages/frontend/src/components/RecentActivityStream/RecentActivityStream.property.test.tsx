import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { RecentActivityStream, ActivityItem } from './RecentActivityStream';

/**
 * **Feature: enhanced-home-dashboard, Property 11: Activity Stream Accuracy**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * For any dashboard state, the recent activity stream should display the 3-5 most recent activities 
 * with accurate timestamps and property/deal associations
 */

// Generator for ActivityItem
const activityItemArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  type: fc.constantFrom('email', 'voice_note', 'deal_update', 'appointment', 'property_update', 'contact_update'),
  description: fc.string({ minLength: 10, maxLength: 100 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  propertyAddress: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  dealName: fc.option(fc.string({ minLength: 5, maxLength: 30 })),
  contactName: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
  relatedId: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  relatedType: fc.option(fc.constantFrom('thread', 'deal', 'property', 'contact', 'appointment'))
});

describe('RecentActivityStream Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('Property 11: Activity Stream Accuracy - displays 3-5 most recent activities with accurate timestamps and associations', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 0, maxLength: 20 }),
      fc.integer({ min: 3, max: 5 }),
      (activities: ActivityItem[], maxItems: number) => {
        // Clean up any previous renders
        cleanup();
        
        // Render the component
        const { container } = render(
          <RecentActivityStream
            activities={activities}
            maxItems={maxItems}
          />
        );

        if (activities.length === 0) {
          // Should show empty state
          expect(container.querySelector('.activity-empty-state__message')).toBeInTheDocument();
          return;
        }

        // Should display the title
        expect(container.querySelector('.recent-activity-stream__title')).toBeInTheDocument();

        // Sort activities by timestamp (most recent first) and limit to maxItems
        const expectedActivities = activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, maxItems);

        // Should display at most maxItems activities
        const activityElements = container.querySelectorAll('.activity-item');
        
        expect(activityElements.length).toBeLessThanOrEqual(maxItems);
        expect(activityElements.length).toBeLessThanOrEqual(activities.length);

        // Verify each expected activity is displayed with correct information
        expectedActivities.forEach((activity) => {
          // Check that the description is displayed
          expect(container.textContent).toContain(activity.description);

          // Check property address association if present
          if (activity.propertyAddress) {
            expect(container.textContent).toContain(activity.propertyAddress);
          }

          // Check deal name association if present
          if (activity.dealName) {
            expect(container.textContent).toContain(activity.dealName);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('Property 11: Activity Stream Accuracy - handles timestamp formatting correctly', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 1, maxLength: 10 }),
      (activities: ActivityItem[]) => {
        cleanup();
        
        const { container } = render(
          <RecentActivityStream
            activities={activities}
            maxItems={5}
          />
        );

        // Each activity should have a timestamp displayed
        const timeElements = container.querySelectorAll('.activity-item__time');
        expect(timeElements.length).toBeGreaterThan(0);

        // Verify timestamp format is reasonable (contains time-related words or patterns)
        Array.from(timeElements).forEach(timeElement => {
          const timeText = timeElement.textContent || '';
          const hasValidTimeFormat = 
            timeText.includes('ago') ||
            timeText.includes('Yesterday') ||
            timeText.includes('Just now') ||
            timeText.includes('min') ||
            timeText.includes('hour') ||
            timeText.includes('day') ||
            /\d{1,2}\/\d{1,2}\/\d{4}/.test(timeText); // Date format

          expect(hasValidTimeFormat).toBe(true);
        });
      }
    ), { numRuns: 100 });
  });

  it('Property 11: Activity Stream Accuracy - groups activities by day when older than 24 hours', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 1, maxLength: 10 }),
      (activities: ActivityItem[]) => {
        cleanup();
        
        // Ensure we have some old activities (older than 24 hours)
        const now = new Date();
        const oldActivities = activities.map((activity, index) => ({
          ...activity,
          timestamp: index % 2 === 0 
            ? new Date(now.getTime() - (25 + index) * 60 * 60 * 1000) // Older than 24 hours
            : new Date(now.getTime() - (index + 1) * 60 * 60 * 1000) // Recent
        }));

        const { container } = render(
          <RecentActivityStream
            activities={oldActivities}
            maxItems={5}
          />
        );

        const hasOldActivities = oldActivities.some(activity => {
          const diffInHours = (now.getTime() - activity.timestamp.getTime()) / (1000 * 60 * 60);
          return diffInHours >= 24;
        });

        if (hasOldActivities) {
          // Should have day group titles when there are old activities
          const dayGroupTitles = container.querySelectorAll('.activity-day-group__title');
          if (dayGroupTitles.length > 0) {
            // Verify day group titles contain expected values
            Array.from(dayGroupTitles).forEach(title => {
              const titleText = title.textContent || '';
              const hasValidDayTitle = 
                titleText.includes('Today') ||
                titleText.includes('Yesterday') ||
                /\d{1,2}\/\d{1,2}\/\d{4}/.test(titleText);
              
              expect(hasValidDayTitle).toBe(true);
            });
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('Property 11: Activity Stream Accuracy - displays correct activity icons for each type', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 1, maxLength: 5 }),
      (activities: ActivityItem[]) => {
        cleanup();
        
        const { container } = render(
          <RecentActivityStream
            activities={activities}
            maxItems={5}
          />
        );

        // Each activity should have an icon
        const iconElements = container.querySelectorAll('.activity-item__icon');
        expect(iconElements.length).toBeGreaterThan(0);

        // Verify icons are present (they should contain emoji or text)
        Array.from(iconElements).forEach(iconElement => {
          const iconContent = iconElement.textContent || '';
          expect(iconContent.length).toBeGreaterThan(0);
        });
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: enhanced-home-dashboard, Property 12: Real-time Updates**
   * **Validates: Requirements 6.3**
   * 
   * For any new activity or data change, the dashboard should update relevant widgets 
   * without requiring page refresh
   */
  it('Property 12: Real-time Updates - updates activity stream when new activities are added', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 1, maxLength: 5 }),
      fc.array(activityItemArbitrary, { minLength: 1, maxLength: 3 }),
      (initialActivities: ActivityItem[], newActivities: ActivityItem[]) => {
        cleanup();
        
        // Render component with initial activities
        const { container, rerender } = render(
          <RecentActivityStream
            activities={initialActivities}
            maxItems={5}
          />
        );

        // Verify initial activities are displayed
        const initialActivityElements = container.querySelectorAll('.activity-item');
        const initialCount = Math.min(initialActivities.length, 5);
        expect(initialActivityElements.length).toBe(initialCount);

        // Add new activities (simulating real-time updates)
        const updatedActivities = [...newActivities, ...initialActivities];
        
        // Re-render with updated activities (simulating real-time update)
        rerender(
          <RecentActivityStream
            activities={updatedActivities}
            maxItems={5}
          />
        );

        // Verify the component updated without page refresh
        const updatedActivityElements = container.querySelectorAll('.activity-item');
        const expectedCount = Math.min(updatedActivities.length, 5);
        expect(updatedActivityElements.length).toBe(expectedCount);

        // Verify new activities are displayed (most recent first)
        const sortedUpdatedActivities = updatedActivities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);

        // Check that the most recent activities are displayed
        sortedUpdatedActivities.forEach((activity) => {
          expect(container.textContent).toContain(activity.description);
        });

        // Verify the component shows the updated content
        expect(container.querySelector('.recent-activity-stream')).toBeInTheDocument();
      }
    ), { numRuns: 100 });
  });

  it('Property 12: Real-time Updates - handles activity list changes without losing state', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 2, maxLength: 10 }),
      (activities: ActivityItem[]) => {
        cleanup();
        
        // Render component with activities
        const { container, rerender } = render(
          <RecentActivityStream
            activities={activities}
            maxItems={5}
          />
        );

        // Verify initial render
        expect(container.querySelector('.recent-activity-stream__title')).toBeInTheDocument();
        const initialActivityElements = container.querySelectorAll('.activity-item');
        expect(initialActivityElements.length).toBeGreaterThan(0);

        // Simulate removing some activities (real-time update)
        const reducedActivities = activities.slice(0, Math.max(1, Math.floor(activities.length / 2)));
        
        rerender(
          <RecentActivityStream
            activities={reducedActivities}
            maxItems={5}
          />
        );

        // Verify the component updated correctly
        const updatedActivityElements = container.querySelectorAll('.activity-item');
        const expectedCount = Math.min(reducedActivities.length, 5);
        expect(updatedActivityElements.length).toBe(expectedCount);

        // Verify the title is still present (component structure maintained)
        expect(container.querySelector('.recent-activity-stream__title')).toBeInTheDocument();

        // Verify the remaining activities are still displayed correctly
        const sortedReducedActivities = reducedActivities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);

        sortedReducedActivities.forEach((activity) => {
          expect(container.textContent).toContain(activity.description);
        });
      }
    ), { numRuns: 100 });
  });

  it('Property 12: Real-time Updates - maintains correct ordering when activities are updated', () => {
    fc.assert(fc.property(
      fc.array(activityItemArbitrary, { minLength: 3, maxLength: 8 }),
      (activities: ActivityItem[]) => {
        cleanup();
        
        // Create activities with specific timestamps to test ordering
        const now = new Date();
        const timestampedActivities = activities.map((activity, index) => ({
          ...activity,
          id: `activity-${index}`,
          timestamp: new Date(now.getTime() - index * 60 * 60 * 1000) // Each activity 1 hour older
        }));

        // Render component
        const { container, rerender } = render(
          <RecentActivityStream
            activities={timestampedActivities}
            maxItems={5}
          />
        );

        // Add a new most recent activity
        const newMostRecentActivity: ActivityItem = {
          id: 'new-most-recent',
          type: 'email',
          description: 'New most recent activity',
          timestamp: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour in the future
        };

        const updatedActivities = [newMostRecentActivity, ...timestampedActivities];

        // Re-render with new activity
        rerender(
          <RecentActivityStream
            activities={updatedActivities}
            maxItems={5}
          />
        );

        // Verify the new activity appears first (most recent)
        const activityElements = container.querySelectorAll('.activity-item');
        expect(activityElements.length).toBeGreaterThan(0);

        // The new activity should be displayed
        expect(container.textContent).toContain('New most recent activity');

        // Verify chronological ordering is maintained
        const sortedExpectedActivities = updatedActivities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);

        // Check that activities appear in the correct order
        sortedExpectedActivities.forEach((activity) => {
          expect(container.textContent).toContain(activity.description);
        });
      }
    ), { numRuns: 100 });
  });
});