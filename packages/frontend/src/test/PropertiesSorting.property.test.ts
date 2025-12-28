import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface Property {
    id: string;
    address: string;
    status: 'active' | 'under_contract' | 'sold' | 'withdrawn';
    createdAt: string;
    updatedAt: string;
    milestones: Array<{
        type: string;
        date: string;
    }>;
}

const getSaleDate = (property: Property): number => {
    const settledMilestone = property.milestones?.find(m => m.type === 'settled');
    if (settledMilestone) {
        return new Date(settledMilestone.date).getTime();
    }
    return new Date(property.updatedAt).getTime();
};

const sortProperties = (properties: Property[]): Property[] => {
    return [...properties].sort((a, b) => {
        const statusOrder: Record<string, number> = {
            active: 0,
            under_contract: 1,
            sold: 2,
            withdrawn: 3
        };

        const statusA = statusOrder[a.status] ?? 4;
        const statusB = statusOrder[b.status] ?? 4;

        if (statusA !== statusB) {
            return statusA - statusB;
        }

        // Within same status
        if (a.status === 'active' || a.status === 'under_contract') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (a.status === 'sold') {
            return getSaleDate(b) - getSaleDate(a);
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

const propertyArb = fc.record({
    id: fc.uuid(),
    address: fc.string(),
    status: fc.constantFrom<'active' | 'under_contract' | 'sold' | 'withdrawn'>('active', 'under_contract', 'sold', 'withdrawn'),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
    milestones: fc.array(fc.record({
        type: fc.constantFrom('listing', 'first_open', 'settled'),
        date: fc.date().map(d => d.toISOString())
    }))
});

describe('Properties Sorting Logic', () => {
    it('should always place active properties before under_contract, sold, and withdrawn', () => {
        fc.assert(
            fc.property(fc.array(propertyArb), (props) => {
                const sorted = sortProperties(props as Property[]);
                let firstNonActiveIndex = sorted.findIndex(p => p.status !== 'active');
                if (firstNonActiveIndex !== -1) {
                    for (let i = firstNonActiveIndex; i < sorted.length; i++) {
                        expect(sorted[i].status).not.toBe('active');
                    }
                }
            })
        );
    });

    it('should place under_contract properties after active but before sold and withdrawn', () => {
        fc.assert(
            fc.property(fc.array(propertyArb), (props) => {
                const sorted = sortProperties(props as Property[]);
                const firstActive = sorted.findIndex(p => p.status === 'active');
                const firstContract = sorted.findIndex(p => p.status === 'under_contract');
                const firstSold = sorted.findIndex(p => p.status === 'sold');
                const firstWithdrawn = sorted.findIndex(p => p.status === 'withdrawn');

                if (firstActive !== -1 && firstContract !== -1) {
                    expect(firstActive).toBeLessThan(firstContract);
                }
                if (firstContract !== -1 && firstSold !== -1) {
                    expect(firstContract).toBeLessThan(firstSold);
                }
                if (firstContract !== -1 && firstWithdrawn !== -1) {
                    expect(firstContract).toBeLessThan(firstWithdrawn);
                }
            })
        );
    });

    it('should sort active properties by createdAt DESC', () => {
        fc.assert(
            fc.property(fc.array(propertyArb), (props) => {
                const sorted = sortProperties(props as Property[]);
                const activeProps = sorted.filter(p => p.status === 'active');
                for (let i = 0; i < activeProps.length - 1; i++) {
                    const dateA = new Date(activeProps[i].createdAt).getTime();
                    const dateB = new Date(activeProps[i + 1].createdAt).getTime();
                    expect(dateA).toBeGreaterThanOrEqual(dateB);
                }
            })
        );
    });

    it('should sort sold properties by sale date DESC', () => {
        fc.assert(
            fc.property(fc.array(propertyArb), (props) => {
                const sorted = sortProperties(props as Property[]);
                const soldProps = sorted.filter(p => p.status === 'sold');
                for (let i = 0; i < soldProps.length - 1; i++) {
                    const dateA = getSaleDate(soldProps[i]);
                    const dateB = getSaleDate(soldProps[i + 1]);
                    expect(dateA).toBeGreaterThanOrEqual(dateB);
                }
            })
        );
    });
});
