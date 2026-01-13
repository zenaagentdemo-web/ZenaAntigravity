
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

describe('Scenario S55: Batch Email Compose', () => {
    it('should generate multiple drafts for a batch of contacts', async () => {
        const userId = 'user-55';
        const contactIds = ['c1', 'c2', 'c3'];
        const res = mockResponse();

        await threadsController.batchCompose(mockRequest({}, { contactIds, template: 'Coffee?' }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.count).toBe(3);
        expect(data.drafts[0].body).toContain('Coffee?');
        console.log("✅ Scenario S55 Passed: Batch Compose verified");
    });
});
