
import { describe, it, expect, vi } from 'vitest';
import { journeyService } from '../services/journey.service.js';
import { taskService } from '../services/task.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: {
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'prop_101', ...data })),
            findFirst: vi.fn(),
            findMany: vi.fn().mockResolvedValue([{
                id: 'prop_101', address: '45 High St, Auckland', milestones: [
                    { id: 'm1', title: 'Professional Photography', status: 'pending', date: new Date().toISOString() },
                    { id: 'm2', title: 'Listing Copy Approval', status: 'pending', date: new Date().toISOString() },
                    { id: 'm3', title: 'Signage Installed', status: 'pending', date: new Date().toISOString() },
                    { id: 'm4', title: 'Listing Live', status: 'pending', date: new Date().toISOString() },
                    { id: 'm5', title: 'First Open Home', status: 'pending', date: new Date().toISOString() }
                ]
            }])
        },
        contact: {
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'con_101', ...data }))
        },
        timelineEvent: {
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ev_101', ...data }))
        },
        task: {
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'task_101', ...data })),
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn()
        },
        autonomousAction: {
            create: vi.fn()
        }
    }
}));

describe('Scenario S101: New Listing Super-Chain', () => {
    it('should create property, vendor, and 5 milestones in one journey', async () => {
        const userId = 'user_101';
        const result = await journeyService.executeNewListingJourney(userId, {
            address: '45 High St, Auckland',
            vendorName: 'Sarah Miller'
        });

        expect(result.status).toBe('journey_initiated');
        expect(result.milestoneCount).toBe(5);

        // Verify Virtual Tasks exist via TaskService
        const tasks = await taskService.getTasks({ userId, propertyId: result.propertyId });
        expect(tasks.length).toBe(5);
        expect(tasks[0].source).toBe('milestone');

        console.log('✅ Scenario S101 Passed: Super-Chain verified');
    });
});
