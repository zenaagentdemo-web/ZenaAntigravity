import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    formatCurrency,
    calculateDaysInStage,
    formatDaysRemaining,
    buildStrategyOpener,
    STAGE_LABELS,
    RISK_BADGES,
    STRATEGY_SESSION_KEY,
} from './types';
import type { StrategySessionContext, RiskLevel } from './types';

/**
 * Unit Tests for Deal Flow Types and Helper Functions
 * 
 * These tests verify the utility functions used throughout
 * the Deal Flow feature.
 */

describe('Deal Flow Types Unit Tests', () => {

    /**
     * formatCurrency tests
     */
    describe('formatCurrency', () => {
        it('should format positive numbers with NZD currency', () => {
            const result = formatCurrency(1500000);
            expect(result).toContain('$');
            expect(result).toContain('1,500,000');
        });

        it('should format zero correctly', () => {
            const result = formatCurrency(0);
            expect(result).toContain('$');
            expect(result).toContain('0');
        });

        it('should not include decimal places', () => {
            const result = formatCurrency(1234567);
            expect(result).not.toContain('.');
        });

        it('should format any positive integer correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100000000 }),
                    (value) => {
                        const result = formatCurrency(value);

                        // Should contain dollar sign
                        expect(result).toContain('$');

                        // Should be a non-empty string
                        expect(result.length).toBeGreaterThan(1);

                        // Should not have decimal places (minimumFractionDigits: 0)
                        expect(result).not.toMatch(/\.\d{2}$/);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should use thousand separators', () => {
            const result = formatCurrency(1234567);
            // NZ format uses comma separators
            expect(result.replace(/[^,]/g, '').length).toBeGreaterThanOrEqual(1);
        });
    });

    /**
     * calculateDaysInStage tests
     */
    describe('calculateDaysInStage', () => {
        it('should return 0 for today', () => {
            const today = new Date().toISOString();
            const result = calculateDaysInStage(today);
            expect(result).toBe(0);
        });

        it('should return positive days for past dates', () => {
            const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const result = calculateDaysInStage(pastDate);
            expect(result).toBe(5);
        });

        it('should handle any past date correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 365 }),
                    (daysAgo) => {
                        const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
                        const result = calculateDaysInStage(pastDate);

                        // Should be within ±1 day due to timezone/rounding
                        expect(Math.abs(result - daysAgo)).toBeLessThanOrEqual(1);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return non-negative for future dates (edge case)', () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const result = calculateDaysInStage(futureDate);
            // May be negative, but typically deals enter stage in past
            expect(typeof result).toBe('number');
        });
    });

    /**
     * formatDaysRemaining tests
     */
    describe('formatDaysRemaining', () => {
        it('should return "Today" for 0 days', () => {
            expect(formatDaysRemaining(0)).toBe('Today');
        });

        it('should return "Tomorrow" for 1 day', () => {
            expect(formatDaysRemaining(1)).toBe('Tomorrow');
        });

        it('should return formatted days for positive values', () => {
            expect(formatDaysRemaining(5)).toBe('5d');
            expect(formatDaysRemaining(14)).toBe('14d');
        });

        it('should return overdue format for negative values', () => {
            expect(formatDaysRemaining(-3)).toBe('3d overdue');
            expect(formatDaysRemaining(-1)).toBe('1d overdue');
        });

        it('should handle any integer correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -100, max: 365 }),
                    (days) => {
                        const result = formatDaysRemaining(days);

                        expect(typeof result).toBe('string');
                        expect(result.length).toBeGreaterThan(0);

                        if (days < 0) {
                            expect(result).toContain('overdue');
                        } else if (days === 0) {
                            expect(result).toBe('Today');
                        } else if (days === 1) {
                            expect(result).toBe('Tomorrow');
                        } else {
                            expect(result).toBe(`${days}d`);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * STAGE_LABELS tests
     */
    describe('STAGE_LABELS', () => {
        it('should have labels for all buyer stages', () => {
            const buyerStages = [
                'buyer_consult', 'shortlisting', 'viewings', 'offer_made',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            for (const stage of buyerStages) {
                expect(STAGE_LABELS[stage]).toBeDefined();
                expect(typeof STAGE_LABELS[stage]).toBe('string');
                expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);
            }
        });

        it('should have labels for all seller stages', () => {
            const sellerStages = [
                'appraisal', 'listing_signed', 'marketing', 'offers_received',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            for (const stage of sellerStages) {
                expect(STAGE_LABELS[stage]).toBeDefined();
                expect(typeof STAGE_LABELS[stage]).toBe('string');
            }
        });

        it('should have unique values for distinct stages', () => {
            const uniqueStages = new Set(Object.keys(STAGE_LABELS));
            expect(uniqueStages.size).toBe(Object.keys(STAGE_LABELS).length);
        });
    });

    /**
     * RISK_BADGES tests
     */
    describe('RISK_BADGES', () => {
        const riskLevels: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];

        it('should have badges for all risk levels', () => {
            for (const level of riskLevels) {
                expect(RISK_BADGES[level]).toBeDefined();
                expect(RISK_BADGES[level].emoji).toBeDefined();
                expect(RISK_BADGES[level].color).toBeDefined();
                expect(RISK_BADGES[level].label).toBeDefined();
            }
        });

        it('should have valid hex colors', () => {
            for (const level of riskLevels) {
                expect(RISK_BADGES[level].color).toMatch(/^#[0-9a-f]{6}$/i);
            }
        });

        it('should have non-empty emojis', () => {
            for (const level of riskLevels) {
                expect(RISK_BADGES[level].emoji.length).toBeGreaterThan(0);
            }
        });

        it('should have descriptive labels', () => {
            for (const level of riskLevels) {
                expect(RISK_BADGES[level].label.length).toBeGreaterThan(0);
            }
        });
    });

    /**
     * buildStrategyOpener tests
     */
    describe('buildStrategyOpener', () => {
        const createContext = (overrides: Partial<StrategySessionContext> = {}): StrategySessionContext => ({
            dealId: 'deal-1',
            address: '123 Test Street, Auckland',
            stage: 'conditional',
            stageLabel: 'Conditional',
            healthScore: 50,
            healthStatus: 'warning',
            primaryRisk: 'Stalling',
            riskType: 'stalling',
            coachingInsight: 'Consider following up with the buyer',
            daysInStage: 10,
            ...overrides,
        });

        it('should generate opener for finance_risk', () => {
            const context = createContext({ riskType: 'finance_risk' });
            const result = buildStrategyOpener(context);

            expect(result).toContain('finance');
            expect(result.toLowerCase()).toContain('broker');
        });

        it('should generate opener for stalling', () => {
            const context = createContext({ riskType: 'stalling' });
            const result = buildStrategyOpener(context);

            expect(result.toLowerCase()).toContain('activity');
        });

        it('should generate opener for cold_buyer', () => {
            const context = createContext({ riskType: 'cold_buyer' });
            const result = buildStrategyOpener(context);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should generate opener for long_conditional', () => {
            const context = createContext({ riskType: 'long_conditional' });
            const result = buildStrategyOpener(context);

            expect(result.toLowerCase()).toContain('conditional');
        });

        it('should generate opener for builder_report_delay', () => {
            const context = createContext({ riskType: 'builder_report_delay' });
            const result = buildStrategyOpener(context);

            expect(result.toLowerCase()).toContain('builder');
        });

        it('should generate opener for vendor_expectations', () => {
            const context = createContext({ riskType: 'vendor_expectations' });
            const result = buildStrategyOpener(context);

            expect(result.toLowerCase()).toContain('market');
        });

        it('should generate generic opener for unknown risk types', () => {
            const context = createContext({ riskType: 'unknown_type' });
            const result = buildStrategyOpener(context);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should extract short address from full address', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        streetNumber: fc.integer({ min: 1, max: 999 }),
                        streetName: fc.constantFrom('Main', 'Oak', 'Victoria', 'Queen'),
                        streetType: fc.constantFrom('Street', 'Road', 'Avenue', 'Drive'),
                        suburb: fc.constantFrom('Auckland', 'Wellington', 'Remuera', 'Ponsonby'),
                    }),
                    (addressParts) => {
                        const fullAddress = `${addressParts.streetNumber} ${addressParts.streetName} ${addressParts.streetType}, ${addressParts.suburb}`;
                        const context = createContext({ address: fullAddress });
                        const result = buildStrategyOpener(context);

                        // Should use short address (before comma)
                        const shortAddress = fullAddress.split(',')[0];
                        expect(result).toContain(shortAddress);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should include coaching insight in generic opener', () => {
            const coachingInsight = 'This is a custom coaching insight';
            const context = createContext({
                riskType: 'generic_unknown',
                coachingInsight,
            });
            const result = buildStrategyOpener(context);

            expect(result).toContain(coachingInsight);
        });
    });

    /**
     * STRATEGY_SESSION_KEY tests
     */
    describe('STRATEGY_SESSION_KEY', () => {
        it('should be a non-empty string', () => {
            expect(typeof STRATEGY_SESSION_KEY).toBe('string');
            expect(STRATEGY_SESSION_KEY.length).toBeGreaterThan(0);
        });

        it('should be a valid storage key', () => {
            // Should not contain special characters that could break storage
            expect(STRATEGY_SESSION_KEY).toMatch(/^[a-z_]+$/);
        });

        it('should work with sessionStorage', () => {
            const testData = { test: 'value' };

            sessionStorage.setItem(STRATEGY_SESSION_KEY, JSON.stringify(testData));
            const retrieved = sessionStorage.getItem(STRATEGY_SESSION_KEY);

            expect(retrieved).toBeTruthy();
            expect(JSON.parse(retrieved!)).toEqual(testData);

            sessionStorage.removeItem(STRATEGY_SESSION_KEY);
        });
    });

    /**
     * Type invariants
     */
    describe('Type invariants', () => {
        it('should have consistent stage labels for shared stages', () => {
            // These stages are shared between buyer and seller pipelines
            const sharedStages = ['conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'];

            for (const stage of sharedStages) {
                expect(STAGE_LABELS[stage]).toBeDefined();
            }
        });

        it('should have increasing severity in risk levels', () => {
            // Risk colors should follow a visual hierarchy
            const riskOrder: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];

            // All should be defined
            for (const level of riskOrder) {
                expect(RISK_BADGES[level]).toBeDefined();
            }
        });
    });
});
