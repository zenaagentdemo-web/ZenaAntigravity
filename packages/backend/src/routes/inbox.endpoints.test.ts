import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import threadsRoutes from './threads.routes';

// Mock Auth Middleware
vi.mock('../middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', email: 'test@example.com' };
        next();
    }
}));

// Mock Threads Controller
vi.mock('../controllers/threads.controller', () => ({
    threadsController: {
        getStatistics: vi.fn((req, res) => res.status(200).json({ new: 5, awaiting: 2 })),
        listThreads: vi.fn((req, res) => res.status(200).json({ threads: [] })),
        getThread: vi.fn((req, res) => res.status(200).json({ id: req.params.id })),
        getMessages: vi.fn((req, res) => res.status(200).json({ messages: [] })),
        updateThread: vi.fn((req, res) => res.status(200).json({ success: true })),
        replyToThread: vi.fn((req, res) => res.status(201).json({ success: true })),
        snoozeThread: vi.fn((req, res) => res.status(200).json({ success: true })),
        regenerateDraft: vi.fn((req, res) => res.status(200).json({ draft: 'New draft' })),
        classifyThread: vi.fn((req, res) => res.status(200).json({ category: 'urgent' })),
        extractEntities: vi.fn((req, res) => res.status(200).json({ entities: [] })),
        classifyBatch: vi.fn((req, res) => res.status(200).json({ success: true })),
        extractEntitiesBatch: vi.fn((req, res) => res.status(200).json({ success: true })),
        classifyUnclassified: vi.fn((req, res) => res.status(200).json({ processed: 5 })),
    }
}));

import { threadsController } from '../controllers/threads.controller';

const app = express();
app.use(express.json());
app.use('/api/threads', threadsRoutes);

describe('Inbox/Threads API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET /api/threads should return list of threads', async () => {
        const res = await request(app).get('/api/threads?limit=10');
        expect(res.status).toBe(200);
        expect(threadsController.listThreads).toHaveBeenCalled();
    });

    it('GET /api/threads/:id should return thread details', async () => {
        const res = await request(app).get('/api/threads/thread-123');
        expect(res.status).toBe(200);
        expect(res.body.id).toBe('thread-123');
        expect(threadsController.getThread).toHaveBeenCalled();
    });

    it('POST /api/threads/:id/reply should send reply', async () => {
        const replyData = { content: 'Hello', to: ['test@example.com'] };
        const res = await request(app).post('/api/threads/thread-123/reply').send(replyData);
        expect(res.status).toBe(201);
        expect(threadsController.replyToThread).toHaveBeenCalled();
    });

    it('POST /api/threads/:id/snooze should snooze thread', async () => {
        const snoozeData = { until: '2024-01-02T10:00:00Z' };
        const res = await request(app).post('/api/threads/thread-123/snooze').send(snoozeData);
        expect(res.status).toBe(200);
        expect(threadsController.snoozeThread).toHaveBeenCalled();
    });

    it('GET /api/threads/statistics should return stats', async () => {
        const res = await request(app).get('/api/threads/statistics');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ new: 5, awaiting: 2 });
    });
});
