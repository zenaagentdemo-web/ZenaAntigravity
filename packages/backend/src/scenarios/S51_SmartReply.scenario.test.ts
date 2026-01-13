
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import { aiProcessingService } from '../services/ai-processing.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        thread: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        message: { findMany: vi.fn() },
        timelineEvent: { create: vi.fn() }
    }
}));

vi.mock('../services/ai-processing.service.js', () => ({
    aiProcessingService: { processThread: vi.fn() }
}));

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

describe('Scenario S51: Smart Reply Loop', () => {
    it('should generate a draft during classification and send it upon request', async () => {
        const threadId = 'thread-51';
        const userId = 'user-51';
        const res = mockResponse();

        // --- STEP 1: TRIGGER (Classify) ---
        (prisma.thread.findFirst as any).mockResolvedValue({ id: threadId, userId });
        (prisma.thread.findUnique as any).mockResolvedValue({ id: threadId, draftResponse: 'AI Draft Reply' });

        await threadsController.classifyThread(mockRequest({ id: threadId }, {}, userId), res);

        // --- STEP 2: REASONING (Draft Generated via processThread side effect) ---
        expect(aiProcessingService.processThread).toHaveBeenCalledWith(threadId);

        // --- STEP 3: EXECUTION (Send Reply using draft) ---
        (prisma.thread.findFirst as any).mockResolvedValue({ id: threadId, userId, subject: 'Inquiry', draftResponse: 'AI Draft Reply' });

        await threadsController.replyToThread(mockRequest({ id: threadId }, { useDraft: true }, userId), res);

        expect(prisma.thread.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: threadId },
            data: expect.objectContaining({ lastReplyAt: expect.any(Date) })
        }));
        console.log("✅ Scenario S51 Passed: Smart Reply loop verified");
    });
});
