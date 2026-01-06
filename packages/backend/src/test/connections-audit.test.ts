import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import * as fc from 'fast-check';

describe('Connections Audit & Test Suite', () => {

    describe('Endpoint Tests', () => {
        it('GET /api/connections should return the full list of connections', async () => {
            const response = await request(app)
                .get('/api/connections')
                .set('Authorization', 'Bearer demo-token'); // Assuming authMiddleware handles this

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.connections)).toBe(true);

            // Verify core connections exist
            const ids = response.body.connections.map((c: any) => c.id);
            expect(ids).toContain('oneroof');
            expect(ids).toContain('mri_vault');
            expect(ids).toContain('reinz');
        });

        it('POST /api/connections/:id/toggle should return success', async () => {
            const response = await request(app)
                .post('/api/connections/oneroof/toggle')
                .set('Authorization', 'Bearer demo-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.id).toBe('oneroof');
        });

        it('POST /api/connections/capture-session should store a custom session', async () => {
            const mockSession = {
                domain: 'test-portal.com',
                pageUrl: 'https://test-portal.com/login',
                pageTitle: 'Test Login',
                cookies: [{ name: 'session', value: '123' }],
                capturedAt: new Date().toISOString()
            };

            const response = await request(app)
                .post('/api/connections/capture-session')
                .send(mockSession);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.domain).toBe('test-portal.com');
        });
    });

    describe('Property-Based Tests (Reliability)', () => {
        it('should handle any domain string in capture-session', async () => {
            await fc.assert(
                fc.asyncProperty(fc.domain(), async (domain) => {
                    const mockSession = {
                        domain,
                        pageUrl: `https://${domain}/login`,
                        pageTitle: 'Dynamic Test',
                        cookies: [{ name: 'test', value: 'val' }],
                        capturedAt: new Date().toISOString()
                    };

                    const response = await request(app)
                        .post('/api/connections/capture-session')
                        .send(mockSession);

                    return response.status === 200 && response.body.success === true;
                }),
                { numRuns: 20 }
            );
        });

        it('should return 400 if metadata is missing in capture-session', async () => {
            const response = await request(app)
                .post('/api/connections/capture-session')
                .send({ cookies: [] }); // Missing domain

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
