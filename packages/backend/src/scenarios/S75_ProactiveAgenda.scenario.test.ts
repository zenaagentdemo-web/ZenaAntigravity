
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

describe('Scenario S75: Calendar Proactive Agenda', () => {
    it('should generate focus blocks for morning agenda', async () => {
        const userId = 'user-75';
        const res = mockResponse();

        await calendarActionsController.getProactiveAgenda(mockRequest(userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.focusBlocks.length).toBeGreaterThan(0);
        expect(data.greeting).toContain('Focus mode active');
        console.log("✅ Scenario S75 Passed: Proactive Agenda verified");
    });
});
