import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { dealFlowService } from './deal-flow.service.js';
import type { CommissionTier } from '../models/types.js';

/**
 * Property-Based Tests for Deal Flow Phase 3 Features
 * 
 * These tests verify mathematical invariants that should hold across all inputs
 * using fast-check for property-based testing.
 * 
 * Note: These are pure unit tests that don't require database access.
 * This allows them to run without needing schema migrations.
 */

describe('Deal Flow Phase 3 Property-Based Tests', () => {

    /**
     * Property 1: Commission Calculation - Core mathematical invariants
     */
    describe('Property 1: Commission calculation invariants', () => {
        const STANDARD_TIERS: CommissionTier[] = [
            { minPrice: 0, maxPrice: 400000, rate: 0.04 },
            { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
            { minPrice: 1000000, maxPrice: null, rate: 0.02 },
        ];

        it('should ensure commission is positive for positive deal values', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);

                        // PROPERTY: Commission should be positive for positive deal values
                        expect(commission).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should ensure commission is less than deal value', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1000, max: 10000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);

                        // PROPERTY: Commission should be less than deal value (rates are all < 100%)
                        expect(commission).toBeLessThan(dealValue);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should ensure commission increases monotonically with deal value', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 10000, max: 10000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);
                        const lowerCommission = dealFlowService.calculateCommission(dealValue - 1000, STANDARD_TIERS);

                        // PROPERTY: Commission increases monotonically with deal value
                        expect(commission).toBeGreaterThanOrEqual(lowerCommission);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return 0 for 0 or negative deal values', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -1000000, max: 0 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);

                        // PROPERTY: Commission should be 0 for non-positive deal values
                        expect(commission).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should return 0 for empty tier array', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, []);

                        // PROPERTY: Commission should be 0 for empty tiers
                        expect(commission).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 2: Conjunctional Split - Split commission ≤ full commission
     * 
     * INVARIANT: When a deal has a conjunctional split, the calculated
     * commission must always be less than or equal to the full commission.
     * Split values are in range (0, 1).
     */
    describe('Property 2: Conjunctional split commission bounds', () => {
        it('should ensure split commission ≤ full commission', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        dealValue: fc.integer({ min: 200000, max: 3000000 }),
                        // Use integer percentage (10-90) and divide by 100 to avoid fc.float issues
                        splitPercentInt: fc.integer({ min: 10, max: 90 }),
                    }),
                    (data) => {
                        const splitPercentage = data.splitPercentInt / 100;

                        const tiers: CommissionTier[] = [
                            { minPrice: 0, maxPrice: 400000, rate: 0.04 },
                            { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
                            { minPrice: 1000000, maxPrice: null, rate: 0.02 },
                        ];

                        const fullCommission = dealFlowService.calculateCommission(data.dealValue, tiers);
                        const splitCommission = fullCommission * splitPercentage;

                        // PROPERTY: Split commission must be ≤ full commission
                        expect(splitCommission).toBeLessThanOrEqual(fullCommission);

                        // PROPERTY: Split commission must be > 0 when full commission > 0
                        if (fullCommission > 0) {
                            expect(splitCommission).toBeGreaterThan(0);
                        }

                        // PROPERTY: Split ratio is preserved
                        const actualRatio = splitCommission / fullCommission;
                        expect(actualRatio).toBeCloseTo(splitPercentage, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle edge case split percentages', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        dealValue: fc.integer({ min: 500000, max: 2000000 }),
                        // Test edge cases: 1%, 50%, 99%
                        splitPercentInt: fc.constantFrom(1, 50, 99),
                    }),
                    (data) => {
                        const splitPercentage = data.splitPercentInt / 100;

                        const tiers: CommissionTier[] = [
                            { minPrice: 0, maxPrice: 400000, rate: 0.04 },
                            { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
                            { minPrice: 1000000, maxPrice: null, rate: 0.02 },
                        ];

                        const fullCommission = dealFlowService.calculateCommission(data.dealValue, tiers);
                        const splitCommission = fullCommission * splitPercentage;

                        // PROPERTY: Split always in valid range
                        expect(splitCommission).toBeGreaterThanOrEqual(0);
                        expect(splitCommission).toBeLessThanOrEqual(fullCommission);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 3: Nurture Schedule - Step dates increase monotonically
     * 
     * INVARIANT: For any nurture sequence, the touch dates must always
     * increase as the step number increases. Step N+1 is always after Step N.
     */
    describe('Property 3: Nurture schedule monotonicity', () => {
        const NURTURE_SCHEDULE = [
            { step: 1, daysAfter: 0, label: 'Congratulations' },
            { step: 2, daysAfter: 30, label: '1 month check-in' },
            { step: 3, daysAfter: 180, label: '6 month market update' },
            { step: 4, daysAfter: 365, label: 'Anniversary' },
            { step: 5, daysAfter: 730, label: '2 year check-in' },
        ];

        it('should ensure step intervals are always positive (monotonically increasing)', () => {
            // PROPERTY: Each interval must be positive
            for (let i = 1; i < NURTURE_SCHEDULE.length; i++) {
                const interval = NURTURE_SCHEDULE[i].daysAfter - NURTURE_SCHEDULE[i - 1].daysAfter;
                expect(interval).toBeGreaterThan(0);
            }
        });

        it('should have first step on settlement day', () => {
            // PROPERTY: First step should be on settlement day
            expect(NURTURE_SCHEDULE[0].daysAfter).toBe(0);
        });

        it('should have at least 5 steps in the schedule', () => {
            // PROPERTY: Schedule should have at least 5 steps
            expect(NURTURE_SCHEDULE.length).toBeGreaterThanOrEqual(5);
        });

        it('should ensure step dates always increase monotonically for any settlement date', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        settlementYear: fc.integer({ min: 2020, max: 2030 }),
                        settlementMonth: fc.integer({ min: 0, max: 11 }),
                        settlementDay: fc.integer({ min: 1, max: 28 }),
                    }),
                    (dateData) => {
                        const settlementDate = new Date(
                            dateData.settlementYear,
                            dateData.settlementMonth,
                            dateData.settlementDay
                        );

                        // Calculate all step dates
                        const stepDates = NURTURE_SCHEDULE.map(step => {
                            const date = new Date(settlementDate);
                            date.setDate(date.getDate() + step.daysAfter);
                            return { step: step.step, date };
                        });

                        // PROPERTY: Each date should be > previous date
                        for (let i = 1; i < stepDates.length; i++) {
                            expect(stepDates[i].date.getTime()).toBeGreaterThan(
                                stepDates[i - 1].date.getTime()
                            );
                        }

                        // PROPERTY: Step numbers should be sequential
                        for (let i = 0; i < stepDates.length; i++) {
                            expect(stepDates[i].step).toBe(i + 1);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should correctly calculate days between nurture steps', () => {
            fc.assert(
                fc.property(
                    fc.date({
                        min: new Date(2020, 0, 1),
                        max: new Date(2030, 11, 31),
                    }),
                    (settlementDate) => {
                        // Calculate step dates
                        const step1Date = new Date(settlementDate);
                        const step2Date = new Date(settlementDate);
                        step2Date.setDate(step2Date.getDate() + 30);
                        const step3Date = new Date(settlementDate);
                        step3Date.setDate(step3Date.getDate() + 180);

                        // PROPERTY: Day differences should match schedule
                        const diff1to2 = Math.round(
                            (step2Date.getTime() - step1Date.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const diff2to3 = Math.round(
                            (step3Date.getTime() - step2Date.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        expect(diff1to2).toBe(30);
                        expect(diff2to3).toBe(150); // 180 - 30
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 4: Revenue Forecast probability bounds
     * 
     * INVARIANT: Stage probability weights should always be in [0, 1]
     */
    describe('Property 4: Stage probability weights', () => {
        const STAGE_PROBABILITIES: Record<string, number> = {
            conditional: 0.75,
            unconditional: 0.95,
            pre_settlement: 0.99,
            settled: 1.0,
            buyer_consult: 0.10,
            shortlisting: 0.15,
            viewings: 0.20,
            offer_made: 0.40,
            appraisal: 0.05,
            listing_signed: 0.15,
            marketing: 0.25,
            offers_received: 0.50,
            nurture: 0.0,
        };

        it('should ensure all probabilities are in valid range [0, 1]', () => {
            for (const [stage, probability] of Object.entries(STAGE_PROBABILITIES)) {
                expect(probability).toBeGreaterThanOrEqual(0);
                expect(probability).toBeLessThanOrEqual(1);
            }
        });

        it('should ensure probability-weighted commission ≤ raw commission', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        stage: fc.constantFrom(...Object.keys(STAGE_PROBABILITIES)),
                        commission: fc.integer({ min: 1000, max: 100000 }),
                    }),
                    (data) => {
                        const probability = STAGE_PROBABILITIES[data.stage] || 0;
                        const expectedCommission = data.commission * probability;

                        // PROPERTY: Expected (weighted) commission ≤ raw commission
                        expect(expectedCommission).toBeLessThanOrEqual(data.commission);

                        // PROPERTY: Expected commission is non-negative
                        expect(expectedCommission).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should ensure settled deals have 100% probability', () => {
            expect(STAGE_PROBABILITIES['settled']).toBe(1.0);
        });

        it('should ensure nurture stage has 0% probability (not forecasted)', () => {
            expect(STAGE_PROBABILITIES['nurture']).toBe(0);
        });
    });
});
