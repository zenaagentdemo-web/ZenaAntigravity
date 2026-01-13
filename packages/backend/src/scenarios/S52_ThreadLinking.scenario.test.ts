
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        thread: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
        contact: { findMany: vi.fn() }
    }
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

describe('Scenario S52: Thread Linking Logic', () => {
    it('should suggest contacts for unlinked threads', async () => {
        const userId = 'user-52';
        const threadId = 'thread-52';
        const res = mockResponse();

        // --- STEP 1: TRIGGER (View thread with unknown participant) ---
        (prisma.thread.findUnique as any).mockResolvedValue({
            id: threadId,
            userId,
            participants: [{ name: 'Unknown Bob', email: 'bob@unknown.com' }]
        });

        // --- STEP 2: REASONING (Suggestions fetched) ---
        (prisma.contact.findMany as any).mockResolvedValue([{ id: 'contact-abc', name: 'Bob Smith' }]);

        await threadsController.getSuggestedContacts(mockRequest({ id: threadId }, {}, userId), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            suggested: expect.arrayContaining([expect.objectContaining({ name: 'Bob Smith' })])
        }));

        // --- STEP 3: EXECUTION (Link contact) ---
        (prisma.thread.findFirst as any).mockResolvedValue({ id: threadId, userId });
        await threadsController.updateThread(mockRequest({ id: threadId }, { contactId: 'contact-abc' }, userId), res);

        expect(prisma.thread.update).toHaveBeenCalled();
        console.log("✅ Scenario S52 Passed: Thread Linking Suggestions verified");
    });
});
