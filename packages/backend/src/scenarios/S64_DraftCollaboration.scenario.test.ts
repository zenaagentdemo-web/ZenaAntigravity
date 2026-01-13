
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';

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

describe('Scenario S64: Inbox Draft Collaboration', () => {
    it('should record style pattern from edits', async () => {
        const userId = 'user-64';
        const threadId = 'thread-64';
        const res = mockResponse();

        await threadsController.learnStyle(mockRequest({ id: threadId }, { edits: 'Changed Dear to Hi' }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Style pattern recorded' });
        console.log("✅ Scenario S64 Passed: Draft Collaboration verified");
    });
});
