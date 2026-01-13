
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';

const mockRequest = (params: any, userId: string) => ({
    params,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S66: Calendar Open Home Feedback', () => {
    it('should analyze feedback after finishing open home', async () => {
        const userId = 'user-66';
        const eventId = 'event-66';
        const res = mockResponse();

        await calendarActionsController.finishEvent(mockRequest({ id: eventId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.suggestions[0].suggestion).toBe('Move to High Intent');
        console.log("✅ Scenario S66 Passed: Open Home Feedback verified");
    });
});
