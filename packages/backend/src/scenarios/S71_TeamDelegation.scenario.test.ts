
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';

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

describe('Scenario S71: Calendar Team Delegation', () => {
    it('should delegate viewing to assistant', async () => {
        const userId = 'user-71';
        const eventId = 'event-71';
        const res = mockResponse();

        await calendarActionsController.delegateViewing(mockRequest({ id: eventId }, { delegateId: 'assistant-1' }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.status).toBe('delegated');
        expect(data.delegateId).toBe('assistant-1');
        console.log("✅ Scenario S71 Passed: Team Delegation verified");
    });
});
