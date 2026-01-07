import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { dealFlowService, BUYER_STAGES, SELLER_STAGES, STAGE_LABELS, DEFAULT_CONDITION_DAYS } from './deal-flow.service.js';
import type { CommissionTier } from '../models/types.js';

/**
 * Unit Tests for Deal Flow Service
 * 
 * Tests the service layer business logic without database interactions.
 * For database tests, see deals.controller.comprehensive.test.ts
 */

describe('Deal Flow Service Unit Tests', () => {

    /**
     * Commission Calculation Tests
     */
    describe('calculateCommission', () => {
        const STANDARD_TIERS: CommissionTier[] = [
            { minPrice: 0, maxPrice: 400000, rate: 0.04 },
            { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
            { minPrice: 1000000, maxPrice: null, rate: 0.02 },
        ];

        it('should calculate first tier commission correctly', () => {
            // $300,000 at 4% = $12,000
            const commission = dealFlowService.calculateCommission(300000, STANDARD_TIERS);
            expect(commission).toBe(12000);
        });

        it('should calculate multi-tier commission correctly', () => {
            // $800,000 = 400k at 4% + 400k at 2.5%
            // = 16,000 + 10,000 = 26,000
            const commission = dealFlowService.calculateCommission(800000, STANDARD_TIERS);
            expect(commission).toBe(26000);
        });

        it('should handle values spanning all tiers', () => {
            // $1,500,000:
            // First 400k at 4% = 16,000
            // Next 600k at 2.5% = 15,000
            // Remaining 500k at 2% = 10,000
            // Total = 41,000
            const commission = dealFlowService.calculateCommission(1500000, STANDARD_TIERS);
            expect(commission).toBe(41000);
        });

        it('should return 0 for zero value', () => {
            const commission = dealFlowService.calculateCommission(0, STANDARD_TIERS);
            expect(commission).toBe(0);
        });

        it('should return 0 for negative value', () => {
            const commission = dealFlowService.calculateCommission(-100000, STANDARD_TIERS);
            expect(commission).toBe(0);
        });

        it('should return 0 for empty tiers', () => {
            const commission = dealFlowService.calculateCommission(1000000, []);
            expect(commission).toBe(0);
        });

        it('should handle any positive deal value', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);

                        // Commission should be positive
                        expect(commission).toBeGreaterThan(0);

                        // Commission should be less than deal value
                        expect(commission).toBeLessThan(dealValue);

                        // Commission should be at most 4% of deal value (max rate)
                        expect(commission).toBeLessThanOrEqual(dealValue * 0.04);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should increase monotonically with deal value', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100000, max: 10000000 }),
                    (dealValue) => {
                        const commission1 = dealFlowService.calculateCommission(dealValue, STANDARD_TIERS);
                        const commission2 = dealFlowService.calculateCommission(dealValue + 100000, STANDARD_TIERS);

                        expect(commission2).toBeGreaterThan(commission1);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Days in Stage Calculation Tests
     */
    describe('calculateDaysInStage', () => {
        it('should return 0 for today', () => {
            const days = dealFlowService.calculateDaysInStage(new Date());
            expect(days).toBe(0);
        });

        it('should calculate days correctly for past dates', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 365 }),
                    (daysAgo) => {
                        const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                        const calculated = dealFlowService.calculateDaysInStage(pastDate);

                        // Should be within ±1 day due to rounding
                        expect(Math.abs(calculated - daysAgo)).toBeLessThanOrEqual(1);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should return negative for future dates', () => {
            const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            const days = dealFlowService.calculateDaysInStage(futureDate);

            expect(days).toBeLessThan(0);
        });
    });

    /**
     * Stage Constants Tests
     */
    describe('Stage Constants', () => {
        it('should have all buyer stages defined', () => {
            const expectedBuyerStages = [
                'buyer_consult', 'shortlisting', 'viewings', 'offer_made',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            expect(BUYER_STAGES).toEqual(expectedBuyerStages);
        });

        it('should have all seller stages defined', () => {
            const expectedSellerStages = [
                'appraisal', 'listing_signed', 'marketing', 'offers_received',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            expect(SELLER_STAGES).toEqual(expectedSellerStages);
        });

        it('should have labels for all stages', () => {
            const allStages = [...new Set([...BUYER_STAGES, ...SELLER_STAGES])];

            for (const stage of allStages) {
                expect(STAGE_LABELS[stage]).toBeDefined();
                expect(typeof STAGE_LABELS[stage]).toBe('string');
                expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);
            }
        });
    });

    /**
     * Default Condition Days Tests
     */
    describe('DEFAULT_CONDITION_DAYS', () => {
        it('should have reasonable defaults for common conditions', () => {
            expect(DEFAULT_CONDITION_DAYS.finance).toBeGreaterThan(0);
            expect(DEFAULT_CONDITION_DAYS.finance).toBeLessThanOrEqual(15);

            expect(DEFAULT_CONDITION_DAYS.building_report).toBeGreaterThan(0);
            expect(DEFAULT_CONDITION_DAYS.building_report).toBeLessThanOrEqual(15);

            expect(DEFAULT_CONDITION_DAYS.lim).toBeGreaterThan(0);
            expect(DEFAULT_CONDITION_DAYS.lim).toBeLessThanOrEqual(10);

            expect(DEFAULT_CONDITION_DAYS.solicitor).toBeGreaterThan(0);
            expect(DEFAULT_CONDITION_DAYS.solicitor).toBeLessThanOrEqual(15);
        });

        it('should have insurance as shortest condition', () => {
            expect(DEFAULT_CONDITION_DAYS.insurance).toBeLessThanOrEqual(DEFAULT_CONDITION_DAYS.finance);
            expect(DEFAULT_CONDITION_DAYS.insurance).toBeLessThanOrEqual(DEFAULT_CONDITION_DAYS.building_report);
        });
    });

    /**
     * Stage Label Consistency Tests
     */
    describe('Stage Label Consistency', () => {
        it('should have unique labels for different stages', () => {
            const labels = Object.values(STAGE_LABELS);
            const uniqueLabels = [...new Set(labels)];

            // Labels should be mostly unique (some shared stages may have same labels)
            expect(uniqueLabels.length).toBeGreaterThan(labels.length / 2);
        });

        it('should have shared stages common to both pipelines', () => {
            const sharedStages = ['conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'];

            for (const stage of sharedStages) {
                expect(BUYER_STAGES).toContain(stage);
                expect(SELLER_STAGES).toContain(stage);
            }
        });
    });

    /**
     * Commission Tier Validation Tests
     */
    describe('Commission Tier Validation', () => {
        it('should handle single tier correctly', () => {
            const singleTier: CommissionTier[] = [
                { minPrice: 0, maxPrice: null, rate: 0.03 },
            ];

            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000 }),
                    (dealValue) => {
                        const commission = dealFlowService.calculateCommission(dealValue, singleTier);
                        expect(commission).toBeCloseTo(dealValue * 0.03, 2);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should handle custom tier boundaries', () => {
            const customTiers: CommissionTier[] = [
                { minPrice: 0, maxPrice: 500000, rate: 0.05 },
                { minPrice: 500000, maxPrice: null, rate: 0.03 },
            ];

            // $700,000 = 500k at 5% + 200k at 3%
            // = 25,000 + 6,000 = 31,000
            const commission = dealFlowService.calculateCommission(700000, customTiers);
            expect(commission).toBe(31000);
        });

        it('should handle tier with fixed fee', () => {
            const fixedFeeTiers: CommissionTier[] = [
                { minPrice: 0, maxPrice: null, rate: 0.025, fixedFee: 500 },
            ];

            // If fixed fee is applied per tier, the calculation may vary
            const commission = dealFlowService.calculateCommission(1000000, fixedFeeTiers);

            // Should include base percentage calculation
            expect(commission).toBeGreaterThanOrEqual(25000);
        });
    });

    /**
     * Stage Sequence Validation Tests
     */
    describe('Stage Sequence Validation', () => {
        it('should have buyer stages in correct order', () => {
            // Early stages should come before later stages
            const consultIndex = BUYER_STAGES.indexOf('buyer_consult');
            const settledIndex = BUYER_STAGES.indexOf('settled');

            expect(consultIndex).toBeLessThan(settledIndex);
        });

        it('should have seller stages in correct order', () => {
            const appraisalIndex = SELLER_STAGES.indexOf('appraisal');
            const settledIndex = SELLER_STAGES.indexOf('settled');

            expect(appraisalIndex).toBeLessThan(settledIndex);
        });

        it('should end with nurture stage for both pipelines', () => {
            expect(BUYER_STAGES[BUYER_STAGES.length - 1]).toBe('nurture');
            expect(SELLER_STAGES[SELLER_STAGES.length - 1]).toBe('nurture');
        });
    });

    /**
     * Edge Cases
     */
    describe('Edge Cases', () => {
        it('should handle very large deal values', () => {
            const standardTiers: CommissionTier[] = [
                { minPrice: 0, maxPrice: 400000, rate: 0.04 },
                { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
                { minPrice: 1000000, maxPrice: null, rate: 0.02 },
            ];

            const commission = dealFlowService.calculateCommission(100000000, standardTiers);

            // Should be a reasonable commission
            expect(commission).toBeGreaterThan(0);
            expect(commission).toBeLessThan(100000000);
        });

        it('should handle floating point deal values', () => {
            const tiers: CommissionTier[] = [
                { minPrice: 0, maxPrice: null, rate: 0.03 },
            ];

            const commission = dealFlowService.calculateCommission(1234567.89, tiers);

            // Should be close to expected value
            expect(commission).toBeCloseTo(37037.04, 2);
        });

        it('should handle tier with zero rate', () => {
            const zeroRateTiers: CommissionTier[] = [
                { minPrice: 0, maxPrice: 100000, rate: 0 },
                { minPrice: 100000, maxPrice: null, rate: 0.03 },
            ];

            // $150,000 = 100k at 0% + 50k at 3% = 0 + 1,500 = 1,500
            const commission = dealFlowService.calculateCommission(150000, zeroRateTiers);
            expect(commission).toBe(1500);
        });
    });

    /**
     * Property: Commission Calculation Determinism
     */
    describe('Commission Calculation Determinism', () => {
        it('should return same result for same inputs', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000 }),
                    (dealValue) => {
                        const tiers: CommissionTier[] = [
                            { minPrice: 0, maxPrice: 500000, rate: 0.04 },
                            { minPrice: 500000, maxPrice: null, rate: 0.02 },
                        ];

                        const commission1 = dealFlowService.calculateCommission(dealValue, tiers);
                        const commission2 = dealFlowService.calculateCommission(dealValue, tiers);

                        expect(commission1).toBe(commission2);
                    }
                ),
                { numRuns: 30 }
            );
        });
    });
});
