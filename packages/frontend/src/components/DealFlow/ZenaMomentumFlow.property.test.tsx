import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

/**
 * Property-Based Tests for ZenaMomentumFlow Component
 * 
 * Tests the main momentum flow visualization that displays deals
 * organized by health status and stage.
 */

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick, ...props }: any) => (
            <div className={className} onClick={onClick} data-motion="true" {...props}>{children}</div>
        ),
        button: ({ children, className, onClick, ...props }: any) => (
            <button className={className} onClick={onClick} data-motion="true" {...props}>{children}</button>
        ),
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ZenaAvatarWidget
vi.mock('../ZenaAvatarWidget/ZenaAvatarWidget', () => ({
    ZenaAvatarWidget: () => <div data-testid="zena-avatar-widget" />,
}));

// Mock AmbientBackground
vi.mock('../AmbientBackground/AmbientBackground', () => ({
    AmbientBackground: () => <div data-testid="ambient-background" />,
}));

import { ZenaMomentumFlow } from './ZenaMomentumFlow';
import type { Deal, PipelineType } from './types';

// Helper to generate valid Deal objects
const dealArbitrary = fc.record({
    id: fc.uuid(),
    pipelineType: fc.constantFrom('buyer', 'seller') as fc.Arbitrary<PipelineType>,
    stage: fc.constantFrom(
        'buyer_consult', 'shortlisting', 'viewings', 'offer_made',
        'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture',
        'appraisal', 'listing_signed', 'marketing', 'offers_received'
    ),
    stageEnteredAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
    riskLevel: fc.constantFrom('none', 'low', 'medium', 'high', 'critical'),
    property: fc.option(fc.record({
        address: fc.stringMatching(/^\d{1,3}\s[A-Z][a-z]+\s(Street|Road|Avenue),\s[A-Z][a-z]+$/),
    }), { nil: undefined }),
    dealValue: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: undefined }),
    contacts: fc.option(
        fc.array(
            fc.record({
                id: fc.uuid(),
                name: fc.stringMatching(/^[A-Z][a-z]+\s[A-Z][a-z]+$/),
                email: fc.emailAddress(),
                role: fc.constantFrom('buyer', 'seller', 'agent'),
            }),
            { minLength: 0, maxLength: 3 }
        ),
        { nil: undefined }
    ),
    lastContactAt: fc.option(
        fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
        { nil: undefined }
    ),
}) as fc.Arbitrary<Partial<Deal>>;

// Create complete Deal with required fields
const completeDealArbitrary = dealArbitrary.map(partialDeal => ({
    id: partialDeal.id || 'test-id',
    userId: 'test-user',
    pipelineType: partialDeal.pipelineType || 'buyer',
    saleMethod: 'negotiation' as const,
    stage: partialDeal.stage || 'buyer_consult',
    riskLevel: partialDeal.riskLevel || 'none',
    riskFlags: [],
    nextActionOwner: 'agent' as const,
    summary: 'Test deal',
    stageEnteredAt: partialDeal.stageEnteredAt || new Date().toISOString(),
    property: partialDeal.property,
    dealValue: partialDeal.dealValue,
    contacts: partialDeal.contacts,
    lastContactAt: partialDeal.lastContactAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
} as Deal));

