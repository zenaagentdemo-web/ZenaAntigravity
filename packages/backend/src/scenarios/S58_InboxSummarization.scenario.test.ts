
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';

vi.mock('../services/recap.service.js', () => ({
    recapService: { summarizeThread: vi.fn().mockResolvedValue('Summary: 3 bullet points') }
}));

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

describe('Scenario S58: Inbox Summarization', () => {
    it('should return a thread summary', async () => {
        const userId = 'user-58';
        const threadId = 'thread-58';
        const res = mockResponse();

        await threadsController.summarize(mockRequest({ id: threadId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ summary: 'Summary: 3 bullet points' });
        console.log("✅ Scenario S58 Passed: Inbox Summarization verified");
    });
});
