import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import timelineRoutes from './timeline.routes';
import propertiesRoutes from './properties.routes';

// Mock Auth Middleware
vi.mock('../middleware/auth.middleware', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', email: 'test@example.com' };
        next();
    },
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id', email: 'test@example.com' };
        next();
    },
}));

// Mock Controllers
vi.mock('../controllers/timeline.controller', () => ({
    getTimeline: vi.fn((req, res) => res.status(200).json({ events: [] })),
    createGeneralEvent: vi.fn((req, res) => res.status(201).json({ id: 'new-event' })),
    createManualNote: vi.fn((req, res) => res.status(201).json({ id: 'new-note' })),
    getEntityTimeline: vi.fn((req, res) => res.status(200).json({ events: [] })),
    updateEvent: vi.fn((req, res) => res.status(200).json({ success: true })),
    deleteEvent: vi.fn((req, res) => res.status(200).json({ success: true })),
}));

vi.mock('../controllers/properties.controller', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../controllers/properties.controller')>();
    return {
        ...actual,
        propertiesController: {
            // ...actual.propertiesController, // Removing spread as it misses prototype methods
            addMilestone: vi.fn((req, res) => res.status(201).json({ id: 'new-milestone' })),
            listProperties: vi.fn((req, res) => res.status(200).json({ properties: [] })),
            getAllSmartMatches: vi.fn((req, res) => res.status(200).json({ matches: [] })),
            // Add other methods that might be bound in routes
            getStats: vi.fn(),
            createProperty: vi.fn(),
            getMilestones: vi.fn(),
            updateMilestone: vi.fn(),
            deleteMilestone: vi.fn(),
            getSmartMatches: vi.fn(),
            refreshIntelligence: vi.fn(),
            getIntelligence: vi.fn(),
            generateComparables: vi.fn(),
            linkVendor: vi.fn(),
            generateReport: vi.fn(),
            bulkDelete: vi.fn(),
            bulkArchive: vi.fn(),
            searchProperties: vi.fn(),
            updateProperty: vi.fn(),
            deleteProperty: vi.fn(),
            updateConditions: vi.fn(),
            getProperty: vi.fn(), // If used
        }
    };
});

import { getTimeline } from '../controllers/timeline.controller';
import { propertiesController } from '../controllers/properties.controller';

const app = express();
app.use(express.json());
app.use('/api/timeline', timelineRoutes);
app.use('/api/properties', propertiesRoutes);

describe('Calendar Related API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Timeline Routes (Calendar Aggregation)', () => {
        it('GET /api/timeline should route to getTimeline', async () => {
            await request(app).get('/api/timeline?entityType=calendar_event');
            expect(getTimeline).toHaveBeenCalled();
        });
    });

    describe('Property Milestones (Calendar "Add Event")', () => {
        it('POST /api/properties/:id/milestones should route to addMilestone', async () => {
            const milestoneData = {
                type: 'open_home',
                date: '2024-01-01T10:00:00Z',
                title: 'Test Open Home'
            };

            await request(app)
                .post('/api/properties/prop-1/milestones')
                .send(milestoneData);

            expect(propertiesController.addMilestone).toHaveBeenCalled();
        });
    });
});
