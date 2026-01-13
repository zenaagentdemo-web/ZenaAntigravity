
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        thread: { findMany: vi.fn(), updateMany: vi.fn() }
    }
}));

const mockRequest = (userId: string) => ({
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S65: Inbox Auto-Delete', () => {
    it('should batch archive noise threads', async () => {
        const userId = 'user-65';
        const res = mockResponse();

        (prisma.thread.findMany as any).mockResolvedValue([{ id: 'noise-1' }, { id: 'noise-2' }]);

        await threadsController.autoArchiveSpam(mockRequest(userId), res);

        expect(prisma.thread.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: { in: ['noise-1', 'noise-2'] } },
            data: { category: 'archived' }
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        console.log("✅ Scenario S65 Passed: Auto-Archive verified");
    });
});
