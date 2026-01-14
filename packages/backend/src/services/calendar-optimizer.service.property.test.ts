
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CalendarOptimizerService } from './calendar-optimizer.service';
import prisma from '../config/database';
import { geospatialService } from './geospatial.service';
import { askZenaService } from './ask-zena.service';

// Mock dependencies
vi.mock('../config/database', () => ({
    default: {
        property: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        task: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
        timelineEvent: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn(), findFirst: vi.fn() }
    }
}));

vi.mock('./geospatial.service', () => ({
    geospatialService: {
        optimizeSequence: vi.fn(),
        getRouteMetrics: vi.fn()
    }
}));

vi.mock('./ask-zena.service', () => ({
    askZenaService: {
        processQuery: vi.fn()
    }
}));

describe('CalendarOptimizerService Property Tests', () => {
    let service: CalendarOptimizerService;

    beforeEach(() => {
        service = new CalendarOptimizerService();
        vi.clearAllMocks();

        // Setup default mocks
        (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-123' });
        (prisma.property.findMany as any).mockResolvedValue([]);
        (prisma.task.findMany as any).mockResolvedValue([]);
        (prisma.timelineEvent.findMany as any).mockResolvedValue([]);

        // Mock geospatial service to return simple sequence
        (geospatialService.optimizeSequence as any).mockImplementation(async (start, stops) => {
            return {
                sequence: stops.map((_, i) => i),
                totalDistance: 1000 * stops.length,
                totalDuration: 600 * stops.length
            };
        });

        (geospatialService.getRouteMetrics as any).mockResolvedValue({
            distanceMeters: 5000,
            durationSeconds: 300
        });

        (askZenaService.processQuery as any).mockResolvedValue({
            answer: "Optimized schedule looks good."
        });
    });

    it('should not throw ReferenceError for any valid schedule input', async () => {
        // We will mock fetchDailyAppointments to return the generated appointments directly
        // to avoid complex Prisma mocking logic for this specific test

        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        title: fc.string(),
                        time: fc.date(),
                        location: fc.string(),
                        type: fc.constantFrom('meeting', 'viewing', 'appraisal'),
                        source: fc.constant('timeline')
                    }),
                    { minLength: 2, maxLength: 10 } // Need at least 2 for optimization logic to kick in
                ),
                async (appointments) => {
                    // Spy on fetchDailyAppointments to return our generated data
                    const spy = vi.spyOn(service, 'fetchDailyAppointments').mockResolvedValue(appointments);

                    try {
                        const result = await service.optimizeDay('user-123', new Date());

                        // Invariants
                        expect(result).toBeDefined();
                        expect(result.metrics).toBeDefined();
                        expect(typeof result.metrics.drivingTimeSavedMinutes).toBe('number');
                        expect(result.metrics.drivingTimeSavedMinutes).not.toBeNaN();

                    } catch (error: any) {
                        // If it's the ReferenceError we expect, we want to fail the test clearly or 
                        // actually, strictly speaking for "Testing invariants", this test SHOULD fail now.
                        if (error instanceof ReferenceError) {
                            throw new Error(`Caught expected ReferenceError: ${error.message}`);
                        }
                        throw error;
                    } finally {
                        spy.mockRestore();
                    }
                }
            ),
            { numRuns: 10 } // enough to prove the point quickly
        );
    });
});
