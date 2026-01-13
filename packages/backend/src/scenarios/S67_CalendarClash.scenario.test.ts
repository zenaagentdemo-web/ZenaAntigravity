
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';
import { godmodeService } from '../services/godmode.service.js';

vi.mock('../services/godmode.service.js', () => ({
    godmodeService: { getFeatureMode: vi.fn().mockResolvedValue('on') }
}));

const mockRequest = (body: any, userId: string) => ({
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S67: Calendar Clash Resolution', () => {
    it('should suggest alternative slot for clashing events', async () => {
        const userId = 'user-67';
        const res = mockResponse();

        await calendarActionsController.resolveConflicts(mockRequest({ date: '2026-01-13' }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.resolutions[0].conflictId).toBe('conf-1');
        expect(data.resolutions[0].alternativeSlot.time).toBe('16:00');
        console.log("✅ Scenario S67 Passed: Clash Resolution verified");
    });
});
