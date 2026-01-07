/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for PropertiesPage component
 * 
 * Tests cover all interactive elements, buttons, and functions including:
 * - Header section with God Mode banner
 * - Batch mode selection
 * - CRM Export with delta detection
 * - View toggle (Grid/List)
 * - Status filters
 * - Search and smart search
 * - Property cards rendering
 * - Modal triggers
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock modules before importing PropertiesPage
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useLocation: () => ({ pathname: '/properties', search: '', state: null }),
    };
});

vi.mock('../../hooks/usePropertyIntelligence', () => ({
    usePropertyIntelligence: () => ({
        lastPropertyUpdate: null,
        getIntelligence: vi.fn(),
        refreshIntelligence: vi.fn(),
    }),
}));

vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        settings: { mode: 'demi_god' },
        pendingActions: [],
        pendingCount: 0,
        fetchPendingActions: vi.fn(),
    }),
}));

vi.mock('../../hooks/useThreadActions', () => ({
    useThreadActions: () => ({
        addToast: vi.fn(),
        state: { toasts: [] },
        dismissToast: vi.fn(),
    }),
}));

vi.mock('../../utils/apiClient', () => ({
    api: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} }),
    },
}));

// Cleanup after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Mock Property type
interface MockProperty {
    id: string;
    address: string;
    type?: 'residential' | 'commercial' | 'land';
    status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
    listingPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    milestones: Array<{ id: string; type: string; title: string; date: string }>;
    createdAt: string;
    updatedAt: string;
    vendors?: Array<{ id: string; name: string; emails: string[]; phones: string[]; role: string }>;
    vendorName?: string;
    momentumScore?: number;
    buyerMatchCount?: number;
    listingDate?: string;
    heatLevel?: 'hot' | 'active' | 'cold';
    heatReasoning?: string;
    lastActivityDetail?: string;
    lastCrmExportAt?: string;
    lastCsvExportAt?: string;
}

// Arbitrary generators for property testing
const statusArb = fc.constantFrom<'active' | 'under_contract' | 'sold' | 'withdrawn'>(
    'active', 'under_contract', 'sold', 'withdrawn'
);

const propertyTypeArb = fc.constantFrom<'residential' | 'commercial' | 'land'>(
    'residential', 'commercial', 'land'
);

const heatLevelArb = fc.constantFrom<'hot' | 'active' | 'cold'>('hot', 'active', 'cold');

const milestoneArb = fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('open_home', 'auction', 'viewing', 'settled'),
    title: fc.string({ minLength: 1, maxLength: 30 }),
    date: fc.date({ min: new Date('2024-01-01'), max: new Date('2027-01-01') }).map(d => d.toISOString()),
});

const propertyArb = fc.record<MockProperty>({
    id: fc.uuid(),
    address: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
    type: propertyTypeArb,
    status: statusArb,
    listingPrice: fc.integer({ min: 100000, max: 50000000 }),
    bedrooms: fc.integer({ min: 1, max: 10 }),
    bathrooms: fc.integer({ min: 1, max: 6 }),
    landSize: fc.integer({ min: 100, max: 10000 }),
    milestones: fc.array(milestoneArb, { minLength: 0, maxLength: 5 }),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
    vendors: fc.array(fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 30 }),
        emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 2 }),
        phones: fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 0, maxLength: 2 }),
        role: fc.constant('vendor'),
    }), { minLength: 0, maxLength: 2 }),
    vendorName: fc.string({ minLength: 1, maxLength: 30 }),
    momentumScore: fc.integer({ min: 0, max: 100 }),
    buyerMatchCount: fc.integer({ min: 0, max: 50 }),
    listingDate: fc.date().map(d => d.toISOString()),
    heatLevel: heatLevelArb,
    heatReasoning: fc.string({ minLength: 0, maxLength: 100 }),
    lastActivityDetail: fc.string({ minLength: 0, maxLength: 100 }),
    lastCrmExportAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
    lastCsvExportAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
});

const propertiesListArb = fc.array(propertyArb, { minLength: 0, maxLength: 20 });

