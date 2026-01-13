
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';

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

describe('Scenario S61: Inbox Attachment Scrape', () => {
    it('should identify invoices in attachments', async () => {
        const userId = 'user-61';
        const threadId = 'thread-61';
        const res = mockResponse();

        await threadsController.scrapeAttachments(mockRequest({ id: threadId }, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.attachments[0].type).toBe('invoice');
        console.log("✅ Scenario S61 Passed: Attachment Scraping verified");
    });
});
