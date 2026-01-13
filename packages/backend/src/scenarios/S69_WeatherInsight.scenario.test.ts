
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

describe('Scenario S69: Calendar Weather Insight', () => {
    it('should show rain warning for outdoor event', async () => {
        const userId = 'user-69';
        const eventId = 'event-69';
        const res = mockResponse();

        await calendarActionsController.getWeatherInsight(mockRequest({ id: eventId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.forecast).toBe('Rain');
        expect(data.recommendation).toContain('Move outdoor viewing');
        console.log("✅ Scenario S69 Passed: Weather Insight verified");
    });
});
