
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

describe('Scenario S68: Proactive CMA Generation', () => {
    it('should generate CMA for upcoming open home', async () => {
        const userId = 'user-68';
        const eventId = 'event-68';
        const res = mockResponse();

        await calendarActionsController.triggerCMA(mockRequest({ id: eventId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.status).toBe('ready');
        expect(data.cmaUrl).toContain('cma-event-68.pdf');
        console.log("✅ Scenario S68 Passed: Proactive CMA verified");
    });
});