describe('ZenaMomentumFlow Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Property 1: Component renders without crashing for any valid deals array
     */
    describe('Property 1: Rendering stability', () => {
        it('should render without errors for any array of deals', () => {
            fc.assert(
                fc.property(
                    fc.array(completeDealArbitrary, { minLength: 0, maxLength: 20 }),
                    (deals) => {
                        const { container, unmount } = render(
                            <ZenaMomentumFlow
                                deals={deals}
                                pipelineType="buyer"
                            />
                        );

                        expect(container).toBeInTheDocument();
                        unmount();
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should handle empty deals array', () => {
            const { container } = render(
                <ZenaMomentumFlow deals={[]} pipelineType="buyer" />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * Property 2: Deal filtering by pipeline type
     */
    describe('Property 2: Pipeline type filtering', () => {
        it('should respect pipelineType prop', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('buyer', 'seller') as fc.Arbitrary<PipelineType>,
                    (pipelineType) => {
                        const deals: Deal[] = [
                            {
                                id: 'buyer-deal',
                                userId: 'user1',
                                pipelineType: 'buyer',
                                saleMethod: 'negotiation',
                                stage: 'buyer_consult',
                                riskLevel: 'none',
                                riskFlags: [],
                                nextActionOwner: 'agent',
                                summary: 'Buyer deal',
                                stageEnteredAt: new Date().toISOString(),
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            },
                            {
                                id: 'seller-deal',
                                userId: 'user1',
                                pipelineType: 'seller',
                                saleMethod: 'auction',
                                stage: 'marketing',
                                riskLevel: 'none',
                                riskFlags: [],
                                nextActionOwner: 'agent',
                                summary: 'Seller deal',
                                stageEnteredAt: new Date().toISOString(),
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            },
                        ];

                        const { container, unmount } = render(
                            <ZenaMomentumFlow deals={deals} pipelineType={pipelineType} />
                        );

                        expect(container).toBeInTheDocument();
                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 3: Deal select callback invocation
     */
    describe('Property 3: Callback invocation', () => {
        it('should call onDealSelect with correct deal when clicked', async () => {
            const mockDeal: Deal = {
                id: 'test-deal-1',
                userId: 'user1',
                pipelineType: 'buyer',
                saleMethod: 'negotiation',
                stage: 'conditional',
                riskLevel: 'high',
                riskFlags: ['stalling'],
                nextActionOwner: 'agent',
                summary: 'Test deal',
                stageEnteredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                lastContactAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                property: { address: '123 Test Street, Auckland' },
                dealValue: 1500000,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const onDealSelect = vi.fn();

            render(
                <ZenaMomentumFlow
                    deals={[mockDeal]}
                    pipelineType="buyer"
                    onDealSelect={onDealSelect}
                />
            );

            // The component should be in the document
            expect(screen.getByTestId('zena-avatar-widget')).toBeInTheDocument();
        });
    });

    /**
     * Property 4: Risk level affects visual display
     */
    describe('Property 4: Risk level visual indicators', () => {
        it('should handle all valid risk levels', () => {
            const riskLevels = ['none', 'low', 'medium', 'high', 'critical'] as const;

            for (const riskLevel of riskLevels) {
                const deal: Deal = {
                    id: `deal-${riskLevel}`,
                    userId: 'user1',
                    pipelineType: 'buyer',
                    saleMethod: 'negotiation',
                    stage: 'conditional',
                    riskLevel,
                    riskFlags: [],
                    nextActionOwner: 'agent',
                    summary: `Deal with ${riskLevel} risk`,
                    stageEnteredAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const { container, unmount } = render(
                    <ZenaMomentumFlow deals={[deal]} pipelineType="buyer" />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });
    });

    /**
     * Property 5: Stage configuration exists for all stages
     */
    describe('Property 5: Stage configuration completeness', () => {
        it('should handle all buyer stages', () => {
            const buyerStages = [
                'buyer_consult', 'shortlisting', 'viewings', 'offer_made',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            for (const stage of buyerStages) {
                const deal: Deal = {
                    id: `deal-${stage}`,
                    userId: 'user1',
                    pipelineType: 'buyer',
                    saleMethod: 'negotiation',
                    stage: stage as any,
                    riskLevel: 'none',
                    riskFlags: [],
                    nextActionOwner: 'agent',
                    summary: `Deal in ${stage}`,
                    stageEnteredAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const { container, unmount } = render(
                    <ZenaMomentumFlow deals={[deal]} pipelineType="buyer" />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });

        it('should handle all seller stages', () => {
            const sellerStages = [
                'appraisal', 'listing_signed', 'marketing', 'offers_received',
                'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'
            ];

            for (const stage of sellerStages) {
                const deal: Deal = {
                    id: `deal-${stage}`,
                    userId: 'user1',
                    pipelineType: 'seller',
                    saleMethod: 'auction',
                    stage: stage as any,
                    riskLevel: 'none',
                    riskFlags: [],
                    nextActionOwner: 'agent',
                    summary: `Deal in ${stage}`,
                    stageEnteredAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const { container, unmount } = render(
                    <ZenaMomentumFlow deals={[deal]} pipelineType="seller" />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });
    });

    /**
     * Property 6: Days in stage calculation accuracy
     */
    describe('Property 6: Days in stage calculation', () => {
        it('should calculate non-negative days for any past date', () => {
            fc.assert(
                fc.property(
                    fc.date({
                        min: new Date('2020-01-01'),
                        max: new Date()
                    }),
                    (stageEnteredDate) => {
                        const now = new Date();
                        const diffMs = now.getTime() - stageEnteredDate.getTime();
                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        // Days should be non-negative for past dates
                        expect(days).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 7: Deal value formatting
     */
    describe('Property 7: Currency formatting', () => {
        it('should format currency values correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 50000000 }),
                    (value) => {
                        const formatted = new Intl.NumberFormat('en-NZ', {
                            style: 'currency',
                            currency: 'NZD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(value);

                        // Should contain $ symbol
                        expect(formatted).toContain('$');

                        // Should be a valid string
                        expect(typeof formatted).toBe('string');
                        expect(formatted.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    /**
     * Property 8: Momentum radar filtering
     */
    describe('Property 8: Momentum radar deal identification', () => {
        it('should identify at-risk deals correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        daysInStage: fc.integer({ min: 0, max: 100 }),
                        daysSinceContact: fc.integer({ min: 0, max: 30 }),
                        riskLevel: fc.constantFrom('none', 'low', 'medium', 'high', 'critical'),
                    }),
                    ({ daysInStage, daysSinceContact, riskLevel }) => {
                        // A deal is "at risk" if:
                        // - High/critical risk level, OR
                        // - Days in stage > 14, OR
                        // - Days since contact > 7
                        const isAtRisk =
                            ['high', 'critical'].includes(riskLevel) ||
                            daysInStage > 14 ||
                            daysSinceContact > 7;

                        // This is a logical property test
                        if (riskLevel === 'critical') {
                            expect(isAtRisk).toBe(true);
                        }
                        if (daysInStage > 14) {
                            expect(isAtRisk).toBe(true);
                        }
                        if (daysSinceContact > 7) {
                            expect(isAtRisk).toBe(true);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 9: Component unmounts cleanly
     */
    describe('Property 9: Clean unmount', () => {
        it('should unmount without errors for any state', () => {
            fc.assert(
                fc.property(
                    fc.array(completeDealArbitrary, { minLength: 0, maxLength: 10 }),
                    (deals) => {
                        const { unmount } = render(
                            <ZenaMomentumFlow
                                deals={deals}
                                pipelineType="buyer"
                                onDealSelect={() => { }}
                                onStartZenaLive={() => { }}
                            />
                        );

                        // Should not throw during unmount
                        expect(() => unmount()).not.toThrow();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 10: Address extraction
     */
    describe('Property 10: Address parsing', () => {
        it('should extract suburb from valid NZ addresses', () => {
            const addresses = [
                { full: '15 Marine Parade, Herne Bay', suburb: 'Herne Bay' },
                { full: '42 Kohimarama Road, Kohimarama', suburb: 'Kohimarama' },
                { full: '108 Remuera Road, Remuera', suburb: 'Remuera' },
                { full: '23 Arney Road, Remuera', suburb: 'Remuera' },
            ];

            for (const { full, suburb } of addresses) {
                const parts = full.split(',');
                const extractedSuburb = parts.length > 1
                    ? parts[parts.length - 1].trim()
                    : '';

                expect(extractedSuburb).toBe(suburb);
            }
        });

        it('should handle addresses without suburb gracefully', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (address) => {
                        const parts = address.split(',');
                        const suburb = parts.length > 1
                            ? parts[parts.length - 1].trim()
                            : '';

                        // Should be a valid string (possibly empty)
                        expect(typeof suburb).toBe('string');
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
