
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inboxActionsService } from '../services/inbox-actions.service.js';
import prisma from '../config/database.js';

vi.mock('../services/godmode.service.js', () => ({
    godmodeService: { getFeatureMode: vi.fn().mockResolvedValue('on') }
}));

vi.mock('../services/ask-zena.service.js', () => ({
    askZenaService: { askBrain: vi.fn().mockResolvedValue(JSON.stringify({ hasEvent: true, title: 'Viewing', suggestedDate: '2026-05-01', suggestedTime: '10:00' })) }
}));

vi.mock('../config/database.js', () => ({
    default: {
        thread: { findUnique: vi.fn() }
    }
}));

describe('Scenario S54: Inbox Calendar Sync', () => {
    it('should extract calendar events from email content', async () => {
        const userId = 'user-54';
        const threadId = 'thread-54';

        (prisma.thread.findUnique as any).mockResolvedValue({
            id: threadId,
            subject: 'Viewing request',
            messages: [{ body: 'Can we view the property tomorrow at 10am?' }]
        });

        const suggestion = await inboxActionsService.extractCalendarEvents(threadId, userId);

        expect(suggestion).not.toBeNull();
        expect(suggestion?.actionType).toBe('add_calendar');
        expect(suggestion?.title).toContain('Viewing');
        console.log("✅ Scenario S54 Passed: Inbox-to-Calendar extraction verified");
    });
});
