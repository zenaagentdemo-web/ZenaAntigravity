import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { groupConversationsByDate } from './dateGrouping';
import { Conversation } from '../components/AskZena';

describe('groupConversationsByDate Property Tests', () => {
    it('should maintain the total number of conversations', () => {
        const now = new Date('2025-12-21T12:00:00Z');
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        title: fc.string(),
                        updatedAt: fc.date()
                    })
                ),
                (conversations) => {
                    const grouped = groupConversationsByDate(conversations as Conversation[], now);
                    const totalGrouped = grouped.reduce((sum, g) => sum + g.conversations.length, 0);
                    return totalGrouped === conversations.length;
                }
            )
        );
    });

    it('should correctly categorize based on date ranges', () => {
        const now = new Date('2025-12-21T12:00:00Z'); // A Sunday

        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        title: fc.string(),
                        updatedAt: fc.date()
                    })
                ),
                (conversations) => {
                    const grouped = groupConversationsByDate(conversations as Conversation[], now);

                    // Basic check: verify that "Today" contains today's dates
                    const todayGroup = grouped.find(g => g.label.startsWith('Today'));
                    if (todayGroup) {
                        const allToday = todayGroup.conversations.every(c =>
                            new Date(c.updatedAt).toDateString() === now.toDateString()
                        );
                        if (!allToday) return false;
                    }

                    // Verify "Last Week" (7-14 days old) labels
                    const lastWeekGroup = grouped.find(g => g.label === 'Last Week');
                    if (lastWeekGroup) {
                        const allLastWeek = lastWeekGroup.conversations.every(c => {
                            const diff = now.getTime() - new Date(c.updatedAt).getTime();
                            const days = diff / (1000 * 60 * 60 * 24);
                            return days >= 7 && days < 14;
                        });
                        if (!allLastWeek) return false;
                    }

                    return true;
                }
            )
        );
    });
});
