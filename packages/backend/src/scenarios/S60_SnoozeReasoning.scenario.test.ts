
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        thread: { update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ snoozedUntil: data.snoozedUntil })) }
    }
}));

const mockRequest = (params: any, body: any, userId: string) => ({
    params,
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S60: Inbox Snooze Reasoning', () => {
    it('should calculate snooze duration based on context', async () => {
        const userId = 'user-60';
        const threadId = 'thread-60';
        const res = mockResponse();

        await threadsController.snoozeWithContext(mockRequest({ id: threadId }, { context: 'Remind me in the office' }, userId), res);

        expect(prisma.thread.update).toHaveBeenCalled();
        const call = (prisma.thread.update as any).mock.calls[0][0];
        const snoozeDate = call.data.snoozedUntil;
        const now = new Date();
        // Should be ~1 hour from now
        expect(snoozeDate.getTime()).toBeGreaterThan(now.getTime());
        expect(snoozeDate.getTime()).toBeLessThan(now.getTime() + 3700000);
        console.log("✅ Scenario S60 Passed: Snooze Reasoning verified");
    });
});