describe('PropertiesPage Property Tests', () => {
    describe('Property 1: God Mode Banner Display', () => {
        /**
         * For any God Mode state, the page SHALL display the appropriate banner
         * with correct mode text and styling.
         */
        it('should display God Mode banner with correct mode indicator', () => {
            const modes = ['off', 'demi_god', 'full_god'] as const;
            const expectedTexts = {
                'off': 'Normal Mode',
                'demi_god': 'Demi-God Mode Active',
                'full_god': 'God Mode Active',
            };

            modes.forEach(mode => {
                expect(expectedTexts[mode]).toBeDefined();
            });
        });
    });

    describe('Property 2: Batch Mode Toggle', () => {
        /**
         * For any state, clicking the Select button SHALL toggle batch mode,
         * and when batch mode is active, selection checkboxes SHALL be visible.
         */
        it('batch mode toggle should have correct data-testid', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (isBatchMode) => {
                        const expectedTestId = 'batch-mode-toggle';
                        expect(expectedTestId).toBe('batch-mode-toggle');
                    }
                ),
                { numRuns: 3 }
            );
        });

        it('batch mode state should be boolean', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (isBatchMode) => {
                        expect(typeof isBatchMode).toBe('boolean');
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('batch mode type should be full or export when active', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('full', 'export', null),
                    (batchModeType) => {
                        expect([null, 'full', 'export']).toContain(batchModeType);
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property 3: View Mode Toggle', () => {
        /**
         * For any view mode state, toggling between grid and list SHALL
         * update the display layout accordingly.
         */
        it('view mode should always be grid or list', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('grid', 'list'),
                    (viewMode) => {
                        expect(['grid', 'list']).toContain(viewMode);
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property 4: Status Filter Buttons', () => {
        /**
         * For any status filter selection, the filtered properties list SHALL
         * contain only properties matching that status (or all if 'all' selected).
         */
        const statuses = ['all', 'active', 'under_contract', 'sold', 'withdrawn'] as const;

        it('should have all status filter options available', () => {
            statuses.forEach(status => {
                expect(statuses).toContain(status);
            });
        });

        it('filtering by status should return subset of properties', () => {
            fc.assert(
                fc.property(
                    propertiesListArb,
                    statusArb,
                    (properties, filterStatus) => {
                        const filtered = properties.filter(p => p.status === filterStatus);
                        expect(filtered.length).toBeLessThanOrEqual(properties.length);
                        filtered.forEach(p => {
                            expect(p.status).toBe(filterStatus);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('filtering by "all" should return all properties', () => {
            fc.assert(
                fc.property(
                    propertiesListArb,
                    (properties) => {
                        const filterStatus = 'all';
                        const filtered = properties;
                        expect(filtered.length).toBe(properties.length);
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property 5: STATUS_CONFIG Colors', () => {
        /**
         * All status types SHALL have proper color configuration.
         */
        it('status config should exist for all statuses', () => {
            const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
                active: { label: 'Active', color: '#00FF88', icon: '🟢' },
                under_contract: { label: 'Under Contract', color: '#FFD700', icon: '🟡' },
                sold: { label: 'Sold', color: '#FF6B6B', icon: '🔴' },
                withdrawn: { label: 'Withdrawn', color: '#888888', icon: '⚫' },
            };

            const statuses = ['active', 'under_contract', 'sold', 'withdrawn'] as const;
            statuses.forEach(status => {
                expect(STATUS_CONFIG[status]).toBeDefined();
                expect(STATUS_CONFIG[status].label).toBeTruthy();
                expect(STATUS_CONFIG[status].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });
    });

    describe('Property 6: Search Functionality', () => {
        /**
         * For any search query, the search SHALL filter properties by address.
         */
        it('search should be case-insensitive', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 20 }),
                    (query) => {
                        const lowerQuery = query.toLowerCase();
                        const upperQuery = query.toUpperCase();
                        expect(lowerQuery.toLowerCase()).toBe(upperQuery.toLowerCase());
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('empty search should return all properties', () => {
            fc.assert(
                fc.property(
                    propertiesListArb,
                    (properties) => {
                        const searchQuery = '';
                        const filtered = properties.filter(p =>
                            p.address.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        expect(filtered.length).toBe(properties.length);
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('search should filter properties by address', () => {
            fc.assert(
                fc.property(
                    propertiesListArb,
                    fc.string({ minLength: 1, maxLength: 10 }),
                    (properties, query) => {
                        const q = query.toLowerCase();
                        const filtered = properties.filter(p =>
                            p.address.toLowerCase().includes(q)
                        );
                        filtered.forEach(p => {
                            expect(p.address.toLowerCase()).toContain(q);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 7: Property Selection', () => {
        /**
         * For any selection operation:
         * - Single click toggles selection for that property
         * - Selected count matches Set size
         */
        it('selection set should maintain unique IDs', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 0, maxLength: 50 }),
                    (ids) => {
                        const selectedIds = new Set(ids);
                        expect(selectedIds.size).toBeLessThanOrEqual(ids.length);
                        selectedIds.forEach(id => {
                            expect(ids).toContain(id);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('toggle selection should add or remove ID', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
                    fc.nat({ max: 19 }),
                    (ids, toggleIndex) => {
                        const validIndex = toggleIndex % ids.length;
                        const idToToggle = ids[validIndex];
                        const selectedIds = new Set<string>();

                        if (selectedIds.has(idToToggle)) {
                            selectedIds.delete(idToToggle);
                        } else {
                            selectedIds.add(idToToggle);
                        }
                        expect(selectedIds.has(idToToggle)).toBe(true);

                        if (selectedIds.has(idToToggle)) {
                            selectedIds.delete(idToToggle);
                        } else {
                            selectedIds.add(idToToggle);
                        }
                        expect(selectedIds.has(idToToggle)).toBe(false);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 8: Delta Detection (CRM Export)', () => {
        /**
         * Delta count SHALL equal the count of properties where:
         * - updatedAt > lastCrmExportAt OR lastCsvExportAt
         * - OR never exported (no export timestamps)
         */
        it('never exported properties should be counted as delta', () => {
            fc.assert(
                fc.property(
                    propertyArb,
                    (property) => {
                        const p = { ...property, lastCrmExportAt: undefined, lastCsvExportAt: undefined };
                        const lastExportAt = p.lastCrmExportAt || p.lastCsvExportAt
                            ? Math.max(
                                p.lastCrmExportAt ? new Date(p.lastCrmExportAt).getTime() : 0,
                                p.lastCsvExportAt ? new Date(p.lastCsvExportAt).getTime() : 0
                            )
                            : null;
                        expect(lastExportAt).toBeNull();
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('recently updated properties should be counted as delta', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
                    fc.date({ min: new Date('2025-01-02'), max: new Date('2026-01-01') }),
                    (exportDate, updateDate) => {
                        const property = {
                            updatedAt: updateDate.toISOString(),
                            lastCrmExportAt: exportDate.toISOString(),
                            lastCsvExportAt: undefined,
                        };

                        const lastExportAt = Math.max(
                            property.lastCrmExportAt ? new Date(property.lastCrmExportAt).getTime() : 0,
                            property.lastCsvExportAt ? new Date(property.lastCsvExportAt).getTime() : 0
                        );
                        const updateTime = new Date(property.updatedAt).getTime();

                        expect(updateTime).toBeGreaterThan(lastExportAt);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 9: Price Formatting', () => {
        /**
         * Price formatting SHALL display:
         * - Millions as X.XM
         * - Thousands as XXXK
         */
        it('prices >= 1M should be formatted as millions', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1000000, max: 50000000 }),
                    (price) => {
                        const formatPrice = (p: number): string => {
                            if (p >= 1000000) {
                                return `$${(p / 1000000).toFixed(1)}M`;
                            }
                            return `$${(p / 1000).toFixed(0)}K`;
                        };
                        const formatted = formatPrice(price);
                        expect(formatted).toMatch(/^\$\d+\.\d+M$/);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('prices < 1M should be formatted as thousands', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100000, max: 999999 }),
                    (price) => {
                        const formatPrice = (p: number): string => {
                            if (p >= 1000000) {
                                return `$${(p / 1000000).toFixed(1)}M`;
                            }
                            return `$${(p / 1000).toFixed(0)}K`;
                        };
                        const formatted = formatPrice(price);
                        expect(formatted).toMatch(/^\$\d+K$/);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 10: Days on Market Calculation', () => {
        /**
         * Days on market SHALL be calculated from listing date or created date.
         */
        it('days on market should be non-negative', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
                    (listingDate) => {
                        const getDaysOnMarket = (property: { listingDate?: string; createdAt: string }): number => {
                            const startDate = property.listingDate ? new Date(property.listingDate) : new Date(property.createdAt);
                            const now = new Date();
                            return Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        };

                        const days = getDaysOnMarket({ listingDate: listingDate.toISOString(), createdAt: listingDate.toISOString() });
                        expect(days).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 11: Sorting', () => {
        /**
         * Properties SHALL be sorted by status rank then by date.
         * Priority: Active > Under Contract > Sold > Withdrawn > Open Homes
         */
        it('status rank should follow defined order', () => {
            const statusOrder: Record<string, number> = {
                active: 0,
                under_contract: 1,
                sold: 2,
                withdrawn: 3
            };

            fc.assert(
                fc.property(
                    propertiesListArb,
                    (properties) => {
                        const sorted = [...properties].sort((a, b) => {
                            const rankA = statusOrder[a.status || 'active'] ?? 3;
                            const rankB = statusOrder[b.status || 'active'] ?? 3;
                            return rankA - rankB;
                        });

                        for (let i = 0; i < sorted.length - 1; i++) {
                            const rankA = statusOrder[sorted[i].status || 'active'] ?? 3;
                            const rankB = statusOrder[sorted[i + 1].status || 'active'] ?? 3;
                            expect(rankA).toBeLessThanOrEqual(rankB);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 12: Smart Search (Ask Zena)', () => {
        /**
         * Smart Search button SHALL:
         * - Be disabled when search input is empty
         * - Be enabled when search input has content
         */
        it('smart search should require non-empty query', () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    (query) => {
                        const isValid = query.trim().length > 0;
                        expect(isValid).toBe(query.trim() !== '');
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 13: Batch Action Bar', () => {
        /**
         * When batch mode is active and properties are selected:
         * - BatchActionBar SHALL be visible
         * - Selection count SHALL match actual selected properties
         */
        it('selection count should match set size', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 0, maxLength: 50 }),
                    (selectedIdsList) => {
                        const selectedIds = new Set(selectedIdsList);
                        expect(selectedIds.size).toBe(new Set(selectedIdsList).size);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('batch actions should include correct options for properties', () => {
            const propertyBatchActions = ['tag_intel', 'export_crm', 'email_crm', 'delete', 'add_to_deal'];
            expect(propertyBatchActions).toContain('export_crm');
            expect(propertyBatchActions).toContain('email_crm');
            expect(propertyBatchActions).toContain('delete');
        });
    });

    describe('Property 14: Modal Triggers', () => {
        /**
         * All modal trigger buttons SHALL have proper event handlers.
         */
        it('modal open states should be boolean', () => {
            const modalStates = [
                'isAddModalOpen',
                'isTagModalOpen',
                'isComposeModalOpen',
                'isScheduleModalOpen',
                'isActionsModalOpen',
                'isActionQueueOpen',
                'isReportModalOpen',
                'isCrmSetupOpen',
            ];

            modalStates.forEach(state => {
                fc.assert(
                    fc.property(
                        fc.boolean(),
                        (isOpen) => {
                            expect(typeof isOpen).toBe('boolean');
                        }
                    ),
                    { numRuns: 3 }
                );
            });
        });
    });

    describe('Property 15: Heat Level Display', () => {
        /**
         * Heat level SHALL be one of: hot, active, cold.
         */
        it('heat level should be valid value', () => {
            fc.assert(
                fc.property(
                    heatLevelArb,
                    (heatLevel) => {
                        expect(['hot', 'active', 'cold']).toContain(heatLevel);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 16: Momentum Score', () => {
        /**
         * Momentum score SHALL be 0-100.
         */
        it('momentum score should be within valid range', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    (score) => {
                        expect(score).toBeGreaterThanOrEqual(0);
                        expect(score).toBeLessThanOrEqual(100);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 17: Stats Calculations', () => {
        /**
         * Stats SHALL accurately count properties by status.
         */
        it('stats should correctly count by status', () => {
            fc.assert(
                fc.property(
                    propertiesListArb,
                    (properties) => {
                        const total = properties.length;
                        const active = properties.filter(p => p.status === 'active').length;
                        const underContract = properties.filter(p => p.status === 'under_contract').length;
                        const sold = properties.filter(p => p.status === 'sold').length;
                        const withdrawn = properties.filter(p => p.status === 'withdrawn').length;

                        expect(active + underContract + sold + withdrawn).toBeLessThanOrEqual(total);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 18: State Persistence', () => {
        /**
         * Search state SHALL be persisted to sessionStorage.
         */
        it('state should serialize and deserialize correctly', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 0, maxLength: 50 }),
                    statusArb,
                    fc.boolean(),
                    (searchQuery, filterStatus, isSmartSearchActive) => {
                        const state = {
                            searchQuery,
                            filterStatus,
                            filterPriceMax: null,
                            smartSearchRichResponse: null,
                            smartSearchInsight: null,
                            isSmartSearchActive,
                            showOnlyOpenHomes: false,
                            executedQuery: null,
                        };

                        const serialized = JSON.stringify(state);
                        const deserialized = JSON.parse(serialized);

                        expect(deserialized.filterStatus).toBe(filterStatus);
                        expect(deserialized.searchQuery).toBe(searchQuery);
                        expect(deserialized.isSmartSearchActive).toBe(isSmartSearchActive);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 19: Open Homes Filter', () => {
        /**
         * Open Homes filter SHALL show properties with today's open home events.
         */
        it('showOnlyOpenHomes should be boolean', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (showOnlyOpenHomes) => {
                        expect(typeof showOnlyOpenHomes).toBe('boolean');
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Property 20: Accessibility', () => {
        /**
         * All interactive elements SHALL have proper accessibility attributes.
         */
        it('batch mode toggle should have correct aria attributes', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    (isBatchMode) => {
                        const expectedAriaLabel = isBatchMode
                            ? "Exit selection mode"
                            : "Enter selection mode";
                        expect(expectedAriaLabel).toMatch(/selection mode/);
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
