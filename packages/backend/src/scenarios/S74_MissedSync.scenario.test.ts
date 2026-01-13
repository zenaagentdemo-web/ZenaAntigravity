
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';

const mockRequest = (userId: string) => ({
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S74: Calendar Recurring Logic', () => {
    it('should detect missed vendor updates', async () => {
        const userId = 'user-74';
        const res = mockResponse();

        await calendarActionsController.getMissedSyncs(mockRequest(userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.missed[0].contactName).toBe('Jane Vendor');
        expect(data.missed[0].missedEvent).toBe('Weekly Vendor Update');
        console.log("✅ Scenario S74 Passed: Missed Sync verified");
    });
});
