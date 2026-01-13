
import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import contactsRoutes from './contacts.routes';
import { contactsController } from '../controllers/contacts.controller';

// Mock Auth Middleware
vi.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req, res, next) => {
        req.user = { id: 'test-user', role: 'admin' };
        next();
    }
}));

// Mock Controller Instance
// We spy on the methods of the *real* instance or replace the instance?
// Replacing the instance in the module export is best.
vi.mock('../controllers/contacts.controller', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../controllers/contacts.controller')>();
    return {
        ...actual,
        contactsController: {
            listContacts: vi.fn((req, res) => res.status(200).json({ contacts: [] })),
            createContact: vi.fn((req, res) => res.status(201).json({ contact: { id: '123' } })),
            getContact: vi.fn(),
            updateContact: vi.fn(),
            deleteContact: vi.fn(),
            bulkDeleteContacts: vi.fn(),
            bulkUpdateContacts: vi.fn(),
            addNote: vi.fn(),
            recategorizeContact: vi.fn(),
            recategorizeAll: vi.fn(),
            getContactEngagement: vi.fn(),
            getBatchEngagement: vi.fn(),
            runDiscovery: vi.fn(),
            analyzeContact: vi.fn(),
            getPortfolioIntelligence: vi.fn(),
            getNurtureScore: vi.fn(),
            getBatchNurtureScores: vi.fn(),
        }
    };
});

const app = express();
app.use(express.json());
app.use('/api/contacts', contactsRoutes);

describe('Contacts Routes Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/contacts', () => {
        it('should route to listContacts controller', async () => {
            const res = await request(app).get('/api/contacts');
            expect(res.status).toBe(200);
            expect(contactsController.listContacts).toHaveBeenCalled();
        });

        it('should pass query params', async () => {
            await request(app).get('/api/contacts?role=buyer&limit=10');
            expect(contactsController.listContacts).toHaveBeenCalled();
            // In a real unit test of the controller, we'd check args. 
            // Here we just verify routing matches.
        });
    });

    describe('POST /api/contacts', () => {
        it('should route to createContact controller', async () => {
            const res = await request(app)
                .post('/api/contacts')
                .send({ name: 'New Contact', email: 'test@test.com' });

            expect(res.status).toBe(201);
            expect(contactsController.createContact).toHaveBeenCalled();
        });
    });
});
