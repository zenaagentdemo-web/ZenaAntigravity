import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getTimelineSection, formatDueDate } from './TasksPage';

describe('TasksPage Logic', () => {
    describe('getTimelineSection', () => {
        it('should return "later" for undefined date', () => {
            expect(getTimelineSection(undefined)).toBe('later');
        });

        it('should return "today" for today', () => {
            const today = new Date();
            expect(getTimelineSection(today)).toBe('today');
        });

        it('should return "tomorrow" for tomorrow', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(getTimelineSection(tomorrow)).toBe('tomorrow');
        });

        it('should return "overdue" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(getTimelineSection(yesterday)).toBe('overdue');
        });

        // Property Test
        it('should always return a valid timeline section string for any date', () => {
            fc.assert(
                fc.property(fc.date(), (date) => {
                    const section = getTimelineSection(date);
                    const validSections = [
                        'overdue', 'today', 'tomorrow',
                        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                        'next_week', 'later'
                    ];
                    expect(validSections).toContain(section);
                })
            );
        });
    });

    describe('formatDueDate', () => {
        it('should return "No due date" for undefined', () => {
            expect(formatDueDate(undefined)).toBe('No due date');
        });

        it('should format date with specific time correctly', () => {
            // Mock a specific date: Jan 12, 2026 3:30 PM
            const date = new Date(2026, 0, 12, 15, 30);
            // Expected: "Mon 12th Jan - 3:30pm"
            // Note: weekday depends on the date. Jan 12 2026 is a Monday.
            expect(formatDueDate(date)).toBe('Mon 12th Jan - 3:30pm');
        });

        it('should format date at midnight without time', () => {
            // Mock a specific date: Jan 12, 2026 00:00
            const date = new Date(2026, 0, 12, 0, 0);
            expect(formatDueDate(date)).toBe('Mon 12th Jan');
        });

        // Property Test
        it('should never throw error for valid dates', () => {
            fc.assert(
                fc.property(fc.date(), (date) => {
                    expect(() => formatDueDate(date)).not.toThrow();
                    const formatted = formatDueDate(date);
                    expect(typeof formatted).toBe('string');
                    expect(formatted.length).toBeGreaterThan(0);
                })
            );
        });
    });
});
