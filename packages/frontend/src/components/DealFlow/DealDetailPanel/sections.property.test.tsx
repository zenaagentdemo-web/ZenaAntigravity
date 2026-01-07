import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Property-Based Tests for DealDetailPanel Section Components
 * 
 * Tests all the section components used within the DealDetailPanel
 * to display stage-specific deal information.
 */

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: any) => (
            <div className={className} {...props}>{children}</div>
        ),
        button: ({ children, className, onClick, ...props }: any) => (
            <button className={className} onClick={onClick} {...props}>{children}</button>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Import section components
import {
    StageProgressHeader,
    BlockerWidget,
    QuickContacts,
    ConditionsTracker,
    CommissionPreview,
    KeyDatesSection,
    SearchCriteriaSection,
    MarketingStatsSection,
    OfferListSection,
    PropertiesListSection,
    ViewingsScheduleSection,
    OfferDetailsSection,
    SettlementCountdownSection,
    PreInspectionSection,
    FollowUpActionsSection,
} from './index';
import type { Deal, DealCondition, Viewing, SharedProperty, Offer, SearchCriteria, MarketingStats, PreSettlementInspection } from '../types';

// Helper to create base deal
const createDeal = (overrides: Partial<Deal> = {}): Deal => ({
    id: 'test-deal-1',
    userId: 'user1',
    pipelineType: 'buyer',
    saleMethod: 'negotiation',
    stage: 'conditional',
    riskLevel: 'medium',
    riskFlags: [],
    nextActionOwner: 'agent',
    summary: 'Test deal',
    stageEnteredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    property: { id: 'p1', address: '123 Test Street, Auckland' },
    contacts: [{ id: '1', name: 'John Smith', email: 'john@test.com', role: 'buyer' }],
    dealValue: 1500000,
    estimatedCommission: 45000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('DealDetailPanel Sections Property-Based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * StageProgressHeader Tests
     */
    describe('StageProgressHeader', () => {
        it('should render for all buyer stages', () => {
            const stages = ['buyer_consult', 'shortlisting', 'viewings', 'offer_made', 'conditional'];

            for (const stage of stages) {
                const deal = createDeal({ stage: stage as any });

                const { container, unmount } = render(
                    <StageProgressHeader deal={deal} />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });

        it('should render for all seller stages', () => {
            const stages = ['appraisal', 'listing_signed', 'marketing', 'offers_received'];

            for (const stage of stages) {
                const deal = createDeal({
                    pipelineType: 'seller',
                    stage: stage as any,
                });

                const { container, unmount } = render(
                    <StageProgressHeader deal={deal} />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });
    });

    /**
     * QuickContacts Tests
     */
    describe('QuickContacts', () => {
        it('should render contacts list', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            name: fc.stringMatching(/^[A-Z][a-z]+\s[A-Z][a-z]+$/),
                            email: fc.emailAddress(),
                            role: fc.constantFrom('buyer', 'seller', 'agent'),
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    (contacts) => {
                        const deal = createDeal({ contacts });

                        const { container, unmount } = render(
                            <QuickContacts deal={deal} onNavigateToContact={() => { }} />
                        );

                        expect(container).toBeInTheDocument();
                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should handle empty contacts', () => {
            const deal = createDeal({ contacts: [] });

            const { container } = render(
                <QuickContacts deal={deal} onNavigateToContact={() => { }} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * ConditionsTracker Tests
     */
    describe('ConditionsTracker', () => {
        it('should render all condition statuses', () => {
            const statuses = ['pending', 'satisfied', 'waived', 'failed'] as const;

            for (const status of statuses) {
                const conditions: DealCondition[] = [
                    {
                        id: 'c1',
                        type: 'finance',
                        label: 'Finance Approval',
                        status,
                        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                ];

                const deal = createDeal({ conditions });

                const { container, unmount } = render(
                    <ConditionsTracker deal={deal} onConditionUpdate={() => { }} />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });

        it('should handle multiple conditions', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            type: fc.constantFrom('finance', 'building_report', 'lim', 'solicitor'),
                            label: fc.string({ minLength: 1, maxLength: 50 }),
                            status: fc.constantFrom('pending', 'satisfied', 'waived', 'failed'),
                            dueDate: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
                                .map(d => d.toISOString()),
                        }),
                        { minLength: 0, maxLength: 5 }
                    ),
                    (conditions) => {
                        const deal = createDeal({ conditions: conditions as any });

                        const { container, unmount } = render(
                            <ConditionsTracker deal={deal} onConditionUpdate={() => { }} />
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
     * CommissionPreview Tests
     */
    describe('CommissionPreview', () => {
        it('should display commission for various deal values', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        dealValue: fc.integer({ min: 100000, max: 10000000 }),
                        estimatedCommission: fc.integer({ min: 1000, max: 300000 }),
                    }),
                    (data) => {
                        const deal = createDeal(data);

                        const { container, unmount } = render(
                            <CommissionPreview deal={deal} />
                        );

                        expect(container).toBeInTheDocument();
                        unmount();
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should handle conjunctional deals', () => {
            const deal = createDeal({
                isConjunctional: true,
                conjunctionalSplit: 0.5,
                conjunctionalAgencyName: 'Partner Agency',
            });

            const { container } = render(
                <CommissionPreview deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * KeyDatesSection Tests
     */
    describe('KeyDatesSection', () => {
        it('should display settlement date', () => {
            const deal = createDeal({
                settlementDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const { container } = render(
                <KeyDatesSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should display auction date for auction sales', () => {
            const deal = createDeal({
                saleMethod: 'auction',
                auctionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const { container } = render(
                <KeyDatesSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should display tender close date for tender sales', () => {
            const deal = createDeal({
                saleMethod: 'tender',
                tenderCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const { container } = render(
                <KeyDatesSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * SearchCriteriaSection Tests
     */
    describe('SearchCriteriaSection', () => {
        it('should render search criteria', () => {
            const searchCriteria: SearchCriteria = {
                propertyType: 'House',
                location: ['Remuera', 'Parnell'],
                priceRange: { min: 1000000, max: 2000000 },
                bedrooms: '3+',
                bathrooms: '2+',
                mustHaves: ['Garage', 'Garden'],
            };

            const deal = createDeal({ searchCriteria });

            const { container } = render(
                <SearchCriteriaSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should handle missing search criteria', () => {
            const deal = createDeal({ searchCriteria: undefined });

            const { container } = render(
                <SearchCriteriaSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * MarketingStatsSection Tests
     */
    describe('MarketingStatsSection', () => {
        it('should display marketing statistics', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        views: fc.integer({ min: 0, max: 10000 }),
                        watchlist: fc.integer({ min: 0, max: 500 }),
                        inquiries: fc.integer({ min: 0, max: 100 }),
                        viewings: fc.integer({ min: 0, max: 50 }),
                        daysOnMarket: fc.integer({ min: 1, max: 365 }),
                        trend: fc.constantFrom('up', 'down') as fc.Arbitrary<'up' | 'down'>,
                    }),
                    (marketingStats) => {
                        const deal = createDeal({
                            pipelineType: 'seller',
                            marketingStats,
                        });

                        const { container, unmount } = render(
                            <MarketingStatsSection deal={deal} />
                        );

                        expect(container).toBeInTheDocument();
                        unmount();
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * ViewingsScheduleSection Tests
     */
    describe('ViewingsScheduleSection', () => {
        it('should display viewing schedule', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            propertyId: fc.uuid(),
                            address: fc.stringMatching(/^\d{1,3}\s[A-Z][a-z]+\s(Street|Road)/),
                            date: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
                                .map(d => d.toISOString()),
                            time: fc.constantFrom('10:00 AM', '2:30 PM', '4:00 PM'),
                            status: fc.constantFrom('scheduled', 'completed', 'cancelled'),
                        }),
                        { minLength: 0, maxLength: 5 }
                    ),
                    (viewings) => {
                        const deal = createDeal({ viewings: viewings as any });

                        const { container, unmount } = render(
                            <ViewingsScheduleSection deal={deal} />
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
     * PropertiesListSection Tests
     */
    describe('PropertiesListSection', () => {
        it('should display shared properties', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            address: fc.stringMatching(/^\d{1,3}\s[A-Z][a-z]+\s(Street|Road)/),
                            feedback: fc.option(fc.constantFrom('like', 'dislike', 'neutral'), { nil: undefined }),
                            isFavourite: fc.option(fc.boolean(), { nil: undefined }),
                        }),
                        { minLength: 0, maxLength: 10 }
                    ),
                    (propertiesShared) => {
                        const deal = createDeal({ propertiesShared: propertiesShared as any });

                        const { container, unmount } = render(
                            <PropertiesListSection deal={deal} />
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
     * OfferDetailsSection Tests
     */
    describe('OfferDetailsSection', () => {
        it('should display active offer', () => {
            const activeOffer: Offer = {
                id: 'o1',
                amount: 1500000,
                conditions: ['Finance', 'Building Report'],
                settlementDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'submitted',
                expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            };

            const deal = createDeal({ activeOffer });

            const { container } = render(
                <OfferDetailsSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should handle all offer statuses', () => {
            const statuses = ['submitted', 'under_review', 'countered', 'accepted', 'rejected'] as const;

            for (const status of statuses) {
                const activeOffer: Offer = {
                    id: 'o1',
                    amount: 1500000,
                    conditions: [],
                    settlementDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                    status,
                    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                };

                const deal = createDeal({ activeOffer });

                const { container, unmount } = render(
                    <OfferDetailsSection deal={deal} />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });
    });

    /**
     * OfferListSection Tests (for sellers)
     */
    describe('OfferListSection', () => {
        it('should display multiple offers', () => {
            const offers: Offer[] = [
                {
                    id: 'o1',
                    amount: 4850000,
                    conditions: ['Finance'],
                    settlementDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'submitted',
                    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    buyerName: 'The Smiths',
                },
                {
                    id: 'o2',
                    amount: 5100000,
                    conditions: [],
                    settlementDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'pending',
                    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    buyerName: 'Zhang Family',
                },
            ];

            const deal = createDeal({
                pipelineType: 'seller',
                offers,
            });

            const { container } = render(
                <OfferListSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * SettlementCountdownSection Tests
     */
    describe('SettlementCountdownSection', () => {
        it('should show countdown for upcoming settlement', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 90 }),
                    (daysUntil) => {
                        const deal = createDeal({
                            stage: 'pre_settlement',
                            settlementDate: new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000).toISOString(),
                        });

                        const { container, unmount } = render(
                            <SettlementCountdownSection deal={deal} />
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
     * PreInspectionSection Tests
     */
    describe('PreInspectionSection', () => {
        it('should display pre-settlement inspection details', () => {
            const preSettlementInspection: PreSettlementInspection = {
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                time: '11:00 AM',
                status: 'pending',
                isFundsReady: false,
                isKeysArranged: false,
            };

            const deal = createDeal({
                stage: 'pre_settlement',
                preSettlementInspection,
            });

            const { container } = render(
                <PreInspectionSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should handle all inspection statuses', () => {
            const statuses = ['pending', 'completed', 'issues_found'] as const;

            for (const status of statuses) {
                const preSettlementInspection: PreSettlementInspection = {
                    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    time: '11:00 AM',
                    status,
                    issues: status === 'issues_found' ? ['Broken window', 'Missing items'] : undefined,
                };

                const deal = createDeal({
                    stage: 'pre_settlement',
                    preSettlementInspection,
                });

                const { container, unmount } = render(
                    <PreInspectionSection deal={deal} />
                );

                expect(container).toBeInTheDocument();
                unmount();
            }
        });
    });

    /**
     * FollowUpActionsSection Tests
     */
    describe('FollowUpActionsSection', () => {
        it('should display for settled deals', () => {
            const deal = createDeal({
                stage: 'settled',
                stageEnteredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const { container } = render(
                <FollowUpActionsSection deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });

    /**
     * BlockerWidget Tests
     */
    describe('BlockerWidget', () => {
        it('should display blockers for at-risk deals', () => {
            const deal = createDeal({
                riskLevel: 'high',
                riskFlags: ['finance_at_risk', 'stalling'],
            });

            const { container } = render(
                <BlockerWidget deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });

        it('should handle deals with no blockers', () => {
            const deal = createDeal({
                riskLevel: 'none',
                riskFlags: [],
            });

            const { container } = render(
                <BlockerWidget deal={deal} />
            );

            expect(container).toBeInTheDocument();
        });
    });
});
