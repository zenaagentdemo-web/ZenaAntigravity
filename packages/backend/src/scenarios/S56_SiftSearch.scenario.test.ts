
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

describe('Scenario S56: Inbox Sift Search', () => {
    it('should filter threads by urgent keywords', async () => {
        const userId = 'user-56';
        const res = mockResponse();

        await threadsController.listThreads(mockRequest({ q: 'urgent' }, userId), res);

        expect(prisma.thread.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                riskLevel: expect.objectContaining({ in: ['high', 'critical'] })
            })
        }));
        console.log("✅ Scenario S56 Passed: Sift Search verified");
    });
});
