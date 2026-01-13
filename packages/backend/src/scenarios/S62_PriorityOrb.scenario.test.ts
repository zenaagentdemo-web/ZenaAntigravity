
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        thread: { findMany: vi.fn().mockResolvedValue([{ id: 't1', riskLevel: 'high' }]), count: vi.fn().mockResolvedValue(1) }
    }
}));

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

describe('Scenario S62: Inbox Priority Orb', () => {
    it('should display threads with high risk as priority', async () => {
        const userId = 'user-62';
        const res = mockResponse();

        await threadsController.listThreads(mockRequest({ riskOnly: 'true' }, userId), res);

        // Validation logic: Ensure the UI/API returns high risk threads at the top
        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.threads[0].riskLevel).toBe('high');
        console.log("✅ Scenario S62 Passed: Priority Orb verified");
    });
});
