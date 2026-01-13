import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dealsRoutes from './deals.routes';

// Mock Auth Middleware
vi.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', email: 'test@example.com' };
        next();
    },
}));

// Mock Controller
vi.mock('../controllers/deals.controller', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../controllers/deals.controller')>();
    return {
        ...actual,
        dealsController: {
            getDashboardStats: vi.fn((req, res) => res.status(200).json({ stats: {} })),
            analyzePortfolio: vi.fn((req, res) => res.status(200).json({ intelligence: {} })),
            getStages: vi.fn((req, res) => res.status(200).json({ stages: [] })),
            getPipelineDeals: vi.fn((req, res) => res.status(200).json({ pipeline: [] })),
            listDeals: vi.fn((req, res) => res.status(200).json({ deals: [] })),
            bulkDelete: vi.fn((req, res) => res.status(200).json({ success: true })),
            bulkArchive: vi.fn((req, res) => res.status(200).json({ success: true })),
            bulkRestore: vi.fn((req, res) => res.status(200).json({ success: true })),
            createDeal: vi.fn((req, res) => res.status(201).json({ id: 'new-deal' })),
            getDeal: vi.fn((req, res) => res.status(200).json({ deal: {} })),
            updateDeal: vi.fn((req, res) => res.status(200).json({ success: true })),
            updateDealStage: vi.fn((req, res) => res.status(200).json({ success: true })),
            updateConditions: vi.fn((req, res) => res.status(200).json({ success: true })),
            createTask: vi.fn((req, res) => res.status(201).json({ id: 'new-task' })),
            analyzeDeal: vi.fn((req, res) => res.status(200).json({ analysis: {} })),
        }
    };
});

import { dealsController } from '../controllers/deals.controller';

const app = express();
app.use(express.json());
app.use('/api/deals', dealsRoutes);

describe('Deals API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/deals/pipeline/:type', () => {
        it('should route to dealsController.getPipelineDeals', async () => {
            await request(app).get('/api/deals/pipeline/buyer');
            expect(dealsController.getPipelineDeals).toHaveBeenCalled();
        });
    });

    describe('POST /api/deals/bulk-delete', () => {
        it('should route to dealsController.bulkDelete', async () => {
            await request(app)
                .post('/api/deals/bulk-delete')
                .send({ ids: ['1', '2'] });
            expect(dealsController.bulkDelete).toHaveBeenCalled();
        });
    });

    describe('POST /api/deals/bulk-archive', () => {
        it('should route to dealsController.bulkArchive', async () => {
            await request(app)
                .post('/api/deals/bulk-archive')
                .send({ ids: ['1', '2'] });
            expect(dealsController.bulkArchive).toHaveBeenCalled();
        });
    });

    describe('POST /api/deals/bulk-restore', () => {
        it('should route to dealsController.bulkRestore', async () => {
            await request(app)
                .post('/api/deals/bulk-restore')
                .send({ ids: ['1', '2'] });
            expect(dealsController.bulkRestore).toHaveBeenCalled();
        });
    });

    describe('GET /api/deals', () => {
        it('should route to dealsController.listDeals', async () => {
            await request(app).get('/api/deals');
            expect(dealsController.listDeals).toHaveBeenCalled();
        });
    });

    describe('GET /api/deals/portfolio/intelligence', () => {
        it('should route to dealsController.analyzePortfolio', async () => {
            await request(app).get('/api/deals/portfolio/intelligence');
            expect(dealsController.analyzePortfolio).toHaveBeenCalled();
        });
    });
});
