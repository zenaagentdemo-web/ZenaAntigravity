
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';

const mockRequest = (query: any, userId: string) => ({
    query,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S70: Calendar Travel Time', () => {
    it('should detect travel risk for tight gaps', async () => {
        const userId = 'user-70';
        const res = mockResponse();

        await calendarActionsController.getTravelRisk(mockRequest({ date: '2026-01-13' }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.risks[0].risk).toBe('high');
        expect(data.risks[0].warning).toContain('Insufficient travel time');
        console.log("✅ Scenario S70 Passed: Travel Time verified");
    });
});
