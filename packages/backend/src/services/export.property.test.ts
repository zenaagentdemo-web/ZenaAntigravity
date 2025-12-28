import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { exportService } from './export.service.js';

/**
 * Property-Based Tests for Export Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Export Service - Property-Based Tests', () => {
  // Helper function to create a test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-export-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Export PBT User',
      },
    });
  };

  // Helper function to clean up test user
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.export.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  it('Property 75: Contact export includes all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
            phones: fc.array(fc.string({ minLength: 10, maxLength: 15 }), { maxLength: 2 }),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (contactsData) => {
          const user = await createTestUser();
          try {
            await Promise.all(contactsData.map(data =>
              prisma.contact.create({ data: { userId: user.id, name: data.name, emails: data.emails, phones: data.phones, role: data.role } })
            ));

            const exportId = await exportService.createExport({ userId: user.id, type: 'contacts', format: 'csv' });

            let attempts = 0;
            let exportResult;
            while (attempts < 10) {
              await new Promise(r => setTimeout(r, 100));
              exportResult = await exportService.getExport(exportId, user.id);
              if (exportResult.status === 'completed') break;
              attempts++;
            }

            expect(exportResult?.status).toBe('completed');
            expect(exportResult?.recordCount).toBe(contactsData.length);
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 76: Property export includes all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            address: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (propertiesData) => {
          const user = await createTestUser();
          try {
            await Promise.all(propertiesData.map(data =>
              prisma.property.create({ data: { userId: user.id, address: data.address, milestones: [] } })
            ));

            const exportId = await exportService.createExport({ userId: user.id, type: 'properties', format: 'csv' });

            let attempts = 0;
            let exportResult;
            while (attempts < 10) {
              await new Promise(r => setTimeout(r, 100));
              exportResult = await exportService.getExport(exportId, user.id);
              if (exportResult.status === 'completed') break;
              attempts++;
            }

            expect(exportResult?.status).toBe('completed');
            expect(exportResult?.recordCount).toBe(propertiesData.length);
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 77: Deal export includes all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            stage: fc.constantFrom('lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'),
            riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
            summary: fc.string({ minLength: 20, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (dealsData) => {
          const user = await createTestUser();
          try {
            await Promise.all(dealsData.map(data =>
              prisma.deal.create({ data: { userId: user.id, stage: data.stage, riskLevel: data.riskLevel, summary: data.summary, nextActionOwner: 'agent' } })
            ));

            const exportId = await exportService.createExport({ userId: user.id, type: 'deals', format: 'csv' });

            let attempts = 0;
            let exportResult;
            while (attempts < 10) {
              await new Promise(r => setTimeout(r, 100));
              exportResult = await exportService.getExport(exportId, user.id);
              if (exportResult.status === 'completed') break;
              attempts++;
            }

            expect(exportResult?.status).toBe('completed');
            expect(exportResult?.recordCount).toBe(dealsData.length);
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 79: Selective export only includes selected records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 2 }),
          }),
          { minLength: 3, maxLength: 8 }
        ),
        fc.integer({ min: 1, max: 2 }),
        async (contactsData, selectCount) => {
          const user = await createTestUser();
          try {
            const contacts = await Promise.all(contactsData.map(data =>
              prisma.contact.create({ data: { userId: user.id, name: data.name, emails: data.emails, role: 'buyer' } })
            ));

            const selectedIds = contacts.slice(0, selectCount).map(c => c.id);
            const exportId = await exportService.createExport({ userId: user.id, type: 'contacts', format: 'csv', recordIds: selectedIds });

            let attempts = 0;
            let exportResult;
            while (attempts < 10) {
              await new Promise(r => setTimeout(r, 100));
              exportResult = await exportService.getExport(exportId, user.id);
              if (exportResult.status === 'completed') break;
              attempts++;
            }

            expect(exportResult?.status).toBe('completed');
            expect(exportResult?.recordCount).toBe(selectedIds.length);
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
