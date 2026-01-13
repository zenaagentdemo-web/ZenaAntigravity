
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

describe('Scenario S72: Calendar Waitlist Auto-Invite', () => {
    it('should suggest waitlist lead for cancelled viewing', async () => {
        const userId = 'user-72';
        const eventId = 'event-72';
        const res = mockResponse();

        await calendarActionsController.getWaitlistSuggestion(mockRequest({ id: eventId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.suggestedContact.name).toBe('Bob Waitlist');
        console.log("✅ Scenario S72 Passed: Waitlist Invite verified");
    });
});
