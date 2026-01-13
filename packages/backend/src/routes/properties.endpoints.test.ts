import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import propertiesRoutes from './properties.routes';

// Mock Auth Middleware
vi.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', email: 'test@example.com' };
        next();
    },
}));

// Mock Controller
vi.mock('../controllers/properties.controller', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../controllers/properties.controller')>();
    return {
        ...actual,
        propertiesController: {
            listProperties: vi.fn((req, res) => res.status(200).json({ properties: [] })),
            getStats: vi.fn((req, res) => res.status(200).json({ stats: { total: 5 } })),
            createProperty: vi.fn((req, res) => res.status(201).json({ id: 'new-prop' })),
            addMilestone: vi.fn((req, res) => res.status(201).json({ id: 'new-milestone' })),
            getMilestones: vi.fn((req, res) => res.status(200).json({ milestones: [] })),
            updateMilestone: vi.fn((req, res) => res.status(200).json({ success: true })),
            deleteMilestone: vi.fn((req, res) => res.status(200).json({ success: true })),
            getAllSmartMatches: vi.fn((req, res) => res.status(200).json({ matches: [] })),
            getSmartMatches: vi.fn((req, res) => res.status(200).json({ matches: [] })),
            refreshIntelligence: vi.fn((req, res) => res.status(200).json({ success: true })),
            getIntelligence: vi.fn((req, res) => res.status(200).json({ intelligence: {} })),
            generateComparables: vi.fn((req, res) => res.status(200).json({ comparables: [] })),

            // We must implement bind because route uses .bind()
            // vi.fn() has .bind method by default, but we need to ensure the methods exist on the object
        }
    };
});

import { propertiesController } from '../controllers/properties.controller';

const app = express();
app.use(express.json());
app.use('/api/properties', propertiesRoutes);

describe('Properties API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/properties', () => {
        it('should route to propertiesController.listProperties', async () => {
            await request(app).get('/api/properties');
            expect(propertiesController.listProperties).toHaveBeenCalled();
        });
    });

    describe('GET /api/properties/stats', () => {
        it('should route to propertiesController.getStats', async () => {
            await request(app).get('/api/properties/stats');
            expect(propertiesController.getStats).toHaveBeenCalled();
        });
    });

    describe('POST /api/properties', () => {
        it('should route to propertiesController.createProperty', async () => {
            await request(app)
                .post('/api/properties')
                .send({ address: '123 Test St' });
            expect(propertiesController.createProperty).toHaveBeenCalled();
        });
    });

    describe('POST /api/properties/:id/milestones', () => {
        it('should route to propertiesController.addMilestone', async () => {
            await request(app)
                .post('/api/properties/123/milestones')
                .send({ title: 'Open Home', date: '2024-01-01' });

            expect(propertiesController.addMilestone).toHaveBeenCalled();
        });
    });
});
